# V-Lab ECE: Test Plan (FFT and Convolution Focus)

Scope: heavy client-side numerics (FFT, convolution) executed by Pyodide inside the Web Worker. Related ACs: AC-NUM-002..007, AC-NUM-013, AC-ENG-002, AC-ENG-004, AC-ENG-009, AC-PERF-003/004. Tools and harness: `TEST_STRATEGY.md`.

## 1. Conventions

- **Tolerance helper:** `relL2(a, b) = ||a - b||₂ / max(||b||₂, 1e-300)`. Complex arrays compare the complex L2 norm. Default per AC-NUM-013: `rtol = 1e-9`, `atol = 1e-12`; tighter values below are mandatory.
- **Seeds:** `np.random.default_rng(42)` unless stated. Seed is in the test case ID's manifest.
- **Dtypes:** float64/complex128 unless stated.
- **Layers:** `E` = engine test (Pyodide in Node, correctness), `B` = browser Cypress (worker path, timing, UI), `P` = performance (browser, `@perf`).
- Test titles start with the AC ID; case IDs `TC-FFT-nnn` / `TC-CONV-nnn` appear in the title suffix.

## 2. Golden Data Generation (desktop, offline)

`packages/experiments/tools/gen_golden.py` (excerpt; extend per case):

```python
"""Generate golden arrays for FFT and convolution test cases.
Run: python gen_golden.py --out ../../../tests/golden
Requires numpy/scipy versions equal to tests/golden/ENGINE_VERSIONS.json."""
import argparse, json, pathlib
import numpy as np
from scipy import signal

def case_fft_random(out: pathlib.Path) -> None:
    rng = np.random.default_rng(42)
    for log2n in (14, 20):
        n = 2 ** log2n
        x = rng.standard_normal(n) + 1j * rng.standard_normal(n)
        d = out / f"fft_random_2e{log2n}"; d.mkdir(parents=True, exist_ok=True)
        np.save(d / "x.npy", x); np.save(d / "X.npy", np.fft.fft(x))
        (d / "manifest.json").write_text(json.dumps({"seed": 42, "n": n, "rtol_l2": 1e-12 if log2n == 14 else 1e-11}))

def case_conv_long(out: pathlib.Path) -> None:
    rng = np.random.default_rng(7)
    x = rng.standard_normal(100_000); h = rng.standard_normal(1_000)
    d = out / "conv_100k_1k"; d.mkdir(parents=True, exist_ok=True)
    np.save(d / "x.npy", x); np.save(d / "h.npy", h)
    np.save(d / "y.npy", np.convolve(x, h))           # direct reference
    (d / "manifest.json").write_text(json.dumps({"seed": 7, "rtol_l2": 1e-9}))

# ... remaining cases follow the same pattern (see table in sections 3 and 4)
if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--out", required=True)
    out = pathlib.Path(ap.parse_args().out)
    case_fft_random(out); case_conv_long(out)
    (out / "VERSIONS.json").write_text(json.dumps({"numpy": np.__version__, "scipy": __import__("scipy").__version__}))
```

Storage budget: the 2^20 complex vectors are 16 MB each (`x` and `X`); store the 2^20 case as float32-compressed `.npz`? **No**: keep exactness; instead store only `seed` and `X` checksums plus a **reduced check set** (first 4,096 bins, last 4,096 bins, and 4,096 pseudo-random bin indices from a seeded generator) and regenerate `x` in Pyodide with the same seed algorithm (`default_rng(42)` is stable across platforms for the same NumPy generation method). This keeps the repository small. If NumPy's `default_rng` stream changed between desktop and Pyodide versions the `engine-pin-check` job already fails.

## 3. FFT Test Cases

### 3.1 Correctness (layer E)

