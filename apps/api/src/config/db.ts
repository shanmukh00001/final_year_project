import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDb(uri: string = env.MONGODB_URI): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }
  return mongoose.connect(uri, {
    autoIndex: env.NODE_ENV !== "production",
  });
}

export async function disconnectDb(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
