"use client";

import { useMindMapStore } from "@/store/mindmap-store";
import { useSettingsStore } from "@/store/settings-store";
import { NODE_KIND_META } from "@/lib/settings";
import { Circle, Check, Loader2, AlertCircle, Clock } from "lucide-react";

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
    <div className="grid grid-cols-3 items-center px-4 py-1.5 border-t border-border/60 backdrop-blur-md text-xs gap-3 min-h-[32px]"
      style={{
        background: "linear-gradient(90deg, var(--card) 0%, color-mix(in srgb, var(--card) 95%, var(--muted)) 50%, var(--card) 100%)",
      }}
    >
      {/* Left section: Count badges with subtle gradient separator */}
      <div className="flex items-center gap-2 min-w-0 overflow-hidden">
        <span className="pill-badge shrink-0" style={{ borderLeftWidth: 3, borderLeftColor: "var(--primary)" }}>
          <span className="font-bold text-foreground">{nodes.length}</span>
          nós
        </span>
        <span className="pill-badge shrink-0">
          <span className="font-bold text-foreground">{edges.length}</span>
          conexões
        </span>
        {selectedNodeIds.length > 0 && (
          <span className="pill-badge pill-badge--accent shrink-0">
            <Circle className="h-2.5 w-2.5 fill-primary text-primary" />
            {selectedNodeIds.length} selecionado{selectedNodeIds.length > 1 ? "s" : ""}
          </span>
        )}
        {nodes.length > 0 && (
          <span className="hidden lg:flex items-center gap-1.5 shrink-0 overflow-hidden">
            {Object.entries(kindCounts).slice(0, 4).map(([kind, count]) => {
              const meta = NODE_KIND_META[kind as keyof typeof NODE_KIND_META];
              const color = meta?.color ?? "var(--muted-foreground)";
              return (
                <span
                  key={kind}
                  className="pill-badge shrink-0"
                  style={{ borderLeftWidth: 3, borderLeftColor: color }}
                >
                  <span className="font-bold" style={{ color }}>{count}</span>
                  <span className="text-muted-foreground">{meta?.label ?? kind}</span>
                </span>
              );
            })}
          </span>
        )}
      </div>

      {/* Center section: Map title with brand styling */}
      <div className="flex items-center justify-center min-w-0 overflow-hidden gap-2">
        <span className="hidden sm:inline text-muted-foreground/50">·</span>
        <span
          className="hidden sm:inline truncate max-w-[220px] font-medium text-muted-foreground hover:text-foreground hover:underline cursor-pointer transition-colors"
          title={title}
        >
          {title}
        </span>
        <span className="hidden sm:inline text-muted-foreground/50">·</span>
      </div>

      {/* Right section: Save status + Zoom with color indicators */}
      <div className="flex items-center justify-end gap-2 shrink-0">
        {saving ? (
          <span className="pill-badge pill-badge--accent shrink-0">
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
            Salvando...
          </span>
        ) : dirty ? (
          <span className="pill-badge shrink-0" style={{ borderLeftColor: "#f59e0b", borderLeftWidth: 3 }}>
            <AlertCircle className="h-3 w-3 text-amber-500" />
            Modificado
          </span>
        ) : (
          <span className="pill-badge shrink-0" style={{ borderLeftColor: "var(--primary)", borderLeftWidth: 3 }}>
            <Check className="h-3 w-3 text-primary" />
            {savedLabel}
          </span>
        )}
        <span className="pill-badge shrink-0 font-mono tabular-nums" style={{ borderLeftWidth: 3, borderLeftColor: "var(--primary)" }}>
          <span className="font-bold text-foreground">{Math.round(viewport.zoom * 100)}</span>
          %
        </span>
      </div>
    </div>
  );
}
