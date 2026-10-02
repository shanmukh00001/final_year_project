import React from "react";
import { Database, Download } from "lucide-react";
import { useWorkspaceStore } from "../../store/workspaceStore.js";
import { type VariableInfo } from "@vlab/shared";

export const VariablesPane: React.FC = () => {
  const { variables } = useWorkspaceStore();

  const handleExportCsv = (v: VariableInfo) => {
    // Generate simple CSV for 1D or 2D array representation
    let csvContent = "";
    if (v.preview) {
      csvContent = v.preview.replace(/[[\]]/g, "").trim().split(/\s+/).join(",");
    } else {
      csvContent = `${v.name},${v.type},${v.shape || ""}`;
    }

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${v.name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      data-testid="pane-variables"
      className="flex h-full w-full flex-col bg-surface border-t border-l border-line overflow-hidden select-none font-mono text-xs"
    >
      {/* Variables Header Bar */}
      <div className="flex h-7 w-full items-center justify-between border-b border-line bg-surface-2 px-3">
        <div className="flex items-center gap-2">
          <Database className="h-3.5 w-3.5 text-accent-500" />
          <span className="font-semibold text-[11px] uppercase tracking-wider text-fg-muted font-sans">
            Variable Inspector ({variables.length})
          </span>
        </div>
      </div>

      {/* Variables Table */}
      <div className="flex-1 overflow-y-auto">
        {variables.length === 0 ? (
          <div className="p-3 text-fg-subtle italic text-[11px]">
            No variables in kernel. Run code to inspect variables.
          </div>
        ) : (
          <table className="w-full border-collapse text-left text-[11px]">
            <thead>
              <tr className="border-b border-line bg-surface-2 text-fg-muted font-medium font-sans">
                <th className="px-2.5 py-1.5 border-r border-line">Name</th>
                <th className="px-2.5 py-1.5 border-r border-line">Type</th>
                <th className="px-2.5 py-1.5 border-r border-line">Shape</th>
                <th className="px-2.5 py-1.5 border-r border-line">Dtype</th>
                <th className="px-2.5 py-1.5">Value / Action</th>
              </tr>
            </thead>
            <tbody>
              {variables.map((v) => (
                <tr key={v.name} className="border-b border-line hover:bg-hover transition-colors">
                  <td className="px-2.5 py-1.5 font-bold text-brand border-r border-line">
                    {v.name}
                  </td>
                  <td className="px-2.5 py-1.5 text-fg-muted border-r border-line">{v.type}</td>
                  <td className="px-2.5 py-1.5 text-fg-muted border-r border-line">{v.shape || "-"}</td>
                  <td className="px-2.5 py-1.5 text-fg-muted border-r border-line">{v.dtype || "-"}</td>
                  <td className="px-2.5 py-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate max-w-[120px] text-fg-subtle" title={v.preview}>
                        {v.preview || "-"}
                      </span>
                      {v.type.includes("ndarray") && (
                        <button
                          type="button"
                          data-testid={`btn-export-var-${v.name}`}
                          onClick={() => handleExportCsv(v)}
                          className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-fg-subtle hover:bg-hover hover:text-fg"
                          title="Export array as CSV"
                        >
                          <Download className="h-2.5 w-2.5" />
                          <span>CSV</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
