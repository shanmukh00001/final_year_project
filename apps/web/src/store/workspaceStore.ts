import { create } from "zustand";
import {
  type VariableInfo,
  type FigureSpec,
  type ParamDecl,
  type ParamValue,
  type PyError,
  MAX_CONSOLE_LINES,
} from "@vlab/shared";
import { saveLocalDraft, getLocalDraft, getLocalDraftSync } from "../lib/idb/drafts.js";
import { getExperimentById } from "../data/curriculum/index.js";
import { buildBlueprint } from "../engine/circuitBlueprints.js";
import { simulateCircuit, validateCircuitConnections } from "../engine/circuitSolver.js";
import {
  type CircuitComponent,
  type CircuitSimulationResult,
  type CircuitWire,
  type ObservationRow,
  type TerminalRef,
} from "../engine/circuitTypes.js";

export type EngineStatus =
  | "uninitialized"
  | "booting"
  | "ready"
  | "running"
  | "cancelling"
  | "error";

export type VlabSectionTab = "simulation" | "aim" | "theory" | "procedure" | "pretest" | "posttest";

export type CircuitTool = "select" | "wire" | "delete_wire";

export interface ConsoleLine {
  id: string;
  stream: "stdout" | "stderr" | "system" | "warning";
  text: string;
  timestamp: number;
}

export interface WorkspaceState {
  experimentId: string;
  code: string;
  engineStatus: EngineStatus;
  bootProgress: { percent: number; stage: string; message: string };
  consoleLines: ConsoleLine[];
  variables: VariableInfo[];
  figures: FigureSpec[];
  activeFigureId: string | null;
  params: Record<string, ParamValue>;
  declaredParams: Record<string, ParamDecl>;
  liveRun: boolean;
  activeError: PyError | null;
  lastRunElapsedMs: number | null;
  unsavedChanges: boolean;
  engineRuntimeInfo: {
    pythonVersion: string;
    pyodideVersion: string;
    numpy: string;
    scipy: string;
  } | null;

  // Circuit Maker & Simulation state
  activeVlabTab: VlabSectionTab;
  activeTool: CircuitTool;
  selectedComponentId: string | null;
  pendingTerminal: TerminalRef | null;
  components: CircuitComponent[];
  wires: CircuitWire[];
  simulation: CircuitSimulationResult | null;
  observationRows: ObservationRow[];

  // Actions
  initWorkspace: (experimentId: string, initialCode?: string) => void;
  loadExperiment: (id: string) => void;
  setCode: (code: string) => void;
  saveCurrentDraft: () => void;
  setLiveRun: (enabled: boolean) => void;
  setParamValue: (name: string, value: ParamValue) => void;
  resetParamsToDefault: () => void;
  runCode: () => void;
  stopExecution: () => void;
  restartKernel: () => void;
  clearConsole: () => void;
  setActiveFigure: (id: string) => void;
  exportCode: () => string;
  exportWorkspaceJson: () => string;

  // Circuit Maker actions
  setActiveVlabTab: (tab: VlabSectionTab) => void;
  setActiveTool: (tool: CircuitTool) => void;
  setSelectedComponent: (compId: string | null) => void;
  moveComponent: (compId: string, x: number, y: number) => void;
  toggleComponentPresent: (compId: string) => void;
  clickTerminal: (ref: TerminalRef) => void;
  deleteWire: (wireId: string) => void;
  autoWireCircuit: () => void;
  clearAllWires: () => void;
  checkConnections: () => void;
  simulate: () => void;
  recordObservation: () => void;
  autoSweepObservations: () => void;
  clearObservations: () => void;
}

let autosaveTimeout: ReturnType<typeof setTimeout> | null = null;
let liveRunDebounceTimeout: ReturnType<typeof setTimeout> | null = null;

function buildDeclaredParamsMap(expId: string): {
  declared: Record<string, ParamDecl>;
  defaults: Record<string, ParamValue>;
} {
  const exp = getExperimentById(expId);
  const declared: Record<string, ParamDecl> = {};
  const defaults: Record<string, ParamValue> = {};
  if (exp?.parameters) {
    for (const p of exp.parameters) {
      declared[p.name] = p;
      defaults[p.name] = p.default;
    }
  }
  return { declared, defaults };
}

function getInitialActiveExperimentId(): string {
  try {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const urlExp = urlParams.get("exp");
      if (urlExp && getExperimentById(urlExp)) {
        return urlExp;
      }
      const storedExp = localStorage.getItem("vlab_active_experiment");
      if (storedExp && getExperimentById(storedExp)) {
        return storedExp;
      }
    }
  } catch {
    // Ignore storage errors
  }
  return "NT-01";
}

