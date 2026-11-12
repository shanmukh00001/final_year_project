# Autonomous Development Backlog — IIT Kharagpur Virtual Lab Circuit Simulator

## Project Goal

Transform the V-Lab ECE application to match the IIT Kharagpur Virtual Labs (`https://www.vlab.co.in/participating-institute-iit-kharagpur`) simulation-first circuit laboratory model:

- Archive all 51 previous code-centric experiments safely in `archive/legacy-curriculum/`.
- Provide a thorough analysis of the IIT Kharagpur Virtual Labs portal & experiment structure (`docs/IIT_KGP_VLAB_ANALYSIS.md`).
- Narrow active catalog to **4 experiments only**, featuring:
  1. `NT-01`: **R-L-C Circuit Analysis** (IIT KGP Analog Signals, Network and Measurement Virtual Lab — Series R-L-C circuit behavior, phasor analysis, resonance, power factor)
  2. `BEE-01`: **Ohm's Law & V-I Characteristics** (Clear step-by-step explanation, Single/Series/Parallel/Non-Ohmic modes, user-set values, V-I curve)
  3. `NT-02`: **Verification of Thevenin's Theorem** (IIT KGP ASNM Lab)
  4. `NT-03`: **Verification of Superposition Theorem** (IIT KGP ASNM Lab)
- **Hide the Python/Monaco code editor** from the student workspace; replace it with an interactive **Circuit Maker & Simulator** where users wire/verify circuits, set ALL component/source values themselves, simulate in real time, inspect virtual meters, record observation tables, and analyze plots/phasor diagrams.
- Integrate appropriate educational images and IIT KGP Virtual Lab pedagogical tabs (Aim, Theory, Pretest, Procedure, Simulation, Posttest, References).

---

## Backlog Tasks

| Task ID | Title                                                                                                                                                                                                                  | Status | Dependencies     |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------- |
| T-01    | Analyze IIT KGP VLab link & archive all 51 previous experiments + legacy data                                                                                                                                          | DONE   | None             |
| T-02    | Generate & integrate appropriate circuit/apparatus images (`apps/web/public/images/`)                                                                                                                                  | DONE   | None             |
| T-03    | Extend shared schemas & build deterministic Circuit Solver Engine (`circuitSolver.ts`) for RLC, Ohm's Law, Thevenin, Superposition                                                                                     | DONE   | T-01             |
| T-04    | Create 4-experiment IIT KGP curriculum definitions (Aim, Theory, Pretest, Procedure, Circuit Template, Posttest, References) with deep explanations for RLC & Ohm's Law                                                | DONE   | T-01, T-02, T-03 |
| T-05    | Build Interactive Circuit Maker & Simulator UI (wiring canvas, component palette, user value controls, Check Connections, Virtual Meters, Observation Table, Phasor Diagram, VLab pedagogical tabs) & hide code editor | DONE   | T-03, T-04       |
| T-06    | Update WorkspaceStore, Catalog (4 experiments only), TopBar, StatusBar, PlotPane, and tests; preserve compatibility with backend/CI checks                                                                             | DONE   | T-05             |
| T-07    | Full Verification (`typecheck`, `lint`, `prettier`, `jest`, `build`, bundle checks) & Independent Code/Security/Quality Review                                                                                         | DONE   | T-06             |
