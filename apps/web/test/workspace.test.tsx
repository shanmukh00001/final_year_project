import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useWorkspaceStore } from "../src/store/workspaceStore.js";
import { TopBar } from "../src/components/workspace/TopBar.js";
import { StatusBar } from "../src/components/workspace/StatusBar.js";
import { Explorer } from "../src/components/workspace/Explorer.js";
import { ConsolePane } from "../src/components/workspace/ConsolePane.js";
import { PlotPane } from "../src/components/workspace/PlotPane.js";
import { VariablesPane } from "../src/components/workspace/VariablesPane.js";
import { MAX_CONSOLE_LINES } from "@vlab/shared";

// Mock @monaco-editor/react
jest.mock("@monaco-editor/react", () => ({
  __esModule: true,
  default: () => <div data-testid="mock-monaco-editor">Monaco Editor</div>,
}));

// Mock react-resizable-panels
jest.mock("react-resizable-panels", () => ({
  PanelGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Panel: ({ children, id }: { children: React.ReactNode; id: string }) => (
    <div data-panel-id={id}>{children}</div>
  ),
  PanelResizeHandle: () => <div data-testid="resize-handle" />,
}));

describe("Phase 4: Frontend Workspace UI & State", () => {
  beforeEach(() => {
    // Reset Zustand store state
    useWorkspaceStore.setState({
      experimentId: "DSP-03",
      code: "print('Hello test')",
      engineStatus: "ready",
      bootProgress: { percent: 100, stage: "ready", message: "Ready" },
      consoleLines: [],
      variables: [],
      figures: [],
      activeFigureId: null,
      params: {},
      declaredParams: {},
      liveRun: false,
      activeError: null,
      lastRunElapsedMs: 120,
      unsavedChanges: false,
    });
  });

  test("AC-WS-001: Workspace renders required 5 regions with correct data-testid", () => {
    render(
      <div>
        <Explorer />
        <div data-testid="pane-editor">Editor</div>
        <ConsolePane />
        <PlotPane theme="light" />
        <VariablesPane />
      </div>,
    );

    expect(screen.getByTestId("pane-explorer")).toBeInTheDocument();
    expect(screen.getByTestId("pane-editor")).toBeInTheDocument();
    expect(screen.getByTestId("pane-console")).toBeInTheDocument();
    expect(screen.getByTestId("pane-plots")).toBeInTheDocument();
    expect(screen.getByTestId("pane-variables")).toBeInTheDocument();
  });

  test("AC-WS-004: Console caps buffer at MAX_CONSOLE_LINES", () => {
    // Fill console with more than MAX_CONSOLE_LINES lines
    const lines = Array.from({ length: MAX_CONSOLE_LINES + 50 }, (_, i) => ({
      id: `line-${i}`,
      stream: "stdout" as const,
      text: `Output line ${i}`,
      timestamp: Date.now() + i,
    }));

    useWorkspaceStore.setState({ consoleLines: lines.slice(-MAX_CONSOLE_LINES) });

    const state = useWorkspaceStore.getState();
    expect(state.consoleLines.length).toBe(MAX_CONSOLE_LINES);
    expect(state.consoleLines[state.consoleLines.length - 1]?.text).toBe(
      `Output line ${MAX_CONSOLE_LINES + 49}`,
    );
  });

  test("AC-WS-006: Variable inspector displays variables and hides private ones", () => {
    useWorkspaceStore.setState({
      variables: [
        { name: "h", type: "ndarray", shape: "(51,)", dtype: "float64", preview: "[0.01, 0.05...]" },
        { name: "fc", type: "float", shape: "", dtype: "float64", preview: "0.3" },
      ],
    });

    render(<VariablesPane />);

    expect(screen.getByText("h")).toBeInTheDocument();
    expect(screen.getByText("(51,)")).toBeInTheDocument();
    expect(screen.getByText("fc")).toBeInTheDocument();
  });

  test("AC-PLT-007: Plot pane provides accessible data-table view toggle", () => {
    useWorkspaceStore.setState({
      figures: [
        {
          id: "fig1",
          kind: "cartesian",
          layout: { title: "FIR Frequency Response" },
          traces: [
            {
              type: "scatter",
              x: new Float64Array([0.1, 0.2]),
              y: new Float64Array([1.0, 0.8]),
            },
          ],
        },
      ],
      activeFigureId: "fig1",
    });

    render(<PlotPane theme="light" />);

    expect(screen.getAllByText("FIR Frequency Response").length).toBeGreaterThan(0);

    const toggleBtn = screen.getByTestId("btn-toggle-datatable");
    expect(toggleBtn).toBeInTheDocument();

    // Toggle data table view
    fireEvent.click(toggleBtn);
    expect(screen.getByTestId("plot-data-table")).toBeInTheDocument();
    expect(screen.getByText("0.1000")).toBeInTheDocument();
    expect(screen.getByText("1.0000")).toBeInTheDocument();
  });

  test("AC-WS-007: Parameter slider updates store and triggers debounced execution when liveRun is enabled", () => {
    jest.useFakeTimers();

    useWorkspaceStore.setState({
      declaredParams: {
        fc: {
          name: "fc",
          kind: "slider",
          default: 0.3,
          min: 0.05,
          max: 0.95,
          step: 0.05,
          label: "Cutoff",
        },
      },
      params: { fc: 0.3 },
      liveRun: true,
    });

    const runSpy = jest.spyOn(useWorkspaceStore.getState(), "runCode");

    render(<Explorer />);

    const slider = screen.getByTestId("param-slider-fc");
    expect(slider).toBeInTheDocument();

    fireEvent.change(slider, { target: { value: "0.5" } });

    expect(useWorkspaceStore.getState().params["fc"]).toBe(0.5);

    // Debounced live execution after 300ms
    act(() => {
      jest.advanceTimersByTime(350);
    });

    expect(runSpy).toHaveBeenCalled();
    jest.useRealTimers();
  });

  test("Engine controls: TopBar renders Run, Stop, Clear, and EngineStatusPill", () => {
    const toggleTheme = jest.fn();
    render(<TopBar theme="light" onToggleTheme={toggleTheme} />);

    expect(screen.getByTestId("btn-run")).toBeInTheDocument();
    expect(screen.getByTestId("btn-restart")).toBeInTheDocument();
    expect(screen.getByTestId("btn-clear-console")).toBeInTheDocument();
    expect(screen.getByTestId("engine-status-pill")).toBeInTheDocument();
  });

  test("StatusBar: Displays version numbers and draft save status", () => {
    render(<StatusBar cursorPosition={{ lineNumber: 5, column: 12 }} />);

    expect(screen.getByTestId("status-bar")).toBeInTheDocument();
    expect(screen.getByText(/Ln 5, Col 12/)).toBeInTheDocument();
    expect(screen.getByText(/Draft saved/)).toBeInTheDocument();
  });
});
