import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface ISubmissionFile {
  path: string;
  content: string;
}

export interface ISubmissionSnapshot {
  files: ISubmissionFile[];
  parameters: Record<string, unknown>;
  experimentVersion: number;
  reportText?: string;
  outputsMeta?: Array<{
    figureId?: string;
    kind?: string;
    traceCount?: number;
  }>;
  engine?: {
    pyodideVersion?: string;
    numpy?: string;
    scipy?: string;
  };
}

export interface ISubmissionGrade {
  marks: number;
  feedback?: string;
  gradedBy: Types.ObjectId;
  gradedAt: Date;
}

export interface ISubmissionHistory {
  submittedAt: Date;
  codeHash: string;
}

export interface ISubmission extends Document {
  _id: Types.ObjectId;
  assignmentId: Types.ObjectId;
  studentId: Types.ObjectId;
  status: "submitted" | "late_submitted" | "under_review" | "graded";
  snapshot: ISubmissionSnapshot;
  firstSubmittedAt: Date;
  lastSubmittedAt: Date;
  isLate: boolean;
  history: ISubmissionHistory[];
  codeHash: string;
  fingerprint?: number[];
  grade: ISubmissionGrade | null;
  createdAt: Date;
  updatedAt: Date;
}

const submissionSchema = new Schema<ISubmission>(
  {
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: "LabAssignment",
      required: true,
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["submitted", "late_submitted", "under_review", "graded"],
      required: true,
      default: "submitted",
    },
    snapshot: {
      type: {
        files: [
          {
            path: { type: String, required: true },
            content: { type: String, required: true, maxlength: 200000 },
            _id: false,
          },
        ],
        parameters: { type: Schema.Types.Mixed, default: () => ({}) },
        experimentVersion: { type: Number, required: true },
        reportText: { type: String, maxlength: 10000 },
        outputsMeta: [
          {
            figureId: { type: String },
            kind: { type: String },
            traceCount: { type: Number },
            _id: false,
          },
        ],
        engine: {
          pyodideVersion: { type: String },
          numpy: { type: String },
          scipy: { type: String },
          _id: false,
        },
      },
      required: true,
      _id: false,
    },
    firstSubmittedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lastSubmittedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    isLate: {
      type: Boolean,
      required: true,
      default: false,
    },
    history: {
      type: [
        {
          submittedAt: { type: Date, required: true },
          codeHash: { type: String, required: true },
          _id: false,
        },
      ],
      default: [],
    },
    codeHash: {
      type: String,
      required: true,
      minlength: 64,
      maxlength: 64,
    },
    fingerprint: {
      type: [Number],
      default: [],
    },
    grade: {
      type: {
        marks: { type: Number, required: true, min: 0 },
        feedback: { type: String, maxlength: 2000 },
        gradedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        gradedAt: { type: Date, required: true },
      },
      default: null,
      _id: false,
    },
  },
  {
    timestamps: true,
    strict: "throw",
    versionKey: false,
  },
);

submissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });
submissionSchema.index({ studentId: 1, updatedAt: -1 });
submissionSchema.index({ assignmentId: 1, status: 1 });
submissionSchema.index({ assignmentId: 1, codeHash: 1 });

export const Submission: Model<ISubmission> =
  (mongoose.models["Submission"] as Model<ISubmission>) ||
  mongoose.model<ISubmission>("Submission", submissionSchema, "submissions");
