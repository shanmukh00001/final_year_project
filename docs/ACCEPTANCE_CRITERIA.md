# V-Lab ECE: Acceptance Criteria

> **Agent instructions**
>
> 1. Every criterion has an ID (`AC-*`). Name your tests `AC-<ID>: <description>` so CI can map results.
> 2. A task is **Done** only when all linked ACs pass in CI (unit/integration with Jest, E2E with Cypress; tooling details in Batch 3).
> 3. Where a criterion lists a numeric tolerance or timing, it is **mandatory**, not advisory.
> 4. Timing ACs run on the **CI reference profile**: Chromium headless, CPU throttle 1x, results are the median of 5 runs. Real-device validation is in `QA_CHECKLIST.md` (Batch 3).
> 5. Do not weaken a criterion to make a test pass. Raise it as a blocker instead.

Notation: **Given / When / Then**.

---

## 1. Authentication (AC-AUTH)

| ID          | Criterion                                                                                                                                                                                                                                                                                          |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-AUTH-001 | **Given** an unregistered email in an allowlisted domain and a password of ≥ 10 chars, **when** `POST /api/auth/register` is called, **then** the response is `201`, the stored password field starts with `$2` (bcrypt) with cost factor 12, and no plaintext password appears in the DB or logs. |
| AC-AUTH-002 | **Given** an email from a non-allowlisted domain, **when** registering, **then** the response is `422` with error code `E_EMAIL_DOMAIN`.                                                                                                                                                           |
| AC-AUTH-003 | **Given** a valid login, **when** the access token (15 min TTL) expires, **then** the client silently calls `/api/auth/refresh`, receives a new access token, and replays the failed request once without user-visible interruption.                                                               |
| AC-AUTH-004 | **Given** a `student` token, **when** calling any `/api/professor/*` or `/api/admin/*` endpoint, **then** the response is `403` with code `E_FORBIDDEN`. Same for `professor` on `/api/admin/*`.                                                                                                   |
| AC-AUTH-005 | **Given** 5 failed logins for one email within 15 minutes, **when** a 6th attempt occurs, **then** the response is `429` with a `Retry-After` header.                                                                                                                                              |
| AC-AUTH-006 | **Given** no login, **when** opening a public experiment, **then** the workspace runs normally and Save/Submit controls are disabled with a tooltip "Log in to save".                                                                                                                              |

## 2. Catalogue (AC-CAT)

| ID         | Criterion                                                                                                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-CAT-001 | The catalogue lists exactly the 7 course modules (SS, NT, DSP, DIP, BEE, ACS, SSP), each showing the experiments with `enabled: true`. UG/PG labelling is correct.                         |
| AC-CAT-002 | Selecting an experiment navigates to `/lab/:experimentId` and renders theory (Markdown + KaTeX) within 500 ms of route load (excluding engine boot).                                       |
| AC-CAT-003 | An experiment whose definition fails JSON-schema validation is not shown and a console error with the experiment ID is logged in dev. CI fails if any shipped experiment fails validation. |
| AC-CAT-004 | Each experiment page has a collapsible "MATLAB to NumPy" panel (M4).                                                                                                                       |

## 3. Workspace UI (AC-WS)

