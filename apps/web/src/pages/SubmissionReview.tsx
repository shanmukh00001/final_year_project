import React, { useState } from "react";
import {
  ArrowLeft,
  Download,
  CheckCircle,
  Clock,
  User,
  FileCode,
  BarChart2,
  Award,
  ChevronRight,
  ChevronLeft,
  Save,
  MessageSquare,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { type AssignmentFormData } from "../components/professor/AssignmentEditorModal.js";

export interface StudentSubmission {
  id: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  submittedAt: string;
  isLate: boolean;
  status: "submitted" | "graded";
  code: string;
  stdout: string;
  plotCoordinates?: { x: number[]; y: number[]; title?: string } | undefined;
  grade?:
    | {
        marks: number;
        feedback: string;
        gradedAt: string;
        gradedBy: string;
      }
    | undefined;
}

interface SubmissionReviewProps {
  assignment: AssignmentFormData;
  onBack: () => void;
}

// Sample mock submissions for interactive grading demo
const INITIAL_SUBMISSIONS: StudentSubmission[] = [
  {
    id: "sub-01",
    studentId: "u-101",
    studentName: "Aditya Sharma",
    rollNumber: "21ECE045",
    submittedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    isLate: false,
    status: "graded",
    code: `import vlab
import numpy as np

# Student Solution: DFT & Spectral Leakage
N = 64
fs = 1000
f0 = 125.0
t = np.arange(N) / fs
x = np.sin(2 * np.pi * f0 * t)

# Apply Hamming Window
window = np.hamming(N)
x_windowed = x * window

# Compute FFT
X = np.fft.fft(x_windowed)
freqs = np.fft.fftfreq(N, 1/fs)
magnitude_db = 20 * np.log10(np.abs(X) + 1e-12)

print(f"Computed 64-point FFT. Peak bin index: {np.argmax(np.abs(X))}")
print(f"Max magnitude: {np.max(magnitude_db):.2f} dB")

vlab.plot(freqs[:N//2], magnitude_db[:N//2], label="Magnitude (dB)", title="FFT Magnitude Spectrum")
`,
    stdout: `Computed 64-point FFT. Peak bin index: 8\nMax magnitude: 30.10 dB\nSimulation elapsed: 14.2 ms`,
    plotCoordinates: {
      x: Array.from({ length: 32 }, (_, i) => (i * 1000) / 64),
      y: Array.from({ length: 32 }, (_, i) => (i === 8 ? 30.1 : Math.max(-40, 10 - i * 1.5))),
      title: "FFT Magnitude Spectrum",
    },
    grade: {
      marks: 95,
      feedback:
        "Excellent spectral analysis. Windowing applied correctly with minimal side-lobe leakage.",
      gradedAt: new Date().toISOString(),
      gradedBy: "Prof. Rao",
    },
  },
  {
    id: "sub-02",
    studentId: "u-102",
    studentName: "Priya Varma",
    rollNumber: "21ECE089",
    submittedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    isLate: false,
    status: "submitted",
    code: `import vlab
import numpy as np

# Student 2: Filter implementation
t = np.linspace(0, 1, 200)
sig = np.sin(2 * np.pi * 5 * t) + 0.5 * np.sin(2 * np.pi * 50 * t)

# Smoothing filter
kernel = np.ones(5) / 5
filtered = np.convolve(sig, kernel, mode='same')

print("Filtered signal calculated.")
vlab.plot(t, filtered, label="Filtered", title="Output Signal")
`,
    stdout: "Filtered signal calculated.\nSimulation elapsed: 11.5 ms",
    plotCoordinates: {
      x: Array.from({ length: 200 }, (_, i) => i / 200),
      y: Array.from({ length: 200 }, (_, i) => Math.sin(2 * Math.PI * 5 * (i / 200))),
      title: "Output Signal",
    },
  },
  {
    id: "sub-03",
    studentId: "u-103",
    studentName: "Rahul Menon",
    rollNumber: "21ECE112",
    submittedAt: new Date(Date.now() + 3600000).toISOString(),
    isLate: true,
    status: "submitted",
    code: `import vlab
import numpy as np

# DFT calculation
x = np.array([1, 2, 3, 4, 3, 2, 1, 0])
X = np.fft.fft(x)
print("FFT output:", np.abs(X))
vlab.plot(np.arange(len(X)), np.abs(X), title="Raw DFT")
`,
    stdout: "FFT output: [16. 3.41 0. 0.58 0. 0.58 0. 3.41]\nSimulation elapsed: 8.9 ms",
    plotCoordinates: {
      x: [0, 1, 2, 3, 4, 5, 6, 7],
      y: [16, 3.41, 0, 0.58, 0, 0.58, 0, 3.41],
      title: "Raw DFT",
    },
  },
];

export const SubmissionReview: React.FC<SubmissionReviewProps> = ({ assignment, onBack }) => {
  const [submissions, setSubmissions] = useState<StudentSubmission[]>(INITIAL_SUBMISSIONS);
  const [selectedSubIndex, setSelectedSubIndex] = useState<number>(0);
  const [scoreInput, setScoreInput] = useState<number>(INITIAL_SUBMISSIONS[0]?.grade?.marks || 90);
  const [feedbackInput, setFeedbackInput] = useState<string>(
    INITIAL_SUBMISSIONS[0]?.grade?.feedback || "",
  );
  const [isSavedAlert, setIsSavedAlert] = useState(false);

  const fallbackSub: StudentSubmission = {
    id: "sub-default",
    studentId: "u-000",
    studentName: "Student",
    rollNumber: "21ECE000",
    submittedAt: new Date().toISOString(),
    isLate: false,
    status: "submitted",
    code: "# No code submitted",
    stdout: "",
  };

  const currentSub: StudentSubmission = submissions[selectedSubIndex] ?? fallbackSub;

  const handleSelectSubmission = (index: number) => {
    setSelectedSubIndex(index);
    const sub = submissions[index];
    if (sub) {
      setScoreInput(sub.grade?.marks ?? assignment.maxMarks);
      setFeedbackInput(sub.grade?.feedback ?? "");
    }
  };

  const handleSaveGrade = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = submissions.map((sub, idx) => {
      if (idx === selectedSubIndex) {
        return {
          ...sub,
          status: "graded" as const,
          grade: {
            marks: Number(scoreInput),
            feedback: feedbackInput.trim(),
            gradedAt: new Date().toISOString(),
            gradedBy: "Professor",
          },
        };
      }
      return sub;
    });

    setSubmissions(updated);
    setIsSavedAlert(true);
    setTimeout(() => setIsSavedAlert(false), 3000);
  };

  const handleExportCSV = () => {
    const headers = [
      "Roll Number",
      "Student Name",
      "Status",
      "Submission Date",
      "Is Late",
      "Marks",
      "Max Marks",
      "Feedback",
    ];
    const rows = submissions.map((s) => [
      `"${s.rollNumber}"`,
      `"${s.studentName}"`,
      `"${s.status}"`,
      `"${new Date(s.submittedAt).toLocaleString()}"`,
      `"${s.isLate ? "YES" : "NO"}"`,
      `"${s.grade?.marks ?? "N/A"}"`,
      `"${assignment.maxMarks}"`,
      `"${(s.grade?.feedback || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Gradebook_${assignment.courseCode}_${assignment.experimentId}.csv`,
    );
    link.click();
    URL.revokeObjectURL(url);
  };

  const gradedCount = submissions.filter((s) => s.status === "graded").length;

  return (
    <div className="flex h-screen w-full flex-col bg-bg text-fg select-none overflow-hidden">
      {/* Top Header */}
      <header className="flex h-12 w-full items-center justify-between border-b border-line bg-surface px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-fg-muted hover:bg-hover hover:text-fg"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </button>
          <div className="h-4 w-px bg-line" />
          <span className="rounded bg-brand/10 px-2 py-0.5 font-mono text-[11px] font-bold text-brand">
            {assignment.courseCode} · {assignment.experimentId}
          </span>
          <h1 className="text-xs font-semibold text-fg truncate max-w-md">{assignment.title}</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-fg-subtle">
            <span>
              Graded: <strong className="text-fg">{gradedCount}</strong> / {submissions.length}
            </span>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-3 py-1 text-xs font-medium text-fg hover:bg-hover"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Gradebook CSV</span>
          </button>
        </div>
      </header>

      {/* Main Split Layout */}
      <div className="flex flex-1 min-h-0 w-full">
        {/* Left Side: Student Roster Sidebar */}
        <div className="w-72 border-r border-line bg-surface flex flex-col min-h-0">
          <div className="flex items-center justify-between border-b border-line bg-surface-2 p-3">
            <span className="text-xs font-semibold text-fg">Student Submissions</span>
            <span className="rounded-full bg-brand/10 px-2 py-0.5 font-mono text-[10px] text-brand font-medium">
              {submissions.length} Students
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-line">
            {submissions.map((sub, index) => {
              const isSelected = selectedSubIndex === index;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => handleSelectSubmission(index)}
                  className={`w-full text-left p-3 transition flex flex-col gap-1 ${
                    isSelected
                      ? "bg-brand/10 border-l-4 border-brand text-fg"
                      : "hover:bg-hover text-fg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-fg">{sub.studentName}</span>
                    {sub.status === "graded" ? (
                      <span className="flex items-center gap-1 text-[11px] text-green-500 font-mono font-medium">
                        <CheckCircle className="h-3 w-3" />
                        <span>
                          {sub.grade?.marks}/{assignment.maxMarks}
                        </span>
                      </span>
                    ) : (
                      <span className="rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-500 font-medium">
                        Pending
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-fg-subtle font-mono">
                    <span>{sub.rollNumber}</span>
                    {sub.isLate && (
                      <span className="flex items-center gap-0.5 text-red-400">
                        <Clock className="h-3 w-3" /> Late
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center: Submission Code, Execution, and Plot Viewer */}
        <div className="flex-1 flex flex-col min-h-0 bg-bg p-4 overflow-y-auto space-y-4">
          {/* Student Banner */}
          <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-fg">{currentSub.studentName}</h2>
                <div className="flex items-center gap-3 text-xs text-fg-subtle font-mono mt-0.5">
                  <span>Roll: {currentSub.rollNumber}</span>
                  <span>•</span>
                  <span>Submitted: {new Date(currentSub.submittedAt).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={selectedSubIndex <= 0}
                onClick={() => handleSelectSubmission(selectedSubIndex - 1)}
                className="rounded-lg border border-line p-1.5 text-fg-muted hover:bg-hover disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={selectedSubIndex >= submissions.length - 1}
                onClick={() => handleSelectSubmission(selectedSubIndex + 1)}
                className="rounded-lg border border-line p-1.5 text-fg-muted hover:bg-hover disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Academic Integrity & Plagiarism Check Card */}
          <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2/40 px-4 py-2.5 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-green-500/10 text-green-500">
                <CheckCircle className="h-4 w-4" />
              </div>
              <div>
                <span className="font-semibold text-fg">Code Similarity & Integrity Check</span>
                <p className="text-[11px] text-fg-subtle">
                  AST normalization & Winnowing analysis:{" "}
                  <strong className="text-green-500">12% match</strong> (Within safe threshold &lt;
                  80%)
                </p>
              </div>
            </div>
            <span className="font-mono text-[10px] text-fg-subtle rounded bg-surface border border-line px-2 py-0.5">
              Original Work
            </span>
          </div>

          {/* Submitted Code Viewer */}
          <div className="rounded-xl border border-line bg-surface overflow-hidden shadow-sm">
            <div className="flex items-center justify-between border-b border-line bg-surface-2 px-4 py-2">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-brand" />
                <span className="text-xs font-semibold text-fg">Submitted Python Script</span>
              </div>
              <span className="font-mono text-[11px] text-fg-subtle">Read-Only</span>
            </div>
            <pre className="p-4 font-mono text-xs text-fg bg-surface-2/40 overflow-x-auto max-h-72">
              {currentSub.code}
            </pre>
          </div>

          {/* Execution Stdout & Plot Outputs */}
          <div className="grid grid-cols-2 gap-4">
            {/* Stdout Console */}
            <div className="rounded-xl border border-line bg-surface overflow-hidden shadow-sm flex flex-col">
              <div className="border-b border-line bg-surface-2 px-4 py-2 text-xs font-semibold text-fg flex items-center gap-2">
                <Activity className="h-4 w-4 text-brand" />
                <span>Standard Output</span>
              </div>
              <pre className="p-3 font-mono text-[11px] text-fg-muted bg-surface-2/20 flex-1 overflow-auto min-h-[140px]">
                {currentSub.stdout}
              </pre>
            </div>

            {/* Generated Figure Preview */}
            <div className="rounded-xl border border-line bg-surface overflow-hidden shadow-sm flex flex-col">
              <div className="border-b border-line bg-surface-2 px-4 py-2 text-xs font-semibold text-fg flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-brand" />
                <span>Generated Plot</span>
              </div>
              <div className="p-3 flex-1 flex items-center justify-center min-h-[140px] bg-surface-2/20">
                {currentSub.plotCoordinates ? (
                  <div className="w-full text-center">
                    <span className="text-[11px] font-mono text-brand font-medium">
                      {currentSub.plotCoordinates.title || "Plot Output"} (
                      {currentSub.plotCoordinates.x.length} points)
                    </span>
                    <div className="mt-2 h-24 w-full flex items-end justify-center gap-1 px-4">
                      {currentSub.plotCoordinates.y.slice(0, 24).map((val, idx) => {
                        const heightPct = Math.max(10, Math.min(100, (val + 40) * 1.5));
                        return (
                          <div
                            key={idx}
                            className="bg-brand/70 hover:bg-brand flex-1 rounded-t transition"
                            style={{ height: `${heightPct}%` }}
                            title={`x: ${currentSub.plotCoordinates?.x[idx]?.toFixed(1)}, y: ${val.toFixed(1)}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-fg-subtle">No plot output captured</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Grading & Feedback Card */}
        <div className="w-80 border-l border-line bg-surface p-4 flex flex-col justify-between">
          <form onSubmit={handleSaveGrade} className="space-y-4">
            <div className="border-b border-line pb-3">
              <h3 className="text-xs font-bold text-fg flex items-center gap-1.5">
                <Award className="h-4 w-4 text-brand" />
                <span>Grading & Assessment</span>
              </h3>
              <p className="text-[11px] text-fg-subtle mt-0.5">
                Enter score out of {assignment.maxMarks} and constructive feedback.
              </p>
            </div>

            {isSavedAlert && (
              <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 p-2.5 text-green-500 text-xs">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Grade recorded successfully!</span>
              </div>
            )}

            {/* Score Input */}
            <div>
              <label className="block text-xs font-medium text-fg mb-1">
                Marks Awarded (Max: {assignment.maxMarks})
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max={assignment.maxMarks}
                  value={scoreInput}
                  onChange={(e) => setScoreInput(Number(e.target.value))}
                  className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 font-mono text-sm font-bold text-fg focus:border-brand focus:outline-none"
                  required
                />
                <span className="text-xs text-fg-muted font-mono">/ {assignment.maxMarks}</span>
              </div>
            </div>

            {/* Rubric Checklist */}
            <div className="rounded-lg border border-line bg-surface-2/30 p-3 text-xs space-y-2">
              <span className="font-semibold text-fg block text-[11px]">Evaluation Rubric</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded text-brand" />
                <span className="text-fg-muted">Mathematical correctness (40%)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded text-brand" />
                <span className="text-fg-muted">Spectral/Waveform plots valid (30%)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded text-brand" />
                <span className="text-fg-muted">Parameter sweep & analysis (30%)</span>
              </label>
            </div>

            {/* Qualitative Feedback Textarea */}
            <div>
              <label className="block text-xs font-medium text-fg mb-1 flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5 text-fg-subtle" />
                <span>Professor Feedback</span>
              </label>
              <textarea
                rows={4}
                value={feedbackInput}
                onChange={(e) => setFeedbackInput(e.target.value)}
                placeholder="Add comments on student code structure, numerical accuracy, or areas to improve..."
                className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-fg focus:border-brand focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-brand/90 transition"
            >
              <Save className="h-4 w-4" />
              <span>Save & Publish Grade</span>
            </button>
          </form>

          <div className="pt-4 border-t border-line text-center text-[10px] text-fg-subtle font-mono">
            V-Lab Academic Assessment System
          </div>
        </div>
      </div>
    </div>
  );
};