| ID         | Test                                   | Input                                                        | Expected                                                                            | Tolerance     | AC                         |
| ---------- | -------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ------------- | -------------------------- | -------- | -------------------- | --------- | ---------- |
| TC-FFT-001 | Impulse                                | `x = [1,0,...,0]`, N=1024                                    | `X[k] = 1` for all k                                                                | abs 1e-12     | AC-NUM-013                 |
| TC-FFT-002 | DC                                     | `x = ones(1024)`                                             | `X[0]=1024`, others 0                                                               | abs 1e-9      | AC-NUM-013                 |
| TC-FFT-003 | Single tone                            | `cos(2π·50n/1024)`                                           | `                                                                                   | X[50]         | =                          | X[974]   | =512`, others ≤ 1e-9 | abs 1e-9  | AC-NUM-005 |
| TC-FFT-004 | Golden random 2^14                     | seed 42 complex                                              | matches golden `X`                                                                  | relL2 ≤ 1e-12 | AC-NUM-002                 |
| TC-FFT-005 | Golden random 2^20 (reduced check set) | seed 42                                                      | matches golden bins                                                                 | relL2 ≤ 1e-11 | AC-NUM-003                 |
| TC-FFT-006 | Parseval                               | random real N=4096                                           | `Σ                                                                                  | x             | ² = (1/N)Σ                 | X        | ²`                   | rel 1e-12 | AC-NUM-006 |
| TC-FFT-007 | Linearity                              | `a·x + b·y` with a=2.5, b=−1.25                              | `a·X + b·Y`                                                                         | relL2 1e-12   | AC-NUM-013                 |
| TC-FFT-008 | Circular time shift                    | shift by m=17                                                | `X·exp(-j2πkm/N)`                                                                   | relL2 1e-12   | AC-NUM-013                 |
| TC-FFT-009 | Conjugate symmetry (real input)        | real random N=2048                                           | `X[k] = conj(X[N-k])`                                                               | abs 1e-12     | AC-NUM-013                 |
| TC-FFT-010 | Round trip                             | `ifft(fft(x))` complex N=8192                                | equals x                                                                            | relL2 1e-13   | AC-NUM-013                 |
| TC-FFT-011 | Non-power-of-two                       | N=1000                                                       | matches golden                                                                      | relL2 1e-12   | AC-NUM-013                 |
| TC-FFT-012 | Prime length                           | N=1009                                                       | matches golden                                                                      | relL2 1e-12   | AC-NUM-013                 |
| TC-FFT-013 | Length 1 and empty                     | `fft([5])`, `fft([])`                                        | `[5]`; `[]` raises `ValueError` ("Invalid number of FFT data points (0)")           | exact         | AC-ENG-009 (error mapping) |
| TC-FFT-014 | NaN/Inf propagation                    | one NaN at index 3                                           | all bins NaN                                                                        | structural    | AC-NUM-013                 |
| TC-FFT-015 | `rfft` vs `fft`                        | real N=4096                                                  | `rfft = fft[:N//2+1]`                                                               | relL2 1e-13   | AC-NUM-013                 |
| TC-FFT-016 | `scipy.fft` vs `numpy.fft`             | complex N=2^12                                               | equal                                                                               | relL2 1e-13   | AC-NUM-013                 |
| TC-FFT-017 | Windowing coherent gain                | Hann window, tone at bin 50                                  | `                                                                                   | X[50]         | ≈ 0.5·N/2·A`, within 1 %   | rel 1e-2 | DSP-01               |
| TC-FFT-018 | Zero padding interpolation             | N=64 padded to 1024                                          | same spectrum envelope: peak location error ≤ 0.5 bin of the unpadded grid          | structural    | DSP-01                     |
| TC-FFT-019 | 2D FFT golden                          | 256×256 seed 3                                               | matches golden                                                                      | relL2 1e-12   | AC-NUM-013                 |
| TC-FFT-020 | 2D separability                        | 128×128                                                      | `fft2 = fft(fft(x,axis=0),axis=1)`                                                  | relL2 1e-13   | AC-NUM-013                 |
| TC-FFT-021 | Determinism                            | same input run twice in one session and after kernel restart | bitwise identical outputs                                                           | exact         | AC-NUM-012                 |
| TC-FFT-022 | float32 input                          | float32 random                                               | result dtype complex64 (NumPy 2 behaviour) and relL2 vs complex128 reference ≤ 1e-5 | 1e-5          | AC-NUM-013                 |

### 3.2 Worker and UI path (layer B)