| ID        | Criterion                                                                                                                                                                                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | ------ | ------------------------------------------------------------------------------------- |
| AC-WS-001 | Workspace shows 5 regions: Explorer (left), Editor (centre top), Console (centre bottom), Plots (right top), Variables (right bottom). Each is identified by `data-testid` = `pane-explorer`, `pane-editor`, `pane-console`, `pane-plots`, `pane-variables`. |
| AC-WS-002 | Editor is Monaco with Python mode; `Ctrl/Cmd+Enter` triggers Run; `Shift+Enter` runs selection (or current line if no selection).                                                                                                                            |
| AC-WS-003 | Dragging a splitter resizes adjacent panes; minimum pane size is 120 px; layout persists across reloads (localStorage key `vlab.layout.v1`).                                                                                                                 |
| AC-WS-004 | `print()` output appears in the console within 100 ms of being produced; output is batched, with at most 60 DOM flushes per second; console retains the last 5,000 lines.                                                                                    |
| AC-WS-005 | For `x = 1/0` on line 3, the editor shows an error marker on line 3 and the console shows `ZeroDivisionError` with `line 3`.                                                                                                                                 |
| AC-WS-006 | After running `a = np.zeros((3,4))`, the variable inspector shows row `a                                                                                                                                                                                     | ndarray | (3, 4) | float64`. Rows update after each run; internal names (starting with `\_`) are hidden. |
| AC-WS-007 | A `vlab.param("fc", 100, 10, 1000, 10)` call creates a slider labelled `fc`; moving it re-runs the code after a 300 ms debounce only when "Live" is enabled; with "Live" off no run starts.                                                                  |
| AC-WS-009 | "Export" produces: `.py` (exact editor content), `.png` and `.svg` for each figure, `.csv` for any array selected in the variable inspector (≤ 2-D), and workspace `.json` that re-imports to identical state.                                               |
| AC-WS-010 | Upload of a 9.9 MB CSV succeeds; 10.1 MB is rejected with `E_LIMIT_UPLOAD`; file is accessible from Python at `/data/<filename>`.                                                                                                                            |

## 4. Execution Engine (AC-ENG)

| ID         | Criterion                                                                                                                                                                                                                                                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-ENG-001 | During boot the UI displays staged progress (Runtime, Packages, Bootstrap) driven by real `ENGINE_PROGRESS` messages, with percent monotonic non-decreasing.                                                                                                                                                                  |
| AC-ENG-002 | **Non-blocking:** while `for i in range(10**7): pass` runs, the main thread records no long task > 100 ms (PerformanceObserver `longtask`) and the Stop button remains clickable.                                                                                                                                             |
| AC-ENG-003 | `import pyodide` and `import js` from user code produce `E_POLICY_VIOLATION` and never execute.                                                                                                                                                                                                                               |
| AC-ENG-004 | **Cancel:** with cross-origin isolation on, `while True: pass` followed by Stop returns state to `Ready` within 500 ms and **preserves** kernel variables. With isolation off, Stop terminates and respawns the worker; state returns to `Ready` within 15 s (cold) / 6 s (cached) and the user is told variables were reset. |
| AC-ENG-005 | After run 1 `x = 5` and run 2 `print(x+1)`, console shows `6` (state persistence).                                                                                                                                                                                                                                            |
| AC-ENG-006 | "Restart kernel" results in `NameError` for `x` in the next run.                                                                                                                                                                                                                                                              |
| AC-ENG-007 | All Pyodide runtime/wheel requests go to the app origin (`/pyodide/*`); in Cypress, intercepting and blocking all other origins does not break boot.                                                                                                                                                                          |
| AC-ENG-008 | Worker protocol messages conform to the TypeScript discriminated union in `packages/shared`; a runtime validator rejects unknown `type` values; `tsc --noEmit` passes with `strict: true`.                                                                                                                                    |
| AC-ENG-009 | Limits enforced: run exceeding `RUN_TIMEOUT_MS` is terminated with `E_LIMIT_TIMEOUT`; creating `np.zeros(30_000_000)` yields `E_LIMIT_ARRAY`; printing > 2 MB yields `E_LIMIT_STDOUT` and truncates.                                                                                                                          |
| AC-ENG-010 | Second page load (cached) reaches `Ready` in ≤ 4 s median on the CI profile; cold load ≤ 15 s on a throttled 10 Mbps profile.                                                                                                                                                                                                 |
| AC-ENG-011 | Only one worker instance exists per tab (verified by counting `Worker` constructions in a test hook).                                                                                                                                                                                                                         |

## 5. Plotting (AC-PLT)

