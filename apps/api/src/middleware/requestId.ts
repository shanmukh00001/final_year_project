import { type Request, type Response, type NextFunction } from "express";
import crypto from "node:crypto";

export interface CustomRequest extends Request {
  id?: string;
}

export function requestIdMiddleware(req: CustomRequest, res: Response, next: NextFunction): void {
  const existing = req.headers["x-request-id"];
  const id = typeof existing === "string" ? existing : crypto.randomUUID();
  req.id = id;
  res.setHeader("X-Request-Id", id);
  next();
}
