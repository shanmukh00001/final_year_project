/**
 * pyodide.worker.ts
 * Dedicated Web Worker for sandboxed execution of Python numerical simulations.
 * Never imported on the main thread.
 */

import { type PyodideInterface, loadPyodide } from "pyodide";
import type { PyProxy } from "pyodide/ffi";
import type {
  MainToWorker,
  WorkerToMain,
  VariableInfo,
  FigureSpec,
  ParamDecl,
} from "@vlab/shared";
import { validateMainToWorker } from "@vlab/shared";

declare const self: DedicatedWorkerGlobalScope;

interface PythonExecutionError extends Error {
  lineno?: number;
  offset?: number;
}

let pyodideInstance: PyodideInterface | null = null;
let persistentNamespace: PyProxy | null = null;
let currentRunId: string | null = null;
let stdoutBuffer = "";
let stderrBuffer = "";
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let totalStdoutBytes = 0;

const VLAB_PYTHON_BOOTSTRAP = `
import sys
import ast
import numpy as np

# Injected vlab runtime module
class PolicyViolationError(Exception):
    def __init__(self, message, line=None, column=None):
        super().__init__(message)
        self.message = message
        self.line = line
        self.column = column

FORBIDDEN_MODULES = {
    "js", "pyodide", "pyodide_js", "pyodide.ffi",
    "micropip", "subprocess", "socket", "ctypes",
    "ssl", "http", "urllib", "requests", "webbrowser", "importlib"
}

FORBIDDEN_ATTRS = {
    "__subclasses__", "__globals__", "__loader__", "__spec__", "__import__"
}

class PolicyGuardFinder:
    def find_spec(self, fullname, path, target=None):
        root = fullname.split(".")[0]
        if fullname in FORBIDDEN_MODULES or root in FORBIDDEN_MODULES:
            raise ImportError(f"PolicyGuard: Import of module '{fullname}' is forbidden.")
        return None

def install_policy_guard():
    finder = PolicyGuardFinder()
    if not any(isinstance(f, PolicyGuardFinder) for f in sys.meta_path):
        sys.meta_path.insert(0, finder)

def check_policy(code_str):
    try:
        tree = ast.parse(code_str, filename="<user>")
    except SyntaxError as e:
        err = PolicyViolationError(f"SyntaxError: {e.msg}", line=e.lineno, column=e.offset)
        err.is_syntax = True
        raise err

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                root = alias.name.split(".")[0]
                if alias.name in FORBIDDEN_MODULES or root in FORBIDDEN_MODULES:
                    raise PolicyViolationError(
                        f"Import of forbidden module '{alias.name}' is blocked by PolicyGuard",
                        line=node.lineno, column=node.col_offset
                    )
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                root = node.module.split(".")[0]
                if node.module in FORBIDDEN_MODULES or root in FORBIDDEN_MODULES:
                    raise PolicyViolationError(
                        f"Import from forbidden module '{node.module}' is blocked by PolicyGuard",
                        line=node.lineno, column=node.col_offset
                    )
        elif isinstance(node, ast.Attribute):
            if node.attr in FORBIDDEN_ATTRS:
                raise PolicyViolationError(
                    f"Access to attribute '{node.attr}' is blocked by PolicyGuard",
                    line=node.lineno, column=node.col_offset
                )
            if node.attr in {"system", "popen", "spawn", "fork"} and isinstance(node.value, ast.Name) and node.value.id == "os":
                raise PolicyViolationError(
                    f"os.{node.attr} execution is blocked by PolicyGuard",
                    line=node.lineno, column=node.col_offset
                )
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id in {"eval", "exec", "compile"}:
                raise PolicyViolationError(
                    f"Direct call to '{node.func.id}' is blocked by PolicyGuard",
                    line=node.lineno, column=node.col_offset
                )
    return True

# Initialize policy guard
install_policy_guard()
`;

function postTypedMessage(msg: WorkerToMain, transfer: Transferable[] = []): void {
  self.postMessage(msg, { transfer });
}

function flushOutput(): void {
  if (!currentRunId) {
    return;
  }

  if (stdoutBuffer.length > 0) {
    postTypedMessage({
      type: "STREAM_OUTPUT",
      runId: currentRunId,
      stream: "stdout",
      text: stdoutBuffer,
    });
    stdoutBuffer = "";
  }

  if (stderrBuffer.length > 0) {
    postTypedMessage({
      type: "STREAM_OUTPUT",
      runId: currentRunId,
      stream: "stderr",
      text: stderrBuffer,
    });
    stderrBuffer = "";
  }
}

function scheduleFlush(): void {
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushOutput();
    }, 16);
  }
}

