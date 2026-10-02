import React, { useState, useMemo } from "react";
import { Table, Download, BarChart2, Activity } from "lucide-react";
import { useWorkspaceStore } from "../../store/workspaceStore.js";
import { type FigureSpec, type TraceData } from "@vlab/shared";

interface PlotPaneProps {
  theme: "light" | "dark";
}

const TRACE_PALETTE = [
  "#0072b2", // Blue
  "#e69f00", // Orange
  "#009e73", // Green
  "#d55e00", // Red/Vermillion
  "#cc79a7", // Purple
  "#56b4e9", // Sky Blue
];

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

  const traces: TraceData[] = activeFigure?.traces || [];
  const primaryTrace = traces[0];
  const totalPoints = traces.reduce((acc, tr) => acc + (tr.x?.length || 0), 0);

  // Compute bounding box for all traces
  const bounds = useMemo(() => {
    if (!traces.length) {
      return null;
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    let hasData = false;

    for (const tr of traces) {
      const xs = tr.x || [];
      const ys = tr.y || [];
      const count = Math.min(xs.length, ys.length);

      for (let i = 0; i < count; i++) {
        const x = xs[i];
        const y = ys[i];
        if (typeof x === "number" && !Number.isNaN(x)) {
          if (x < minX) {
            minX = x;
          }
          if (x > maxX) {
            maxX = x;
          }
          hasData = true;
        }
        if (typeof y === "number" && !Number.isNaN(y)) {
          if (y < minY) {
            minY = y;
          }
          if (y > maxY) {
            maxY = y;
          }
          hasData = true;
        }
      }
    }

    if (!hasData) {
      return null;
    }

    // Guard against equal min/max
    if (minX === maxX) {
      minX -= 1;
      maxX += 1;
    }
    if (minY === maxY) {
      minY -= 1;
      maxY += 1;
    }

    // Add 5% padding
    const dx = maxX - minX;
    const dy = maxY - minY;
    return {
      minX: minX - dx * 0.02,
      maxX: maxX + dx * 0.02,
      minY: minY - dy * 0.05,
      maxY: maxY + dy * 0.05,
    };
  }, [traces]);

  // Dimensions for SVG canvas
  const svgWidth = 600;
  const svgHeight = 320;
  const margin = { top: 20, right: 30, bottom: 45, left: 60 };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  const mapX = (xVal: number) => {
    if (!bounds) {
      return margin.left;
    }
    const ratio = (xVal - bounds.minX) / (bounds.maxX - bounds.minX);
    return margin.left + Math.max(0, Math.min(plotWidth, ratio * plotWidth));
  };

  const mapY = (yVal: number) => {
    if (!bounds) {
      return margin.top + plotHeight;
    }
    const ratio = (yVal - bounds.minY) / (bounds.maxY - bounds.minY);
    return margin.top + plotHeight - Math.max(0, Math.min(plotHeight, ratio * plotHeight));
  };

  return (
    <div
      data-testid="pane-plots"
      className="flex h-full w-full flex-col bg-surface border-l border-line overflow-hidden select-none"
    >
      {/* Figure Tab strip & Toolbar */}
      <div className="flex h-8 w-full items-center justify-between border-b border-line bg-surface-2 px-2 text-xs flex-shrink-0">
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
                  className={`flex items-center gap-1.5 rounded-t px-2.5 py-1 font-mono text-[11px] transition whitespace-nowrap ${
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
          <div className="flex items-center gap-1 flex-shrink-0">
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
      <div className="flex-1 min-h-0 w-full relative overflow-hidden p-3 flex flex-col">
        {!activeFigure ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-fg-subtle">
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
            className="flex-1 w-full min-h-0 overflow-auto text-xs font-mono"
          >
            <table className="w-full border-collapse border border-line text-left">
              <thead>
                <tr className="bg-surface-2 border-b border-line text-fg-muted font-semibold sticky top-0">
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
            className="flex-1 min-h-0 w-full flex flex-col rounded border border-line bg-surface p-3 shadow-sm overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-line pb-2 mb-2 flex-shrink-0">
              <h3 className="font-semibold text-xs text-fg truncate">
                {activeFigure.layout?.title || "Simulation Figure"}
              </h3>
              <div className="flex items-center gap-2 text-[11px] text-fg-subtle font-mono">
                {traces.map((tr, idx) => (
                  <span key={tr.name || idx} className="flex items-center gap-1">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          tr.style?.color || TRACE_PALETTE[idx % TRACE_PALETTE.length],
                      }}
                    />
                    {tr.name || `Trace ${idx + 1}`}
                  </span>
                ))}
                <span>({totalPoints} pts)</span>
              </div>
            </div>

            {/* Responsive SVG Render Canvas */}
            <div className="flex-1 min-h-0 w-full relative flex items-center justify-center overflow-hidden">
              <svg
                className="w-full h-full"
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Background gridlines */}
                <rect
                  x={margin.left}
                  y={margin.top}
                  width={plotWidth}
                  height={plotHeight}
                  fill={theme === "dark" ? "#0f172a" : "#f8fafc"}
                  stroke={theme === "dark" ? "#334155" : "#e2e8f0"}
                  strokeWidth="1"
                />

                {/* Horizontal grid lines & Y labels */}
                {[0, 0.25, 0.5, 0.75, 1.0].map((frac) => {
                  const yPos = margin.top + plotHeight * frac;
                  const yVal = bounds
                    ? bounds.maxY - frac * (bounds.maxY - bounds.minY)
                    : 1 - frac * 2;
                  return (
                    <g key={frac}>
                      <line
                        x1={margin.left}
                        y1={yPos}
                        x2={margin.left + plotWidth}
                        y2={yPos}
                        stroke={theme === "dark" ? "#1e293b" : "#e2e8f0"}
                        strokeDasharray={frac === 0.5 ? "none" : "2 2"}
                        strokeWidth="1"
                      />
                      <text
                        x={margin.left - 8}
                        y={yPos + 4}
                        textAnchor="end"
                        fontSize="10"
                        fontFamily="monospace"
                        fill={theme === "dark" ? "#94a3b8" : "#64748b"}
                      >
                        {typeof yVal === "number" ? yVal.toPrecision(3) : yVal}
                      </text>
                    </g>
                  );
                })}

                {/* Vertical grid lines & X labels */}
                {[0, 0.25, 0.5, 0.75, 1.0].map((frac) => {
                  const xPos = margin.left + plotWidth * frac;
                  const xVal = bounds
                    ? bounds.minX + frac * (bounds.maxX - bounds.minX)
                    : frac;
                  return (
                    <g key={frac}>
                      <line
                        x1={xPos}
                        y1={margin.top}
                        x2={xPos}
                        y2={margin.top + plotHeight}
                        stroke={theme === "dark" ? "#1e293b" : "#e2e8f0"}
                        strokeDasharray="2 2"
                        strokeWidth="1"
                      />
                      <text
                        x={xPos}
                        y={margin.top + plotHeight + 16}
                        textAnchor="middle"
                        fontSize="10"
                        fontFamily="monospace"
                        fill={theme === "dark" ? "#94a3b8" : "#64748b"}
                      >
                        {typeof xVal === "number" ? xVal.toPrecision(3) : xVal}
                      </text>
                    </g>
                  );
                })}

                {/* Render Each Trace */}
                {bounds &&
                  traces.map((tr, trIdx) => {
                    const xs = tr.x || [];
                    const ys = tr.y || [];
                    const count = Math.min(xs.length, ys.length);
                    if (count < 2) {
                      return null;
                    }

                    // Sample up to 600 points for smooth performance
                    const step = Math.max(1, Math.floor(count / 600));
                    const points: string[] = [];

                    for (let i = 0; i < count; i += step) {
                      const px = mapX(xs[i] ?? 0);
                      const py = mapY(ys[i] ?? 0);
                      points.push(`${i === 0 ? "M" : "L"} ${px.toFixed(1)} ${py.toFixed(1)}`);
                    }

                    // Ensure last point is connected
                    if ((count - 1) % step !== 0) {
                      const lastX = mapX(xs[count - 1] ?? 0);
                      const lastY = mapY(ys[count - 1] ?? 0);
                      points.push(`L ${lastX.toFixed(1)} ${lastY.toFixed(1)}`);
                    }

                    const strokeColor =
                      tr.style?.color || TRACE_PALETTE[trIdx % TRACE_PALETTE.length];

                    return (
                      <path
                        key={tr.name || trIdx}
                        d={points.join(" ")}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="2"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    );
                  })}

                {/* Axes lines */}
                <line
                  x1={margin.left}
                  y1={margin.top}
                  x2={margin.left}
                  y2={margin.top + plotHeight}
                  stroke={theme === "dark" ? "#475569" : "#94a3b8"}
                  strokeWidth="1.5"
                />
                <line
                  x1={margin.left}
                  y1={margin.top + plotHeight}
                  x2={margin.left + plotWidth}
                  y2={margin.top + plotHeight}
                  stroke={theme === "dark" ? "#475569" : "#94a3b8"}
                  strokeWidth="1.5"
                />

                {/* Axis Titles */}
                {activeFigure.layout?.xLabel && (
                  <text
                    x={margin.left + plotWidth / 2}
                    y={svgHeight - 6}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="500"
                    fill={theme === "dark" ? "#cbd5e1" : "#475569"}
                  >
                    {activeFigure.layout.xLabel}
                  </text>
                )}
                {activeFigure.layout?.yLabel && (
                  <text
                    x={14}
                    y={margin.top + plotHeight / 2}
                    textAnchor="middle"
                    transform={`rotate(-90 14 ${margin.top + plotHeight / 2})`}
                    fontSize="11"
                    fontWeight="500"
                    fill={theme === "dark" ? "#cbd5e1" : "#475569"}
                  >
                    {activeFigure.layout.yLabel}
                  </text>
                )}
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
