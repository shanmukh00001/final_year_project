# V-Lab ECE: Product Requirements Document

| Field            | Value                                                         |
| ---------------- | ------------------------------------------------------------- |
| Product          | V-Lab ECE                                                     |
| Owner            | ECE Department, IIT (ISM) Dhanbad                             |
| Document version | 1.0.0                                                         |
| Status           | Approved for implementation                                   |
| Audience         | Autonomous coding agent (Google Antigravity), human reviewers |

> **Agent instruction:** Requirement IDs (`FR-*`, `NFR-*`) are stable. Reference them in commit messages, test names, and PR descriptions. Never renumber them.

---

## 1. Problem Statement

ECE lab courses at IIT (ISM) Dhanbad depend on MATLAB licences, installed lab PCs, and fixed lab hours. Students cannot rehearse experiments at home. Licences are costly. Professors have no unified way to assign, collect, and grade simulation work. Setup friction (installing Python/Octave/MATLAB, matching library versions) consumes lab time.

## 2. Product Summary

V-Lab ECE is a browser-based, zero-install simulation environment. A student opens a URL, logs in, picks an experiment, edits Python code in a split-pane workspace (editor, console, plots, variable inspector), and runs it. **All numerical computation executes in the student's browser** through Pyodide (CPython compiled to WebAssembly) inside a Web Worker. The server (Node/Express + MongoDB) never runs student code. It only handles authentication, saved workspaces, assignments, and submissions.

## 3. Goals and Non-Goals

### 3.1 Goals

- G1: Run ECE experiments with MATLAB-like workflow and no installation.
- G2: Marginal compute cost per simulation is **zero** for the institute (client-side compute).
- G3: Cover the 5 UG and 2 PG course modules listed in Section 5.
- G4: Let professors assign experiments, receive submissions, and grade them.
- G5: Keep the UI responsive (never freeze) while heavy numerics run.

### 3.2 Non-Goals

See `SCOPE.md`. In brief: no server-side code execution, no hardware-in-the-loop, no real-time collaboration, no native MATLAB `.m` execution.

## 4. Personas

| ID     | Persona         | Description                                                                        | Primary needs                                                                  |
| ------ | --------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| P-STU  | Student (UG/PG) | ECE B.Tech/M.Tech student on a mid-range laptop, campus Wi-Fi, occasionally mobile | Fast start, clear experiment instructions, plots that match theory, saved work |
| P-PROF | Professor / TA  | Course instructor                                                                  | Create assignments, view submissions, grade, see class analytics               |
| P-ADM  | Administrator   | Department IT admin                                                                | Manage users and roles, courses, bulk import, audit                            |

## 5. Course Modules and Experiment Catalogue

Each experiment is a **versioned JSON definition** (schema defined in Batch 2) containing: `id`, `title`, `course`, `objective`, `theory` (Markdown + KaTeX), `starterCode`, `parameters` (UI sliders), `expectedOutputs`, `requiredPackages`, `estimatedRuntimeMs`.

### 5.1 UG Courses

#### 5.1.1 Signals and Systems (`course: "SS"`)

| ID    | Experiment                                                        | Key computation                                                | Required output                       |
| ----- | ----------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------- |
| SS-01 | Elementary signal generation (continuous and discrete)            | numpy sampling of step, ramp, impulse, exponentials, sinusoids | Stem and line plots                   |
| SS-02 | Linear convolution (continuous approximation and discrete)        | `numpy.convolve`, `scipy.signal.convolve`                      | Input, impulse response, output plots |
| SS-03 | Fourier series of periodic signals and Gibbs phenomenon           | Coefficient integration, partial sums for N harmonics          | Overlaid reconstruction, spectrum     |
| SS-04 | Fourier transform properties                                      | `numpy.fft` on sampled signals                                 | Magnitude and phase                   |
| SS-05 | Sampling theorem and aliasing                                     | Resampling, reconstruction (sinc interpolation)                | Original vs reconstructed vs aliased  |
| SS-06 | Pole-zero plots, stability, and frequency response of LTI systems | `scipy.signal.TransferFunction`, `freqresp`, `zpk`             | pz-map, magnitude and phase response  |
| SS-07 | Laplace and Z transform (numerical, partial fractions)            | `scipy.signal.residue`, `residuez`                             | Residue table, impulse response       |

#### 5.1.2 Network Theory (`course: "NT"`)

