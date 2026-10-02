import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface ISection {
  _id: Types.ObjectId;
  name: string;
  academicYear: string;
  professorIds: Types.ObjectId[];
}

export interface ICourse extends Document {
  _id: Types.ObjectId;
  code: "SS" | "NT" | "DSP" | "DIP" | "BEE" | "ACS" | "SSP";
  name: string;
  level: "UG" | "PG";
  enabled: boolean;
  sections: ISection[];
  createdAt: Date;
  updatedAt: Date;
}

const sectionSchema = new Schema<ISection>(
  {
    name: {
      type: String,
      required: true,
      maxlength: 40,
    },
    academicYear: {
      type: String,
      required: true,
      match: /^20[0-9]{2}-[0-9]{2}$/,
    },
    professorIds: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
  },
  { _id: true },
);

const courseSchema = new Schema<ICourse>(
  {
    code: {
      type: String,
      enum: ["SS", "NT", "DSP", "DIP", "BEE", "ACS", "SSP"],
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: 120,
    },
    level: {
      type: String,
      enum: ["UG", "PG"],
      required: true,
      default: "UG",
    },
    enabled: {
      type: Boolean,
      required: true,
      default: true,
    },
    sections: {
      type: [sectionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    strict: "throw",
    versionKey: false,
  },
);

courseSchema.index({ "sections._id": 1 });
courseSchema.index({ "sections.professorIds": 1 });

export const Course: Model<ICourse> =
  (mongoose.models["Course"] as Model<ICourse>) ||
  mongoose.model<ICourse>("Course", courseSchema, "courses");
