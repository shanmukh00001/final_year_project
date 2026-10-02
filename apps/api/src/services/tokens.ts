import crypto from "node:crypto";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { env } from "../config/env.js";
import { RefreshToken } from "../models/RefreshToken.js";
import { User } from "../models/User.js";
import { AppError } from "../middleware/errorHandler.js";

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const prevAccessSecret = env.JWT_ACCESS_SECRET_PREV
  ? new TextEncoder().encode(env.JWT_ACCESS_SECRET_PREV)
  : null;

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(`${token}:${env.REFRESH_TOKEN_PEPPER}`).digest("hex");
}

export function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(`${ip}:${env.IP_HASH_SECRET}`).digest("hex");
}

export function hashString(str: string): string {
  return crypto.createHash("sha256").update(str).digest("hex");
}

export interface AccessTokenPayload extends JWTPayload {
  sub: string;
  role: "student" | "professor" | "admin";
  tv: number;
}

export async function signAccessToken(user: {
  id: string;
  role: "student" | "professor" | "admin";
  tokenVersion: number;
}): Promise<string> {
  return new SignJWT({
    role: user.role,
    tv: user.tokenVersion,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.id)
    .setIssuer("vlab-ece")
    .setAudience("vlab-web")
    .setIssuedAt()
    .setExpirationTime("15m")
    .setJti(crypto.randomUUID())
    .sign(accessSecret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, accessSecret, {
      algorithms: ["HS256"],
      issuer: "vlab-ece",
      audience: "vlab-web",
      clockTolerance: 5,
    });
    return payload as AccessTokenPayload;
  } catch {
    if (prevAccessSecret) {
      try {
        const { payload } = await jwtVerify(token, prevAccessSecret, {
          algorithms: ["HS256"],
          issuer: "vlab-ece",
          audience: "vlab-web",
          clockTolerance: 5,
        });
        return payload as AccessTokenPayload;
      } catch {
        // fallback failed as well
      }
    }
    throw new AppError("E_UNAUTHENTICATED", "Invalid or expired access token", 401);
  }
}

export function generateRefreshTokenString(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export async function createRefreshToken(
  userId: string,
  userAgent: string,
  existingFamilyId?: string,
): Promise<{ token: string; familyId: string }> {
  const token = generateRefreshTokenString();
  const familyId = existingFamilyId || crypto.randomUUID();
  const tokenHash = hashToken(token);
  const uaHash = hashString(userAgent || "unknown");
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

  await RefreshToken.create({
    userId,
    familyId,
    tokenHash,
    expiresAt,
    uaHash,
  });

  return { token, familyId };
}

export async function rotateRefreshToken(
  token: string,
  userAgent: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
  user: { id: string; role: "student" | "professor" | "admin"; name: string };
}> {
  const tokenHash = hashToken(token);
  const foundToken = await RefreshToken.findOne({ tokenHash });

  if (!foundToken) {
    throw new AppError("E_UNAUTHENTICATED", "Invalid refresh token", 401);
  }

  // Reuse detection: token already revoked! Revoke entire family and bump user tokenVersion
  if (foundToken.revokedAt !== null) {
    await RefreshToken.updateMany(
      { familyId: foundToken.familyId },
      { $set: { revokedAt: new Date() } },
    );
    await User.findByIdAndUpdate(foundToken.userId, { $inc: { tokenVersion: 1 } });
    throw new AppError(
      "E_UNAUTHENTICATED",
      "Refresh token reuse detected; all sessions revoked",
      401,
    );
  }

  // Check expiration
  if (foundToken.expiresAt < new Date()) {
    throw new AppError("E_UNAUTHENTICATED", "Refresh token expired", 401);
  }

  const user = await User.findById(foundToken.userId);
  if (!user || !user.isActive) {
    throw new AppError("E_ACCOUNT_DISABLED", "User account is disabled or not found", 403);
  }

  // Issue new token in the same family
  const newToken = generateRefreshTokenString();
  const newTokenHash = hashToken(newToken);
  const uaHash = hashString(userAgent || "unknown");
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  foundToken.revokedAt = new Date();
  foundToken.replacedByHash = newTokenHash;
  await foundToken.save();

  await RefreshToken.create({
    userId: user._id,
    familyId: foundToken.familyId,
    tokenHash: newTokenHash,
    expiresAt,
    uaHash,
  });

  const accessToken = await signAccessToken({
    id: user._id.toString(),
    role: user.role,
    tokenVersion: user.tokenVersion,
  });

  return {
    accessToken,
    refreshToken: newToken,
    user: {
      id: user._id.toString(),
      role: user.role,
      name: user.name,
    },
  };
}

export async function revokeTokenFamily(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  const foundToken = await RefreshToken.findOne({ tokenHash });
  if (foundToken) {
    await RefreshToken.updateMany(
      { familyId: foundToken.familyId },
      { $set: { revokedAt: new Date() } },
    );
  }
}
