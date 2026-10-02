import { Router, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import * as cookie from "cookie";
import { z } from "zod";
import { User } from "../models/User.js";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/authenticate.js";
import { sessionProofMiddleware } from "../middleware/sessionProof.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  signAccessToken,
  createRefreshToken,
  rotateRefreshToken,
  revokeTokenFamily,
} from "../services/tokens.js";
import { env } from "../config/env.js";

const registerSchema = z
  .object({
    email: z.string().email().max(254).toLowerCase().trim(),
    password: z.string().min(10, "Password must be at least 10 characters").max(128),
    name: z.string().min(1).max(100).trim(),
    rollNo: z.string().regex(/^[0-9]{2}[A-Z]{2}[0-9]{4,6}$/, "Invalid roll number format"),
    programme: z.enum(["BTech", "MTech", "PhD"]),
    batchYear: z.number().int().min(2015).max(2100),
  })
  .strict();

const loginSchema = z
  .object({
    email: z.string().email().max(254).toLowerCase().trim(),
    password: z.string().min(1),
  })
  .strict();

const patchMeSchema = z
  .object({
    name: z.string().min(1).max(100).trim().optional(),
    preferences: z
      .object({
        theme: z.enum(["system", "light", "dark"]).optional(),
        editorFontSize: z.number().int().min(10).max(24).optional(),
        liveRun: z.boolean().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const authRouter = Router();

function setRefreshCookie(res: Response, token: string): void {
  const isProd = env.NODE_ENV === "production";
  const cookieStr = cookie.serialize("vlab_rt", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    path: "/api/auth",
    maxAge: 14 * 24 * 60 * 60, // 14 days in seconds
  });
  res.setHeader("Set-Cookie", cookieStr);
}

function clearRefreshCookie(res: Response): void {
  const isProd = env.NODE_ENV === "production";
  const cookieStr = cookie.serialize("vlab_rt", "", {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    path: "/api/auth",
    maxAge: 0,
  });
  res.setHeader("Set-Cookie", cookieStr);
}

function getRefreshTokenFromCookie(req: Request): string | null {
  const header = req.header("cookie");
  if (!header) {return null;}
  const parsed = cookie.parse(header);
  return parsed["vlab_rt"] || null;
}

// POST /api/auth/register
authRouter.post(
  "/register",
  validate({ body: registerSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password, name, rollNo, programme, batchYear } = req.body;

      // Email domain validation
      const allowedDomains = env.ALLOWED_EMAIL_DOMAINS.split(",").map((d) =>
        d.trim().toLowerCase(),
      );
      const domain = email.split("@")[1];
      if (!domain || !allowedDomains.includes(domain)) {
        throw new AppError(
          "E_EMAIL_DOMAIN",
          "Email domain not allowed for student registration",
          422,
        );
      }

      // Check existing email
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new AppError("E_CONFLICT", "An account with this email already exists", 409);
      }

      // Check existing rollNo
      const existingRollNo = await User.findOne({ rollNo });
      if (existingRollNo) {
        throw new AppError("E_CONFLICT", "An account with this roll number already exists", 409);
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await User.create({
        email,
        passwordHash,
        name,
        role: "student",
        rollNo,
        programme,
        batchYear,
        sectionIds: [],
        isActive: true,
        tokenVersion: 0,
      });

      const accessToken = await signAccessToken({
        id: user._id.toString(),
        role: user.role,
        tokenVersion: user.tokenVersion,
      });

      const { token: refreshToken } = await createRefreshToken(
        user._id.toString(),
        req.header("user-agent") || "",
      );

      setRefreshCookie(res, refreshToken);

      res.status(201).json({
        data: {
          user: {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            rollNo: user.rollNo,
            programme: user.programme,
            batchYear: user.batchYear,
            sectionIds: user.sectionIds,
            preferences: user.preferences,
          },
          accessToken,
          expiresIn: 900,
        },
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/login
authRouter.post(
  "/login",
  validate({ body: loginSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });

      // Timing-safe dummy hash compare if user doesn't exist
      if (!user) {
        await bcrypt.compare(
          password,
          "$2a$12$e8qUvh8L7a/8U95j/4d2jO5iB67wG6d2s3uN9F4f7h9j8k1l2m3n4",
        );
        throw new AppError("E_INVALID_CREDENTIALS", "Invalid email or password", 401);
      }

      // Lockout check
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        throw new AppError(
          "E_RATE_LIMITED",
          "Account temporarily locked due to failed attempts. Try again later.",
          429,
        );
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        user.failedLoginCount += 1;
        if (user.failedLoginCount >= 5) {
          user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
          user.failedLoginCount = 0;
        }
        await user.save();
        throw new AppError("E_INVALID_CREDENTIALS", "Invalid email or password", 401);
      }

      if (!user.isActive) {
        throw new AppError("E_ACCOUNT_DISABLED", "Account is deactivated", 403);
      }

      // Reset failed logins
      user.failedLoginCount = 0;
      user.lockedUntil = null;
      user.lastLoginAt = new Date();
      await user.save();

      const accessToken = await signAccessToken({
        id: user._id.toString(),
        role: user.role,
        tokenVersion: user.tokenVersion,
      });

      const { token: refreshToken } = await createRefreshToken(
        user._id.toString(),
        req.header("user-agent") || "",
      );

      setRefreshCookie(res, refreshToken);

      res.status(200).json({
        data: {
          user: {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            name: user.name,
            preferences: user.preferences,
          },
          accessToken,
          expiresIn: 900,
        },
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/refresh
authRouter.post(
  "/refresh",
  sessionProofMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = getRefreshTokenFromCookie(req);
      if (!token) {
        clearRefreshCookie(res);
        throw new AppError("E_UNAUTHENTICATED", "Missing refresh token cookie", 401);
      }

      try {
        const { accessToken, refreshToken, user } = await rotateRefreshToken(
          token,
          req.header("user-agent") || "",
        );
        setRefreshCookie(res, refreshToken);

        res.status(200).json({
          data: {
            user,
            accessToken,
            expiresIn: 900,
          },
          meta: { requestId: req.requestId },
        });
      } catch (err) {
        clearRefreshCookie(res);
        throw err;
      }
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/logout
authRouter.post(
  "/logout",
  sessionProofMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = getRefreshTokenFromCookie(req);
      if (token) {
        await revokeTokenFamily(token);
      }
      clearRefreshCookie(res);
      res.status(200).json({
        data: { ok: true },
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/auth/me
authRouter.get(
  "/me",
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await User.findById(req.user!.id);
      if (!user) {
        throw new AppError("E_NOT_FOUND", "User not found", 404);
      }
      res.status(200).json({
        data: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          rollNo: user.rollNo,
          programme: user.programme,
          batchYear: user.batchYear,
          sectionIds: user.sectionIds,
          preferences: user.preferences,
        },
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/auth/me
authRouter.patch(
  "/me",
  authenticate,
  validate({ body: patchMeSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await User.findById(req.user!.id);
      if (!user) {
        throw new AppError("E_NOT_FOUND", "User not found", 404);
      }

      if (req.body.name) {
        user.name = req.body.name;
      }
      if (req.body.preferences) {
        user.preferences = {
          ...user.preferences,
          ...req.body.preferences,
        };
      }

      await user.save();

      res.status(200).json({
        data: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          preferences: user.preferences,
        },
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      next(err);
    }
  },
);
