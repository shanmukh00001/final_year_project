import { useEffect, useState } from "react";
import { BookOpen, Cpu, RotateCcw, Sliders, ToggleLeft, ToggleRight } from "lucide-react";
import { type ParamDecl } from "@vlab/shared";
import { getExperimentById } from "../../data/curriculum/index.js";
import { useWorkspaceStore } from "../../store/workspaceStore.js";

function NumberParamControl({
  decl,
  value,
  onChange,
}: {
  decl: ParamDecl & { unit?: string };
  value: number;
  onChange: (val: number) => void;
}) {
  const [draft, setDraft] = useState<string>(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const min = decl.min ?? 0;
  const max = decl.max ?? 1000;
  const step = decl.step ?? 1;

  const commitDraft = (raw: string) => {
    const parsed = parseFloat(raw);
    if (Number.isFinite(parsed)) {
      const clamped = Math.min(Math.max(parsed, min), max);
      setDraft(String(clamped));
      onChange(clamped);
    } else {
      setDraft(String(value));
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-fg truncate" title={decl.label || decl.name}>
          {decl.label || decl.name}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <input
            type="number"
            min={min}
            max={max}
            step="any"
            value={draft}
            data-testid={`param-input-${decl.name}`}
            onChange={(e) => {
              const raw = e.target.value;
              setDraft(raw);
              const parsed = parseFloat(raw);
              if (Number.isFinite(parsed) && parsed >= min && parsed <= max) {
                onChange(parsed);
              }
            }}
            onBlur={() => commitDraft(draft)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commitDraft(draft);
              }
            }}
            className="w-16 bg-surface border border-line rounded px-1.5 py-0.5 text-right font-mono text-xs text-fg focus:outline-none focus:border-brand"
          />
          {decl.unit && (
            <span className="text-[11px] font-mono text-fg-muted w-6 text-left">{decl.unit}</span>
          )}
        </div>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        data-testid={`param-slider-${decl.name}`}
        onChange={(e) => {
          const parsed = Math.round(parseFloat(e.target.value) * 1e6) / 1e6;
          setDraft(String(parsed));
          onChange(parsed);
        }}
        className="w-full accent-[var(--brand)] cursor-pointer h-1.5"
      />
      <div className="flex justify-between text-[10px] font-mono text-fg-subtle">
        <span>
          {min}
          {decl.unit ? ` ${decl.unit}` : ""}
        </span>
        <span>
          {max}
          {decl.unit ? ` ${decl.unit}` : ""}
        </span>
      </div>
    </div>
  );
}

