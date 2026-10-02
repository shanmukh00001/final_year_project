import React, { useState } from "react";
import {
  X,
  Send,
  FileCode,
  Sliders,
  BarChart2,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { useWorkspaceStore } from "../../store/workspaceStore.js";

interface SubmitAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess?: () => void;
}

export const SubmitAssignmentModal: React.FC<SubmitAssignmentModalProps> = ({
  isOpen,
  onClose,
  onSubmitSuccess,
}) => {
  const { code, params, figures, experimentId } = useWorkspaceStore();
  const [reportText, setReportText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Simulate API dispatch to /api/v1/assignments/:id/submit
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        onSubmitSuccess?.();
        onClose();
      }, 1800);
    }, 800);
  };

  const lineCount = code.split("\n").length;
  const paramCount = Object.keys(params).length;
  const figureCount = figures.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border border-line bg-surface shadow-2xl overflow-hidden text-xs">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-line bg-surface-2 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Send className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-fg">Submit Lab for Assessment</h2>
              <p className="text-[11px] text-fg-subtle">
                Experiment: <strong className="text-brand font-mono">{experimentId}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-fg-muted hover:bg-hover hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        {isSubmitted ? (
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-500">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-fg">Assignment Submitted Successfully!</h3>
            <p className="text-xs text-fg-subtle max-w-xs">
              Your Python code snapshot, parameters, and waveforms have been recorded for grading.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-red-500">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submission Snapshot Summary Card */}
            <div className="rounded-lg border border-line bg-surface-2/40 p-3 space-y-2">
              <span className="font-semibold text-fg text-[11px] block">
                Submission Snapshot Contents:
              </span>
              <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                <div className="flex items-center gap-1.5 rounded bg-surface p-2 border border-line">
                  <FileCode className="h-3.5 w-3.5 text-brand" />
                  <span>{lineCount} lines code</span>
                </div>
                <div className="flex items-center gap-1.5 rounded bg-surface p-2 border border-line">
                  <Sliders className="h-3.5 w-3.5 text-amber-500" />
                  <span>{paramCount} params</span>
                </div>
                <div className="flex items-center gap-1.5 rounded bg-surface p-2 border border-line">
                  <BarChart2 className="h-3.5 w-3.5 text-green-500" />
                  <span>{figureCount} plots</span>
                </div>
              </div>
            </div>

            {/* Student Report / Notes */}
            <div>
              <label className="block font-medium text-fg mb-1 flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 text-fg-subtle" />
                <span>Lab Report Observations & Conclusions (Optional)</span>
              </label>
              <textarea
                rows={4}
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder="Detail your findings, numerical calculations, or questions answered in this experiment..."
                className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-fg focus:border-brand focus:outline-none font-sans"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-line px-3 py-1.5 text-fg-muted hover:bg-hover hover:text-fg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-1.5 font-semibold text-white shadow-sm hover:bg-brand/90 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSubmitting ? "Submitting..." : "Confirm & Submit"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
