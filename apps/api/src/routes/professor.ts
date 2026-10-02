import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { LabAssignment } from "../models/LabAssignment.js";
import { Submission } from "../models/Submission.js";
import { User } from "../models/User.js";
import { Course } from "../models/Course.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import { AppError } from "../middleware/errorHandler.js";

const createAssignmentSchema = z
  .object({
    courseId: z.string().optional(),
    courseCode: z.enum(["SS", "NT", "DSP", "DIP", "BEE", "ACS", "SSP"]),
    experimentId: z.string().regex(/^(SS|NT|DSP|DIP|BEE|ACS|SSP)-[0-9]{2}$/),
    experimentVersion: z.number().int().min(1),
    title: z.string().min(3).max(160).trim(),
    instructions: z.string().max(20000).optional().default(""),
    sectionIds: z.array(z.string()).min(1).max(20),
    publishAt: z.string().datetime().nullable().optional(),
    dueAt: z.string().datetime(),
    allowLate: z.boolean().optional().default(false),
    lateUntil: z.string().datetime().nullable().optional(),
    allowResubmit: z.boolean().optional().default(true),
    maxMarks: z.number().min(1).max(1000),
    starterCodeOverride: z.string().max(200000).nullable().optional(),
    parameterOverrides: z.record(z.unknown()).optional().default({}),
    status: z.enum(["draft", "published"]).optional().default("draft"),
  })
  .strict();

const gradeSchema = z
  .object({
    marks: z.number().min(0),
    feedback: z.string().max(2000).optional().default(""),
  })
  .strict();

const extensionSchema = z
  .object({
    userId: z.string(),
    dueAt: z.string().datetime(),
  })
  .strict();

export const professorRouter = Router();
professorRouter.use(authenticate);
professorRouter.use(authorize("professor", "admin"));