| ID    | Experiment                                     | Key computation                              | Required output                           |
| ----- | ---------------------------------------------- | -------------------------------------------- | ----------------------------------------- |
| NT-01 | Thevenin and Norton equivalents                | Nodal/mesh analysis via `numpy.linalg.solve` | Equivalent values, load line              |
| NT-02 | Maximum power transfer                         | Sweep of R_L                                 | P vs R_L curve                            |
| NT-03 | RC, RL, RLC transient response                 | `scipy.integrate.solve_ivp`, closed-form     | v(t), i(t), damping classification        |
| NT-04 | AC steady state and phasors                    | Complex arithmetic                           | Phasor diagram (polar plot)               |
| NT-05 | Series/parallel resonance, Q factor, bandwidth | Frequency sweep                              | Magnitude vs frequency, bandwidth markers |
| NT-06 | Two-port network parameters (Z, Y, ABCD, h)    | Matrix conversions                           | Parameter tables                          |
| NT-07 | Passive filter frequency response (Bode)       | `scipy.signal.bode`                          | Bode magnitude and phase                  |

#### 5.1.3 Digital Signal Processing (`course: "DSP"`)

| ID     | Experiment                                                | Key computation                          | Required output                                      |
| ------ | --------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------- |
| DSP-01 | DFT and FFT, spectral leakage, zero padding               | `numpy.fft.fft`                          | Spectrum plots with window comparison                |
| DSP-02 | Linear and circular convolution, overlap-add/save         | Manual + `scipy.signal.fftconvolve`      | Equivalence plot, timing report                      |
| DSP-03 | FIR filter design (window method, Parks-McClellan)        | `scipy.signal.firwin`, `remez`           | Impulse and frequency response                       |
| DSP-04 | IIR filter design (Butterworth, Chebyshev I/II, Elliptic) | `scipy.signal.iirfilter`, `sosfreqz`     | Bode, pz-map, group delay                            |
| DSP-05 | STFT and spectrogram                                      | `scipy.signal.stft`, `spectrogram`       | 2D heatmap                                           |
| DSP-06 | Multirate processing (decimation, interpolation)          | `scipy.signal.decimate`, `resample_poly` | Before/after spectra                                 |
| DSP-07 | Audio filtering demo (uploaded WAV, up to 10 s)           | `scipy.io.wavfile`                       | Waveform and spectrogram, playback via Web Audio API |

#### 5.1.4 Digital Image Processing (`course: "DIP"`)

Engine split: numpy/scipy.ndimage inside Pyodide for matrix-style experiments; **OpenCV.js** (WASM build, main-thread-isolated or dedicated worker) for OpenCV-style operations; Canvas API for image I/O and display.
| ID | Experiment | Engine | Required output |
|---|---|---|---|
| DIP-01 | Image I/O, colour spaces, point operations (negative, log, gamma) | Canvas + numpy | Side-by-side images |
| DIP-02 | Histogram, equalisation, CLAHE | numpy / OpenCV.js | Histograms, before/after |
| DIP-03 | Spatial filtering (mean, Gaussian, median, sharpening) | scipy.ndimage / OpenCV.js | Filtered images |
| DIP-04 | 2D DFT, frequency-domain filtering (ideal, Butterworth, Gaussian) | `numpy.fft.fft2` | Log-magnitude spectrum, filtered image |
| DIP-05 | Edge detection (Sobel, Laplacian, Canny) | OpenCV.js | Edge maps |
| DIP-06 | Morphology (erosion, dilation, opening, closing) | OpenCV.js / scipy.ndimage | Binary images |
| DIP-07 | Segmentation (Otsu, k-means) | OpenCV.js | Segmentation maps |

#### 5.1.5 Basics of Electronics Engineering (`course: "BEE"`)

| ID     | Experiment                                                                | Key computation                      | Required output                     |
| ------ | ------------------------------------------------------------------------- | ------------------------------------ | ----------------------------------- |
| BEE-01 | PN-junction diode I-V (Shockley equation)                                 | numpy                                | Forward/reverse I-V, log-scale plot |
| BEE-02 | Half-wave and full-wave rectifier with filter capacitor                   | Time-domain simulation (`solve_ivp`) | Vin, Vout, ripple factor            |
| BEE-03 | Zener regulator line and load regulation                                  | Piecewise model                      | Regulation curves                   |
| BEE-04 | BJT input/output characteristics, load line, Q-point                      | Ebers-Moll simplified model          | Characteristic families             |
| BEE-05 | Op-amp inverting, non-inverting, integrator, differentiator               | Transfer-function model              | Time-domain response                |
| BEE-06 | Logic gates and combinational circuits (truth tables, K-map minimisation) | Pure Python                          | Truth table, timing diagram         |
| BEE-07 | RC low-pass and high-pass filters                                         | `scipy.signal`                       | Bode plot                           |

