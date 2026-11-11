import { z } from "zod";

export const CourseCodeSchema = z.enum(["SS", "NT", "DSP", "DIP", "BEE", "ACS", "SSP"]);
export type CourseCode = z.infer<typeof CourseCodeSchema>;

export const CourseLevelSchema = z.enum(["UG", "PG"]);
export type CourseLevel = z.infer<typeof CourseLevelSchema>;

export const ExperimentParamSchema = z.object({
  name: z.string(),
  kind: z.enum(["slider", "number", "select", "toggle"]),
  default: z.union([z.number(), z.string(), z.boolean()]),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  label: z.string().optional(),
  unit: z.string().optional(),
  options: z.array(z.string()).optional(),
});
export type ExperimentParam = z.infer<typeof ExperimentParamSchema>;

export const ExperimentOutputExpectationSchema = z.object({
  kind: z.enum(["plot", "variable", "stdout", "image"]),
  name: z.string(),
  description: z.string().optional(),
});
export type ExperimentOutputExpectation = z.infer<typeof ExperimentOutputExpectationSchema>;

export const QuizQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(z.string()).min(2),
  correctIndex: z.number().int().nonnegative(),
  explanation: z.string(),
});
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

export const ExperimentSchema = z.object({
  id: z
    .string()
    .regex(/^[A-Z]{2,3}-\d{2}$/, "Invalid experiment ID format, expected e.g. SS-01 or DSP-03"),
  title: z.string().min(3),
  course: CourseCodeSchema,
  level: CourseLevelSchema,
  institute: z.string().optional(),
  labName: z.string().optional(),
  sourceUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  objective: z.string().min(10),
  aimDetails: z.array(z.string()).optional(),
  apparatus: z.array(z.string()).optional(),
  theory: z.string().min(10),
  procedureSteps: z.array(z.string()).optional(),
  pretest: z.array(QuizQuestionSchema).optional(),
  posttest: z.array(QuizQuestionSchema).optional(),
  references: z.array(z.string()).optional(),
  starterCode: z.string().min(5),
  parameters: z.array(ExperimentParamSchema).default([]),
  expectedOutputs: z.array(ExperimentOutputExpectationSchema).default([]),
  requiredPackages: z.array(z.string()).default(["numpy", "scipy"]),
  estimatedRuntimeMs: z.number().positive().default(500),
  matlabNotes: z.string().optional(),
  enabled: z.boolean().default(true),
});
export type ExperimentDefinition = z.infer<typeof ExperimentSchema>;
