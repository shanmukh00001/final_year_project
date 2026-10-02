import { useState, useEffect } from "react";
import "./styles/index.css";
import { WorkspaceShell } from "./components/workspace/WorkspaceShell.js";
import { Catalog } from "./pages/Catalog.js";
import { ProfessorDashboard } from "./pages/ProfessorDashboard.js";
import { AdminDashboard } from "./pages/AdminDashboard.js";
import { useWorkspaceStore } from "./store/workspaceStore.js";
import { getExperimentById } from "./data/curriculum/index.js";
import { ArrowLeft } from "lucide-react";

export function App() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [currentView, setCurrentView] = useState<"catalog" | "workspace" | "professor" | "admin">(
    "workspace",
  );
  const initWorkspace = useWorkspaceStore((s) => s.initWorkspace);
  const loadExperiment = useWorkspaceStore((s) => s.loadExperiment);

  useEffect(() => {
    // Initialize Pyodide engine and default DSP-03 workspace
    const exp = getExperimentById("DSP-03");
    initWorkspace("DSP-03", exp?.starterCode);
  }, [initWorkspace]);

  const handleSelectExperiment = (id: string) => {
    const exp = getExperimentById(id);
    if (exp) {
      loadExperiment(exp.id);
      setCurrentView("workspace");
    }
  };

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
  };

  if (currentView === "catalog") {
    return (
      <div className="relative min-h-screen">
        <div className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-surface px-6 py-2">
          <button
            type="button"
            onClick={() => setCurrentView("workspace")}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold text-fg hover:bg-hover transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Simulation Workspace</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentView("professor")}
              className="rounded-lg bg-brand/10 border border-brand/20 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand hover:text-white transition"
            >
              Faculty Portal
            </button>
            <button
              type="button"
              onClick={() => setCurrentView("admin")}
              className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold text-fg hover:bg-hover transition"
            >
              Admin Portal
            </button>
          </div>
        </div>
        <Catalog onSelectExperiment={handleSelectExperiment} />
      </div>
    );
  }

  if (currentView === "professor") {
    return (
      <div className="relative min-h-screen">
        <div className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-surface px-6 py-2">
          <button
            type="button"
            onClick={() => setCurrentView("workspace")}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold text-fg hover:bg-hover transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Simulation Workspace</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentView("catalog")}
              className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold text-fg hover:bg-hover transition"
            >
              Browse Catalog
            </button>
            <button
              type="button"
              onClick={() => setCurrentView("admin")}
              className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold text-fg hover:bg-hover transition"
            >
              Admin Portal
            </button>
          </div>
        </div>
        <ProfessorDashboard onNavigateToWorkspace={handleSelectExperiment} />
      </div>
    );
  }

  if (currentView === "admin") {
    return (
      <div className="relative min-h-screen">
        <div className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-surface px-6 py-2">
          <button
            type="button"
            onClick={() => setCurrentView("workspace")}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold text-fg hover:bg-hover transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Simulation Workspace</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentView("professor")}
              className="rounded-lg bg-brand/10 border border-brand/20 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand hover:text-white transition"
            >
              Faculty Portal
            </button>
            <button
              type="button"
              onClick={() => setCurrentView("catalog")}
              className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold text-fg hover:bg-hover transition"
            >
              Browse Catalog
            </button>
          </div>
        </div>
        <AdminDashboard />
      </div>
    );
  }

  return (
    <WorkspaceShell
      theme={theme}
      onToggleTheme={toggleTheme}
      onNavigateView={(view) => setCurrentView(view)}
    />
  );
}

export default App;
