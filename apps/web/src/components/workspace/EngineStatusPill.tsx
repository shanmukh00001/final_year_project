import React from "react";
import { type EngineStatus } from "../../store/workspaceStore.js";

interface EngineStatusPillProps {
  status: EngineStatus;
  bootProgress?: { percent: number; stage: string; message: string };
  lastRunElapsedMs?: number | null;
}

export const EngineStatusPill: React.FC<EngineStatusPillProps> = ({
  status,
  bootProgress,
  lastRunElapsedMs,
}) => {
  let colorClass = "bg-neutral-500/20 text-fg-muted border-line";
  let dotClass = "bg-neutral-400";
  let label = "Uninitialized";
  let isPulsing = false;

  switch (status) {
    case "booting":
      colorClass = "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30";
      dotClass = "bg-amber-500 animate-pulse";
      isPulsing = true;
      label = bootProgress?.message ? `Booting (${bootProgress.percent}%)` : "Booting Python...";
      break;

    case "ready":
      colorClass = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
      dotClass = "bg-emerald-500";
      label = "Ready";
      break;

    case "running":
      colorClass = "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30";
      dotClass = "bg-blue-500 animate-pulse";
      isPulsing = true;
      label = "Running...";
      break;

    case "cancelling":
      colorClass = "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30";
      dotClass = "bg-amber-500";
      label = "Stopping...";
      break;

    case "error":
      colorClass = "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30";
      dotClass = "bg-red-500";
      label = "Engine Failed";
      break;
  }

  return (
    <div
      data-testid="engine-status-pill"
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 font-medium text-xs transition-colors ${colorClass}`}
      title={lastRunElapsedMs ? `Last execution time: ${Math.round(lastRunElapsedMs)} ms` : undefined}
    >
      <span
        data-testid="status-dot"
        className={`h-2 w-2 rounded-full ${dotClass} ${isPulsing ? "ring-2 ring-current ring-opacity-25" : ""}`}
      />
      <span>{label}</span>
      {lastRunElapsedMs !== null && lastRunElapsedMs !== undefined && status === "ready" && (
        <span className="opacity-75">({Math.round(lastRunElapsedMs)}ms)</span>
      )}
    </div>
  );
};
