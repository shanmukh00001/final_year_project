import { WorkerManager } from "../src/engine/WorkerManager.js";
import { type WorkerToMain } from "@vlab/shared";

// Mock Worker implementation for node/Jest environment
class MockWorker {
  public onmessage: ((e: MessageEvent) => void) | null = null;
  public onerror: ((e: ErrorEvent) => void) | null = null;
  private terminated = false;

  constructor(
    public scriptUrl: string | URL,
    public options?: WorkerOptions,
  ) {}

  postMessage(data: unknown): void {
    if (this.terminated) {
      return;
    }

    const payload = data as { type: string; code?: string; runId?: string };

    // Simulate async worker processing
    setTimeout(() => {
      if (payload.type === "INIT") {
        this.emit({
          type: "ENGINE_PROGRESS",
          stage: "runtime",
          percent: 20,
          message: "Loading runtime...",
        });
        this.emit({
          type: "ENGINE_READY",
          pyodideVersion: "314.0.3",
          pythonVersion: "3.14",
          packages: { numpy: "2.4.3", scipy: "1.17.1" },
        });
      } else if (payload.type === "RUN_CODE") {
        const runId = payload.runId || "test-run";
        if (payload.code && payload.code.includes("while True")) {
          // Infinite loop - worker does not return, main thread timeout will fire
          return;
        }

        // Check for policy violation simulation
        if (
          payload.code &&
          (payload.code.includes("import js") || payload.code.includes("import pyodide"))
        ) {
          this.emit({
            type: "RUN_FAILED",
            runId,
            elapsedMs: 5,
            error: {
              code: "E_POLICY_VIOLATION",
              name: "PolicyViolationError",
              message: "Import of forbidden module is blocked by PolicyGuard",
              line: 1,
              column: 0,
              traceback: "PolicyViolationError",
            },
          });
          return;
        }

        // Simulate state persistence & output
        this.emit({
          type: "STREAM_OUTPUT",
          runId,
          stream: "stdout",
          text: "Output from run\n",
        });

        this.emit({
          type: "VARIABLES_UPDATED",
          runId,
          variables: [
            {
              name: "x",
              type: "int",
              shape: null,
              dtype: null,
              preview: "42",
              sizeBytes: 8,
            },
          ],
        });

        this.emit({
          type: "RUN_COMPLETED",
          runId,
          elapsedMs: 15,
        });
      }
    }, 10);
  }

  private emit(msg: WorkerToMain): void {
    if (this.onmessage && !this.terminated) {
      this.onmessage({ data: msg } as MessageEvent);
    }
  }

  terminate(): void {
    this.terminated = true;
  }
}

describe("AC-ENG: Pyodide Worker Lifecycle & Security Integration", () => {
  let originalWorker: typeof Worker;

  beforeAll(() => {
    originalWorker = (globalThis as unknown as { Worker: typeof Worker }).Worker;
    (globalThis as unknown as { Worker: unknown }).Worker = MockWorker;
  });

  afterAll(() => {
    (globalThis as unknown as { Worker: typeof Worker }).Worker = originalWorker;
  });

  it("AC-ENG-001: handles boot and progresses to ready state", (done) => {
    const manager = new WorkerManager();
    const messages: WorkerToMain[] = [];

    manager.onMessage((msg) => {
      messages.push(msg);
      if (msg.type === "ENGINE_READY") {
        expect(messages.some((m) => m.type === "ENGINE_PROGRESS")).toBe(true);
        expect(msg.pyodideVersion).toBe("314.0.3");
        manager.terminate();
        done();
      }
    });

    manager.init();
  });

  it("AC-ENG-003: enforces PolicyGuard and blocks forbidden imports", (done) => {
    const manager = new WorkerManager();
    manager.init();

    manager.onMessage((msg) => {
      if (msg.type === "RUN_FAILED") {
        expect(msg.error.code).toBe("E_POLICY_VIOLATION");
        expect(msg.error.message).toContain("blocked by PolicyGuard");
        manager.terminate();
        done();
      }
    });

    setTimeout(() => {
      manager.runCode("import js\nprint(js.window)");
    }, 50);
  });

  it("AC-ENG-005: captures stdout streams and variables update", (done) => {
    const manager = new WorkerManager();
    manager.init();
    let stdoutReceived = false;
    let varsReceived = false;

    manager.onMessage((msg) => {
      if (msg.type === "STREAM_OUTPUT") {
        stdoutReceived = true;
        expect(msg.text).toContain("Output from run");
      }
      if (msg.type === "VARIABLES_UPDATED") {
        varsReceived = true;
        expect(msg.variables.some((v) => v.name === "x")).toBe(true);
      }
      if (msg.type === "RUN_COMPLETED") {
        expect(stdoutReceived).toBe(true);
        expect(varsReceived).toBe(true);
        manager.terminate();
        done();
      }
    });

    setTimeout(() => {
      manager.runCode("x = 42\nprint('Output from run')");
    }, 50);
  });

  it("AC-ENG-009: terminates and emits timeout on runaway executions", (done) => {
    const manager = new WorkerManager();
    manager.init();

    manager.onMessage((msg) => {
      if (msg.type === "RUN_FAILED") {
        expect(msg.error.code).toBe("E_LIMIT_TIMEOUT");
        manager.terminate();
        done();
      }
    });

    // Run with 50ms short timeout to verify timeout guard
    manager.runCode("while True: pass", {}, { timeoutMs: 50 });
  });
});
