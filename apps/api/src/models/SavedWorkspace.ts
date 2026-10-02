import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface IWorkspaceFile {
  path: string;
  content: string;
}

export interface IWorkspaceLayout {
  version?: number;
  panes?: Record<string, unknown>;
}

export interface ISavedWorkspace extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  assignmentId: Types.ObjectId | null;
  name: string;
  experimentId: string;
  experimentVersion: number;
  files: IWorkspaceFile[];
  mainFile: string;
  parameters: Record<string, unknown>;
  layout: IWorkspaceLayout;
  sizeBytes: number;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}

const workspaceFileSchema = new Schema<IWorkspaceFile>(
  {
    path: {
      type: String,
      required: true,
      match: /^[A-Za-z0-9_\-./]{1,80}\.py$/,
    },
    content: {
      type: String,
      required: true,
      maxlength: 200000,
    },
  },
  { _id: false },
);

const savedWorkspaceSchema = new Schema<ISavedWorkspace>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: "LabAssignment",
      default: null,
    },
    name: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 100,
      trim: true,
    },
    experimentId: {
      type: String,
      required: true,
      match: /^(SS|NT|DSP|DIP|BEE|ACS|SSP)-[0-9]{2}$/,
    },
    experimentVersion: {
      type: Number,
      required: true,
      min: 1,
    },
    files: {
      type: [workspaceFileSchema],
      required: true,
      validate: [
        (val: IWorkspaceFile[]) => val.length >= 1 && val.length <= 10,
        "Files count must be between 1 and 10",
      ],
    },
    mainFile: {
      type: String,
      required: true,
      default: "main.py",
    },
    parameters: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
    layout: {
      type: {
        version: { type: Number, default: 1 },
        panes: { type: Schema.Types.Mixed, default: () => ({}) },
      },
      default: () => ({ version: 1, panes: {} }),
      _id: false,
    },
    sizeBytes: {
      type: Number,
      required: true,
      min: 0,
      max: 204800, // 200 KB
    },
    revision: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
  },
  {
    timestamps: true,
    strict: "throw",
    versionKey: false,
  },
);

savedWorkspaceSchema.index({ userId: 1, updatedAt: -1 });
savedWorkspaceSchema.index({ userId: 1, experimentId: 1 });
savedWorkspaceSchema.index({ userId: 1, name: 1 }, { unique: true });
savedWorkspaceSchema.index({ userId: 1, assignmentId: 1 });

export const SavedWorkspace: Model<ISavedWorkspace> =
  (mongoose.models["SavedWorkspace"] as Model<ISavedWorkspace>) ||
  mongoose.model<ISavedWorkspace>("SavedWorkspace", savedWorkspaceSchema, "saved_workspaces");
