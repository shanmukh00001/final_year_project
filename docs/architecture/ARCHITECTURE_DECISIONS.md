# V-Lab ECE: Architecture Decision Records

Format: Status, Context, Decision, Consequences, Alternatives considered. Status values: Accepted, Superseded, Proposed. Changing a decision requires a new ADR that supersedes the old one.

---

## ADR-001: Run simulations in-browser with Pyodide instead of a Python Flask backend

**Status:** Accepted

**Context**
The department needs a MATLAB-like lab for roughly 500 users with bursty usage (many students running experiments at the same time during lab hours and before deadlines). The hard constraint is **zero compute cost**. Course workloads are numerically moderate (FFTs up to 2^20 points, convolution of 1e5-sample signals, Monte Carlo of 1e6 symbols), well within what a modern laptop can do in seconds.

**Decision**
Execute all student Python in the student's own browser using Pyodide (CPython compiled to WebAssembly) inside a dedicated Web Worker. The Node/Express + MongoDB backend stores accounts, workspaces, assignments, and submissions only.

**Consequences**

- Positive
  - Marginal compute cost per simulation is zero; the server fleet does not scale with usage.
  - No code-execution sandbox to build and defend on the server (no container escapes, no resource-abuse billing risk). Student code runs inside the browser sandbox plus our policy layer.
  - Works for 400 concurrent students with the same free-tier backend.
  - Offline-capable after first load.
  - Latency of a run has no network round trip.
- Negative
  - Large first download (tens of MB) mitigated by self-hosting, Service Worker caching, and progressive loading.
  - Runs are 1.5x to 3x slower than desktop NumPy, and pure-Python loops can be slower still; experiments must be vectorised (`SCOPE.md` budgets).
  - Memory bounded by the browser (about 2 GB WASM ceiling, less on phones).
  - Library set limited to packages built for Pyodide.
  - Results are produced on the client, so a professor cannot "trust" server-verified output; mitigated by ADR-013 (professors re-run in their own browser).
  - Student device heterogeneity affects timing.

**Alternatives considered**
| Option | Why rejected |
|---|---|
| Flask/FastAPI executing student code in containers | Requires always-on compute that scales with concurrent users (a worker fleet plus gVisor/Firecracker-class sandboxing, queueing, and timeouts). Cost is unbounded relative to the free-tier constraint, and untrusted code execution on our servers is a major security liability. |
| Jupyter/JupyterHub on institute servers | Needs servers, admins, and per-user resource management; contradicts zero-setup, zero-cost goals. |
| Serverless Python functions (Vercel/Lambda) per run | Per-invocation cost, cold starts, 10 to 60 s limits, no numpy/scipy size headroom on free plans, no streaming plots, and still untrusted-code risk. |
| JavaScript numerics (math.js, ndarray) | Course material and MATLAB users map to NumPy/SciPy; JS lacks `scipy.signal` filter design and spectral estimation. |
| Octave compiled to WASM | Closest to MATLAB syntax but weaker ecosystem and maintenance; Python skills are more transferable (SG-4). |

---

## ADR-002: Isolate the engine in a dedicated Web Worker with an explicit typed message protocol

**Status:** Accepted
**Context:** Pyodide executes synchronously; running on the main thread would freeze the UI during FFTs and loops (violates NFR-PERF-02).
**Decision:** One dedicated module worker (`pyodide.worker.ts`) per tab, communicating via `postMessage` with a Zod-validated discriminated union (`protocol.ts`), with Transferable typed arrays.
**Consequences:** UI stays responsive; cancellation is possible via terminate/respawn; protocol evolution needs versioning discipline. Comlink was rejected to keep transfer semantics visible.
**Alternatives:** Main-thread Pyodide (rejected: freezes); SharedWorker (rejected: poor Safari support, cross-tab state hazards); worker pool (deferred; Post-MVP for parameter sweeps).

---

## ADR-003: Plotly.js (partial bundle) as the charting library

