import React, { useState, useMemo, useCallback } from "react";
import { Table, Download, BarChart2, Activity, LayoutGrid, LayoutList } from "lucide-react";
import { useWorkspaceStore } from "../../store/workspaceStore.js";
import { type FigureSpec, type TraceData } from "@vlab/shared";

interface PlotPaneProps {
  theme: "light" | "dark";
}

const TRACE_PALETTE = [
  "#3b82f6", // Vivid Blue
  "#10b981", // Emerald Green
  "#f59e0b", // Amber Gold
  "#ef4444", // Crimson Red
  "#a855f7", // Violet
  "#06b6d4", // Cyan
];

// Shared SVG dimensions
const SVG_W = 600;
const SVG_H = 330;
const MARGIN = { top: 20, right: 24, bottom: 50, left: 68 };
const PLOT_W = SVG_W - MARGIN.left - MARGIN.right;
const PLOT_H = SVG_H - MARGIN.top - MARGIN.bottom;

// Mini grid dimensions
const MINI_W = 560;
const MINI_H = 250;
const MINI_M = { top: 14, right: 16, bottom: 38, left: 52 };
const MINI_PW = MINI_W - MINI_M.left - MINI_M.right;
const MINI_PH = MINI_H - MINI_M.top - MINI_M.bottom;

function computeBounds(traces: TraceData[], layout?: FigureSpec["layout"]) {
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

  let outMinX = minX >= 0 && minX < 1e-9 ? 0 : minX - dx * 0.02;
  let outMaxX = maxX + dx * 0.02;
  let outMinY: number;
  let outMaxY: number;
  if (minY < 0 && maxY > 0 && Math.abs(minY + maxY) <= dy * 0.08) {
    const symMax = Math.max(Math.abs(minY), Math.abs(maxY)) * 1.08;
    outMinY = -symMax;
    outMaxY = symMax;
  } else {
    outMinY = minY >= 0 && minY < 1e-9 ? 0 : minY - dy * 0.07;
    outMaxY = maxY + dy * 0.07;
  }

  if (layout?.xRange && layout.xRange[1] > layout.xRange[0]) {
    outMinX = layout.xRange[0];
    outMaxX = layout.xRange[1];
  }
  if (layout?.yRange && layout.yRange[1] > layout.yRange[0]) {
    outMinY = layout.yRange[0];
    outMaxY = layout.yRange[1];
  }

  return {
    minX: outMinX,
    maxX: outMaxX,
    minY: outMinY,
    maxY: outMaxY,
  };
}

type Bounds = ReturnType<typeof computeBounds>;

function formatAxisTick(v: number): string {
  if (Math.abs(v) < 1e-9) {
    return "0";
  }
  const abs = Math.abs(v);
  if (abs >= 1000) {
    return Math.round(v).toString();
  }
  if (abs >= 100) {
    return v.toFixed(0);
  }
  if (abs >= 10) {
    return v.toFixed(1).replace(/\.0$/, "");
  }
  if (abs >= 1) {
    return v.toFixed(2).replace(/\.?0+$/, "");
  }
  return v.toPrecision(2);
}

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

function renderShapes(
  layout: FigureSpec["layout"] | undefined,
  b: Bounds,
  mapX: (v: number) => number,
  mapY: (v: number) => number,
  pw: number,
  ph: number,
  m: { left: number; top: number },
  theme: "light" | "dark",
) {
  const shapes = layout?.shapes;
  if (!b || !shapes || shapes.length === 0) {
    return null;
  }

  const zeroStroke = theme === "dark" ? "#94a3b8" : "#475569";
  const guideStroke = theme === "dark" ? "#fbbf24" : "#d97706";

  return shapes.map((shape, idx) => {
    if (shape.type === "hline" && typeof shape.y0 === "number") {
      if (shape.y0 < b.minY || shape.y0 > b.maxY) {
        return null;
      }
      const y = mapY(shape.y0);
      const isZero = Math.abs(shape.y0) < 1e-9;
      return (
        <line
          key={`shape-h-${idx}`}
          x1={m.left}
          y1={y}
          x2={m.left + pw}
          y2={y}
          stroke={isZero ? zeroStroke : guideStroke}
          strokeWidth={isZero ? "1.4" : "1.6"}
          strokeDasharray={isZero ? undefined : "6 4"}
          strokeOpacity={isZero ? 0.65 : 0.9}
        />
      );
    }

    if (shape.type === "vline" && typeof shape.x0 === "number") {
      if (shape.x0 < b.minX || shape.x0 > b.maxX) {
        return null;
      }
      const x = mapX(shape.x0);
      return (
        <line
          key={`shape-v-${idx}`}
          x1={x}
          y1={m.top}
          x2={x}
          y2={m.top + ph}
          stroke={guideStroke}
          strokeWidth="1.6"
          strokeDasharray="6 4"
          strokeOpacity="0.9"
        />
      );
    }

    return null;
  });
}

