import { Calculator } from "lucide-react";
import { useWorkspaceStore } from "../../store/workspaceStore.js";

export function VariablesPane() {
  const { variables, simulation } = useWorkspaceStore();

  return (
    <div
      className="h-full flex flex-col bg-surface border-t border-line overflow-hidden"
      data-testid="pane-variables"
    >
      <div className="px-3 py-1.5 bg-surface-2 border-b border-line flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <Calculator className="w-3.5 h-3.5 text-brand" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-fg-muted">
            Computed Circuit Quantities
          </span>
        </div>
        <span className="text-[10px] font-mono text-fg-subtle">{variables.length} values</span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {variables.length === 0 ? (
          <div className="h-full flex items-center justify-center p-4 text-xs text-fg-muted text-center">
            {simulation?.energized
              ? "No scalar quantities reported."
              : "Click Simulate or close the circuit switch to inspect computed circuit quantities."}
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-surface-2/60 text-fg-muted border-b border-line sticky top-0">
              <tr>
                <th className="px-3 py-1.5 font-semibold">Quantity</th>
                <th className="px-2 py-1.5 font-semibold">Type</th>
                <th className="px-3 py-1.5 font-semibold text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60 font-mono">
              {variables.map((v) => (
                <tr key={v.name} className="hover:bg-hover/60">
                  <td className="px-3 py-1.5 font-semibold text-brand">{v.name}</td>
                  <td className="px-2 py-1.5 text-[11px] text-fg-subtle">{v.type}</td>
                  <td
                    className="px-3 py-1.5 text-right text-fg truncate max-w-[180px]"
                    title={v.preview}
                  >
                    {v.preview}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