### 5.2 PG Courses

#### 5.2.1 Advanced Communication Systems (`course: "ACS"`)

| ID     | Experiment                                                          | Key computation                                        | Required output                      |
| ------ | ------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------ |
| ACS-01 | Digital modulation (BPSK, QPSK, M-PSK, M-QAM)                       | numpy                                                  | Constellation, waveform              |
| ACS-02 | BER in AWGN versus theory                                           | Monte Carlo (1e5 to 1e6 symbols), `scipy.special.erfc` | BER vs Eb/N0 (log y), theory overlay |
| ACS-03 | Pulse shaping (raised cosine, root-raised cosine), ISI, eye diagram | `scipy.signal.upfirdn`, custom RRC                     | Eye diagram                          |
| ACS-04 | Matched filter and correlation receiver                             | `scipy.signal.correlate`                               | Output SNR peak                      |
| ACS-05 | Fading channels (Rayleigh, Rician), diversity combining             | numpy random                                           | BER with/without diversity           |
| ACS-06 | OFDM transceiver with cyclic prefix over multipath                  | `numpy.fft.ifft/fft`                                   | Constellation, BER                   |
| ACS-07 | MIMO capacity and spatial multiplexing (zero-forcing, MMSE)         | `numpy.linalg`                                         | Capacity CDF, BER                    |
| ACS-08 | Carrier/timing synchronisation (Costas loop, Gardner TED)           | Loop simulation                                        | Lock curves                          |

#### 5.2.2 Statistical Signal Processing (`course: "SSP"`)

| ID     | Experiment                                                         | Key computation               | Required output                          |
| ------ | ------------------------------------------------------------------ | ----------------------------- | ---------------------------------------- |
| SSP-01 | Random process generation, ergodicity, autocorrelation             | numpy                         | ACF estimates, ensemble vs time averages |
| SSP-02 | Spectral estimation (periodogram, Bartlett, Welch, Blackman-Tukey) | `scipy.signal.welch`          | PSD comparison                           |
| SSP-03 | Parametric spectral estimation (AR via Yule-Walker, Burg)          | `scipy.linalg.solve_toeplitz` | AR PSD vs true PSD                       |
| SSP-04 | Wiener filtering                                                   | Normal equations              | MSE surface, filter response             |
| SSP-05 | Adaptive filters (LMS, NLMS, RLS)                                  | Python loops over numpy       | Learning curves                          |
| SSP-06 | Kalman filter (tracking)                                           | Matrix recursion              | State estimate vs truth                  |
| SSP-07 | Estimation theory (MLE, CRLB verification by Monte Carlo)          | numpy, scipy.optimize         | Variance vs CRLB                         |
| SSP-08 | Detection theory (Neyman-Pearson, ROC)                             | `scipy.stats`                 | ROC curves                               |

## 6. Functional Requirements

### 6.1 Authentication and Accounts

| ID         | Requirement                                                                                                                                                           | Priority |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-AUTH-01 | Users register/login with institute email (`@iitism.ac.in` and `@students.iitism.ac.in` allowlisted domains; configurable). Email verification required before login. | Must     |
| FR-AUTH-02 | Passwords are stored hashed (bcrypt, cost 12). Min length 10.                                                                                                         | Must     |
| FR-AUTH-03 | Roles: `student`, `professor`, `admin`. Role-based route protection on client and API.                                                                                | Must     |
| FR-AUTH-04 | Access token (short-lived) + refresh token (httpOnly cookie, rotation).                                                                                               | Must     |
| FR-AUTH-05 | Password reset via emailed one-time link (expires in 30 minutes).                                                                                                     | Should   |
| FR-AUTH-06 | Guest mode: run any public experiment without login; save disabled.                                                                                                   | Should   |

### 6.2 Workspace

