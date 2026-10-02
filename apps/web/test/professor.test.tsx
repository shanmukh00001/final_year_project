import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProfessorDashboard } from "../src/pages/ProfessorDashboard.js";
import { AssignmentEditorModal } from "../src/components/professor/AssignmentEditorModal.js";
import { SubmissionReview } from "../src/pages/SubmissionReview.js";

describe("Milestone 2: Professor Dashboard & Grading Suite", () => {
  test("renders Professor Dashboard with KPI cards and assignment list", () => {
    render(<ProfessorDashboard />);

    expect(screen.getByText(/Professor Lab Management Portal/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Assignments/i)).toBeInTheDocument();
    expect(screen.getByText(/Active \/ Published/i)).toBeInTheDocument();
    expect(screen.getByText(/Enrolled Cohorts/i)).toBeInTheDocument();
    expect(screen.getByText(/Class Average Score/i)).toBeInTheDocument();

    // Check course filter tabs exist
    expect(screen.getByText("DSP")).toBeInTheDocument();
    expect(screen.getByText("NT")).toBeInTheDocument();
    expect(screen.getByText("SS")).toBeInTheDocument();
  });

  test("opens Assignment Editor modal and submits new assignment", () => {
    const handleSave = jest.fn();
    const handleClose = jest.fn();

    render(
      <AssignmentEditorModal
        isOpen={true}
        onClose={handleClose}
        onSave={handleSave}
      />
    );

    expect(screen.getByText(/Create New Lab Assignment/i)).toBeInTheDocument();
    expect(screen.getByText(/ECE Course Module/i)).toBeInTheDocument();
    expect(screen.getByText(/Catalog Experiment/i)).toBeInTheDocument();

    // Trigger save
    const submitBtn = screen.getByRole("button", { name: /Deploy Assignment/i });
    fireEvent.click(submitBtn);

    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        courseCode: expect.any(String),
        experimentId: expect.any(String),
        title: expect.any(String),
        maxMarks: expect.any(Number),
        status: expect.any(String),
      })
    );
  });

  test("renders SubmissionReview with student code, plot preview, and grading rubric", () => {
    const mockAssignment = {
      id: "asg-01",
      courseCode: "DSP" as const,
      experimentId: "DSP-01",
      experimentVersion: 1,
      title: "Lab 1: Discrete Fourier Transform & Spectral Leakage",
      instructions: "Implement 64-point FFT",
      sectionIds: ["ECE-A"],
      dueAt: new Date().toISOString(),
      allowLate: true,
      allowResubmit: true,
      maxMarks: 100,
      status: "published" as const,
    };

    const handleBack = jest.fn();

    render(
      <SubmissionReview
        assignment={mockAssignment}
        onBack={handleBack}
      />
    );

    expect(screen.getByText(/Back to Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Student Submissions/i)).toBeInTheDocument();
    expect(screen.getByText(/Submitted Python Script/i)).toBeInTheDocument();
    expect(screen.getByText(/Standard Output/i)).toBeInTheDocument();
    expect(screen.getByText(/Grading & Assessment/i)).toBeInTheDocument();
    expect(screen.getByText(/Evaluation Rubric/i)).toBeInTheDocument();

    // Save Grade action
    const saveGradeBtn = screen.getByRole("button", { name: /Save & Publish Grade/i });
    fireEvent.click(saveGradeBtn);

    expect(screen.getByText(/Grade recorded successfully!/i)).toBeInTheDocument();
  });
});
