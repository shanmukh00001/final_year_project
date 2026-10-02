import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  actorId: Types.ObjectId | null;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: Record<string, unknown>;
  ipHash: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    actorRole: {
      type: String,
      required: true,
      default: "anonymous",
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      required: true,
    },
    targetId: {
      type: String,
      default: null,
    },
    details: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
    ipHash: {
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

auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });

export const AuditLog: Model<IAuditLog> =
  (mongoose.models["AuditLog"] as Model<IAuditLog>) ||
  mongoose.model<IAuditLog>("AuditLog", auditLogSchema, "audit_logs");
