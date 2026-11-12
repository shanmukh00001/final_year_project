import React, { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  HelpCircle,
  Play,
  RotateCcw,
  Target,
  Wrench,
  XCircle,
} from "lucide-react";
import { type ExperimentDefinition, type QuizQuestion } from "@vlab/shared";
import { useWorkspaceStore, type VlabSectionTab } from "../../store/workspaceStore.js";

function cleanTexToReadable(tex: string): string {
  return tex
    .replace(/\\qquad/g, "    ")
    .replace(/\\quad/g, "  ")
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1) / ($2)")
    .replace(/\\sqrt\{([^}]+)\}/g, "√($1)")
    .replace(/\\text\{([^}]+)\}/g, "$1")
    .replace(/\\omega/g, "ω")
    .replace(/\\pi/g, "π")
    .replace(/\\theta/g, "θ")
    .replace(/\\Delta/g, "Δ")
    .replace(/\\Omega/g, "Ω")
    .replace(/\\mu/g, "µ")
    .replace(/\\circ/g, "°")
    .replace(/\\cdot/g, "·")
    .replace(/\\times/g, "×")
    .replace(/\\Longleftrightarrow/g, " ⇔ ")
    .replace(/\\Leftrightarrow/g, " ⇔ ")
    .replace(/\\rightarrow/g, " → ")
    .replace(/\\to\b/g, " → ")
    .replace(/\\parallel/g, " ∥ ")
    .replace(/\\eta/g, "η")
    .replace(/\\approx/g, "≈")
    .replace(/\\ge/g, "≥")
    .replace(/\\le/g, "≤")
    .replace(/\\tan\^\{-1\}/g, "tan⁻¹")
    .replace(/\\cos/g, "cos")
    .replace(/\\sin/g, "sin")
    .replace(/\\left\(/g, "(")
    .replace(/\\right\)/g, ")")
    .replace(/\\left\[/g, "[")
    .replace(/\\right\]/g, "]")
    .replace(/\\,/g, " ")
    .replace(/\^\{([^}]+)\}/g, "^$1")
    .replace(/_\{([^}]+)\}/g, "_$1")
    .replace(/\\([A-Za-z]+)/g, "$1")
    .trim();
}

function renderInlineMathOnly(text: string): React.ReactNode[] {
  const mathRegex = /(\$\$[^$]+\$\$|\$[^$]+\$)/g;
  const parts = text.split(mathRegex);
  return parts.map((part, idx) => {
    if (part.startsWith("$$") && part.endsWith("$$")) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-surface-2 border border-line/70 font-mono text-[12px] text-brand font-semibold"
        >
          {cleanTexToReadable(part.slice(2, -2))}
        </code>
      );
    }
    if (part.startsWith("$") && part.endsWith("$")) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-surface-2 border border-line/70 font-mono text-[12px] text-brand font-semibold"
        >
          {cleanTexToReadable(part.slice(1, -1))}
        </code>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function renderInlineRichText(text: string): React.ReactNode[] {
  // Split on **...**, $$...$$, or $...$
  const tokenRegex = /(\*\*[^*]+\*\*|\$\$[^$]+\$\$|\$[^$]+\$)/g;
  const parts = text.split(tokenRegex);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} className="font-semibold text-fg">
          {renderInlineMathOnly(part.slice(2, -2))}
        </strong>
      );
    }
    if (part.startsWith("$$") && part.endsWith("$$")) {
      const readable = cleanTexToReadable(part.slice(2, -2));
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-surface-2 border border-line/70 font-mono text-[12px] text-brand font-semibold"
        >
          {readable}
        </code>
      );
    }
    if (part.startsWith("$") && part.endsWith("$")) {
      const readable = cleanTexToReadable(part.slice(1, -1));
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-surface-2 border border-line/70 font-mono text-[12px] text-brand font-semibold"
        >
          {readable}
        </code>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function StructuredTheoryContent({ markdown }: { markdown: string }) {
  const lines = markdown.split("\n");
  const blocks: React.ReactNode[] = [];
  let listItems: { ordered: boolean; items: string[] } | null = null;

  const flushList = (keyPrefix: string) => {
    if (!listItems) {
      return;
    }
    const { ordered, items } = listItems;
    if (ordered) {
      blocks.push(
        <ol key={`${keyPrefix}-ol`} className="list-decimal pl-5 space-y-1.5 text-sm text-fg-muted">
          {items.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {renderInlineRichText(item)}
            </li>
          ))}
        </ol>,
      );
    } else {
      blocks.push(
        <ul key={`${keyPrefix}-ul`} className="list-disc pl-5 space-y-1.5 text-sm text-fg-muted">
          {items.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {renderInlineRichText(item)}
            </li>
          ))}
        </ul>,
      );
    }
    listItems = null;
  };

  lines.forEach((rawLine, idx) => {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      flushList(`line-${idx}`);
      return;
    }

    if (trimmed.startsWith("### ")) {
      flushList(`line-${idx}`);
      blocks.push(
        <h3
          key={`h3-${idx}`}
          className="text-base font-bold text-fg pt-3 pb-1 border-b border-line/60"
        >
          {trimmed.slice(4)}
        </h3>,
      );
      return;
    }

    if (trimmed.startsWith("$$") && trimmed.endsWith("$$")) {
      flushList(`line-${idx}`);
      const formula = cleanTexToReadable(trimmed.slice(2, -2));
      blocks.push(
        <div
          key={`eq-${idx}`}
          className="my-2 px-4 py-2.5 rounded-lg bg-surface-2 border border-line font-mono text-xs sm:text-sm text-brand font-semibold overflow-x-auto"
        >
          {formula}
        </div>,
      );
      return;
    }

    if (trimmed.startsWith("- ")) {
      if (listItems && listItems.ordered) {
        flushList(`line-${idx}`);
      }
      if (!listItems) {
        listItems = { ordered: false, items: [] };
      }
      listItems.items.push(trimmed.slice(2));
      return;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch && typeof orderedMatch[1] === "string") {
      if (listItems && !listItems.ordered) {
        flushList(`line-${idx}`);
      }
      if (!listItems) {
        listItems = { ordered: true, items: [] };
      }
      listItems.items.push(orderedMatch[1]);
      return;
    }

    flushList(`line-${idx}`);
    blocks.push(
      <p key={`p-${idx}`} className="text-sm text-fg-muted leading-relaxed">
        {renderInlineRichText(trimmed)}
      </p>,
    );
  });

  flushList("end");
  return <div className="space-y-2.5">{blocks}</div>;
}

