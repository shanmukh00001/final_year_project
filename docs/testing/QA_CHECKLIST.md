# V-Lab ECE: QA Checklist (Web Worker Rendering and Performance)

Use for every milestone gate (`MILESTONES.md` §9) and before every release. Automated tests cover timing on the CI profile; this checklist covers **real devices, real networks, and things automation cannot see**. Record results in a copy of this file under `docs/qa-runs/<date>-<milestone>.md`.

## 0. Test Environment Matrix

| Device ID | Description                                                   | Browser        | Purpose                                     |
| --------- | ------------------------------------------------------------- | -------------- | ------------------------------------------- |
| D1        | Reference machine: 4-core x86-64 laptop, 8 GB RAM, plugged in | Chrome stable  | Budget compliance                           |
| D2        | Low-end laptop: 2-core, 4 GB RAM                              | Chrome stable  | Worst-case desktop (typical student device) |
| D3        | Recent Windows laptop                                         | Edge stable    | Browser parity                              |
| D4        | Any laptop                                                    | Firefox stable | Browser parity                              |
| D5        | macOS or iPadOS                                               | Safari 16.4+   | WebKit behaviour                            |
| D6        | Android tablet                                                | Chrome         | Tablet profile                              |
| D7        | Android phone (4 GB RAM)                                      | Chrome         | Phone profile                               |
| D8        | iPhone                                                        | Safari         | Phone profile and memory limits             |

Network profiles (Chrome DevTools throttling or router shaping): **N1** campus Wi-Fi (unthrottled), **N2** Fast 4G, **N3** Slow 4G (≈ 1.6 Mbps), **N4** offline.
Tester: **\_\_** Date: **\_\_** Build/commit: **\_\_** Pyodide version: **\_\_**

Pass notation: ✔ pass, ✘ fail (file bug with ID), – not applicable.

## 1. Boot and Caching (Engine Worker)

| #    | Check                                 | Method                                                                                                    | Pass criterion                                                                                                    | D1  | D2  | D5  | D7  |
| ---- | ------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --- | --- | --- | --- |
| 1.1  | Cold boot to `Ready`, empty cache, N1 | DevTools → Application → Clear storage; reload; read `engine_ready_ms` (status bar tooltip in dev builds) | ≤ 15 s (AC-ENG-010)                                                                                               |     |     |     |     |
| 1.2  | Cold boot, N2                         | Same                                                                                                      | ≤ 25 s; progress bar advances continuously                                                                        |     |     |     |     |
| 1.3  | Cold boot, N3                         | Same                                                                                                      | Completes; UI usable throughout; no stuck progress                                                                |     |     |     |     |
| 1.4  | Warm boot (second load)               | Reload                                                                                                    | ≤ 4 s (AC-ENG-010)                                                                                                |     |     |     |     |
| 1.5  | Progress is real and monotonic        | Watch progress UI (Runtime → Packages → Bootstrap)                                                        | Never decreases (AC-ENG-001)                                                                                      |     |     |     |     |
| 1.6  | UI interactive during boot            | Type in editor, switch tabs, open menus during boot                                                       | No perceptible lag (input latency < 100 ms)                                                                       |     |     |     |     |
| 1.7  | Offline after first load (N4)         | Load once, go offline, reload                                                                             | App shell and engine load from cache; Run works; API calls queue                                                  |     |     |     |     |
| 1.8  | Pyodide assets cache                  | DevTools → Network                                                                                        | `/pyodide/314.0.3/*` served from Service Worker/disk cache on warm load; **no third-party requests** (AC-ENG-007) |     |     |     |     |
| 1.9  | Only one worker                       | DevTools → Sources → Threads (or `chrome://inspect/#workers`)                                             | Exactly 1 Pyodide worker (+ 1 OpenCV worker only in DIP) (AC-ENG-011)                                             |     |     |     |     |
| 1.10 | Boot failure recovery                 | Block `/pyodide/*` in DevTools, reload                                                                    | Failure panel with Retry; after unblock, Retry succeeds; 3-attempt backoff observed                               |     |     |     |     |

## 2. Main-Thread Responsiveness During Computation

