import { buildBlueprint } from "../src/engine/circuitBlueprints.js";
import { simulateCircuit } from "../src/engine/circuitSolver.js";

describe("IIT (ISM) Dhanbad Circuit Solver & Connection Topology Verification", () => {
  test("NT-01 Series RLC: verifies inductive, capacitive, and resonant regimes with simple resonance curve", () => {
    const bp = buildBlueprint("NT-01", "RLC");

    // 1. Capacitive regime (L = 100 mH, C = 20 uF, f = 50 Hz -> XC > XL)
    const capRes = simulateCircuit(
      "NT-01",
      { mode: "RLC", Vs: 230, f: 50, R: 40, L: 100, C: 20 },
      bp.components,
      bp.defaultWires,
      [],
    );
    expect(capRes.energized).toBe(true);
    expect(capRes.regimeTone).toBe("capacitive");
    expect(capRes.figures.length).toBe(1);
    expect(capRes.figures[0]?.id).toBe("rlc_resonance");
    expect(capRes.phasors.length).toBe(0);
    const vrCap = Number(capRes.meters.find((m) => m.id === "VR")?.value);
    const vlCap = Number(capRes.meters.find((m) => m.id === "VL")?.value);
    const vcCap = Number(capRes.meters.find((m) => m.id === "VC")?.value);
    expect(Math.hypot(vrCap, vlCap - vcCap)).toBeCloseTo(230, 0);

    // 2. Inductive regime (L = 400 mH, C = 150 uF, f = 50 Hz -> XL > XC)
    const indRes = simulateCircuit(
      "NT-01",
      { mode: "RLC", Vs: 230, f: 50, R: 40, L: 400, C: 150 },
      bp.components,
      bp.defaultWires,
      [],
    );
    expect(indRes.regimeTone).toBe("inductive");

    // 3. Series Resonance f0 = 1 / (2*pi*sqrt(0.15 * 35e-6)) ≈ 69.46 Hz
    const f0 = 1 / (2 * Math.PI * Math.sqrt(0.15 * 35e-6));
    const resRes = simulateCircuit(
      "NT-01",
      { mode: "RLC", Vs: 200, f: f0, R: 50, L: 150, C: 35 },
      bp.components,
      bp.defaultWires,
      [],
    );
    expect(resRes.regimeTone).toBe("resonant");
    const current = Number(resRes.meters.find((m) => m.id === "I")?.value);
    expect(current).toBeCloseTo(200 / 50, 2);
    expect(Number(resRes.meters.find((m) => m.id === "VR")?.value)).toBeCloseTo(200, 1);
    expect(Number(resRes.meters.find((m) => m.id === "VL")?.value)).toBeCloseTo(
      Number(resRes.meters.find((m) => m.id === "VC")?.value),
      1,
    );

    const resFig = resRes.figures[0];
    expect(resFig?.layout?.xRange?.[0]).toBe(0);
    expect(resFig?.layout?.shapes?.some((s) => s.type === "vline")).toBe(true);
    expect(resFig?.layout?.shapes?.some((s) => s.type === "hline")).toBe(true);
    const curveTrace = resFig?.traces[0];
    const peakCurveI = Math.max(...Array.from(curveTrace?.y ?? []));
    expect(peakCurveI).toBeCloseTo(200 / 50, 2);
    const selectedTrace = resFig?.traces[1];
    expect(selectedTrace?.mode).toBe("markers");
    expect(selectedTrace?.x?.[0]).toBeCloseTo(f0, 2);
    expect(selectedTrace?.y?.[0]).toBeCloseTo(200 / 50, 2);

    // 0.5 Hz slider step near resonance (69.5 Hz) is also detected cleanly
    const stepRes = simulateCircuit(
      "NT-01",
      { mode: "RLC", Vs: 200, f: 69.5, R: 50, L: 150, C: 35 },
      bp.components,
      bp.defaultWires,
      [],
    );
    expect(stepRes.regimeTone).toBe("resonant");
  });

  test("BEE-01 Ohm's Law: Single, Series, Parallel linear modes and Non-Ohmic Diode mode", () => {
    // Single mode
    const bpSingle = buildBlueprint("BEE-01", "single");
    const rSingle = simulateCircuit(
      "BEE-01",
      { mode: "single", Vdc: 12, R1: 120, R2: 150, switchClosed: true },
      bpSingle.components,
      bpSingle.defaultWires,
      [],
    );
    expect(rSingle.energized).toBe(true);
    expect(rSingle.regimeTone).toBe("ohmic");
    expect(Number(rSingle.meters.find((m) => m.id === "I")?.value)).toBeCloseTo(100, 1);

    // Series mode: Req = 100 + 200 = 300 Ohm, V = 15V -> I = 50 mA
    const bpSeries = buildBlueprint("BEE-01", "series");
    const rSeries = simulateCircuit(
      "BEE-01",
      { mode: "series", Vdc: 15, R1: 100, R2: 200, switchClosed: true },
      bpSeries.components,
      bpSeries.defaultWires,
      [],
    );
    expect(Number(rSeries.meters.find((m) => m.id === "Req")?.value)).toBeCloseTo(300, 1);
    expect(Number(rSeries.meters.find((m) => m.id === "I")?.value)).toBeCloseTo(50, 1);

    // Parallel mode: Req = 100 || 100 = 50 Ohm, V = 10V -> I = 200 mA
    const bpParallel = buildBlueprint("BEE-01", "parallel");
    const rParallel = simulateCircuit(
      "BEE-01",
      { mode: "parallel", Vdc: 10, R1: 100, R2: 100, switchClosed: true },
      bpParallel.components,
      bpParallel.defaultWires,
      [],
    );
    expect(Number(rParallel.meters.find((m) => m.id === "Req")?.value)).toBeCloseTo(50, 1);
    expect(Number(rParallel.meters.find((m) => m.id === "I")?.value)).toBeCloseTo(200, 1);

    // Diode mode
    const bpDiode = buildBlueprint("BEE-01", "diode");
    const rDiode = simulateCircuit(
      "BEE-01",
      { mode: "diode", Vdc: 5, R1: 100, R2: 150, switchClosed: true },
      bpDiode.components,
      bpDiode.defaultWires,
      [],
    );
    expect(rDiode.regimeTone).toBe("non_ohmic");
    expect(Number(rDiode.meters.find((m) => m.id === "V")?.value)).toBeLessThan(1.2);
  });

  test("ELC-01 RC Low-Pass Filter: matches cutoff frequency fc, -3dB gain, phase lag, and extreme range stability", () => {
    const bp = buildBlueprint("ELC-01", "rc");
    const R = 1000;
    const C_uF = 0.1;
    const fc = 1 / (2 * Math.PI * R * C_uF * 1e-6);

    const res = simulateCircuit(
      "ELC-01",
      { Vin: 10, f: fc, R, C: C_uF },
      bp.components,
      bp.defaultWires,
      [],
    );

    expect(res.energized).toBe(true);
    expect(Number(res.meters.find((m) => m.id === "fc")?.value)).toBeCloseTo(fc, 1);
    expect(Number(res.meters.find((m) => m.id === "gain")?.value)).toBeCloseTo(Math.SQRT1_2, 3);
    expect(Number(res.meters.find((m) => m.id === "Vout")?.value)).toBeCloseTo(
      10 * Math.SQRT1_2,
      2,
    );
    expect(Number(res.meters.find((m) => m.id === "phase")?.value)).toBeCloseTo(-45, 1);
    expect(res.figures.length).toBe(2);
    const rcOpTrace = res.figures
      .find((fig) => fig.id === "rc_response")
      ?.traces.find((t) => t.name === "Operating Point (f)");
    expect(rcOpTrace?.x?.[0]).toBeCloseTo(fc, 2);
    expect(rcOpTrace?.y?.[0]).toBeCloseTo(Math.SQRT1_2, 3);

    // Extreme low-fc and high-frequency range safety check
    const extremeLow = simulateCircuit(
      "ELC-01",
      { Vin: 24, f: 1, R: 100000, C: 100 },
      bp.components,
      bp.defaultWires,
      [],
    );
    expect(extremeLow.energized).toBe(true);
    const sweepSeries = extremeLow.figures.find((fig) => fig.id === "rc_response")?.traces[0];
    expect(sweepSeries?.x[0]).toBeLessThan(sweepSeries?.x[sweepSeries.x.length - 1] ?? 0);
  });

  test("ELC-02 Zener Diode Characteristics: verifies non-conducting and breakdown regulation modes", () => {
    const bp = buildBlueprint("ELC-02", "zener");

    // Below breakdown (Vs < Vz)
    const offRes = simulateCircuit(
      "ELC-02",
      { Vs: 3, Rs: 500, Vz: 5.1 },
      bp.components,
      bp.defaultWires,
      [],
    );
    expect(offRes.energized).toBe(true);
    expect(Number(offRes.meters.find((m) => m.id === "Vout")?.value)).toBeCloseTo(3, 2);
    expect(Number(offRes.meters.find((m) => m.id === "Iz")?.value)).toBeCloseTo(0, 3);

    // Above breakdown (Vs >= Vz -> Vout clamped at Vz = 5.1V, Iz = (12 - 5.1)/500 = 13.8 mA)
    const regRes = simulateCircuit(
      "ELC-02",
      { Vs: 12, Rs: 500, Vz: 5.1 },
      bp.components,
      bp.defaultWires,
      [],
    );
    expect(regRes.energized).toBe(true);
    expect(Number(regRes.meters.find((m) => m.id === "Vout")?.value)).toBeCloseTo(5.1, 2);
    expect(Number(regRes.meters.find((m) => m.id === "Iz")?.value)).toBeCloseTo(13.8, 2);
    expect(Number(regRes.meters.find((m) => m.id === "Vrs")?.value)).toBeCloseTo(6.9, 2);
    expect(regRes.figures.length).toBe(2);
    const zenerOpTrace = regRes.figures
      .find((fig) => fig.id === "zener_vi")
      ?.traces.find((t) => t.name === "Operating Point (Vs)");
    expect(zenerOpTrace?.x?.[0]).toBeCloseTo(12, 2);
    expect(zenerOpTrace?.y?.[0]).toBeCloseTo(5.1, 2);
  });

  test("Circuit Connection Validation catches open switch, missing wires, and short circuit", () => {
    const bp = buildBlueprint("BEE-01", "single");

    // Open switch
    const openRes = simulateCircuit(
      "BEE-01",
      { mode: "single", Vdc: 10, R1: 100, switchClosed: false },
      bp.components,
      bp.defaultWires,
      [],
    );
    expect(openRes.energized).toBe(false);
    expect(openRes.connection.status).toBe("open_switch");

    // Cleared wires
    const emptyRes = simulateCircuit(
      "BEE-01",
      { mode: "single", Vdc: 10, R1: 100, switchClosed: true },
      bp.components,
      [],
      [],
    );
    expect(emptyRes.energized).toBe(false);
    expect(emptyRes.connection.status).toBe("incomplete");

    // Short circuit wire directly across dc source terminals ("vdc")
    const shortRes = simulateCircuit(
      "BEE-01",
      { mode: "single", Vdc: 10, R1: 100, switchClosed: true },
      bp.components,
      [
        ...bp.defaultWires,
        {
          id: "bad-short",
          from: { compId: "vdc", terminalId: "pos" },
          to: { compId: "vdc", terminalId: "neg" },
        },
      ],
      [],
    );
    expect(shortRes.energized).toBe(false);
    expect(shortRes.connection.status).toBe("short_circuit");
  });
});
