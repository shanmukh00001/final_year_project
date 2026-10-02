import React from "react";
import { type EngineStatus } from "../../store/workspaceStore.js";

interface EngineStatusPillProps {
  status: EngineStatus;
  bootProgress?: { percent: number; stage: string; message: string };
  lastRunElapsedMs?: number | null;
  runtimeInfo?: { pythonVersion: string; numpy: string; scipy: string } | null;
}

export const EngineStatusPill: React.FC<EngineStatusPillProps> = ({
  status,
  bootProgress,
  lastRunElapsedMs,
  runtimeInfo,
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
      // Show real package versions once available
      label = runtimeInfo ? `Ready · Python ${runtimeInfo.pythonVersion}` : "Ready";
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

  // Build tooltip with runtime details
  const tooltipParts: string[] = [];
  if (runtimeInfo) {
    tooltipParts.push(
      `NumPy ${runtimeInfo.numpy === "mock" ? "mock fallback" : runtimeInfo.numpy}`,
    );
    tooltipParts.push(
      `SciPy ${runtimeInfo.scipy === "mock" ? "mock fallback" : runtimeInfo.scipy}`,
    );
  }
  if (lastRunElapsedMs) {
    tooltipParts.push(`Last run: ${Math.round(lastRunElapsedMs)} ms`);
  }

  return (
    <div
      data-testid="engine-status-pill"
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 font-medium text-xs transition-colors ${colorClass}`}
      title={tooltipParts.length ? tooltipParts.join(" | ") : undefined}
    >
      <span
        data-testid="status-dot"
        className={`h-2 w-2 rounded-full ${dotClass} ${isPulsing ? "ring-2 ring-current ring-opacity-25" : ""}`}
      />
      <span>{label}</span>
      {lastRunElapsedMs !== null && lastRunElapsedMs !== undefined && status === "ready" && (
        <span className="opacity-75">({Math.round(lastRunElapsedMs)}ms)</span>
      )}
      {/* Warn if mocks are active */}
      {status === "ready" &&
        runtimeInfo &&
        (runtimeInfo.numpy === "mock" || runtimeInfo.scipy === "mock") && (
          <span
            className="rounded bg-amber-500/20 px-1 text-[10px] text-amber-700 dark:text-amber-300"
            title="Real NumPy/SciPy wheels not loaded — using mock fallbacks. Advanced experiments may not work correctly."
          >
            mock
          </span>
        )}
    </div>
  );
};
