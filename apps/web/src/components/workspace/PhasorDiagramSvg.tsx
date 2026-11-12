import { type PhasorVector } from "../../engine/circuitTypes.js";

export function PhasorDiagramSvg({
  phasors,
  regimeLabel,
}: {
  phasors: PhasorVector[];
  regimeLabel?: string;
}) {
  if (phasors.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-xs text-fg-muted text-center">
        Energize an AC circuit (like Series R-L-C) with Switch Closed to view the real-time Phasor
        Diagram.
      </div>
    );
  }

  const cx = 155;
  const cy = 145;
  const maxR = 110;

  const maxVoltage = Math.max(
    1e-6,
    ...phasors.filter((p) => p.unit !== "A").map((p) => p.magnitude),
  );
  const maxCurrent = Math.max(
    1e-6,
    ...phasors.filter((p) => p.unit === "A").map((p) => p.magnitude),
  );

  const coords = phasors.map((p) => {
    const ratio =
      p.unit === "A" ? (p.magnitude / maxCurrent) * 0.58 : (p.magnitude / maxVoltage) * 0.92;
    const r = Math.max(12, ratio * maxR);
    const rad = (p.angleDeg * Math.PI) / 180;
    return {
      ...p,
      r,
      x2: cx + r * Math.cos(rad),
      y2: cy - r * Math.sin(rad),
    };
  });

  return (
    <div
      className="h-full flex flex-wrap items-center justify-center gap-2.5 p-2.5 overflow-y-auto"
      data-testid="phasor-diagram-svg"
    >
      <svg
        viewBox="0 0 310 290"
        className="w-[205px] h-auto shrink-0 rounded-xl border border-line bg-app"
      >
        <defs>
          {coords.map((p) => (
            <marker
              key={`arrow-${p.id}`}
              id={`phasor-arrow-${p.id}`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill={p.color} />
            </marker>
          ))}
        </defs>

        {/* Concentric reference rings */}
        <circle
          cx={cx}
          cy={cy}
          r={maxR * 0.5}
          fill="none"
          stroke="var(--border-line)"
          strokeDasharray="3 3"
        />
        <circle
          cx={cx}
          cy={cy}
          r={maxR}
          fill="none"
          stroke="var(--border-line)"
          strokeDasharray="4 4"
        />

        {/* Orthogonal Axes */}
        <line x1={25} y1={cy} x2={285} y2={cy} stroke="var(--border-line)" strokeWidth={1} />
        <line x1={cx} y1={20} x2={cx} y2={270} stroke="var(--border-line)" strokeWidth={1} />

        <text x={282} y={cy + 13} textAnchor="end" fontSize={9} fill="var(--fg-subtle)">
          0° (Ref I)
        </text>
        <text x={cx + 5} y={28} fontSize={9} fill="var(--fg-subtle)">
          +90° (VL)
        </text>
        <text x={cx + 5} y={266} fontSize={9} fill="var(--fg-subtle)">
          −90° (VC)
        </text>

        {/* Vectors */}
        {coords.map((p) => (
          <g key={p.id}>
            <line
              x1={cx}
              y1={cy}
              x2={p.x2}
              y2={p.y2}
              stroke={p.color}
              strokeWidth={p.id === "Vs" || p.id === "I" ? 2.8 : 2}
              markerEnd={`url(#phasor-arrow-${p.id})`}
            />
            <text
              x={p.x2 + (Math.cos((p.angleDeg * Math.PI) / 180) >= 0 ? 6 : -6)}
              y={p.y2 + (Math.sin((p.angleDeg * Math.PI) / 180) >= 0 ? -5 : 11)}
              textAnchor={Math.cos((p.angleDeg * Math.PI) / 180) >= 0 ? "start" : "end"}
              fontSize={10}
              fontWeight={700}
              fill={p.color}
            >
              {p.label.split(" ")[0]}
            </text>
          </g>
        ))}

        <circle cx={cx} cy={cy} r={3} fill="var(--fg)" />
      </svg>

      <div className="space-y-1.5 flex-1 min-w-[205px] max-w-[245px]">
        {regimeLabel && (
          <div className="text-[11px] font-bold text-fg pb-1 border-b border-line truncate">
            {regimeLabel}
          </div>
        )}
        <div className="space-y-1">
          {phasors.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-1.5 px-2 py-1 rounded-md bg-surface-2 border border-line text-[11px]"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: p.color }}
                />
                <span className="font-medium text-fg truncate">{p.label}</span>
              </div>
              <span className="font-mono text-[10px] font-semibold text-fg-muted whitespace-nowrap shrink-0">
                {p.magnitude.toFixed(2)} {p.unit} ∠ {p.angleDeg >= 0 ? "+" : ""}
                {p.angleDeg.toFixed(1)}°
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
