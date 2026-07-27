"use client";

import { useMemo, useCallback, useRef, useState, useEffect } from "react";
import { useMindMapStore } from "@/store/mindmap-store";
import { useSettingsStore } from "@/store/settings-store";
import { NODE_KIND_META } from "@/lib/settings";

// Approximate vertical chrome (toolbar + status bar) subtracted when computing
// the world → screen-space translation. Mirrors the value used in MindMapCanvas
// (toolbar ~44px + status/footer ~60px ≈ 100px) so the minimap viewport rect
// matches the actual visible canvas area on screen.
const CANVAS_CHROME_HEIGHT = 100;
// World units panned per arrow key press (Shift multiplies by 3).
const ARROW_STEP_WORLD = 60;

export function Minimap() {
  const nodes = useMindMapStore((s) => s.nodes);
  const edges = useMindMapStore((s) => s.edges);
  const viewport = useMindMapStore((s) => s.viewport);
  const setViewport = useMindMapStore((s) => s.setViewport);
  const autoColors = useSettingsStore((s) => s.settings.visual.autoColors);

  // `isDragging` controls visual feedback (cursor, ring, brighter glow);
  // `draggingRef` is a ref so the pointermove handler can short-circuit
  // without re-creating its closure every time the drag state changes.
  const [isDragging, setIsDragging] = useState(false);
  const draggingRef = useRef(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const pendingMinimapPointRef = useRef<{ x: number; y: number } | null>(null);

  // Keep a ref of the latest zoom so the pointer handlers can read it without
  // re-binding on every zoom change. The viewport indicator (which is reactive
  // by design) still subscribes to `viewport.zoom` directly.
  const zoomRef = useRef(viewport.zoom);
  useEffect(() => {
    zoomRef.current = viewport.zoom;
  }, [viewport.zoom]);

  // Compute world bounds (with 80px padding around all nodes).
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

  // Scale that fits world bounds into the minimap SVG (190 × 100).
  const scale = useMemo(() => {
    const w = bounds.maxX - bounds.minX;
    const h = bounds.maxY - bounds.minY;
    const mapW = 190;
    const mapH = 100;
    return Math.min(mapW / w, mapH / h);
  }, [bounds]);

  // Convert a minimap-space pixel coordinate (relative to the SVG top-left)
  // into a screen-space viewport translation that centers the main canvas on
  // the corresponding world position.
  const minimapPointToViewport = useCallback(
    (px: number, py: number) => {
      const worldX = px / scale + bounds.minX;
      const worldY = py / scale + bounds.minY;
      const cx = typeof window !== "undefined" ? window.innerWidth / 2 : 600;
      const cy =
        typeof window !== "undefined"
          ? (window.innerHeight - CANVAS_CHROME_HEIGHT) / 2
          : 400;
      const z = zoomRef.current;
      return {
        x: cx - worldX * z,
        y: cy - worldY * z,
        zoom: z,
      };
    },
    [scale, bounds]
  );

  // Throttled viewport update — stores the latest pointer position and
  // schedules a single rAF to apply it, collapsing many pointermove events
  // into one setViewport call per animation frame.
  const scheduleViewportUpdate = useCallback(
    (px: number, py: number) => {
      pendingMinimapPointRef.current = { x: px, y: py };
      if (rafIdRef.current !== null) return;
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        const pending = pendingMinimapPointRef.current;
        if (!pending) return;
        pendingMinimapPointRef.current = null;
        setViewport(minimapPointToViewport(pending.x, pending.y));
      });
    },
    [minimapPointToViewport, setViewport]
  );

  // Cancel any pending rAF on unmount.
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  // ── Pointer handlers ────────────────────────────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      // Only the primary mouse button starts a drag; touch/pen always do.
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      const svg = svgRef.current;
      if (!svg) return;
      try {
        svg.setPointerCapture(e.pointerId);
      } catch {
        /* setPointerCapture can throw if the pointer is no longer active */
      }
      draggingRef.current = true;
      setIsDragging(true);
      const rect = svg.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      // Apply immediately for a snappy click-to-center response (no rAF delay).
      setViewport(minimapPointToViewport(px, py));
    },
    [minimapPointToViewport, setViewport]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!draggingRef.current) return;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      scheduleViewportUpdate(px, py);
    },
    [scheduleViewportUpdate]
  );

  const endDrag = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setIsDragging(false);
      const svg = svgRef.current;
      if (svg) {
        try {
          svg.releasePointerCapture(e.pointerId);
        } catch {
          /* no-op */
        }
      }
      // Flush any pending rAF immediately so the final position is applied
      // synchronously on pointer release.
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      const pending = pendingMinimapPointRef.current;
      if (pending) {
        pendingMinimapPointRef.current = null;
        setViewport(minimapPointToViewport(pending.x, pending.y));
      }
    },
    [minimapPointToViewport, setViewport]
  );

  // ── Keyboard support: arrow keys pan the viewport ───────────────────────
  // Pressing Right pans the visible area to the right, which means decreasing
  // viewport.x (since viewport.x is the screen-space translation of the world
  // origin). Shift multiplies the step by 3 for fast traversal.
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<SVGSVGElement>) => {
      let dx = 0;
      let dy = 0;
      const step = (e.shiftKey ? ARROW_STEP_WORLD * 3 : ARROW_STEP_WORLD) *
        viewport.zoom;
      switch (e.key) {
        case "ArrowRight":
          dx = -step;
          break;
        case "ArrowLeft":
          dx = step;
          break;
        case "ArrowUp":
          dy = step;
          break;
        case "ArrowDown":
          dy = -step;
          break;
        default:
          return;
      }
      e.preventDefault();
      setViewport({
        x: viewport.x + dx,
        y: viewport.y + dy,
        zoom: viewport.zoom,
      });
    },
    [viewport, setViewport]
  );

  const autoColorsEnabled = autoColors;

  // Viewport indicator rectangle in minimap space (recomputed every render so
  // it tracks live viewport changes during drag/pan/zoom).
  const viewportIndicator = useMemo(() => {
    const vx = (-viewport.x / viewport.zoom - bounds.minX) * scale;
    const vy = (-viewport.y / viewport.zoom - bounds.minY) * scale;
    const vw =
      ((typeof window !== "undefined" ? window.innerWidth : 600) /
        viewport.zoom) *
      scale;
    const vh =
      ((typeof window !== "undefined"
        ? window.innerHeight - CANVAS_CHROME_HEIGHT
        : 500) /
        viewport.zoom) *
      scale;
    const armLen = Math.min(Math.max(Math.min(vw, vh) * 0.18, 4), 10);
    const corners: Array<{ cx: number; cy: number; dx: 1 | -1; dy: 1 | -1 }> = [
      { cx: vx, cy: vy, dx: 1, dy: 1 },
      { cx: vx + vw, cy: vy, dx: -1, dy: 1 },
      { cx: vx, cy: vy + vh, dx: 1, dy: -1 },
      { cx: vx + vw, cy: vy + vh, dx: -1, dy: -1 },
    ];
    return { vx, vy, vw, vh, armLen, corners };
  }, [viewport, bounds, scale]);

  return (
    <div
      className={
        "absolute bottom-3 right-3 w-[190px] rounded-xl overflow-hidden fade-in group transition-all duration-150 " +
        (isDragging ? "ring-2 ring-primary/70 scale-[1.02]" : "")
      }
      style={{
        background: "color-mix(in srgb, var(--card) 78%, transparent)",
        backdropFilter: "blur(20px) saturate(1.4)",
        WebkitBackdropFilter: "blur(20px) saturate(1.4)",
        border: "1px solid color-mix(in srgb, var(--border) 65%, transparent)",
        boxShadow: isDragging
          ? "0 18px 40px -8px rgba(0,0,0,0.55), 0 0 0 2px color-mix(in srgb, var(--primary) 65%, transparent), inset 0 1px 0 color-mix(in srgb, white 8%, transparent)"
          : "0 12px 32px -8px rgba(0,0,0,0.4), 0 0 0 1px color-mix(in srgb, var(--primary) 12%, transparent), inset 0 1px 0 color-mix(in srgb, white 8%, transparent)",
      }}
    >
      <div
        className="flex items-center justify-between px-2.5 py-1.5 border-b transition-colors"
        style={{
          borderColor: "color-mix(in srgb, var(--border) 50%, transparent)",
          background:
            "linear-gradient(90deg, color-mix(in srgb, var(--primary) 18%, transparent) 0%, transparent 70%)",
        }}
      >
        <div className="flex items-center gap-1.5">
          <span
            className={
              "h-1.5 w-1.5 rounded-full bg-primary " +
              (isDragging ? "animate-ping" : "animate-pulse")
            }
          />
          <span className="text-[9px] font-semibold text-foreground/80 uppercase tracking-wider">
            Minimap
          </span>
        </div>
        <span className="text-[9px] text-foreground/70 tabular-nums font-mono px-1.5 py-0.5 rounded bg-background/60 border border-border/40">
          {Math.round(viewport.zoom * 100)}%
        </span>
      </div>
      <div className="relative">
        <svg
          ref={svgRef}
          width="190"
          height="100"
          role="application"
          aria-label="Minimapa — arraste para navegar o canvas"
          tabIndex={0}
          className="minimap-svg block focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary/80"
          style={{
            cursor: isDragging ? "grabbing" : "grab",
            touchAction: "none",
            userSelect: "none",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={handleKeyDown}
        >
          {/* Subtle inner background gradient + viewport glow filter definition */}
          <defs>
            <radialGradient id="minimap-bg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.04" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <filter
              id="minimap-viewport-glow"
              x="-25%"
              y="-25%"
              width="150%"
              height="150%"
            >
              {/* Brighter, wider glow while dragging for "active" affordance */}
              <feGaussianBlur
                in="SourceGraphic"
                stdDeviation={isDragging ? 3.5 : 2.5}
                result="blur"
              />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect width="190" height="100" fill="url(#minimap-bg)" />

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
                style={{ pointerEvents: "none" }}
              />
            );
          })}

          {/* nodes as small rectangles — larger ones show the first letter of the title */}
          {nodes.map((n) => {
            const nx = (n.x - bounds.minX) * scale;
            const ny = (n.y - bounds.minY) * scale;
            const nw = Math.max(n.width * scale, 3);
            const nh = Math.max(n.height * scale, 3);
            const kindMeta = NODE_KIND_META[n.kind as keyof typeof NODE_KIND_META];
            const color = n.color || (autoColorsEnabled ? kindMeta?.color : "var(--primary)");
            const showInitial = nw >= 16 && nh >= 12 && n.title && n.title.length > 0;
            const initial = showInitial ? n.title.charAt(0).toUpperCase() : "";
            const fontSize = Math.min(Math.max(Math.min(nw, nh) * 0.5, 6), 11);
            return (
              <g key={n.id} style={{ pointerEvents: "none" }}>
                <rect
                  x={nx}
                  y={ny}
                  width={nw}
                  height={nh}
                  rx={1.5}
                  fill={color}
                  opacity={0.7}
                  stroke={color}
                  strokeWidth={0.6}
                />
                {/* Subtle inner border for definition */}
                <rect
                  x={nx + 0.5}
                  y={ny + 0.5}
                  width={Math.max(nw - 1, 0.5)}
                  height={Math.max(nh - 1, 0.5)}
                  rx={1}
                  fill="none"
                  stroke="rgba(255,255,255,0.45)"
                  strokeWidth={0.4}
                />
                {showInitial && (
                  <text
                    x={nx + nw / 2}
                    y={ny + nh / 2 + fontSize / 3}
                    textAnchor="middle"
                    fontSize={fontSize}
                    fontWeight={700}
                    fill="white"
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {initial}
                  </text>
                )}
              </g>
            );
          })}

          {/* viewport indicator — thicker stroke + brighter glow while dragging */}
          <g filter="url(#minimap-viewport-glow)" style={{ pointerEvents: "none" }}>
            <rect
              x={viewportIndicator.vx}
              y={viewportIndicator.vy}
              width={viewportIndicator.vw}
              height={viewportIndicator.vh}
              rx={2}
              fill={
                isDragging
                  ? "color-mix(in srgb, var(--primary) 22%, transparent)"
                  : "color-mix(in srgb, var(--primary) 12%, transparent)"
              }
              stroke="var(--primary)"
              strokeWidth={isDragging ? 2.2 : 1.5}
              opacity={isDragging ? 1 : 0.95}
            />
            {/* L-shaped corner accents at each viewport corner */}
            {viewportIndicator.corners.map((c, i) => (
              <g
                key={i}
                stroke="var(--primary)"
                strokeWidth={isDragging ? 2.4 : 1.8}
                strokeLinecap="round"
                fill="none"
              >
                {/* horizontal arm */}
                <line
                  x1={c.cx}
                  y1={c.cy}
                  x2={c.cx + c.dx * viewportIndicator.armLen}
                  y2={c.cy}
                />
                {/* vertical arm */}
                <line
                  x1={c.cx}
                  y1={c.cy}
                  x2={c.cx}
                  y2={c.cy + c.dy * viewportIndicator.armLen}
                />
              </g>
            ))}
          </g>
        </svg>

        {/* Small hint label that fades in while dragging */}
        {isDragging && (
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-primary-foreground"
            style={{
              background: "color-mix(in srgb, var(--primary) 85%, transparent)",
              boxShadow: "0 4px 12px -2px rgba(0,0,0,0.4)",
            }}
          >
            Navegando
          </div>
        )}
      </div>
    </div>
  );
}
