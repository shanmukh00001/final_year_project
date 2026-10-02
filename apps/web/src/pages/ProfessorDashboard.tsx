import React, { useState } from "react";
import {
  Plus,
  Calendar,
  Users,
  Award,
  Search,
  CheckCircle2,
  FileText,
  ChevronRight,
  CheckCircle,
} from "lucide-react";
import {
  AssignmentEditorModal,
  type AssignmentFormData,
} from "../components/professor/AssignmentEditorModal.js";
import { SubmissionReview } from "./SubmissionReview.js";

interface ProfessorDashboardProps {
  onNavigateToWorkspace?: ((experimentId: string) => void) | undefined;
}

const INITIAL_ASSIGNMENTS: AssignmentFormData[] = [
  {
    id: "asg-01",
    courseCode: "DSP",
    experimentId: "DSP-01",
    experimentVersion: 1,
    title: "Lab 1: Discrete Fourier Transform & Spectral Leakage",
    instructions: "Implement 64-point and 128-point FFTs. Compare rectangular vs Hamming window spectral resolution.",
    sectionIds: ["ECE-A", "ECE-B"],
    dueAt: new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString(),
    allowLate: true,
    allowResubmit: true,
    maxMarks: 100,
    status: "published",
  },
  {
    id: "asg-02",
    courseCode: "NT",
    experimentId: "NT-06",
    experimentVersion: 1,
    title: "Lab 2: Two-Port Network Z and Y Parameters",
    instructions: "Compute impedance matrix inversion and verify reciprocity and symmetry conditions.",
    sectionIds: ["ECE-A"],
    dueAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    allowLate: false,
    allowResubmit: true,
    maxMarks: 50,
    status: "published",
  },
  {
    id: "asg-03",
    courseCode: "SS",
    experimentId: "SS-01",
    experimentVersion: 1,
    title: "Lab 3: Continuous-Time Signal Transformations",
    instructions: "Perform time shifting, scaling, and reversal on composite pulse waveforms.",
    sectionIds: ["ECE-C"],
    dueAt: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString(),
    allowLate: true,
    allowResubmit: true,
    maxMarks: 75,
    status: "draft",
  },
];

