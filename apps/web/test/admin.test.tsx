import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminDashboard } from "../src/pages/AdminDashboard.js";
import { CsvImportModal } from "../src/components/admin/CsvImportModal.js";
import { ImageInspector } from "../src/components/workspace/ImageInspector.js";

// Mock Canvas 2D context for JSDOM
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    createImageData: (w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4),
      width: w,
      height: h,
    }),
    putImageData: jest.fn(),
    getImageData: jest.fn(() => ({
      data: new Uint8ClampedArray([128, 128, 128, 255]),
    })),
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

describe("Milestone 3: Admin Console & DIP Image Inspector Suite", () => {
  test("renders Admin Dashboard with vitals, user directory, and audit logs", () => {
    render(<AdminDashboard />);

    expect(screen.getByText(/Institutional Administration Console/i)).toBeInTheDocument();
    expect(screen.getByText(/Registered Students/i)).toBeInTheDocument();
    expect(screen.getByText(/Faculty Accounts/i)).toBeInTheDocument();
    expect(screen.getByText(/API Backend Status/i)).toBeInTheDocument();
    expect(screen.getByText(/Security & System Audit Logs/i)).toBeInTheDocument();

    // Check user table columns and initial users
    expect(screen.getByText("Aditya Sharma")).toBeInTheDocument();
    expect(screen.getByText("Dr. K. S. Rao")).toBeInTheDocument();
    expect(screen.getByText("Bulk CSV Student Import")).toBeInTheDocument();
  });

  test("opens CsvImportModal and parses student records", () => {
    const handleSuccess = jest.fn();
    const handleClose = jest.fn();

    render(
      <CsvImportModal
        isOpen={true}
        onClose={handleClose}
        onImportSuccess={handleSuccess}
      />
    );

    expect(screen.getByText(/Bulk Student Roster Importer/i)).toBeInTheDocument();
    expect(screen.getByText(/Load 5-Student Sample/i)).toBeInTheDocument();

    // Click Load Sample
    const sampleBtn = screen.getByRole("button", { name: /Load 5-Student Sample/i });
    fireEvent.click(sampleBtn);

    // Verify preview table appears with 5 students
    expect(screen.getByText(/Parsed Roster Preview/i)).toBeInTheDocument();
    expect(screen.getByText("Aarav Patel")).toBeInTheDocument();
    expect(screen.getByText("21ECE001")).toBeInTheDocument();
  });

  test("renders ImageInspector canvas and colormap controls", () => {
    render(<ImageInspector theme="light" />);

    expect(screen.getByText(/DIP Image Matrix/i)).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });
});
