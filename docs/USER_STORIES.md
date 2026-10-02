# V-Lab ECE: User Stories

Format: **As a [role], I want to [action], so that [benefit].**
Priority uses MoSCoW (M/S/C). `AC` links to `ACCEPTANCE_CRITERIA.md`. `FR` links to `PRD.md`.

## 1. Student Stories (P-STU)

| ID       | Story                                                                                                                                         | Priority | FR                     | AC          |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------- | ----------- |
| US-S-001 | As a student, I want to register with my institute email, so that my work is tied to my identity.                                             | M        | FR-AUTH-01             | AC-AUTH-001 |
| US-S-002 | As a student, I want to log in and stay logged in during a lab session, so that I am not interrupted mid-experiment.                          | M        | FR-AUTH-04             | AC-AUTH-003 |
| US-S-003 | As a student, I want to browse experiments by course (SS, NT, DSP, DIP, BEE, ACS, SSP), so that I can find the lab I need.                    | M        | PRD §5                 | AC-CAT-001  |
| US-S-004 | As a student, I want to open an experiment with theory, objective, and starter code, so that I understand what to do before coding.           | M        | FR-WS-01               | AC-WS-001   |
| US-S-005 | As a student, I want to write Python in a code editor with syntax highlighting and shortcuts, so that I can code efficiently.                 | M        | FR-WS-02               | AC-WS-002   |
| US-S-006 | As a student, I want to press Run and see results without the page freezing, so that I can keep scrolling and editing while heavy maths runs. | M        | FR-ENG-01, NFR-PERF-02 | AC-ENG-002  |
| US-S-007 | As a student, I want to see console output as it prints, so that I can debug in real time.                                                    | M        | FR-WS-04               | AC-WS-004   |
| US-S-008 | As a student, I want errors to point to the exact line in my code, so that I can fix mistakes fast.                                           | M        | FR-WS-05               | AC-WS-005   |
| US-S-009 | As a student, I want to stop a long-running simulation, so that I can fix an infinite loop without reloading.                                 | M        | FR-ENG-03              | AC-ENG-004  |
| US-S-010 | As a student, I want my variables to persist between runs, so that I can work interactively like in MATLAB.                                   | M        | FR-ENG-05              | AC-ENG-005  |
| US-S-011 | As a student, I want to restart the kernel, so that I can clear all state.                                                                    | M        | FR-WS-03               | AC-ENG-006  |
| US-S-012 | As a student, I want to see a variable inspector with array shapes and types, so that I can understand my data.                               | S        | FR-WS-06               | AC-WS-006   |
| US-S-013 | As a student, I want sliders for experiment parameters (frequency, order, SNR), so that I can explore effects interactively.                  | S        | FR-WS-07               | AC-WS-007   |
| US-S-014 | As a student, I want zoomable, pannable waveforms with hover values, so that I can measure features precisely.                                | M        | FR-PLT-01              | AC-PLT-001  |
| US-S-015 | As a student, I want Bode, pole-zero, spectrogram, constellation, and eye plots, so that I can analyse systems the standard way.              | M        | FR-PLT-02 to 04        | AC-PLT-002  |
| US-S-016 | As a student, I want to view and process images with a pixel inspector, so that I can see exactly how filters change pixels.                  | M        | FR-PLT-06              | AC-DIP-001  |
| US-S-017 | As a student, I want to upload a CSV, WAV, or image, so that I can use my own data.                                                           | M        | FR-WS-10               | AC-WS-010   |
| US-S-018 | As a student, I want to download my code, plots, and data, so that I can include them in my lab report.                                       | M        | FR-WS-09               | AC-WS-009   |
| US-S-019 | As a student, I want my work autosaved locally, so that a crash or lost connection never loses code.                                          | M        | FR-SAVE-01             | AC-SAVE-001 |
| US-S-020 | As a student, I want to save named workspaces to my account, so that I can continue from any device.                                          | M        | FR-SAVE-02             | AC-SAVE-002 |
| US-S-021 | As a student, I want to see my pending assignments and due dates, so that I never miss a deadline.                                            | M        | FR-ASG-02              | AC-ASG-002  |
| US-S-022 | As a student, I want to submit my workspace for an assignment, so that my professor can grade it.                                             | M        | FR-ASG-03              | AC-ASG-003  |
| US-S-023 | As a student, I want to see my marks and feedback, so that I can learn from mistakes.                                                         | M        | FR-ASG-05              | AC-ASG-005  |
| US-S-024 | As a student, I want a clear loading indicator for the Python engine with real progress, so that I know the first load is working.            | S        | NFR-PERF-01            | AC-ENG-001  |
| US-S-025 | As a student, I want a dark mode and adjustable editor font size, so that I can work comfortably for long sessions.                           | S        | NFR-A11Y-01            | AC-UI-003   |
| US-S-026 | As a student, I want to use the lab on a tablet, so that I can review experiments away from my laptop.                                        | S        | RESPONSIVE             | AC-UI-004   |
| US-S-027 | As a student, I want to try public experiments without an account, so that I can evaluate the platform.                                       | S        | FR-AUTH-06             | AC-AUTH-006 |
| US-S-028 | As a student, I want a MATLAB-to-NumPy cheat sheet in each experiment, so that I can translate prior knowledge.                               | C        | PRD §10                | AC-CAT-004  |

