import { type PyError } from "./errors.js";

export type RunId = string; // UUID v4
export type RequestId = string; // UUID v4

export type EngineStage = "runtime" | "packages" | "bootstrap";

export interface RunLimits {
  timeoutMs: number; // default 30000, max 120000
  maxArrayElements: number; // 20_000_000
  maxWorkerHeapMb: number; // 1200 desktop, 800 tablet, 600 phone
  maxStdoutBytes: number; // 2_097_152
}

export interface EngineConfig {
  pyodideBaseUrl: string; // "/pyodide/314.0.3/" (versioned, same origin)
  preloadPackages: string[]; // ["numpy","scipy"]
  lazyPackages: string[]; // ["matplotlib"]
  limits: RunLimits;
  interruptBuffer: SharedArrayBuffer | null; // null when not cross-origin isolated
  deviceProfile: "desktop" | "tablet" | "phone";
}

export type ParamValue = number | string | boolean;

export interface ParamDecl {
  name: string;
  default: ParamValue;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  kind: "slider" | "number" | "select" | "toggle";
  options?: string[];
}

export interface VariableInfo {
  name: string;
  type: string; // "ndarray","float","int","complex","list","str"
  shape: number[] | null;
  dtype: string | null;
  preview: string; // <= 120 chars
  sizeBytes: number | null;
}

// ---------- Figures ----------
export type FigureKind =
  | "cartesian"
  | "stem"
  | "bode"
  | "pzmap"
  | "heatmap"
  | "image"
  | "surface3d"
  | "scatter3d"
  | "constellation"
  | "eye"
  | "raster";

export interface TraceData {
  type:
    | "scatter"
    | "scattergl"
    | "bar"
    | "heatmap"
    | "image"
    | "surface"
    | "scatter3d"
    | "histogram";
  name?: string;
  x?: Float64Array;
  y?: Float64Array;
  z?: Float64Array;
  zMatrix?: { data: Float64Array; rows: number; cols: number };
  imageRgba?: { data: Uint8ClampedArray; width: number; height: number };
  mode?: "lines" | "markers" | "lines+markers" | "stem";
  xAxis?: "x" | "x2";
  yAxis?: "y" | "y2";
  style?: {
    color?: string;
    width?: number;
    dash?: "solid" | "dash" | "dot";
    markerSize?: number;
    opacity?: number;
  };
}

export interface FigureLayout {
  title?: string;
  xLabel?: string;
  yLabel?: string;
  xScale?: "linear" | "log";
  yScale?: "linear" | "log";
  xRange?: [number, number];
  yRange?: [number, number];
  grid?: boolean;
  legend?: boolean;
  subplots?: { rows: number; cols: number; shareX?: boolean };
  aspect?: "auto" | "equal";
  shapes?: Array<{
    type: "circle" | "line" | "vline" | "hline";
    x0?: number;
    y0?: number;
    x1?: number;
    y1?: number;
    r?: number;
  }>;
}

export interface FigureSpec {
  id: string; // stable id; same id replaces existing figure
  kind: FigureKind;
  layout: FigureLayout;
  traces: TraceData[];
  raster?: { mime: "image/png" | "image/svg+xml"; data: ArrayBuffer }; // matplotlib compat
}

// ---------- Main -> Worker ----------
export type MainToWorker =
  | { type: "INIT"; config: EngineConfig }
  | {
      type: "RUN_CODE";
      runId: RunId;
      code: string;
      filename: "<user>";
      lineOffset?: number;
      selection: boolean;
      params: Record<string, ParamValue>;
      limits: RunLimits;
    }
  | { type: "FS_WRITE"; requestId: RequestId; path: string; data: ArrayBuffer }
  | { type: "FS_READ"; requestId: RequestId; path: string }
  | { type: "FS_LIST"; requestId: RequestId; dir: string }
  | { type: "FS_DELETE"; requestId: RequestId; path: string }
  | { type: "INSPECT_VARIABLE"; requestId: RequestId; name: string; maxRows: number }
  | { type: "PING"; sentAt: number };

// ---------- Worker -> Main ----------
export type WorkerToMain =
  | { type: "ENGINE_PROGRESS"; stage: EngineStage; percent: number; message: string }
  | {
      type: "ENGINE_READY";
      pyodideVersion: string;
      pythonVersion: string;
      packages: Record<string, string>;
    }
  | { type: "ENGINE_ERROR"; error: PyError }
  | { type: "STREAM_OUTPUT"; runId: RunId; stream: "stdout" | "stderr"; text: string }
  | { type: "PARAM_DECLARED"; runId: RunId; param: ParamDecl }
  | { type: "FIGURE_READY"; runId: RunId; figure: FigureSpec }
  | { type: "VARIABLES_UPDATED"; runId: RunId; variables: VariableInfo[] }
  | { type: "RUN_COMPLETED"; runId: RunId; elapsedMs: number }
  | { type: "RUN_FAILED"; runId: RunId; error: PyError; elapsedMs: number }
  | { type: "RUN_CANCELLED"; runId: RunId; elapsedMs: number }
  | {
      type: "FS_RESULT";
      requestId: RequestId;
      ok: boolean;
      data?: ArrayBuffer | string[];
      error?: string;
    }
  | { type: "VARIABLE_DETAIL"; requestId: RequestId; rows: unknown[][]; columns: string[] }
  | { type: "MEMORY_STATS"; heapMb: number }
  | { type: "PONG"; sentAt: number };
