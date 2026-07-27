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
    <div className="grid grid-cols-3 items-center px-4 py-2.5 border-t backdrop-blur-md text-xs gap-3 min-h-[40px] relative"
      style={{
        background: "linear-gradient(180deg, color-mix(in srgb, var(--card) 95%, transparent) 0%, var(--card) 100%)",
        borderColor: "color-mix(in srgb, var(--border) 75%, transparent)",
        boxShadow: "0 -2px 12px -4px rgba(0,0,0,0.18), inset 0 1px 0 color-mix(in srgb, var(--primary) 16%, transparent)",
      }}
    >
      {/* Top accent gradient line */}
      <div className="status-bar-accent-line" />
      {/* Left section: Count badges with subtle gradient separator */}
      <div className="flex items-center gap-2 min-w-0 overflow-hidden">
        <span
          className="pill-badge shrink-0 flex items-center justify-center"
          style={{ borderLeftWidth: 3, borderLeftColor: "var(--primary)" }}
        >
          <span className="font-bold text-foreground leading-none">{nodes.length}</span>
          <span className="leading-none">nós</span>
        </span>
        <span
          className="pill-badge shrink-0 flex items-center justify-center"
        >
          <span className="font-bold text-foreground leading-none">{edges.length}</span>
          <span className="leading-none">conexões</span>
        </span>
        {selectedNodeIds.length > 0 && (
          <span className="pill-badge pill-badge--accent shrink-0 flex items-center justify-center">
            <Circle className="h-2.5 w-2.5 fill-primary text-primary" />
            <span className="leading-none">{selectedNodeIds.length} selecionado{selectedNodeIds.length > 1 ? "s" : ""}</span>
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
                  className="pill-badge shrink-0 flex items-center justify-center"
                >
                  {/* Small colored dot for visual distinction of each kind */}
                  <span
                    aria-hidden
                    className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ background: color, boxShadow: `0 0 4px 1px ${color}55` }}
                  />
                  <span className="font-bold leading-none" style={{ color }}>{count}</span>
                  <span className="text-muted-foreground leading-none">{meta?.label ?? kind}</span>
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
          <span className="pill-badge pill-badge--accent shrink-0 flex items-center justify-center">
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
            <span className="leading-none">Salvando...</span>
          </span>
        ) : dirty ? (
          <span className="pill-badge shrink-0 flex items-center justify-center" style={{ borderLeftColor: "#f59e0b", borderLeftWidth: 3 }}>
            <AlertCircle className="h-3 w-3 text-amber-500" />
            <span className="leading-none">Modificado</span>
          </span>
        ) : (
          <span className="pill-badge shrink-0 flex items-center justify-center" style={{ borderLeftColor: "var(--primary)", borderLeftWidth: 3 }}>
            <Check className="h-3 w-3 text-primary" />
            <span className="leading-none">{savedLabel}</span>
          </span>
        )}
        <span className="pill-badge shrink-0 font-mono tabular-nums flex items-center justify-center" style={{ borderLeftWidth: 3, borderLeftColor: "var(--primary)" }}>
          <span className="font-bold text-foreground leading-none">{Math.round(viewport.zoom * 100)}</span>
          <span className="leading-none">%</span>
        </span>
      </div>
    </div>
  );
}
