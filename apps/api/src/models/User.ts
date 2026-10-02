import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface IUserPreferences {
  theme?: "system" | "light" | "dark";
  editorFontSize?: number;
  liveRun?: boolean;
}

export interface IPasswordReset {
  tokenHash: string;
  expiresAt: Date;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  role: "student" | "professor" | "admin";
  rollNo?: string;
  programme?: "BTech" | "MTech" | "PhD";
  batchYear?: number;
  sectionIds: Types.ObjectId[];
  isActive: boolean;
  tokenVersion: number;
  failedLoginCount: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  passwordChangedAt: Date | null;
  passwordReset: IPasswordReset | null;
  preferences: IUserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    role: {
      type: String,
      enum: ["student", "professor", "admin"],
      required: true,
      default: "student",
    },
    rollNo: {
      type: String,
      trim: true,
      sparse: true,
    },
    programme: {
      type: String,
      enum: ["BTech", "MTech", "PhD"],
    },
    batchYear: {
      type: Number,
      min: 2015,
      max: 2100,
    },
    sectionIds: {
      type: [Schema.Types.ObjectId],
      ref: "Course.sections",
      default: [],
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    tokenVersion: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    failedLoginCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    passwordReset: {
      type: {
        tokenHash: { type: String, required: true },
        expiresAt: { type: Date, required: true },
      },
      default: null,
      _id: false,
    },
    preferences: {
      type: {
        theme: { type: String, enum: ["system", "light", "dark"], default: "system" },
        editorFontSize: { type: Number, min: 10, max: 24, default: 14 },
        liveRun: { type: Boolean, default: false },
      },
      default: () => ({
        theme: "system",
        editorFontSize: 14,
        liveRun: false,
      }),
      _id: false,
    },
  },
  {
    timestamps: true,
    strict: "throw",
    versionKey: false,
  },
);

userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ sectionIds: 1 });
userSchema.index({ batchYear: 1, programme: 1 });

export const User: Model<IUser> =
  (mongoose.models["User"] as Model<IUser>) || mongoose.model<IUser>("User", userSchema, "users");
