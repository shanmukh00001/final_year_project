import { useMemo, useState } from "react";
import {
  Activity,
  Download,
  Gauge,
  ListPlus,
  Sparkles,
  Table2,
  Terminal,
  Trash2,
} from "lucide-react";
import { useWorkspaceStore } from "../../store/workspaceStore.js";

type ResultsSubTab = "meters" | "table" | "log";

function getMeterToneClasses(tone?: string): string {
  switch (tone) {
    case "brand":
      return "border-brand/35 bg-brand/5";
    case "emerald":
      return "border-emerald-500/35 bg-emerald-500/5";
    case "amber":
      return "border-amber-500/35 bg-amber-500/5";
    case "danger":
      return "border-danger-500/35 bg-danger-500/5";
    default:
      return "border-line bg-surface-2";
  }
}

export function SimulationResultsPane() {
  const {
    experimentId,
    simulation,
    observationRows,
    consoleLines,
    recordObservation,
    autoSweepObservations,
    clearObservations,
    clearConsole,
  } = useWorkspaceStore();

  const [subTab, setSubTab] = useState<ResultsSubTab>("meters");

  const tableColumns = useMemo(() => {
    const keys = new Set<string>();
    for (const row of observationRows) {
      for (const k of Object.keys(row.values)) {
        if (k !== "Mode") {
          keys.add(k);
        }
      }
    }
    return Array.from(keys);
  }, [observationRows]);

  const handleExportCsv = () => {
    if (observationRows.length === 0) {
      return;
    }
    const headers = ["Trial", "Mode", ...tableColumns];
    const csvRows = [
      headers.join(","),
      ...observationRows.map((row, idx) =>
        [
          idx + 1,
          JSON.stringify(row.mode),
          ...tableColumns.map((col) => JSON.stringify(row.values[col] ?? "")),
        ].join(","),
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${experimentId.toLowerCase()}-observations.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-surface overflow-hidden" data-testid="pane-console">
      {/* Header Bar */}
      <div className="px-3 py-1.5 bg-surface-2 border-b border-line flex items-center justify-between gap-2 flex-wrap shrink-0">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSubTab("meters")}
            data-testid="subtab-meters"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              subTab === "meters"
                ? "bg-surface text-brand border border-line shadow-sm"
                : "text-fg-muted hover:text-fg"
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            Live Meters & Explanation
          </button>
          <button
            type="button"
            onClick={() => setSubTab("table")}
            data-testid="subtab-observations"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              subTab === "table"
                ? "bg-surface text-brand border border-line shadow-sm"
                : "text-fg-muted hover:text-fg"
            }`}
          >
            <Table2 className="w-3.5 h-3.5" />
            Observation Table
            <span className="px-1.5 py-0.2 rounded-full bg-brand/15 text-brand font-mono text-[10px]">
              {observationRows.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab("log")}
            data-testid="subtab-log"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              subTab === "log"
                ? "bg-surface text-brand border border-line shadow-sm"
                : "text-fg-muted hover:text-fg"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Circuit Log
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              recordObservation();
              setSubTab("table");
            }}
            data-testid="btn-add-observation"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-brand text-white hover:bg-brand-600 transition-colors"
          >
            <ListPlus className="w-3.5 h-3.5" />
            Add to Table
          </button>

          <button
            type="button"
            onClick={() => {
              autoSweepObservations();
              setSubTab("table");
            }}
            data-testid="btn-auto-sweep"
            title="Automatically sweep parameters and fill 5 trials"
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border border-line text-fg-muted hover:text-fg hover:bg-hover transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand" />
            Auto-Sweep 5 Pts
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {subTab === "meters" && simulation && (
          <>
            {/* Digital Meter Readouts Grid */}
            <div
              className="grid grid-cols-[repeat(auto-fit,minmax(122px,1fr))] gap-2"
              data-testid="live-meters-grid"
            >
              {simulation.meters.map((m) => (
                <div
                  key={m.id}
                  data-testid={`meter-card-${m.id}`}
                  className={`p-2 rounded-lg border min-w-0 ${getMeterToneClasses(m.tone)}`}
                >
                  <div className="flex items-center justify-between gap-1 text-[11px] text-fg-muted">
                    <span className="truncate">{m.label}</span>
                    <span className="font-mono font-bold text-fg-subtle shrink-0">{m.symbol}</span>
                  </div>
                  <div className="mt-0.5 flex items-baseline gap-1 font-mono min-w-0">
                    <span className="text-[15px] font-bold text-fg tabular-nums truncate">
                      {m.value}
                    </span>
                    {m.unit && <span className="text-[11px] text-fg-muted shrink-0">{m.unit}</span>}
                  </div>
                  {m.detail && (
                    <div className="text-[10px] text-fg-subtle truncate mt-0.5">{m.detail}</div>
                  )}
                </div>
              ))}
            </div>

            {/* Clear Explanation Box */}
            <div
              data-testid="simulation-explanation"
              className="p-3 rounded-lg bg-brand/5 border border-brand/25 space-y-1"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-brand">
                <Activity className="w-3.5 h-3.5" />
                Clear Step-by-Step Circuit Explanation ({simulation.regimeLabel})
              </div>
              <p className="text-xs text-fg leading-relaxed">{simulation.explanationSummary}</p>
            </div>

            {/* Calculation Steps */}
            {simulation.calculationSteps.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {simulation.calculationSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-surface-2 border border-line text-xs space-y-1"
                  >
                    <div className="font-semibold text-fg">{step.title}</div>
                    <div className="font-mono text-[11px] text-fg-muted">{step.formula}</div>
                    <div className="font-mono text-[11px] text-fg-subtle">= {step.substituted}</div>
                    <div className="font-mono text-xs font-bold text-brand">= {step.result}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {subTab === "table" && (
          <div className="space-y-2" data-testid="observation-table-panel">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-xs text-fg-muted">
                Recorded experimental trials for <strong>{experimentId}</strong>. Vary user
                component values and click <strong>Add to Table</strong> or run{" "}
                <strong>Auto-Sweep 5 Pts</strong>.
              </div>
              <div className="flex items-center gap-1.5">
                {observationRows.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleExportCsv}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-line text-fg-muted hover:text-fg hover:bg-hover"
                    >
                      <Download className="w-3 h-3" />
                      Export CSV
                    </button>
                    <button
                      type="button"
                      onClick={clearObservations}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-line text-danger-500 hover:bg-danger-500/10"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear
                    </button>
                  </>
                )}
              </div>
            </div>

            {observationRows.length === 0 ? (
              <div className="py-6 text-center text-xs text-fg-muted border border-dashed border-line rounded-lg">
                No observations recorded yet. Adjust circuit values and click{" "}
                <strong>Add to Table</strong>.
              </div>
            ) : (
              <div className="overflow-x-auto border border-line rounded-lg">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead className="bg-surface-2 text-fg-muted border-b border-line">
                    <tr>
                      <th className="px-2.5 py-1.5 font-semibold">#</th>
                      <th className="px-2.5 py-1.5 font-semibold">Mode</th>
                      {tableColumns.map((col) => (
                        <th key={col} className="px-2.5 py-1.5 font-semibold whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {observationRows.map((row, idx) => (
                      <tr
                        key={row.id}
                        className="border-b border-line/60 last:border-b-0 hover:bg-hover/60"
                      >
                        <td className="px-2.5 py-1.5 text-fg-subtle">{idx + 1}</td>
                        <td className="px-2.5 py-1.5 text-brand font-semibold">{row.mode}</td>
                        {tableColumns.map((col) => (
                          <td key={col} className="px-2.5 py-1.5 text-fg whitespace-nowrap">
                            {String(row.values[col] ?? "—")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {subTab === "log" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-fg-muted">
                Circuit validation & simulation event log
              </span>
              <button
                type="button"
                onClick={clearConsole}
                data-testid="btn-clear-log-inner"
                className="text-xs text-fg-muted hover:text-fg underline"
              >
                Clear Log
              </button>
            </div>
            <div className="font-mono text-xs space-y-1 bg-app border border-line rounded-lg p-2.5">
              {consoleLines.length === 0 ? (
                <div className="text-fg-subtle italic">
                  Circuit log ready. Click Simulate or Check Circuit.
                </div>
              ) : (
                consoleLines.map((line) => (
                  <div
                    key={line.id}
                    className={
                      line.stream === "stderr"
                        ? "text-danger-500"
                        : line.stream === "warning"
                          ? "text-amber-500"
                          : line.stream === "system"
                            ? "text-brand"
                            : "text-fg"
                    }
                  >
                    {line.text}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