Use DevTools → Performance (record 10 s) or the in-app `longtask` overlay (dev build).
| # | Check | Method | Pass criterion | D1 | D2 | D6 |
|---|---|---|---|---|---|---|
| 2.1 | Heavy FFT loop | Run 20 FFTs of 2^18 (TC-FFT-102 code) | No main-thread task > 100 ms (AC-ENG-002); typing in editor stays smooth | | | |
| 2.2 | Infinite Python loop | `while True: pass` | UI responsive; Stop button works; no browser "page unresponsive" dialog | | | |
| 2.3 | Rapid print flood | `for i in range(200000): print(i)` | Console stays at ≤ 60 flushes/s; scrolling smooth; output truncated message at 2 MB; tab does not freeze (AC-WS-004) | | | |
| 2.4 | Console memory | Run 2.3 five times | Console retains 5,000 lines; JS heap growth bounded (< 50 MB, AC-PERF-003) | | | |
| 2.5 | Resize panes while running | Drag splitters during a 10 s compute | 60 FPS-feel; no layout thrash; plots resize after drag ends | | | |
| 2.6 | Switch browser tab while running | Background the tab | Run completes; results appear on return (note timing throttle differences) | | | |
| 2.7 | Parameter slider with Live on | Drag slider continuously for 5 s | Runs are debounced; no overlapping runs; no queue build-up; latest value wins | | | |

## 3. Cancellation, Timeout, Memory

| #   | Check                                                 | Method                                                                          | Pass criterion                                                                                                   | D1  | D2  | D5  |
| --- | ----------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --- | --- | --- |
| 3.1 | Cooperative Stop (isolated browsers)                  | `while True: pass` then Stop; verify `crossOriginIsolated` is `true` in console | Back to Ready ≤ 500 ms; variables preserved (AC-ENG-004)                                                         |     |     |     |
| 3.2 | Stop during single long NumPy call                    | Run `np.fft.fft(np.random.rand(2**22))`, Stop quickly                           | After ≤ 2 s grace the kernel resets with the explanatory message; respawn to Ready ≤ 15 s cold / 6 s cached      |     |     |     |
| 3.3 | Fallback when not isolated (Safari or header removed) | Remove COOP/COEP via a local proxy or use a browser without SAB                 | Stop terminates and respawns; user told variables were reset                                                     |     |     |     |
| 3.4 | Timeout                                               | Run for longer than `RUN_TIMEOUT_MS`                                            | `E_LIMIT_TIMEOUT` message; worker respawned; app stable                                                          |     |     |     |
| 3.5 | Array limit                                           | `np.zeros(30_000_000)`                                                          | `E_LIMIT_ARRAY`; variable removed; kernel alive (AC-ENG-009)                                                     |     |     |     |
| 3.6 | Heap pressure                                         | Allocate arrays repeatedly until the heap cap is approached                     | Warning at cap; `E_LIMIT_MEMORY` and respawn rather than tab crash (AC-PERF-004)                                 |     |     |     |
| 3.7 | Tab survives OOM                                      | On D2 (4 GB) and D7/D8                                                          | No full-tab crash within the profile's heap cap; if the OS kills the tab, draft recovers on reopen (AC-SAVE-001) |     |     |     |
| 3.8 | Kernel restart                                        | Restart button                                                                  | State cleared (`NameError`), engine Ready again within warm budget (AC-ENG-006)                                  |     |     |     |

## 4. Plot Rendering Performance

