# V-Lab ECE: Product Vision

## 1. Vision Statement

Every ECE student at IIT (ISM) Dhanbad can open a browser, on any laptop, at any hour, and run the same laboratory simulations that previously required a licensed MATLAB seat in a scheduled lab slot, at **zero marginal compute cost** to the institute.

## 2. Mission

Replace licence-bound, install-heavy simulation tooling with a free, instantly available, Python-based virtual lab that runs entirely on the student's own device, while giving faculty the assignment, submission, and grading tools they need.

## 3. Strategic Goals for IIT (ISM) Dhanbad

| #    | Goal                                                 | Rationale                                                        |
| ---- | ---------------------------------------------------- | ---------------------------------------------------------------- |
| SG-1 | Remove licence dependency for core ECE labs          | Reduces recurring MATLAB licence expenditure and seat contention |
| SG-2 | Increase effective lab access beyond scheduled hours | Students can rehearse before and revise after lab sessions       |
| SG-3 | Standardise experiment definitions across sections   | Same starter code, same expected outputs, fair grading           |
| SG-4 | Teach open-source scientific Python                  | NumPy/SciPy are industry- and research-relevant skills           |
| SG-5 | Create a reusable template for other departments     | Architecture generalises to Mechanical, Civil, Mining labs       |
| SG-6 | Keep operating cost near zero                        | Free-tier infrastructure sufficient; no GPU or compute servers   |

## 4. Target Audience

| Segment                                   | Size (estimate) | Needs                                         | Notes                        |
| ----------------------------------------- | --------------- | --------------------------------------------- | ---------------------------- |
| UG ECE students (B.Tech, 2nd to 4th year) | ~400            | Course labs for SS, NT, DSP, DIP, BEE         | Primary users                |
| PG ECE students (M.Tech/PhD)              | ~80             | ACS, SSP experiments and research prototyping | Larger Monte Carlo workloads |
| ECE faculty and TAs                       | ~25             | Assignment authoring, grading                 | Need simple authoring UI     |
| Department administrators                 | 2 to 3          | User/course management                        | Low volume                   |

## 5. Core Principles

1. **Client-side first.** If it can run in the browser, it must. The server stores data; it does not compute.
2. **Never freeze the UI.** All numerics live in Web Workers.
3. **MATLAB-like ergonomics.** Editor, console, plots, and workspace variables visible together.
4. **Offline-tolerant.** After the first visit, the lab loads from cache; work is autosaved locally.
5. **Transparent correctness.** Every experiment ships with reference outputs validated against desktop NumPy/SciPy.
6. **Privacy by default.** Minimum student data; no third-party tracking.

## 6. Value Proposition by Persona

- **Student:** "Open link, press Run." No install, no licence, same result as the lab PC.
- **Professor:** "Assign, collect, re-run, grade" in one place, with verifiable reproducibility.
- **Administrator:** "Zero compute bill," simple role and course management.

## 7. Success Metrics

### 7.1 Adoption

| Metric                    | Target (end of first full semester)        | Measurement                                                                        |
| ------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------- |
| Registered ECE students   | ≥ 70 % of enrolled ECE students            | Users collection count vs enrolment CSV                                            |
| Weekly active students    | ≥ 40 % of registered during semester weeks | Distinct users with ≥ 1 run per week (server-side run-event ping, no code content) |
| Courses using assignments | ≥ 4 of 7 modules                           | LabAssignments grouped by course                                                   |

### 7.2 Product Quality

| Metric                              | Target                                           | Measurement                                     |
| ----------------------------------- | ------------------------------------------------ | ----------------------------------------------- |
| Time to first successful run (cold) | p75 ≤ 20 s                                       | Client timing event `engine_ready_ms`           |
| Time to first run (warm cache)      | p75 ≤ 5 s                                        | Same event, `cache=warm`                        |
| Run success rate (no engine crash)  | ≥ 99 %                                           | `run_completed` / `run_started`                 |
| Engine crash/OOM rate               | ≤ 0.5 % of runs                                  | Error tracking events (Batch 4 `MONITORING.md`) |
| Numerical correctness               | 100 % of experiments pass golden-reference tests | CI test suite                                   |

### 7.3 Learning and Faculty Outcomes

| Metric                                       | Target                     | Measurement                        |
| -------------------------------------------- | -------------------------- | ---------------------------------- |
| Student satisfaction (survey, 5-point scale) | ≥ 4.0                      | In-app survey at end of semester   |
| Faculty grading time reduction               | ≥ 30 % vs previous process | Faculty survey                     |
| Assignment on-time submission                | ≥ 85 %                     | Submission timestamps vs due dates |

### 7.4 Cost

| Metric                         | Target                                                          |
| ------------------------------ | --------------------------------------------------------------- |
| Monthly infrastructure bill    | ≤ free tier limits (Vercel + MongoDB Atlas M0), or ≤ ₹0 compute |
| Server CPU used for simulation | 0                                                               |

## 8. Roadmap Horizons

| Horizon             | Outcome                                                        |
| ------------------- | -------------------------------------------------------------- |
| H1 (months 0 to 3)  | MVP: Signals & Systems, Network Theory, workspace, saved work  |
| H2 (months 3 to 6)  | DSP, BEE, assignments, professor dashboard                     |
| H3 (months 6 to 9)  | DIP with OpenCV.js, admin tooling, analytics                   |
| H4 (months 9 to 12) | PG modules (ACS, SSP), plagiarism hints, performance hardening |

## 9. Out-of-Vision (explicitly not pursued)

- Replacing MATLAB/Simulink for research-grade or toolbox-dependent workloads.
- Circuit schematic capture and SPICE-level simulation (may be revisited post-H4).
- Hardware-in-the-loop (SDR, oscilloscope) integration.
