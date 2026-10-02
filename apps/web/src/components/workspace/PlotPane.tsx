import React, { useState } from "react";
import { Table, Download, BarChart2, Activity } from "lucide-react";
import { useWorkspaceStore } from "../../store/workspaceStore.js";
import { type FigureSpec } from "@vlab/shared";

interface PlotPaneProps {
  theme: "light" | "dark";
}

export const PlotPane: React.FC<PlotPaneProps> = ({ theme }) => {
  const { figures, activeFigureId, setActiveFigure } = useWorkspaceStore();
  const [showDataTable, setShowDataTable] = useState(false);

  const activeFigure: FigureSpec | undefined =
    figures.find((f) => f.id === activeFigureId) || figures[0];

  const handleDownloadFigure = () => {
    if (!activeFigure) {
      return;
    }
    const blob = new Blob([JSON.stringify(activeFigure, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeFigure.id || "figure"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const primaryTrace = activeFigure?.traces?.[0];
  const pointCount = primaryTrace?.x?.length || 0;

  return (
    <div
      data-testid="pane-plots"
      className="flex h-full w-full flex-col bg-surface border-l border-line overflow-hidden select-none"
    >
      {/* Figure Tab strip & Toolbar */}
      <div className="flex h-8 w-full items-center justify-between border-b border-line bg-surface-2 px-2 text-xs">
        {/* Figure Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {figures.length === 0 ? (
            <div className="flex items-center gap-1.5 px-2 py-1 text-fg-subtle">
              <Activity className="h-3.5 w-3.5" />
              <span>Plots</span>
            </div>
          ) : (
            figures.map((fig) => {
              const isActive = (activeFigureId || figures[0]?.id) === fig.id;
              return (
                <button
                  key={fig.id}
                  type="button"
                  onClick={() => setActiveFigure(fig.id)}
                  className={`flex items-center gap-1.5 rounded-t px-2.5 py-1 font-mono text-[11px] transition ${
                    isActive
                      ? "border-t-2 border-brand bg-surface text-fg font-semibold shadow-sm"
                      : "text-fg-muted hover:bg-hover hover:text-fg"
                  }`}
                >
                  <BarChart2 className="h-3 w-3 text-brand" />
                  <span>{fig.layout?.title || fig.id}</span>
                </button>
              );
            })
          )}
        </div>

        {/* Figure Actions */}
        {activeFigure && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              data-testid="btn-toggle-datatable"
              onClick={() => setShowDataTable(!showDataTable)}
              className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] transition ${
                showDataTable
                  ? "bg-brand text-white font-medium"
                  : "text-fg-muted hover:bg-hover hover:text-fg"
              }`}
              title="Toggle Data Table View (AC-PLT-007)"
            >
              <Table className="h-3 w-3" />
              <span>Data</span>
            </button>

            <button
              type="button"
              data-testid="btn-download-plot"
              onClick={handleDownloadFigure}
              className="rounded p-1 text-fg-muted hover:bg-hover hover:text-fg"
              title="Download Plot JSON"
            >
              <Download className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Plot Content View */}
      <div className="flex-1 w-full h-full relative overflow-auto p-4 flex items-center justify-center">
        {!activeFigure ? (
          <div className="flex flex-col items-center justify-center text-center p-6 text-fg-subtle">
            <Activity className="h-10 w-10 stroke-1 mb-2 opacity-40 text-brand" />
            <p className="font-medium text-sm text-fg-muted">No Figures Generated</p>
            <p className="text-xs max-w-xs mt-1">
              Call <code className="font-mono text-brand">vlab.plot(x, y)</code> in your Python
              script to visualize waveforms.
            </p>
          </div>
        ) : showDataTable ? (
          /* AC-PLT-007: Accessible Data Table View */
          <div
            data-testid="plot-data-table"
            className="w-full h-full overflow-auto text-xs font-mono"
          >
            <table className="w-full border-collapse border border-line text-left">
              <thead>
                <tr className="bg-surface-2 border-b border-line text-fg-muted font-semibold">
                  <th className="p-2 border-r border-line">Index</th>
                  <th className="p-2 border-r border-line">X</th>
                  <th className="p-2">Y</th>
                </tr>
              </thead>
              <tbody>
                {primaryTrace && primaryTrace.x && primaryTrace.y ? (
                  Array.from({ length: Math.min(200, primaryTrace.x.length) }, (_, idx) => {
                    const x = primaryTrace.x ? primaryTrace.x[idx] : idx;
                    const y = primaryTrace.y ? primaryTrace.y[idx] : 0;
                    return (
                      <tr key={idx} className="border-b border-line hover:bg-hover">
                        <td className="p-2 border-r border-line text-fg-subtle">{idx}</td>
                        <td className="p-2 border-r border-line">
                          {typeof x === "number" ? x.toFixed(4) : String(x)}
                        </td>
                        <td className="p-2">{typeof y === "number" ? y.toFixed(4) : String(y)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={3} className="p-3 text-center text-fg-subtle">
                      No trace coordinates available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Visualizer Canvas */
          <div
            data-testid="plot-canvas"
            className="w-full h-full flex flex-col rounded border border-line bg-surface p-4 shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-line pb-2 mb-3">
              <h3 className="font-semibold text-sm text-fg">
                {activeFigure.layout?.title || "Simulation Figure"}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-fg-subtle font-mono">
                <span>{pointCount} points</span>
              </div>
            </div>

            {/* SVG Render Canvas */}
            <div className="flex-1 w-full flex items-center justify-center">
              <svg className="w-full h-full min-h-[180px]" viewBox="0 0 500 250">
                <line
                  x1="40"
                  y1="20"
                  x2="40"
                  y2="220"
                  stroke={theme === "dark" ? "#334155" : "#cbd5e1"}
                  strokeWidth="1"
                />
                <line
                  x1="40"
                  y1="220"
                  x2="480"
                  y2="220"
                  stroke={theme === "dark" ? "#334155" : "#cbd5e1"}
                  strokeWidth="1"
                />
                <line
                  x1="40"
                  y1="120"
                  x2="480"
                  y2="120"
                  stroke={theme === "dark" ? "#1e293b" : "#f1f5f9"}
                  strokeDasharray="3 3"
                />

                {primaryTrace?.x && primaryTrace?.y && (
                  <path
                    d={`M 40 120 ${Array.from(
                      { length: Math.min(500, primaryTrace.x.length) },
                      (_, i) => {
                        const yVal = primaryTrace.y ? (primaryTrace.y[i] ?? 0) : 0;
                        const len = primaryTrace.x ? primaryTrace.x.length : 1;
                        const px = 40 + (i / Math.max(1, Math.min(500, len) - 1)) * 430;
                        const py = 120 - yVal * 70;
                        return `L ${px.toFixed(1)} ${Math.max(25, Math.min(215, py)).toFixed(1)}`;
                      },
                    ).join(" ")}`}
                    fill="none"
                    stroke="#0072b2"
                    strokeWidth="2"
                  />
                )}
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
