"use client";

import { useMemo, useCallback } from "react";
import { useMindMapStore } from "@/store/mindmap-store";
import { useSettingsStore } from "@/store/settings-store";
import { NODE_KIND_META } from "@/lib/settings";

export function Minimap() {
  const nodes = useMindMapStore((s) => s.nodes);
  const edges = useMindMapStore((s) => s.edges);
  const viewport = useMindMapStore((s) => s.viewport);
  const setViewport = useMindMapStore((s) => s.setViewport);
  const autoColors = useSettingsStore((s) => s.settings.visual.autoColors);

  // Compute bounds
  const bounds = useMemo(() => {
    if (nodes.length === 0) return { minX: -400, minY: -300, maxX: 400, maxY: 300 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    }
    return { minX: minX - 80, minY: minY - 80, maxX: maxX + 80, maxY: maxY + 80 };
  }, [nodes]);

  const scale = useMemo(() => {
    const w = bounds.maxX - bounds.minX;
    const h = bounds.maxY - bounds.minY;
    const mapW = 170;
    const mapH = 110;
    return Math.min(mapW / w, mapH / h);
  }, [bounds]);

  const handleMinimapClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      // Convert minimap coords to world coords
      const worldX = bounds.minX + px / scale;
      const worldY = bounds.minY + py / scale;
      // Center viewport on that world position
      const cx = typeof window !== "undefined" ? window.innerWidth / 2 : 600;
      const cy = typeof window !== "undefined" ? window.innerHeight / 2 : 400;
      setViewport({
        x: cx - worldX * viewport.zoom,
        y: cy - worldY * viewport.zoom,
        zoom: viewport.zoom,
      });
    },
    [bounds, scale, viewport.zoom, setViewport]
  );

  const autoColorsEnabled = autoColors;

  return (
    <div
      className="absolute bottom-3 right-3 w-[170px] rounded-lg shadow-lg overflow-hidden cursor-pointer backdrop-blur-md border border-border bg-card/90 fade-in"
      onClick={handleMinimapClick}
    >
      <div className="flex items-center justify-between px-2 py-1 border-b border-border/60 bg-gradient-to-r from-primary/10 to-transparent">
        <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Minimap</span>
        <span className="text-[9px] text-muted-foreground tabular-nums">{Math.round(viewport.zoom * 100)}%</span>
      </div>
      <svg width="170" height="110" style={{ pointerEvents: "none" }}>
        {/* edges as thin lines */}
        {edges.map((e) => {
          const s = nodes.find((n) => n.id === e.sourceId);
          const t = nodes.find((n) => n.id === e.targetId);
          if (!s || !t) return null;
          const sx = (s.x + s.width / 2 - bounds.minX) * scale;
          const sy = (s.y + s.height / 2 - bounds.minY) * scale;
          const tx = (t.x + t.width / 2 - bounds.minX) * scale;
          const ty = (t.y + t.height / 2 - bounds.minY) * scale;
          return (
            <line
              key={e.id}
              x1={sx}
              y1={sy}
              x2={tx}
              y2={ty}
              stroke="var(--muted-foreground)"
              strokeWidth={0.5}
              opacity={0.4}
            />
          );
        })}
        {/* nodes as small rectangles */}
        {nodes.map((n) => {
          const nx = (n.x - bounds.minX) * scale;
          const ny = (n.y - bounds.minY) * scale;
          const nw = n.width * scale;
          const nh = n.height * scale;
          const kindMeta = NODE_KIND_META[n.kind as keyof typeof NODE_KIND_META];
          const color = n.color || (autoColorsEnabled ? kindMeta?.color : "var(--primary)");
          return (
            <rect
              key={n.id}
              x={nx}
              y={ny}
              width={nw}
              height={nh}
              rx={1}
              fill={color}
              opacity={0.5}
            />
          );
        })}
        {/* viewport indicator */}
        {(() => {
          const vx = (-viewport.x / viewport.zoom - bounds.minX) * scale;
          const vy = (-viewport.y / viewport.zoom - bounds.minY) * scale;
          const vw = (typeof window !== "undefined" ? window.innerWidth : 600) / viewport.zoom * scale;
          const vh = (typeof window !== "undefined" ? window.innerHeight - 100 : 500) / viewport.zoom * scale;
          return (
            <rect
              x={vx}
              y={vy}
              width={vw}
              height={vh}
              rx={2}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={1.5}
              opacity={0.8}
            />
          );
        })()}
      </svg>
    </div>
  );
}
