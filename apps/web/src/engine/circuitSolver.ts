import { type FigureSpec, type VariableInfo } from "@vlab/shared";
import {
  type CalculationStep,
  type CircuitComponent,
  type CircuitMeterReading,
  type CircuitSimulationResult,
  type CircuitWire,
  type ConnectionCheckResult,
  type ExperimentParams,
  type ObservationRow,
  type PhasorVector,
} from "./circuitTypes.js";

function numParam(params: ExperimentParams, key: string, fallback: number): number {
  const val = params[key];
  if (typeof val === "number" && Number.isFinite(val)) {
    return val;
  }
  if (typeof val === "string") {
    const parsed = parseFloat(val);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function strParam(params: ExperimentParams, key: string, fallback: string): string {
  const val = params[key];
  return typeof val === "string" && val.length > 0 ? val : fallback;
}

function boolParam(params: ExperimentParams, key: string, fallback: boolean): boolean {
  const val = params[key];
  if (typeof val === "boolean") {
    return val;
  }
  return fallback;
}

function termKey(compId: string, terminalId: string): string {
  return `${compId}:${terminalId}`;
}

/**
 * Union-Find structure for checking electrical net connectivity between component terminals.
 */
class NetGraph {
  private parent = new Map<string, string>();

  find(k: string): string {
    const p = this.parent.get(k);
    if (!p) {
      this.parent.set(k, k);
      return k;
    }
    if (p === k) {
      return k;
    }
    const root = this.find(p);
    this.parent.set(k, root);
    return root;
  }

  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) {
      this.parent.set(ra, rb);
    }
  }

  connected(a: string, b: string): boolean {
    return this.find(a) === this.find(b);
  }
}

function buildNetWithoutSource(
  components: CircuitComponent[],
  wires: CircuitWire[],
  sourceIds: Set<string>,
  ignoreSwitchState = false,
  switchClosed = true,
): NetGraph {
  const net = new NetGraph();
  for (const wire of wires) {
    net.union(
      termKey(wire.from.compId, wire.from.terminalId),
      termKey(wire.to.compId, wire.to.terminalId),
    );
  }
  // Short conductive pass-through devices (ammeters, wattmeters, closed switches)
  for (const c of components) {
    if (!c.present || sourceIds.has(c.id)) {
      continue;
    }
    if (c.kind === "ammeter" || c.kind === "wattmeter") {
      if (c.terminals.length >= 2 && c.terminals[0] && c.terminals[1]) {
        net.union(termKey(c.id, c.terminals[0].id), termKey(c.id, c.terminals[1].id));
      }
    }
    if (c.kind === "switch" && (ignoreSwitchState || switchClosed)) {
      if (c.terminals.length >= 2 && c.terminals[0] && c.terminals[1]) {
        net.union(termKey(c.id, c.terminals[0].id), termKey(c.id, c.terminals[1].id));
      }
    }
  }
  return net;
}

/**
 * Checks whether a closed series path exists from source positive to source negative
 * traversing all required active components without bypassing them.
 */
export function validateCircuitConnections(
  _experimentId: string,
  params: ExperimentParams,
  components: CircuitComponent[],
  wires: CircuitWire[],
): ConnectionCheckResult {
  const switchClosed = boolParam(params, "switchClosed", true);
  const presentMap = new Map(components.filter((c) => c.present).map((c) => [c.id, c]));
  const diagnostics: string[] = [];
  const wiredMeters: Record<string, boolean> = {};

  const sourceComp = components.find(
    (c) => c.present && (c.kind === "ac_source" || c.kind === "dc_source"),
  );
  if (!sourceComp) {
    return {
      valid: false,
      status: "incomplete",
      title: "Power Source Missing",
      message: "Place the Power Supply on the circuit board from the Component Palette.",
      diagnostics: ["No AC/DC power source placed on canvas."],
      wiredMeters,
    };
  }

  // Check short circuit across source ignoring resistors/inductors/capacitors/diodes
  const wireOnlyNet = buildNetWithoutSource(
    components,
    wires,
    new Set([sourceComp.id]),
    false,
    switchClosed,
  );
  if (wireOnlyNet.connected(termKey(sourceComp.id, "pos"), termKey(sourceComp.id, "neg"))) {
    return {
      valid: false,
      status: "short_circuit",
      title: "Short Circuit Detected",
      message:
        "Direct conductive path found between source (+) and (-). Ensure load components (R/L/C) are connected in the path.",
      diagnostics: ["Source positive and negative terminals are shorted together."],
      wiredMeters,
    };
  }

  // Build full topological graph where every present non-voltmeter passive component bridges its terminals
  const fullNet = new NetGraph();
  for (const wire of wires) {
    fullNet.union(
      termKey(wire.from.compId, wire.from.terminalId),
      termKey(wire.to.compId, wire.to.terminalId),
    );
  }

  // Check if each component has wires attached to its terminals
  const attachedTermCounts = new Map<string, number>();
  for (const w of wires) {
    const k1 = termKey(w.from.compId, w.from.terminalId);
    const k2 = termKey(w.to.compId, w.to.terminalId);
    attachedTermCounts.set(k1, (attachedTermCounts.get(k1) || 0) + 1);
    attachedTermCounts.set(k2, (attachedTermCounts.get(k2) || 0) + 1);
  }

  const passiveKinds = new Set([
    "resistor",
    "inductor",
    "capacitor",
    "diode",
    "ammeter",
    "wattmeter",
  ]);

  // Bridge passive elements in fullNet (ignoring switch for topology check first)
  for (const c of components) {
    if (!c.present) {
      continue;
    }
    if (c.kind === "switch") {
      if (c.terminals[0] && c.terminals[1]) {
        fullNet.union(termKey(c.id, c.terminals[0].id), termKey(c.id, c.terminals[1].id));
      }
      continue;
    }
    if (passiveKinds.has(c.kind) && c.terminals.length >= 2 && c.terminals[0] && c.terminals[1]) {
      fullNet.union(termKey(c.id, c.terminals[0].id), termKey(c.id, c.terminals[1].id));
    }
  }

  // Check voltmeters (parallel check)
  for (const c of components) {
    if (c.kind === "voltmeter" && c.present && c.measuresAcross) {
      const target = presentMap.get(c.measuresAcross);
      if (
        target &&
        target.terminals[0] &&
        target.terminals[1] &&
        c.terminals[0] &&
        c.terminals[1]
      ) {
        const va = termKey(c.id, c.terminals[0].id);
        const vb = termKey(c.id, c.terminals[1].id);
        const ta = termKey(target.id, target.terminals[0].id);
        const tb = termKey(target.id, target.terminals[1].id);
        const connectedAcross =
          (wireOnlyNet.connected(va, ta) && wireOnlyNet.connected(vb, tb)) ||
          (wireOnlyNet.connected(va, tb) && wireOnlyNet.connected(vb, ta));
        wiredMeters[c.id] = connectedAcross;
      } else {
        wiredMeters[c.id] = false;
      }
    }
  }

  // Check every required component has both terminals connected in the circuit
  for (const c of components) {
    if (!c.present || c.kind === "voltmeter" || c.kind === "ground") {
      continue;
    }
    if (c.optional) {
      continue;
    }
    for (const t of c.terminals) {
      const count = attachedTermCounts.get(termKey(c.id, t.id)) || 0;
      if (count === 0) {
        diagnostics.push(`${c.name} (${c.symbol}) terminal '${t.label}' is not wired.`);
      }
    }
  }

  if (
    diagnostics.length > 0 ||
    !fullNet.connected(termKey(sourceComp.id, "pos"), termKey(sourceComp.id, "neg"))
  ) {
    if (diagnostics.length === 0) {
      diagnostics.push("Circuit loop from source (+) to source (-) is open.");
    }
    return {
      valid: false,
      status: "incomplete",
      title: "Incomplete Circuit Connections",
      message: diagnostics[0] || "Connect all circuit terminals to form a closed loop.",
      diagnostics,
      wiredMeters,
    };
  }

  // Verify switch state
  const switchComp = components.find((c) => c.present && c.kind === "switch");
  if (switchComp && !switchClosed) {
    return {
      valid: true,
      status: "open_switch",
      title: "Connections Verified (Switch Open)",
      message: "Circuit wiring is valid! Turn Switch ON to energize and view live readings.",
      diagnostics: ["Closed series/parallel path verified.", "Main switch is currently OFF."],
      wiredMeters,
    };
  }

  return {
    valid: true,
    status: "ready",
    title: "Connections Verified",
    message: "Circuit topology is valid and energized. All meters are reading live values.",
    diagnostics: ["Closed path verified with zero wiring errors."],
    wiredMeters,
  };
}