function computeInitialState(expId: string) {
  const exp = getExperimentById(expId);
  const syncDraft = getLocalDraftSync(expId);
  const { declared, defaults } = buildDeclaredParamsMap(expId);
  const params: Record<string, ParamValue> = syncDraft
    ? { ...defaults, ...(syncDraft.params as Record<string, ParamValue>) }
    : defaults;
  const mode = typeof params["mode"] === "string" ? params["mode"] : undefined;
  const bp = buildBlueprint(expId, mode);
  const sim = simulateCircuit(expId, params, bp.components, bp.defaultWires, []);

  return {
    exp,
    declared,
    params,
    bp,
    sim,
  };
}

const initialBootExpId = getInitialActiveExperimentId();
const bootData = computeInitialState(initialBootExpId);

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  experimentId: initialBootExpId,
  code: bootData.exp?.starterCode || `# ${initialBootExpId}`,
  engineStatus: "ready",
  bootProgress: { percent: 100, stage: "ready", message: "Circuit Simulator Ready" },
  consoleLines: [
    {
      id: "boot-ready",
      stream: "system",
      text: `>>> IIT (ISM) Dhanbad Virtual Lab Circuit Simulator Ready · ${bootData.exp?.title || initialBootExpId}`,
      timestamp: Date.now(),
    },
  ],
  variables: bootData.sim.variables,
  figures: bootData.sim.figures,
  activeFigureId: bootData.sim.figures[0]?.id || null,
  params: bootData.params,
  declaredParams: bootData.declared,
  liveRun: true,
  activeError: null,
  lastRunElapsedMs: 1,
  unsavedChanges: false,
  engineRuntimeInfo: null,

  activeVlabTab: "simulation",
  activeTool: "select",
  selectedComponentId: null,
  pendingTerminal: null,
  components: bootData.bp.components,
  wires: bootData.bp.defaultWires,
  simulation: bootData.sim,
  observationRows: [],

  initWorkspace: (experimentId: string, initialCode?: string) => {
    const validId = getExperimentById(experimentId) ? experimentId : "NT-01";
    const data = computeInitialState(validId);

    set({
      experimentId: validId,
      code: initialCode || data.exp?.starterCode || "",
      params: data.params,
      declaredParams: data.declared,
      components: data.bp.components,
      wires: data.bp.defaultWires,
      simulation: data.sim,
      figures: data.sim.figures,
      variables: data.sim.variables,
      activeFigureId: data.sim.figures[0]?.id || null,
      engineStatus: "ready",
      bootProgress: { percent: 100, stage: "ready", message: "Circuit Simulator Ready" },
      lastRunElapsedMs: 1,
    });

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("vlab_active_experiment", validId);
        const url = new URL(window.location.href);
        if (url.searchParams.get("exp") !== validId) {
          url.searchParams.set("exp", validId);
          window.history.replaceState({}, "", url.toString());
        }
      } catch {
        // Ignore storage or history errors
      }
    }

    void getLocalDraft(validId).then((draft) => {
      if (draft && draft.experimentId === validId && get().experimentId === validId) {
        const mergedParams = {
          ...data.params,
          ...(draft.params as Record<string, ParamValue>),
        };
        const mode = typeof mergedParams["mode"] === "string" ? mergedParams["mode"] : undefined;
        const bp = buildBlueprint(validId, mode);
        const sim = simulateCircuit(validId, mergedParams, bp.components, bp.defaultWires, []);
        set({
          params: mergedParams,
          components: bp.components,
          wires: bp.defaultWires,
          simulation: sim,
          figures: sim.figures,
          variables: sim.variables,
          activeFigureId: sim.figures[0]?.id || null,
        });
      }
    });
  },

  loadExperiment: (id: string) => {
    get().saveCurrentDraft();
    if (liveRunDebounceTimeout) {
      clearTimeout(liveRunDebounceTimeout);
      liveRunDebounceTimeout = null;
    }

    const validId = getExperimentById(id) ? id : "NT-01";
    const data = computeInitialState(validId);

    set({
      experimentId: validId,
      activeVlabTab: "simulation",
      code: data.exp?.starterCode || "",
      params: data.params,
      declaredParams: data.declared,
      components: data.bp.components,
      wires: data.bp.defaultWires,
      simulation: data.sim,
      figures: data.sim.figures,
      variables: data.sim.variables,
      activeFigureId: data.sim.figures[0]?.id || null,
      observationRows: [],
      selectedComponentId: null,
      pendingTerminal: null,
      activeError: null,
      unsavedChanges: false,
      consoleLines: [
        ...get().consoleLines,
        {
          id: `${Date.now()}-load`,
          stream: "system" as const,
          text: `>>> Loaded Experiment ${validId}: ${data.exp?.title || validId}`,
          timestamp: Date.now(),
        },
      ].slice(-MAX_CONSOLE_LINES),
    });

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("vlab_active_experiment", validId);
        const url = new URL(window.location.href);
        if (url.searchParams.get("exp") !== validId) {
          url.searchParams.set("exp", validId);
          window.history.replaceState({}, "", url.toString());
        }
      } catch {
        // Ignore storage or history errors
      }
    }
  },

  setCode: (code: string) => {
    set({ code, unsavedChanges: true });
    if (autosaveTimeout) {
      clearTimeout(autosaveTimeout);
    }
    autosaveTimeout = setTimeout(() => {
      get().saveCurrentDraft();
    }, 800);
  },

  saveCurrentDraft: () => {
    if (autosaveTimeout) {
      clearTimeout(autosaveTimeout);
      autosaveTimeout = null;
    }
    const state = get();
    void saveLocalDraft({
      experimentId: state.experimentId,
      code: state.code,
      params: state.params,
      updatedAt: Date.now(),
    });
    set({ unsavedChanges: false });
  },

  setLiveRun: (enabled: boolean) => {
    set({ liveRun: enabled });
    if (enabled) {
      get().simulate();
    }
  },

  setParamValue: (name: string, value: ParamValue) => {
    const state = get();
    const updatedParams = { ...state.params, [name]: value };

    if (name === "mode") {
      const bp = buildBlueprint(state.experimentId, String(value));
      set({
        params: updatedParams,
        components: bp.components,
        wires: bp.defaultWires,
        pendingTerminal: null,
        selectedComponentId: null,
        unsavedChanges: true,
      });
      get().simulate();
    } else {
      set({ params: updatedParams, unsavedChanges: true });
      if (state.liveRun) {
        if (liveRunDebounceTimeout) {
          clearTimeout(liveRunDebounceTimeout);
        }
        liveRunDebounceTimeout = setTimeout(() => {
          get().runCode();
        }, 40);
      }
    }

    if (autosaveTimeout) {
      clearTimeout(autosaveTimeout);
    }
    autosaveTimeout = setTimeout(() => {
      get().saveCurrentDraft();
    }, 800);
  },

  resetParamsToDefault: () => {
    const state = get();
    const { defaults } = buildDeclaredParamsMap(state.experimentId);
    const mode = typeof defaults["mode"] === "string" ? defaults["mode"] : undefined;
    const bp = buildBlueprint(state.experimentId, mode);
    set({
      params: defaults,
      components: bp.components,
      wires: bp.defaultWires,
      pendingTerminal: null,
      unsavedChanges: true,
    });
    get().simulate();
  },

  runCode: () => {
    get().simulate();
  },

  stopExecution: () => {
    set({ engineStatus: "ready" });
  },

  restartKernel: () => {
    get().resetParamsToDefault();
    set({
      consoleLines: [
        {
          id: `${Date.now()}-reset`,
          stream: "system",
          text: ">>> Circuit bench reset to default parameters and connections.",
          timestamp: Date.now(),
        },
      ],
    });
  },

  clearConsole: () => {
    set({ consoleLines: [] });
  },

  setActiveFigure: (id: string) => {
    set({ activeFigureId: id });
  },

  exportCode: () => {
    return get().code;
  },

  exportWorkspaceJson: () => {
    const state = get();
    return JSON.stringify(
      {
        experimentId: state.experimentId,
        params: state.params,
        wires: state.wires,
        observations: state.observationRows,
        exportedAt: new Date().toISOString(),
      },
      null,
      2,
    );
  },

  setActiveVlabTab: (tab: VlabSectionTab) => set({ activeVlabTab: tab }),

  setActiveTool: (tool: CircuitTool) => set({ activeTool: tool, pendingTerminal: null }),

  setSelectedComponent: (compId: string | null) => set({ selectedComponentId: compId }),

  moveComponent: (compId: string, x: number, y: number) => {
    const clampedX = Math.max(55, Math.min(745, Math.round(x / 5) * 5));
    const clampedY = Math.max(55, Math.min(385, Math.round(y / 5) * 5));
    set((state) => ({
      components: state.components.map((c) =>
        c.id === compId ? { ...c, x: clampedX, y: clampedY } : c,
      ),
    }));
  },

  toggleComponentPresent: (compId: string) => {
    const state = get();
    const target = state.components.find((c) => c.id === compId);
    if (!target) {
      return;
    }
    const nextPresent = !target.present;
    const nextComponents = state.components.map((c) =>
      c.id === compId ? { ...c, present: nextPresent } : c,
    );
    const nextWires = nextPresent
      ? state.wires
      : state.wires.filter((w) => w.from.compId !== compId && w.to.compId !== compId);

    set({ components: nextComponents, wires: nextWires });
    if (state.liveRun) {
      get().simulate();
    }
  },

  clickTerminal: (ref: TerminalRef) => {
    const state = get();
    const pending = state.pendingTerminal;
    if (!pending) {
      set({ pendingTerminal: ref, activeTool: "wire" });
      return;
    }
    if (pending.compId === ref.compId && pending.terminalId === ref.terminalId) {
      set({ pendingTerminal: null });
      return;
    }
    if (pending.compId === ref.compId) {
      // Do not allow shorting a component to itself via single click unless intentional; switch pending
      set({ pendingTerminal: ref });
      return;
    }
    const alreadyExists = state.wires.some(
      (w) =>
        (w.from.compId === pending.compId &&
          w.from.terminalId === pending.terminalId &&
          w.to.compId === ref.compId &&
          w.to.terminalId === ref.terminalId) ||
        (w.to.compId === pending.compId &&
          w.to.terminalId === pending.terminalId &&
          w.from.compId === ref.compId &&
          w.from.terminalId === ref.terminalId),
    );
    if (alreadyExists) {
      set({ pendingTerminal: null });
      return;
    }
    const newWire: CircuitWire = {
      id: `w-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      from: pending,
      to: ref,
    };
    const nextWires = [...state.wires, newWire];
    set({ wires: nextWires, pendingTerminal: null });
    if (state.liveRun) {
      get().simulate();
    }
  },

  deleteWire: (wireId: string) => {
    const state = get();
    const nextWires = state.wires.filter((w) => w.id !== wireId);
    set({ wires: nextWires });
    if (state.liveRun) {
      get().simulate();
    }
  },

  autoWireCircuit: () => {
    const state = get();
    const mode = typeof state.params["mode"] === "string" ? state.params["mode"] : undefined;
    const bp = buildBlueprint(state.experimentId, mode);
    set({
      components: bp.components,
      wires: bp.defaultWires,
      pendingTerminal: null,
      consoleLines: [
        ...state.consoleLines,
        {
          id: `${Date.now()}-autowire`,
          stream: "system" as const,
          text: ">>> Auto-wired standard IIT (ISM) Dhanbad circuit schematic.",
          timestamp: Date.now(),
        },
      ].slice(-MAX_CONSOLE_LINES),
    });
    get().simulate();
  },

  clearAllWires: () => {
    const state = get();
    set({
      wires: [],
      pendingTerminal: null,
      consoleLines: [
        ...state.consoleLines,
        {
          id: `${Date.now()}-clearwires`,
          stream: "warning" as const,
          text: ">>> Cleared all wires. Click component terminals in Wire mode to connect the circuit, or click Auto-Wire.",
          timestamp: Date.now(),
        },
      ].slice(-MAX_CONSOLE_LINES),
    });
    get().simulate();
  },

  checkConnections: () => {
    const state = get();
    const check = validateCircuitConnections(
      state.experimentId,
      state.params,
      state.components,
      state.wires,
    );
    const line: ConsoleLine = {
      id: `${Date.now()}-chk`,
      stream: check.valid ? "system" : "stderr",
      text: `>>> Check Connections [${check.title}]: ${check.message}`,
      timestamp: Date.now(),
    };
    set({
      consoleLines: [...state.consoleLines, line].slice(-MAX_CONSOLE_LINES),
    });
    get().simulate();
  },

  simulate: () => {
    const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
    const state = get();
    const sim = simulateCircuit(
      state.experimentId,
      state.params,
      state.components,
      state.wires,
      state.observationRows,
    );
    const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();
    const elapsedMs = Math.max(1, t1 - t0);

    const activeFigValid = sim.figures.some((f) => f.id === state.activeFigureId);
    const nextFigId = activeFigValid ? state.activeFigureId : sim.figures[0]?.id || null;

    set({
      simulation: sim,
      figures: sim.figures,
      variables: sim.variables,
      activeFigureId: nextFigId,
      lastRunElapsedMs: elapsedMs,
      engineStatus: "ready",
    });
  },

  recordObservation: () => {
    const state = get();
    const sim =
      state.simulation ||
      simulateCircuit(
        state.experimentId,
        state.params,
        state.components,
        state.wires,
        state.observationRows,
      );
    if (!sim.energized) {
      set({
        consoleLines: [
          ...state.consoleLines,
          {
            id: `${Date.now()}-obs-err`,
            stream: "warning" as const,
            text: ">>> Cannot record reading: verify circuit connections and close Switch first.",
            timestamp: Date.now(),
          },
        ].slice(-MAX_CONSOLE_LINES),
      });
      return;
    }
    const row: ObservationRow = {
      id: `obs-${Date.now()}-${state.observationRows.length + 1}`,
      timestamp: Date.now(),
      experimentId: state.experimentId,
      mode: String(state.params["mode"] || "default"),
      values: sim.observationSnapshot,
    };
    const nextRows = [...state.observationRows, row];
    set({
      observationRows: nextRows,
      consoleLines: [
        ...state.consoleLines,
        {
          id: `${Date.now()}-obs-ok`,
          stream: "stdout" as const,
          text: `>>> Recorded Trial #${nextRows.length}: ${Object.entries(row.values)
            .map(([k, v]) => `${k}=${v}`)
            .join(", ")}`,
          timestamp: Date.now(),
        },
      ].slice(-MAX_CONSOLE_LINES),
    });
    get().simulate();
  },

  autoSweepObservations: () => {
    const state = get();
    const rows: ObservationRow[] = [];
    if (state.experimentId === "BEE-01") {
      const voltages = [2, 5, 10, 15, 20];
      for (let i = 0; i < voltages.length; i++) {
        const v = voltages[i]!;
        const p: Record<string, ParamValue> = { ...state.params, Vdc: v, switchClosed: true };
        const s = simulateCircuit(state.experimentId, p, state.components, state.wires, []);
        if (s.energized) {
          rows.push({
            id: `sweep-${Date.now()}-${i}`,
            timestamp: Date.now() + i,
            experimentId: state.experimentId,
            mode: String(p["mode"] || "single"),
            values: s.observationSnapshot,
          });
        }
      }
    } else if (state.experimentId === "NT-01") {
      const caps = [20, 35, 55, 80, 140];
      for (let i = 0; i < caps.length; i++) {
        const c = caps[i]!;
        const p: Record<string, ParamValue> = { ...state.params, C: c, switchClosed: true };
        const s = simulateCircuit(state.experimentId, p, state.components, state.wires, []);
        if (s.energized) {
          rows.push({
            id: `sweep-${Date.now()}-${i}`,
            timestamp: Date.now() + i,
            experimentId: state.experimentId,
            mode: String(p["mode"] || "RLC"),
            values: s.observationSnapshot,
          });
        }
      }
    } else if (state.experimentId === "ELC-01") {
      const freqs = [20, 100, 160, 500, 2000];
      for (let i = 0; i < freqs.length; i++) {
        const freq = freqs[i]!;
        const p: Record<string, ParamValue> = { ...state.params, f: freq };
        const s = simulateCircuit(state.experimentId, p, state.components, state.wires, []);
        if (s.energized) {
          rows.push({
            id: `sweep-${Date.now()}-${i}`,
            timestamp: Date.now() + i,
            experimentId: state.experimentId,
            mode: String(p["mode"] || "rc_filter"),
            values: s.observationSnapshot,
          });
        }
      }
    } else {
      const voltages = [2, 4, 6, 10, 15];
      for (let i = 0; i < voltages.length; i++) {
        const v = voltages[i]!;
        const p: Record<string, ParamValue> = { ...state.params, Vs: v };
        const s = simulateCircuit(state.experimentId, p, state.components, state.wires, []);
        if (s.energized) {
          rows.push({
            id: `sweep-${Date.now()}-${i}`,
            timestamp: Date.now() + i,
            experimentId: state.experimentId,
            mode: String(p["mode"] || "zener"),
            values: s.observationSnapshot,
          });
        }
      }
    }

    if (rows.length > 0) {
      set({ observationRows: [...state.observationRows, ...rows] });
      get().simulate();
    }
  },

  clearObservations: () => {
    set({ observationRows: [] });
    get().simulate();
  },
}));

if (typeof window !== "undefined") {
  (
    window as unknown as { __vlab_workspace_store: typeof useWorkspaceStore }
  ).__vlab_workspace_store = useWorkspaceStore;

  window.addEventListener("beforeunload", () => {
    useWorkspaceStore.getState().saveCurrentDraft();
  });
  window.addEventListener("pagehide", () => {
    useWorkspaceStore.getState().saveCurrentDraft();
  });
}