// GET /api/professor/assignments
professorRouter.get(
  "/professor/assignments",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page = "1", pageSize = "25" } = req.query;
      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(String(pageSize), 10) || 25));
      const skip = (pageNum - 1) * limitNum;

      const filter = req.user!.role === "admin" ? {} : { createdBy: req.user!.id };

      const [assignments, total] = await Promise.all([
        LabAssignment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
        LabAssignment.countDocuments(filter),
      ]);

      res.status(200).json({
        data: assignments.map((a) => ({
          id: a._id.toString(),
          courseCode: a.courseCode,
          experimentId: a.experimentId,
          title: a.title,
          status: a.status,
          dueAt: a.dueAt,
          maxMarks: a.maxMarks,
          createdAt: a.createdAt,
        })),
        meta: {
          page: pageNum,
          pageSize: limitNum,
          total,
          requestId: req.requestId,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/professor/assignments
professorRouter.post(
  "/professor/assignments",
  validate({ body: createAssignmentSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body;

      // Resolve courseId if not supplied
      let courseId = body.courseId;
      if (!courseId) {
        const course = await Course.findOne({ code: body.courseCode });
        if (course) {
          courseId = course._id.toString();
        } else {
          // Create course placeholder if not seeded
          const newCourse = await Course.create({
            code: body.courseCode,
            name: `${body.courseCode} Laboratory`,
            level: "UG",
            enabled: true,
            sections: [],
          });
          courseId = newCourse._id.toString();
        }
      }

      const sectionObjectIds = body.sectionIds.map((id: string) => new mongoose.Types.ObjectId(id));

      const assignment = await LabAssignment.create({
        courseId: new mongoose.Types.ObjectId(courseId),
        courseCode: body.courseCode,
        experimentId: body.experimentId,
        experimentVersion: body.experimentVersion,
        title: body.title,
        instructions: body.instructions || "",
        createdBy: req.user!.id,
        sectionIds: sectionObjectIds,
        publishAt: body.publishAt ? new Date(body.publishAt) : null,
        dueAt: new Date(body.dueAt),
        allowLate: body.allowLate,
        lateUntil: body.lateUntil ? new Date(body.lateUntil) : null,
        allowResubmit: body.allowResubmit,
        maxMarks: body.maxMarks,
        status: body.status,
        starterCodeOverride: body.starterCodeOverride,
        parameterOverrides: body.parameterOverrides,
        extensions: [],
      });

      res.status(201).json({
        data: {
          id: assignment._id.toString(),
          status: assignment.status,
        },
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/professor/assignments/:id
professorRouter.get(
  "/professor/assignments/:id",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const asg = await LabAssignment.findById(req.params["id"]);
      if (!asg) {
        throw new AppError("E_NOT_FOUND", "Assignment not found", 404);
      }

      res.status(200).json({
        data: asg,
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/professor/assignments/:id/publish
professorRouter.post(
  "/professor/assignments/:id/publish",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const asg = await LabAssignment.findById(req.params["id"]);
      if (!asg) {
        throw new AppError("E_NOT_FOUND", "Assignment not found", 404);
      }

      asg.status = "published";
      await asg.save();

      res.status(200).json({
        data: { id: asg._id.toString(), status: asg.status },
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/professor/assignments/:id/close
professorRouter.post(
  "/professor/assignments/:id/close",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const asg = await LabAssignment.findById(req.params["id"]);
      if (!asg) {
        throw new AppError("E_NOT_FOUND", "Assignment not found", 404);
      }

      asg.status = "closed";
      await asg.save();

      res.status(200).json({
        data: { id: asg._id.toString(), status: asg.status },
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/professor/assignments/:id/extensions
professorRouter.post(
  "/professor/assignments/:id/extensions",
  validate({ body: extensionSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const asg = await LabAssignment.findById(req.params["id"]);
      if (!asg) {
        throw new AppError("E_NOT_FOUND", "Assignment not found", 404);
      }

      const { userId, dueAt } = req.body;
      const targetUser = await User.findById(userId);
      if (!targetUser) {
        throw new AppError("E_NOT_FOUND", "Student not found", 404);
      }

      // Remove previous extension if exists
      asg.extensions = asg.extensions.filter((ext) => ext.userId.toString() !== userId);
      asg.extensions.push({
        userId: new mongoose.Types.ObjectId(userId),
        dueAt: new Date(dueAt),
        grantedBy: new mongoose.Types.ObjectId(req.user!.id),
        grantedAt: new Date(),
      });

      await asg.save();

      res.status(200).json({
        data: { ok: true, extensions: asg.extensions },
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/professor/assignments/:id/submissions
professorRouter.get(
  "/professor/assignments/:id/submissions",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page = "1", pageSize = "25" } = req.query;
      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(String(pageSize), 10) || 25));
      const skip = (pageNum - 1) * limitNum;

      const [submissions, total] = await Promise.all([
        Submission.find({ assignmentId: req.params["id"] })
          .populate("studentId", "name email rollNo")
          .sort({ submittedAt: -1 })
          .skip(skip)
          .limit(limitNum),
        Submission.countDocuments({ assignmentId: req.params["id"] }),
      ]);

      res.status(200).json({
        data: submissions,
        meta: {
          page: pageNum,
          pageSize: limitNum,
          total,
          requestId: req.requestId,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/professor/submissions/:id/grade
professorRouter.put(
  "/professor/submissions/:id/grade",
  validate({ body: gradeSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const submission = await Submission.findById(req.params["id"]);
      if (!submission) {
        throw new AppError("E_NOT_FOUND", "Submission not found", 404);
      }

      const assignment = await LabAssignment.findById(submission.assignmentId);
      if (!assignment) {
        throw new AppError("E_NOT_FOUND", "Associated assignment not found", 404);
      }

      const { marks, feedback } = req.body;

      if (marks < 0 || marks > assignment.maxMarks) {
        throw new AppError(
          "E_MARKS_RANGE",
          `Marks must be between 0 and max allowed ${assignment.maxMarks}`,
          422,
        );
      }

      // Check step 0.5
      if ((marks * 10) % 5 !== 0) {
        throw new AppError("E_MARKS_RANGE", "Marks must be a multiple of 0.5", 422);
      }

      submission.grade = {
        marks,
        feedback: feedback || "",
        gradedBy: new mongoose.Types.ObjectId(req.user!.id),
        gradedAt: new Date(),
      };
      submission.status = "graded";
      await submission.save();

      res.status(200).json({
        data: {
          submissionId: submission._id.toString(),
          grade: submission.grade,
          status: submission.status,
        },
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/professor/assignments/:id/analytics
professorRouter.get(
  "/professor/assignments/:id/analytics",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const asg = await LabAssignment.findById(req.params["id"]);
      if (!asg) {
        throw new AppError("E_NOT_FOUND", "Assignment not found", 404);
      }

      const assignedStudentsCount = await User.countDocuments({
        sectionIds: { $in: asg.sectionIds },
        role: "student",
      });

      const submissions = await Submission.find({ assignmentId: asg._id });
      const submittedCount = submissions.length;
      const gradedSubs = submissions.filter((s) => s.grade !== null);
      const gradedCount = gradedSubs.length;

      const marksList = gradedSubs.map((s) => s.grade!.marks).sort((a, b) => a - b);
      const mean =
        marksList.length > 0 ? marksList.reduce((a, b) => a + b, 0) / marksList.length : 0;

      const median =
        marksList.length > 0
          ? marksList.length % 2 === 0
            ? (marksList[marksList.length / 2 - 1]! + marksList[marksList.length / 2]!) / 2
            : marksList[Math.floor(marksList.length / 2)]!
          : 0;

      // 10-bin histogram over [0, maxMarks]
      const binEdges: number[] = [];
      const binStep = asg.maxMarks / 10;
      for (let i = 0; i <= 10; i++) {
        binEdges.push(Math.round(i * binStep * 100) / 100);
      }

      const counts = new Array(10).fill(0);
      for (const m of marksList) {
        let binIdx = Math.floor(m / binStep);
        if (binIdx >= 10) {
          binIdx = 9;
        }
        if (binIdx < 0) {
          binIdx = 0;
        }
        counts[binIdx] += 1;
      }

      res.status(200).json({
        data: {
          assigned: assignedStudentsCount,
          submitted: submittedCount,
          submissionRate: assignedStudentsCount > 0 ? submittedCount / assignedStudentsCount : 0,
          graded: gradedCount,
          histogram: {
            binEdges,
            counts,
          },
          mean: Math.round(mean * 100) / 100,
          median: Math.round(median * 100) / 100,
        },
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/professor/assignments/:id/similarity
professorRouter.get(
  "/professor/assignments/:id/similarity",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const asg = await LabAssignment.findById(id);
      if (!asg) {
        throw new AppError("E_NOT_FOUND", "Assignment not found", 404);
      }

      if (req.user!.role !== "admin" && asg.createdBy.toString() !== req.user!.id) {
        throw new AppError("E_FORBIDDEN", "Not authorized for this assignment", 403);
      }

      const submissions = await Submission.find({ assignmentId: asg._id }).populate("studentId");

      const submissionData = submissions.map((s) => {
        const u = s.studentId as unknown as {
          fullName?: string;
          rollNumber?: string;
          email?: string;
        } | null;
        const files = s.snapshot?.files || [];
        const mainFile = files.find((f) => f.path === "main.py") || files[0];
        return {
          id: s._id.toString(),
          studentName: u?.fullName || "Student",
          studentRoll: u?.rollNumber || u?.email || "Unknown",
          code: mainFile ? mainFile.content : "",
        };
      });

      const { analyzeBatchSimilarity } = await import("../services/similarity.service.js");
      const pairs = analyzeBatchSimilarity(submissionData, 0.8);
      const flaggedCount = pairs.filter((p) => p.isPlagiarized).length;

      res.status(200).json({
        data: {
          assignmentId: id,
          totalSubmissionsAnalyzed: submissionData.length,
          flaggedPairsCount: flaggedCount,
          pairs,
        },
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      next(err);
    }
  },
);
