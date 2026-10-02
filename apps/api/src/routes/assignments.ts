import { Router, type Request, type Response, type NextFunction } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { LabAssignment, type ILabAssignment } from "../models/LabAssignment.js";
import { Submission, type ISubmission } from "../models/Submission.js";
import { SavedWorkspace } from "../models/SavedWorkspace.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import { AppError } from "../middleware/errorHandler.js";
import { calculateWorkspaceSizeBytes } from "./workspaces.js";

const fileSchema = z.object({
  path: z.string(),
  content: z.string().max(200000),
});

const submitSchema = z
  .object({
    files: z.array(fileSchema).min(1).max(10),
    parameters: z.record(z.unknown()).optional().default({}),
    experimentVersion: z.number().int().min(1),
    reportText: z.string().max(10000).optional(),
    outputsMeta: z
      .array(
        z.object({
          figureId: z.string().optional(),
          kind: z.string().optional(),
          traceCount: z.number().optional(),
        }),
      )
      .max(20)
      .optional(),
    engine: z
      .object({
        pyodideVersion: z.string().optional(),
        numpy: z.string().optional(),
        scipy: z.string().optional(),
      })
      .optional(),
  })
  .strict();

const draftWorkspaceSchema = z
  .object({
    files: z.array(fileSchema).min(1).max(10),
    mainFile: z.string().default("main.py"),
    parameters: z.record(z.unknown()).optional().default({}),
    layout: z
      .object({
        version: z.number().int().optional().default(1),
        panes: z.record(z.unknown()).optional().default({}),
      })
      .optional()
      .default({ version: 1, panes: {} }),
  })
  .strict();

export function calculateEffectiveDueAt(assignment: ILabAssignment, userId: string): Date {
  const extension = assignment.extensions.find((ext) => ext.userId.toString() === userId);
  return extension ? extension.dueAt : assignment.dueAt;
}

export function computeDerivedStatus(
  assignment: ILabAssignment,
  submission: ISubmission | null,
  userId: string,
  now: Date = new Date(),
): "not_started" | "in_progress" | "submitted" | "late_submitted" | "graded" | "missed" {
  if (submission) {
    if (submission.grade) {return "graded";}
    if (submission.isLate) {return "late_submitted";}
    return "submitted";
  }

  const effectiveDue = calculateEffectiveDueAt(assignment, userId);
  const cutoff = assignment.allowLate && assignment.lateUntil ? assignment.lateUntil : effectiveDue;

  if (now > cutoff) {
    return "missed";
  }

  return "not_started";
}

export function hashFiles(files: Array<{ path: string; content: string }>): string {
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));
  const content = sorted.map((f) => `${f.path}:${f.content}`).join("\n---\n");
  return crypto.createHash("sha256").update(content).digest("hex");
}

export const assignmentsRouter = Router();
assignmentsRouter.use(authenticate);
assignmentsRouter.use(authorize("student", "admin"));

