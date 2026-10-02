import { type Request, type Response, type NextFunction } from "express";
import { type ErrorCode } from "@vlab/shared";

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown[],
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export class AppError extends HttpError {
  constructor(code: ErrorCode, message: string, statusCode: number = 400, details?: unknown[]) {
    super(statusCode, code, message, details);
    this.name = "AppError";
  }
}

export function errorHandler(
  err: unknown,
  req: Request & { id?: string },
  res: Response,
  _next: NextFunction,
): void {
  const requestId = req.id ?? "unknown";

  if (err instanceof HttpError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId,
      },
    });
    return;
  }

  const message = err instanceof Error ? err.message : "Internal Server Error";
  res.status(500).json({
    error: {
      code: "E_INTERNAL",
      message: process.env["NODE_ENV"] === "production" ? "Internal Server Error" : message,
      requestId,
    },
  });
}
