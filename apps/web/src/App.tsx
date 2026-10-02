import { useState, useEffect } from "react";
import "./styles/index.css";
import { WorkspaceShell } from "./components/workspace/WorkspaceShell.js";
import { Catalog } from "./pages/Catalog.js";
import { useWorkspaceStore } from "./store/workspaceStore.js";
import { getExperimentById } from "./data/curriculum/index.js";

export function App() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [currentView, setCurrentView] = useState<"catalog" | "workspace">("workspace");
  const initWorkspace = useWorkspaceStore((s) => s.initWorkspace);

  useEffect(() => {
    // Initialize Pyodide engine and default DSP-03 workspace
    const exp = getExperimentById("DSP-03");
    initWorkspace("DSP-03", exp?.starterCode);
  }, [initWorkspace]);

  const handleSelectExperiment = (id: string) => {
    const exp = getExperimentById(id);
    if (exp) {
      initWorkspace(exp.id, exp.starterCode);
      setCurrentView("workspace");
    }
  };

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
  };

  if (currentView === "catalog") {
    return <Catalog onSelectExperiment={handleSelectExperiment} />;
  }

  return <WorkspaceShell theme={theme} onToggleTheme={toggleTheme} />;
}

export default App;
