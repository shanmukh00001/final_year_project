import React, { useRef, useEffect } from "react";
import { Trash2, Terminal, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { useWorkspaceStore, type ConsoleLine } from "../../store/workspaceStore.js";

export const ConsolePane: React.FC = () => {
  const { consoleLines, clearConsole, engineStatus } = useWorkspaceStore();
  const consoleBottomRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom on new output
  useEffect(() => {
    if (typeof consoleBottomRef.current?.scrollIntoView === "function") {
      consoleBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [consoleLines.length]);

  const getLineStyle = (stream: ConsoleLine["stream"]) => {
    switch (stream) {
      case "stderr":
        return "text-console-stderr bg-danger-500/5 font-semibold";
      case "system":
        return "text-console-system font-medium italic";
      case "warning":
        return "text-console-warning font-medium";
      case "stdout":
      default:
        return "text-console-stdout";
    }
  };

  const getLineIcon = (stream: ConsoleLine["stream"]) => {
    switch (stream) {
      case "stderr":
        return <AlertCircle className="h-3.5 w-3.5 shrink-0 text-danger-500 mt-0.5" />;
      case "warning":
        return <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning-500 mt-0.5" />;
      case "system":
        return <Info className="h-3.5 w-3.5 shrink-0 text-info-500 mt-0.5" />;
      default:
        return null;
    }
  };

  return (
    <div
      data-testid="pane-console"
      className="flex h-full w-full flex-col bg-console text-fg border-t border-line overflow-hidden font-mono text-xs"
    >
      {/* Console Header Bar */}
      <div className="flex h-7 w-full items-center justify-between border-b border-line bg-surface-2 px-3 select-none">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-brand" />
          <span className="font-semibold text-[11px] uppercase tracking-wider text-fg-muted">
            Console Output ({consoleLines.length} lines)
          </span>
          {engineStatus === "running" && (
            <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.2 text-[10px] text-blue-600 dark:text-blue-400 animate-pulse font-sans">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
              streaming
            </span>
          )}
        </div>

        <button
          type="button"
          data-testid="btn-clear-console-pane"
          onClick={clearConsole}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-fg-subtle hover:bg-hover hover:text-fg"
          title="Clear console"
        >
          <Trash2 className="h-3 w-3" />
          <span>Clear</span>
        </button>
      </div>

      {/* Output Stream Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-0.5 select-text font-mono text-[12px] leading-relaxed">
        {consoleLines.length === 0 ? (
          <div className="text-fg-subtle italic py-2">
            No output. Press Run (Ctrl+Enter) to execute Python code.
          </div>
        ) : (
          consoleLines.map((line) => (
            <div
              key={line.id}
              className={`flex items-start gap-1.5 py-0.5 px-1 rounded transition-colors ${getLineStyle(line.stream)}`}
            >
              {getLineIcon(line.stream)}
              <pre className="whitespace-pre-wrap break-all font-mono">{line.text}</pre>
            </div>
          ))
        )}
        <div ref={consoleBottomRef} />
      </div>
    </div>
  );
};
