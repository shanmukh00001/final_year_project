import { Activity, Cpu } from "lucide-react";
import { useWorkspaceStore } from "../../store/workspaceStore.js";

export function StatusBar() {
  const { experimentId, activeTool, wires, simulation, lastRunElapsedMs, unsavedChanges } =
    useWorkspaceStore();

  const conn = simulation?.connection;

  return (
    <footer
      className="h-6 bg-surface-2 border-t border-line px-3 flex items-center justify-between text-[11px] text-fg-muted select-none shrink-0"
      data-testid="status-bar"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex items-center gap-1.5 font-medium text-fg">
          <Cpu className="w-3 h-3 text-brand" />
          IIT (ISM) Virtual Lab · Circuit Maker & AC/DC Solver
        </span>
        <span className="hidden sm:inline text-fg-subtle">|</span>
        <span className="hidden sm:inline font-mono">
          {experimentId} · {wires.length} wires · Tool: {activeTool}
        </span>
        {unsavedChanges && (
          <span className="text-amber-500 font-medium hidden md:inline">• Draft modified</span>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {conn && (
          <span
            className={`flex items-center gap-1 font-medium ${
              conn.valid
                ? "text-emerald-600 dark:text-emerald-400"
                : conn.status === "open_switch"
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-danger-500"
            }`}
          >
            <Activity className="w-3 h-3" />
            {conn.title}
          </span>
        )}
        {lastRunElapsedMs !== null && (
          <span className="font-mono text-fg-subtle">{lastRunElapsedMs} ms</span>
        )}
      </div>
    </footer>
  );
}
