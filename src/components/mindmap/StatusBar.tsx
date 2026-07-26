"use client";

import { useMindMapStore } from "@/store/mindmap-store";
import { useSettingsStore } from "@/store/settings-store";

export function StatusBar() {
  const nodes = useMindMapStore((s) => s.nodes);
  const edges = useMindMapStore((s) => s.edges);
  const dirty = useMindMapStore((s) => s.dirty);
  const saving = useMindMapStore((s) => s.saving);
  const lastSavedAt = useMindMapStore((s) => s.lastSavedAt);
  const selectedNodeIds = useMindMapStore((s) => s.selectedNodeIds);
  const viewport = useMindMapStore((s) => s.viewport);

  const show = useSettingsStore((s) => s.settings.visual.showStatusBar);

  if (!show) return null;

  const savedLabel = lastSavedAt
    ? `Salvo às ${new Date(lastSavedAt).toLocaleTimeString("pt-BR")}`
    : "Não salvo";

  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-t border-border bg-card/80 backdrop-blur-sm text-xs text-muted-foreground">
      <div className="flex items-center gap-3">
        <span>{nodes.length} nós</span>
        <span>{edges.length} conexões</span>
        {selectedNodeIds.length > 0 && (
          <span className="text-primary font-medium">{selectedNodeIds.length} selecionados</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {dirty && !saving && (
          <span className="text-amber-500">● Modificado</span>
        )}
        {saving && (
          <span className="text-primary animate-pulse">Salvando...</span>
        )}
        {!dirty && <span>{savedLabel}</span>}
        <span>{Math.round(viewport.zoom * 100)}%</span>
      </div>
    </div>
  );
}
