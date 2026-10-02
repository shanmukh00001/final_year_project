import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface IAssignmentExtension {
  userId: Types.ObjectId;
  dueAt: Date;
  grantedBy: Types.ObjectId;
  grantedAt: Date;
}

export interface ILabAssignment extends Document {
  _id: Types.ObjectId;
  courseId: Types.ObjectId;
  courseCode: "SS" | "NT" | "DSP" | "DIP" | "BEE" | "ACS" | "SSP";
  experimentId: string;
  experimentVersion: number;
  title: string;
  instructions: string;
  createdBy: Types.ObjectId;
  sectionIds: Types.ObjectId[];
  publishAt: Date | null;
  dueAt: Date;
  allowLate: boolean;
  lateUntil: Date | null;
  allowResubmit: boolean;
  maxMarks: number;
  status: "draft" | "published" | "closed";
  starterCodeOverride: string | null;
  parameterOverrides: Record<string, unknown>;
  extensions: IAssignmentExtension[];
  createdAt: Date;
  updatedAt: Date;
}

const extensionSchema = new Schema<IAssignmentExtension>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dueAt: {
      type: Date,
      required: true,
    },
    grantedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    grantedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { _id: false },
);

const labAssignmentSchema = new Schema<ILabAssignment>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    courseCode: {
      type: String,
      enum: ["SS", "NT", "DSP", "DIP", "BEE", "ACS", "SSP"],
      required: true,
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
    title: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 160,
      trim: true,
    },
    instructions: {
      type: String,
      default: "",
      maxlength: 20000,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sectionIds: {
      type: [Schema.Types.ObjectId],
      required: true,
      validate: [
        (val: Types.ObjectId[]) => val.length >= 1 && val.length <= 20,
        "sectionIds must have between 1 and 20 items",
      ],
    },
    publishAt: {
      type: Date,
      default: null,
    },
    dueAt: {
      type: Date,
      required: true,
    },
    allowLate: {
      type: Boolean,
      required: true,
      default: false,
    },
    lateUntil: {
      type: Date,
      default: null,
    },
    allowResubmit: {
      type: Boolean,
      required: true,
      default: true,
    },
    maxMarks: {
      type: Number,
      required: true,
      min: 1,
      max: 1000,
    },
    status: {
      type: String,
      enum: ["draft", "published", "closed"],
      required: true,
      default: "draft",
    },
    starterCodeOverride: {
      type: String,
      default: null,
      maxlength: 200000,
    },
    parameterOverrides: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
    extensions: {
      type: [extensionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    strict: "throw",
    versionKey: false,
  },
);

labAssignmentSchema.index({ sectionIds: 1, status: 1, dueAt: 1 });
labAssignmentSchema.index({ createdBy: 1, createdAt: -1 });
labAssignmentSchema.index({ courseId: 1, status: 1 });
labAssignmentSchema.index({ "extensions.userId": 1 });

export const LabAssignment: Model<ILabAssignment> =
  (mongoose.models["LabAssignment"] as Model<ILabAssignment>) ||
  mongoose.model<ILabAssignment>("LabAssignment", labAssignmentSchema, "lab_assignments");