| ID         | Criterion                                                                                                                                                                                       |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-PLT-001 | `vlab.plot(t, y)` with 10,000 points renders a figure with zoom, pan, hover tooltip (x, y values), and box-zoom; double-click resets axes.                                                      |
| AC-PLT-002 | `vlab.bode(num, den)` renders two linked subplots: magnitude (dB) and phase (deg) over log-frequency; for `H(s)=1/(s+1)` the magnitude at ω = 1 rad/s is −3.01 dB ± 0.05 and phase −45° ± 0.5°. |
| AC-PLT-003 | `vlab.pzmap(z, p, domain="z")` draws a unit circle; poles as ×, zeros as ○.                                                                                                                     |
| AC-PLT-004 | `vlab.plot` with 500,000 points downsamples to ≤ 50,000 rendered points using LTTB, retains first and last points, and zooming into a region re-requests full-resolution data for that window.  |
| AC-PLT-005 | `matplotlib.pyplot.plot(...); plt.show()` produces a figure in the plot panel (PNG or SVG) without opening any window or throwing.                                                              |
| AC-PLT-006 | Pan/zoom FPS on a 50,000-point series ≥ 30 (measured via `requestAnimationFrame` sampling in Cypress performance spec).                                                                         |
| AC-PLT-007 | Every figure has a "View data table" toggle (accessibility alternative) showing the first 200 rows.                                                                                             |

## 6. DIP (AC-DIP)

| ID         | Criterion                                                                                                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-DIP-001 | Uploading a PNG shows it in the image viewer; hovering a pixel shows `(x, y) = (R, G, B)` and, for grayscale, intensity.                                                                   |
| AC-DIP-002 | An image above `MAX_IMAGE_PIXELS` is downscaled preserving aspect ratio and a notice states original and new size.                                                                         |
| AC-DIP-003 | OpenCV.js loads only in DIP workspaces (verified by network log); non-DIP workspaces never request `opencv.js`.                                                                            |
| AC-DIP-004 | Histogram equalisation of the reference test image yields an output whose normalised cumulative histogram deviates from linear by ≤ 0.02 (max abs).                                        |
| AC-DIP-005 | Sobel/Canny/Gaussian outputs of the 5 reference images match goldens within PSNR ≥ 40 dB (Gaussian) or exact pixel equality for deterministic integer ops (Sobel thresholded, morphology). |

## 7. Numerical Correctness (AC-NUM)

Golden reference arrays are generated **offline** with desktop Python (NumPy/SciPy versions recorded in `tests/golden/VERSIONS.json`) and committed as `.npy`/`.json`.

| ID         | Criterion                                                                                                                                                                                             |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ----------------------- | ------ | ------------------------------------- |
| AC-NUM-001 | Every experiment in the catalogue has a golden test; CI fails if an experiment lacks one.                                                                                                             |
| AC-NUM-002 | **FFT:** for a seeded random complex vector of length 2^14 (seed 42), `np.fft.fft` in Pyodide matches the golden within relative L2 error ≤ 1e-12.                                                    |
| AC-NUM-003 | **FFT, large:** length 2^20 completes in ≤ 3,000 ms and matches golden within relative L2 error ≤ 1e-11.                                                                                              |
| AC-NUM-004 | **Convolution:** `scipy.signal.fftconvolve(x, h)` with len(x)=100,000 and len(h)=1,000 matches direct `np.convolve` within relative L2 error ≤ 1e-9 and completes in ≤ 2,000 ms.                      |
| AC-NUM-005 | **Known-pair FFT:** `x[n] = cos(2π·50n/1024)`, n ∈ [0,1023]: `                                                                                                                                        | X[50]        | =                       | X[974] | = 512 ± 1e-9`, all other bins ≤ 1e-9. |
| AC-NUM-006 | **Parseval:** for random x (N=4096), `sum                                                                                                                                                             | x            | ² = (1/N)·sum           | X      | ²` within relative error ≤ 1e-12.     |
| AC-NUM-007 | **Convolution theorem:** circular convolution via FFT equals direct circular convolution within 1e-10 absolute (N=512).                                                                               |
| AC-NUM-008 | **Filter design:** `scipy.signal.butter(4, 0.2)` coefficients match golden to 1e-12; `                                                                                                                | H(e^{jπ0.2}) | ` = −3.0103 dB ± 0.001. |
| AC-NUM-009 | **BER:** BPSK Monte Carlo with 1e6 symbols and fixed seed at Eb/N0 = 6 dB gives BER within ±15 % relative of `0.5·erfc(sqrt(10^(6/10)))` (≈ 2.39e-3); at fixed seed it equals the golden BER exactly. |
| AC-NUM-010 | **Welch PSD:** for white noise σ²=1, estimated mean PSD within ±5 % of 2/fs·σ² (one-sided) when averaged over the band excluding DC and Nyquist.                                                      |
| AC-NUM-011 | **Kalman filter:** constant-velocity tracking experiment RMS state error is within 5 % of golden RMS (fixed seed).                                                                                    |
| AC-NUM-012 | **Seeding policy:** experiments using randomness call `np.random.default_rng(seed)` with a seed exposed as a parameter; two runs with the same seed produce byte-identical outputs.                   |
| AC-NUM-013 | **Cross-engine tolerance policy:** default rtol = 1e-9, atol = 1e-12 unless an AC states otherwise; any looser tolerance must be justified in the test file header.                                   |