export function simulateCircuit(
  experimentId: string,
  params: ExperimentParams,
  components: CircuitComponent[],
  wires: CircuitWire[],
  observationRows: ObservationRow[] = [],
): CircuitSimulationResult {
  const connection = validateCircuitConnections(experimentId, params, components, wires);

  switch (experimentId) {
    case "NT-01":
      return simulateRlc(params, connection, observationRows);
    case "BEE-01":
      return simulateOhmsLaw(params, connection, observationRows);
    case "ELC-01":
      return simulateRcFilter(params, connection, observationRows);
    case "ELC-02":
      return simulateZenerDiode(params, connection, observationRows);
    default:
      return simulateRlc(params, connection, observationRows);
  }
}

function simulateRlc(
  params: ExperimentParams,
  connection: ConnectionCheckResult,
  _observationRows: ObservationRow[],
): CircuitSimulationResult {
  const mode = strParam(params, "mode", "RLC");
  const Vs = Math.max(0, numParam(params, "Vs", 70));
  const f = Math.max(0.1, numParam(params, "f", 50));
  const R = Math.max(0.1, numParam(params, "R", 100));
  const L_mH = mode === "RC" ? 0 : Math.max(0, numParam(params, "L", 150));
  const rL = 0; // Coil resistance removed — simplified circuit
  const C_uF = mode === "RL" ? 0 : Math.max(0.01, numParam(params, "C", 35));

  const L = L_mH * 1e-3;
  const C = C_uF * 1e-6;
  const omega = 2 * Math.PI * f;
  const XL = mode === "RC" ? 0 : omega * L;
  const XC = mode === "RL" ? 0 : 1 / (omega * C);
  const Rtotal = R + rL;
  const Xnet = XL - XC;
  const Z = Math.hypot(Rtotal, Xnet);

  const energized = connection.valid && connection.status === "ready";
  const I = energized ? Vs / Z : 0;
  const VR = I * R;
  const VL = energized ? I * Math.hypot(rL, XL) : 0;
  const VC = energized ? I * XC : 0;
  const thetaRad = Math.atan2(Xnet, Rtotal);
  const thetaDeg = (thetaRad * 180) / Math.PI;
  const pf = Math.cos(thetaRad);
  const P = energized ? Vs * I * pf : 0;
  const Qvar = energized ? Vs * I * Math.sin(thetaRad) : 0;
  const Sva = energized ? Vs * I : 0;

  const hasResonance = L > 0 && C > 0 && mode === "RLC";
  const f0 = hasResonance ? 1 / (2 * Math.PI * Math.sqrt(L * C)) : 0;
  const Qfactor = hasResonance ? (1 / Rtotal) * Math.sqrt(L / C) : 0;
  const isResonant =
    hasResonance && (Math.abs(thetaDeg) < 0.8 || Math.abs(f - f0) / Math.max(f0, 1) <= 0.01);

  let regimeLabel = "Circuit De-energized";
  let regimeTone: CircuitSimulationResult["regimeTone"] = "idle";
  if (energized) {
    if (isResonant) {
      regimeLabel = `At Resonance (f ≈ f₀ = ${f0.toFixed(1)} Hz, Unity PF)`;
      regimeTone = "resonant";
    } else if (Xnet > 0) {
      regimeLabel = `Inductive (Current lags Vs by ${thetaDeg.toFixed(1)}°)`;
      regimeTone = "inductive";
    } else {
      regimeLabel = `Capacitive (Current leads Vs by ${Math.abs(thetaDeg).toFixed(1)}°)`;
      regimeTone = "capacitive";
    }
  }

  const vrShown = connection.wiredMeters["vm_r"] === false ? 0 : VR;
  const vlShown = connection.wiredMeters["vm_l"] === false ? 0 : VL;
  const vcShown = connection.wiredMeters["vm_c"] === false ? 0 : VC;

  const meters: CircuitMeterReading[] = [
    {
      id: "I",
      label: "Ammeter (Current)",
      symbol: "I",
      value: I.toFixed(3),
      unit: "A",
      tone: "brand",
      detail: `${(I * 1000).toFixed(1)} mA RMS`,
    },
    {
      id: "Vs",
      label: "Supply Voltage",
      symbol: "Vs",
      value: (energized ? Vs : 0).toFixed(2),
      unit: "V",
      tone: "neutral",
      detail: `f = ${f.toFixed(1)} Hz`,
    },
    {
      id: "VR",
      label: "Resistor Voltage",
      symbol: "VR",
      value: vrShown.toFixed(2),
      unit: "V",
      tone: "emerald",
      detail: connection.wiredMeters["vm_r"] === false ? "Voltmeter unwired" : "In phase with I",
    },
    ...(mode !== "RC"
      ? [
          {
            id: "VL",
            label: "Inductor Voltage",
            symbol: "VL",
            value: vlShown.toFixed(2),
            unit: "V",
            tone: "amber" as const,
            detail:
              connection.wiredMeters["vm_l"] === false
                ? "Voltmeter unwired"
                : `XL = ${XL.toFixed(2)} Ω`,
          },
        ]
      : []),
    ...(mode !== "RL"
      ? [
          {
            id: "VC",
            label: "Capacitor Voltage",
            symbol: "VC",
            value: vcShown.toFixed(2),
            unit: "V",
            tone: "brand" as const,
            detail:
              connection.wiredMeters["vm_c"] === false
                ? "Voltmeter unwired"
                : `XC = ${XC.toFixed(2)} Ω`,
          },
        ]
      : []),
    {
      id: "Z",
      label: "Total Impedance",
      symbol: "|Z|",
      value: Z.toFixed(2),
      unit: "Ω",
      tone: "neutral",
      detail: `θ = ${thetaDeg.toFixed(2)}° · PF = ${pf.toFixed(3)}`,
    },
    ...(hasResonance
      ? [
          {
            id: "f0",
            label: "Resonant Frequency",
            symbol: "f₀",
            value: f0.toFixed(2),
            unit: "Hz",
            tone: "amber" as const,
            detail: `Q = ${Qfactor.toFixed(2)}`,
          },
        ]
      : []),
  ];

  // Simple Series Resonance Curve: Circuit Current (I) vs Frequency (f)
  const fSweepMax = hasResonance
    ? Math.max(150, Math.ceil(Math.max(f0 * 2, f * 1.15) / 50) * 50)
    : Math.max(200, Math.ceil((f * 1.25) / 50) * 50);

  const freqSamples: number[] = [];
  const baseSteps = 180;
  for (let idx = 0; idx <= baseSteps; idx++) {
    freqSamples.push(Math.max(1, (idx / baseSteps) * fSweepMax));
  }
  if (hasResonance && f0 >= 1 && f0 <= fSweepMax) {
    // Cluster dense samples near f0 so narrow high-Q curves reach exact peak Vs / R
    for (let k = -24; k <= 24; k++) {
      const fk = f0 * (1 + k * 0.006);
      if (fk >= 1 && fk <= fSweepMax) {
        freqSamples.push(fk);
      }
    }
    freqSamples.push(f0);
  }
  const uniqueSortedFreqs = Array.from(new Set(freqSamples)).sort((a, b) => a - b);
  const fArr = new Float64Array(uniqueSortedFreqs.length);
  const iArr = new Float64Array(uniqueSortedFreqs.length);
  let maxPlotI = Math.max(0.01, I);

  for (let idx = 0; idx < uniqueSortedFreqs.length; idx++) {
    const fk = uniqueSortedFreqs[idx] ?? 1;
    fArr[idx] = fk;
    if (!energized) {
      iArr[idx] = 0;
      continue;
    }
    const wk = 2 * Math.PI * fk;
    const xlK = mode === "RC" ? 0 : wk * L;
    const xcK = mode === "RL" ? 0 : 1 / (wk * C);
    const zK = Math.hypot(Rtotal, xlK - xcK);
    const ik = Vs / zK;
    iArr[idx] = ik;
    if (ik > maxPlotI) {
      maxPlotI = ik;
    }
  }

  const iMaxRes = hasResonance && energized ? Vs / Rtotal : maxPlotI;

  const figures: FigureSpec[] = [
    {
      id: "rlc_resonance",
      kind: "cartesian",
      layout: {
        title: hasResonance
          ? "Series Resonance: Current (I) vs Frequency (f)"
          : `${mode} Circuit: Current (I) vs Frequency (f)`,
        xLabel: "Frequency, f (Hz)",
        yLabel: "Circuit Current, I (A)",
        xRange: [0, fSweepMax],
        yRange: [0, Math.max(0.05, Number((iMaxRes * 1.12).toFixed(4)))],
        grid: true,
        legend: true,
        shapes:
          hasResonance && energized
            ? [
                { type: "vline", x0: f0, x1: f0 },
                { type: "hline", y0: iMaxRes, y1: iMaxRes },
              ]
            : [],
      },
      traces: [
        {
          type: "scatter",
          mode: "lines",
          name: "Current I(f)",
          x: fArr,
          y: iArr,
          style: { color: "#dc2626", width: 2.8 },
        },
        ...(energized
          ? [
              {
                type: "scatter" as const,
                mode: "markers" as const,
                name: `Selected f (${f} Hz)`,
                x: new Float64Array([f]),
                y: new Float64Array([I]),
                style: { color: "#2563eb", markerSize: 7 },
              },
            ]
          : []),
      ],
    },
  ];

  const phasors: PhasorVector[] = [];

  const calculationSteps: CalculationStep[] = [
    {
      title: "1. Inductive & Capacitive Reactances",
      formula: "XL = 2πfL,   XC = 1 / (2πfC)",
      substituted: `XL = 2π(${f})(${L.toFixed(4)} H),  XC = 1/(2π(${f})(${C_uF} µF))`,
      result: `XL = ${XL.toFixed(2)} Ω,  XC = ${XC.toFixed(2)} Ω`,
    },
    {
      title: "2. Total Series Impedance |Z|",
      formula: "|Z| = √(R² + (XL − XC)²)",
      substituted: `√(${R.toFixed(1)}² + (${XL.toFixed(2)} − ${XC.toFixed(2)})²)`,
      result: `|Z| = ${Z.toFixed(2)} Ω`,
    },
    {
      title: "3. Circuit RMS Current & Component Drops",
      formula: "I = Vs / |Z|,  VR = I·R,  VL = I·XL,  VC = I·XC",
      substituted: `I = ${Vs}/${Z.toFixed(2)} = ${I.toFixed(3)} A`,
      result: `VR = ${VR.toFixed(2)} V, VL = ${VL.toFixed(2)} V, VC = ${VC.toFixed(2)} V`,
    },
    {
      title: "4. Vector Sum Check & Power Factor",
      formula: "√(VR² + (VL − VC)²) = Vs,   cos(θ) = R / |Z|",
      substituted: `√(${VR.toFixed(1)}² + (${(VL - VC).toFixed(1)})²) = ${Math.hypot(VR, VL - VC).toFixed(2)} V`,
      result: `θ = ${thetaDeg.toFixed(2)}°, PF = ${pf.toFixed(3)}, P = ${P.toFixed(2)} W`,
    },
  ];

  const variables: VariableInfo[] = [
    { name: "XL", type: "float", shape: null, dtype: "Ω", preview: XL.toFixed(3), sizeBytes: 8 },
    { name: "XC", type: "float", shape: null, dtype: "Ω", preview: XC.toFixed(3), sizeBytes: 8 },
    { name: "Z_mag", type: "float", shape: null, dtype: "Ω", preview: Z.toFixed(3), sizeBytes: 8 },
    { name: "I_rms", type: "float", shape: null, dtype: "A", preview: I.toFixed(4), sizeBytes: 8 },
    { name: "V_R", type: "float", shape: null, dtype: "V", preview: VR.toFixed(2), sizeBytes: 8 },
    { name: "V_L", type: "float", shape: null, dtype: "V", preview: VL.toFixed(2), sizeBytes: 8 },
    { name: "V_C", type: "float", shape: null, dtype: "V", preview: VC.toFixed(2), sizeBytes: 8 },
    {
      name: "theta_deg",
      type: "float",
      shape: null,
      dtype: "deg",
      preview: thetaDeg.toFixed(2),
      sizeBytes: 8,
    },
    {
      name: "power_factor",
      type: "float",
      shape: null,
      dtype: "cos θ",
      preview: pf.toFixed(4),
      sizeBytes: 8,
    },
    {
      name: "P_active",
      type: "float",
      shape: null,
      dtype: "W",
      preview: P.toFixed(2),
      sizeBytes: 8,
    },
    {
      name: "Q_reactive",
      type: "float",
      shape: null,
      dtype: "VAR",
      preview: Qvar.toFixed(2),
      sizeBytes: 8,
    },
    {
      name: "S_apparent",
      type: "float",
      shape: null,
      dtype: "VA",
      preview: Sva.toFixed(2),
      sizeBytes: 8,
    },
    ...(hasResonance
      ? [
          {
            name: "f0_resonant",
            type: "float",
            shape: null,
            dtype: "Hz",
            preview: f0.toFixed(2),
            sizeBytes: 8,
          },
          {
            name: "Q_factor",
            type: "float",
            shape: null,
            dtype: "-",
            preview: Qfactor.toFixed(3),
            sizeBytes: 8,
          },
        ]
      : []),
  ];

  const explanationSummary = energized
    ? `At f = ${f} Hz, XL = ${XL.toFixed(2)} Ω and XC = ${XC.toFixed(2)} Ω. Because ${
        isResonant
          ? `XL ≈ XC at resonant frequency f₀ = ${f0.toFixed(2)} Hz, the circuit is at resonance with purely resistive impedance Z = R, phase angle θ ≈ 0° (vs & vR in phase), and VR = Vs`
          : XL > XC
            ? `XL > XC (${XL.toFixed(1)} Ω > ${XC.toFixed(1)} Ω), net reactance is positive (+${Xnet.toFixed(1)} Ω), so current LAGS supply voltage by ${thetaDeg.toFixed(1)}°`
            : `XC > XL (${XC.toFixed(1)} Ω > ${XL.toFixed(1)} Ω), net reactance is negative (${Xnet.toFixed(1)} Ω), so current LEADS supply voltage by ${Math.abs(thetaDeg).toFixed(1)}°`
      }. Notice VL + VC can exceed Vs individually because VL and VC are 180° out of phase and cancel vectorially!`
    : connection.message;

  return {
    connection,
    energized,
    regimeLabel,
    regimeTone,
    meters,
    componentReadouts: {
      vs: `${Vs} V · ${f} Hz`,
      res: `${R} Ω`,
      ind: `${L_mH} mH`,
      cap: `${C_uF} µF`,
    },
    explanationSummary,
    calculationSteps,
    phasors,
    figures,
    variables,
    observationSnapshot: {
      Mode: mode,
      "Vs (V)": Number(Vs.toFixed(2)),
      "f (Hz)": Number(f.toFixed(1)),
      "R (Ω)": Number(R.toFixed(1)),
      "L (mH)": Number(L_mH.toFixed(1)),
      "C (µF)": Number(C_uF.toFixed(1)),
      "I (A)": Number(I.toFixed(4)),
      "VR (V)": Number(vrShown.toFixed(2)),
      "VL (V)": Number(vlShown.toFixed(2)),
      "VC (V)": Number(vcShown.toFixed(2)),
      "P (W)": Number(P.toFixed(2)),
      "θ (°)": Number(thetaDeg.toFixed(2)),
      PF: Number(pf.toFixed(3)),
    },
  };
}