function renderTraces(
  traces: TraceData[],
  b: Bounds,
  mapX: (v: number) => number,
  mapY: (v: number) => number,
  maxPts: number,
  theme: "light" | "dark",
) {
  const ringStroke = theme === "dark" ? "#0f172a" : "#ffffff";

  return traces.map((tr, trIdx) => {
    const xs = tr.x || [];
    const ys = tr.y || [];
    const count = Math.min(xs.length, ys.length);
    if (count < 1 || !b) {
      return null;
    }

    const color = tr.style?.color || TRACE_PALETTE[trIdx % TRACE_PALETTE.length];
    const mode = tr.mode || "lines";
    const showLines = (mode === "lines" || mode === "lines+markers") && count >= 2;
    const showMarkers = mode === "markers" || mode === "lines+markers";
    const strokeW = tr.style?.width ?? (maxPts >= 400 ? 2.5 : 1.9);
    const dashArray =
      tr.style?.dash === "dash" ? "8 7" : tr.style?.dash === "dot" ? "2 4" : undefined;

    let areaEl: React.ReactNode = null;
    let pathEl: React.ReactNode = null;
    if (showLines) {
      const step = Math.max(1, Math.floor(count / maxPts));
      const pts: string[] = [];
      let firstX = 0;
      let lastX = 0;
      for (let i = 0; i < count; i += step) {
        const px = mapX(xs[i] ?? 0);
        const py = mapY(ys[i] ?? 0);
        if (i === 0) {
          firstX = px;
        }
        lastX = px;
        pts.push(`${i === 0 ? "M" : "L"} ${px.toFixed(1)} ${py.toFixed(1)}`);
      }
      if ((count - 1) % step !== 0) {
        lastX = mapX(xs[count - 1] ?? 0);
        pts.push(`L ${lastX.toFixed(1)} ${mapY(ys[count - 1] ?? 0).toFixed(1)}`);
      }
      const dStr = pts.join(" ");
      if (trIdx === 0 && traces.length <= 2 && b.minY >= -1e-9) {
        const baseY = mapY(0).toFixed(1);
        areaEl = (
          <path
            d={`${dStr} L ${lastX.toFixed(1)} ${baseY} L ${firstX.toFixed(1)} ${baseY} Z`}
            fill={color}
            fillOpacity={theme === "dark" ? 0.14 : 0.1}
            stroke="none"
          />
        );
      }
      pathEl = (
        <path
          d={dStr}
          fill="none"
          stroke={color}
          strokeWidth={strokeW}
          strokeDasharray={dashArray}
          strokeLinejoin="round"
          strokeLinecap={dashArray ? "butt" : "round"}
          strokeOpacity={tr.style?.opacity ?? 1}
        />
      );
    }

    let markersEl: React.ReactNode = null;
    if (showMarkers) {
      const baseR = tr.style?.markerSize ?? 5.5;
      const r = Math.max(3, Math.min(9, maxPts < 400 ? baseR * 0.78 : baseR));
      const isOperatingPt =
        (tr.name?.includes("Operating Point") || tr.name?.includes("Selected")) && count === 1;
      markersEl = Array.from({ length: count }, (_, i) => {
        const cx = mapX(xs[i] ?? 0);
        const cy = mapY(ys[i] ?? 0);
        return (
          <g key={`m-${i}`}>
            {isOperatingPt && (
              <circle
                cx={cx}
                cy={cy}
                r={r + 4}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeOpacity="0.45"
              />
            )}
            <circle cx={cx} cy={cy} r={r} fill={color} stroke={ringStroke} strokeWidth="2" />
          </g>
        );
      });
    }

    return (
      <g key={tr.name || trIdx}>
        {areaEl}
        {pathEl}
        {markersEl}
      </g>
    );
  });
}

