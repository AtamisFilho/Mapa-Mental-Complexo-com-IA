"use client";

import { useMindMapStore } from "@/store/mindmap-store";
import { useSettingsStore } from "@/store/settings-store";
import { Circle, Check, Loader2, AlertCircle } from "lucide-react";

export function StatusBar() {
  const nodes = useMindMapStore((s) => s.nodes);
  const edges = useMindMapStore((s) => s.edges);
  const dirty = useMindMapStore((s) => s.dirty);
  const saving = useMindMapStore((s) => s.saving);
  const lastSavedAt = useMindMapStore((s) => s.lastSavedAt);
  const selectedNodeIds = useMindMapStore((s) => s.selectedNodeIds);
  const viewport = useMindMapStore((s) => s.viewport);
  const title = useMindMapStore((s) => s.title);

  const show = useSettingsStore((s) => s.settings.visual.showStatusBar);

  if (!show) return null;

  const savedLabel = lastSavedAt
    ? `Salvo às ${new Date(lastSavedAt).toLocaleTimeString("pt-BR")}`
    : "Não salvo";

  // Count nodes by kind
  const kindCounts: Record<string, number> = {};
  for (const n of nodes) {
    kindCounts[n.kind] = (kindCounts[n.kind] ?? 0) + 1;
  }

  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-t border-border bg-card/90 backdrop-blur-md text-xs text-muted-foreground gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex items-center gap-1.5 shrink-0">
          <span className="font-semibold text-foreground">{nodes.length}</span> nós
        </span>
        <span className="shrink-0">·</span>
        <span className="flex items-center gap-1.5 shrink-0">
          <span className="font-semibold text-foreground">{edges.length}</span> conexões
        </span>
        {selectedNodeIds.length > 0 && (
          <>
            <span className="shrink-0">·</span>
            <span className="text-primary font-medium flex items-center gap-1 shrink-0">
              <Circle className="h-2.5 w-2.5 fill-primary" />
              {selectedNodeIds.length} selecionado{selectedNodeIds.length > 1 ? "s" : ""}
            </span>
          </>
        )}
        {nodes.length > 0 && (
          <span className="hidden lg:flex items-center gap-1.5 shrink-0">
            <span className="shrink-0">·</span>
            {Object.entries(kindCounts).slice(0, 4).map(([kind, count]) => (
              <span key={kind} className="text-[10px] px-1.5 py-0.5 rounded bg-muted capitalize">
                {kind}: {count}
              </span>
            ))}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="hidden sm:inline truncate max-w-[160px]" title={title}>
          {title}
        </span>
        <span className="shrink-0">·</span>
        {saving ? (
          <span className="text-primary flex items-center gap-1.5 shrink-0">
            <Loader2 className="h-3 w-3 animate-spin" /> Salvando...
          </span>
        ) : dirty ? (
          <span className="text-amber-500 flex items-center gap-1.5 shrink-0">
            <AlertCircle className="h-3 w-3" /> Modificado
          </span>
        ) : (
          <span className="flex items-center gap-1.5 shrink-0">
            <Check className="h-3 w-3 text-primary" /> {savedLabel}
          </span>
        )}
        <span className="shrink-0">·</span>
        <span className="font-mono tabular-nums text-foreground shrink-0">
          {Math.round(viewport.zoom * 100)}%
        </span>
      </div>
    </div>
  );
}
