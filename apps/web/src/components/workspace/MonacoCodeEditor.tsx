import React, { useRef, useEffect } from "react";
import Editor, { type OnMount, type Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useWorkspaceStore } from "../../store/workspaceStore.js";

interface MonacoCodeEditorProps {
  theme: "light" | "dark";
  onCursorChange?: (pos: { lineNumber: number; column: number }) => void;
}

export const MonacoCodeEditor: React.FC<MonacoCodeEditorProps> = ({ theme, onCursorChange }) => {
  const { code, setCode, activeError } = useWorkspaceStore();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const handleEditorDidMount: OnMount = (ed, monaco) => {
    editorRef.current = ed;
    monacoRef.current = monaco;

    // Register Keybinding: Ctrl/Cmd + Enter to Run All
    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      useWorkspaceStore.getState().runCode();
    });

    // Register Keybinding: Shift + Enter to Run Selection or Current Line
    ed.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
      const selection = ed.getSelection();
      const model = ed.getModel();
      if (!model) {
        return;
      }

      let codeToRun = "";
      if (selection && !selection.isEmpty()) {
        codeToRun = model.getValueInRange(selection);
      } else {
        const pos = ed.getPosition();
        if (pos) {
          codeToRun = model.getLineContent(pos.lineNumber);
        }
      }

      if (codeToRun.trim()) {
        // Run code via store
        useWorkspaceStore.getState().runCode();
      }
    });

    // Listen to cursor position changes
    ed.onDidChangeCursorPosition((e) => {
      if (onCursorChange) {
        onCursorChange({
          lineNumber: e.position.lineNumber,
          column: e.position.column,
        });
      }
    });
  };

  // Update error markers when activeError changes
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) {
      return;
    }

    const model = editorRef.current.getModel();
    if (!model) {
      return;
    }

    if (activeError && activeError.line) {
      const line = activeError.line;
      const col = activeError.column || 1;
      const endCol = model.getLineMaxColumn(line);

      monacoRef.current.editor.setModelMarkers(model, "vlab", [
        {
          startLineNumber: line,
          startColumn: col,
          endLineNumber: line,
          endColumn: endCol,
          message: `${activeError.name}: ${activeError.message}`,
          severity: monacoRef.current.MarkerSeverity.Error,
        },
      ]);
    } else {
      monacoRef.current.editor.setModelMarkers(model, "vlab", []);
    }
  }, [activeError]);

  return (
    <div data-testid="pane-editor" className="flex h-full w-full flex-col bg-surface overflow-hidden">
      {/* Tab strip */}
      <div className="flex h-8 w-full items-center justify-between border-b border-line bg-surface-2 px-2 text-xs select-none">
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-2 rounded-t border-t-2 border-brand bg-surface px-3 py-1.5 font-mono font-medium text-fg shadow-sm">
            <span>main.py</span>
          </div>
        </div>
        <div className="text-[11px] text-fg-subtle">
          <span>Python 3.14 · Ctrl+Enter to Run</span>
        </div>
      </div>

      {/* Editor component */}
      <div className="flex-1 w-full h-full relative">
        <Editor
          height="100%"
          language="python"
          value={code}
          theme={theme === "dark" ? "vs-dark" : "vs"}
          onChange={(val) => setCode(val || "")}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            insertSpaces: true,
            renderWhitespace: "selection",
            fontSize: 13,
            lineNumbers: "on",
            fontFamily: "var(--font-mono)",
            glyphMargin: false,
            folding: true,
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
          }}
        />
      </div>
    </div>
  );
};
