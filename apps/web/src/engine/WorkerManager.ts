/**
 * WorkerManager.ts
 * Main-thread controller managing worker lifecycle, typed IPC,
 * timeouts, cooperative interrupt (SAB), and automatic fallback respawn.
 */

import {
  type MainToWorker,
  type WorkerToMain,
  type EngineConfig,
  type RunLimits,
  type ParamValue,
  type RunId,
  validateWorkerToMain,
  RUN_TIMEOUT_MS,
  MAX_ARRAY_ELEMENTS,
  MAX_WORKER_HEAP_MB,
  MAX_STDOUT_BYTES_PER_RUN,
} from "@vlab/shared";

export type MessageHandler = (msg: WorkerToMain) => void;

export class WorkerManager {
  private worker: Worker | null = null;
  private messageListeners = new Set<MessageHandler>();
  private activeRunTimeout: ReturnType<typeof setTimeout> | null = null;
  private currentRunId: RunId | null = null;
  private isIsolated = false;
  private interruptBuffer: SharedArrayBuffer | null = null;
  private interruptArray: Int32Array | null = null;

  constructor() {
    this.isIsolated =
      typeof window !== "undefined" &&
      window.crossOriginIsolated === true &&
      typeof SharedArrayBuffer !== "undefined";

    if (this.isIsolated) {
      this.interruptBuffer = new SharedArrayBuffer(4);
      this.interruptArray = new Int32Array(this.interruptBuffer);
    }
  }

  public onMessage(handler: MessageHandler): () => void {
    this.messageListeners.add(handler);
    return () => this.messageListeners.delete(handler);
  }

  private dispatch(msg: WorkerToMain): void {
    for (const listener of this.messageListeners) {
      try {
        listener(msg);
      } catch {
        // Suppress listener error in dispatcher
      }
    }
  }

  public spawn(): void {
    if (this.worker) {
      this.terminate();
    }

    // Spawn dedicated worker
    this.worker = new Worker(new URL("./worker/pyodide.worker.ts", import.meta.url), {
      type: "module",
    });

    this.worker.onmessage = (event: MessageEvent<unknown>) => {
      try {
        const msg = validateWorkerToMain(event.data);

        // Discard stale run messages
        if ("runId" in msg && msg.runId && msg.runId !== this.currentRunId) {
          return;
        }

        if (msg.type === "RUN_COMPLETED" || msg.type === "RUN_FAILED" || msg.type === "RUN_CANCELLED") {
          this.clearRunTimeout();
          this.currentRunId = null;
        }

        this.dispatch(msg);
      } catch {
        // Discard malformed worker messages
      }
    };

    this.worker.onerror = (err) => {
      this.dispatch({
        type: "ENGINE_ERROR",
        error: {
          code: "E_INTERNAL",
          name: "WorkerError",
          message: err.message || "Unknown worker error",
          line: null,
          column: null,
          traceback: "",
        },
      });
    };
  }

  public init(customLimits?: Partial<RunLimits>): void {
    if (!this.worker) {
      this.spawn();
    }

    const limits: RunLimits = {
      timeoutMs: RUN_TIMEOUT_MS,
      maxArrayElements: MAX_ARRAY_ELEMENTS,
      maxWorkerHeapMb: MAX_WORKER_HEAP_MB,
      maxStdoutBytes: MAX_STDOUT_BYTES_PER_RUN,
      ...customLimits,
    };

    const config: EngineConfig = {
      pyodideBaseUrl: "/pyodide/314.0.3/",
      preloadPackages: ["numpy", "scipy"],
      lazyPackages: ["matplotlib"],
      limits,
      interruptBuffer: this.interruptBuffer,
      deviceProfile: "desktop",
    };

    this.send({
      type: "INIT",
      config,
    });
  }

  public runCode(
    code: string,
    params: Record<string, ParamValue> = {},
    customLimits?: Partial<RunLimits>,
  ): RunId {
    const runId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    this.currentRunId = runId;

    const limits: RunLimits = {
      timeoutMs: RUN_TIMEOUT_MS,
      maxArrayElements: MAX_ARRAY_ELEMENTS,
      maxWorkerHeapMb: MAX_WORKER_HEAP_MB,
      maxStdoutBytes: MAX_STDOUT_BYTES_PER_RUN,
      ...customLimits,
    };

    // Reset interrupt flag
    if (this.interruptArray) {
      Atomics.store(this.interruptArray, 0, 0);
    }

    // Set wall-clock timeout
    this.clearRunTimeout();
    this.activeRunTimeout = setTimeout(() => {
      this.handleTimeout(runId);
    }, limits.timeoutMs);

    this.send({
      type: "RUN_CODE",
      runId,
      code,
      filename: "<user>",
      selection: false,
      params,
      limits,
    });

    return runId;
  }

  public stop(): void {
    if (!this.currentRunId) {
      return;
    }

    if (this.isIsolated && this.interruptArray) {
      // 2 = SIGINT
      Atomics.store(this.interruptArray, 0, 2);

      // Give 2s grace period before hard terminate
      setTimeout(() => {
        if (this.currentRunId) {
          this.terminateAndRespawn("Execution cancelled (kernel reset)");
        }
      }, 2000);
    } else {
      // Fallback terminate immediately
      this.terminateAndRespawn("Execution stopped (kernel reset)");
    }
  }

  private handleTimeout(runId: RunId): void {
    if (this.currentRunId === runId) {
      this.dispatch({
        type: "RUN_FAILED",
        runId,
        elapsedMs: RUN_TIMEOUT_MS,
        error: {
          code: "E_LIMIT_TIMEOUT",
          name: "TimeoutError",
          message: `Execution timed out after ${RUN_TIMEOUT_MS / 1000}s`,
          line: null,
          column: null,
          traceback: "",
        },
      });
      this.terminateAndRespawn("Execution timed out (kernel reset)");
    }
  }

  private terminateAndRespawn(_reason: string): void {
    const oldRunId = this.currentRunId;
    this.clearRunTimeout();
    this.terminate();

    if (oldRunId) {
      this.dispatch({
        type: "RUN_CANCELLED",
        runId: oldRunId,
        elapsedMs: 0,
      });
    }

    // Respawn worker
    this.spawn();
    this.init();
  }

  private clearRunTimeout(): void {
    if (this.activeRunTimeout) {
      clearTimeout(this.activeRunTimeout);
      this.activeRunTimeout = null;
    }
  }

  public send(msg: MainToWorker, transfer: Transferable[] = []): void {
    if (!this.worker) {
      throw new Error("Worker is not spawned");
    }
    this.worker.postMessage(msg, { transfer });
  }

  public terminate(): void {
    this.clearRunTimeout();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
