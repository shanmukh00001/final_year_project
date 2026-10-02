# V-Lab ECE: Scope Definition

## 1. Scope Summary

V-Lab ECE v1.0 is a **client-side Python simulation workspace** plus a thin **MERN persistence/assignment layer**. This document defines exactly what is in and out, and **the hard limits of the Pyodide/WebAssembly engine** that every experiment must respect.

## 2. In Scope

| Area        | Included                                                                                                                          |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Workspace   | Split-pane editor/console/plots/variables, run/stop/restart, parameter sliders, import/export                                     |
| Languages   | Python 3 (the version bundled with the pinned Pyodide release)                                                                    |
| Libraries   | `numpy`, `scipy`, `matplotlib` (compat layer), `micropip`-installed pure-Python wheels from an allowlist, OpenCV.js for DIP       |
| Courses     | SS, NT, DSP, DIP, BEE (UG); ACS, SSP (PG)                                                                                         |
| Plotting    | Plotly.js or ECharts adapters (final choice in `TECH_STACK.md`); Canvas for images                                                |
| Accounts    | Student, Professor, Admin; email/password auth with JWT                                                                           |
| Persistence | Server-side saved workspaces, assignments, submissions, grades; IndexedDB local drafts                                            |
| Dashboard   | Professor assignment management, grading, basic analytics                                                                         |
| Hosting     | Vercel (static frontend + serverless API) and MongoDB Atlas                                                                       |
| Platforms   | Desktop and tablet browsers fully supported; phones supported in a reduced "view and light-run" mode (see `RESPONSIVE_DESIGN.md`) |

## 3. Out of Scope (v1.0)

| Item                                                                  | Reason                                             |
| --------------------------------------------------------------------- | -------------------------------------------------- |
| Server-side execution of student code                                 | Violates zero-compute-cost constraint              |
| Native MATLAB `.m` interpretation; Simulink                           | Different language/runtime; use Python equivalents |
| Real-time multi-user collaborative editing                            | Complexity; not required by courses                |
| SPICE/transient circuit netlist simulation and schematic editor       | Separate product scope                             |
| Hardware integration (SDR, DAQ, oscilloscopes)                        | Requires native/WebUSB drivers                     |
| GPU/CUDA workloads and deep-learning frameworks (PyTorch, TensorFlow) | No WASM builds suitable for coursework             |
| Video processing and long audio (> 30 s)                              | Memory limits                                      |
| LMS/SSO integration (Moodle, Google Workspace SSO)                    | Future enhancement                                 |
| Native mobile apps                                                    | Responsive web only                                |
| Server-side plagiarism detection beyond the hashing heuristic         | Out of budget                                      |
| Payment, billing                                                      | Not applicable                                     |

## 4. Pyodide WebAssembly Engine Limits (Normative)

> **Agent instruction:** Treat every limit below as a **constant** defined in `packages/shared/src/limits.ts` (exact path set in Batch 2/3 docs). Enforce them in code; surface violations as typed errors (`E_LIMIT_*`), never as silent failures.

### 4.1 Platform-imposed constraints (cannot be removed)

| Constraint                  | Detail                                                                                                                       | Consequence for design                                                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Single-threaded Python      | Pyodide runs one Python thread per worker. `threading` is non-parallel; `multiprocessing` unavailable.                       | No parallel Monte Carlo inside one worker. Optionally, a pool of workers for embarrassingly parallel sweeps (post-MVP). |
| No native processes/sockets | `subprocess`, `os.fork`, raw `socket` do not work. `urllib`/`requests` are not usable for arbitrary network I/O.             | Network access from Python is disabled by policy (see `SECURITY` docs). Data comes via the virtual file system.         |
| 32-bit WASM address space   | Practical ceiling of roughly 2 GB per worker (browser dependent); tabs may be killed earlier on low-RAM devices.             | Enforce input limits below; memory watchdog.                                                                            |
| Only WASM-compiled packages | Packages with C/Fortran extensions work only if built for Pyodide.                                                           | Allowlist only; no arbitrary `pip install`.                                                                             |
| Slower than native          | Typically about 1.5x to 3x slower than desktop CPython+NumPy for numeric kernels; pure-Python loops can be 3x to 10x slower. | Experiments must be vectorised; budgets in Section 5.                                                                   |
| Large initial download      | Runtime plus numpy/scipy/matplotlib is tens of MB.                                                                           | Cache aggressively; self-host assets.                                                                                   |
| Cancel requires cooperation | Python code cannot be pre-empted in the worker without `SharedArrayBuffer` interrupt flag or termination.                    | COOP/COEP headers; fallback to terminate and respawn.                                                                   |
| No persistent filesystem    | In-memory virtual FS is lost on worker restart.                                                                              | Persist user files in IndexedDB; rehydrate on boot.                                                                     |
| Floating-point              | IEEE-754 double; results may differ from desktop BLAS in the last few ULPs.                                                  | Test tolerances in `ACCEPTANCE_CRITERIA.md`.                                                                            |

### 4.2 Product-imposed limits (configurable constants)

