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
    const mapW = 180;
    const mapH = 100;
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
      className="absolute bottom-3 right-3 w-[180px] rounded-xl overflow-hidden cursor-pointer fade-in group"
      onClick={handleMinimapClick}
      style={{
        background: "color-mix(in srgb, var(--card) 78%, transparent)",
        backdropFilter: "blur(20px) saturate(1.4)",
        WebkitBackdropFilter: "blur(20px) saturate(1.4)",
        border: "1px solid color-mix(in srgb, var(--border) 65%, transparent)",
        boxShadow: "0 8px 28px -8px rgba(0,0,0,0.35), 0 0 0 1px color-mix(in srgb, var(--primary) 12%, transparent), inset 0 1px 0 color-mix(in srgb, white 8%, transparent)",
      }}
    >
      <div
        className="flex items-center justify-between px-2.5 py-1.5 border-b transition-colors"
        style={{
          borderColor: "color-mix(in srgb, var(--border) 50%, transparent)",
          background: "linear-gradient(90deg, color-mix(in srgb, var(--primary) 18%, transparent) 0%, transparent 70%)",
        }}
      >
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[9px] font-semibold text-foreground/80 uppercase tracking-wider">Minimap</span>
        </div>
        <span className="text-[9px] text-foreground/70 tabular-nums font-mono px-1.5 py-0.5 rounded bg-background/60 border border-border/40">{Math.round(viewport.zoom * 100)}%</span>
      </div>
      <div className="relative">
        <svg width="180" height="100" style={{ pointerEvents: "none", display: "block" }}>
          {/* Subtle inner background gradient */}
          <defs>
            <radialGradient id="minimap-bg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.04" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
          <rect width="180" height="100" fill="url(#minimap-bg)" />
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
                strokeWidth={0.6}
                opacity={0.45}
              />
            );
          })}
          {/* nodes as small rectangles */}
          {nodes.map((n) => {
            const nx = (n.x - bounds.minX) * scale;
            const ny = (n.y - bounds.minY) * scale;
            const nw = Math.max(n.width * scale, 3);
            const nh = Math.max(n.height * scale, 3);
            const kindMeta = NODE_KIND_META[n.kind as keyof typeof NODE_KIND_META];
            const color = n.color || (autoColorsEnabled ? kindMeta?.color : "var(--primary)");
            const isSelected = false; // could track selection if needed
            return (
              <rect
                key={n.id}
                x={nx}
                y={ny}
                width={nw}
                height={nh}
                rx={1.5}
                fill={color}
                opacity={isSelected ? 0.95 : 0.6}
                stroke={color}
                strokeWidth={0.4}
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
              <>
                <rect
                  x={vx}
                  y={vy}
                  width={vw}
                  height={vh}
                  rx={2}
                  fill="color-mix(in srgb, var(--primary) 12%, transparent)"
                  stroke="var(--primary)"
                  strokeWidth={1.5}
                  opacity={0.95}
                />
                {/* Corner accents for the viewport rect */}
                {[
                  [vx, vy], [vx + vw, vy], [vx, vy + vh], [vx + vw, vy + vh],
                ].map(([cx, cy], i) => (
                  <circle key={i} cx={cx} cy={cy} r={2} fill="var(--primary)" />
                ))}
              </>
            );
          })()}
        </svg>
      </div>
    </div>
  );
}
