import React, { useRef, useEffect, useCallback } from "react";
import Editor, { type OnMount, type Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useWorkspaceStore } from "../../store/workspaceStore.js";

interface MonacoCodeEditorProps {
  theme: "light" | "dark";
  onCursorChange?: (pos: { lineNumber: number; column: number }) => void;
}

export const MonacoCodeEditor: React.FC<MonacoCodeEditorProps> = ({ theme, onCursorChange }) => {
  const { code, experimentId, engineStatus, setCode, activeError } = useWorkspaceStore();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  // Track the experimentId for which the editor model was last synced.
  const syncedExpId = useRef<string>("");

  // ── Keybinding helpers ─────────────────────────────────────────────────────
  const handleEditorDidMount: OnMount = (ed, monaco) => {
    editorRef.current = ed;
    monacoRef.current = monaco;

    // Ctrl/Cmd + Enter → Run all code
    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      useWorkspaceStore.getState().runCode();
    });

    // Shift + Enter → Run selection or current line
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
        useWorkspaceStore.getState().runCode();
      }
    });

    // Cursor position tracking
    ed.onDidChangeCursorPosition((e) => {
      onCursorChange?.({
        lineNumber: e.position.lineNumber,
        column: e.position.column,
      });
    });

    // Mark initial sync
    syncedExpId.current = useWorkspaceStore.getState().experimentId;
  };

  // ── Experiment switch: imperatively update editor model ────────────────────
  // When experimentId changes we push the new code directly into the editor
  // model instead of relying on the React re-render cycle.  This avoids the
  // "value" prop race condition that can leave Monaco displaying stale code or
  // lose focus / scroll position on slow re-renders.
  useEffect(() => {
    const ed = editorRef.current;
    const monaco = monacoRef.current;
    if (!ed || !monaco) {
      return;
    }
    if (syncedExpId.current === experimentId) {
      return; // nothing changed
    }

    // Clear all error markers before replacing the model content
    const model = ed.getModel();
    if (model) {
      monaco.editor.setModelMarkers(model, "vlab", []);
      // Only push the value when it genuinely differs to avoid spurious undo entries
      if (model.getValue() !== code) {
        model.pushEditOperations(
          [],
          [{ range: model.getFullModelRange(), text: code }],
          () => null,
        );
        // Reset undo history so Ctrl+Z doesn't go back to previous experiment's code
        model.pushStackElement();
      }
    }

    syncedExpId.current = experimentId;
  }, [experimentId, code]);

  // ── Error marker management ────────────────────────────────────────────────
  // Clear markers when experiment changes OR when there is no active error.
  const clearMarkers = useCallback(() => {
    const ed = editorRef.current;
    const monaco = monacoRef.current;
    if (!ed || !monaco) {
      return;
    }
    const model = ed.getModel();
    if (model) {
      monaco.editor.setModelMarkers(model, "vlab", []);
    }
  }, []);

  useEffect(() => {
    const ed = editorRef.current;
    const monaco = monacoRef.current;
    if (!ed || !monaco) {
      return;
    }

    const model = ed.getModel();
    if (!model) {
      return;
    }

    if (activeError && activeError.line) {
      const line = Math.min(activeError.line, model.getLineCount());
      const col = activeError.column || 1;
      const endCol = model.getLineMaxColumn(line);

      monaco.editor.setModelMarkers(model, "vlab", [
        {
          startLineNumber: line,
          startColumn: col,
          endLineNumber: line,
          endColumn: endCol,
          message: `${activeError.name}: ${activeError.message}`,
          severity: monaco.MarkerSeverity.Error,
        },
      ]);
    } else {
      clearMarkers();
    }
  }, [activeError, clearMarkers]);

  // Clear markers when engine becomes "ready" after a successful run
  useEffect(() => {
    if (engineStatus === "ready") {
      clearMarkers();
    }
  }, [engineStatus, clearMarkers]);

  return (
    <div
      data-testid="pane-editor"
      className="flex h-full w-full flex-col bg-surface overflow-hidden"
    >
      {/* Tab strip */}
      <div className="flex h-8 w-full items-center justify-between border-b border-line bg-surface-2 px-2 text-xs select-none">
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-2 rounded-t border-t-2 border-brand bg-surface px-3 py-1.5 font-mono font-medium text-fg shadow-sm">
            <span>main.py</span>
          </div>
        </div>
        <div className="text-[11px] text-fg-subtle">
          <span>Python · Ctrl+Enter to Run · Shift+Enter for selection</span>
        </div>
      </div>

      {/* Editor component — keepCurrentModel prevents unmount/remount on prop changes */}
      <div className="flex-1 w-full h-full relative">
        <Editor
          height="100%"
          language="python"
          defaultValue={code}
          theme={theme === "dark" ? "vs-dark" : "vs"}
          onChange={(val) => setCode(val || "")}
          onMount={handleEditorDidMount}
          keepCurrentModel
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
            glyphMargin: true, // Enable for error glyph decoration
            folding: true,
            wordWrap: "off",
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