// GET /api/assignments
assignmentsRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status: filterStatus, page = "1", pageSize = "25" } = req.query;
      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(String(pageSize), 10) || 25));

      const sectionIds = req.user!.sectionIds;
      const assignmentFilter: Record<string, unknown> = {
        status: "published",
        sectionIds: { $in: sectionIds },
      };

      const assignments = await LabAssignment.find(assignmentFilter).sort({ dueAt: 1 });
      const assignmentIds = assignments.map((a) => a._id);

      const submissions = await Submission.find({
        assignmentId: { $in: assignmentIds },
        studentId: req.user!.id,
      });

      const submissionMap = new Map<string, ISubmission>();
      for (const sub of submissions) {
        submissionMap.set(sub.assignmentId.toString(), sub);
      }

      const workspaces = await SavedWorkspace.find({
        assignmentId: { $in: assignmentIds },
        userId: req.user!.id,
      }).select("assignmentId");

      const draftSet = new Set<string>();
      for (const ws of workspaces) {
        if (ws.assignmentId) {draftSet.add(ws.assignmentId.toString());}
      }

      const results = assignments.map((asg) => {
        const sub = submissionMap.get(asg._id.toString()) || null;
        let derived = computeDerivedStatus(asg, sub, req.user!.id);
        if (derived === "not_started" && draftSet.has(asg._id.toString())) {
          derived = "in_progress";
        }
        const effectiveDueAt = calculateEffectiveDueAt(asg, req.user!.id);

        return {
          id: asg._id.toString(),
          courseCode: asg.courseCode,
          experimentId: asg.experimentId,
          title: asg.title,
          dueAt: asg.dueAt,
          effectiveDueAt,
          maxMarks: asg.maxMarks,
          allowLate: asg.allowLate,
          status: derived,
          grade: sub?.grade ? { marks: sub.grade.marks, feedback: sub.grade.feedback } : null,
        };
      });

      const filtered = filterStatus ? results.filter((r) => r.status === filterStatus) : results;

      const paginated = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);

      res.status(200).json({
        data: paginated,
        meta: {
          page: pageNum,
          pageSize: limitNum,
          total: filtered.length,
          requestId: req.requestId,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/assignments/:id
assignmentsRouter.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const asg = await LabAssignment.findById(req.params["id"]);
      if (!asg || asg.status !== "published") {
        throw new AppError("E_NOT_FOUND", "Assignment not found", 404);
      }

      // Verify student section membership
      const hasSection = asg.sectionIds.some((secId) =>
        req.user!.sectionIds.some((s) => s.toString() === secId.toString()),
      );
      if (!hasSection && req.user!.role !== "admin") {
        throw new AppError("E_NOT_FOUND", "Assignment not found for your enrolled sections", 404);
      }

      const effectiveDueAt = calculateEffectiveDueAt(asg, req.user!.id);
      const sub = await Submission.findOne({
        assignmentId: asg._id,
        studentId: req.user!.id,
      });

      const derivedStatus = computeDerivedStatus(asg, sub, req.user!.id);

      res.status(200).json({
        data: {
          id: asg._id.toString(),
          courseCode: asg.courseCode,
          experimentId: asg.experimentId,
          experimentVersion: asg.experimentVersion,
          title: asg.title,
          instructions: asg.instructions,
          dueAt: asg.dueAt,
          effectiveDueAt,
          allowLate: asg.allowLate,
          lateUntil: asg.lateUntil,
          allowResubmit: asg.allowResubmit,
          maxMarks: asg.maxMarks,
          starterCodeOverride: asg.starterCodeOverride,
          parameterOverrides: asg.parameterOverrides,
          status: derivedStatus,
          submission: sub
            ? {
                id: sub._id.toString(),
                status: sub.status,
                isLate: sub.isLate,
                firstSubmittedAt: sub.firstSubmittedAt,
                lastSubmittedAt: sub.lastSubmittedAt,
                grade: sub.grade,
              }
            : null,
        },
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/assignments/:id/workspace (Student draft upsert)
assignmentsRouter.put(
  "/:id/workspace",
  validate({ body: draftWorkspaceSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const asg = await LabAssignment.findById(req.params["id"]);
      if (!asg || asg.status !== "published") {
        throw new AppError("E_NOT_FOUND", "Assignment not found", 404);
      }

      const { files, mainFile, parameters, layout } = req.body;
      const sizeBytes = calculateWorkspaceSizeBytes(files, parameters);
      if (sizeBytes > 204800) {
        throw new AppError("E_LIMIT_WORKSPACE", "Draft workspace exceeds 200 KB limit", 413);
      }

      let draft = await SavedWorkspace.findOne({
        userId: req.user!.id,
        assignmentId: asg._id,
      });

      if (!draft) {
        draft = await SavedWorkspace.create({
          userId: req.user!.id,
          assignmentId: asg._id,
          name: `Assignment: ${asg.title}`,
          experimentId: asg.experimentId,
          experimentVersion: asg.experimentVersion,
          files,
          mainFile,
          parameters,
          layout,
          sizeBytes,
          revision: 1,
        });
      } else {
        draft.files = files;
        draft.mainFile = mainFile;
        draft.parameters = parameters;
        draft.layout = layout;
        draft.sizeBytes = sizeBytes;
        draft.revision += 1;
        await draft.save();
      }

      res.status(200).json({
        data: {
          id: draft._id.toString(),
          assignmentId: asg._id.toString(),
          revision: draft.revision,
          sizeBytes: draft.sizeBytes,
          updatedAt: draft.updatedAt,
        },
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/assignments/:id/submission
assignmentsRouter.post(
  "/:id/submission",
  validate({ body: submitSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const asg = await LabAssignment.findById(req.params["id"]);
      if (!asg || asg.status !== "published") {
        throw new AppError("E_NOT_FOUND", "Assignment not found", 404);
      }

      const now = new Date();
      const effectiveDueAt = calculateEffectiveDueAt(asg, req.user!.id);
      const isLate = now > effectiveDueAt;

      if (isLate) {
        if (!asg.allowLate) {
          throw new AppError(
            "E_PAST_DEADLINE",
            "Assignment deadline has passed and late submissions are not allowed",
            403,
          );
        }
        if (asg.lateUntil && now > asg.lateUntil) {
          throw new AppError("E_PAST_DEADLINE", "Late submission window has closed", 403);
        }
      }

      const existingSub = await Submission.findOne({
        assignmentId: asg._id,
        studentId: req.user!.id,
      });

      if (existingSub && !asg.allowResubmit) {
        throw new AppError(
          "E_ALREADY_SUBMITTED",
          "Resubmission is not permitted for this assignment",
          409,
        );
      }

      const { files, parameters, experimentVersion, reportText, outputsMeta, engine } = req.body;
      const sizeBytes = calculateWorkspaceSizeBytes(files, parameters);
      if (sizeBytes > 204800) {
        throw new AppError("E_LIMIT_WORKSPACE", "Submission snapshot exceeds 200 KB limit", 413);
      }

      const codeHash = hashFiles(files);
      const submissionStatus = isLate ? "late_submitted" : "submitted";

      let submission: ISubmission;

      if (existingSub) {
        existingSub.snapshot = {
          files,
          parameters,
          experimentVersion,
          reportText,
          outputsMeta,
          engine,
        };
        existingSub.lastSubmittedAt = now;
        existingSub.isLate = isLate;
        existingSub.status = submissionStatus;
        existingSub.codeHash = codeHash;
        existingSub.history.push({ submittedAt: now, codeHash });
        await existingSub.save();
        submission = existingSub;
      } else {
        submission = await Submission.create({
          assignmentId: asg._id,
          studentId: req.user!.id,
          status: submissionStatus,
          snapshot: {
            files,
            parameters,
            experimentVersion,
            reportText,
            outputsMeta,
            engine,
          },
          firstSubmittedAt: now,
          lastSubmittedAt: now,
          isLate,
          history: [{ submittedAt: now, codeHash }],
          codeHash,
          fingerprint: [],
          grade: null,
        });
      }

      res.status(200).json({
        data: {
          id: submission._id.toString(),
          assignmentId: asg._id.toString(),
          status: submission.status,
          isLate: submission.isLate,
          firstSubmittedAt: submission.firstSubmittedAt,
          lastSubmittedAt: submission.lastSubmittedAt,
        },
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/assignments/:id/submission
assignmentsRouter.get(
  "/:id/submission",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const submission = await Submission.findOne({
        assignmentId: req.params["id"],
        studentId: req.user!.id,
      });

      if (!submission) {
        throw new AppError("E_NOT_FOUND", "Submission not found", 404);
      }

      res.status(200).json({
        data: {
          id: submission._id.toString(),
          assignmentId: submission.assignmentId.toString(),
          status: submission.status,
          isLate: submission.isLate,
          snapshot: submission.snapshot,
          grade: submission.grade,
          firstSubmittedAt: submission.firstSubmittedAt,
          lastSubmittedAt: submission.lastSubmittedAt,
        },
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      next(err);
    }
  },
);