function solveDiodeCurrent(Vdc: number, Rseries: number): { id: number; vd: number } {
  if (Vdc <= 0) {
    return { id: 0, vd: 0 };
  }
  const Is = 1e-12;
  const etaVt = 1.5 * 0.026;
  // Binary search Vd in [0, min(Vdc, 1.2)] such that Vd + Is*(exp(Vd/etaVt)-1)*Rseries = Vdc
  let lo = 0;
  let hi = Math.min(Vdc, 1.3);
  for (let iter = 0; iter < 60; iter++) {
    const mid = 0.5 * (lo + hi);
    const iMid = Is * (Math.exp(mid / etaVt) - 1);
    const fMid = mid + iMid * Rseries - Vdc;
    if (fMid > 0) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  const vd = 0.5 * (lo + hi);
  const id = (Vdc - vd) / Rseries;
  return { id: Math.max(0, id), vd };
}

function simulateOhmsLaw(
  params: ExperimentParams,
  connection: ConnectionCheckResult,
  observationRows: ObservationRow[],
): CircuitSimulationResult {
  const mode = strParam(params, "mode", "single");
  const Vdc = Math.max(0, numParam(params, "Vdc", 10));
  const R1 = Math.max(1, numParam(params, "R1", 1000));
  const R2 = Math.max(1, numParam(params, "R2", 2000));
  const energized = connection.valid && connection.status === "ready";

  let Req = R1;
  if (mode === "series") {
    Req = R1 + R2;
  } else if (mode === "parallel") {
    Req = (R1 * R2) / (R1 + R2);
  }

  let I = 0;
  let Vload = energized ? Vdc : 0;
  if (energized) {
    if (mode === "diode") {
      const solved = solveDiodeCurrent(Vdc, R1);
      I = solved.id;
      Vload = solved.vd;
    } else {
      I = Vdc / Req;
      Vload = Vdc;
    }
  }

  const I_mA = I * 1000;
  const P = energized ? Vdc * I : 0;
  const measuredRatio = I > 1e-9 ? Vload / I : 0;
  const vmWired = connection.wiredMeters["vm"] !== false;

  const meters: CircuitMeterReading[] = [
    {
      id: "V",
      label: mode === "diode" ? "Diode Voltage VD" : "Voltmeter (V)",
      symbol: "V",
      value: (vmWired ? Vload : 0).toFixed(3),
      unit: "V",
      tone: "neutral",
      detail: vmWired ? `Supply Vdc = ${Vdc.toFixed(2)} V` : "Voltmeter disconnected",
    },
    {
      id: "I",
      label: "Ammeter (Current)",
      symbol: "I",
      value: I_mA.toFixed(3),
      unit: "mA",
      tone: "brand",
      detail: `${I.toFixed(5)} A`,
    },
    {
      id: "Req",
      label: mode === "diode" ? "Series Resistor R₁" : "Equivalent Resistance",
      symbol: mode === "diode" ? "R₁" : "Req",
      value: Req.toFixed(2),
      unit: "Ω",
      tone: "emerald",
      detail:
        mode === "series"
          ? "R₁ + R₂"
          : mode === "parallel"
            ? "(R₁·R₂)/(R₁+R₂)"
            : mode === "diode"
              ? `V/I = ${measuredRatio.toFixed(1)} Ω (Non-linear)`
              : `Measured V/I = ${measuredRatio.toFixed(1)} Ω`,
    },
    {
      id: "P",
      label: "Power Dissipated",
      symbol: "P",
      value: (P * 1000).toFixed(2),
      unit: "mW",
      tone: "amber",
      detail: `${P.toFixed(4)} W`,
    },
  ];

  // Stabilize V-I range so the operating point dot visibly glides along the curve
  const vMaxPlot =
    mode === "diode"
      ? Math.max(15, Math.ceil((Vdc + 2) / 5) * 5)
      : Math.max(30, Math.ceil((Vdc + 5) / 10) * 10);
  const nPts = 120;
  const vAxis = new Float64Array(nPts);
  const iCurve_mA = new Float64Array(nPts);
  const pCurve_mW = new Float64Array(nPts);
  for (let idx = 0; idx < nPts; idx++) {
    const vk = (idx / (nPts - 1)) * vMaxPlot;
    if (mode === "diode") {
      const s = solveDiodeCurrent(vk, R1);
      vAxis[idx] = s.vd;
      iCurve_mA[idx] = s.id * 1000;
      pCurve_mW[idx] = s.vd * s.id * 1000;
    } else {
      vAxis[idx] = vk;
      const ik = vk / Req;
      iCurve_mA[idx] = ik * 1000;
      pCurve_mW[idx] = vk * ik * 1000;
    }
  }

  const obsV = observationRows.map((r) => Number(r.values["V (V)"] ?? 0));
  const obsI = observationRows.map((r) => Number(r.values["I (mA)"] ?? 0));
  const vOpPlot = energized ? Vload : 0;
  const iOpPlot = energized ? I_mA : 0;
  const pOpPlot = energized ? Vload * I_mA : 0;

  const figures: FigureSpec[] = [
    {
      id: "ohms_vi",
      kind: "cartesian",
      layout: {
        title:
          mode === "diode"
            ? "Non-Ohmic Diode I-V Characteristic Curve"
            : `Ohm's Law V-I Characteristic (Slope = 1/${Req.toFixed(0)} Ω)`,
        xLabel: mode === "diode" ? "Diode Voltage VD (V)" : "Voltage V (V)",
        yLabel: "Current I (mA)",
        ...(mode === "diode" ? {} : { xRange: [0, vMaxPlot] as [number, number] }),
        grid: true,
        legend: true,
        shapes: [{ type: "hline", y0: 0, y1: 0 }],
      },
      traces: [
        {
          type: "scatter",
          mode: "lines",
          name: mode === "diode" ? "Diode I-V Curve" : `Theoretical I = V / ${Req.toFixed(0)} Ω`,
          x: vAxis,
          y: iCurve_mA,
          style: { color: "#3b82f6", width: 2.6 },
        },
        ...(obsV.length > 0
          ? [
              {
                type: "scatter" as const,
                mode: "markers" as const,
                name: "Recorded Readings",
                x: new Float64Array(obsV),
                y: new Float64Array(obsI),
                style: { color: "#f59e0b", markerSize: 5.5 },
              },
            ]
          : []),
        ...(energized
          ? [
              {
                type: "scatter" as const,
                mode: "markers" as const,
                name: "Operating Point",
                x: new Float64Array([vOpPlot]),
                y: new Float64Array([iOpPlot]),
                style: { color: "#10b981", markerSize: 7.5 },
              },
            ]
          : []),
      ],
    },
    {
      id: "ohms_power",
      kind: "cartesian",
      layout: {
        title: "Power Dissipation P = V·I vs Voltage",
        xLabel: "Voltage (V)",
        yLabel: "Power (mW)",
        ...(mode === "diode" ? {} : { xRange: [0, vMaxPlot] as [number, number] }),
        grid: true,
        legend: true,
        shapes: [{ type: "hline", y0: 0, y1: 0 }],
      },
      traces: [
        {
          type: "scatter",
          mode: "lines",
          name: "Power (mW)",
          x: vAxis,
          y: pCurve_mW,
          style: { color: "#f59e0b", width: 2.6 },
        },
        ...(energized
          ? [
              {
                type: "scatter" as const,
                mode: "markers" as const,
                name: "Operating Point",
                x: new Float64Array([vOpPlot]),
                y: new Float64Array([pOpPlot]),
                style: { color: "#10b981", markerSize: 7.5 },
              },
            ]
          : []),
      ],
    },
  ];

  const calculationSteps: CalculationStep[] =
    mode === "single"
      ? [
          {
            title: "1. Identify Circuit Resistance",
            formula: "R_eq = R₁",
            substituted: `R_eq = ${R1} Ω`,
            result: `${Req.toFixed(2)} Ω`,
          },
          {
            title: "2. Apply Ohm's Law (I = V / R)",
            formula: "I = V_DC / R_eq",
            substituted: `I = ${Vdc.toFixed(2)} V / ${Req.toFixed(2)} Ω`,
            result: `${I.toFixed(5)} A (${I_mA.toFixed(3)} mA)`,
          },
          {
            title: "3. Verify Proportionality & Power",
            formula: "V = I × R,   P = V × I",
            substituted: `${I.toFixed(5)} × ${Req.toFixed(2)} = ${(I * Req).toFixed(2)} V,   P = ${Vdc.toFixed(2)} × ${I.toFixed(5)}`,
            result: `P = ${(P * 1000).toFixed(2)} mW`,
          },
        ]
      : mode === "series"
        ? [
            {
              title: "1. Series Equivalent Resistance",
              formula: "R_eq = R₁ + R₂",
              substituted: `R_eq = ${R1} Ω + ${R2} Ω`,
              result: `${Req.toFixed(2)} Ω`,
            },
            {
              title: "2. Same Current Flows Through R₁ and R₂",
              formula: "I = V_DC / (R₁ + R₂)",
              substituted: `I = ${Vdc.toFixed(2)} / ${Req.toFixed(2)}`,
              result: `${I_mA.toFixed(3)} mA`,
            },
            {
              title: "3. KVL Voltage Drops Verify V₁ + V₂ = V_DC",
              formula: "V₁ = I·R₁,   V₂ = I·R₂",
              substituted: `V₁ = ${(I * R1).toFixed(2)} V,  V₂ = ${(I * R2).toFixed(2)} V`,
              result: `V₁ + V₂ = ${(I * R1 + I * R2).toFixed(2)} V`,
            },
          ]
        : mode === "parallel"
          ? [
              {
                title: "1. Parallel Equivalent Resistance",
                formula: "R_eq = (R₁ × R₂) / (R₁ + R₂)",
                substituted: `(${R1} × ${R2}) / (${R1} + ${R2})`,
                result: `${Req.toFixed(2)} Ω (< smallest resistor)`,
              },
              {
                title: "2. Branch Currents & Total Current (KCL)",
                formula: "I₁ = V/R₁,   I₂ = V/R₂,   I_total = I₁ + I₂",
                substituted: `I₁ = ${((Vdc / R1) * 1000).toFixed(2)} mA,  I₂ = ${((Vdc / R2) * 1000).toFixed(2)} mA`,
                result: `I_total = ${I_mA.toFixed(3)} mA`,
              },
            ]
          : [
              {
                title: "1. Non-Ohmic Shockley Diode Equation",
                formula: "I = Is · (e^(V_D / (η·V_T)) − 1)",
                substituted: `With series resistor R₁ = ${R1} Ω and V_DC = ${Vdc} V`,
                result: `V_D = ${Vload.toFixed(3)} V,  I = ${I_mA.toFixed(3)} mA`,
              },
              {
                title: "2. Why Ohm's Law Does Not Hold Here",
                formula: "Static Resistance R_static = V_D / I",
                substituted: `${Vload.toFixed(3)} V / ${I.toFixed(5)} A`,
                result: `${measuredRatio.toFixed(1)} Ω (varies with V — non-linear!)`,
              },
            ];

  const explanationSummary = energized
    ? mode === "diode"
      ? `In Non-Ohmic Diode mode, the PN junction voltage stays near ~${Vload.toFixed(2)} V while current rises exponentially once forward bias exceeds ~0.6 V. Because V/I changes with voltage, a diode is a NON-OHMIC device.`
      : `Ohm's Law Verified: With V = ${Vdc.toFixed(2)} V across Req = ${Req.toFixed(1)} Ω, the current is exactly I = V/Req = ${I_mA.toFixed(3)} mA. If you double V to ${(2 * Vdc).toFixed(1)} V while holding R constant, current doubles proportionally to ${(2 * I_mA).toFixed(3)} mA — proving a linear V-I line through the origin!`
    : connection.message;

  const variables: VariableInfo[] = [
    {
      name: "V_applied",
      type: "float",
      shape: null,
      dtype: "V",
      preview: Vload.toFixed(3),
      sizeBytes: 8,
    },
    { name: "R_eq", type: "float", shape: null, dtype: "Ω", preview: Req.toFixed(2), sizeBytes: 8 },
    { name: "I_amps", type: "float", shape: null, dtype: "A", preview: I.toFixed(6), sizeBytes: 8 },
    {
      name: "I_mA",
      type: "float",
      shape: null,
      dtype: "mA",
      preview: I_mA.toFixed(3),
      sizeBytes: 8,
    },
    {
      name: "Power_mW",
      type: "float",
      shape: null,
      dtype: "mW",
      preview: (P * 1000).toFixed(3),
      sizeBytes: 8,
    },
  ];

  return {
    connection,
    energized,
    regimeLabel: energized
      ? mode === "diode"
        ? "Non-Ohmic Exponential Behavior"
        : `Ohmic Linear Behavior (Req = ${Req.toFixed(1)} Ω)`
      : "Circuit De-energized",
    regimeTone: energized ? (mode === "diode" ? "non_ohmic" : "ohmic") : "idle",
    meters,
    componentReadouts: {
      vdc: `${Vdc} V`,
      am: `${I_mA.toFixed(2)} mA`,
      vm: `${(vmWired ? Vload : 0).toFixed(2)} V`,
      r1: `${R1} Ω`,
      r2: `${R2} Ω`,
      diode: `VD=${Vload.toFixed(2)}V`,
    },
    explanationSummary,
    calculationSteps,
    phasors: [],
    figures,
    variables,
    observationSnapshot: {
      Mode: mode,
      "V (V)": Number(Vload.toFixed(3)),
      "R1 (Ω)": R1,
      "R2 (Ω)": mode === "series" || mode === "parallel" ? R2 : "-",
      "Req (Ω)": Number(Req.toFixed(2)),
      "I (mA)": Number(I_mA.toFixed(3)),
      "P (mW)": Number((P * 1000).toFixed(2)),
      "V/I (Ω)": Number(measuredRatio.toFixed(2)),
    },
  };
}

// ─── ELC-01: RC Low-Pass Filter ──────────────────────────────────────────────

function simulateRcFilter(
  params: ExperimentParams,
  connection: ConnectionCheckResult,
  _observationRows: ObservationRow[],
): CircuitSimulationResult {
  const Vin = Math.max(0, numParam(params, "Vin", 10));
  const f = Math.max(1, numParam(params, "f", 100));
  const R = Math.max(1, numParam(params, "R", 1000));
  const C_uF = Math.max(0.001, numParam(params, "C", 1));
  const C = C_uF * 1e-6;

  const energized = connection.valid && connection.status === "ready";
  const vmWired = connection.wiredMeters["vm"] !== false;

  const omega = 2 * Math.PI * f;
  const Xc = 1 / (omega * C);
  const Z = Math.hypot(R, Xc);
  const Vout = energized ? (Vin * Xc) / Z : 0;
  const voutShown = vmWired ? Vout : 0;
  const phaseDeg = energized ? -Math.atan2(2 * Math.PI * f * R * C, 1) * (180 / Math.PI) : 0;
  const fc = 1 / (2 * Math.PI * R * C);
  const gain = energized && Vin > 0 ? Vout / Vin : 0;

  // Time-domain waveform over 2 cycles
  const nPts = 200;
  const T = 1 / f;
  const tMax = 2 * T;
  const tArr = new Float64Array(nPts);
  const vinWave = new Float64Array(nPts);
  const voutWave = new Float64Array(nPts);
  const phaseRad = phaseDeg * (Math.PI / 180);

  for (let i = 0; i < nPts; i++) {
    const t = (i / (nPts - 1)) * tMax;
    tArr[i] = t * 1000; // ms
    if (energized) {
      vinWave[i] = Vin * Math.SQRT2 * Math.sin(omega * t);
      voutWave[i] = Vout * Math.SQRT2 * Math.sin(omega * t + phaseRad);
    }
  }

  // Frequency response (Gain vs f) with safe min/max bounds
  const fPts = 180;
  const fArr = new Float64Array(fPts);
  const gainArr = new Float64Array(fPts);
  const fMin = Math.max(0.5, Math.min(fc * 0.05, f * 0.1));
  const fMax = Math.max(fMin * 40, fc * 6, f * 1.25);
  for (let i = 0; i < fPts; i++) {
    const fk = fMin * Math.pow(fMax / fMin, i / (fPts - 1));
    const xck = 1 / (2 * Math.PI * fk * C);
    fArr[i] = fk;
    gainArr[i] = xck / Math.hypot(R, xck);
  }
  const rcTMaxMs = Number((tMax * 1000).toFixed(4));

  const meters: CircuitMeterReading[] = [
    {
      id: "Vin",
      label: "Input Voltage (Vin)",
      symbol: "Vin",
      value: (energized ? Vin : 0).toFixed(3),
      unit: "V",
      tone: "neutral",
      detail: `f = ${f.toFixed(1)} Hz`,
    },
    {
      id: "Vout",
      label: "Output Voltage (Vout)",
      symbol: "Vout",
      value: voutShown.toFixed(3),
      unit: "V",
      tone: "brand",
      detail: vmWired ? "Across capacitor C" : "Voltmeter disconnected",
    },
    {
      id: "gain",
      label: "Voltage Gain",
      symbol: "Vout/Vin",
      value: gain.toFixed(4),
      unit: "",
      tone: "emerald",
      detail: `${(gain * 100).toFixed(1)}%`,
    },
    {
      id: "fc",
      label: "Cut-off Frequency",
      symbol: "fc",
      value: fc.toFixed(2),
      unit: "Hz",
      tone: "amber",
      detail: "1 / (2πRC)",
    },
    {
      id: "phase",
      label: "Phase Shift",
      symbol: "φ",
      value: phaseDeg.toFixed(2),
      unit: "°",
      tone: "neutral",
      detail: "Output lags input",
    },
    {
      id: "Xc",
      label: "Capacitive Reactance",
      symbol: "Xc",
      value: Xc.toFixed(2),
      unit: "Ω",
      tone: "neutral",
      detail: "1 / (2πfC)",
    },
  ];

  const explanationSummary = energized
    ? `At f = ${f.toFixed(1)} Hz with R = ${R} Ω and C = ${C_uF} µF: Xc = ${Xc.toFixed(1)} Ω, fc = ${fc.toFixed(1)} Hz. ${
        f < fc * 0.95
          ? `Since f (${f.toFixed(0)} Hz) < fc (${fc.toFixed(0)} Hz), the capacitor has high reactance, so low frequencies pass through cleanly (Gain = ${(gain * 100).toFixed(1)}%).`
          : f > fc * 1.05
            ? `Since f (${f.toFixed(0)} Hz) > fc (${fc.toFixed(0)} Hz), Xc drops so high frequencies are attenuated to ${(gain * 100).toFixed(1)}% of input.`
            : `At cut-off frequency fc ≈ ${fc.toFixed(1)} Hz, Vout ≈ 0.707 × Vin (−3 dB point) with phase lag ${Math.abs(phaseDeg).toFixed(1)}°.`
      }`
    : connection.message;

  return {
    connection,
    energized,
    regimeLabel: energized
      ? f < fc * 0.95
        ? "Passband (f < fc)"
        : f > fc * 1.05
          ? "Stopband (f > fc)"
          : "At Cut-off (f ≈ fc)"
      : "Circuit De-energized",
    regimeTone: energized
      ? f < fc * 0.95
        ? "resonant"
        : f > fc * 1.05
          ? "capacitive"
          : "inductive"
      : "idle",
    meters,
    componentReadouts: {
      vs: `${Vin} V · ${f} Hz`,
      res: `${R} Ω`,
      cap: `${C_uF} µF`,
      vm: `${voutShown.toFixed(2)} V`,
    },
    explanationSummary,
    calculationSteps: [
      {
        title: "1. Capacitive Reactance",
        formula: "Xc = 1 / (2πfC)",
        substituted: `1 / (2π × ${f} × ${C_uF}×10⁻⁶)`,
        result: `Xc = ${Xc.toFixed(2)} Ω`,
      },
      {
        title: "2. Total Impedance",
        formula: "|Z| = √(R² + Xc²)",
        substituted: `√(${R}² + ${Xc.toFixed(1)}²)`,
        result: `|Z| = ${Z.toFixed(2)} Ω`,
      },
      {
        title: "3. Output Voltage (Voltage Divider)",
        formula: "Vout = Vin × Xc / |Z|",
        substituted: `${Vin} × ${Xc.toFixed(1)} / ${Z.toFixed(1)}`,
        result: `Vout = ${Vout.toFixed(3)} V (Gain = ${gain.toFixed(3)})`,
      },
      {
        title: "4. Cut-off Frequency",
        formula: "fc = 1 / (2πRC)",
        substituted: `1 / (2π × ${R} × ${C_uF}×10⁻⁶)`,
        result: `fc = ${fc.toFixed(2)} Hz`,
      },
    ],
    phasors: [],
    figures: [
      {
        id: "rc_waveforms",
        kind: "cartesian",
        layout: {
          title: "RC Filter: Input vs Output Waveforms",
          xLabel: "Time (ms)",
          yLabel: "Voltage (V)",
          xRange: [0, rcTMaxMs],
          grid: true,
          legend: true,
          shapes: [{ type: "hline", y0: 0, y1: 0 }],
        },
        traces: [
          {
            type: "scatter",
            mode: "lines",
            name: "Vout(t)",
            x: tArr,
            y: voutWave,
            style: { color: "#10b981", width: 3.5 },
          },
          {
            type: "scatter",
            mode: "lines",
            name: "Vin(t)",
            x: tArr,
            y: vinWave,
            style: { color: "#3b82f6", dash: "dash", width: 2.2 },
          },
        ],
      },
      {
        id: "rc_response",
        kind: "cartesian",
        layout: {
          title: "RC Filter Frequency Response (Gain vs Frequency)",
          xLabel: "Frequency (Hz)",
          yLabel: "Gain (Vout/Vin)",
          xRange: [0, Number(fMax.toFixed(4))],
          yRange: [0, 1.08],
          grid: true,
          legend: true,
          shapes: [
            { type: "hline", y0: Math.SQRT1_2, y1: Math.SQRT1_2 },
            { type: "vline", x0: fc, x1: fc },
          ],
        },
        traces: [
          {
            type: "scatter",
            mode: "lines",
            name: "Gain",
            x: fArr,
            y: gainArr,
            style: { color: "#3b82f6", width: 2.6 },
          },
          {
            type: "scatter",
            mode: "markers",
            name: "Operating Point (f)",
            x: new Float64Array([f]),
            y: new Float64Array([energized ? gain : 0]),
            style: { color: "#10b981", markerSize: 7 },
          },
        ],
      },
    ],
    variables: [
      {
        name: "Vout",
        type: "float",
        shape: null,
        dtype: "V",
        preview: Vout.toFixed(3),
        sizeBytes: 8,
      },
      { name: "Xc", type: "float", shape: null, dtype: "Ω", preview: Xc.toFixed(2), sizeBytes: 8 },
      {
        name: "Z_total",
        type: "float",
        shape: null,
        dtype: "Ω",
        preview: Z.toFixed(2),
        sizeBytes: 8,
      },
      {
        name: "gain",
        type: "float",
        shape: null,
        dtype: "-",
        preview: gain.toFixed(4),
        sizeBytes: 8,
      },
      {
        name: "fc_Hz",
        type: "float",
        shape: null,
        dtype: "Hz",
        preview: fc.toFixed(2),
        sizeBytes: 8,
      },
      {
        name: "phase_deg",
        type: "float",
        shape: null,
        dtype: "°",
        preview: phaseDeg.toFixed(2),
        sizeBytes: 8,
      },
    ],
    observationSnapshot: {
      "f (Hz)": Number(f.toFixed(1)),
      "R (Ω)": R,
      "C (µF)": C_uF,
      "Vin (V)": Vin,
      "Vout (V)": Number(voutShown.toFixed(3)),
      Gain: Number(gain.toFixed(4)),
      "fc (Hz)": Number(fc.toFixed(2)),
      "φ (°)": Number(phaseDeg.toFixed(2)),
    },
  };
}

// ─── ELC-02: Zener Diode Characteristics ─────────────────────────────────────

function simulateZenerDiode(
  params: ExperimentParams,
  connection: ConnectionCheckResult,
  _observationRows: ObservationRow[],
): CircuitSimulationResult {
  const Vs = Math.max(0, numParam(params, "Vs", 10));
  const Rs = Math.max(1, numParam(params, "Rs", 470));
  const Vz = Math.max(0.1, numParam(params, "Vz", 5.1));

  const energized = connection.valid && connection.status === "ready";
  const vmWired = connection.wiredMeters["vm"] !== false;

  const regulating = energized && Vs >= Vz;
  const Vout = energized ? (regulating ? Vz : Vs) : 0;
  const voutShown = vmWired ? Vout : 0;
  const Iz = regulating ? (Vs - Vz) / Rs : 0;
  const Vrs = energized ? Vs - Vout : 0;

  const nPts = 200;
  const vsArr = new Float64Array(nPts);
  const izArr_mA = new Float64Array(nPts);
  const voutArr = new Float64Array(nPts);
  const sweepMax = Math.max(30, Math.ceil((Vs + 2) / 5) * 5, Math.ceil((Vz * 1.6) / 5) * 5);

  for (let i = 0; i < nPts; i++) {
    const vk = (i / (nPts - 1)) * sweepMax;
    vsArr[i] = vk;
    if (vk >= Vz) {
      izArr_mA[i] = ((vk - Vz) / Rs) * 1000;
      voutArr[i] = Vz;
    } else {
      izArr_mA[i] = 0;
      voutArr[i] = vk;
    }
  }

  const meters: CircuitMeterReading[] = [
    {
      id: "Vout",
      label: "Zener Voltage (Vout)",
      symbol: "Vout",
      value: voutShown.toFixed(3),
      unit: "V",
      tone: "brand",
      detail: vmWired
        ? regulating
          ? `Regulating at ${Vz} V`
          : "Below breakdown"
        : "Voltmeter disconnected",
    },
    {
      id: "Iz",
      label: "Zener Current (Iz)",
      symbol: "Iz",
      value: (Iz * 1000).toFixed(3),
      unit: "mA",
      tone: "emerald",
      detail: `${Iz.toFixed(5)} A`,
    },
    {
      id: "Vrs",
      label: "Resistor Drop (Rs)",
      symbol: "V_Rs",
      value: Vrs.toFixed(3),
      unit: "V",
      tone: "neutral",
      detail: `Vs − Vout = ${Vrs.toFixed(2)} V`,
    },
    {
      id: "mode_lbl",
      label: "Operating Mode",
      symbol: "Mode",
      value: regulating ? "Regulating" : "Non-conducting",
      unit: "",
      tone: regulating ? "amber" : "neutral",
      detail: regulating ? `Clamped at ${Vz} V` : `Vs (${Vs} V) < Vz (${Vz} V)`,
    },
  ];

  const explanationSummary = energized
    ? regulating
      ? `With Vs = ${Vs} V ≥ Vz = ${Vz} V, the Zener diode operates in reverse breakdown and holds Vout steady at ${Vz} V. The remaining ${Vrs.toFixed(2)} V drops across Rs, giving Iz = ${(Iz * 1000).toFixed(2)} mA.`
      : `Since Vs = ${Vs} V < Vz = ${Vz} V, the Zener diode has not reached breakdown yet and acts like an open circuit: Iz = 0 mA and Vout = Vs (${Vs.toFixed(2)} V).`
    : connection.message;

  return {
    connection,
    energized,
    regimeLabel: energized
      ? regulating
        ? `Zener Regulating at ${Vz} V`
        : "Below Breakdown (Vs < Vz)"
      : "Circuit De-energized",
    regimeTone: energized ? (regulating ? "resonant" : "idle") : "idle",
    meters,
    componentReadouts: {
      vs: `${Vs} V`,
      rs: `${Rs} Ω`,
      zener: `Vz = ${Vz} V`,
      vm: `${voutShown.toFixed(2)} V`,
    },
    explanationSummary,
    calculationSteps: [
      {
        title: "1. Check Breakdown Condition",
        formula: "If Vs ≥ Vz → Zener conducts & regulates",
        substituted: `Vs = ${Vs} V, Vz = ${Vz} V`,
        result: Vs >= Vz ? `${Vs} ≥ ${Vz} → Regulating` : `${Vs} < ${Vz} → Not conducting`,
      },
      {
        title: "2. Output Voltage",
        formula: "Vout = Vz (when regulating), else Vs",
        substituted: regulating ? `Vout = ${Vz} V` : `Vout = ${Vs} V`,
        result: `Vout = ${Vout.toFixed(3)} V`,
      },
      {
        title: "3. Zener Current",
        formula: "Iz = (Vs − Vz) / Rs",
        substituted: regulating ? `(${Vs} − ${Vz}) / ${Rs}` : "0 A (below breakdown)",
        result: `Iz = ${(Iz * 1000).toFixed(2)} mA`,
      },
    ],
    phasors: [],
    figures: [
      {
        id: "zener_vi",
        kind: "cartesian",
        layout: {
          title: "Zener Voltage Regulation (Vout vs Vs)",
          xLabel: "Supply Voltage Vs (V)",
          yLabel: "Zener Voltage Vout (V)",
          xRange: [0, sweepMax],
          grid: true,
          legend: true,
          shapes: [
            { type: "hline", y0: Vz, y1: Vz },
            { type: "vline", x0: Vz, x1: Vz },
          ],
        },
        traces: [
          {
            type: "scatter",
            mode: "lines",
            name: "Vout (V)",
            x: vsArr,
            y: voutArr,
            style: { color: "#3b82f6", width: 2.6 },
          },
          {
            type: "scatter",
            mode: "markers",
            name: "Operating Point (Vs)",
            x: new Float64Array([Vs]),
            y: new Float64Array([energized ? Vout : 0]),
            style: { color: "#10b981", markerSize: 7 },
          },
        ],
      },
      {
        id: "zener_current",
        kind: "cartesian",
        layout: {
          title: "Zener Current Iz vs Supply Voltage",
          xLabel: "Supply Voltage Vs (V)",
          yLabel: "Zener Current Iz (mA)",
          xRange: [0, sweepMax],
          grid: true,
          legend: true,
          shapes: [
            { type: "hline", y0: 0, y1: 0 },
            { type: "vline", x0: Vz, x1: Vz },
          ],
        },
        traces: [
          {
            type: "scatter",
            mode: "lines",
            name: "Iz (mA)",
            x: vsArr,
            y: izArr_mA,
            style: { color: "#ef4444", width: 2.6 },
          },
          {
            type: "scatter",
            mode: "markers",
            name: "Operating Point (Vs)",
            x: new Float64Array([Vs]),
            y: new Float64Array([Iz * 1000]),
            style: { color: "#10b981", markerSize: 7 },
          },
        ],
      },
    ],
    variables: [
      {
        name: "Vout",
        type: "float",
        shape: null,
        dtype: "V",
        preview: Vout.toFixed(3),
        sizeBytes: 8,
      },
      {
        name: "Iz_mA",
        type: "float",
        shape: null,
        dtype: "mA",
        preview: (Iz * 1000).toFixed(3),
        sizeBytes: 8,
      },
      {
        name: "V_Rs",
        type: "float",
        shape: null,
        dtype: "V",
        preview: Vrs.toFixed(3),
        sizeBytes: 8,
      },
      {
        name: "regulating",
        type: "float",
        shape: null,
        dtype: "-",
        preview: regulating ? "1" : "0",
        sizeBytes: 8,
      },
    ],
    observationSnapshot: {
      "Vs (V)": Vs,
      "Rs (Ω)": Rs,
      "Vz (V)": Vz,
      "Vout (V)": Number(voutShown.toFixed(3)),
      "Iz (mA)": Number((Iz * 1000).toFixed(3)),
      "V_Rs (V)": Number(Vrs.toFixed(3)),
      Regulating: regulating ? 1 : 0,
    },
  };
}
