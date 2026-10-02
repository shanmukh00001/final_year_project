import React, { useState } from "react";
import { X, Plus, Award, AlertCircle, CheckCircle2 } from "lucide-react";
import { ALL_EXPERIMENTS } from "../../data/curriculum/index.js";

export interface AssignmentFormData {
  id?: string | undefined;
  courseCode: "SS" | "NT" | "DSP" | "DIP" | "BEE" | "ACS" | "SSP";
  experimentId: string;
  experimentVersion: number;
  title: string;
  instructions: string;
  sectionIds: string[];
  dueAt: string;
  allowLate: boolean;
  lateUntil?: string | undefined;
  allowResubmit: boolean;
  maxMarks: number;
  starterCodeOverride?: string | undefined;
  status: "draft" | "published";
}

interface AssignmentEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AssignmentFormData) => void;
  initialData?: Partial<AssignmentFormData> | null | undefined;
}

export const AssignmentEditorModal: React.FC<AssignmentEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [courseCode, setCourseCode] = useState<AssignmentFormData["courseCode"]>(
    initialData?.courseCode || "DSP",
  );
  const [experimentId, setExperimentId] = useState<string>(
    initialData?.experimentId || "DSP-01",
  );
  const [title, setTitle] = useState<string>(
    initialData?.title || "Lab Assignment: DFT & Spectral Analysis",
  );
  const [instructions, setInstructions] = useState<string>(
    initialData?.instructions ||
      "Implement the 64-point FFT and observe spectral leakage with rectangular and Hamming windows. Plot the magnitude spectrum.",
  );
  const [sectionIdsStr, setSectionIdsStr] = useState<string>(
    initialData?.sectionIds ? initialData.sectionIds.join(", ") : "Section-A, Section-B",
  );
  const [dueAt, setDueAt] = useState<string>(
    initialData?.dueAt
      ? new Date(initialData.dueAt).toISOString().slice(0, 16)
      : new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 16),
  );
  const [allowLate, setAllowLate] = useState<boolean>(initialData?.allowLate ?? false);
  const [allowResubmit, setAllowResubmit] = useState<boolean>(
    initialData?.allowResubmit ?? true,
  );
  const [maxMarks, setMaxMarks] = useState<number>(initialData?.maxMarks || 100);
  const [status, setStatus] = useState<"draft" | "published">(
    initialData?.status || "published",
  );
  const [starterCodeOverride, setStarterCodeOverride] = useState<string>(
    initialData?.starterCodeOverride || "",
  );
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  // Filter experiments based on selected course
  const courseExperiments = ALL_EXPERIMENTS.filter((exp) => exp.course === courseCode);

  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCourse = e.target.value as AssignmentFormData["courseCode"];
    setCourseCode(newCourse);
    const firstExp = ALL_EXPERIMENTS.find((exp) => exp.course === newCourse);
    if (firstExp) {
      setExperimentId(firstExp.id);
      setTitle(`Lab: ${firstExp.title}`);
    }
  };

  const handleExperimentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const expId = e.target.value;
    setExperimentId(expId);
    const exp = ALL_EXPERIMENTS.find((item) => item.id === expId);
    if (exp) {
      setTitle(`Lab: ${exp.title}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    const parsedSections = sectionIdsStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parsedSections.length === 0) {
      setError("At least one section ID is required.");
      return;
    }

    onSave({
      id: initialData?.id,
      courseCode,
      experimentId,
      experimentVersion: 1,
      title: title.trim(),
      instructions: instructions.trim(),
      sectionIds: parsedSections,
      dueAt: new Date(dueAt).toISOString(),
      allowLate,
      allowResubmit,
      maxMarks: Number(maxMarks) || 100,
      starterCodeOverride: starterCodeOverride.trim() ? starterCodeOverride : undefined,
      status,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-line bg-surface shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-line bg-surface-2 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-fg">
                {initialData?.id ? "Edit Lab Assignment" : "Create New Lab Assignment"}
              </h2>
              <p className="text-xs text-fg-subtle">
                Deploy an experiment with deadlines and custom instructions to student cohorts.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-fg-muted hover:bg-hover hover:text-fg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-red-500 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Course Selector */}
            <div>
              <label className="block font-medium text-fg mb-1">ECE Course Module</label>
              <div className="relative">
                <select
                  value={courseCode}
                  onChange={handleCourseChange}
                  className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-fg focus:border-brand focus:outline-none"
                >
                  <option value="SS">SS (Signals & Systems)</option>
                  <option value="NT">NT (Network Theory)</option>
                  <option value="DSP">DSP (Digital Signal Processing)</option>
                  <option value="DIP">DIP (Digital Image Processing)</option>
                  <option value="BEE">BEE (Basic Electrical Engineering)</option>
                  <option value="ACS">ACS (Advanced Comm Systems)</option>
                  <option value="SSP">SSP (Statistical Signal Processing)</option>
                </select>
              </div>
            </div>

            {/* Experiment Template */}
            <div>
              <label className="block font-medium text-fg mb-1">Catalog Experiment</label>
              <select
                value={experimentId}
                onChange={handleExperimentChange}
                className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-fg focus:border-brand focus:outline-none"
              >
                {courseExperiments.map((exp) => (
                  <option key={exp.id} value={exp.id}>
                    {exp.id}: {exp.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block font-medium text-fg mb-1">Assignment Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Lab 3: Butterworth Filter Frequency Response"
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-fg focus:border-brand focus:outline-none"
              required
            />
          </div>

          {/* Instructions */}
          <div>
            <label className="block font-medium text-fg mb-1">
              Instructions & Requirements (Markdown)
            </label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Detail specific parameters students must sweep and questions to answer in their report..."
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 font-sans text-fg focus:border-brand focus:outline-none"
            />
          </div>

          {/* Section IDs & Max Marks */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-fg mb-1">
                Assigned Sections (comma separated)
              </label>
              <input
                type="text"
                value={sectionIdsStr}
                onChange={(e) => setSectionIdsStr(e.target.value)}
                placeholder="Section-A, Section-B"
                className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-fg focus:border-brand focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-fg mb-1">Maximum Marks / Points</label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(Number(e.target.value))}
                  className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-fg focus:border-brand focus:outline-none"
                  required
                />
                <Award className="absolute right-3 top-2.5 h-4 w-4 text-fg-subtle" />
              </div>
            </div>
          </div>

          {/* Due Date & Submission Controls */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-fg mb-1">Submission Deadline (Due Date)</label>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-fg focus:border-brand focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-fg mb-1">Publish Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "draft" | "published")}
                className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-fg focus:border-brand focus:outline-none"
              >
                <option value="published">Published (Visible to students)</option>
                <option value="draft">Draft (Saved only)</option>
              </select>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowLate}
                onChange={(e) => setAllowLate(e.target.checked)}
                className="h-4 w-4 rounded border-line text-brand focus:ring-brand"
              />
              <span className="text-fg">Allow Late Submissions</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowResubmit}
                onChange={(e) => setAllowResubmit(e.target.checked)}
                className="h-4 w-4 rounded border-line text-brand focus:ring-brand"
              />
              <span className="text-fg">Allow Re-submissions Before Due Date</span>
            </label>
          </div>

          {/* Custom Starter Code (Optional) */}
          <div>
            <label className="block font-medium text-fg mb-1">
              Custom Starter Code Override (Optional)
            </label>
            <textarea
              rows={4}
              value={starterCodeOverride}
              onChange={(e) => setStarterCodeOverride(e.target.value)}
              placeholder="# Leave blank to use default curriculum starter code&#10;import vlab&#10;import numpy as np"
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 font-mono text-xs text-fg focus:border-brand focus:outline-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-line px-4 py-2 text-fg-muted hover:bg-hover hover:text-fg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-brand px-5 py-2 font-medium text-white shadow-sm hover:bg-brand/90"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{initialData?.id ? "Update Assignment" : "Deploy Assignment"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
