import React from "react";
import { Play, Square, RotateCcw, Trash2, Download, Moon, Sun, Zap } from "lucide-react";
import { useWorkspaceStore } from "../../store/workspaceStore.js";
import { EngineStatusPill } from "./EngineStatusPill.js";
import { VALIDATED_EXPERIMENTS } from "../../data/curriculum/index.js";

interface TopBarProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ theme, onToggleTheme }) => {
  const {
    experimentId,
    engineStatus,
    bootProgress,
    lastRunElapsedMs,
    liveRun,
    unsavedChanges,
    engineRuntimeInfo,
    runCode,
    stopExecution,
    restartKernel,
    clearConsole,
    setLiveRun,
    loadExperiment,
    exportCode,
    exportWorkspaceJson,
  } = useWorkspaceStore();

  const handleExportPy = () => {
    const code = exportCode();
    const blob = new Blob([code], { type: "text/x-python" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${experimentId.toLowerCase()}.py`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const json = exportWorkspaceJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${experimentId.toLowerCase()}_workspace.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isRunning = engineStatus === "running";
  const isReady = engineStatus === "ready";

  return (
    <header className="flex h-12 w-full items-center justify-between border-b border-line bg-surface px-4 text-fg shadow-panel select-none">
      {/* Left: Brand & Experiment switcher */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-bold tracking-tight">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-white font-mono text-xs">
            VL
          </span>
          <span className="font-semibold text-sm">V-Lab ECE</span>
        </div>

        <span className="text-fg-subtle">/</span>

        <div className="flex items-center gap-2">
          <select
            data-testid="select-experiment"
            value={experimentId}
            onChange={(e) => loadExperiment(e.target.value)}
            className="rounded bg-surface-2 border border-line px-2 py-1 font-mono font-medium text-fg text-xs focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer"
          >
            {VALIDATED_EXPERIMENTS.map((exp) => (
              <option key={exp.id} value={exp.id}>
                [{exp.course}] {exp.id}: {exp.title}
              </option>
            ))}
          </select>
          {unsavedChanges && (
            <span
              className="h-2 w-2 rounded-full bg-amber-500"
              title="Unsaved changes (autosaving...)"
            />
          )}
        </div>
      </div>

      {/* Center: Execution & Kernel controls */}
      <div className="flex items-center gap-2">
        {!isRunning ? (
          <button
            type="button"
            data-testid="btn-run"
            onClick={runCode}
            disabled={!isReady}
            className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 font-medium text-white text-xs shadow-sm transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
            title="Run code (Ctrl/Cmd+Enter)"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Run</span>
          </button>
        ) : (
          <button
            type="button"
            data-testid="btn-stop"
            onClick={stopExecution}
            className="flex items-center gap-1.5 rounded-md bg-danger-500 px-3 py-1.5 font-medium text-white text-xs shadow-sm transition hover:bg-danger-700"
            title="Stop execution (Ctrl/Cmd+.)"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
            <span>Stop</span>
          </button>
        )}

        <button
          type="button"
          data-testid="btn-restart"
          onClick={restartKernel}
          className="flex items-center gap-1.5 rounded-md border border-line-strong bg-surface-2 px-2.5 py-1.5 text-fg text-xs transition hover:bg-hover"
          title="Restart Python Kernel"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Restart</span>
        </button>

        <button
          type="button"
          data-testid="btn-clear-console"
          onClick={clearConsole}
          className="flex items-center gap-1.5 rounded-md border border-line-strong bg-surface-2 px-2.5 py-1.5 text-fg text-xs transition hover:bg-hover"
          title="Clear Console Output"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Clear</span>
        </button>

        <div className="h-4 w-px bg-line" />

        {/* Live Run Toggle */}
        <button
          type="button"
          data-testid="btn-toggle-live"
          onClick={() => setLiveRun(!liveRun)}
          className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition ${
            liveRun
              ? "border-accent-500 bg-accent-500/10 text-accent-600 dark:text-accent-400 font-medium"
              : "border-line-strong bg-surface-2 text-fg-muted hover:bg-hover"
          }`}
          title="Toggle live execution on parameter adjustments"
        >
          <Zap className="h-3.5 w-3.5" />
          <span>Live {liveRun ? "ON" : "OFF"}</span>
        </button>
      </div>

      {/* Right: Status pill, Export menu, Theme switch */}
      <div className="flex items-center gap-3">
        <EngineStatusPill
          status={engineStatus}
          bootProgress={bootProgress}
          lastRunElapsedMs={lastRunElapsedMs}
          runtimeInfo={engineRuntimeInfo}
        />

        <div className="h-4 w-px bg-line" />

        <div className="flex items-center gap-1">
          <button
            type="button"
            data-testid="btn-export-py"
            onClick={handleExportPy}
            className="flex items-center gap-1 rounded border border-line-strong bg-surface-2 px-2 py-1 text-fg text-xs transition hover:bg-hover"
            title="Export .py script"
          >
            <Download className="h-3 w-3" />
            <span>.py</span>
          </button>
          <button
            type="button"
            data-testid="btn-export-json"
            onClick={handleExportJson}
            className="flex items-center gap-1 rounded border border-line-strong bg-surface-2 px-2 py-1 text-fg text-xs transition hover:bg-hover"
            title="Export workspace .json"
          >
            <Download className="h-3 w-3" />
            <span>.json</span>
          </button>
        </div>

        <button
          type="button"
          data-testid="btn-toggle-theme"
          onClick={onToggleTheme}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-line-strong bg-surface-2 text-fg transition hover:bg-hover"
          title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
        </button>
      </div>
    </header>
  );
};
