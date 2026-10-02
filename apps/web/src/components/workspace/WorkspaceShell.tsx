import React, { useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { TopBar } from "./TopBar.js";
import { StatusBar } from "./StatusBar.js";
import { Explorer } from "./Explorer.js";
import { MonacoCodeEditor } from "./MonacoCodeEditor.js";
import { ConsolePane } from "./ConsolePane.js";
import { PlotPane } from "./PlotPane.js";
import { VariablesPane } from "./VariablesPane.js";

interface WorkspaceShellProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export const WorkspaceShell: React.FC<WorkspaceShellProps> = ({ theme, onToggleTheme }) => {
  const [cursorPosition, setCursorPosition] = useState({ lineNumber: 1, column: 1 });

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-app text-fg">
      {/* TopBar Header (48px) */}
      <TopBar theme={theme} onToggleTheme={onToggleTheme} />

      {/* Main Split-Pane Workspace Grid (react-resizable-panels) */}
      <main className="flex-1 w-full overflow-hidden relative">
        <PanelGroup direction="horizontal" autoSaveId="vlab.layout.v1.h">
          {/* Pane 1: Explorer & Parameters (18% default) */}
          <Panel id="explorer" order={1} defaultSize={18} minSize={12} maxSize={30} collapsible>
            <Explorer />
          </Panel>

          <PanelResizeHandle className="w-1 bg-line hover:bg-brand/50 transition-colors cursor-col-resize z-10" />

          {/* Pane 2 & 3: Center Column (Editor + Console, 42% default) */}
          <Panel id="center" order={2} defaultSize={42} minSize={25}>
            <PanelGroup direction="vertical" autoSaveId="vlab.layout.v1.vc">
              {/* Center Top: Editor Pane */}
              <Panel id="editor" order={1} defaultSize={70} minSize={20}>
                <MonacoCodeEditor
                  theme={theme}
                  onCursorChange={(pos) => setCursorPosition(pos)}
                />
              </Panel>

              <PanelResizeHandle className="h-1 bg-line hover:bg-brand/50 transition-colors cursor-row-resize z-10" />

              {/* Center Bottom: Console Pane */}
              <Panel id="console" order={2} defaultSize={30} minSize={10} collapsible>
                <ConsolePane />
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="w-1 bg-line hover:bg-brand/50 transition-colors cursor-col-resize z-10" />

          {/* Pane 4 & 5: Right Column (Plots + Variables, 40% default) */}
          <Panel id="right" order={3} defaultSize={40} minSize={20}>
            <PanelGroup direction="vertical" autoSaveId="vlab.layout.v1.vr">
              {/* Right Top: Plots Pane */}
              <Panel id="plots" order={1} defaultSize={65} minSize={20}>
                <PlotPane theme={theme} />
              </Panel>

              <PanelResizeHandle className="h-1 bg-line hover:bg-brand/50 transition-colors cursor-row-resize z-10" />

              {/* Right Bottom: Variable Inspector Pane */}
              <Panel id="variables" order={2} defaultSize={35} minSize={10} collapsible>
                <VariablesPane />
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </main>

      {/* StatusBar Footer (24px) */}
      <StatusBar cursorPosition={cursorPosition} />
    </div>
  );
};
