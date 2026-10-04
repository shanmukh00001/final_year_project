import React, { useRef, useEffect, useCallback } from "react";
import Editor, { type OnMount, type Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useWorkspaceStore } from "../../store/workspaceStore.js";

interface MonacoCodeEditorProps {
  theme: "light" | "dark";
  onCursorChange?: (pos: { lineNumber: number; column: number }) => void;
}

// Concrete monospace font stack for Monaco's canvas font-measurement engine
const MONACO_FONT_FAMILY =
  "'JetBrains Mono Variable', 'JetBrains Mono', Consolas, 'SF Mono', Monaco, Menlo, 'Courier New', monospace";

export const MonacoCodeEditor: React.FC<MonacoCodeEditorProps> = ({ theme, onCursorChange }) => {
  const { code, experimentId, engineStatus, setCode, activeError } = useWorkspaceStore();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const lastSyncedExpId = useRef<string>(experimentId);

  // ── Keybinding helpers & mount setup ──────────────────────────────────────
  const handleEditorDidMount: OnMount = (ed, monaco) => {
    editorRef.current = ed;
    monacoRef.current = monaco;

    // Remeasure fonts as soon as web fonts are fully loaded to prevent cursor drift
    if (typeof document !== "undefined" && "fonts" in document) {
      document.fonts.ready.then(() => {
        try {
          monaco.editor.remeasureFonts();
        } catch {
          // Ignore if editor unmounted
        }
      });
    }

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

    // Mark initial sync & ensure current store code is applied if different
    lastSyncedExpId.current = useWorkspaceStore.getState().experimentId;
    const model = ed.getModel();
    if (model && model.getValue() !== code) {
      model.setValue(code);
    }
  };

  // ── Code synchronization ──────────────────────────────────────────────────
  // When experimentId changes or store code is updated externally (e.g. draft rehydration),
  // update the editor model. If the user is typing, model.getValue() === code, so this is a no-op.
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

    const isDifferentExp = lastSyncedExpId.current !== experimentId;
    const currentModelVal = model.getValue();

    if (isDifferentExp) {
      monaco.editor.setModelMarkers(model, "vlab", []);
      lastSyncedExpId.current = experimentId;
      model.setValue(code);
      model.pushStackElement(); // Clean undo stack for new experiment
    } else if (currentModelVal !== code) {
      // Store code was updated externally (e.g. draft loaded or reset)
      const currentPos = ed.getPosition();
      model.pushEditOperations(
        [],
        [{ range: model.getFullModelRange(), text: code }],
        () => null,
      );
      if (currentPos) {
        ed.setPosition(currentPos);
      }
    }
  }, [experimentId, code]);

  // ── Error marker management ────────────────────────────────────────────────
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

      {/* Editor component */}
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
            lineHeight: 20,
            lineNumbers: "on",
            fontFamily: MONACO_FONT_FAMILY,
            fontLigatures: false,
            glyphMargin: true,
            folding: true,
            wordWrap: "off",
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            matchBrackets: "always",
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
