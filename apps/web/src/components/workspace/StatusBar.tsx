import React from "react";
import { useWorkspaceStore } from "../../store/workspaceStore.js";

interface StatusBarProps {
  cursorPosition?: { lineNumber: number; column: number };
}

export const StatusBar: React.FC<StatusBarProps> = ({
  cursorPosition = { lineNumber: 1, column: 1 },
}) => {
  const { engineStatus, unsavedChanges, lastRunElapsedMs } = useWorkspaceStore();

  return (
    <footer
      data-testid="status-bar"
      className="flex h-6 w-full items-center justify-between border-t border-line bg-surface-2 px-3 font-mono text-[11px] text-fg-muted select-none"
    >
      {/* Left: Engine Summary */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              engineStatus === "ready"
                ? "bg-emerald-500"
                : engineStatus === "running"
                  ? "bg-blue-500 animate-pulse"
                  : engineStatus === "booting"
                    ? "bg-amber-500 animate-pulse"
                    : "bg-neutral-400"
            }`}
          />
          <span>Python 3.14 (Pyodide)</span>
        </div>
        <span>·</span>
        <span>numpy 2.4.3</span>
        <span>·</span>
        <span>scipy 1.17.1</span>
      </div>

      {/* Right: Cursor, Storage status, Run timing */}
      <div className="flex items-center gap-3">
        {lastRunElapsedMs !== null && (
          <>
            <span>Last run: {Math.round(lastRunElapsedMs)} ms</span>
            <span>·</span>
          </>
        )}
        <span>
          Ln {cursorPosition.lineNumber}, Col {cursorPosition.column}
        </span>
        <span>·</span>
        <span
          className={unsavedChanges ? "text-amber-500" : "text-emerald-600 dark:text-emerald-400"}
        >
          {unsavedChanges ? "Draft unsaved" : "Draft saved (IndexedDB)"}
        </span>
      </div>
    </footer>
  );
};