| ID         | Test                                                 | Steps                                                                    | Expected                                                                                   | AC                    |
| ---------- | ---------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | --------------------- |
| TC-FFT-101 | End-to-end FFT experiment                            | Open DSP-01, run starter code                                            | Plot appears; console prints "Run finished"; no error markers                              | AC-WS-004, AC-PLT-001 |
| TC-FFT-102 | Non-blocking during large FFT                        | Run loop of 20 FFTs of 2^18                                              | No main-thread long task > 100 ms; Stop button clickable during run                        | AC-ENG-002            |
| TC-FFT-103 | Spectrum plot values                                 | `vlab.plot(f, 20*np.log10(abs(X)))` for the tone                         | Hover at 50/1024·fs shows ≈ expected dB (±0.1 dB)                                          | AC-PLT-001            |
| TC-FFT-104 | Limit: huge array                                    | `np.zeros(30_000_000)` then FFT                                          | `E_LIMIT_ARRAY` shown in Problems, kernel stays alive, variable removed                    | AC-ENG-009            |
| TC-FFT-105 | Cancel during FFT loop (fallback path under Cypress) | Run loop of FFTs; click Stop                                             | State returns to Ready after respawn (≤ 15 s cold / 6 s cached); notice about kernel reset | AC-ENG-004            |
| TC-FFT-106 | Timeout                                              | `RUN_TIMEOUT_MS` overridden to 2000 via test hook; run infinite FFT loop | `E_LIMIT_TIMEOUT` system message; worker respawned                                         | AC-ENG-009            |

### 3.3 Performance (layer P, median of 5 after 1 warm-up)

| ID         | Case                                                                                         | Budget     | AC                         |
| ---------- | -------------------------------------------------------------------------------------------- | ---------- | -------------------------- |
| TC-FFT-201 | FFT 2^14 complex                                                                             | ≤ 50 ms    | SCOPE §5                   |
| TC-FFT-202 | FFT 2^20 complex (includes `np.fft.fft` only, input pre-generated)                           | ≤ 3,000 ms | AC-NUM-003                 |
| TC-FFT-203 | `fft2` 1024×1024                                                                             | ≤ 1,500 ms | SCOPE §5                   |
| TC-FFT-204 | Spectrogram, 10 s at 16 kHz                                                                  | ≤ 1,000 ms | SCOPE §5                   |
| TC-FFT-205 | Warm engine start (cached)                                                                   | ≤ 4,000 ms | AC-ENG-010                 |
| TC-FFT-206 | Memory: 2^20 complex FFT twice in a row; worker heap after second run ≤ `MAX_WORKER_HEAP_MB` | pass/fail  | AC-PERF-004 (manual in QA) |

Timing code runs **inside Python** with `time.perf_counter()` around the call only, and the Cypress spec reads the printed value, so UI latency does not pollute the measurement. A second measurement (end-to-end Run to RUN_COMPLETED) is recorded for information.

## 4. Convolution Test Cases

### 4.1 Correctness (layer E)

| ID          | Test                            | Input                                       | Expected                                                                | Tolerance    | AC         |
| ----------- | ------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------- | ------------ | ---------- |
| TC-CONV-001 | Known small                     | `x=[1,2,3]`, `h=[0,1,0.5]`                  | `[0,1,2.5,4,1.5]`                                                       | exact        | AC-NUM-013 |
| TC-CONV-002 | Identity                        | `h=[1]`, random x                           | `y = x`                                                                 | exact        | AC-NUM-013 |
| TC-CONV-003 | Delta shift                     | `h = δ[n-5]`                                | `y[n] = x[n-5]`                                                         | exact        | AC-NUM-013 |
| TC-CONV-004 | Output length                   | lengths N and M                             | `N+M-1`; `same` → `max(N,M)`; `valid` → `max(N,M)-min(N,M)+1`           | exact        | AC-NUM-013 |
| TC-CONV-005 | Commutativity                   | random x,h (N=500, M=60)                    | `x*h = h*x`                                                             | relL2 1e-12  | AC-NUM-013 |
| TC-CONV-006 | Associativity                   | x,h,g lengths 300/40/20                     | `(x*h)*g = x*(h*g)`                                                     | relL2 1e-11  | AC-NUM-013 |
| TC-CONV-007 | Linearity                       | `(ax+by)*h`                                 | `a(x*h)+b(y*h)`                                                         | relL2 1e-12  | AC-NUM-013 |
| TC-CONV-008 | Golden long                     | 100,000 × 1,000 seed 7                      | `fftconvolve` equals golden direct `y`                                  | relL2 ≤ 1e-9 | AC-NUM-004 |
| TC-CONV-009 | fftconvolve vs direct           | 20,000 × 2,000                              | equal                                                                   | relL2 ≤ 1e-9 | AC-NUM-004 |
| TC-CONV-010 | Convolution theorem             | circular, N=512                             | `ifft(fft(x)·fft(h)) = circ_conv(x,h)`                                  | abs ≤ 1e-10  | AC-NUM-007 |
| TC-CONV-011 | Linear via zero-padded FFT      | N=1000, M=300, pad to 2048                  | equals `np.convolve`                                                    | relL2 1e-11  | AC-NUM-013 |
| TC-CONV-012 | Overlap-add                     | block 4096 over 100,000 samples, h of 1,000 | equals direct                                                           | relL2 1e-9   | DSP-02     |
| TC-CONV-013 | Overlap-save                    | same                                        | equals direct                                                           | relL2 1e-9   | DSP-02     |
| TC-CONV-014 | Complex inputs                  | complex x,h                                 | equals direct complex                                                   | relL2 1e-12  | AC-NUM-013 |
| TC-CONV-015 | 2D convolution                  | 256×256 image, 5×5 kernel                   | `convolve2d(mode="same")` = `fftconvolve(...,"same")` (boundary `fill`) | relL2 1e-10  | DIP-03     |
| TC-CONV-016 | Empty input                     | `np.convolve([], [1])`                      | `ValueError` mapped to `E_RUNTIME`, message preserved                   | exact        | AC-ENG-009 |
| TC-CONV-017 | Length-1 operands               | `[3]*[4]`                                   | `[12]`                                                                  | exact        | AC-NUM-013 |
| TC-CONV-018 | Moving average impulse response | `h = ones(5)/5` on unit step                | ramp then plateau at 1 after 5 samples                                  | abs 1e-12    | SS-02      |
| TC-CONV-019 | LTI system output vs `lfilter`  | FIR `b`, `a=[1]`                            | `lfilter(b,[1],x) = convolve(x,b)[:N]`                                  | relL2 1e-12  | AC-NUM-013 |
| TC-CONV-020 | Determinism                     | repeated runs                               | bitwise identical                                                       | exact        | AC-NUM-012 |

