import { useState, useEffect, lazy, Suspense } from "react";
import "./styles/index.css";
import { WorkspaceShell } from "./components/workspace/WorkspaceShell.js";
import { useWorkspaceStore } from "./store/workspaceStore.js";
import { getExperimentById } from "./data/curriculum/index.js";
import { ArrowLeft } from "lucide-react";

const Catalog = lazy(() => import("./pages/Catalog.js").then((m) => ({ default: m.Catalog })));
const ProfessorDashboard = lazy(() =>
  import("./pages/ProfessorDashboard.js").then((m) => ({ default: m.ProfessorDashboard })),
);
const AdminDashboard = lazy(() =>
  import("./pages/AdminDashboard.js").then((m) => ({ default: m.AdminDashboard })),
);

export function App() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [currentView, setCurrentView] = useState<"catalog" | "workspace" | "professor" | "admin">(
    "workspace",
  );
  const initWorkspace = useWorkspaceStore((s) => s.initWorkspace);
  const loadExperiment = useWorkspaceStore((s) => s.loadExperiment);

  useEffect(() => {
    // Restore active experiment from URL parameter or localStorage
    let targetExpId = "DSP-03";
    try {
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const urlExp = urlParams.get("exp");
        const storedExp = localStorage.getItem("vlab_active_experiment");
        if (urlExp && getExperimentById(urlExp)) {
          targetExpId = urlExp;
        } else if (storedExp && getExperimentById(storedExp)) {
          targetExpId = storedExp;
        }
      }
    } catch {
      // Ignore
    }

    const exp = getExperimentById(targetExpId);
    initWorkspace(targetExpId, exp?.starterCode);
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
        <Suspense
          fallback={<div className="p-8 text-center text-sm text-fg-muted">Loading Catalog...</div>}
        >
          <Catalog onSelectExperiment={handleSelectExperiment} />
        </Suspense>
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
        <Suspense
          fallback={
            <div className="p-8 text-center text-sm text-fg-muted">Loading Faculty Portal...</div>
          }
        >
          <ProfessorDashboard onNavigateToWorkspace={handleSelectExperiment} />
        </Suspense>
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
        <Suspense
          fallback={
            <div className="p-8 text-center text-sm text-fg-muted">Loading Admin Portal...</div>
          }
        >
          <AdminDashboard />
        </Suspense>
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
