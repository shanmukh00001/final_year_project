# Archived Legacy Data (Pre-IIT KGP Circuit Maker Redesign)

This directory safely preserves all previous V-Lab ECE curriculum data and reference artifacts prior to transforming the active application into the **4-Experiment IIT Kharagpur Virtual Lab Circuit Maker & Simulator**.

## Contents
- `modules/` — Original TypeScript curriculum definitions for all 7 courses (`ss.ts`, `nt.ts`, `dsp.ts`, `dip.ts`, `bee.ts`, `acs.ts`, `ssp.ts`, and `index.ts`).
- `previous-51-experiments.json` — Complete validated JSON export of all **51** previous UG/PG experiments (`SS`, `NT`, `DSP`, `DIP`, `BEE`, `ACS`, `SSP`), including `starterCode`, `theory`, `parameters`, `expectedOutputs`, and `matlabNotes`.

## Notes on Hidden/Preserved Workspace Components
- The Pyodide Web Worker (`apps/web/src/engine/`) and Monaco Python code editor (`apps/web/src/components/workspace/MonacoCodeEditor.tsx`) remain preserved in the repository for reference and backend/API compatibility, while hidden from the active student simulation UI per the requirement to show only the visual Circuit Maker & user-editable simulation controls.

