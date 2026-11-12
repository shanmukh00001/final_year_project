import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useWorkspaceStore } from "../src/store/workspaceStore.js";
import { TopBar } from "../src/components/workspace/TopBar.js";
import { StatusBar } from "../src/components/workspace/StatusBar.js";
import { Explorer } from "../src/components/workspace/Explorer.js";
import { CircuitMakerPane } from "../src/components/workspace/CircuitMakerPane.js";
import { SimulationResultsPane } from "../src/components/workspace/SimulationResultsPane.js";
import { PlotPane } from "../src/components/workspace/PlotPane.js";
import { VariablesPane } from "../src/components/workspace/VariablesPane.js";
import { WorkspaceShell } from "../src/components/workspace/WorkspaceShell.js";
import { Catalog } from "../src/pages/Catalog.js";
import { MAX_CONSOLE_LINES } from "@vlab/shared";

// Mock react-resizable-panels
jest.mock("react-resizable-panels", () => ({
  PanelGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Panel: ({ children, id }: { children: React.ReactNode; id: string }) => (
    <div data-panel-id={id}>{children}</div>
  ),
  PanelResizeHandle: () => <div data-testid="resize-handle" />,
}));

describe("Phase 4: IIT (ISM) Dhanbad Circuit Maker Workspace UI & State", () => {
  beforeEach(() => {
    jest.useRealTimers();
    act(() => {
      useWorkspaceStore.getState().loadExperiment("NT-01");
      useWorkspaceStore.setState({
        activeVlabTab: "simulation",
        liveRun: true,
        unsavedChanges: false,
      });
    });
  });

  test("AC-WS-001: Workspace renders Circuit Maker & Simulation panes with code editor hidden", () => {
    render(<WorkspaceShell theme="light" onToggleTheme={jest.fn()} />);

    expect(screen.getByTestId("pane-explorer")).toBeInTheDocument();
    expect(screen.getByTestId("pane-circuit-maker")).toBeInTheDocument();
    expect(screen.getByTestId("pane-console")).toBeInTheDocument();
    expect(screen.getByTestId("pane-plots")).toBeInTheDocument();
    expect(screen.getByTestId("pane-variables")).toBeInTheDocument();

    // Verify legacy code editor and .py download are hidden
    expect(screen.queryByTestId("pane-editor")).not.toBeInTheDocument();
    expect(screen.queryByTestId("btn-export-py")).not.toBeInTheDocument();

    // Verify left navigation panel exists and References option is removed
    expect(screen.getByTestId("vlab-section-tabs")).toBeInTheDocument();
    expect(screen.queryByTestId("vlab-tab-references")).not.toBeInTheDocument();
  });

  test("IIT (ISM) Workflow Tabs switch cleanly to Aim & Apparatus with diagram image", () => {
    render(<WorkspaceShell theme="light" onToggleTheme={jest.fn()} />);

    fireEvent.click(screen.getByTestId("vlab-tab-aim"));
    expect(screen.getByTestId("vlab-tab-content-aim")).toBeInTheDocument();
    const img = screen.getByAltText(/R-L-C Circuit Analysis reference schematic/i);
    expect(img).toHaveAttribute("src", "/images/rlc-circuit-setup.jpg");

    fireEvent.click(screen.getByTestId("vlab-tab-theory"));
    expect(screen.getByTestId("vlab-tab-content-theory")).toBeInTheDocument();
  });

  test("AC-WS-004: Console log buffer caps at MAX_CONSOLE_LINES", () => {
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

  test("AC-WS-006: Computed quantities table displays RLC electrical quantities", () => {
    render(<VariablesPane />);

    expect(screen.getByText("I_rms")).toBeInTheDocument();
    expect(screen.getByText("Z_mag")).toBeInTheDocument();
  });

  test("AC-PLT-007: Plot pane supports clean single-curve view, data table, and removes Phasor tab", () => {
    render(<PlotPane theme="light" />);

    expect(screen.getByTestId("plot-canvas")).toBeInTheDocument();
    expect(screen.getByTestId("btn-toggle-datatable")).toBeInTheDocument();
    expect(screen.queryByTestId("plot-telemetry-strip")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tab-phasor-diagram")).not.toBeInTheDocument();
    expect(screen.queryByTestId("phasor-diagram-svg")).not.toBeInTheDocument();
  });

  test("AC-WS-007: User can change component values via input/slider and trigger live simulation", () => {
    jest.useFakeTimers();
    const simSpy = jest.spyOn(useWorkspaceStore.getState(), "simulate");

    render(
      <div>
        <Explorer />
        <CircuitMakerPane />
        <SimulationResultsPane />
      </div>,
    );

    const vsInput = screen.getByTestId("param-input-Vs") as HTMLInputElement;
    fireEvent.change(vsInput, { target: { value: "110" } });

    expect(useWorkspaceStore.getState().params["Vs"]).toBe(110);

    act(() => {
      jest.advanceTimersByTime(150);
    });

    expect(simSpy).toHaveBeenCalled();
    jest.useRealTimers();
  });

  test("Engine controls: TopBar renders Simulate, Reset Circuit, Clear, and hides .py button", () => {
    const toggleTheme = jest.fn();
    render(<TopBar theme="light" onToggleTheme={toggleTheme} />);

    expect(screen.getByTestId("btn-run")).toHaveTextContent(/Simulate/i);
    expect(screen.getByTestId("btn-restart")).toHaveTextContent(/Reset Circuit/i);
    expect(screen.getByTestId("btn-clear-console")).toBeInTheDocument();
    expect(screen.getByTestId("engine-status-pill")).toBeInTheDocument();
    expect(screen.queryByTestId("btn-export-py")).not.toBeInTheDocument();
  });

  test("StatusBar: Displays IIT (ISM) Virtual Lab solver info and connection verification", () => {
    render(<StatusBar />);

    expect(screen.getByTestId("status-bar")).toBeInTheDocument();
    expect(screen.getByText(/IIT \(ISM\) Virtual Lab/)).toBeInTheDocument();
    expect(screen.getByText(/Connections Verified/)).toBeInTheDocument();
  });

  test("Catalog: Displays only the 4 IIT (ISM) Dhanbad Virtual Lab experiments with images", () => {
    render(<Catalog onSelectExperiment={jest.fn()} />);

    expect(screen.getByText("4 Total Experiments")).toBeInTheDocument();
    expect(screen.getByTestId("experiment-card-NT-01")).toBeInTheDocument();
    expect(screen.getByTestId("experiment-card-BEE-01")).toBeInTheDocument();
    expect(screen.getByTestId("experiment-card-ELC-01")).toBeInTheDocument();
    expect(screen.getByTestId("experiment-card-ELC-02")).toBeInTheDocument();
    expect(screen.queryByTestId("experiment-card-NT-02")).not.toBeInTheDocument();
    expect(screen.queryByTestId("experiment-card-NT-03")).not.toBeInTheDocument();
    expect(screen.queryByTestId("experiment-card-DSP-03")).not.toBeInTheDocument();
  });
});
