import { create } from "zustand";
import {
  type VariableInfo,
  type FigureSpec,
  type ParamDecl,
  type ParamValue,
  type PyError,
  type WorkerToMain,
  MAX_CONSOLE_LINES,
} from "@vlab/shared";
import { WorkerManager } from "../engine/WorkerManager.js";
import { saveLocalDraft, getLocalDraft, getLocalDraftSync } from "../lib/idb/drafts.js";

import { getExperimentById } from "../data/curriculum/index.js";

export type EngineStatus =
  | "uninitialized"
  | "booting"
  | "ready"
  | "running"
  | "cancelling"
  | "error";

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
  /** Populated from ENGINE_READY — reflects the actual running Python / package versions. */
  engineRuntimeInfo: {
    pythonVersion: string;
    pyodideVersion: string;
    numpy: string;
    scipy: string;
  } | null;

  // Actions
  initWorkspace: (experimentId: string, initialCode?: string) => void;
  loadExperiment: (id: string) => void;
  setCode: (code: string) => void;
  saveCurrentDraft: () => void;
  setLiveRun: (enabled: boolean) => void;
  setParamValue: (name: string, value: ParamValue) => void;
  runCode: () => void;
  stopExecution: () => void;
  restartKernel: () => void;
  clearConsole: () => void;
  setActiveFigure: (id: string) => void;
  exportCode: () => string;
  exportWorkspaceJson: () => string;
}

let workerManagerInstance: WorkerManager | null = null;
let autosaveTimeout: ReturnType<typeof setTimeout> | null = null;
let liveRunDebounceTimeout: ReturnType<typeof setTimeout> | null = null;

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
  return "DSP-03";
}

const initialBootExpId = getInitialActiveExperimentId();
const initialBootExp = getExperimentById(initialBootExpId);
const initialBootDraft = getLocalDraftSync(initialBootExpId);
const initialBootCode = initialBootDraft
  ? initialBootDraft.code
  : initialBootExp?.starterCode || `# Experiment ${initialBootExpId}`;
const initialBootParams: Record<string, ParamValue> = initialBootDraft
  ? (initialBootDraft.params as Record<string, ParamValue>)
  : {};

