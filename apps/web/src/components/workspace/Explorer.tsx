import React, { useState } from "react";
import { Folder, Sliders, BookOpen, ChevronRight, ChevronDown, RefreshCw } from "lucide-react";
import { useWorkspaceStore } from "../../store/workspaceStore.js";
import { getExperimentById } from "../../data/curriculum/index.js";
import { type ParamValue } from "@vlab/shared";

export const Explorer: React.FC = () => {
  const { declaredParams, params, setParamValue, experimentId } = useWorkspaceStore();

  const [filesOpen, setFilesOpen] = useState(true);
  const [paramsOpen, setParamsOpen] = useState(true);
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  const activeExp = getExperimentById(experimentId);
  const paramKeys = Object.keys(declaredParams);

  return (
    <div
      data-testid="pane-explorer"
      className="flex h-full w-full flex-col overflow-y-auto bg-surface-2 text-fg text-xs select-none border-r border-line"
    >
      {/* SECTION: Files */}
      <div className="border-b border-line">
        <button
          type="button"
          onClick={() => setFilesOpen(!filesOpen)}
          className="flex w-full items-center gap-1.5 px-3 py-2 font-semibold text-fg-muted uppercase tracking-wider hover:bg-hover"
        >
          {filesOpen ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
          <Folder className="h-3.5 w-3.5 text-brand" />
          <span>Files</span>
        </button>

        {filesOpen && (
          <div className="space-y-0.5 pb-2 pl-6 pr-2">
            <div className="flex items-center gap-2 rounded px-2 py-1 bg-brand-50/50 dark:bg-brand-900/20 text-brand font-medium">
              <span className="font-mono">main.py</span>
              <span className="text-[10px] text-fg-subtle">(active)</span>
            </div>
            <div className="flex items-center gap-2 rounded px-2 py-1 text-fg-muted hover:bg-hover">
              <span className="font-mono">signals.py</span>
            </div>
          </div>
        )}
      </div>

      {/* SECTION: Parameters */}
      <div className="border-b border-line">
        <div className="flex items-center justify-between px-3 py-2">
          <button
            type="button"
            onClick={() => setParamsOpen(!paramsOpen)}
            className="flex items-center gap-1.5 font-semibold text-fg-muted uppercase tracking-wider hover:text-fg"
          >
            {paramsOpen ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            <Sliders className="h-3.5 w-3.5 text-accent-500" />
            <span>Parameters ({paramKeys.length})</span>
          </button>
        </div>

        {paramsOpen && (
          <div className="space-y-3 px-3 pb-3">
            {paramKeys.length === 0 ? (
              <p className="italic text-fg-subtle text-[11px] py-1">
                No vlab.param(...) defined in code yet.
              </p>
            ) : (
              paramKeys.map((name) => {
                const decl = declaredParams[name];
                if (!decl) {
                  return null;
                }
                const currentVal = params[name] !== undefined ? params[name] : decl.default;

                return (
                  <div
                    key={name}
                    className="space-y-1 rounded bg-surface p-2 border border-line shadow-sm"
                  >
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="font-medium text-fg" title={decl.label || name}>
                        {decl.label || name} ({name})
                      </span>
                      <span className="text-brand font-bold">
                        {typeof currentVal === "number" ? currentVal : String(currentVal)}
                      </span>
                    </div>

                    {decl.kind === "slider" || decl.kind === "number" ? (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="range"
                          data-testid={`param-slider-${name}`}
                          min={decl.min ?? 0}
                          max={decl.max ?? 100}
                          step={decl.step ?? 1}
                          value={Number(currentVal)}
                          onChange={(e) => setParamValue(name, parseFloat(e.target.value))}
                          className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-line accent-brand"
                        />
                        <input
                          type="number"
                          data-testid={`param-input-${name}`}
                          min={decl.min ?? 0}
                          max={decl.max ?? 100}
                          step={decl.step ?? 1}
                          value={Number(currentVal)}
                          onChange={(e) => setParamValue(name, parseFloat(e.target.value) || 0)}
                          className="w-14 rounded border border-line bg-surface px-1 py-0.5 font-mono text-[10px] text-right"
                        />
                      </div>
                    ) : decl.kind === "select" && decl.options ? (
                      <select
                        data-testid={`param-select-${name}`}
                        value={String(currentVal)}
                        onChange={(e) => setParamValue(name, e.target.value as ParamValue)}
                        className="w-full rounded border border-line bg-surface px-2 py-1 font-mono text-[11px]"
                      >
                        {decl.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : decl.kind === "toggle" ? (
                      <label className="flex items-center gap-2 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          data-testid={`param-toggle-${name}`}
                          checked={Boolean(currentVal)}
                          onChange={(e) => setParamValue(name, e.target.checked)}
                          className="rounded border-line text-brand accent-brand"
                        />
                        <span className="text-[11px] text-fg-muted">{decl.label || name}</span>
                      </label>
                    ) : null}

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setParamValue(name, decl.default)}
                        className="flex items-center gap-1 text-[10px] text-fg-subtle hover:text-fg"
                        title="Reset to default"
                      >
                        <RefreshCw className="h-2.5 w-2.5" />
                        <span>Reset</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* SECTION: Instructions / Theory */}
      <div>
        <button
          type="button"
          onClick={() => setInstructionsOpen(!instructionsOpen)}
          className="flex w-full items-center gap-1.5 px-3 py-2 font-semibold text-fg-muted uppercase tracking-wider hover:bg-hover"
        >
          {instructionsOpen ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
          <BookOpen className="h-3.5 w-3.5 text-amber-500" />
          <span>Instructions & Theory</span>
        </button>

        {instructionsOpen && (
          <div className="p-3 text-fg-muted text-[11px] leading-relaxed space-y-2">
            <div>
              <h4 className="font-semibold text-fg text-xs">
                {activeExp ? `${activeExp.id}: ${activeExp.title}` : experimentId}
              </h4>
              {activeExp && (
                <span className="inline-block rounded bg-brand-50 dark:bg-brand-900/30 px-1.5 py-0.5 text-[10px] font-mono text-brand mt-0.5">
                  [{activeExp.course}] {activeExp.level} Level
                </span>
              )}
            </div>

            {activeExp?.objective && (
              <div>
                <span className="font-semibold text-fg block text-[10px] uppercase tracking-wider">
                  Objective
                </span>
                <p className="text-fg-muted mt-0.5">{activeExp.objective}</p>
              </div>
            )}

            {activeExp?.theory && (
              <div>
                <span className="font-semibold text-fg block text-[10px] uppercase tracking-wider">
                  Theory & Principles
                </span>
                <p className="text-fg-muted mt-0.5 whitespace-pre-wrap">{activeExp.theory}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