| #    | Check                          | Method                                              | Pass criterion                                                                                                 | D1  | D2  | D6  |
| ---- | ------------------------------ | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --- | --- | --- |
| 4.1  | 10,000-point line plot         | `vlab.plot(t, y)`                                   | Renders < 300 ms after `FIGURE_READY`; zoom/pan/hover work (AC-PLT-001)                                        |     |     |     |
| 4.2  | 50,000-point pan/zoom FPS      | Pan continuously 3 s with DevTools FPS meter        | ≥ 30 FPS (AC-PLT-006)                                                                                          |     |     |     |
| 4.3  | 500,000-point downsampling     | `vlab.plot` with 500k points                        | ≤ 50,000 rendered points; first/last preserved; zoom restores detail (AC-PLT-004)                              |     |     |     |
| 4.4  | WebGL fallback                 | Disable WebGL (`chrome://flags` or `--disable-gpu`) | Falls back to SVG `scatter`; still usable at reduced density                                                   |     |     |     |
| 4.5  | Multiple figures               | Emit 8 figures                                      | Tabs OK; at most 6 live WebGL contexts, others static until activated; no console warnings about lost contexts |     |     |     |
| 4.6  | Heatmap/spectrogram            | Spectrogram of 10 s @ 16 kHz                        | Renders < 1 s after data arrival; downsampled to the profile pixel budget                                      |     |     |     |
| 4.7  | Bode and pole-zero correctness | `vlab.bode([1],[1,1])`                              | −3.01 dB and −45° at ω = 1 (AC-PLT-002); unit circle drawn for z-domain (AC-PLT-003)                           |     |     |     |
| 4.8  | Image viewer (DIP)             | 2048×2048 image                                     | Loads; pixel inspector reads original values; downscale notice when above cap (AC-DIP-001, 002)                |     |     |     |
| 4.9  | 3D surface                     | `vlab.surface` 100×100                              | Rotates smoothly on D1; on phone static preview with "Tap to interact"                                         |     |     |     |
| 4.10 | Theme switch with figures open | Toggle dark/light                                   | Figures recolour without re-run; zoom state preserved (`uirevision`)                                           |     |     |     |
| 4.11 | Figure memory                  | Run 20 times emitting a 1M-point figure             | No steady growth in heap after GC; old figure data released                                                    |     |     |     |
| 4.12 | Data table alternative         | Toggle "View data table"                            | First 200 rows visible; keyboard accessible (AC-PLT-007)                                                       |     |     |     |

## 5. Data Transfer and Marshalling

| #   | Check                      | Method                                                             | Pass criterion                                                                 |
| --- | -------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| 5.1 | Transferables used         | DevTools Performance → inspect `postMessage` cost for 10 MB figure | No visible structured-clone spike; buffers detach in worker (zero-copy)        |
| 5.2 | Stale run messages ignored | Start run, press Stop, start another quickly                       | No output from the first run appears in the second (runId discard)             |
| 5.3 | Large upload               | Upload 9.9 MB CSV; load with `np.loadtxt`                          | Upload OK; load within 5 s; 10.1 MB rejected with `E_LIMIT_UPLOAD` (AC-WS-010) |
| 5.4 | Export fidelity            | Export code, PNG, SVG, CSV, workspace JSON; re-import workspace    | Code byte-identical; workspace restores identically (AC-WS-009)                |

## 6. Memory and Resource Profile (manual measurements)

| #   | Check                        | Method                                      | Record                     | Pass criterion                                  |
| --- | ---------------------------- | ------------------------------------------- | -------------------------- | ----------------------------------------------- |
| 6.1 | Idle memory after boot       | Chrome Task Manager (Shift+Esc)             | Page + worker MB: \_\_\_\_ | Page ≤ 400 MB on desktop                        |
| 6.2 | Peak during 2^20 FFT         | Task Manager during run                     | Peak MB: \_\_\_\_          | Below `MAX_WORKER_HEAP_MB` + 300 MB             |
| 6.3 | Post-run release             | Run, then idle 30 s, force GC               | Delta MB: \_\_\_\_         | Returns to within 150 MB of idle                |
| 6.4 | Long session                 | 60 min of mixed use (≥ 100 runs)            | Start/end MB: \_\_\_\_     | No unbounded growth (> 2× idle)                 |
| 6.5 | CPU usage when idle          | Task Manager                                | CPU %: \_\_\_\_            | ≈ 0 % when no run is active (no polling storms) |
| 6.6 | Battery sensitivity (laptop) | Observe fan/throttling after 10 min of runs | Notes: \_\_\_\_            | No sustained 100 % CPU while idle               |

## 7. Network and Resilience