export function Explorer() {
  const {
    experimentId,
    components,
    wires,
    selectedComponentId,
    params,
    declaredParams,
    setParamValue,
    resetParamsToDefault,
    setSelectedComponent,
    toggleComponentPresent,
    setActiveVlabTab,
  } = useWorkspaceStore();

  const experiment = getExperimentById(experimentId);
  const paramList = Object.values(declaredParams) as Array<ParamDecl & { unit?: string }>;

  return (
    <div
      className="h-full flex flex-col bg-surface border-r border-line overflow-hidden"
      data-testid="pane-explorer"
    >
      {/* Header */}
      <div className="px-3 py-2 bg-surface-2 border-b border-line flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-fg-muted">
          Circuit & Values
        </span>
        <span className="px-1.5 py-0.5 rounded bg-brand/10 text-brand font-mono text-[10px] font-bold">
          {experimentId}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-line">
        {/* Section 1: User-Editable Circuit & Source Values */}
        <section className="p-3 space-y-3" data-testid="explorer-params-section">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-fg flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-brand" />
              User Circuit Values
            </h3>
            <button
              type="button"
              onClick={resetParamsToDefault}
              data-testid="btn-reset-params"
              title="Reset values to lab defaults"
              className="inline-flex items-center gap-1 text-[11px] text-fg-muted hover:text-fg"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>

          <div className="space-y-3">
            {paramList.map((decl) => {
              const rawVal = params[decl.name] ?? decl.default;

              if (decl.kind === "select") {
                return (
                  <label key={decl.name} className="block space-y-1">
                    <span className="text-xs font-medium text-fg block">
                      {decl.label || decl.name}
                    </span>
                    <select
                      value={String(rawVal)}
                      data-testid={`param-select-${decl.name}`}
                      onChange={(e) => setParamValue(decl.name, e.target.value)}
                      className="w-full bg-surface-2 border border-line rounded-md px-2 py-1.5 text-xs text-fg focus:outline-none focus:border-brand"
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

              if (decl.kind === "toggle") {
                const checked = Boolean(rawVal);
                return (
                  <div key={decl.name} className="flex items-center justify-between gap-2 py-1">
                    <span className="text-xs font-medium text-fg">{decl.label || decl.name}</span>
                    <button
                      type="button"
                      onClick={() => setParamValue(decl.name, !checked)}
                      data-testid={`param-toggle-${decl.name}`}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border transition-colors ${
                        checked
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                          : "bg-surface-2 border-line text-fg-muted"
                      }`}
                    >
                      {checked ? (
                        <ToggleRight className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="w-4 h-4" />
                      )}
                      {checked ? "ON" : "OFF"}
                    </button>
                  </div>
                );
              }

              const numVal = typeof rawVal === "number" ? rawVal : Number(rawVal) || 0;
              const isRlcFreq =
                experimentId === "NT-01" &&
                decl.name === "f" &&
                String(params["mode"] ?? "RLC") === "RLC";
              const rlcL = Math.max(0, Number(params["L"] ?? 150));
              const rlcC = Math.max(0.01, Number(params["C"] ?? 35));
              const f0Hz =
                isRlcFreq && rlcL > 0 && rlcC > 0
                  ? 1 / (2 * Math.PI * Math.sqrt(rlcL * 1e-3 * rlcC * 1e-6))
                  : 0;
              const f0Rounded = Number(f0Hz.toFixed(2));
              return (
                <div key={decl.name} className="space-y-1">
                  <NumberParamControl
                    decl={decl}
                    value={numVal}
                    onChange={(v) => setParamValue(decl.name, v)}
                  />
                  {isRlcFreq && f0Hz > 0 && (
                    <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px]">
                      <span className="font-mono font-bold text-fg-muted">
                        f₀ = {f0Hz.toFixed(2)} Hz
                      </span>
                      {f0Rounded >= 1 && f0Rounded <= 2000 ? (
                        <button
                          type="button"
                          data-testid="explorer-tune-resonance"
                          onClick={() => setParamValue("f", f0Rounded)}
                          className="rounded border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 px-1.5 py-0.5 font-bold text-emerald-700 dark:text-emerald-300 transition"
                        >
                          Set f = f₀
                        </button>
                      ) : (
                        <span className="font-semibold text-amber-600 dark:text-amber-300">
                          &gt; 2000 Hz
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 2: Circuit Maker Components Palette */}
        <section className="p-3 space-y-2" data-testid="explorer-components-section">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-fg flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-brand" />
              Components on Board
            </h3>
            <span className="text-[11px] font-mono text-fg-subtle">{wires.length} wires</span>
          </div>

          <div className="space-y-1">
            {components.map((c) => {
              const selected = selectedComponentId === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    if (c.present) {
                      setSelectedComponent(c.id);
                    }
                  }}
                  className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-md border text-xs cursor-pointer transition-colors ${
                    selected
                      ? "bg-brand/10 border-brand/40 text-fg"
                      : "bg-surface-2/60 border-line/70 text-fg-muted hover:text-fg"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-1.5 py-0.5 rounded bg-surface border border-line font-mono text-[10px] font-bold text-brand shrink-0">
                      {c.symbol}
                    </span>
                    <span className="truncate">{c.name}</span>
                  </div>
                  {c.optional ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleComponentPresent(c.id);
                      }}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border shrink-0 ${
                        c.present
                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                          : "bg-surface border-line text-fg-subtle"
                      }`}
                    >
                      {c.present ? "Placed" : "Hidden"}
                    </button>
                  ) : (
                    <span className="text-[10px] text-fg-subtle shrink-0">Req</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 3: Quick Guide & Reference Diagram */}
        {experiment && (
          <section className="p-3 space-y-2.5">
            <h3 className="text-xs font-bold text-fg flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-brand" />
              Experiment Aim
            </h3>
            {experiment.imageUrl && (
              <div className="rounded-lg bg-white border border-line p-1.5 overflow-hidden">
                <img
                  src={experiment.imageUrl}
                  alt={experiment.title}
                  className="w-full h-24 object-contain"
                />
              </div>
            )}
            <p className="text-[11px] text-fg-muted leading-relaxed">{experiment.objective}</p>
            <button
              type="button"
              onClick={() => setActiveVlabTab("theory")}
              className="w-full py-1.5 rounded-md border border-brand/30 bg-brand/5 hover:bg-brand/10 text-xs font-semibold text-brand transition-colors"
            >
              Read Theory & Equations
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