## 8. Persistence (AC-SAVE)

| ID          | Criterion                                                                                                                                                                        |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-SAVE-001 | Editing code triggers an IndexedDB draft write within 5 s; after killing the tab and reopening the same experiment the draft is restored with a "Recovered unsaved work" banner. |
| AC-SAVE-002 | `POST /api/workspaces` with code ≤ 200 KB returns `201`; > 200 KB returns `413 E_LIMIT_WORKSPACE`; the 51st workspace returns `409 E_LIMIT_WORKSPACE_COUNT`.                     |
| AC-SAVE-003 | Saving while offline queues the write and succeeds automatically on reconnect; no data loss across reload while queued.                                                          |
| AC-SAVE-004 | A user can read/update/delete only their own workspaces; other users' IDs return `404`.                                                                                          |

## 9. Assignments (AC-ASG)

| ID         | Criterion                                                                                                                                                                                                                                 |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-ASG-001 | A professor can create an assignment targeting ≥ 1 section; assigned students see it in their list within one page refresh. Students outside the targeted sections never receive it (API returns no record).                              |
| AC-ASG-002 | Student list shows status exactly one of `not_started`, `in_progress`, `submitted`, `late_submitted`, `graded`, `missed`, and sorts by due date ascending by default.                                                                     |
| AC-ASG-003 | Submit stores an immutable snapshot (code, params, experiment version) with server timestamp; resubmission before due date replaces the snapshot while preserving the first submission time in history.                                   |
| AC-ASG-004 | Professor can open a submission in read-only mode (editor `readOnly`), and Run works in the professor's own browser; no student code ever executes on the server (verified: API has no endpoint that evaluates code; static check in CI). |
| AC-ASG-005 | Grade (0 to `maxMarks`, step 0.5) and feedback (≤ 2,000 chars) are stored; student sees them; marks above `maxMarks` return `422`.                                                                                                        |
| AC-ASG-006 | Professor-edited starter code is used instead of the experiment default for that assignment only.                                                                                                                                         |
| AC-ASG-007 | Extension for one student sets an individual due date; late status computes against it.                                                                                                                                                   |
| AC-ASG-008 | Similarity endpoint returns pairs with score ≥ 0.8 sorted descending; identical code ⇒ score 1.0; code differing only in whitespace/comments/identifier renaming scores ≥ 0.9.                                                            |

## 10. Professor Dashboard (AC-PROF)

| ID          | Criterion                                                                                                                                                   |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-PROF-001 | Submissions table supports sorting by name/time/status, filtering by section, and pagination (page size 25) with server-side paging.                        |
| AC-PROF-002 | Score-distribution histogram uses 10 equal-width bins over `[0, maxMarks]`; submission-rate chart equals `submitted/assigned` to two decimals.              |
| AC-PROF-003 | CSV export contains header `roll_no,name,email,marks,max_marks,status,submitted_at` and one row per assigned student; opens correctly in Excel (UTF-8 BOM). |

## 11. Admin (AC-ADM)