| ID       | Requirement                                                                                                                                                                                                             | Priority |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-WS-01 | Split-pane workspace: file/experiment explorer (left), code editor (centre top), console (centre bottom), plot panel (right), variable inspector (right bottom). All panes resizable and collapsible; layout persisted. | Must     |
| FR-WS-02 | Code editor: Monaco Editor with Python syntax highlighting, bracket matching, find/replace, Ctrl/Cmd+Enter to run, Shift+Enter to run selection.                                                                        | Must     |
| FR-WS-03 | Run, Stop, Restart-Kernel, Clear-Console controls.                                                                                                                                                                      | Must     |
| FR-WS-04 | Streaming stdout/stderr to console in real time (batched, max 60 flushes per second).                                                                                                                                   | Must     |
| FR-WS-05 | Python tracebacks mapped to editor line numbers with inline error markers.                                                                                                                                              | Must     |
| FR-WS-06 | Variable inspector listing name, type, shape, dtype, and preview for numpy arrays and scalars after each run.                                                                                                           | Should   |
| FR-WS-07 | Parameter panel: sliders/inputs bound to named Python variables; changing a value triggers re-run (debounced 300 ms) when "Live" is on.                                                                                 | Should   |
| FR-WS-08 | Multi-file workspace (virtual file system in worker memory, persisted to IndexedDB).                                                                                                                                    | Could    |
| FR-WS-09 | Export: download code (`.py`), plots (PNG/SVG), data (CSV/NPY), full workspace JSON.                                                                                                                                    | Must     |
| FR-WS-10 | Import: upload CSV, WAV, PNG/JPG (max 10 MB each) into the virtual file system.                                                                                                                                         | Must     |

### 6.3 Simulation Engine

| ID        | Requirement                                                                                                                                                                            | Priority   |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| FR-ENG-01 | Pyodide runs only inside a dedicated Web Worker; the main thread never imports Pyodide.                                                                                                | Must       |
| FR-ENG-02 | Preloaded packages: `numpy`, `scipy`, `matplotlib`; optional packages loaded lazily per experiment (`requiredPackages`).                                                               | Must       |
| FR-ENG-03 | Cancellation: cooperative interrupt via `SharedArrayBuffer` when cross-origin isolated; fallback to worker termination + respawn.                                                      | Must       |
| FR-ENG-04 | Wall-clock timeout (default 30 s, configurable up to 120 s per experiment) with automatic termination.                                                                                 | Must       |
| FR-ENG-05 | Warm kernel: state (variables) persists between runs until Restart-Kernel.                                                                                                             | Must       |
| FR-ENG-06 | `vlab` helper module injected into Python: `vlab.plot(...)`, `vlab.stem(...)`, `vlab.bode(...)`, `vlab.imshow(...)`, `vlab.surface(...)`, `vlab.param(name, default, min, max, step)`. | Must       |
| FR-ENG-07 | `matplotlib.pyplot.show()` is intercepted and converted to PNG/SVG sent to the plot panel (compatibility layer).                                                                       | Should     |
| FR-ENG-08 | Runtime assets (Pyodide, wheels) cached by Service Worker/Cache API; second visit starts offline-capable.                                                                              | Should     |
| FR-ENG-09 | OpenCV.js runs in a separate dedicated worker, loaded only for DIP experiments.                                                                                                        | Must (DIP) |

### 6.4 Plotting

| ID        | Requirement                                                                            | Priority |
| --------- | -------------------------------------------------------------------------------------- | -------- |
| FR-PLT-01 | Time-domain waveforms (line, stem, step) with zoom, pan, hover, and box select.        | Must     |
| FR-PLT-02 | Bode plot (magnitude dB, phase degrees, log-frequency axis).                           | Must     |
| FR-PLT-03 | Pole-zero plot with unit circle (discrete) or imaginary axis (continuous).             | Must     |
| FR-PLT-04 | Spectrogram/heatmap, constellation diagram, eye diagram.                               | Must     |
| FR-PLT-05 | 3D surface/scatter (MSE surfaces, ambiguity functions).                                | Should   |
| FR-PLT-06 | Image display with pixel inspector (DIP).                                              | Must     |
| FR-PLT-07 | Downsampling (LTTB) for series above 50,000 points; full-resolution available on zoom. | Must     |
| FR-PLT-08 | Multiple figures arranged in tabs and subplots grid.                                   | Should   |

### 6.5 Persistence

| ID         | Requirement                                                                                                                            | Priority |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-SAVE-01 | Autosave workspace draft to IndexedDB every 5 s when changed (works for guests).                                                       | Must     |
| FR-SAVE-02 | Logged-in users save named workspaces to the server (code, parameters, layout; no plot data). Max 50 workspaces per user, 200 KB each. | Must     |
| FR-SAVE-03 | Version history: last 10 server saves per workspace.                                                                                   | Could    |

### 6.5.1 Assignments and Grading

