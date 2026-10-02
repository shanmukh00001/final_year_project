import React from "react";
import ReactDOM from "react-dom/client";
import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { App } from "./App.js";

// Configure Monaco to use locally bundled instance (No external CDN requests, conforming to CSP)
loader.config({ monaco });

if (typeof window !== "undefined") {
  window.MonacoEnvironment = {
    getWorker: () => {
      return new Worker(
        URL.createObjectURL(
          new Blob(["self.onmessage = function () {};"], { type: "text/javascript" }),
        ),
      );
    },
  };
}

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
