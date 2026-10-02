import { useState, useEffect } from "react";
import "./styles/index.css";
import { WorkspaceShell } from "./components/workspace/WorkspaceShell.js";
import { useWorkspaceStore } from "./store/workspaceStore.js";

export function App() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const initWorkspace = useWorkspaceStore((s) => s.initWorkspace);

  useEffect(() => {
    // Initialize Pyodide engine and workspace state
    initWorkspace("DSP-03");
  }, [initWorkspace]);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
  };

  return <WorkspaceShell theme={theme} onToggleTheme={toggleTheme} />;
}

export default App;
