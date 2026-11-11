import React, { useState, useRef } from "react";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  type ImperativePanelHandle,
} from "react-resizable-panels";
import {
  Sidebar,
  Gauge,
  LineChart,
  Database,
  RotateCcw,
  Target,
  BookOpen,
  HelpCircle,
  ClipboardList,
  Cpu,
  CheckSquare,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
} from "lucide-react";
import { TopBar } from "./TopBar.js";
import { StatusBar } from "./StatusBar.js";
import { Explorer } from "./Explorer.js";
import { CircuitMakerPane } from "./CircuitMakerPane.js";
import { SimulationResultsPane } from "./SimulationResultsPane.js";
import { VlabExperimentTabs } from "./VlabExperimentTabs.js";
import { getExperimentById } from "../../data/curriculum/index.js";
import { useWorkspaceStore, type VlabSectionTab } from "../../store/workspaceStore.js";
import { PlotPane } from "./PlotPane.js";
import { VariablesPane } from "./VariablesPane.js";
import { SubmitAssignmentModal } from "./SubmitAssignmentModal.js";

interface WorkspaceShellProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onNavigateView?: ((view: "workspace" | "catalog" | "professor" | "admin") => void) | undefined;
}

const VLAB_SECTIONS: Array<{
  id: VlabSectionTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "aim", label: "Aim", icon: Target },
  { id: "theory", label: "Theory", icon: BookOpen },
  { id: "pretest", label: "Pretest", icon: HelpCircle },
  { id: "procedure", label: "Procedure", icon: ClipboardList },
  { id: "simulation", label: "Simulation", icon: Cpu },
  { id: "posttest", label: "Posttest", icon: CheckSquare },
];

