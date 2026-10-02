import type { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler.js";
import { env } from "../config/env.js";

/**
 * sessionProofMiddleware
 * Enforces X-Session-Proof or X-Requested-With headers and origin verification
 * on state-changing cookie-authenticated endpoints (e.g. /api/auth/refresh, /api/auth/logout)
 * to prevent worker-origin and cross-site CSRF attacks.
 */
export function sessionProofMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const requestedWith = req.header("x-requested-with");
  const sessionProof = req.header("x-session-proof");

  // Must provide either X-Requested-With: vlab or X-Session-Proof
  if (requestedWith !== "vlab" && !sessionProof) {
    return next(
      new AppError(
        "E_FORBIDDEN",
        "Missing or invalid CSRF session proof header (X-Requested-With: vlab or X-Session-Proof required)",
        403,
      ),
    );
  }

  // If Origin header is present, verify it matches allowed origins
  const origin = req.header("origin");
  if (origin) {
    const allowedOrigins = env.CORS_ALLOWED_ORIGINS
      ? env.CORS_ALLOWED_ORIGINS.split(",").map((s) => s.trim())
      : [env.APP_BASE_URL];

    const isAllowed = allowedOrigins.includes(origin) || origin === env.APP_BASE_URL;
    if (!isAllowed) {
      return next(new AppError("E_FORBIDDEN", "Forbidden cross-origin request", 403));
    }
  }

  next();
}