| ID        | Requirement                                                                                                                                                      | Priority |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-ASG-01 | Professor creates an assignment: select experiment, set title, instructions, due date, max marks, target class (course + section list), allowed late submission. | Must     |
| FR-ASG-02 | Student sees assigned experiments with due dates and status (`not_started`, `in_progress`, `submitted`, `graded`).                                               | Must     |
| FR-ASG-03 | Student submits workspace snapshot (code + parameters + captured outputs metadata + optional report text).                                                       | Must     |
| FR-ASG-04 | Professor reviews a submission by loading it into a read-only workspace and may **re-run** it locally in their own browser to verify results.                    | Must     |
| FR-ASG-05 | Professor assigns marks and feedback; student is notified in-app.                                                                                                | Must     |
| FR-ASG-06 | Professor dashboard shows submission rate, score distribution, and per-experiment average.                                                                       | Should   |
| FR-ASG-07 | Export grades as CSV.                                                                                                                                            | Should   |
| FR-ASG-08 | Plagiarism hint: normalised code hash and similarity score between submissions of one assignment (Jaccard on token 5-grams).                                     | Could    |

### 6.6 Administration

| ID        | Requirement                                                                   | Priority |
| --------- | ----------------------------------------------------------------------------- | -------- |
| FR-ADM-01 | Admin CRUD for users; role assignment; deactivate account.                    | Must     |
| FR-ADM-02 | Bulk import of students via CSV (email, name, roll number, programme, batch). | Should   |
| FR-ADM-03 | Manage courses and sections; assign professors.                               | Must     |
| FR-ADM-04 | Audit log of privileged actions (role change, grade override, deletion).      | Should   |

## 7. Non-Functional Requirements

| ID          | Category       | Requirement                                                                                                                           |
| ----------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-PERF-01 | Startup        | Application shell interactive in under 3 s on 4G; Pyodide ready in under 15 s cold, under 4 s warm (cached) on the reference machine. |
| NFR-PERF-02 | Responsiveness | No main-thread task longer than 50 ms attributable to simulation; UI stays interactive during runs.                                   |
| NFR-PERF-03 | Rendering      | Plot panel sustains at least 30 FPS pan/zoom for 50,000-point series.                                                                 |
| NFR-COST-01 | Cost           | Server infrastructure must fit within Vercel Hobby/Pro and MongoDB Atlas M0 free tier for up to 1,000 registered users.               |
| NFR-COMP-01 | Browsers       | Latest two versions of Chrome, Edge, Firefox, Safari 16.4+.                                                                           |
| NFR-A11Y-01 | Accessibility  | WCAG 2.1 AA for application chrome; plots offer data-table alternative.                                                               |
| NFR-SEC-01  | Security       | Student code executes only in the student's own browser sandbox; see Batch 4 threat model.                                            |
| NFR-PRIV-01 | Privacy        | Only data in `PRIVACY.md` (Batch 4) is collected; no third-party analytics cookies.                                                   |
| NFR-REL-01  | Reliability    | Losing the network never loses unsaved work (IndexedDB autosave).                                                                     |
| NFR-I18N-01 | Language       | English UI; UTF-8 everywhere.                                                                                                         |

## 8. Success Metrics

Defined in `PRODUCT_VISION.md`.

## 9. Assumptions

- A1: Student devices have at least 4 GB RAM and a 2019-or-newer CPU.
- A2: Campus bandwidth is at least 10 Mbps; first-load assets (about 30 to 60 MB for numpy, scipy, matplotlib) are cached afterwards.
- A3: Python 3 numerics in Pyodide are accepted by faculty as the MATLAB-equivalent teaching language.
- A4: Hosting uses Vercel and MongoDB Atlas as specified in `TECH_STACK.md` (Batch 2).

## 10. Risks and Mitigations

| Risk                                           | Impact                         | Mitigation                                                                                                         |
| ---------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Large first download over slow connections     | Poor first impression          | Progressive loading (UI first, runtime in background), Service Worker caching, optional campus-LAN mirrored assets |
| Browser memory limits on low-RAM devices       | Crashes on large images/FFTs   | Hard input-size limits (see `SCOPE.md`), memory watchdog, friendly error messages                                  |
| `SharedArrayBuffer` requires COOP/COEP headers | Cancel falls back to terminate | Set headers on Vercel; implement fallback path                                                                     |
| Student unfamiliarity with Python vs MATLAB    | Adoption friction              | Provide a MATLAB-to-NumPy cheat sheet inside each experiment                                                       |
| Third-party CDN outage                         | Engine fails to load           | Self-host Pyodide assets from the app origin (not a public CDN)                                                    |

## 11. Release Phases (summary)

Detailed in `/docs/development/MILESTONES.md` (Batch 3).

- **MVP (M1):** Auth, workspace, engine, plotting, Signals & Systems + Network Theory, saved workspaces.
- **M2:** DSP, BEE, assignments, professor dashboard.
- **M3:** DIP (OpenCV.js), admin tools, analytics.
- **M4:** PG modules (ACS, SSP), plagiarism hints, hardening.
