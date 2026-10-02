"""
vlab Python runtime library & policy guard
Injected into Pyodide Web Worker environment
"""
import sys
import ast
import json
import numpy as np

# Global storage for declared params and active bridge
PARAMS = {}
_BRIDGE = None
_FIGURE_CACHE = {}

class PolicyViolationError(Exception):
    def __init__(self, message, line=None, column=None):
        super().__init__(message)
        self.message = message
        self.line = line
        self.column = column

FORBIDDEN_MODULES = {
    "js",
    "pyodide",
    "pyodide_js",
    "pyodide.ffi",
    "micropip",
    "subprocess",
    "socket",
    "ctypes",
    "ssl",
    "http",
    "urllib",
    "requests",
    "webbrowser",
    "importlib",
}

FORBIDDEN_ATTRIBUTES = {
    "__subclasses__",
    "__globals__",
    "__loader__",
    "__spec__",
    "__import__",
}

class PolicyGuardFinder:
    """sys.meta_path import hook that blocks forbidden modules dynamically"""
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
    """
    Parses Python code using AST and scans for forbidden constructs.
    Returns None on success, raises PolicyViolationError on violation.
    """
    try:
        tree = ast.parse(code_str, filename="<user>")
    except SyntaxError as e:
        err = PolicyViolationError(f"SyntaxError: {e.msg}", line=e.lineno, column=e.offset)
        err.is_syntax = True
        raise err

    for node in ast.walk(tree):
        # Check imports
        if isinstance(node, ast.Import):
            for alias in node.names:
                root = alias.name.split(".")[0]
                if alias.name in FORBIDDEN_MODULES or root in FORBIDDEN_MODULES:
                    raise PolicyViolationError(
                        f"Import of forbidden module '{alias.name}' is blocked by PolicyGuard",
                        line=node.lineno,
                        column=node.col_offset
                    )
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                root = node.module.split(".")[0]
                if node.module in FORBIDDEN_MODULES or root in FORBIDDEN_MODULES:
                    raise PolicyViolationError(
                        f"Import from forbidden module '{node.module}' is blocked by PolicyGuard",
                        line=node.lineno,
                        column=node.col_offset
                    )

        # Check dangerous attribute accesses
        elif isinstance(node, ast.Attribute):
            if node.attr in FORBIDDEN_ATTRIBUTES:
                raise PolicyViolationError(
                    f"Access to attribute '{node.attr}' is blocked by PolicyGuard",
                    line=node.lineno,
                    column=node.col_offset
                )
            if node.attr in {"system", "popen", "spawn", "fork"} and isinstance(node.value, ast.Name) and node.value.id == "os":
                raise PolicyViolationError(
                    f"os.{node.attr} execution is blocked by PolicyGuard",
                    line=node.lineno,
                    column=node.col_offset
                )

        # Check dangerous calls (eval, exec)
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id in {"eval", "exec", "compile"}:
                raise PolicyViolationError(
                    f"Direct call to '{node.func.id}' is blocked by PolicyGuard",
                    line=node.lineno,
                    column=node.col_offset
                )

    return True

# ----------------- vlab API Functions -----------------

def set_bridge(bridge_fn):
    global _BRIDGE
    _BRIDGE = bridge_fn

def param(name, default, min=None, max=None, step=None, label=None, kind="slider", options=None):
    """
    Declares a parameter and registers it with the UI.
    Returns current override if provided, else default.
    """
    if _BRIDGE and hasattr(_BRIDGE, "declare_param"):
        _BRIDGE.declare_param(name, default, min, max, step, label, kind, options)

    if name in PARAMS:
        return PARAMS[name]
    return default

def plot(x, y=None, *, label=None, fig="fig1", title=None, xlabel=None, ylabel=None, xscale="linear", yscale="linear", style=None):
    """
    Generates a 2D line plot FigureSpec.
    """
    if y is None:
        y = x
        x = np.arange(len(y))

    x_arr = np.ascontiguousarray(x, dtype=np.float64)
    y_arr = np.ascontiguousarray(y, dtype=np.float64)

    trace = {
        "type": "scatter",
        "mode": "lines",
        "name": label or "trace",
        "x": x_arr,
        "y": y_arr,
    }
    if style:
        trace["style"] = style

    spec = {
        "id": fig,
        "kind": "cartesian",
        "layout": {
            "title": title or fig,
            "xLabel": xlabel,
            "yLabel": ylabel,
            "xScale": xscale,
            "yscale": yscale,
            "grid": True,
            "legend": bool(label)
        },
        "traces": [trace]
    }

    if _BRIDGE and hasattr(_BRIDGE, "emit_figure"):
        _BRIDGE.emit_figure(fig, spec)
    return spec