function formatPlotTabTitle(rawTitle: string): string {
  const base = rawTitle.includes(":") ? (rawTitle.split(":")[0] ?? rawTitle).trim() : rawTitle;
  const compactMap: Array<[RegExp, string]> = [
    [/^Series Resonance$/i, "Resonance"],
    [/^.*Circuit$/i, "I(f)"],
    [/^AC Waveforms$/i, "Waveforms"],
    [/^RC Filter$/i, "Waveforms"],
    [/RC Filter Frequency.*/i, "Gain(f)"],
    [/Zener Voltage.*/i, "Vout vs Vs"],
    [/Zener Current.*/i, "Iz vs Vs"],
    [/Ohm'?s Law.*/i, "V-I Curve"],
    [/Power Dissipation.*/i, "Power P(V)"],
  ];
  for (const [pattern, label] of compactMap) {
    if (pattern.test(base)) {
      return label;
    }
  }
  return base;
}

export const PlotPane: React.FC<PlotPaneProps> = ({ theme }) => {
  const { figures, activeFigureId, setActiveFigure } = useWorkspaceStore();
  const [showDataTable, setShowDataTable] = useState(false);
  const [gridView, setGridView] = useState(false);

  const activeFigure: FigureSpec | undefined =
    figures.find((f) => f.id === activeFigureId) || figures[0];

  const traces: TraceData[] = activeFigure?.traces || [];
  const primaryTrace = traces[0];
  const bounds = useMemo(
    () => computeBounds(traces, activeFigure?.layout),
    [traces, activeFigure?.layout],
  );
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
  const gridStroke = theme === "dark" ? "#475569" : "#cbd5e1";
  const gridLine = theme === "dark" ? "#1e293b" : "#e2e8f0";
  const axisStroke = theme === "dark" ? "#94a3b8" : "#334155";
  const labelFill = theme === "dark" ? "#f8fafc" : "#0f172a";
  const titleFill = theme === "dark" ? "#ffffff" : "#020617";

  /** Render a clickable mini SVG card for grid layout */
  const renderMiniCard = (fig: FigureSpec, isActive: boolean) => {
    const b = computeBounds(fig.traces, fig.layout);
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
        <p className="font-bold text-xs text-fg mb-1.5 leading-snug">
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
          {renderShapes(fig.layout, b, mX, mY, MINI_PW, MINI_PH, MINI_M, theme)}
          {b && renderTraces(fig.traces, b, mX, mY, 250, theme)}
          <line
            x1={MINI_M.left}
            y1={MINI_M.top}
            x2={MINI_M.left}
            y2={MINI_M.top + MINI_PH}
            stroke={axisStroke}
            strokeWidth="1.4"
          />
          <line
            x1={MINI_M.left}
            y1={MINI_M.top + MINI_PH}
            x2={MINI_M.left + MINI_PW}
            y2={MINI_M.top + MINI_PH}
            stroke={axisStroke}
            strokeWidth="1.4"
          />
          {b && (
            <>
              <text
                x={MINI_M.left - 6}
                y={MINI_M.top + 10}
                textAnchor="end"
                fontSize="10"
                fontWeight="700"
                fontFamily="monospace"
                fill={labelFill}
              >
                {formatAxisTick(b.maxY)}
              </text>
              <text
                x={MINI_M.left - 6}
                y={MINI_M.top + MINI_PH}
                textAnchor="end"
                fontSize="10"
                fontWeight="700"
                fontFamily="monospace"
                fill={labelFill}
              >
                {formatAxisTick(b.minY)}
              </text>
              <text
                x={MINI_M.left}
                y={MINI_M.top + MINI_PH + 13}
                textAnchor="start"
                fontSize="10"
                fontWeight="700"
                fontFamily="monospace"
                fill={labelFill}
              >
                {formatAxisTick(b.minX)}
              </text>
              <text
                x={MINI_M.left + MINI_PW}
                y={MINI_M.top + MINI_PH + 13}
                textAnchor="end"
                fontSize="10"
                fontWeight="700"
                fontFamily="monospace"
                fill={labelFill}
              >
                {formatAxisTick(b.maxX)}
              </text>
            </>
          )}
          {fig.layout?.xLabel && (
            <text
              x={MINI_M.left + MINI_PW / 2}
              y={MINI_H - 6}
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              fill={titleFill}
            >
              {fig.layout.xLabel}
            </text>
          )}
        </svg>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[11px] text-fg-muted font-bold font-mono">
            {formatPlotTabTitle(fig.layout?.title || fig.id)}
          </span>
          {isActive && (
            <span className="text-[10px] font-bold text-brand uppercase tracking-wider">
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
            <>
              {figures.map((fig) => {
                const isActive = (activeFigureId || figures[0]?.id) === fig.id;
                return (
                  <button
                    key={fig.id}
                    type="button"
                    title={fig.layout?.title || fig.id}
                    onClick={() => {
                      setActiveFigure(fig.id);
                    }}
                    className={`flex items-center gap-1 rounded-t px-2 py-1 font-mono text-[11px] transition whitespace-nowrap shrink-0 ${
                      isActive
                        ? "border-t-2 border-brand bg-surface text-fg font-semibold shadow-sm"
                        : "text-fg-muted hover:bg-hover hover:text-fg"
                    }`}
                  >
                    <BarChart2 className="h-3 w-3 text-brand shrink-0" />
                    <span className="max-w-[96px] truncate">
                      {formatPlotTabTitle(fig.layout?.title || fig.id)}
                    </span>
                  </button>
                );
              })}
            </>
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
        {!activeFigure ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-fg-subtle">
            <Activity className="h-10 w-10 stroke-1 mb-2 opacity-40 text-brand" />
            <p className="font-medium text-sm text-fg-muted">No Waveforms Generated</p>
            <p className="text-xs max-w-xs mt-1">
              Click <strong className="text-fg">Simulate</strong> to visualize AC/DC waveforms and
              V-I characteristics.
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
            className="flex-1 min-h-0 w-full flex flex-col rounded border border-line bg-surface p-2 shadow-sm overflow-hidden"
          >
            {/* Header: title + bold legend */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-1 mb-1 flex-shrink-0">
              <h3 className="font-bold text-sm text-fg leading-snug min-w-0">
                {activeFigure.layout?.title || "Simulation Figure"}
              </h3>
              <div className="flex items-center gap-2.5 text-xs text-fg font-bold font-mono flex-wrap justify-end">
                {traces.map((tr, idx) => {
                  const swatchColor = tr.style?.color || TRACE_PALETTE[idx % TRACE_PALETTE.length];
                  const isMarker = tr.mode === "markers";
                  const isDashed = tr.style?.dash === "dash";
                  return (
                    <span
                      key={tr.name || idx}
                      className="flex items-center gap-1.5 whitespace-nowrap"
                    >
                      {isMarker ? (
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 shrink-0"
                          style={{ backgroundColor: swatchColor }}
                        />
                      ) : (
                        <span
                          className={`inline-block w-4 shrink-0 border-t-[3px] ${isDashed ? "border-dashed" : "border-solid"}`}
                          style={{ borderColor: swatchColor }}
                        />
                      )}
                      <span>{tr.name || `Trace ${idx + 1}`}</span>
                    </span>
                  );
                })}
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
                  strokeWidth="1.2"
                />

                {/* Horizontal gridlines + bold Y tick labels */}
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
                        strokeDasharray={frac === 0.5 ? "none" : "3 3"}
                        strokeWidth="1"
                      />
                      <text
                        x={MARGIN.left - 8}
                        y={yPos + 4}
                        textAnchor="end"
                        fontSize="12"
                        fontWeight="700"
                        fontFamily="monospace"
                        fill={labelFill}
                      >
                        {typeof yVal === "number" ? formatAxisTick(yVal) : yVal}
                      </text>
                    </g>
                  );
                })}

                {/* Vertical gridlines + bold X tick labels */}
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
                        strokeDasharray="3 3"
                        strokeWidth="1"
                      />
                      <text
                        x={xPos}
                        y={MARGIN.top + PLOT_H + 18}
                        textAnchor="middle"
                        fontSize="12"
                        fontWeight="700"
                        fontFamily="monospace"
                        fill={labelFill}
                      >
                        {typeof xVal === "number" ? formatAxisTick(xVal) : xVal}
                      </text>
                    </g>
                  );
                })}

                {/* Reference shapes (zero axis, T/4 peak line, fc cutoff, Vz knee) */}
                {renderShapes(
                  activeFigure.layout,
                  bounds,
                  mapX,
                  mapY,
                  PLOT_W,
                  PLOT_H,
                  MARGIN,
                  theme,
                )}

                {/* Trace paths + operating markers */}
                {bounds && renderTraces(traces, bounds, mapX, mapY, 600, theme)}

                {/* Axis lines */}
                <line
                  x1={MARGIN.left}
                  y1={MARGIN.top}
                  x2={MARGIN.left}
                  y2={MARGIN.top + PLOT_H}
                  stroke={axisStroke}
                  strokeWidth="1.6"
                />
                <line
                  x1={MARGIN.left}
                  y1={MARGIN.top + PLOT_H}
                  x2={MARGIN.left + PLOT_W}
                  y2={MARGIN.top + PLOT_H}
                  stroke={axisStroke}
                  strokeWidth="1.6"
                />

                {/* Bold Axis labels */}
                {activeFigure.layout?.xLabel && (
                  <text
                    x={MARGIN.left + PLOT_W / 2}
                    y={SVG_H - 8}
                    textAnchor="middle"
                    fontSize="13"
                    fontWeight="700"
                    fill={titleFill}
                  >
                    {activeFigure.layout.xLabel}
                  </text>
                )}
                {activeFigure.layout?.yLabel && (
                  <text
                    x={16}
                    y={MARGIN.top + PLOT_H / 2}
                    textAnchor="middle"
                    transform={`rotate(-90 16 ${MARGIN.top + PLOT_H / 2})`}
                    fontSize="13"
                    fontWeight="700"
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