export const WorkspaceShell: React.FC<WorkspaceShellProps> = ({
  theme,
  onToggleTheme,
  onNavigateView,
}) => {
  const { experimentId, activeVlabTab, setActiveVlabTab } = useWorkspaceStore();
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);

  const experiment = getExperimentById(experimentId);

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
    localStorage.removeItem("vlab.layout.v4.h");
    localStorage.removeItem("vlab.layout.v4.vc");
    localStorage.removeItem("vlab.layout.v2.vr");
    localStorage.removeItem("react-resizable-panels:vlab.layout.v4.h");
    localStorage.removeItem("react-resizable-panels:vlab.layout.v4.vc");
    localStorage.removeItem("react-resizable-panels:vlab.layout.v2.vr");
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

      {/* Body: Proper Left Navigation Sidebar + Main Content Column */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Navigation Panel (IIT VLab Style) */}
        <aside
          data-testid="vlab-section-tabs"
          className={`flex flex-col border-r border-line bg-surface shrink-0 select-none transition-[width] duration-150 ${
            navCollapsed ? "w-12" : "w-44"
          }`}
        >
          {/* Institute Header & Collapse Button */}
          <div className="flex items-center justify-between px-2.5 py-2.5 border-b border-line bg-surface-2/60">
            {!navCollapsed && (
              <div className="min-w-0">
                <div className="text-[10px] font-bold tracking-wide uppercase text-brand truncate">
                  {experiment?.institute || "IIT (ISM) Dhanbad"}
                </div>
                <div className="text-[10px] text-fg-subtle truncate">Virtual Labs</div>
              </div>
            )}
            <button
              type="button"
              data-testid="btn-toggle-nav-sidebar"
              onClick={() => setNavCollapsed((v) => !v)}
              title={navCollapsed ? "Expand Navigation Panel" : "Collapse Navigation Panel"}
              className="p-1 rounded text-fg-muted hover:text-fg hover:bg-hover transition-colors mx-auto"
            >
              {navCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Vertical Navigation Links */}
          <nav
            className="flex-1 py-2 space-y-0.5 px-1.5 overflow-y-auto"
            aria-label="Experiment Sections"
          >
            {VLAB_SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const active = activeVlabTab === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  data-testid={`vlab-tab-${sec.id}`}
                  title={sec.label}
                  onClick={() => setActiveVlabTab(sec.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs transition-colors ${
                    navCollapsed ? "justify-center px-0" : "text-left"
                  } ${
                    active
                      ? "bg-brand text-white font-semibold shadow-sm"
                      : "text-fg-muted hover:text-fg hover:bg-hover font-medium"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!navCollapsed && <span className="truncate">{sec.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* Bottom Lab ID Badge */}
          {!navCollapsed && (
            <div className="p-2.5 border-t border-line bg-surface-2/40 text-[10px] text-fg-subtle space-y-0.5">
              <div className="font-mono font-bold text-fg">{experiment?.id || experimentId}</div>
              <div className="truncate" title={experiment?.title}>
                {experiment?.title}
              </div>
            </div>
          )}
        </aside>

        {/* Right Main Column: Compact Breadcrumb/Pane Header + Active View */}
        <div className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden">
          {/* Compact Breadcrumb & Pane Controls Strip */}
          <div className="flex h-8 w-full items-center justify-between border-b border-line bg-surface-2 px-3 text-[11px] font-medium text-fg-muted select-none shrink-0 gap-2">
            <div className="flex items-center gap-1 min-w-0 truncate">
              <span className="text-brand font-semibold shrink-0">Electrical Engineering</span>
              <ChevronRight className="w-3 h-3 text-fg-subtle shrink-0" />
              <span className="hidden md:inline truncate">
                {experiment?.labName || "Electrical Engineering Virtual Laboratory"}
              </span>
              <ChevronRight className="hidden md:inline w-3 h-3 text-fg-subtle shrink-0" />
              <span className="font-semibold text-fg truncate">
                {experiment?.title || experimentId}
              </span>
            </div>

            {activeVlabTab === "simulation" && (
              <div className="flex items-center gap-1 shrink-0">
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
                  title="Toggle Circuit Components & User Values Panel"
                >
                  <Sidebar className="h-3 w-3" />
                  <span className="hidden sm:inline">Values</span>
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
                  title="Toggle Live Meters & Observation Table"
                >
                  <Gauge className="h-3 w-3" />
                  <span className="hidden sm:inline">Meters</span>
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
                  title="Toggle Waveforms & Plots Pane"
                >
                  <LineChart className="h-3 w-3" />
                  <span className="hidden sm:inline">Plots</span>
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
                  title="Toggle Computed Circuit Quantities"
                >
                  <Database className="h-3 w-3" />
                  <span className="hidden sm:inline">Quantities</span>
                </button>

                <button
                  type="button"
                  onClick={resetLayout}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-fg-subtle hover:text-brand transition"
                  title="Reset workspace panels to default layout"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {/* Main Content Area: Either Educational Tab View OR Interactive Circuit Maker Split-Pane */}
          <main className="flex-1 w-full min-h-0 overflow-hidden relative">
            {activeVlabTab !== "simulation" && experiment ? (
              <VlabExperimentTabs experiment={experiment} activeTab={activeVlabTab} />
            ) : (
              <PanelGroup direction="horizontal" autoSaveId="vlab.layout.v4.h">
                {/* Pane 1: Circuit Components & User Values (19% default) */}
                <Panel
                  ref={explorerPanelRef}
                  id="explorer"
                  order={1}
                  defaultSize={19}
                  minSize={15}
                  maxSize={32}
                  collapsible
                  onCollapse={() => setCollapsedStates((s) => ({ ...s, explorer: true }))}
                  onExpand={() => setCollapsedStates((s) => ({ ...s, explorer: false }))}
                >
                  <Explorer />
                </Panel>

                <PanelResizeHandle className="w-1 bg-line hover:bg-brand/50 transition-colors cursor-col-resize z-10" />

                {/* Pane 2 & 3: Center Column (Interactive Circuit Maker + Meters & Observation Table) */}
                <Panel id="center" order={2} defaultSize={48} minSize={30}>
                  <PanelGroup direction="vertical" autoSaveId="vlab.layout.v4.vc">
                    {/* Center Top: Circuit Maker Canvas */}
                    <Panel id="circuit-maker" order={1} defaultSize={58} minSize={38}>
                      <CircuitMakerPane />
                    </Panel>

                    <PanelResizeHandle className="h-1 bg-line hover:bg-brand/50 transition-colors cursor-row-resize z-10" />

                    {/* Center Bottom: Live Meters, Clear Explanation & Observation Table */}
                    <Panel
                      ref={consolePanelRef}
                      id="console"
                      order={2}
                      defaultSize={42}
                      minSize={18}
                      collapsible
                      onCollapse={() => setCollapsedStates((s) => ({ ...s, console: true }))}
                      onExpand={() => setCollapsedStates((s) => ({ ...s, console: false }))}
                    >
                      <SimulationResultsPane />
                    </Panel>
                  </PanelGroup>
                </Panel>

                <PanelResizeHandle className="w-1 bg-line hover:bg-brand/50 transition-colors cursor-col-resize z-10" />

                {/* Pane 4 & 5: Right Column (Waveforms & Plots + Computed Quantities) */}
                <Panel
                  ref={rightPanelRef}
                  id="right"
                  order={3}
                  defaultSize={33}
                  minSize={20}
                  collapsible
                  onCollapse={() => setCollapsedStates((s) => ({ ...s, right: true }))}
                  onExpand={() => setCollapsedStates((s) => ({ ...s, right: false }))}
                >
                  <PanelGroup direction="vertical" autoSaveId="vlab.layout.v2.vr">
                    {/* Right Top: Plots Pane */}
                    <Panel id="plots" order={1} defaultSize={64} minSize={20}>
                      <PlotPane theme={theme} />
                    </Panel>

                    <PanelResizeHandle className="h-1 bg-line hover:bg-brand/50 transition-colors cursor-row-resize z-10" />

                    {/* Right Bottom: Computed Quantities Pane */}
                    <Panel
                      ref={variablesPanelRef}
                      id="variables"
                      order={2}
                      defaultSize={36}
                      minSize={12}
                      collapsible
                      onCollapse={() => setCollapsedStates((s) => ({ ...s, variables: true }))}
                      onExpand={() => setCollapsedStates((s) => ({ ...s, variables: false }))}
                    >
                      <VariablesPane />
                    </Panel>
                  </PanelGroup>
                </Panel>
              </PanelGroup>
            )}
          </main>
        </div>
      </div>

      {/* StatusBar Footer */}
      <StatusBar />

      {/* Student Assignment Submission Modal */}
      <SubmitAssignmentModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
      />
    </div>
  );
};