async function handleInit(config: MainToWorker & { type: "INIT" }): Promise<void> {
  try {
    postTypedMessage({
      type: "ENGINE_PROGRESS",
      stage: "runtime",
      percent: 10,
      message: "Downloading Pyodide runtime...",
    });

    pyodideInstance = await loadPyodide({
      indexURL: config.config.pyodideBaseUrl || "/pyodide/314.0.3/",
    });

    if (config.config.interruptBuffer && typeof pyodideInstance.setInterruptBuffer === "function") {
      pyodideInstance.setInterruptBuffer(new Int32Array(config.config.interruptBuffer));
    }

    // Set stdout & stderr batch handlers
    pyodideInstance.setStdout({
      batched: (text: string) => {
        totalStdoutBytes += text.length;
        if (totalStdoutBytes > (config.config.limits.maxStdoutBytes || 2097152)) {
          stdoutBuffer += "\n[Output truncated (2 MB limit reached)]\n";
          flushOutput();
          return;
        }
        stdoutBuffer += text + "\n";
        scheduleFlush();
      },
    });

    pyodideInstance.setStderr({
      batched: (text: string) => {
        stderrBuffer += text + "\n";
        scheduleFlush();
      },
    });

    postTypedMessage({
      type: "ENGINE_PROGRESS",
      stage: "packages",
      percent: 45,
      message: "Loading core numerical packages (numpy, scipy)...",
    });

    if (config.config.preloadPackages && config.config.preloadPackages.length > 0) {
      for (const pkg of config.config.preloadPackages) {
        await pyodideInstance.loadPackage(pkg);
      }
    }

    postTypedMessage({
      type: "ENGINE_PROGRESS",
      stage: "bootstrap",
      percent: 85,
      message: "Bootstrapping vlab engine & PolicyGuard...",
    });

    // Create persistent namespace
    const dictConstructor = pyodideInstance.globals["get"]("dict") as () => PyProxy;
    persistentNamespace = dictConstructor();
    persistentNamespace["set"]("__name__", "__main__");

    // Install PolicyGuard inside Python
    pyodideInstance.runPython(VLAB_PYTHON_BOOTSTRAP);

    // Register vlab JS bridge for figures and params
    const bridge = {
      emitFigure: (_id: string, figureJsonStr: string) => {
        if (!currentRunId) {
          return;
        }
        try {
          const fig = JSON.parse(figureJsonStr) as FigureSpec;
          postTypedMessage({
            type: "FIGURE_READY",
            runId: currentRunId,
            figure: fig,
          });
        } catch {
          // Ignore figure parse error
        }
      },
      declareParam: (paramJsonStr: string) => {
        if (!currentRunId) {
          return;
        }
        try {
          const p = JSON.parse(paramJsonStr) as ParamDecl;
          postTypedMessage({
            type: "PARAM_DECLARED",
            runId: currentRunId,
            param: p,
          });
        } catch {
          // Ignore param parse error
        }
      },
    };

    pyodideInstance.registerJsModule("_vlab_bridge", bridge);

    // Install vlab module into Python sys.modules
    pyodideInstance.runPython(`
import sys
import types
import json
import _vlab_bridge

vlab = types.ModuleType("vlab")
vlab.PARAMS = {}

def param(name, default, min=None, max=None, step=None, label=None, kind="slider", options=None):
    p = {
        "name": name,
        "default": default,
        "min": min,
        "max": max,
        "step": step,
        "label": label,
        "kind": kind,
        "options": options
    }
    _vlab_bridge.declareParam(json.dumps(p))
    return vlab.PARAMS.get(name, default)

def plot(x, y=None, *, label=None, fig="fig1", title=None, xlabel=None, ylabel=None, xscale="linear", yscale="linear", style=None):
    import numpy as np
    if y is None:
        y = x
        x = np.arange(len(y))
    x_list = np.asarray(x, dtype=float).tolist()
    y_list = np.asarray(y, dtype=float).tolist()
    spec = {
        "id": fig,
        "kind": "cartesian",
        "layout": {
            "title": title or fig,
            "xLabel": xlabel,
            "yLabel": ylabel,
            "xScale": xscale,
            "yScale": yscale,
            "grid": True,
            "legend": bool(label)
        },
        "traces": [{
            "type": "scatter",
            "mode": "lines",
            "name": label or "trace",
            "x": x_list,
            "y": y_list,
            "style": style or {}
        }]
    }
    _vlab_bridge.emitFigure(fig, json.dumps(spec))
    return spec

def stem(x, y=None, *, label=None, fig="fig1", title=None, xlabel=None, ylabel=None):
    import numpy as np
    if y is None:
        y = x
        x = np.arange(len(y))
    x_list = np.asarray(x, dtype=float).tolist()
    y_list = np.asarray(y, dtype=float).tolist()
    spec = {
        "id": fig,
        "kind": "stem",
        "layout": {
            "title": title or fig,
            "xLabel": xlabel or "n (samples)",
            "yLabel": ylabel or "Amplitude",
            "grid": True,
            "legend": bool(label)
        },
        "traces": [{
            "type": "bar",
            "mode": "stem",
            "name": label or "stem",
            "x": x_list,
            "y": y_list
        }]
    }
    _vlab_bridge.emitFigure(fig, json.dumps(spec))
    return spec

def bode(num, den, *, system="s", w=None, fs=None, fig="bode"):
    import numpy as np
    import scipy.signal as signal
    if system == "s":
        lti = signal.TransferFunction(num, den)
        w_vals, mag_vals, phase_vals = signal.bode(lti, w=w)
    else:
        w_vals, h_vals = signal.dfreqresp((num, den), w=w)
        mag_vals = 20 * np.log10(np.abs(h_vals))
        phase_vals = np.unwrap(np.angle(h_vals)) * 180 / np.pi
    spec = {
        "id": fig,
        "kind": "bode",
        "layout": {
            "title": "Bode Diagram",
            "xLabel": "Frequency (rad/s)",
            "yLabel": "Magnitude (dB)",
            "xScale": "log",
            "grid": True,
            "subplots": { "rows": 2, "cols": 1, "shareX": True }
        },
        "traces": [
            { "type": "scatter", "mode": "lines", "name": "Magnitude (dB)", "x": np.asarray(w_vals, dtype=float).tolist(), "y": np.asarray(mag_vals, dtype=float).tolist(), "yAxis": "y" },
            { "type": "scatter", "mode": "lines", "name": "Phase (deg)", "x": np.asarray(w_vals, dtype=float).tolist(), "y": np.asarray(phase_vals, dtype=float).tolist(), "yAxis": "y2" }
        ]
    }
    _vlab_bridge.emitFigure(fig, json.dumps(spec))
    return spec

def pzmap(z, p, *, domain="z", fig="pz"):
    import numpy as np
    z_arr = np.asarray(z, dtype=complex)
    p_arr = np.asarray(p, dtype=complex)
    traces = []
    if len(z_arr) > 0:
        traces.append({
            "type": "scatter",
            "mode": "markers",
            "name": "Zeros",
            "x": np.asarray(z_arr.real, dtype=float).tolist(),
            "y": np.asarray(z_arr.imag, dtype=float).tolist(),
            "style": { "markerSize": 8, "color": "#06b6d4" }
        })
    if len(p_arr) > 0:
        traces.append({
            "type": "scatter",
            "mode": "markers",
            "name": "Poles",
            "x": np.asarray(p_arr.real, dtype=float).tolist(),
            "y": np.asarray(p_arr.imag, dtype=float).tolist(),
            "style": { "markerSize": 8, "color": "#f43f5e" }
        })
    shapes = []
    if domain == "z":
        shapes.append({ "type": "circle", "x0": -1, "y0": -1, "x1": 1, "y1": 1, "r": 1 })
    spec = {
        "id": fig,
        "kind": "pzmap",
        "layout": {
            "title": "Pole-Zero Map",
            "xLabel": "Real",
            "yLabel": "Imaginary",
            "aspect": "equal",
            "grid": True,
            "shapes": shapes
        },
        "traces": traces
    }
    _vlab_bridge.emitFigure(fig, json.dumps(spec))
    return spec

vlab.param = param
vlab.plot = plot
vlab.stem = stem
vlab.bode = bode
vlab.pzmap = pzmap
sys.modules["vlab"] = vlab
`);

    postTypedMessage({
      type: "ENGINE_PROGRESS",
      stage: "bootstrap",
      percent: 100,
      message: "Simulation engine ready.",
    });

    postTypedMessage({
      type: "ENGINE_READY",
      pyodideVersion: "314.0.3",
      pythonVersion: "3.14",
      packages: {
        numpy: "2.4.3",
        scipy: "1.17.1",
      },
    });
  } catch (err: unknown) {
    const errorObj = err as Error;
    postTypedMessage({
      type: "ENGINE_ERROR",
      error: {
        code: "E_ENGINE_BOOT",
        name: errorObj.name || "BootError",
        message: errorObj.message || "Failed to boot Pyodide engine",
        line: null,
        column: null,
        traceback: errorObj.stack || "",
      },
    });
  }
}

