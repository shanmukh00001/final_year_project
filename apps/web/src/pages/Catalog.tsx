import React, { useState } from "react";
import { Search, BookOpen, Clock, ArrowRight, Layers } from "lucide-react";
import { VALIDATED_EXPERIMENTS } from "../data/curriculum/index.js";
import { type CourseCode, type CourseLevel } from "@vlab/shared";

interface CatalogPageProps {
  onSelectExperiment: (id: string) => void;
}

const COURSES: { code: CourseCode; name: string; level: CourseLevel }[] = [
  { code: "SS", name: "Signals and Systems", level: "UG" },
  { code: "NT", name: "Network Theory", level: "UG" },
  { code: "DSP", name: "Digital Signal Processing", level: "UG" },
  { code: "DIP", name: "Digital Image Processing", level: "UG" },
  { code: "BEE", name: "Basics of Electronics Engineering", level: "UG" },
  { code: "ACS", name: "Advanced Communication Systems", level: "PG" },
  { code: "SSP", name: "Statistical Signal Processing", level: "PG" },
];

export const Catalog: React.FC<CatalogPageProps> = ({ onSelectExperiment }) => {
  const [selectedLevel, setSelectedLevel] = useState<"ALL" | CourseLevel>("ALL");
  const [selectedCourse, setSelectedCourse] = useState<"ALL" | CourseCode>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredExperiments = VALIDATED_EXPERIMENTS.filter((exp) => {
    if (selectedLevel !== "ALL" && exp.level !== selectedLevel) {
      return false;
    }
    if (selectedCourse !== "ALL" && exp.course !== selectedCourse) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = exp.title.toLowerCase().includes(q);
      const matchesId = exp.id.toLowerCase().includes(q);
      const matchesObj = exp.objective.toLowerCase().includes(q);
      return matchesTitle || matchesId || matchesObj;
    }
    return true;
  });

  return (
    <div className="flex min-h-screen flex-col bg-app text-fg">
      {/* Header Bar */}
      <header className="flex h-14 items-center justify-between border-b border-line bg-surface px-6 shadow-panel">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white font-mono font-bold text-sm">
            VL
          </div>
          <div>
            <h1 className="font-bold text-base leading-none">ECE Virtual Laboratory</h1>
            <p className="text-[11px] text-fg-muted mt-0.5">Interactive Pyodide Simulation Curriculum</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded bg-brand-50 dark:bg-brand-900/30 px-2.5 py-1 text-xs font-semibold text-brand">
            {VALIDATED_EXPERIMENTS.length} Total Experiments
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 space-y-6">
        {/* Filters and Search Strip */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 rounded-xl border border-line bg-surface p-4 shadow-sm">
          {/* Level & Course Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg bg-surface-2 p-1 border border-line">
              <button
                type="button"
                data-testid="filter-level-all"
                onClick={() => setSelectedLevel("ALL")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                  selectedLevel === "ALL" ? "bg-brand text-white shadow-sm" : "text-fg-muted hover:text-fg"
                }`}
              >
                All Levels
              </button>
              <button
                type="button"
                data-testid="filter-level-ug"
                onClick={() => setSelectedLevel("UG")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                  selectedLevel === "UG" ? "bg-brand text-white shadow-sm" : "text-fg-muted hover:text-fg"
                }`}
              >
                Undergraduate (UG)
              </button>
              <button
                type="button"
                data-testid="filter-level-pg"
                onClick={() => setSelectedLevel("PG")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                  selectedLevel === "PG" ? "bg-brand text-white shadow-sm" : "text-fg-muted hover:text-fg"
                }`}
              >
                Postgraduate (PG)
              </button>
            </div>

            {/* Course Dropdown */}
            <select
              data-testid="filter-course-select"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value as "ALL" | CourseCode)}
              className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-xs font-medium text-fg"
            >
              <option value="ALL">All 7 Course Modules</option>
              {COURSES.map((c) => (
                <option key={c.code} value={c.code}>
                  [{c.code}] {c.name} ({c.level})
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-fg-subtle" />
            <input
              type="text"
              data-testid="search-experiments-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search experiments, concepts..."
              className="w-full rounded-lg border border-line bg-surface-2 pl-9 pr-3 py-1.5 text-xs text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        </div>

        {/* Experiment Cards Grid */}
        <div data-testid="experiment-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredExperiments.map((exp) => (
            <div
              key={exp.id}
              data-testid={`experiment-card-${exp.id}`}
              className="flex flex-col justify-between rounded-xl border border-line bg-surface p-5 shadow-panel hover:border-brand/40 transition-all group"
            >
              <div className="space-y-3">
                {/* Card Top Badges */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 font-mono font-bold text-xs text-brand">
                      {exp.id}
                    </span>
                    <span className="rounded bg-surface-2 px-2 py-0.5 font-mono text-[10px] text-fg-muted border border-line">
                      {exp.course}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      exp.level === "UG"
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "bg-purple-500/10 text-purple-700 dark:text-purple-300"
                    }`}
                  >
                    {exp.level}
                  </span>
                </div>

                {/* Title and Objective */}
                <div>
                  <h3 className="font-bold text-sm text-fg group-hover:text-brand transition-colors">
                    {exp.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-fg-muted line-clamp-3 leading-relaxed">
                    {exp.objective}
                  </p>
                </div>
              </div>

              {/* Card Footer & Action */}
              <div className="mt-5 pt-3 border-t border-line flex items-center justify-between">
                <div className="flex items-center gap-3 text-[11px] text-fg-subtle">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>~{exp.estimatedRuntimeMs} ms</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    <span>{exp.parameters.length} sliders</span>
                  </div>
                </div>

                <button
                  type="button"
                  data-testid={`btn-open-lab-${exp.id}`}
                  onClick={() => onSelectExperiment(exp.id)}
                  className="flex items-center gap-1 rounded-md bg-brand px-3 py-1 font-medium text-white text-xs hover:bg-brand-hover transition shadow-sm"
                >
                  <span>Open Lab</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredExperiments.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 text-center text-fg-subtle">
            <BookOpen className="h-10 w-10 stroke-1 mb-2 opacity-40 text-brand" />
            <p className="font-semibold text-sm text-fg">No matching experiments found</p>
            <p className="text-xs mt-1">Try adjusting your filters or search keywords.</p>
          </div>
        )}
      </main>
    </div>
  );
};