def stem(x, y=None, *, label=None, fig="fig1", title=None, xlabel=None, ylabel=None):
    """
    Generates a discrete-time stem plot.
    """
    if y is None:
        y = x
        x = np.arange(len(y))

    x_arr = np.ascontiguousarray(x, dtype=np.float64)
    y_arr = np.ascontiguousarray(y, dtype=np.float64)

    trace = {
        "type": "bar",
        "mode": "stem",
        "name": label or "stem",
        "x": x_arr,
        "y": y_arr,
    }

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
        "traces": [trace]
    }

    if _BRIDGE and hasattr(_BRIDGE, "emit_figure"):
        _BRIDGE.emit_figure(fig, spec)
    return spec

def bode(num, den, *, system="s", w=None, fs=None, fig="bode"):
    """
    Bode plot for continuous or discrete transfer function.
    """
    import scipy.signal as signal

    if system == "s":
        lti = signal.TransferFunction(num, den)
        w_vals, mag_vals, phase_vals = signal.bode(lti, w=w)
    else:
        w_vals, h_vals = signal.dfreqresp((num, den), w=w)
        mag_vals = 20 * np.log10(np.abs(h_vals))
        phase_vals = np.unwrap(np.angle(h_vals)) * 180 / np.pi

    w_arr = np.ascontiguousarray(w_vals, dtype=np.float64)
    mag_arr = np.ascontiguousarray(mag_vals, dtype=np.float64)
    phase_arr = np.ascontiguousarray(phase_vals, dtype=np.float64)

    trace_mag = {
        "type": "scatter",
        "mode": "lines",
        "name": "Magnitude (dB)",
        "x": w_arr,
        "y": mag_arr,
        "yAxis": "y"
    }
    trace_phase = {
        "type": "scatter",
        "mode": "lines",
        "name": "Phase (deg)",
        "x": w_arr,
        "y": phase_arr,
        "yAxis": "y2"
    }

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
        "traces": [trace_mag, trace_phase]
    }

    if _BRIDGE and hasattr(_BRIDGE, "emit_figure"):
        _BRIDGE.emit_figure(fig, spec)
    return spec

def pzmap(z, p, *, domain="z", fig="pz"):
    """
    Pole-Zero map plot.
    """
    z_arr = np.asarray(z, dtype=np.complex128)
    p_arr = np.asarray(p, dtype=np.complex128)

    traces = []
    if len(z_arr) > 0:
        traces.append({
            "type": "scatter",
            "mode": "markers",
            "name": "Zeros",
            "x": np.ascontiguousarray(z_arr.real, dtype=np.float64),
            "y": np.ascontiguousarray(z_arr.imag, dtype=np.float64),
            "style": { "markerSize": 8, "color": "#06b6d4" }
        })
    if len(p_arr) > 0:
        traces.append({
            "type": "scatter",
            "mode": "markers",
            "name": "Poles",
            "x": np.ascontiguousarray(p_arr.real, dtype=np.float64),
            "y": np.ascontiguousarray(p_arr.imag, dtype=np.float64),
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

    if _BRIDGE and hasattr(_BRIDGE, "emit_figure"):
        _BRIDGE.emit_figure(fig, spec)
    return spec

def imshow(arr, *, cmap="gray", fig="img"):
    """
    Displays an image or 2D matrix.
    """
    arr_np = np.asarray(arr)
    spec = {
        "id": fig,
        "kind": "image",
        "layout": { "title": fig },
        "traces": [{
            "type": "image",
            "name": fig,
            "zMatrix": {
                "data": np.ascontiguousarray(arr_np.flatten(), dtype=np.float64),
                "rows": int(arr_np.shape[0]),
                "cols": int(arr_np.shape[1])
            }
        }]
    }
    if _BRIDGE and hasattr(_BRIDGE, "emit_figure"):
        _BRIDGE.emit_figure(fig, spec)
    return spec
