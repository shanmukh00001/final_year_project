import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { connectDb, disconnectDb } from "../src/config/db.js";

let mongod: MongoMemoryServer | null = null;

export async function setupTestDb(): Promise<void> {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await connectDb(uri);
}

export async function teardownTestDb(): Promise<void> {
  await disconnectDb();
  if (mongod) {
    await mongod.stop();
  }
}

export async function clearTestDb(): Promise<void> {
  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }
}
