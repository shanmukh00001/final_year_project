import React, { useState, useMemo, useCallback } from "react";
import { Table, Download, BarChart2, Activity, LayoutGrid, LayoutList } from "lucide-react";
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

// Shared SVG dimensions
const SVG_W = 600;
const SVG_H = 320;
const MARGIN = { top: 20, right: 30, bottom: 45, left: 60 };
const PLOT_W = SVG_W - MARGIN.left - MARGIN.right;
const PLOT_H = SVG_H - MARGIN.top - MARGIN.bottom;

// Mini grid dimensions
const MINI_W = 560;
const MINI_H = 240;
const MINI_M = { top: 14, right: 16, bottom: 32, left: 44 };
const MINI_PW = MINI_W - MINI_M.left - MINI_M.right;
const MINI_PH = MINI_H - MINI_M.top - MINI_M.bottom;

function computeBounds(traces: TraceData[]) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let hasData = false;

  for (const tr of traces) {
    const xs = tr.x || [];
    const ys = tr.y || [];
    const n = Math.min(xs.length, ys.length);
    for (let i = 0; i < n; i++) {
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
  if (minX === maxX) {
    minX -= 1;
    maxX += 1;
  }
  if (minY === maxY) {
    minY -= 1;
    maxY += 1;
  }
  const dx = maxX - minX;
  const dy = maxY - minY;
  return {
    minX: minX - dx * 0.02,
    maxX: maxX + dx * 0.02,
    minY: minY - dy * 0.05,
    maxY: maxY + dy * 0.05,
  };
}

type Bounds = ReturnType<typeof computeBounds>;

function makeMapper(b: Bounds, pw: number, ph: number, m: { left: number; top: number }) {
  const mapX = (v: number) => {
    if (!b) {
      return m.left;
    }
    return m.left + Math.max(0, Math.min(pw, ((v - b.minX) / (b.maxX - b.minX)) * pw));
  };
  const mapY = (v: number) => {
    if (!b) {
      return m.top + ph;
    }
    return m.top + ph - Math.max(0, Math.min(ph, ((v - b.minY) / (b.maxY - b.minY)) * ph));
  };
  return { mapX, mapY };
}

function tracePath(
  traces: TraceData[],
  b: Bounds,
  mapX: (v: number) => number,
  mapY: (v: number) => number,
  maxPts: number,
) {
  return traces.map((tr, trIdx) => {
    const xs = tr.x || [];
    const ys = tr.y || [];
    const count = Math.min(xs.length, ys.length);
    if (count < 2) {
      return null;
    }
    const step = Math.max(1, Math.floor(count / maxPts));
    const pts: string[] = [];
    for (let i = 0; i < count; i += step) {
      pts.push(
        `${i === 0 ? "M" : "L"} ${mapX(xs[i] ?? 0).toFixed(1)} ${mapY(ys[i] ?? 0).toFixed(1)}`,
      );
    }
    if ((count - 1) % step !== 0) {
      pts.push(`L ${mapX(xs[count - 1] ?? 0).toFixed(1)} ${mapY(ys[count - 1] ?? 0).toFixed(1)}`);
    }
    return (
      <path
        key={tr.name || trIdx}
        d={pts.join(" ")}
        fill="none"
        stroke={tr.style?.color || TRACE_PALETTE[trIdx % TRACE_PALETTE.length]}
        strokeWidth={b ? "2" : "1.5"}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    );
  });
}

export const PlotPane: React.FC<PlotPaneProps> = ({ theme }) => {
  const { figures, activeFigureId, setActiveFigure } = useWorkspaceStore();
  const [showDataTable, setShowDataTable] = useState(false);
  const [gridView, setGridView] = useState(false);

  const activeFigure: FigureSpec | undefined =
    figures.find((f) => f.id === activeFigureId) || figures[0];

  const traces: TraceData[] = activeFigure?.traces || [];
  const primaryTrace = traces[0];
  const totalPoints = traces.reduce((acc, tr) => acc + (tr.x?.length || 0), 0);
  const bounds = useMemo(() => computeBounds(traces), [traces]);
  const { mapX, mapY } = useMemo(() => makeMapper(bounds, PLOT_W, PLOT_H, MARGIN), [bounds]);

  const handleDownloadFigure = useCallback(() => {
    if (!activeFigure) {
      return;
    }
    const blob = new Blob([JSON.stringify(activeFigure, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeFigure.id || "figure"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeFigure]);

  const gridBg = theme === "dark" ? "#0f172a" : "#f8fafc";
  const gridStroke = theme === "dark" ? "#334155" : "#e2e8f0";
  const gridLine = theme === "dark" ? "#1e293b" : "#e2e8f0";
  const axisStroke = theme === "dark" ? "#475569" : "#94a3b8";
  const labelFill = theme === "dark" ? "#94a3b8" : "#64748b";
  const titleFill = theme === "dark" ? "#cbd5e1" : "#475569";

  /** Render a clickable mini SVG card for grid layout */
  const renderMiniCard = (fig: FigureSpec, isActive: boolean) => {
    const b = computeBounds(fig.traces);
    const { mapX: mX, mapY: mY } = makeMapper(b, MINI_PW, MINI_PH, MINI_M);
    return (
      <div
        key={fig.id}
        onClick={() => {
          setActiveFigure(fig.id);
          setGridView(false);
        }}
        className={`flex flex-col rounded border cursor-pointer transition-all hover:shadow-md ${isActive ? "border-brand shadow-sm ring-1 ring-brand/30" : "border-line hover:border-brand/40"} bg-surface p-2`}
      >
        <p className="font-semibold text-[11px] text-fg truncate mb-1.5">
          {fig.layout?.title || fig.id}
        </p>
        <svg
          className="w-full h-auto"
          viewBox={`0 0 ${MINI_W} ${MINI_H}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <rect
            x={MINI_M.left}
            y={MINI_M.top}
            width={MINI_PW}
            height={MINI_PH}
            fill={gridBg}
            stroke={gridStroke}
            strokeWidth="1"
          />
          {b && tracePath(fig.traces, b, mX, mY, 250)}
          <line
            x1={MINI_M.left}
            y1={MINI_M.top}
            x2={MINI_M.left}
            y2={MINI_M.top + MINI_PH}
            stroke={axisStroke}
            strokeWidth="1"
          />
          <line
            x1={MINI_M.left}
            y1={MINI_M.top + MINI_PH}
            x2={MINI_M.left + MINI_PW}
            y2={MINI_M.top + MINI_PH}
            stroke={axisStroke}
            strokeWidth="1"
          />
          {fig.layout?.xLabel && (
            <text
              x={MINI_M.left + MINI_PW / 2}
              y={MINI_H - 4}
              textAnchor="middle"
              fontSize="9"
              fill={labelFill}
            >
              {fig.layout.xLabel}
            </text>
          )}
        </svg>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-fg-subtle font-mono">
            {fig.traces.length} trace · {fig.traces.reduce((a, t) => a + (t.x?.length || 0), 0)} pts
          </span>
          {isActive && (
            <span className="text-[9px] font-semibold text-brand uppercase tracking-wider">
              active
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      data-testid="pane-plots"
      className="flex h-full w-full flex-col bg-surface border-l border-line overflow-hidden select-none"
    >
      {/* Tab strip & Toolbar */}
      <div className="flex h-8 w-full items-center justify-between border-b border-line bg-surface-2 px-2 text-xs flex-shrink-0">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {figures.length === 0 ? (
            <div className="flex items-center gap-1.5 px-2 py-1 text-fg-subtle">
              <Activity className="h-3.5 w-3.5" />
              <span>Plots</span>
            </div>
          ) : gridView ? (
            <div className="flex items-center gap-1.5 px-2 py-1 text-fg-subtle">
              <LayoutGrid className="h-3 w-3 text-brand" />
              <span className="text-brand font-medium">
                Grid — {figures.length} figure{figures.length !== 1 ? "s" : ""}
              </span>
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

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Grid toggle — only when 2+ figures */}
          {figures.length > 1 && (
            <button
              type="button"
              onClick={() => setGridView(!gridView)}
              className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] transition ${
                gridView
                  ? "bg-brand text-white font-medium"
                  : "text-fg-muted hover:bg-hover hover:text-fg"
              }`}
              title={gridView ? "Back to single figure view" : "Grid view — see all plots at once"}
            >
              {gridView ? <LayoutList className="h-3 w-3" /> : <LayoutGrid className="h-3 w-3" />}
              <span>{gridView ? "Single" : "Grid"}</span>
            </button>
          )}

          {activeFigure && !gridView && (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 w-full relative overflow-hidden p-3 flex flex-col">
        {/* ── Empty state ── */}
        {!activeFigure ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-fg-subtle">
            <Activity className="h-10 w-10 stroke-1 mb-2 opacity-40 text-brand" />
            <p className="font-medium text-sm text-fg-muted">No Figures Generated</p>
            <p className="text-xs max-w-xs mt-1">
              Call <code className="font-mono text-brand">vlab.plot(x, y)</code> in your Python
              script to visualize waveforms, or{" "}
              <code className="font-mono text-brand">vlab.plot(x, y, title=&quot;…&quot;)</code> to
              create multiple named figures.
            </p>
          </div>
        ) : gridView ? (
          /* ── Grid view: all figures side-by-side ── */
          <div data-testid="plot-grid-view" className="flex-1 w-full min-h-0 overflow-y-auto">
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: figures.length === 1 ? "1fr" : "repeat(2, minmax(0,1fr))",
              }}
            >
              {figures.map((fig) =>
                renderMiniCard(fig, (activeFigureId || figures[0]?.id) === fig.id),
              )}
            </div>
          </div>
        ) : showDataTable ? (
          /* ── Data Table (AC-PLT-007) ── */
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
          /* ── Single active figure SVG canvas ── */
          <div
            data-testid="plot-canvas"
            className="flex-1 min-h-0 w-full flex flex-col rounded border border-line bg-surface p-3 shadow-sm overflow-hidden"
          >
            {/* Header: title + legend */}
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

            {/* SVG canvas */}
            <div className="flex-1 min-h-0 w-full relative flex items-center justify-center overflow-hidden">
              <svg
                className="w-full h-full"
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Plot area background */}
                <rect
                  x={MARGIN.left}
                  y={MARGIN.top}
                  width={PLOT_W}
                  height={PLOT_H}
                  fill={gridBg}
                  stroke={gridStroke}
                  strokeWidth="1"
                />

                {/* Horizontal gridlines + Y labels */}
                {[0, 0.25, 0.5, 0.75, 1.0].map((frac) => {
                  const yPos = MARGIN.top + PLOT_H * frac;
                  const yVal = bounds
                    ? bounds.maxY - frac * (bounds.maxY - bounds.minY)
                    : 1 - frac * 2;
                  return (
                    <g key={frac}>
                      <line
                        x1={MARGIN.left}
                        y1={yPos}
                        x2={MARGIN.left + PLOT_W}
                        y2={yPos}
                        stroke={gridLine}
                        strokeDasharray={frac === 0.5 ? "none" : "2 2"}
                        strokeWidth="1"
                      />
                      <text
                        x={MARGIN.left - 8}
                        y={yPos + 4}
                        textAnchor="end"
                        fontSize="10"
                        fontFamily="monospace"
                        fill={labelFill}
                      >
                        {typeof yVal === "number" ? yVal.toPrecision(3) : yVal}
                      </text>
                    </g>
                  );
                })}

                {/* Vertical gridlines + X labels */}
                {[0, 0.25, 0.5, 0.75, 1.0].map((frac) => {
                  const xPos = MARGIN.left + PLOT_W * frac;
                  const xVal = bounds ? bounds.minX + frac * (bounds.maxX - bounds.minX) : frac;
                  return (
                    <g key={frac}>
                      <line
                        x1={xPos}
                        y1={MARGIN.top}
                        x2={xPos}
                        y2={MARGIN.top + PLOT_H}
                        stroke={gridLine}
                        strokeDasharray="2 2"
                        strokeWidth="1"
                      />
                      <text
                        x={xPos}
                        y={MARGIN.top + PLOT_H + 16}
                        textAnchor="middle"
                        fontSize="10"
                        fontFamily="monospace"
                        fill={labelFill}
                      >
                        {typeof xVal === "number" ? xVal.toPrecision(3) : xVal}
                      </text>
                    </g>
                  );
                })}

                {/* Trace paths */}
                {bounds && tracePath(traces, bounds, mapX, mapY, 600)}

                {/* Axis lines */}
                <line
                  x1={MARGIN.left}
                  y1={MARGIN.top}
                  x2={MARGIN.left}
                  y2={MARGIN.top + PLOT_H}
                  stroke={axisStroke}
                  strokeWidth="1.5"
                />
                <line
                  x1={MARGIN.left}
                  y1={MARGIN.top + PLOT_H}
                  x2={MARGIN.left + PLOT_W}
                  y2={MARGIN.top + PLOT_H}
                  stroke={axisStroke}
                  strokeWidth="1.5"
                />

                {/* Axis labels */}
                {activeFigure.layout?.xLabel && (
                  <text
                    x={MARGIN.left + PLOT_W / 2}
                    y={SVG_H - 6}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="500"
                    fill={titleFill}
                  >
                    {activeFigure.layout.xLabel}
                  </text>
                )}
                {activeFigure.layout?.yLabel && (
                  <text
                    x={14}
                    y={MARGIN.top + PLOT_H / 2}
                    textAnchor="middle"
                    transform={`rotate(-90 14 ${MARGIN.top + PLOT_H / 2})`}
                    fontSize="11"
                    fontWeight="500"
                    fill={titleFill}
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