export const ProfessorDashboard: React.FC<ProfessorDashboardProps> = ({
  onNavigateToWorkspace: _onNavigateToWorkspace,
}) => {
  const [assignments, setAssignments] = useState<AssignmentFormData[]>(INITIAL_ASSIGNMENTS);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentFormData | null>(null);
  const [activeReviewAssignment, setActiveReviewAssignment] = useState<AssignmentFormData | null>(
    null,
  );

  const handleSaveAssignment = (data: AssignmentFormData) => {
    if (data.id) {
      // Edit existing
      setAssignments((prev) => prev.map((a) => (a.id === data.id ? data : a)));
    } else {
      // Create new
      const newAsg: AssignmentFormData = {
        ...data,
        id: `asg-${Date.now().toString().slice(-4)}`,
      };
      setAssignments((prev) => [newAsg, ...prev]);
    }
  };

  const filteredAssignments = assignments.filter((a) => {
    const matchesCourse =
      selectedCourseFilter === "ALL" || a.courseCode === selectedCourseFilter;
    const matchesSearch =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.experimentId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCourse && matchesSearch;
  });

  // If professor is actively grading an assignment
  if (activeReviewAssignment) {
    return (
      <SubmissionReview
        assignment={activeReviewAssignment}
        onBack={() => setActiveReviewAssignment(null)}
      />
    );
  }

  // Dashboard Metrics
  const totalAssignments = assignments.length;
  const publishedCount = assignments.filter((a) => a.status === "published").length;

  return (
    <div className="flex min-h-screen w-full flex-col bg-bg text-fg select-none">
      {/* Dashboard Header */}
      <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-line bg-surface/90 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white font-bold text-sm shadow-sm">
            V
          </div>
          <div>
            <h1 className="text-sm font-bold text-fg flex items-center gap-2">
              <span>Professor Lab Management Portal</span>
              <span className="rounded bg-brand/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-brand">
                Faculty
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setEditingAssignment(null);
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-brand px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand/90 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Create Assignment</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* KPI Metrics Strip */}
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-xl border border-line bg-surface p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-fg-subtle">Total Assignments</p>
              <h3 className="text-2xl font-bold text-fg font-mono mt-1">{totalAssignments}</h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <FileText className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-fg-subtle">Active / Published</p>
              <h3 className="text-2xl font-bold text-fg font-mono mt-1">{publishedCount}</h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-500">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-fg-subtle">Enrolled Cohorts</p>
              <h3 className="text-2xl font-bold text-fg font-mono mt-1">140</h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <Users className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-fg-subtle">Class Average Score</p>
              <h3 className="text-2xl font-bold text-fg font-mono mt-1">88.4%</h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <Award className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface p-3 shadow-sm">
          {/* Course Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {["ALL", "SS", "NT", "DSP", "DIP", "BEE", "ACS", "SSP"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedCourseFilter(c)}
                className={`rounded-lg px-3 py-1 text-xs font-mono font-medium transition ${
                  selectedCourseFilter === c
                    ? "bg-brand text-white shadow-xs"
                    : "text-fg-muted hover:bg-hover hover:text-fg"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-fg-subtle" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assignments or labs..."
              className="w-full rounded-lg border border-line bg-surface-2 pl-8 pr-3 py-1.5 text-xs text-fg focus:border-brand focus:outline-none"
            />
          </div>
        </div>

        {/* Assignments Table */}
        <div className="rounded-xl border border-line bg-surface shadow-sm overflow-hidden">
          <div className="border-b border-line bg-surface-2 px-4 py-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-fg">ECE Curriculum Assignments</h2>
            <span className="text-[11px] text-fg-subtle font-mono">
              Showing {filteredAssignments.length} assignments
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-surface-2/40 text-fg-muted font-semibold">
                  <th className="py-2.5 px-4">Course & ID</th>
                  <th className="py-2.5 px-4">Assignment Title</th>
                  <th className="py-2.5 px-4">Sections</th>
                  <th className="py-2.5 px-4">Due Date</th>
                  <th className="py-2.5 px-4">Max Score</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-fg-subtle">
                      No assignments found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  filteredAssignments.map((asg) => {
                    const isDuePast = new Date(asg.dueAt) < new Date();
                    return (
                      <tr key={asg.id} className="hover:bg-hover transition">
                        <td className="py-3 px-4 font-mono font-bold text-brand">
                          <span className="rounded bg-brand/10 px-2 py-0.5 text-[11px]">
                            {asg.courseCode} · {asg.experimentId}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-fg max-w-xs truncate">
                          {asg.title}
                        </td>
                        <td className="py-3 px-4 text-fg-subtle font-mono text-[11px]">
                          {asg.sectionIds.join(", ")}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          <span
                            className={`flex items-center gap-1 ${
                              isDuePast ? "text-amber-500 font-semibold" : "text-fg-muted"
                            }`}
                          >
                            <Calendar className="h-3 w-3" />
                            {new Date(asg.dueAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-fg font-medium">
                          {asg.maxMarks} pts
                        </td>
                        <td className="py-3 px-4">
                          {asg.status === "published" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 font-mono text-[10px] font-medium text-green-500">
                              <CheckCircle2 className="h-2.5 w-2.5" /> Published
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[10px] font-medium text-fg-subtle">
                              Draft
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveReviewAssignment(asg)}
                              className="flex items-center gap-1 rounded-lg bg-brand/10 px-2.5 py-1 font-semibold text-brand hover:bg-brand/20 transition text-[11px]"
                            >
                              <span>Submissions</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAssignment(asg);
                                setIsCreateModalOpen(true);
                              }}
                              className="rounded-lg border border-line px-2 py-1 text-fg-muted hover:bg-hover hover:text-fg text-[11px]"
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Assignment Editor Modal */}
      <AssignmentEditorModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingAssignment(null);
        }}
        onSave={handleSaveAssignment}
        initialData={editingAssignment}
      />
    </div>
  );
};