**Status:** Accepted
**Context:** Needs: Bode (two linked subplots, log-x), pole-zero with unit circle, heatmaps, 3D surfaces, image display, hover/zoom/pan, 50k-point WebGL traces, export to PNG/SVG. The Python side is easier if the figure spec resembles Plotly's trace/layout model.
**Decision:** Plotly.js 3.x using `plotly.js/lib/core` with only the required trace modules (scatter, scattergl, bar, heatmap, image, surface, scatter3d, histogram), lazy-loaded when the first figure renders.
**Consequences:** Rich interaction out of the box and a straightforward `FigureSpec` mapping; bundle is larger than ECharts core (mitigated by partial bundle and lazy loading); typed arrays are supported.
**Alternatives:** ECharts (strong canvas performance, but 3D needs the extra echarts-gl package and log-axis subplot linking is more manual); uPlot (very fast 2D but no 3D/heatmap); D3 custom (too much build effort for an agent-driven project).
**Review trigger:** if Cypress performance spec AC-PLT-006 fails (< 30 FPS at 50k points) after enabling `scattergl` and LTTB, open an ADR to evaluate ECharts or uPlot for time-series traces only.

---

## ADR-004: Python as the lab language (not MATLAB-syntax emulation)

**Status:** Accepted
**Context:** The department's courses are MATLAB-centred, but MATLAB cannot be run for free in a browser.
**Decision:** Python with NumPy/SciPy/Matplotlib, plus the `vlab` helper package for MATLAB-like plotting calls and a "MATLAB to NumPy" cheat sheet panel (M4).
**Consequences:** Faculty must port lab manuals once; students gain open-source skills. `.m` files are out of scope.

---

## ADR-005: Monorepo with pnpm workspaces and Turborepo

**Status:** Accepted
**Context:** Web, API, shared Zod schemas, experiment JSON, and the `vlab` Python package change together; an autonomous agent benefits from one repository and one command surface.
**Decision:** `apps/web`, `apps/api`, `packages/shared`, `packages/experiments`, `packages/vlab-py`; Turborepo task graph (`build`, `lint`, `typecheck`, `test`).
**Consequences:** Atomic cross-package changes and type sharing; slightly more tooling setup.
**Alternatives:** Polyrepo (rejected: type drift), Nx (heavier than needed).

---

## ADR-006: Single Vercel project, single origin (SPA + Express function + Pyodide assets)

**Status:** Accepted
**Context:** `SameSite=Strict` refresh cookies and COOP/COEP cross-origin isolation are simplest when everything shares one origin. Separate `*.vercel.app` projects are different sites (public suffix), so Strict cookies would not flow between them.
**Decision:** One Vercel project serving static assets and an Express app as a serverless function at `/api/*`, with `vercel.json` headers and rewrites.
**Consequences:** No CORS in production; strict cookies work; the API cold-start/timeout limits of Vercel functions apply (all routes are short DB operations). If the API outgrows Vercel Functions, move it behind a same-site subdomain and revisit.

---

## ADR-007: Access JWT in memory plus rotating opaque refresh cookie

**Status:** Accepted
**Context:** localStorage tokens are exposed to XSS; long-lived JWTs are hard to revoke.
**Decision:** 15-minute HS256 access token held in memory; opaque refresh token in httpOnly Strict cookie, hashed in DB, rotated on each use with reuse detection; `tokenVersion` for instant invalidation after sensitive changes (bounded by access TTL).
**Consequences:** Page reload requires one silent refresh call; slightly more server logic. HS256 chosen over RS256 because a single service both signs and verifies.

---

## ADR-008: MongoDB Atlas M0 with Mongoose and collection-level `$jsonSchema` validators

**Status:** Accepted
**Context:** Specified MERN stack; free tier; document-shaped data (workspaces, snapshots).
**Decision:** Mongoose models for app-level validation plus server-side validators as a safety net; `autoIndex` off in production; cached connection for serverless.
**Consequences:** 512 MB cap requires per-user limits (50 workspaces, 200 KB each); no continuous backups on M0, so weekly dump job.

---

## ADR-009: OpenCV.js in a separate worker for DIP (not `opencv-python` inside Pyodide)

