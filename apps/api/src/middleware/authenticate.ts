import type { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler.js";
import { verifyAccessToken } from "../services/tokens.js";
import { User } from "../models/User.js";

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.header("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(
      new AppError("E_UNAUTHENTICATED", "Missing or malformed Authorization header", 401),
    );
  }

  const token = authHeader.slice(7).trim();
  try {
    const payload = await verifyAccessToken(token);
    const user = await User.findById(payload.sub).select(
      "email role isActive tokenVersion sectionIds name",
    );

    if (!user) {
      return next(new AppError("E_UNAUTHENTICATED", "User not found", 401));
    }

    if (!user.isActive) {
      return next(new AppError("E_ACCOUNT_DISABLED", "User account is disabled", 403));
    }

    if (payload.tv !== user.tokenVersion) {
      return next(
        new AppError("E_UNAUTHENTICATED", "Token version mismatch (session invalidated)", 401),
      );
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
      sectionIds: user.sectionIds,
      name: user.name,
    };

    next();
  } catch (err) {
    next(err);
  }
}
