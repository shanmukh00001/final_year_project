import type { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler.js";

export function authorize(...roles: Array<"student" | "professor" | "admin">) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError("E_UNAUTHENTICATED", "Authentication required", 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError("E_FORBIDDEN", "Insufficient role permissions", 403));
    }
    next();
  };
}
