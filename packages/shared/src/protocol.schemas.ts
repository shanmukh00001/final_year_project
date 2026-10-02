import { z } from "zod";
import type { MainToWorker, WorkerToMain } from "./protocol.js";
import type { ErrorCode } from "./errors.js";

const runLimitsSchema = z.object({
  timeoutMs: z.number(),
  maxArrayElements: z.number(),
  maxWorkerHeapMb: z.number(),
  maxStdoutBytes: z.number(),
});

const engineConfigSchema = z.object({
  pyodideBaseUrl: z.string(),
  preloadPackages: z.array(z.string()),
  lazyPackages: z.array(z.string()),
  limits: runLimitsSchema,
  interruptBuffer: z.custom<SharedArrayBuffer | null>(
    (val) =>
      val === null ||
      (typeof SharedArrayBuffer !== "undefined" && val instanceof SharedArrayBuffer),
  ),
  deviceProfile: z.enum(["desktop", "tablet", "phone"]),
});

const paramDeclSchema = z.object({
  name: z.string(),
  default: z.union([z.number(), z.string(), z.boolean()]),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  label: z.string().optional(),
  kind: z.enum(["slider", "number", "select", "toggle"]),
  options: z.array(z.string()).optional(),
});

const variableInfoSchema = z.object({
  name: z.string(),
  type: z.string(),
  shape: z.array(z.number()).nullable(),
  dtype: z.string().nullable(),
  preview: z.string(),
  sizeBytes: z.number().nullable(),
});

const figureKindSchema = z.enum([
  "cartesian",
  "stem",
  "bode",
  "pzmap",
  "heatmap",
  "image",
  "surface3d",
  "scatter3d",
  "constellation",
  "eye",
  "raster",
]);

const figureLayoutSchema = z.object({
  title: z.string().optional(),
  xLabel: z.string().optional(),
  yLabel: z.string().optional(),
  xScale: z.enum(["linear", "log"]).optional(),
  yScale: z.enum(["linear", "log"]).optional(),
  xRange: z.tuple([z.number(), z.number()]).optional(),
  yRange: z.tuple([z.number(), z.number()]).optional(),
  grid: z.boolean().optional(),
  legend: z.boolean().optional(),
  subplots: z
    .object({ rows: z.number(), cols: z.number(), shareX: z.boolean().optional() })
    .optional(),
  aspect: z.enum(["auto", "equal"]).optional(),
  shapes: z
    .array(
      z.object({
        type: z.enum(["circle", "line", "vline", "hline"]),
        x0: z.number().optional(),
        y0: z.number().optional(),
        x1: z.number().optional(),
        y1: z.number().optional(),
        r: z.number().optional(),
      }),
    )
    .optional(),
});

const traceDataSchema = z.object({
  type: z.enum([
    "scatter",
    "scattergl",
    "bar",
    "heatmap",
    "image",
    "surface",
    "scatter3d",
    "histogram",
  ]),
  name: z.string().optional(),
  x: z.instanceof(Float64Array).optional(),
  y: z.instanceof(Float64Array).optional(),
  z: z.instanceof(Float64Array).optional(),
  zMatrix: z
    .object({ data: z.instanceof(Float64Array), rows: z.number(), cols: z.number() })
    .optional(),
  imageRgba: z
    .object({ data: z.instanceof(Uint8ClampedArray), width: z.number(), height: z.number() })
    .optional(),
  mode: z.enum(["lines", "markers", "lines+markers", "stem"]).optional(),
  xAxis: z.enum(["x", "x2"]).optional(),
  yAxis: z.enum(["y", "y2"]).optional(),
  style: z
    .object({
      color: z.string().optional(),
      width: z.number().optional(),
      dash: z.enum(["solid", "dash", "dot"]).optional(),
      markerSize: z.number().optional(),
      opacity: z.number().optional(),
    })
    .optional(),
});

const figureSpecSchema = z.object({
  id: z.string(),
  kind: figureKindSchema,
  layout: figureLayoutSchema,
  traces: z.array(traceDataSchema),
  raster: z
    .object({
      mime: z.enum(["image/png", "image/svg+xml"]),
      data: z.instanceof(ArrayBuffer),
    })
    .optional(),
});

