import { type FigureSpec, type ParamValue, type VariableInfo } from "@vlab/shared";

export type CircuitComponentKind =
  | "ac_source"
  | "dc_source"
  | "switch"
  | "ammeter"
  | "voltmeter"
  | "wattmeter"
  | "resistor"
  | "inductor"
  | "capacitor"
  | "diode"
  | "ground";

export interface CircuitTerminal {
  id: string;
  label: string;
  /** Offset relative to component center (x, y) in SVG viewBox coordinates */
  dx: number;
  dy: number;
}

export interface CircuitComponent {
  id: string;
  kind: CircuitComponentKind;
  name: string;
  symbol: string;
  x: number;
  y: number;
  orientation: "h" | "v";
  terminals: CircuitTerminal[];
  /** Primary user-editable parameter key in params store */
  paramKey?: string;
  /** Secondary parameter key (e.g. frequency f on AC source, or internal resistance rL) */
  secondaryParamKey?: string;
  unit?: string;
  /** If false, component is required for the active circuit mode */
  optional?: boolean;
  /** Whether component is currently placed on the circuit board */
  present: boolean;
  /** For voltmeters: which component ID it measures across */
  measuresAcross?: string;
  /** Optional display badge override */
  valueText?: string;
}

export interface TerminalRef {
  compId: string;
  terminalId: string;
}

export interface CircuitWire {
  id: string;
  from: TerminalRef;
  to: TerminalRef;
}

export interface CircuitBlueprint {
  experimentId: string;
  mode: string;
  components: CircuitComponent[];
  defaultWires: CircuitWire[];
  /** Ordered sequence of terminal pairs defining the main series closed loop */
  requiredSeriesPairs: Array<[TerminalRef, TerminalRef]>;
}

export interface ConnectionCheckResult {
  valid: boolean;
  status: "ready" | "open_switch" | "incomplete" | "short_circuit";
  title: string;
  message: string;
  diagnostics: string[];
  wiredMeters: Record<string, boolean>;
}

export interface CircuitMeterReading {
  id: string;
  label: string;
  symbol: string;
  value: string;
  unit: string;
  tone?: "brand" | "emerald" | "amber" | "danger" | "neutral";
  detail?: string;
}

export interface PhasorVector {
  id: string;
  label: string;
  magnitude: number;
  angleDeg: number;
  color: string;
  unit: string;
}

export interface CalculationStep {
  title: string;
  formula: string;
  substituted: string;
  result: string;
}

export interface ObservationRow {
  id: string;
  timestamp: number;
  experimentId: string;
  mode: string;
  values: Record<string, string | number>;
}

export interface CircuitSimulationResult {
  connection: ConnectionCheckResult;
  energized: boolean;
  regimeLabel: string;
  regimeTone: "inductive" | "capacitive" | "resonant" | "ohmic" | "non_ohmic" | "verified" | "idle";
  meters: CircuitMeterReading[];
  componentReadouts: Record<string, string>;
  explanationSummary: string;
  calculationSteps: CalculationStep[];
  phasors: PhasorVector[];
  figures: FigureSpec[];
  variables: VariableInfo[];
  observationSnapshot: Record<string, string | number>;
}

export type ExperimentParams = Record<string, ParamValue>;