| ID         | Criterion                                                                                                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-ADM-001 | Admin can create, edit, deactivate a user; a deactivated user's login returns `403 E_ACCOUNT_DISABLED` and existing tokens are rejected within one access-token lifetime (≤ 15 min). |
| AC-ADM-002 | Role change is recorded in the audit log with actor, target, old role, new role, timestamp.                                                                                          |
| AC-ADM-003 | CSV import of 500 students completes in ≤ 10 s; invalid rows are reported by line number without aborting valid rows; duplicate emails are skipped and reported.                     |
| AC-ADM-004 | Courses and sections can be created; a professor can be assigned to ≥ 1 section; removal prevents new assignments for that section.                                                  |
| AC-ADM-005 | Audit log is append-only (no update/delete endpoint exists) and paginated.                                                                                                           |
| AC-ADM-006 | Disabling an experiment hides it from the catalogue and returns `404` for its workspace route for students.                                                                          |
| AC-ADM-007 | Usage statistics show daily active users, total runs, and engine error rate for a selectable date range.                                                                             |
| AC-ADM-008 | "Delete user data" removes the user, workspaces, and submissions, and anonymises grades in aggregates (replaces user ID with `deleted`); action is audit-logged.                     |

## 12. UI, Accessibility, Responsiveness (AC-UI)

| ID        | Criterion                                                                                                                                                                                            |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-UI-001 | Axe-core run on login, catalogue, workspace, dashboard pages reports **0** violations of impact `critical` or `serious`.                                                                             |
| AC-UI-002 | All interactive controls are keyboard-reachable; focus ring visible; Esc closes modals.                                                                                                              |
| AC-UI-003 | Light and dark themes switch without reload; contrast ratio ≥ 4.5:1 for body text and ≥ 3:1 for UI components in both themes; editor font size adjustable 10 to 24 px.                               |
| AC-UI-004 | At 768 to 1023 px width, panes collapse into a tabbed layout (Editor / Console / Plots / Variables); at < 768 px a single-pane view with a bottom tab bar; no horizontal scrolling of the page body. |
| AC-UI-005 | Lighthouse (desktop, mobile emulation) on the catalogue page: Performance ≥ 85, Accessibility ≥ 95, Best Practices ≥ 95.                                                                             |

## 13. Performance and Bundle (AC-PERF)

| ID          | Criterion                                                                                                               |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| AC-PERF-001 | Initial JS (app shell, gzip) ≤ 300 KB, excluding Monaco, Plotly/ECharts, Pyodide; those are code-split and lazy-loaded. |
| AC-PERF-002 | Largest Contentful Paint of the login page ≤ 2.5 s on the throttled "Fast 4G" profile.                                  |
| AC-PERF-003 | During a 10 s compute run, memory of the main thread (JS heap) grows ≤ 50 MB.                                           |
| AC-PERF-004 | Worker heap ≥ `MAX_WORKER_HEAP_MB` triggers `E_LIMIT_MEMORY`, termination, and respawn within 15 s without a tab crash. |

## 14. Security-Related Behaviours (AC-SEC, expanded in Batch 4)

| ID         | Criterion                                                                                                                                                                                                                                 |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-SEC-001 | Python code cannot call `fetch`/XMLHttpRequest: from user code, `import js; js.fetch(...)` raises `E_POLICY_VIOLATION` and is blocked even if the static scan is bypassed (runtime import hook denies `js`, `pyodide_js`, `pyodide.ffi`). |
| AC-SEC-002 | CSP header on the app denies inline scripts and restricts `connect-src` to `'self'` and the API origin; `worker-src 'self' blob:`.                                                                                                        |
| AC-SEC-003 | Refresh token cookie flags: `HttpOnly; Secure; SameSite=Strict; Path=/api/auth`. Access token never written to localStorage or cookies.                                                                                                   |
| AC-SEC-004 | CORS allows only configured origins; a request with `Origin: https://evil.example` receives no `Access-Control-Allow-Origin` header.                                                                                                      |

## 15. Definition of Done (global)

A task is complete when:

1. All linked AC tests pass in CI.
2. `tsc --noEmit` (strict), ESLint (zero errors, zero warnings), and Prettier checks pass.
3. Test coverage for the touched package ≥ 80 % lines, ≥ 70 % branches.
4. No new `any`, `@ts-ignore`, or `eslint-disable` without a comment linking to an issue.
5. Documentation touched by the change is updated in the same commit.
6. No new third-party network origin is introduced without updating CSP and `TECH_STACK.md`.