function QuizPanel({
  title,
  questions,
  subtitle,
}: {
  title: string;
  subtitle: string;
  questions: QuizQuestion[];
}) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  if (questions.length === 0) {
    return (
      <div className="text-sm text-fg-muted py-8 text-center">
        No questions configured for this section yet.
      </div>
    );
  }

  const score = questions.reduce((acc, q) => (answers[q.id] === q.correctIndex ? acc + 1 : acc), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap border-b border-line pb-3">
        <div>
          <h3 className="text-base font-bold text-fg flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-brand" />
            {title}
          </h3>
          <p className="text-xs text-fg-muted mt-0.5">{subtitle}</p>
        </div>
        {submitted && (
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand/15 text-brand border border-brand/30">
              Score: {score} / {questions.length}
            </span>
            <button
              type="button"
              onClick={() => {
                setAnswers({});
                setSubmitted(false);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs border border-line text-fg-muted hover:text-fg hover:bg-hover"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {questions.map((q, qIdx) => {
          const chosen = answers[q.id];
          const isCorrect = submitted && chosen === q.correctIndex;
          return (
            <div key={q.id} className="p-4 rounded-xl bg-surface-2 border border-line space-y-2.5">
              <div className="text-sm font-semibold text-fg">
                Q{qIdx + 1}. {q.question}
              </div>
              <div className="space-y-1.5">
                {q.options.map((opt, optIdx) => {
                  const selected = chosen === optIdx;
                  const showRight = submitted && optIdx === q.correctIndex;
                  const showWrong = submitted && selected && optIdx !== q.correctIndex;
                  return (
                    <label
                      key={optIdx}
                      className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                        showRight
                          ? "bg-emerald-500/15 border-emerald-500/40 text-fg font-medium"
                          : showWrong
                            ? "bg-danger-500/15 border-danger-500/40 text-fg"
                            : selected
                              ? "bg-brand/10 border-brand text-fg font-medium"
                              : "bg-surface border-line text-fg-muted hover:text-fg hover:border-fg-subtle"
                      }`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        checked={selected}
                        disabled={submitted}
                        onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: optIdx }))}
                        className="mt-0.5 accent-[var(--brand)]"
                      />
                      <span className="flex-1">{opt}</span>
                      {showRight && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                      {showWrong && <XCircle className="w-4 h-4 text-danger-500 shrink-0" />}
                    </label>
                  );
                })}
              </div>

              {submitted && (
                <div
                  className={`text-xs px-3 py-2 rounded-lg border ${
                    isCorrect
                      ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300"
                      : "bg-amber-500/10 border-amber-500/25 text-amber-800 dark:text-amber-300"
                  }`}
                >
                  <strong>Explanation:</strong> {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!submitted && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setSubmitted(true)}
            className="px-4 py-2 rounded-lg bg-brand hover:bg-brand-600 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            Submit Answers
          </button>
        </div>
      )}
    </div>
  );
}

export function VlabExperimentTabs({
  experiment,
  activeTab,
}: {
  experiment: ExperimentDefinition;
  activeTab: Exclude<VlabSectionTab, "simulation">;
}) {
  const { setActiveVlabTab, simulation } = useWorkspaceStore();
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});

  return (
    <div
      className="h-full overflow-y-auto bg-surface p-5 space-y-5"
      data-testid={`vlab-tab-content-${activeTab}`}
    >
      {/* IIT (ISM) Dhanbad Header Banner */}
      <div className="p-4 rounded-xl bg-surface-2 border border-line flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="px-2 py-0.5 rounded bg-brand/15 text-brand text-[11px] font-bold">
              {experiment.institute || "IIT (ISM) Dhanbad"}
            </span>
            <span className="text-[11px] font-medium text-fg-muted">
              {experiment.labName || "Virtual Laboratories"}
            </span>
            <span className="font-mono text-[11px] text-fg-subtle">{experiment.id}</span>
          </div>
          <h2 className="text-lg font-bold text-fg">{experiment.title}</h2>
        </div>

        <button
          type="button"
          onClick={() => setActiveVlabTab("simulation")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          Open Circuit Maker & Simulate
        </button>
      </div>

      {activeTab === "aim" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-surface-2 border border-line space-y-2.5">
                <h3 className="text-sm font-bold text-fg flex items-center gap-2">
                  <Target className="w-4 h-4 text-brand" />
                  Aim of the Experiment
                </h3>
                <p className="text-sm text-fg leading-relaxed">{experiment.objective}</p>
                {experiment.aimDetails && experiment.aimDetails.length > 0 && (
                  <ul className="list-disc pl-5 space-y-1.5 text-xs text-fg-muted pt-1">
                    {experiment.aimDetails.map((item, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {experiment.apparatus && experiment.apparatus.length > 0 && (
                <div className="p-4 rounded-xl bg-surface-2 border border-line space-y-2.5">
                  <h3 className="text-sm font-bold text-fg flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-brand" />
                    Apparatus & Virtual Components Required
                  </h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-fg-muted">
                    {experiment.apparatus.map((item, idx) => (
                      <li
                        key={idx}
                        className="px-2.5 py-1.5 rounded bg-surface border border-line/70 flex items-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {experiment.imageUrl && (
              <div className="p-3 rounded-xl bg-white border border-line shadow-sm space-y-2">
                <img
                  src={experiment.imageUrl}
                  alt={`${experiment.title} reference schematic`}
                  className="w-full h-auto rounded-lg object-contain max-h-[340px]"
                />
                <div className="text-[11px] text-center text-slate-600 font-medium">
                  Reference Circuit Diagram — {experiment.title} (
                  {experiment.institute || "IIT (ISM) Dhanbad"})
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "theory" && (
        <div className="space-y-5">
          {experiment.imageUrl && (
            <div className="p-3 rounded-xl bg-white border border-line shadow-sm max-w-2xl">
              <img
                src={experiment.imageUrl}
                alt={`${experiment.title} circuit diagram`}
                className="w-full h-auto rounded-lg object-contain max-h-[280px]"
              />
            </div>
          )}

          <div className="p-5 rounded-xl bg-surface-2 border border-line">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-brand" />
              <h3 className="text-sm font-bold text-fg">Theory & Mathematical Explanation</h3>
            </div>
            <StructuredTheoryContent markdown={experiment.theory} />
          </div>

          {simulation && (
            <div className="p-4 rounded-xl bg-brand/5 border border-brand/25 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-brand">
                Live Explanation With Your Current Circuit Values
              </div>
              <p className="text-xs sm:text-sm text-fg leading-relaxed">
                {simulation.explanationSummary}
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === "procedure" && (
        <div className="p-5 rounded-xl bg-surface-2 border border-line space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-bold text-fg flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-brand" />
              Step-by-Step Laboratory Procedure
            </h3>
            <span className="text-xs text-fg-muted">Tick steps as you perform them</span>
          </div>

          <ol className="space-y-2.5">
            {(experiment.procedureSteps || []).map((step, idx) => {
              const done = Boolean(checkedSteps[idx]);
              return (
                <li
                  key={idx}
                  onClick={() => setCheckedSteps((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                  className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-colors ${
                    done
                      ? "bg-emerald-500/10 border-emerald-500/30 text-fg"
                      : "bg-surface border-line text-fg-muted hover:text-fg"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={() => {}}
                    className="mt-0.5 accent-[var(--brand)]"
                  />
                  <span className="text-xs sm:text-sm leading-relaxed">
                    <strong className="text-fg mr-1.5">Step {idx + 1}:</strong>
                    {step}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {activeTab === "pretest" && (
        <QuizPanel
          key={`pre-${experiment.id}`}
          title="Pretest — Conceptual Readiness Check"
          subtitle="Answer these baseline questions before assembling and simulating the circuit."
          questions={experiment.pretest || []}
        />
      )}

      {activeTab === "posttest" && (
        <QuizPanel
          key={`post-${experiment.id}`}
          title="Posttest — Experimental Verification Quiz"
          subtitle="Verify your understanding after observing waveforms and recorded trials."
          questions={experiment.posttest || []}
        />
      )}
    </div>
  );
}
