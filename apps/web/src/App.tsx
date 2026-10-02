import { useState } from "react";
import "./styles/index.css";

export function App() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
  };

  return (
    <div className="flex min-h-screen flex-col bg-app text-fg">
      <header className="flex h-12 items-center justify-between border-b border-line bg-surface px-4">
        <h1 className="font-semibold text-lg">V-Lab ECE</h1>
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-md border border-line-strong px-3 py-1 text-sm hover:bg-hover"
        >
          Theme: {theme}
        </button>
      </header>
      <main className="flex flex-1 items-center justify-center p-8">
        <div className="rounded-lg border border-line bg-surface p-6 shadow-panel">
          <p className="font-medium text-base">Virtual Laboratory Environment Initialized</p>
          <p className="mt-2 text-fg-muted text-sm">
            Client-Side Pyodide Simulation Engine for Signals, Networks, and Communications.
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
