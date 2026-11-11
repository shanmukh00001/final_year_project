import React, { useMemo, useRef, useState } from "react";
import {
  Cable,
  CheckCircle2,
  Eraser,
  MousePointer2,
  Play,
  Scissors,
  Sparkles,
  AlertTriangle,
  Power,
  Zap,
} from "lucide-react";
import { type ParamDecl } from "@vlab/shared";
import {
  type CircuitComponent,
  type CircuitWire,
  type TerminalRef,
} from "../../engine/circuitTypes.js";
import { useWorkspaceStore, type CircuitTool } from "../../store/workspaceStore.js";

interface DragState {
  compId: string;
  startClientX: number;
  startClientY: number;
  origX: number;
  origY: number;
  moved: boolean;
}

function getTerminalWorldPos(comp: CircuitComponent, terminalId: string): { x: number; y: number } {
  const t = comp.terminals.find((item) => item.id === terminalId) ?? comp.terminals[0];
  if (!t) {
    return { x: comp.x, y: comp.y };
  }
  return { x: comp.x + t.dx, y: comp.y + t.dy };
}

function buildWirePath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  if (dx < 6 || dy < 6) {
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  }
  // Clean orthogonal elbow path for schematic legibility
  if (dx >= dy) {
    const midX = (from.x + to.x) / 2;
    return `M ${from.x} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${to.x} ${to.y}`;
  }
  const midY = (from.y + to.y) / 2;
  return `M ${from.x} ${from.y} L ${from.x} ${midY} L ${to.x} ${midY} L ${to.x} ${to.y}`;
}

function getRegimeBadgeStyle(tone?: string): string {
  switch (tone) {
    case "resonant":
    case "ohmic":
    case "verified":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    case "inductive":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30";
    case "capacitive":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
    case "non_ohmic":
      return "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30";
    default:
      return "bg-surface-2 text-fg-muted border-line";
  }
}