### 4.2 Worker and UI path (layer B)

| ID          | Test                                     | Steps                                               | Expected                                                                                         | AC         |
| ----------- | ---------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------- |
| TC-CONV-101 | SS-02 end-to-end                         | Open SS-02, run                                     | Three plots (input, impulse response, output) with correct trace counts; console shows no errors | AC-PLT-001 |
| TC-CONV-102 | Long direct convolution stays responsive | `np.convolve` 20,000×2,000                          | No long task > 100 ms on main thread; Stop disabled only in Ready state                          | AC-ENG-002 |
| TC-CONV-103 | Parameter change re-run                  | Move slider for `M` with Live on                    | Single re-run after 300 ms debounce; no overlapping runs (`runId` monotonic)                     | AC-WS-007  |
| TC-CONV-104 | Large output downsampling                | Plot `y` of 101,000 points                          | Rendered trace ≤ 50,000 points, first and last preserved; zoom requests full resolution          | AC-PLT-004 |
| TC-CONV-105 | Error line mapping                       | Mismatched dimension in `convolve2d` call on line 7 | Marker on line 7, Problems entry with `ValueError`                                               | AC-WS-005  |

### 4.3 Performance (layer P)

| ID          | Case                                                       | Budget                                          | AC         |
| ----------- | ---------------------------------------------------------- | ----------------------------------------------- | ---------- |
| TC-CONV-201 | `fftconvolve` 100,000×1,000                                | ≤ 2,000 ms                                      | AC-NUM-004 |
| TC-CONV-202 | `np.convolve` 20,000×2,000                                 | ≤ 2,500 ms                                      | SCOPE §5   |
| TC-CONV-203 | `convolve2d` 512×512 with 7×7 kernel                       | ≤ 1,500 ms (informational in M2, gated from M3) | DIP-03     |
| TC-CONV-204 | Overlap-add loop 100,000 samples (Python loop over blocks) | ≤ 1,500 ms                                      | DSP-02     |

## 5. Test Code Templates

### 5.1 Engine test (Jest, Pyodide in Node)

```ts
import { loadEngine } from "../helpers/engine";
import { loadGoldenArray, relL2 } from "../helpers/golden";

describe("FFT", () => {
  it("AC-NUM-002: TC-FFT-004 golden random 2^14 within relL2 1e-12", async () => {
    const py = await loadEngine();
    const x = await loadGoldenArray("fft_random_2e14/x.npy"); // Float64Array interleaved re,im
    const expected = await loadGoldenArray("fft_random_2e14/X.npy");
    py.FS.writeFile("/tmp/x.npy", x.bytes);
    const out = await py.runPythonAsync(`
