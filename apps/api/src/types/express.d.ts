import type { Types } from "mongoose";

export interface AuthUser {
  id: string;
  email: string;
  role: "student" | "professor" | "admin";
  tokenVersion: number;
  sectionIds: Types.ObjectId[];
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      requestId?: string;
    }
  }
}

export {};