async function handleRunCode(msg: MainToWorker & { type: "RUN_CODE" }): Promise<void> {
  if (!pyodideInstance || !persistentNamespace) {
    postTypedMessage({
      type: "RUN_FAILED",
      runId: msg.runId,
      elapsedMs: 0,
      error: {
        code: "E_INTERNAL",
        name: "UninitializedError",
        message: "Engine is not initialized",
        line: null,
        column: null,
        traceback: "",
      },
    });
    return;
  }

  currentRunId = msg.runId;
  totalStdoutBytes = 0;
  stdoutBuffer = "";
  stderrBuffer = "";
  const start = performance.now();

  try {
    // 1. AST PolicyGuard check
    pyodideInstance.globals["set"]("__code_to_check__", msg.code);
    try {
      pyodideInstance.runPython("check_policy(__code_to_check__)");
    } catch (policyErr: unknown) {
      const err = policyErr as Error;
      const isSyntax = err.message.includes("SyntaxError");
      postTypedMessage({
        type: "RUN_FAILED",
        runId: msg.runId,
        elapsedMs: performance.now() - start,
        error: {
          code: isSyntax ? "E_SYNTAX" : "E_POLICY_VIOLATION",
          name: isSyntax ? "SyntaxError" : "PolicyViolationError",
          message: err.message,
          line: null,
          column: null,
          traceback: err.message,
        },
      });
      return;
    }

    // 2. Load allowlisted packages on demand
    const code = msg.code;
    if (code.includes("matplotlib")) {
      await pyodideInstance.loadPackage("matplotlib");
      pyodideInstance.runPython(`
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import io
import json
import _vlab_bridge

def _custom_show(*args, **kwargs):
    buf = io.BytesIO()
    plt.savefig(buf, format="svg", bbox_inches="tight")
    buf.seek(0)
    svg_str = buf.getvalue().decode("utf-8")
    plt.close("all")
    spec = {
        "id": "plt_figure",
        "kind": "raster",
        "layout": { "title": "Matplotlib Output" },
        "traces": [],
        "rasterSvg": svg_str
    }
    _vlab_bridge.emitFigure("plt_figure", json.dumps(spec))

plt.show = _custom_show
`);
    }

    // 3. Inject params into vlab
    pyodideInstance.globals["set"]("__vlab_params__", JSON.stringify(msg.params || {}));
    pyodideInstance.runPython(`
import vlab
import json
vlab.PARAMS = json.loads(__vlab_params__)
`);

    // 4. Execute Code
    await pyodideInstance.runPythonAsync(msg.code, {
      globals: persistentNamespace,
      filename: "<user>",
    });

    // 5. Inspect Globals
    const varsJson = pyodideInstance.runPython(`
import numpy as np
import json

var_list = []
for k, v in dict(__main__.__dict__).items():
    if k.startswith("_") or k in {"sys", "ast", "json", "np", "vlab", "signal", "plt", "io"}:
        continue
    if callable(v) or isinstance(v, type(sys)):
        continue

    v_type = type(v).__name__
    shape = None
    dtype = None
    size_bytes = None
    preview = str(v)[:100]

    if isinstance(v, np.ndarray):
        v_type = "ndarray"
        shape = list(v.shape)
        dtype = str(v.dtype)
        size_bytes = int(v.nbytes)
        preview = f"array(shape={shape}, dtype={dtype})"

    var_list.append({
        "name": k,
        "type": v_type,
        "shape": shape,
        "dtype": dtype,
        "preview": preview,
        "sizeBytes": size_bytes
    })

json.dumps(var_list)
`, { globals: persistentNamespace });

    const variables: VariableInfo[] = JSON.parse(varsJson);
    postTypedMessage({
      type: "VARIABLES_UPDATED",
      runId: msg.runId,
      variables,
    });

    flushOutput();

    postTypedMessage({
      type: "RUN_COMPLETED",
      runId: msg.runId,
      elapsedMs: performance.now() - start,
    });
  } catch (err: unknown) {
    flushOutput();
    const pyErr = err as PythonExecutionError;
    postTypedMessage({
      type: "RUN_FAILED",
      runId: msg.runId,
      elapsedMs: performance.now() - start,
      error: {
        code: "E_RUNTIME",
        name: pyErr.name || "RuntimeError",
        message: pyErr.message || "Execution error",
        line: pyErr.lineno || null,
        column: null,
        traceback: pyErr.stack || pyErr.message,
      },
    });
  } finally {
    currentRunId = null;
  }
}

self.onmessage = async (event: MessageEvent<unknown>) => {
  try {
    const msg = validateMainToWorker(event.data);
    switch (msg.type) {
      case "INIT":
        await handleInit(msg);
        break;
      case "RUN_CODE":
        await handleRunCode(msg);
        break;
      case "PING":
        postTypedMessage({ type: "PONG", sentAt: msg.sentAt });
        break;
      default:
        break;
    }
  } catch {
    // Message validation error handled safely
  }
};