**Status:** Accepted (reviewable)
**Context:** The project specification names OpenCV.js and the Canvas API for DIP. Pyodide's package channel has listed an `opencv-python` build, so a Python-native option may exist.
**Decision:** Use OpenCV.js in its own lazy worker for OpenCV-style operations; use NumPy/SciPy (`scipy.ndimage`) inside Pyodide for matrix-style DIP experiments; exchange image data as transferable `ImageData` buffers.
**Consequences:** Two runtimes for DIP (more glue code, extra download only for DIP). Students call OpenCV functions through a small `vlab.cv` Python facade that proxies to the OpenCV worker via the main thread.
**Review trigger:** Before M3, verify whether the pinned Pyodide's `pyodide-lock.json` includes `opencv-python` and measure its size and load time. If acceptable, a new ADR may supersede this one and remove the second runtime.

---

## ADR-010: Monaco on desktop and tablet; LiteEditor on phones

**Status:** Accepted
**Context:** Monaco provides VS Code ergonomics but has limited touch and virtual-keyboard support.
**Decision:** Monaco (self-hosted, Python language only) at widths ≥ 768 px; a minimal textarea-based `LiteEditor` below 768 px.
**Consequences:** Two editor components behind one `CodeEditor` interface (`value`, `onChange`, `markers`, `readOnly`, `onRun`).

---

## ADR-011: Zustand for UI state, XState for the engine lifecycle

**Status:** Accepted
**Context:** The worker lifecycle has many states and guarded transitions defined in `USER_FLOWS.md`; most other UI state is simple.
**Decision:** XState 5 machine `engineMachine` (state and event names identical to the diagrams); Zustand stores for editor, console, figures, variables, layout, and auth.
**Consequences:** Illegal transitions are impossible by construction; two state libraries to learn.

---

## ADR-012: Self-host Pyodide and OpenCV assets from the app origin

**Status:** Accepted
**Context:** COEP `require-corp` and CSP `connect-src 'self'` forbid third-party origins; public CDNs can fail or change.
**Decision:** Copy the pinned `pyodide` npm package files to `/pyodide/314.0.3/` at build time; commit `MANIFEST.json` hashes for OpenCV.
**Consequences:** Larger deploy output (tens of MB, fits Vercel limits for static files); version upgrades are explicit.

---

## ADR-013: Professors verify submissions by re-running them in their own browser

**Status:** Accepted
**Context:** No server-side execution exists. Students could in principle submit forged "outputs".
**Decision:** Submissions store code, parameters, seed, experiment version, and engine versions, **not** trusted outputs. Professors load the snapshot read-only and re-run locally. Seeds are explicit parameters (AC-NUM-012) so results are reproducible.
**Consequences:** Grading depends on professor action; no automated server grading in v1.

---

## ADR-014: Experiment definitions are versioned JSON in the repo, not database records

**Status:** Accepted
**Context:** Experiments change with releases, are validated in CI, and need golden numerical tests alongside them.
**Decision:** `packages/experiments/*.experiment.json` plus golden data; the DB stores only `experimentId` and `experimentVersion`, plus enable overrides in `experiment_settings`.
**Consequences:** Adding an experiment requires a deploy; assignments pin to a version so later edits do not alter past work.

---

## ADR-015: Mongo-backed rate limiting

**Status:** Accepted
**Context:** Serverless instances do not share memory; in-process limiters are bypassable.
**Decision:** TTL-indexed `rate_limits` collection with atomic `$inc` upserts.
**Consequences:** Extra DB writes on auth routes only; fits M0 limits at expected volume.

---

## ADR Index

| ADR | Title                                   | Status                |
| --- | --------------------------------------- | --------------------- |
| 001 | Pyodide over Flask backend              | Accepted              |
| 002 | Dedicated Web Worker + typed protocol   | Accepted              |
| 003 | Plotly.js partial bundle                | Accepted              |
| 004 | Python as lab language                  | Accepted              |
| 005 | pnpm + Turborepo monorepo               | Accepted              |
| 006 | Single Vercel project, single origin    | Accepted              |
| 007 | In-memory JWT + rotating refresh cookie | Accepted              |
| 008 | Atlas M0 + Mongoose + validators        | Accepted              |
| 009 | OpenCV.js in separate worker            | Accepted (reviewable) |
| 010 | Monaco / LiteEditor split               | Accepted              |
| 011 | Zustand + XState                        | Accepted              |
| 012 | Self-hosted runtime assets              | Accepted              |
| 013 | Professor re-run verification           | Accepted              |
| 014 | Experiments as repo JSON                | Accepted              |
| 015 | Mongo-backed rate limiting              | Accepted              |
