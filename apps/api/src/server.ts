import { app } from "./app.js";
import { env } from "./config/env.js";
import { connectDb, disconnectDb } from "./config/db.js";

const PORT = env.PORT;

async function start(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(
    `[db] Connecting to MongoDB at ${env.MONGODB_URI.replace(/\/\/.*@/, "//<redacted>@")}...`,
  );
  await connectDb();
  // eslint-disable-next-line no-console
  console.log("[db] MongoDB connected.");

  const server = app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] V-Lab ECE API running on port ${PORT} (${env.NODE_ENV})`);
  });

  const shutdown = async (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`\n[server] ${signal} received — shutting down gracefully…`);
    server.close(async () => {
      await disconnectDb();
      // eslint-disable-next-line no-console
      console.log("[db] MongoDB disconnected. Bye!");
      process.exit(0);
    });
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

void start();
