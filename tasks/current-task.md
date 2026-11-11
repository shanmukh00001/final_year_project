# Completed: T-01 through T-07 — IIT Kharagpur Virtual Lab & Circuit Maker Migration

## Verification Summary

- All 51 previous curriculum experiments archived in `archive/legacy-curriculum/`.
- IIT Kharagpur Virtual Labs & experiment analysis documented in `docs/IIT_KGP_VLAB_ANALYSIS.md`.
- 4 crisp circuit/apparatus diagrams saved under `apps/web/public/images/`:
  - `rlc-circuit-setup.jpg`
  - `ohms-law-bench.jpg`
  - `thevenin-equivalent.jpg`
  - `superposition-circuit.jpg`
- Curriculum scoped to 4 active experiments (`NT-01`, `BEE-01`, `NT-02`, `NT-03`) with extended IIT KGP sections (`Aim`, `Theory`, `Pretest`, `Procedure`, `Simulation`, `Posttest`, `References`) and deep explanations for R-L-C and Ohm's Law.
- Code editor & `.py` export hidden in student workspace; replaced with interactive SVG Circuit Maker (`CircuitMakerPane`), full user value controls (`Explorer` + inline component bar), live digital meters & clear calculations (`SimulationResultsPane`), observation table with CSV export & 5-point auto-sweep, waveform/V-I/resonance plots, and live `PhasorDiagramSvg`.
- All verification gates passing (`typecheck`, `eslint --max-warnings 0`, `prettier --check .`, `jest` 12/12 suites & 57/57 tests, `build`, `check:bundle-size`, `check:deploy-size`, `check:forbidden-patterns`, `check:no-code-eval-routes`, `check:no-test-hooks`, `check:vercel-json`, `validate-experiments.ts`).