| Limit constant             | Default                                  | Hard max                                 | Applies to                                                                                                |
| -------------------------- | ---------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `RUN_TIMEOUT_MS`           | 30,000                                   | 120,000 (experiment-level override only) | Wall clock per run                                                                                        |
| `CANCEL_GRACE_MS`          | 2,000                                    | 2,000                                    | Time to honour interrupt before terminate                                                                 |
| `MAX_ARRAY_ELEMENTS`       | 20,000,000 (about 160 MB float64)        | 20,000,000                               | Any single ndarray (enforced via memory watchdog check after run, and via safe wrappers in `vlab`)        |
| `MAX_WORKER_HEAP_MB`       | 1,200                                    | 1,500                                    | Soft watchdog (polls `performance.measureUserAgentSpecificMemory()` where available, else WASM heap size) |
| `MAX_UPLOAD_BYTES`         | 10,485,760 (10 MB)                       | 10 MB per file, 25 MB total              | Virtual FS uploads                                                                                        |
| `MAX_IMAGE_PIXELS`         | 4,194,304 (about 2048 x 2048)            | 4,194,304                                | DIP inputs; larger images are downscaled with a notice                                                    |
| `MAX_AUDIO_SECONDS`        | 10                                       | 30                                       | DSP-07                                                                                                    |
| `MAX_PLOT_POINTS_RENDERED` | 50,000 per trace (LTTB downsample above) | 200,000                                  | Plot adapter                                                                                              |
| `MAX_CONSOLE_LINES`        | 5,000                                    | 5,000                                    | Console ring buffer                                                                                       |
| `MAX_STDOUT_BYTES_PER_RUN` | 2,097,152 (2 MB)                         | 2 MB                                     | Prevents runaway `print` loops                                                                            |
| `MAX_WORKSPACE_BYTES`      | 204,800 (200 KB)                         | 200 KB                                   | Server save payload                                                                                       |
| `MAX_MONTE_CARLO_SYMBOLS`  | 1,000,000                                | 1,000,000                                | ACS BER experiments (vectorised, chunked in 100,000 blocks)                                               |

### 4.3 Library allowlist

| Package      | Source                 | Loaded                                                      | Notes                                                                                                            |
| ------------ | ---------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `numpy`      | Pyodide distribution   | At boot                                                     | Core                                                                                                             |
| `scipy`      | Pyodide distribution   | At boot for experiments flagged `needsScipy` (default true) | Submodules used: `signal`, `fft`, `linalg`, `integrate`, `optimize`, `special`, `stats`, `ndimage`, `io.wavfile` |
| `matplotlib` | Pyodide distribution   | Lazily when `plt` first imported                            | Output intercepted as PNG/SVG; interactive backends disabled                                                     |
| `micropip`   | Pyodide distribution   | At boot                                                     | Used only by the platform to install allowlisted pure-Python wheels; **blocked for user code**                   |
| `opencv.js`  | Self-hosted WASM build | Lazily in DIP workspaces                                    | Runs in a separate worker; not importable from Python                                                            |

**Forbidden for user code:** `micropip`, `js` (the Pyodide JS bridge), `pyodide.ffi`, `pyodide_js`, `subprocess`, `socket`, `ctypes`, `os.system`, `importlib` tricks to reach them. Enforcement details are in the Batch 4 threat model.

## 5. Experiment Performance Budgets (reference machine)

Reference machine: 4-core x86-64 laptop, 8 GB RAM, Chrome stable, plugged in, no throttling.
| Operation | Budget (warm kernel) |
|---|---|
| FFT of 2^14 samples | ≤ 50 ms |
| FFT of 2^20 samples | ≤ 3,000 ms |
| `fftconvolve` of 100,000 x 1,000 samples | ≤ 2,000 ms |
| Direct `np.convolve` of 20,000 x 2,000 | ≤ 2,500 ms |
| 2D FFT of 1024 x 1024 image | ≤ 1,500 ms |
| BER Monte Carlo, 1e6 BPSK symbols (vectorised) | ≤ 5,000 ms |
| `scipy.signal.spectrogram` of 10 s at 16 kHz | ≤ 1,000 ms |
| LMS adaptive filter, 20,000 samples, 32 taps (Python loop) | ≤ 8,000 ms |

Experiments exceeding their declared `estimatedRuntimeMs` by more than 3x in CI must be refactored (vectorise) or have limits documented.

## 6. Browser and Device Support Matrix

| Tier        | Browsers                                           | Experience                                                                                          |
| ----------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Tier 1      | Chrome/Edge latest 2, Firefox latest 2 (desktop)   | Full features including cooperative cancel                                                          |
| Tier 2      | Safari 16.4+ (macOS/iOS), Chrome Android           | Works; cancel falls back to terminate when not cross-origin isolated; reduced memory ceiling on iOS |
| Unsupported | IE, browsers without WebAssembly or module workers | Show compatibility notice                                                                           |

## 7. Assumptions and Dependencies

- The Pyodide release is pinned in `TECH_STACK.md`; upgrading requires re-running all golden tests.
- Cross-origin isolation (COOP: `same-origin`, COEP: `require-corp`) is configured via Vercel headers; all embedded third-party resources must send CORP/CORS headers or be self-hosted.
- Experiments that cannot meet the limits above are **out of scope** until redesigned.

## 8. Change Control

Any change to Section 4.2 limits requires: (1) updating this file, (2) updating `limits.ts`, (3) updating the acceptance tests that reference the limit, in one commit.
