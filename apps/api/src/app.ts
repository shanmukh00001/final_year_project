import express, { type Express } from "express";
import helmet from "helmet";
import cors from "cors";
import { requestIdMiddleware } from "./middleware/requestId.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { healthRouter } from "./routes/health.js";

export function createApp(): Express {
  const app = express();

  app.use(requestIdMiddleware);
  app.use(helmet());
  app.use(
    cors({
      origin: process.env["CORS_ALLOWED_ORIGINS"]
        ? process.env["CORS_ALLOWED_ORIGINS"].split(",")
        : ["http://localhost:5173"],
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "300kb" }));

  // Mount API routes
  app.use("/api", healthRouter);

  // Error handling
  app.use(errorHandler);

  return app;
}

export const app = createApp();
export default app;