import numpy as np
x = np.load('/tmp/x.npy')
np.fft.fft(x).view(np.float64).tolist()
`);
    expect(relL2(Float64Array.from(out.toJs()), expected.data)).toBeLessThanOrEqual(1e-12);
  });

  it("AC-NUM-005: TC-FFT-003 single tone bins", async () => {
    const py = await loadEngine();
    const r = await py.runPythonAsync(`
import numpy as np
n = np.arange(1024); X = np.fft.fft(np.cos(2*np.pi*50*n/1024))
mask = np.ones(1024, bool); mask[[50, 974]] = False
[abs(X[50]), abs(X[974]), float(np.max(abs(X[mask])))]
`);
    const [a, b, rest] = r.toJs() as number[];
    expect(Math.abs(a - 512)).toBeLessThan(1e-9);
    expect(Math.abs(b - 512)).toBeLessThan(1e-9);
    expect(rest).toBeLessThan(1e-9);
  });
});
```

(`loadGoldenArray` parses `.npy` headers or, simpler, tests load `.npy` inside Pyodide and return summaries; the agent chooses the simpler path but must keep tolerances.)

### 5.2 Cypress performance spec

```ts
describe("FFT performance @perf", () => {
  it("AC-NUM-003: TC-FFT-202 FFT of 2^20 completes in <= 3000 ms (median of 5)", () => {
    cy.visit("/lab/DSP-01");
    cy.waitForEngine();
    const samples: number[] = [];
    const code = `
import numpy as np, time
x = np.random.default_rng(42).standard_normal(2**20) + 0j
t = time.perf_counter(); X = np.fft.fft(x); dt = (time.perf_counter() - t) * 1000
print(f"__PERF__ fft2e20 {dt:.1f}")`;
    cy.setCode(code);
    for (let i = 0; i < 6; i++) {
      // 1 warm-up + 5 measured
      cy.runCode();
      cy.consoleText().then((t) => {
        const m = /__PERF__ fft2e20 ([0-9.]+)/.exec(t);
        if (i > 0 && m?.[1]) {
          samples.push(Number(m[1]));
        }
      });
    }
    cy.then(() => {
      const median = [...samples].sort((a, b) => a - b)[2] ?? Infinity;
      cy.task("recordPerf", { id: "TC-FFT-202", samples, median });
      expect(median, "median ms").to.be.at.most(
        3000 * Number(Cypress.env("CI_TIMING_FACTOR") ?? 1),
      );
    });
  });
});
```

### 5.3 Non-blocking main thread spec

```ts
it("AC-ENG-002: TC-FFT-102 main thread has no long task > 100 ms during heavy compute", () => {
  cy.visit("/lab/DSP-01", {
    onBeforeLoad: (win) => {
      (win as any).__longTasks = []; // eslint-disable-line -- test hook typing (#ENG-TEST)
      new win.PerformanceObserver((l) =>
        l.getEntries().forEach((e) => (win as any).__longTasks.push(e.duration)),
      ).observe({ type: "longtask", buffered: true });
    },
  });
  cy.waitForEngine();
  cy.setCode("import numpy as np\nfor _ in range(20):\n    np.fft.fft(np.random.rand(2**18))\n");
  cy.runCode();
  cy.longTasks().then((d) => expect(Math.max(0, ...d)).to.be.lessThan(100));
});
```

## 6. Milestone Mapping of Suites

| Milestone | Suites required green                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------------------------ |
| M1        | TC-FFT-001..022, 101..106, 201..205; TC-CONV-001..011, 014, 016..020, 101..105, 201, 202                           |
| M2        | TC-CONV-012, 013, 204 (DSP-02 experiment); full re-run of M1                                                       |
| M3        | TC-CONV-015, 203 gated (DIP); TC-FFT-019, 020, 203                                                                 |
| M4        | Monte Carlo and PSD cases extend this plan (AC-NUM-009, 010, 011) in `TEST_PLAN_PG.md` (new file created in T-078) |

## 7. Failure Triage Rules

1. **Golden mismatch beyond tolerance:** Sev 2. First check `ENGINE_VERSIONS.json` against the lockfile; second check the seed algorithm; only then investigate the experiment code. Never loosen a tolerance without recording the numerical justification in the test header.
2. **Timing miss:** re-run on the reference machine; if reproducible, file a performance bug with the 5 raw samples; do not raise budgets without owner approval and an update to `SCOPE.md` §5 and the AC in one commit.
3. **UI-path failure with passing engine test:** suspect protocol marshalling (typed array transfer, `runId` handling).
4. **Engine boot failure in E2E:** capture the browser console and `ENGINE_ERROR` payload as artefacts.