const errorCodeSchema = z.enum([
  "E_SYNTAX",
  "E_RUNTIME",
  "E_POLICY_VIOLATION",
  "E_PACKAGE_LOAD",
  "E_LIMIT_TIMEOUT",
  "E_LIMIT_ARRAY",
  "E_LIMIT_STDOUT",
  "E_LIMIT_MEMORY",
  "E_LIMIT_UPLOAD",
  "E_LIMIT_WORKSPACE",
  "E_LIMIT_WORKSPACE_COUNT",
  "E_CANCELLED",
  "E_ENGINE_BOOT",
  "E_FS",
  "E_INTERNAL",
  "E_BAD_REQUEST",
  "E_UNAUTHENTICATED",
  "E_INVALID_CREDENTIALS",
  "E_FORBIDDEN",
  "E_ACCOUNT_DISABLED",
  "E_NOT_FOUND",
  "E_CONFLICT",
  "E_ALREADY_SUBMITTED",
  "E_PAST_DEADLINE",
  "E_VALIDATION",
  "E_EMAIL_DOMAIN",
  "E_EMAIL_UNVERIFIED",
  "E_MARKS_RANGE",
  "E_RATE_LIMITED",
  "E_CONSENT_REQUIRED",
]) as z.ZodType<ErrorCode>;

const pyErrorSchema = z.object({
  code: errorCodeSchema,
  name: z.string(),
  message: z.string(),
  line: z.number().nullable(),
  column: z.number().nullable(),
  traceback: z.string(),
});

export const mainToWorkerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("INIT"), config: engineConfigSchema }),
  z.object({
    type: z.literal("RUN_CODE"),
    runId: z.string(),
    code: z.string(),
    filename: z.literal("<user>"),
    lineOffset: z.number().optional(),
    selection: z.boolean(),
    params: z.record(z.union([z.number(), z.string(), z.boolean()])),
    limits: runLimitsSchema,
  }),
  z.object({
    type: z.literal("FS_WRITE"),
    requestId: z.string(),
    path: z.string(),
    data: z.instanceof(ArrayBuffer),
  }),
  z.object({
    type: z.literal("FS_READ"),
    requestId: z.string(),
    path: z.string(),
  }),
  z.object({
    type: z.literal("FS_LIST"),
    requestId: z.string(),
    dir: z.string(),
  }),
  z.object({
    type: z.literal("FS_DELETE"),
    requestId: z.string(),
    path: z.string(),
  }),
  z.object({
    type: z.literal("INSPECT_VARIABLE"),
    requestId: z.string(),
    name: z.string(),
    maxRows: z.number(),
  }),
  z.object({
    type: z.literal("PING"),
    sentAt: z.number(),
  }),
]);

export const workerToMainSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("ENGINE_PROGRESS"),
    stage: z.enum(["runtime", "packages", "bootstrap"]),
    percent: z.number(),
    message: z.string(),
  }),
  z.object({
    type: z.literal("ENGINE_READY"),
    pyodideVersion: z.string(),
    pythonVersion: z.string(),
    packages: z.record(z.string()),
  }),
  z.object({
    type: z.literal("ENGINE_ERROR"),
    error: pyErrorSchema,
  }),
  z.object({
    type: z.literal("STREAM_OUTPUT"),
    runId: z.string(),
    stream: z.enum(["stdout", "stderr"]),
    text: z.string(),
  }),
  z.object({
    type: z.literal("PARAM_DECLARED"),
    runId: z.string(),
    param: paramDeclSchema,
  }),
  z.object({
    type: z.literal("FIGURE_READY"),
    runId: z.string(),
    figure: figureSpecSchema,
  }),
  z.object({
    type: z.literal("VARIABLES_UPDATED"),
    runId: z.string(),
    variables: z.array(variableInfoSchema),
  }),
  z.object({
    type: z.literal("RUN_COMPLETED"),
    runId: z.string(),
    elapsedMs: z.number(),
  }),
  z.object({
    type: z.literal("RUN_FAILED"),
    runId: z.string(),
    error: pyErrorSchema,
    elapsedMs: z.number(),
  }),
  z.object({
    type: z.literal("RUN_CANCELLED"),
    runId: z.string(),
    elapsedMs: z.number(),
  }),
  z.object({
    type: z.literal("FS_RESULT"),
    requestId: z.string(),
    ok: z.boolean(),
    data: z.union([z.instanceof(ArrayBuffer), z.array(z.string())]).optional(),
    error: z.string().optional(),
  }),
  z.object({
    type: z.literal("VARIABLE_DETAIL"),
    requestId: z.string(),
    rows: z.array(z.array(z.unknown())),
    columns: z.array(z.string()),
  }),
  z.object({
    type: z.literal("MEMORY_STATS"),
    heapMb: z.number(),
  }),
  z.object({
    type: z.literal("PONG"),
    sentAt: z.number(),
  }),
]);

export function validateMainToWorker(msg: unknown): MainToWorker {
  return mainToWorkerSchema.parse(msg) as MainToWorker;
}

export function validateWorkerToMain(msg: unknown): WorkerToMain {
  return workerToMainSchema.parse(msg) as WorkerToMain;
}
