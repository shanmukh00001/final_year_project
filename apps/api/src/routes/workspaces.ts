import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { SavedWorkspace, type IWorkspaceFile } from "../models/SavedWorkspace.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { AppError } from "../middleware/errorHandler.js";

const fileSchema = z.object({
  path: z.string().regex(/^[A-Za-z0-9_\-./]{1,80}\.py$/, "Invalid file path"),
  content: z.string(),
});

const createWorkspaceSchema = z
  .object({
    name: z.string().min(1).max(100).trim(),
    experimentId: z
      .string()
      .regex(/^(SS|NT|DSP|DIP|BEE|ACS|SSP)-[0-9]{2}$/, "Invalid experimentId"),
    experimentVersion: z.number().int().min(1),
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

const updateWorkspaceSchema = z
  .object({
    name: z.string().min(1).max(100).trim().optional(),
    experimentId: z.string().optional(),
    experimentVersion: z.number().int().min(1).optional(),
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

export function calculateWorkspaceSizeBytes(
  files: IWorkspaceFile[],
  parameters: Record<string, unknown>,
): number {
  const filesBytes = files.reduce(
    (acc, file) =>
      acc + Buffer.byteLength(file.content, "utf-8") + Buffer.byteLength(file.path, "utf-8"),
    0,
  );
  const paramsBytes = Buffer.byteLength(JSON.stringify(parameters || {}), "utf-8");
  return filesBytes + paramsBytes;
}

export const workspacesRouter = Router();
workspacesRouter.use(authenticate);

// GET /api/workspaces
workspacesRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { experimentId, page = "1", pageSize = "25" } = req.query;
      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(String(pageSize), 10) || 25));
      const skip = (pageNum - 1) * limitNum;

      const filter: Record<string, unknown> = { userId: req.user!.id };
      if (experimentId && typeof experimentId === "string") {
        filter["experimentId"] = experimentId;
      }

      const [workspaces, total] = await Promise.all([
        SavedWorkspace.find(filter)
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .select(
            "name experimentId experimentVersion sizeBytes revision createdAt updatedAt assignmentId",
          ),
        SavedWorkspace.countDocuments(filter),
      ]);

      res.status(200).json({
        data: workspaces.map((w) => ({
          id: w._id.toString(),
          name: w.name,
          experimentId: w.experimentId,
          experimentVersion: w.experimentVersion,
          sizeBytes: w.sizeBytes,
          revision: w.revision,
          assignmentId: w.assignmentId ? w.assignmentId.toString() : null,
          createdAt: w.createdAt,
          updatedAt: w.updatedAt,
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

// POST /api/workspaces
workspacesRouter.post(
  "/",
  validate({ body: createWorkspaceSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, experimentId, experimentVersion, files, mainFile, parameters, layout } =
        req.body;

      // Check max count limit (50 workspaces per user)
      const count = await SavedWorkspace.countDocuments({ userId: req.user!.id });
      if (count >= 50) {
        throw new AppError("E_LIMIT_WORKSPACE_COUNT", "Maximum workspace limit of 50 reached", 409);
      }

      // Check unique name per user
      const existingName = await SavedWorkspace.findOne({ userId: req.user!.id, name });
      if (existingName) {
        throw new AppError("E_CONFLICT", `A workspace named "${name}" already exists`, 409);
      }

      // Calculate size limit (200 KB)
      const sizeBytes = calculateWorkspaceSizeBytes(files, parameters);
      if (sizeBytes > 204800) {
        throw new AppError(
          "E_LIMIT_WORKSPACE",
          `Workspace size ${sizeBytes} exceeds maximum allowed 200 KB`,
          413,
        );
      }

      const workspace = await SavedWorkspace.create({
        userId: req.user!.id,
        name,
        experimentId,
        experimentVersion,
        files,
        mainFile,
        parameters,
        layout,
        sizeBytes,
        revision: 1,
      });

      res.status(201).json({
        data: {
          id: workspace._id.toString(),
          name: workspace.name,
          experimentId: workspace.experimentId,
          experimentVersion: workspace.experimentVersion,
          sizeBytes: workspace.sizeBytes,
          revision: workspace.revision,
          createdAt: workspace.createdAt,
          updatedAt: workspace.updatedAt,
        },
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/workspaces/:id
workspacesRouter.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspace = await SavedWorkspace.findOne({
        _id: req.params["id"],
        userId: req.user!.id,
      });

      if (!workspace) {
        throw new AppError("E_NOT_FOUND", "Workspace not found", 404);
      }

      res.setHeader("ETag", `"${workspace.revision}"`);
      res.status(200).json({
        data: {
          id: workspace._id.toString(),
          name: workspace.name,
          experimentId: workspace.experimentId,
          experimentVersion: workspace.experimentVersion,
          files: workspace.files,
          mainFile: workspace.mainFile,
          parameters: workspace.parameters,
          layout: workspace.layout,
          sizeBytes: workspace.sizeBytes,
          revision: workspace.revision,
          createdAt: workspace.createdAt,
          updatedAt: workspace.updatedAt,
        },
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/workspaces/:id
workspacesRouter.put(
  "/:id",
  validate({ body: updateWorkspaceSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ifMatchHeader = req.header("if-match");
      if (!ifMatchHeader) {
        throw new AppError("E_CONFLICT", "If-Match header with current revision is required", 409);
      }

      const expectedRevision = parseInt(ifMatchHeader.replace(/"/g, "").trim(), 10);
      if (isNaN(expectedRevision)) {
        throw new AppError("E_CONFLICT", "Invalid If-Match header value", 409);
      }

      const workspace = await SavedWorkspace.findOne({
        _id: req.params["id"],
        userId: req.user!.id,
      });

      if (!workspace) {
        throw new AppError("E_NOT_FOUND", "Workspace not found", 404);
      }

      if (workspace.revision !== expectedRevision) {
        throw new AppError(
          "E_CONFLICT",
          `Workspace modified elsewhere (current revision: ${workspace.revision}, provided: ${expectedRevision})`,
          409,
        );
      }

      const { name, experimentVersion, files, mainFile, parameters, layout } = req.body;

      if (name && name !== workspace.name) {
        const nameCollision = await SavedWorkspace.findOne({
          userId: req.user!.id,
          name,
          _id: { $ne: workspace._id },
        });
        if (nameCollision) {
          throw new AppError("E_CONFLICT", `A workspace named "${name}" already exists`, 409);
        }
        workspace.name = name;
      }

      const sizeBytes = calculateWorkspaceSizeBytes(files, parameters);
      if (sizeBytes > 204800) {
        throw new AppError(
          "E_LIMIT_WORKSPACE",
          `Workspace size ${sizeBytes} exceeds maximum allowed 200 KB`,
          413,
        );
      }

      workspace.files = files;
      workspace.mainFile = mainFile;
      workspace.parameters = parameters;
      workspace.layout = layout;
      workspace.sizeBytes = sizeBytes;
      if (experimentVersion) {
        workspace.experimentVersion = experimentVersion;
      }
      workspace.revision += 1;

      await workspace.save();

      res.setHeader("ETag", `"${workspace.revision}"`);
      res.status(200).json({
        data: {
          id: workspace._id.toString(),
          name: workspace.name,
          experimentId: workspace.experimentId,
          experimentVersion: workspace.experimentVersion,
          sizeBytes: workspace.sizeBytes,
          revision: workspace.revision,
          createdAt: workspace.createdAt,
          updatedAt: workspace.updatedAt,
        },
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/workspaces/:id
workspacesRouter.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspace = await SavedWorkspace.findOneAndDelete({
        _id: req.params["id"],
        userId: req.user!.id,
      });

      if (!workspace) {
        throw new AppError("E_NOT_FOUND", "Workspace not found", 404);
      }

      res.status(200).json({
        data: { ok: true },
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      next(err);
    }
  },
);