function ParamInlineControl({
  decl,
  value,
  onChange,
}: {
  decl: ParamDecl;
  value: number | string | boolean;
  onChange: (val: number | string | boolean) => void;
}) {
  if (decl.kind === "toggle") {
    const checked = Boolean(value);
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-fg">{decl.label || decl.name}:</span>
        <button
          type="button"
          onClick={() => onChange(!checked)}
          data-testid={`canvas-toggle-${decl.name}`}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border transition-colors ${
            checked
              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
              : "bg-surface-2 border-line text-fg-muted hover:text-fg"
          }`}
        >
          <Power className="w-3.5 h-3.5" />
          {checked ? "CLOSED (ON)" : "OPEN (OFF)"}
        </button>
      </div>
    );
  }

  if (decl.kind === "select") {
    return (
      <label className="flex items-center gap-2 text-xs">
        <span className="font-medium text-fg">{decl.label || decl.name}:</span>
        <select
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          className="bg-surface-2 border border-line rounded px-2 py-1 text-xs text-fg focus:outline-none focus:border-brand"
        >
          {(decl.options || []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
    );
  }

  const numVal = typeof value === "number" ? value : Number(value) || 0;
  const min = decl.min ?? 0;
  const max = decl.max ?? 1000;

  return (
    <div className="flex items-center gap-2 flex-nowrap shrink-0">
      <label className="flex items-center gap-1 text-xs whitespace-nowrap">
        <span className="font-semibold text-fg">{decl.name}:</span>
        <input
          type="number"
          min={min}
          max={max}
          step="any"
          value={numVal}
          aria-label={decl.label || decl.name}
          data-testid={`canvas-input-${decl.name}`}
          onChange={(e) => {
            const parsed = parseFloat(e.target.value);
            if (Number.isFinite(parsed)) {
              onChange(Math.min(Math.max(parsed, min), max));
            }
          }}
          className="w-16 bg-surface-2 border border-line rounded px-1.5 py-0.5 text-xs font-mono text-fg focus:outline-none focus:border-brand"
        />
        {decl.unit && <span className="text-[11px] text-fg-muted font-mono">{decl.unit}</span>}
      </label>
    </div>
  );
}

function ComponentSymbol({
  comp,
  isSelected,
  isSwitchClosed,
  readout,
  energized,
}: {
  comp: CircuitComponent;
  isSelected: boolean;
  isSwitchClosed: boolean;
  readout?: string | undefined;
  energized: boolean;
}) {
  const strokeColor = isSelected
    ? "var(--brand)"
    : comp.kind === "ac_source" || comp.kind === "dc_source"
      ? "#0284c7"
      : "var(--fg-default)";

  const labelYOffset = comp.orientation === "v" ? -48 : -28;

  return (
    <g>
      {/* Selection Halo */}
      {isSelected && (
        <rect
          x={-48}
          y={-34}
          width={96}
          height={68}
          rx={8}
          fill="var(--brand)"
          fillOpacity={0.08}
          stroke="var(--brand)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
      )}

      {/* Symbol body by kind */}
      {comp.kind === "ac_source" && (
        <g>
          <line x1={0} y1={-40} x2={0} y2={-22} stroke={strokeColor} strokeWidth={2.2} />
          <line x1={0} y1={22} x2={0} y2={40} stroke={strokeColor} strokeWidth={2.2} />
          <circle
            cx={0}
            cy={0}
            r={22}
            fill="var(--bg-surface)"
            stroke={strokeColor}
            strokeWidth={2.2}
          />
          <path
            d="M -11 0 C -6 -10, -2 -10, 0 0 C 2 10, 6 10, 11 0"
            fill="none"
            stroke={strokeColor}
            strokeWidth={2.2}
            strokeLinecap="round"
          />
          <text x={-16} y={-24} fontSize={10} fontWeight={700} fill="#0284c7">
            ~
          </text>
        </g>
      )}

      {comp.kind === "dc_source" && (
        <g>
          <line x1={0} y1={-40} x2={0} y2={-10} stroke={strokeColor} strokeWidth={2.2} />
          <line x1={-16} y1={-10} x2={16} y2={-10} stroke={strokeColor} strokeWidth={2.5} />
          <line x1={-9} y1={-2} x2={9} y2={-2} stroke={strokeColor} strokeWidth={3.2} />
          <line x1={-16} y1={6} x2={16} y2={6} stroke={strokeColor} strokeWidth={2.5} />
          <line x1={-9} y1={14} x2={9} y2={14} stroke={strokeColor} strokeWidth={3.2} />
          <line x1={0} y1={14} x2={0} y2={40} stroke={strokeColor} strokeWidth={2.2} />
          <text x={11} y={-17} fontSize={11} fontWeight={700} fill="#dc2626">
            +
          </text>
          <text x={11} y={28} fontSize={12} fontWeight={700} fill={strokeColor}>
            −
          </text>
        </g>
      )}

      {comp.kind === "switch" && (
        <g>
          <line x1={-36} y1={0} x2={-16} y2={0} stroke={strokeColor} strokeWidth={2.2} />
          <line x1={16} y1={0} x2={36} y2={0} stroke={strokeColor} strokeWidth={2.2} />
          <circle
            cx={-16}
            cy={0}
            r={3.5}
            fill="var(--bg-surface)"
            stroke={strokeColor}
            strokeWidth={2}
          />
          <circle
            cx={16}
            cy={0}
            r={3.5}
            fill="var(--bg-surface)"
            stroke={strokeColor}
            strokeWidth={2}
          />
          <line
            x1={-15}
            y1={0}
            x2={isSwitchClosed ? 16 : 12}
            y2={isSwitchClosed ? 0 : -16}
            stroke={isSwitchClosed ? "#10b981" : "#f59e0b"}
            strokeWidth={3}
            strokeLinecap="round"
          />
        </g>
      )}

      {(comp.kind === "ammeter" || comp.kind === "voltmeter" || comp.kind === "wattmeter") && (
        <g>
          {comp.orientation === "h" ? (
            <>
              <line x1={-36} y1={0} x2={-19} y2={0} stroke={strokeColor} strokeWidth={2} />
              <line x1={19} y1={0} x2={36} y2={0} stroke={strokeColor} strokeWidth={2} />
            </>
          ) : (
            <>
              <line x1={0} y1={-36} x2={0} y2={-19} stroke={strokeColor} strokeWidth={2} />
              <line x1={0} y1={19} x2={0} y2={36} stroke={strokeColor} strokeWidth={2} />
            </>
          )}
          <circle
            cx={0}
            cy={0}
            r={19}
            fill="var(--bg-surface)"
            stroke={
              comp.kind === "ammeter"
                ? "#059669"
                : comp.kind === "wattmeter"
                  ? "#7c3aed"
                  : "#0284c7"
            }
            strokeWidth={2.2}
          />
          <text
            x={0}
            y={5}
            textAnchor="middle"
            fontSize={13}
            fontWeight={700}
            fill={
              comp.kind === "ammeter"
                ? "#059669"
                : comp.kind === "wattmeter"
                  ? "#7c3aed"
                  : "#0284c7"
            }
          >
            {comp.kind === "ammeter" ? "A" : comp.kind === "wattmeter" ? "W" : "V"}
          </text>
        </g>
      )}

      {comp.kind === "resistor" && comp.orientation === "h" && (
        <g>
          <path
            d="M -44 0 L -26 0 L -21 -10 L -13 10 L -5 -10 L 4 10 L 12 -10 L 20 10 L 25 0 L 44 0"
            fill="none"
            stroke={strokeColor}
            strokeWidth={2.2}
            strokeLinejoin="round"
          />
        </g>
      )}

      {comp.kind === "resistor" && comp.orientation === "v" && (
        <g>
          <path
            d="M 0 -40 L 0 -24 L -10 -19 L 10 -12 L -10 -4 L 10 4 L -10 12 L 10 19 L 0 24 L 0 40"
            fill="none"
            stroke={strokeColor}
            strokeWidth={2.2}
            strokeLinejoin="round"
          />
        </g>
      )}

      {comp.kind === "inductor" && (
        <g transform={comp.orientation === "v" ? "rotate(90)" : undefined}>
          <line x1={-44} y1={0} x2={-28} y2={0} stroke={strokeColor} strokeWidth={2.2} />
          <path
            d="M -28 0 A 7 8 0 0 1 -14 0 A 7 8 0 0 1 0 0 A 7 8 0 0 1 14 0 A 7 8 0 0 1 28 0"
            fill="none"
            stroke={strokeColor}
            strokeWidth={2.3}
          />
          <line x1={28} y1={0} x2={44} y2={0} stroke={strokeColor} strokeWidth={2.2} />
        </g>
      )}

      {comp.kind === "capacitor" && (
        <g transform={comp.orientation === "v" ? "rotate(90)" : undefined}>
          <line x1={-44} y1={0} x2={-5} y2={0} stroke={strokeColor} strokeWidth={2.2} />
          <line x1={-5} y1={-16} x2={-5} y2={16} stroke={strokeColor} strokeWidth={2.8} />
          <line x1={5} y1={-16} x2={5} y2={16} stroke={strokeColor} strokeWidth={2.8} />
          <line x1={5} y1={0} x2={44} y2={0} stroke={strokeColor} strokeWidth={2.2} />
        </g>
      )}

      {comp.kind === "diode" && (
        <g
          transform={
            comp.orientation === "v"
              ? comp.id === "zener"
                ? "rotate(-90)"
                : "rotate(90)"
              : undefined
          }
        >
          <line x1={-44} y1={0} x2={-12} y2={0} stroke={strokeColor} strokeWidth={2.2} />
          <polygon
            points="-12,-13 12,0 -12,13"
            fill={energized ? "#10b981" : "var(--bg-surface)"}
            fillOpacity={energized ? 0.25 : 1}
            stroke={strokeColor}
            strokeWidth={2.2}
          />
          {comp.id === "zener" ? (
            <path
              d="M 8 -16 L 12 -13 L 12 13 L 16 16"
              fill="none"
              stroke={strokeColor}
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <line x1={12} y1={-13} x2={12} y2={13} stroke={strokeColor} strokeWidth={2.8} />
          )}
          <line x1={12} y1={0} x2={44} y2={0} stroke={strokeColor} strokeWidth={2.2} />
        </g>
      )}

      {comp.kind === "ground" && (
        <g>
          <line x1={0} y1={-16} x2={0} y2={0} stroke={strokeColor} strokeWidth={2.2} />
          <line x1={-16} y1={0} x2={16} y2={0} stroke={strokeColor} strokeWidth={2.2} />
          <line x1={-10} y1={6} x2={10} y2={6} stroke={strokeColor} strokeWidth={2} />
          <line x1={-4} y1={12} x2={4} y2={12} stroke={strokeColor} strokeWidth={2} />
        </g>
      )}

      {/* Symbol Title Label */}
      <text
        x={comp.orientation === "v" ? 24 : 0}
        y={comp.orientation === "v" ? -10 : labelYOffset}
        textAnchor={comp.orientation === "v" ? "start" : "middle"}
        fontSize={11}
        fontWeight={700}
        fill="var(--fg-default)"
      >
        {comp.symbol}
      </text>

      {/* Live Value / Readout Pill */}
      {readout && (
        <g
          transform={`translate(${comp.orientation === "v" ? 24 : 0}, ${comp.orientation === "v" ? 8 : 26})`}
        >
          <rect
            x={comp.orientation === "v" ? 0 : -46}
            y={-9}
            width={comp.orientation === "v" ? Math.max(58, readout.length * 6.5 + 10) : 92}
            height={17}
            rx={4}
            fill="var(--bg-surface-2)"
            stroke={energized ? "var(--brand)" : "var(--border-strong)"}
            strokeOpacity={energized ? 0.5 : 1}
            strokeWidth={1}
          />
          <text
            x={comp.orientation === "v" ? 5 : 0}
            y={3}
            textAnchor={comp.orientation === "v" ? "start" : "middle"}
            fontSize={10}
            fontWeight={600}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fill="var(--fg-default)"
          >
            {readout}
          </text>
        </g>
      )}
    </g>
  );
}

export function CircuitMakerPane() {
  const {
    experimentId,
    components,
    wires,
    params,
    declaredParams,
    activeTool,
    selectedComponentId,
    pendingTerminal,
    simulation,
    setActiveTool,
    setSelectedComponent,
    moveComponent,
    clickTerminal,
    deleteWire,
    autoWireCircuit,
    clearAllWires,
    checkConnections,
    simulate,
    setParamValue,
  } = useWorkspaceStore();

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoveredWireId, setHoveredWireId] = useState<string | null>(null);

  const presentComponents = useMemo(() => components.filter((c) => c.present), [components]);

  const componentMap = useMemo(() => {
    const map = new Map<string, CircuitComponent>();
    for (const c of presentComponents) {
      map.set(c.id, c);
    }
    return map;
  }, [presentComponents]);

  const selectedComp = useMemo(() => {
    if (selectedComponentId) {
      return presentComponents.find((c) => c.id === selectedComponentId) ?? null;
    }
    return (
      presentComponents.find((c) => c.paramKey && declaredParams[c.paramKey]) ??
      presentComponents[0] ??
      null
    );
  }, [selectedComponentId, presentComponents, declaredParams]);

  const toSvgCoords = (clientX: number, clientY: number): { x: number; y: number } => {
    const svg = svgRef.current;
    if (!svg) {
      return { x: 400, y: 210 };
    }
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return { x: 400, y: 210 };
    }
    return {
      x: Math.round(((clientX - rect.left) / rect.width) * 800),
      y: Math.round(((clientY - rect.top) / rect.height) * 420),
    };
  };

  const handleCompPointerDown = (e: React.PointerEvent, comp: CircuitComponent) => {
    e.stopPropagation();
    setSelectedComponent(comp.id);
    if (activeTool !== "select") {
      return;
    }
    setDrag({
      compId: comp.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: comp.x,
      origY: comp.y,
      moved: false,
    });
  };

  const handleSvgPointerMove = (e: React.PointerEvent) => {
    if (!drag || !svgRef.current) {
      return;
    }
    const rect = svgRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return;
    }
    const deltaPx = Math.hypot(e.clientX - drag.startClientX, e.clientY - drag.startClientY);
    if (deltaPx < 5 && !drag.moved) {
      return;
    }
    const dxSvg = ((e.clientX - drag.startClientX) / rect.width) * 800;
    const dySvg = ((e.clientY - drag.startClientY) / rect.height) * 420;
    const snappedX = Math.min(740, Math.max(60, Math.round((drag.origX + dxSvg) / 10) * 10));
    const snappedY = Math.min(370, Math.max(50, Math.round((drag.origY + dySvg) / 10) * 10));
    if (!drag.moved) {
      setDrag({ ...drag, moved: true });
    }
    moveComponent(drag.compId, snappedX, snappedY);
  };

  const handleSvgPointerUp = () => {
    if (drag && !drag.moved) {
      const clicked = componentMap.get(drag.compId);
      if (clicked && clicked.kind === "switch" && clicked.paramKey) {
        const cur = Boolean(params[clicked.paramKey]);
        setParamValue(clicked.paramKey, !cur);
      }
    }
    setDrag(null);
  };

  const handleTerminalClick = (e: React.MouseEvent, ref: TerminalRef) => {
    e.stopPropagation();
    clickTerminal(ref);
  };

  const handleWireClick = (e: React.MouseEvent, wire: CircuitWire) => {
    e.stopPropagation();
    if (activeTool === "delete_wire") {
      deleteWire(wire.id);
    }
  };

  const toolButton = (tool: CircuitTool, label: string, icon: React.ReactNode) => {
    const active = activeTool === tool;
    return (
      <button
        type="button"
        onClick={() => setActiveTool(tool)}
        data-testid={`tool-${tool}`}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors border ${
          active
            ? "bg-brand text-white border-brand shadow-sm"
            : "bg-surface-2 text-fg-muted border-line hover:text-fg hover:bg-hover"
        }`}
      >
        {icon}
        {label}
      </button>
    );
  };

  const conn = simulation?.connection;
  const energized = Boolean(simulation?.energized);

  return (
    <div
      className="h-full flex flex-col bg-surface overflow-hidden select-none"
      data-testid="pane-circuit-maker"
    >
      {/* Top Circuit Maker Toolbar */}
      <div className="px-2 py-1 bg-surface-2 border-b border-line flex items-center justify-between gap-1.5 flex-wrap shrink-0">
        <div className="flex items-center gap-1 flex-wrap min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand mr-0.5 flex items-center gap-1 whitespace-nowrap shrink-0">
            <Zap className="w-3.5 h-3.5" />
            Circuit
          </span>
          {toolButton("select", "Edit", <MousePointer2 className="w-3 h-3" />)}
          {toolButton("wire", "Wire", <Cable className="w-3 h-3" />)}
          {toolButton("delete_wire", "Cut", <Scissors className="w-3 h-3" />)}

          <div className="h-3.5 w-px bg-line mx-0.5 shrink-0" />

          <button
            type="button"
            onClick={autoWireCircuit}
            data-testid="btn-auto-wire"
            title="Restore recommended IIT (ISM) Dhanbad schematic connections"
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium text-fg-muted hover:text-fg hover:bg-hover border border-line transition-colors whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3 h-3 text-brand" />
            Auto-Wire
          </button>

          <button
            type="button"
            onClick={clearAllWires}
            data-testid="btn-clear-wires"
            title="Remove all wires so you can wire components manually"
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium text-fg-muted hover:text-danger-500 hover:bg-hover border border-line transition-colors whitespace-nowrap shrink-0"
          >
            <Eraser className="w-3 h-3" />
            Clear
          </button>

          <button
            type="button"
            onClick={checkConnections}
            data-testid="btn-check-connections"
            title="Verify all wires and loop connections"
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium text-fg-muted hover:text-fg hover:bg-hover border border-line transition-colors whitespace-nowrap shrink-0"
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            Check
          </button>
        </div>

        <button
          type="button"
          onClick={simulate}
          data-testid="btn-simulate-canvas"
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors whitespace-nowrap shrink-0"
        >
          <Play className="w-3 h-3 fill-current" />
          Simulate
        </button>
      </div>

      {/* Pending Terminal / Connection Status Banner */}
      {pendingTerminal && (
        <div className="px-3 py-1 bg-brand/10 border-b border-brand/25 text-xs text-brand font-medium flex items-center justify-between">
          <span>
            Wiring from{" "}
            <strong>
              {pendingTerminal.compId}.{pendingTerminal.terminalId}
            </strong>{" "}
            — click another component terminal to connect.
          </span>
          <button
            type="button"
            onClick={() => clickTerminal(pendingTerminal)}
            className="underline text-[11px]"
          >
            Cancel
          </button>
        </div>
      )}

      {conn && !conn.valid && (
        <div
          data-testid="connection-warning-banner"
          className="px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              <strong>{conn.title}:</strong> {conn.message}
            </span>
          </div>
          {conn.status === "open_switch" ? (
            <button
              type="button"
              onClick={() => {
                const sw = components.find((c) => c.kind === "switch" && c.paramKey);
                if (sw?.paramKey) {
                  setParamValue(sw.paramKey, true);
                }
              }}
              className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 font-semibold text-[11px] shrink-0"
            >
              Close Switch
            </button>
          ) : (
            <button
              type="button"
              onClick={autoWireCircuit}
              className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 font-semibold text-[11px] shrink-0"
            >
              Fix Wires
            </button>
          )}
        </div>
      )}

      {/* Interactive SVG Circuit Board */}
      <div className="flex-1 min-h-0 relative bg-app overflow-hidden flex items-center justify-center p-1.5">
        {simulation && (
          <span
            data-testid="circuit-regime-badge"
            title={simulation.regimeLabel}
            className={`absolute top-2 right-2.5 z-10 pointer-events-none px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-sm whitespace-nowrap truncate max-w-[300px] ${getRegimeBadgeStyle(
              simulation.regimeTone,
            )}`}
          >
            {simulation.regimeLabel}
          </span>
        )}
        <svg
          ref={svgRef}
          viewBox="0 0 800 420"
          data-testid="circuit-canvas-svg"
          onPointerMove={handleSvgPointerMove}
          onPointerUp={handleSvgPointerUp}
          onPointerLeave={handleSvgPointerUp}
          onClick={() => setSelectedComponent(null)}
          onDoubleClick={(e) => {
            const pt = toSvgCoords(e.clientX, e.clientY);
            if (drag) {
              moveComponent(drag.compId, pt.x, pt.y);
            }
          }}
          className={`w-full h-full max-h-full rounded-lg border border-line bg-surface shadow-inner ${
            activeTool === "wire"
              ? "cursor-crosshair"
              : activeTool === "delete_wire"
                ? "cursor-not-allowed"
                : "cursor-default"
          }`}
        >
          <defs>
            <pattern id="vlab-grid-small" width="20" height="20" patternUnits="userSpaceOnUse">
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="var(--border-subtle)"
                strokeOpacity={0.55}
                strokeWidth="0.6"
              />
            </pattern>
            <pattern id="vlab-grid-major" width="100" height="100" patternUnits="userSpaceOnUse">
              <rect width="100" height="100" fill="url(#vlab-grid-small)" />
              <path
                d="M 100 0 L 0 0 0 100"
                fill="none"
                stroke="var(--border-strong)"
                strokeOpacity={0.5}
                strokeWidth="1"
              />
            </pattern>
          </defs>

          {/* Engineering Grid Background */}
          <rect width="800" height="420" fill="url(#vlab-grid-major)" />

          {/* Header Legend Inside Board */}
          <text x={18} y={24} fontSize={11} fontWeight={700} fill="var(--fg-muted)">
            IIT (ISM) DHANBAD VIRTUAL LAB · INTERACTIVE CIRCUIT BOARD ({experimentId})
          </text>
          <text x={18} y={406} fontSize={9.5} fill="var(--fg-subtle)">
            Click component to edit value · Click switch to toggle · Click terminals to wire
          </text>

          {/* Wires Layer */}
          <g>
            {wires.map((wire) => {
              const fromComp = componentMap.get(wire.from.compId);
              const toComp = componentMap.get(wire.to.compId);
              if (!fromComp || !toComp) {
                return null;
              }
              const p1 = getTerminalWorldPos(fromComp, wire.from.terminalId);
              const p2 = getTerminalWorldPos(toComp, wire.to.terminalId);
              const d = buildWirePath(p1, p2);
              const isVoltmeterLead = fromComp.kind === "voltmeter" || toComp.kind === "voltmeter";
              const isHovered = hoveredWireId === wire.id;

              return (
                <g
                  key={wire.id}
                  onMouseEnter={() => setHoveredWireId(wire.id)}
                  onMouseLeave={() => setHoveredWireId(null)}
                  onClick={(e) => handleWireClick(e, wire)}
                  className={activeTool === "delete_wire" ? "cursor-pointer" : undefined}
                >
                  {/* Wide hit target for easy deleting */}
                  <path d={d} fill="none" stroke="transparent" strokeWidth={12} />
                  <path
                    d={d}
                    fill="none"
                    stroke={
                      isHovered && activeTool === "delete_wire"
                        ? "#ef4444"
                        : isVoltmeterLead
                          ? "#0284c7"
                          : energized
                            ? "#10b981"
                            : "var(--fg-muted)"
                    }
                    strokeWidth={isHovered && activeTool === "delete_wire" ? 3.5 : 2.3}
                    strokeDasharray={isVoltmeterLead ? "5 4" : undefined}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {/* Subtle current flow dots when energized & non-voltmeter */}
                  {energized && !isVoltmeterLead && (
                    <path
                      d={d}
                      fill="none"
                      stroke="#34d399"
                      strokeWidth={2.5}
                      strokeDasharray="4 14"
                      strokeLinecap="round"
                    >
                      <animate
                        attributeName="stroke-dashoffset"
                        from="18"
                        to="0"
                        dur="0.85s"
                        repeatCount="indefinite"
                      />
                    </path>
                  )}
                </g>
              );
            })}
          </g>

          {/* Components Layer */}
          <g>
            {presentComponents.map((comp) => {
              const isSelected = selectedComp?.id === comp.id;
              const isSwitchClosed =
                comp.kind === "switch" && comp.paramKey ? Boolean(params[comp.paramKey]) : true;
              const compDecl = comp.paramKey ? declaredParams[comp.paramKey] : undefined;
              const rawParamVal = comp.paramKey
                ? (params[comp.paramKey] ?? compDecl?.default)
                : undefined;
              const fallbackReadout =
                comp.kind === "switch"
                  ? isSwitchClosed
                    ? "CLOSED"
                    : "OPEN"
                  : comp.paramKey && compDecl
                    ? `${String(rawParamVal)} ${comp.unit || compDecl.unit || ""}`.trim()
                    : comp.valueText;
              const readout =
                comp.kind === "switch"
                  ? isSwitchClosed
                    ? "CLOSED"
                    : "OPEN"
                  : simulation?.componentReadouts[comp.id] || fallbackReadout;

              return (
                <g
                  key={comp.id}
                  transform={`translate(${comp.x}, ${comp.y})`}
                  onPointerDown={(e) => handleCompPointerDown(e, comp)}
                  data-testid={`circuit-comp-${comp.id}`}
                  className={
                    activeTool === "select"
                      ? "cursor-grab active:cursor-grabbing"
                      : "cursor-pointer"
                  }
                >
                  {/* Transparent hitbox so clicking middle of zigzag/plates selects component */}
                  <rect x={-44} y={-32} width={88} height={64} fill="transparent" />

                  <ComponentSymbol
                    comp={comp}
                    isSelected={isSelected}
                    isSwitchClosed={isSwitchClosed}
                    readout={readout}
                    energized={energized}
                  />

                  {/* Clickable Terminals */}
                  {comp.terminals.map((term) => {
                    const isPending =
                      pendingTerminal?.compId === comp.id &&
                      pendingTerminal?.terminalId === term.id;
                    return (
                      <g
                        key={term.id}
                        transform={`translate(${term.dx}, ${term.dy})`}
                        onClick={(e) =>
                          handleTerminalClick(e, { compId: comp.id, terminalId: term.id })
                        }
                        onPointerDown={(e) => e.stopPropagation()}
                        data-testid={`terminal-${comp.id}-${term.id}`}
                        className="cursor-crosshair"
                      >
                        <circle r={10} fill="transparent" />
                        {isPending && (
                          <circle
                            r={9}
                            fill="none"
                            stroke="var(--brand)"
                            strokeWidth={2}
                            strokeDasharray="2 2"
                          />
                        )}
                        <circle
                          r={isPending ? 5.5 : 4.5}
                          fill={isPending ? "var(--brand)" : "var(--bg-surface)"}
                          stroke={isPending ? "#ffffff" : "var(--brand)"}
                          strokeWidth={1.8}
                        />
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Bottom Selected Component Value Bar — user can directly set ANY value here */}
      <div
        data-testid="selected-component-bar"
        className="px-2.5 py-1 bg-surface border-t border-line flex items-center justify-between gap-2 flex-nowrap overflow-x-auto shrink-0 min-h-[34px]"
      >
        {selectedComp ? (
          <>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="px-1.5 py-0.5 rounded bg-brand/10 text-brand font-mono text-[11px] font-bold">
                {selectedComp.symbol}
              </span>
              <span className="text-[11px] font-semibold text-fg whitespace-nowrap">
                {selectedComp.name}
              </span>
            </div>

            <div className="flex items-center gap-3 flex-nowrap shrink-0">
              {(() => {
                const primaryDecl = selectedComp.paramKey
                  ? declaredParams[selectedComp.paramKey]
                  : undefined;
                const secondaryDecl = selectedComp.secondaryParamKey
                  ? declaredParams[selectedComp.secondaryParamKey]
                  : undefined;
                return (
                  <>
                    {primaryDecl ? (
                      <ParamInlineControl
                        decl={primaryDecl}
                        value={params[primaryDecl.name] ?? primaryDecl.default}
                        onChange={(val) => setParamValue(primaryDecl.name, val)}
                      />
                    ) : (
                      <span className="text-xs text-fg-muted">
                        Measurement / reference instrument — edit circuit values from source, load,
                        or left panel.
                      </span>
                    )}

                    {secondaryDecl && (
                      <ParamInlineControl
                        decl={secondaryDecl}
                        value={params[secondaryDecl.name] ?? secondaryDecl.default}
                        onChange={(val) => setParamValue(secondaryDecl.name, val)}
                      />
                    )}
                  </>
                );
              })()}
            </div>
          </>
        ) : (
          <span className="text-xs text-fg-muted">
            Select any component on the board to edit its value directly, or adjust all parameters
            on the left.
          </span>
        )}
      </div>
    </div>
  );
}