## 2. Professor Stories (P-PROF)

| ID       | Story                                                                                                                                                                 | Priority | FR         | AC          |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------- | ----------- |
| US-P-001 | As a professor, I want to log in with a professor role, so that I can access instructor tools.                                                                        | M        | FR-AUTH-03 | AC-AUTH-004 |
| US-P-002 | As a professor, I want to create an assignment from an existing experiment with title, instructions, due date, and max marks, so that students know what is expected. | M        | FR-ASG-01  | AC-ASG-001  |
| US-P-003 | As a professor, I want to target an assignment at specific sections or batches, so that each group gets the right work.                                               | M        | FR-ASG-01  | AC-ASG-001  |
| US-P-004 | As a professor, I want to customise starter code and parameters for an assignment, so that I can vary difficulty.                                                     | S        | FR-ASG-01  | AC-ASG-006  |
| US-P-005 | As a professor, I want to see a table of all submissions with status and timestamps, so that I can track progress.                                                    | M        | FR-ASG-06  | AC-PROF-001 |
| US-P-006 | As a professor, I want to open a student's submission in a read-only workspace and re-run it in my browser, so that I can verify results are genuine.                 | M        | FR-ASG-04  | AC-ASG-004  |
| US-P-007 | As a professor, I want to assign marks and write feedback, so that students get actionable grading.                                                                   | M        | FR-ASG-05  | AC-ASG-005  |
| US-P-008 | As a professor, I want to see score distribution and submission rate charts, so that I can gauge class understanding.                                                 | S        | FR-ASG-06  | AC-PROF-002 |
| US-P-009 | As a professor, I want to export grades as CSV, so that I can enter them into the institute system.                                                                   | S        | FR-ASG-07  | AC-PROF-003 |
| US-P-010 | As a professor, I want similarity hints between submissions, so that I can spot copied code.                                                                          | C        | FR-ASG-08  | AC-ASG-008  |
| US-P-011 | As a professor, I want to extend a deadline for a student, so that I can handle exceptions.                                                                           | S        | FR-ASG-01  | AC-ASG-007  |
| US-P-012 | As a professor, I want to preview any experiment exactly as students see it, so that I can verify instructions before assigning.                                      | M        | FR-WS-01   | AC-WS-001   |

## 3. Administrator Stories (P-ADM)

| ID       | Story                                                                                                                | Priority | FR                | AC         |
| -------- | -------------------------------------------------------------------------------------------------------------------- | -------- | ----------------- | ---------- |
| US-A-001 | As an admin, I want to create, edit, and deactivate users, so that access reflects current enrolment.                | M        | FR-ADM-01         | AC-ADM-001 |
| US-A-002 | As an admin, I want to assign roles (student, professor, admin), so that permissions are correct.                    | M        | FR-ADM-01         | AC-ADM-002 |
| US-A-003 | As an admin, I want to bulk import students from a CSV, so that onboarding a batch takes minutes.                    | S        | FR-ADM-02         | AC-ADM-003 |
| US-A-004 | As an admin, I want to manage courses and sections and assign professors, so that assignments route correctly.       | M        | FR-ADM-03         | AC-ADM-004 |
| US-A-005 | As an admin, I want an audit log of privileged actions, so that changes are traceable.                               | S        | FR-ADM-04         | AC-ADM-005 |
| US-A-006 | As an admin, I want to enable or disable experiments per course, so that unreleased labs stay hidden.                | S        | PRD §5            | AC-ADM-006 |
| US-A-007 | As an admin, I want to see platform usage statistics (active users, runs, errors), so that I can report on adoption. | S        | PRODUCT_VISION §7 | AC-ADM-007 |
| US-A-008 | As an admin, I want to delete a student's data on request, so that privacy obligations are met.                      | M        | NFR-PRIV-01       | AC-ADM-008 |

## 4. Cross-Cutting Technical Stories (for the agent)

| ID       | Story                                                                                                                               | Priority | AC         |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------- |
| US-T-001 | As the system, I want all numeric computation to execute in a Web Worker, so that the main thread stays responsive.                 | M        | AC-ENG-002 |
| US-T-002 | As the system, I want Pyodide assets served from our origin and cached, so that a third-party outage cannot break the lab.          | M        | AC-ENG-007 |
| US-T-003 | As the system, I want every experiment verified against golden reference output in CI, so that numerical correctness is guaranteed. | M        | AC-NUM-001 |
| US-T-004 | As the system, I want a typed message protocol between UI and worker, so that integration errors are caught at compile time.        | M        | AC-ENG-008 |
| US-T-005 | As the system, I want resource limits (time, memory, output size) enforced, so that a bad program cannot crash the tab silently.    | M        | AC-ENG-009 |

## 5. Story-to-Release Mapping

| Release  | Stories                                                                              |
| -------- | ------------------------------------------------------------------------------------ |
| M1 (MVP) | US-S-001 to 011, 014, 015, 017 to 020, 024, 027; US-A-001, 002, 004; US-T-001 to 005 |
| M2       | US-S-012, 013, 021 to 023, 025; US-P-001 to 009, 011, 012                            |
| M3       | US-S-016, 026; US-A-003, 005 to 008                                                  |
| M4       | US-S-028; US-P-010                                                                   |
