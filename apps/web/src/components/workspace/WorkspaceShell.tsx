import React, { useState, useRef } from "react";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  type ImperativePanelHandle,
} from "react-resizable-panels";
import { Sidebar, Terminal, LineChart, Database, RotateCcw } from "lucide-react";
import { TopBar } from "./TopBar.js";
import { StatusBar } from "./StatusBar.js";
import { Explorer } from "./Explorer.js";
import { MonacoCodeEditor } from "./MonacoCodeEditor.js";
import { ConsolePane } from "./ConsolePane.js";
import { PlotPane } from "./PlotPane.js";
import { VariablesPane } from "./VariablesPane.js";
import { SubmitAssignmentModal } from "./SubmitAssignmentModal.js";

interface WorkspaceShellProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onNavigateView?: ((view: "workspace" | "catalog" | "professor" | "admin") => void) | undefined;
}

export const WorkspaceShell: React.FC<WorkspaceShellProps> = ({
  theme,
  onToggleTheme,
  onNavigateView,
}) => {
  const [cursorPosition, setCursorPosition] = useState({ lineNumber: 1, column: 1 });
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // Imperative panel handles for collapse / expand tracking
  const explorerPanelRef = useRef<ImperativePanelHandle>(null);
  const consolePanelRef = useRef<ImperativePanelHandle>(null);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const variablesPanelRef = useRef<ImperativePanelHandle>(null);

  const [collapsedStates, setCollapsedStates] = useState({
    explorer: false,
    console: false,
    right: false,
    variables: false,
  });

  const resetLayout = () => {
    explorerPanelRef.current?.expand();
    consolePanelRef.current?.expand();
    rightPanelRef.current?.expand();
    variablesPanelRef.current?.expand();
    localStorage.removeItem("vlab.layout.v1.h");
    localStorage.removeItem("vlab.layout.v1.vc");
    localStorage.removeItem("vlab.layout.v1.vr");
    setCollapsedStates({ explorer: false, console: false, right: false, variables: false });
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-app text-fg">
      {/* TopBar Header (48px) */}
      <TopBar
        theme={theme}
        onToggleTheme={onToggleTheme}
        onNavigateView={onNavigateView}
        onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
      />

      {/* Quick Panel Toggle Bar (Shown when any panel is collapsed or for quick visibility) */}
      <div className="flex h-7 w-full items-center justify-between border-b border-line bg-surface-2 px-3 text-[11px] font-medium text-fg-muted select-none">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase font-semibold text-fg-subtle tracking-wider mr-1">
            Workspace Panes:
          </span>
          <button
            type="button"
            onClick={() => {
              if (collapsedStates.explorer) {
                explorerPanelRef.current?.expand();
              } else {
                explorerPanelRef.current?.collapse();
              }
            }}
            className={`flex items-center gap-1 rounded px-2 py-0.5 transition ${
              !collapsedStates.explorer
                ? "bg-brand/10 text-brand font-semibold"
                : "bg-surface border border-line text-fg-subtle hover:text-fg"
            }`}
            title="Toggle Sidebar / Explorer & Parameters"
          >
            <Sidebar className="h-3 w-3" />
            <span>Files & Params</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (collapsedStates.console) {
                consolePanelRef.current?.expand();
              } else {
                consolePanelRef.current?.collapse();
              }
            }}
            className={`flex items-center gap-1 rounded px-2 py-0.5 transition ${
              !collapsedStates.console
                ? "bg-brand/10 text-brand font-semibold"
                : "bg-surface border border-line text-fg-subtle hover:text-fg"
            }`}
            title="Toggle Console Output Pane"
          >
            <Terminal className="h-3 w-3" />
            <span>Console</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (collapsedStates.right) {
                rightPanelRef.current?.expand();
              } else {
                rightPanelRef.current?.collapse();
              }
            }}
            className={`flex items-center gap-1 rounded px-2 py-0.5 transition ${
              !collapsedStates.right
                ? "bg-brand/10 text-brand font-semibold"
                : "bg-surface border border-line text-fg-subtle hover:text-fg"
            }`}
            title="Toggle Plots & Waveforms Pane"
          >
            <LineChart className="h-3 w-3" />
            <span>Plots</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (collapsedStates.variables) {
                variablesPanelRef.current?.expand();
              } else {
                variablesPanelRef.current?.collapse();
              }
            }}
            className={`flex items-center gap-1 rounded px-2 py-0.5 transition ${
              !collapsedStates.variables
                ? "bg-brand/10 text-brand font-semibold"
                : "bg-surface border border-line text-fg-subtle hover:text-fg"
            }`}
            title="Toggle Variable Inspector Pane"
          >
            <Database className="h-3 w-3" />
            <span>Variables</span>
          </button>
        </div>

        <button
          type="button"
          onClick={resetLayout}
          className="flex items-center gap-1 text-[10px] text-fg-subtle hover:text-brand transition"
          title="Reset workspace panels to default layout"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Reset Layout</span>
        </button>
      </div>

      {/* Main Split-Pane Workspace Grid (react-resizable-panels) */}
      <main className="flex-1 w-full overflow-hidden relative">
        <PanelGroup direction="horizontal" autoSaveId="vlab.layout.v1.h">
          {/* Pane 1: Explorer & Parameters (18% default) */}
          <Panel
            ref={explorerPanelRef}
            id="explorer"
            order={1}
            defaultSize={18}
            minSize={12}
            maxSize={30}
            collapsible
            onCollapse={() => setCollapsedStates((s) => ({ ...s, explorer: true }))}
            onExpand={() => setCollapsedStates((s) => ({ ...s, explorer: false }))}
          >
            <Explorer />
          </Panel>

          <PanelResizeHandle className="w-1 bg-line hover:bg-brand/50 transition-colors cursor-col-resize z-10" />

          {/* Pane 2 & 3: Center Column (Editor + Console, 42% default) */}
          <Panel id="center" order={2} defaultSize={42} minSize={25}>
            <PanelGroup direction="vertical" autoSaveId="vlab.layout.v1.vc">
              {/* Center Top: Editor Pane */}
              <Panel id="editor" order={1} defaultSize={70} minSize={20}>
                <MonacoCodeEditor theme={theme} onCursorChange={(pos) => setCursorPosition(pos)} />
              </Panel>

              <PanelResizeHandle className="h-1 bg-line hover:bg-brand/50 transition-colors cursor-row-resize z-10" />

              {/* Center Bottom: Console Pane */}
              <Panel
                ref={consolePanelRef}
                id="console"
                order={2}
                defaultSize={30}
                minSize={10}
                collapsible
                onCollapse={() => setCollapsedStates((s) => ({ ...s, console: true }))}
                onExpand={() => setCollapsedStates((s) => ({ ...s, console: false }))}
              >
                <ConsolePane />
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="w-1 bg-line hover:bg-brand/50 transition-colors cursor-col-resize z-10" />

          {/* Pane 4 & 5: Right Column (Plots + Variables, 40% default) */}
          <Panel
            ref={rightPanelRef}
            id="right"
            order={3}
            defaultSize={40}
            minSize={20}
            collapsible
            onCollapse={() => setCollapsedStates((s) => ({ ...s, right: true }))}
            onExpand={() => setCollapsedStates((s) => ({ ...s, right: false }))}
          >
            <PanelGroup direction="vertical" autoSaveId="vlab.layout.v1.vr">
              {/* Right Top: Plots Pane */}
              <Panel id="plots" order={1} defaultSize={65} minSize={20}>
                <PlotPane theme={theme} />
              </Panel>

              <PanelResizeHandle className="h-1 bg-line hover:bg-brand/50 transition-colors cursor-row-resize z-10" />

              {/* Right Bottom: Variable Inspector Pane */}
              <Panel
                ref={variablesPanelRef}
                id="variables"
                order={2}
                defaultSize={35}
                minSize={10}
                collapsible
                onCollapse={() => setCollapsedStates((s) => ({ ...s, variables: true }))}
                onExpand={() => setCollapsedStates((s) => ({ ...s, variables: false }))}
              >
                <VariablesPane />
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </main>

      {/* StatusBar Footer (24px) */}
      <StatusBar cursorPosition={cursorPosition} />

      {/* Student Assignment Submission Modal */}
      <SubmitAssignmentModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
      />
    </div>
  );
};