| #   | Check                     | Method                               | Pass criterion                                                                 |
| --- | ------------------------- | ------------------------------------ | ------------------------------------------------------------------------------ |
| 7.1 | API outage during save    | Block `/api/*`, click Save           | Toast "Saved locally, will sync"; queue flushes after unblocking (AC-SAVE-003) |
| 7.2 | Token expiry mid-session  | Wait > 15 min or force expiry        | Silent refresh; no user interruption (AC-AUTH-003)                             |
| 7.3 | Session loss              | Delete refresh cookie then act       | Redirect to login with draft preserved and recovered after login               |
| 7.4 | Deployment update         | Deploy new build while a tab is open | SW updates on next navigation; stale caches deleted; no mixed-version crash    |
| 7.5 | Flaky network during boot | Toggle offline/online mid-boot       | Failure panel or auto-retry; no hang                                           |

## 8. Cross-Browser and Device Behaviour

| #                                                                  | Check | Chrome | Edge | Firefox | Safari | Android | iOS |
| ------------------------------------------------------------------ | ----- | ------ | ---- | ------- | ------ | ------- | --- |
| 8.1 Boot and run SS-01                                             |       |        |      |         |        |         |     |
| 8.2 Cancel behaviour matches expectation (cooperative or fallback) |       |        |      |         |        |         |     |
| 8.3 Plot interaction (mouse/touch)                                 |       |        |      |         |        |         |     |
| 8.4 File upload and download                                       |       |        |      |         |        |         |     |
| 8.5 Theme and layout persistence                                   |       |        |      |         |        |         |     |
| 8.6 Keyboard shortcuts (desktop only)                              |       |        |      |         |        | –       | –   |
| 8.7 Phone layout: bottom bar, LiteEditor, no horizontal scroll     | –     | –      | –    | –       |        |         |
| 8.8 Tablet layout: tabs, optional 2-up                             | –     | –      | –    | –       |        |         |

Notes on Safari: iOS enforces tighter per-tab memory; confirm profile cap (600 MB) prevents crashes; note any WASM allocation failures.

## 9. Accessibility Quick Pass (supplements automated axe)

| #   | Check                                                                                | Pass criterion                                           |
| --- | ------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| 9.1 | Keyboard-only: boot, run, stop, switch panes, open menus                             | All reachable; focus ring visible (AC-UI-002)            |
| 9.2 | Screen reader (NVDA or VoiceOver) announces engine status changes and run completion | Status bar live region speaks "Ready", "Running", errors |
| 9.3 | Plot data table readable by SR                                                       | Table has headers and caption                            |
| 9.4 | 200 % zoom and 400 % reflow                                                          | No clipped controls, no horizontal page scroll           |
| 9.5 | Reduced motion                                                                       | Spinners and transitions minimal                         |
| 9.6 | Contrast spot check in both themes                                                   | No text below 4.5:1                                      |

## 10. Experiment Spot Checks (numerical sanity by a human)

Run at least one experiment per course and compare against the lab manual or MATLAB output:
| Course | Experiment | Compared with | Result |
|---|---|---|---|
| SS | SS-03 Fourier series (Gibbs overshoot ≈ 9 %) | Manual | |
| NT | NT-03 RLC transient (damping class correct) | Manual | |
| DSP | DSP-04 Butterworth −3 dB at cutoff | MATLAB `butter` | |
| BEE | BEE-01 diode I-V knee near 0.6 to 0.7 V | Manual | |
| DIP | DIP-02 histogram equalisation | OpenCV desktop | |
| ACS | ACS-02 BER curve vs theory | Theory | |
| SSP | SSP-02 Welch PSD of white noise flat | Theory | |
Faculty reviewer sign-off: **\_\_**

## 11. Release Sign-off

| Item                                                                                         | Owner   | Status |
| -------------------------------------------------------------------------------------------- | ------- | ------ |
| Sections 1 to 9 executed on devices required by the milestone (M1: D1, D2, D5, D7; M2+: all) | QA      |        |
| All ✘ items have bug IDs; no open Sev-1 or Sev-2                                             | QA lead |        |
| Automated suite green (link)                                                                 | CI      |        |
| Perf spec results attached (`cypress/results/perf`)                                          | QA      |        |
| Faculty sponsor approval                                                                     | Faculty |        |

Decision: ☐ GO ☐ NO-GO ☐ GO WITH CONDITIONS: \***\*\*\*\*\***\_\_\***\*\*\*\*\***
