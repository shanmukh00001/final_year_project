import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface IRefreshToken extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedByHash: string | null;
  uaHash: string;
  createdAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    familyId: {
      type: String,
      required: true,
      minlength: 36,
      maxlength: 36,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      minlength: 64,
      maxlength: 64,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    replacedByHash: {
      type: String,
      default: null,
    },
    uaHash: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    strict: "throw",
    versionKey: false,
  },
);

refreshTokenSchema.index({ userId: 1, familyId: 1 });
refreshTokenSchema.index({ tokenHash: 1, revokedAt: 1 });

export const RefreshToken: Model<IRefreshToken> =
  (mongoose.models["RefreshToken"] as Model<IRefreshToken>) ||
  mongoose.model<IRefreshToken>("RefreshToken", refreshTokenSchema, "refresh_tokens");