if (initialBootExp && initialBootExp.parameters && !initialBootDraft) {
  for (const p of initialBootExp.parameters) {
    initialBootParams[p.name] = p.default;
  }
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  experimentId: initialBootExpId,
  code: initialBootCode,
  engineStatus: "uninitialized",
  bootProgress: { percent: 0, stage: "", message: "" },
  consoleLines: [],
  variables: [],
  figures: [],
  activeFigureId: null,
  params: initialBootParams,
  declaredParams: {},
  liveRun: false,
  activeError: null,
  lastRunElapsedMs: null,
  unsavedChanges: false,
  engineRuntimeInfo: null,

  initWorkspace: (experimentId: string, initialCode?: string) => {
    // Check synchronous draft from localStorage first for instant hydration
    const syncDraft = getLocalDraftSync(experimentId);
    const exp = getExperimentById(experimentId);
    const starter = initialCode || exp?.starterCode || get().code;

    const initialCodeToUse = syncDraft ? syncDraft.code : starter;
    const initialParams: Record<string, ParamValue> = syncDraft
      ? (syncDraft.params as Record<string, ParamValue>)
      : {};

    if (exp && exp.parameters && !syncDraft) {
      for (const p of exp.parameters) {
        initialParams[p.name] = p.default;
      }
    }

    set({
      experimentId,
      code: initialCodeToUse,
      params: initialParams,
      engineStatus: "booting",
      consoleLines: [
        {
          id: `${Date.now()}-boot`,
          stream: "system",
          text: ">>> Initializing V-Lab Simulation Engine...",
          timestamp: Date.now(),
        },
      ],
    });

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("vlab_active_experiment", experimentId);
        const url = new URL(window.location.href);
        if (url.searchParams.get("exp") !== experimentId) {
          url.searchParams.set("exp", experimentId);
          window.history.replaceState({}, "", url.toString());
        }
      } catch {
        // Ignore storage or history errors
      }
    }

    // Also double check IndexedDB draft
    void getLocalDraft(experimentId).then((draft) => {
      if (draft && draft.experimentId === experimentId && get().experimentId === experimentId) {
        set({
          code: draft.code,
          params: draft.params as Record<string, ParamValue>,
        });
      }
    });

    if (!workerManagerInstance) {
      workerManagerInstance = new WorkerManager();

      workerManagerInstance.onMessage((msg: WorkerToMain) => {
        const state = get();

        switch (msg.type) {
          case "ENGINE_PROGRESS":
            set({
              bootProgress: {
                percent: msg.percent,
                stage: msg.stage,
                message: msg.message,
              },
            });
            break;

          case "ENGINE_READY": {
            const numpyVer = msg.packages ? msg.packages["numpy"] : undefined;
            const scipyVer = msg.packages ? msg.packages["scipy"] : undefined;
            const sysLine: ConsoleLine = {
              id: `${Date.now()}-ready`,
              stream: "system",
              text: `>>> Engine Ready (Python ${msg.pythonVersion} · NumPy ${numpyVer ?? "?"} · SciPy ${scipyVer ?? "?"})`,
              timestamp: Date.now(),
            };
            set({
              engineStatus: "ready",
              engineRuntimeInfo: {
                pythonVersion: msg.pythonVersion,
                pyodideVersion: msg.pyodideVersion,
                numpy: numpyVer ?? "unknown",
                scipy: scipyVer ?? "unknown",
              },
              consoleLines: [...state.consoleLines, sysLine].slice(-MAX_CONSOLE_LINES),
            });
            break;
          }

          case "ENGINE_ERROR": {
            const errLine: ConsoleLine = {
              id: `${Date.now()}-err`,
              stream: "stderr",
              text: `>>> Engine Error: ${msg.error.message}`,
              timestamp: Date.now(),
            };
            set({
              engineStatus: "error",
              activeError: msg.error,
              consoleLines: [...state.consoleLines, errLine].slice(-MAX_CONSOLE_LINES),
            });
            break;
          }

          case "STREAM_OUTPUT": {
            const newLine: ConsoleLine = {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              stream: msg.stream,
              text: msg.text,
              timestamp: Date.now(),
            };
            set({
              consoleLines: [...state.consoleLines, newLine].slice(-MAX_CONSOLE_LINES),
            });
            break;
          }

          case "PARAM_DECLARED": {
            const existingParam = state.params[msg.param.name];
            set({
              declaredParams: {
                ...state.declaredParams,
                [msg.param.name]: msg.param,
              },
              params: {
                ...state.params,
                [msg.param.name]: existingParam !== undefined ? existingParam : msg.param.default,
              },
            });
            break;
          }

          case "FIGURE_READY": {
            const existingIdx = state.figures.findIndex((f) => f.id === msg.figure.id);
            let updatedFigures: FigureSpec[];
            if (existingIdx >= 0) {
              updatedFigures = [...state.figures];
              updatedFigures[existingIdx] = msg.figure;
            } else {
              updatedFigures = [...state.figures, msg.figure];
            }
            set({
              figures: updatedFigures,
              activeFigureId: state.activeFigureId || msg.figure.id,
            });
            break;
          }

          case "VARIABLES_UPDATED":
            set({
              variables: msg.variables,
            });
            break;

          case "RUN_COMPLETED": {
            const compLine: ConsoleLine = {
              id: `${Date.now()}-comp`,
              stream: "system",
              text: `>>> Run finished in ${Math.round(msg.elapsedMs)} ms`,
              timestamp: Date.now(),
            };
            set({
              engineStatus: "ready",
              lastRunElapsedMs: msg.elapsedMs,
              activeError: null,
              consoleLines: [...state.consoleLines, compLine].slice(-MAX_CONSOLE_LINES),
            });
            break;
          }

          case "RUN_FAILED": {
            const failLine: ConsoleLine = {
              id: `${Date.now()}-fail`,
              stream: "stderr",
              text: `${msg.error.name}: ${msg.error.message}\n${msg.error.traceback}`,
              timestamp: Date.now(),
            };
            set({
              engineStatus: "ready",
              lastRunElapsedMs: msg.elapsedMs,
              activeError: msg.error,
              consoleLines: [...state.consoleLines, failLine].slice(-MAX_CONSOLE_LINES),
            });
            break;
          }

          case "RUN_CANCELLED": {
            const cancelLine: ConsoleLine = {
              id: `${Date.now()}-cancel`,
              stream: "warning",
              text: ">>> Execution cancelled.",
              timestamp: Date.now(),
            };
            set({
              engineStatus: "ready",
              lastRunElapsedMs: msg.elapsedMs,
              consoleLines: [...state.consoleLines, cancelLine].slice(-MAX_CONSOLE_LINES),
            });
            break;
          }

          default:
            break;
        }
      });
    }

    workerManagerInstance.init();
  },

  loadExperiment: (id: string) => {
    // Flush draft for current experiment before switching
    get().saveCurrentDraft();

    if (liveRunDebounceTimeout) {
      clearTimeout(liveRunDebounceTimeout);
      liveRunDebounceTimeout = null;
    }

    // Abort an in-progress run so the new experiment starts clean.
    const { engineStatus } = get();
    if ((engineStatus === "running" || engineStatus === "cancelling") && workerManagerInstance) {
      workerManagerInstance.stop();
    }

    const syncDraft = getLocalDraftSync(id);
    const exp = getExperimentById(id);
    const starter = exp ? exp.starterCode : `# Experiment ${id}`;
    const initialCode = syncDraft ? syncDraft.code : starter;
    const initialParams: Record<string, ParamValue> = syncDraft
      ? (syncDraft.params as Record<string, ParamValue>)
      : {};

    if (exp && exp.parameters && !syncDraft) {
      for (const p of exp.parameters) {
        initialParams[p.name] = p.default;
      }
    }

    set({
      experimentId: id,
      code: initialCode,
      figures: [],
      variables: [],
      activeFigureId: null,
      params: initialParams,
      declaredParams: {},
      activeError: null,
      unsavedChanges: false,
      consoleLines: [
        ...get().consoleLines,
        {
          id: `${Date.now()}-load`,
          stream: "system" as const,
          text: `>>> Loaded experiment ${id}: ${exp?.title || id}`,
          timestamp: Date.now(),
        },
      ].slice(-MAX_CONSOLE_LINES),
    });

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("vlab_active_experiment", id);
        const url = new URL(window.location.href);
        if (url.searchParams.get("exp") !== id) {
          url.searchParams.set("exp", id);
          window.history.replaceState({}, "", url.toString());
        }
      } catch {
        // Ignore storage or history errors
      }
    }

    // Check IndexedDB draft for this experiment — only apply if it matches
    void getLocalDraft(id).then((draft) => {
      // Guard: ensure the experiment hasn't changed again since this async call started
      if (draft && draft.experimentId === id && get().experimentId === id) {
        set({
          code: draft.code,
          params: draft.params as Record<string, ParamValue>,
        });
      }
    });
  },

  setCode: (code: string) => {
    set({ code, unsavedChanges: true });

    // Debounced autosave to localStorage and IndexedDB (1s)
    if (autosaveTimeout) {
      clearTimeout(autosaveTimeout);
    }
    autosaveTimeout = setTimeout(() => {
      get().saveCurrentDraft();
    }, 1000);
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
  },

  setParamValue: (name: string, value: ParamValue) => {
    const updatedParams = { ...get().params, [name]: value };
    set({ params: updatedParams });

    if (get().liveRun) {
      if (liveRunDebounceTimeout) {
        clearTimeout(liveRunDebounceTimeout);
      }
      liveRunDebounceTimeout = setTimeout(() => {
        get().runCode();
      }, 300);
    }
  },

  runCode: () => {
    const state = get();
    if (state.engineStatus === "running") {
      return;
    }

    const startLine: ConsoleLine = {
      id: `${Date.now()}-start`,
      stream: "system",
      text: `>>> Running code (${state.experimentId})...`,
      timestamp: Date.now(),
    };

    set({
      engineStatus: "running",
      activeError: null,
      declaredParams: {},
      figures: [],
      activeFigureId: null,
      consoleLines: [...state.consoleLines, startLine].slice(-MAX_CONSOLE_LINES),
    });

    if (workerManagerInstance) {
      workerManagerInstance.runCode(state.code, state.params);
    }
  },

  stopExecution: () => {
    if (workerManagerInstance) {
      set({ engineStatus: "cancelling" });
      workerManagerInstance.stop();
    }
  },

  restartKernel: () => {
    if (workerManagerInstance) {
      const restartLine: ConsoleLine = {
        id: `${Date.now()}-restart`,
        stream: "system",
        text: ">>> Restarting Python kernel...",
        timestamp: Date.now(),
      };
      set({
        engineStatus: "booting",
        figures: [],
        variables: [],
        activeFigureId: null,
        consoleLines: [...get().consoleLines, restartLine].slice(-MAX_CONSOLE_LINES),
      });
      workerManagerInstance.terminate();
      workerManagerInstance.spawn();
      workerManagerInstance.init();
    }
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
        code: state.code,
        params: state.params,
        exportedAt: new Date().toISOString(),
      },
      null,
      2,
    );
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
