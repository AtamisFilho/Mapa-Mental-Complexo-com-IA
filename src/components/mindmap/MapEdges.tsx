"use client";

import { memo, useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useMindMapStore } from "@/store/mindmap-store";
import { useSettingsStore } from "@/store/settings-store";
import { EDGE_KIND_META } from "@/lib/settings";
import type { MapNode, MapEdge } from "@/lib/types";

interface Props {
  nodes: MapNode[];
  edges: MapEdge[];
  connectingFrom: string | null;
  cursorWorld: { x: number; y: number } | null;
}

function bez(sx: number, sy: number, tx: number, ty: number) {
  const dx = tx - sx;
  const mid = sx + dx * 0.5;
  return `M ${sx} ${sy} C ${mid} ${sy}, ${mid} ${ty}, ${tx} ${ty}`;
}

/**
 * Compute the intersection point of a line from (sx,sy) to (tx,ty) with the
 * border of a rectangle centered at (tx,ty) with the given half-width /
 * half-height. Returns the point ON the rectangle's edge so an arrowhead
 * drawn there sits just outside the node instead of being hidden behind it.
 *
 * We trace the line backwards from the target center toward the source and
 * find the first border it crosses (Liang-Barsky style clipping).
 */
function edgeBorderPoint(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  halfW: number,
  halfH: number,
  inset = 2
) {
  const dx = sx - tx;
  const dy = sy - ty;
  if (dx === 0 && dy === 0) return { x: tx, y: ty };
  // Scale factors to reach each border from the center.
  const scaleX = dx !== 0 ? (halfW - inset) / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? (halfH - inset) / Math.abs(dy) : Infinity;
  const s = Math.min(scaleX, scaleY);
  return { x: tx + dx * s, y: ty + dy * s };
}

/** Compute the intersection of the SOURCE side too, so the bezier starts at
 *  the source node's border rather than its center (cleaner visual). */
function sourceBorderPoint(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  halfW: number,
  halfH: number,
  inset = 2
) {
  const dx = tx - sx;
  const dy = ty - sy;
  if (dx === 0 && dy === 0) return { x: sx, y: sy };
  const scaleX = dx !== 0 ? (halfW - inset) / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? (halfH - inset) / Math.abs(dy) : Infinity;
  const s = Math.min(scaleX, scaleY);
  return { x: sx + dx * s, y: sy + dy * s };
}

// Compute tangent angle at the end of the bezier curve (for arrowhead direction)
// For cubic bezier M sx,sy C mid,sy mid,ty tx,ty:
// The tangent at t=1 is the direction from the last control point (mid, ty) to the endpoint (tx, ty)
function endAngle(sx: number, sy: number, tx: number, ty: number) {
  const mid = sx + (tx - sx) * 0.5;
  const dt = 0.05;
  const t1 = 1 - dt;
  // De Casteljau for cubic bezier
  const p0 = { x: sx, y: sy };
  const p1 = { x: mid, y: sy };
  const p2 = { x: mid, y: ty };
  const p3 = { x: tx, y: ty };
  // Point at t1
  const a = { x: p0.x + (p1.x - p0.x) * t1, y: p0.y + (p1.y - p0.y) * t1 };
  const b = { x: p1.x + (p2.x - p1.x) * t1, y: p1.y + (p2.y - p1.y) * t1 };
  const c = { x: p2.x + (p3.x - p2.x) * t1, y: p2.y + (p3.y - p2.y) * t1 };
  const ab = { x: a.x + (b.x - a.x) * t1, y: a.y + (b.y - a.y) * t1 };
  const bc = { x: b.x + (c.x - b.x) * t1, y: b.y + (c.y - b.y) * t1 };
  const pt = { x: ab.x + (bc.x - ab.x) * t1, y: ab.y + (bc.y - ab.y) * t1 };
  return Math.atan2(ty - pt.y, tx - pt.x);
}

function EdgesComponent({ nodes, edges, connectingFrom, cursorWorld }: Props) {
  const selectEdge = useMindMapStore((s) => s.selectEdge);
  const selectedEdgeIds = useMindMapStore((s) => s.selectedEdgeIds);
  const selectedNodeIds = useMindMapStore((s) => s.selectedNodeIds);
  const deleteEdge = useMindMapStore((s) => s.deleteEdge);
  const updateEdge = useMindMapStore((s) => s.updateEdge);
  const showLabels = useSettingsStore((s) => s.settings.visual.edgeLabels);
  const antialias = useSettingsStore((s) => s.settings.performance.antialiasing);

  // Edge label editing state
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [editingPosition, setEditingPosition] = useState<{ mx: number; my: number } | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [hoveredLabelId, setHoveredLabelId] = useState<string | null>(null);
  // Track if this was a path-double-click that added a default label
  const [pathDoubleClickEdgeId, setPathDoubleClickEdgeId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // When editing starts, focus the input
  useEffect(() => {
    if (editingEdgeId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingEdgeId]);

  const handleLabelDoubleClick = useCallback(
    (edgeId: string, mx: number, my: number, currentLabel: string | null) => {
      // If no label, set a default one first
      if (!currentLabel) {
        updateEdge(edgeId, { label: "nova conexão" });
        setEditingValue("nova conexão");
      } else {
        setEditingValue(currentLabel);
      }
      setEditingEdgeId(edgeId);
      setEditingPosition({ mx, my });
    },
    [updateEdge]
  );

  const handlePathDoubleClick = useCallback(
    (edgeId: string, mx: number, my: number) => {
      // Double-click on edge path: add default label and open editor
      // Remember this was a path-double-click so cancel can remove the default label
      updateEdge(edgeId, { label: "nova conexão" });
      setEditingValue("nova conexão");
      setEditingEdgeId(edgeId);
      setEditingPosition({ mx, my });
      setPathDoubleClickEdgeId(edgeId);
    },
    [updateEdge]
  );

  const handleEditCommit = useCallback(() => {
    if (editingEdgeId) {
      const val = editingValue.trim();
      if (val) {
        updateEdge(editingEdgeId, { label: val });
      } else {
        // Empty label → remove it
        updateEdge(editingEdgeId, { label: null });
      }
    }
    setEditingEdgeId(null);
    setEditingPosition(null);
    setEditingValue("");
    setPathDoubleClickEdgeId(null);
  }, [editingEdgeId, editingValue, updateEdge]);

  const handleEditCancel = useCallback(() => {
    // If we set a default "nova conexão" label on a path-double-click and user cancels,
    // remove that default label (it wasn't there before)
    if (editingEdgeId) {
      const edge = edges.find((e) => e.id === editingEdgeId);
      // Only remove if the label was the default one we just added from handlePathDoubleClick
      // Check if the original edge had no label and we set the default
      if (pathDoubleClickEdgeId === editingEdgeId) {
        updateEdge(editingEdgeId, { label: null });
      }
    }
    setEditingEdgeId(null);
    setEditingPosition(null);
    setEditingValue("");
    setPathDoubleClickEdgeId(null);
  }, [editingEdgeId, edges, updateEdge, pathDoubleClickEdgeId]);

  const selectedNodeSet = useMemo(() => new Set(selectedNodeIds), [selectedNodeIds]);

  const nodeMap = useMemo(() => {
    const m = new Map<string, MapNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  const paths = useMemo(() => {
    return edges
      .map((e) => {
        const s = nodeMap.get(e.sourceId);
        const t = nodeMap.get(e.targetId);
        if (!s || !t) return null;
        const sHalfW = s.width / 2;
        const sHalfH = (s.height ?? 72) / 2;
        const tHalfW = t.width / 2;
        const tHalfH = (t.height ?? 72) / 2;
        // Raw centers
        const scx = s.x + sHalfW;
        const scy = s.y + sHalfH;
        const tcx = t.x + tHalfW;
        const tcy = t.y + tHalfH;
        // Trim the line to each node's border so the arrowhead is visible
        // (previously it was drawn at the target CENTER, hidden behind it).
        const src = sourceBorderPoint(scx, scy, tcx, tcy, sHalfW, sHalfH);
        const dst = edgeBorderPoint(scx, scy, tcx, tcy, tHalfW, tHalfH);
        const sx = src.x;
        const sy = src.y;
        const tx = dst.x;
        const ty = dst.y;
        const meta = EDGE_KIND_META[e.kind as keyof typeof EDGE_KIND_META] ?? EDGE_KIND_META.related;
        const isSelected = selectedEdgeIds.includes(e.id);
        // Edge is "connected to selected node" if either source or target is selected
        const isNodeConnected = selectedNodeSet.has(e.sourceId) || selectedNodeSet.has(e.targetId);
        const angle = endAngle(sx, sy, tx, ty);
        // Arrowhead position: at the trimmed target border point.
        // Size bumped from 7 → 9 for better visibility at lower zoom levels.
        const arrowSize = 9;
        const arrowX = tx;
        const arrowY = ty;
        return {
          id: e.id,
          sourceId: e.sourceId,
          targetId: e.targetId,
          d: bez(sx, sy, tx, ty),
          mx: (sx + tx) / 2,
          my: (sy + ty) / 2,
          sx,
          sy,
          tx,
          ty,
          color: meta.color,
          dash: meta.dash === "none" ? undefined : meta.dash,
          label: showLabels ? (e.label || meta.label) : (e.label || null),
          hasCustomLabel: e.label !== null && e.label !== undefined,
          selected: isSelected,
          isNodeConnected,
          angle,
          arrowX,
          arrowY,
          arrowSize,
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      sourceId: string;
      targetId: string;
      d: string;
      mx: number;
      my: number;
      sx: number;
      sy: number;
      tx: number;
      ty: number;
      color: string;
      dash?: string;
      label: string | null;
      hasCustomLabel: boolean;
      selected: boolean;
      isNodeConnected: boolean;
      angle: number;
      arrowX: number;
      arrowY: number;
      arrowSize: number;
    }>;
  }, [edges, nodeMap, showLabels, selectedEdgeIds, selectedNodeSet]);

  const fromNode = connectingFrom ? nodeMap.get(connectingFrom) : null;
  const fromX = fromNode ? fromNode.x + fromNode.width / 2 : 0;
  const fromY = fromNode ? fromNode.y + (fromNode.height ?? 72) / 2 : 0;
  const tempPath =
    connectingFrom && cursorWorld
      ? bez(fromX, fromY, cursorWorld.x, cursorWorld.y)
      : null;

  return (
    <svg
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: 1,
        height: 1,
        overflow: "visible",
        pointerEvents: "none",
        shapeRendering: antialias ? "geometricPrecision" : "optimizeSpeed",
      }}
    >
      {/* SVG glow filter definition for edges */}
      <defs>
        <filter id="edgeGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="edgeShadowFilter" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="var(--canvas-grid)" floodOpacity="0.3" />
        </filter>
      </defs>

      {paths.map((p) => (
        <g key={p.id} style={{ pointerEvents: "auto", cursor: "pointer" }}>
          {/* wider invisible hit area */}
          <path
            d={p.d}
            fill="none"
            stroke="transparent"
            strokeWidth={16}
            onClick={(e) => {
              e.stopPropagation();
              selectEdge(p.id);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              // Double-click on edge path → add default label and open editor
              handlePathDoubleClick(p.id, p.mx, p.my);
            }}
          />
          {/* Glow/shadow for better visibility on dark backgrounds */}
          {p.selected && (
            <path
              d={p.d}
              fill="none"
              stroke={p.color}
              strokeWidth={6}
              strokeLinecap="round"
              opacity={0.2}
              filter="url(#edgeGlowFilter)"
            />
          )}
          {p.isNodeConnected && !p.selected && (
            <path
              d={p.d}
              fill="none"
              stroke={p.color}
              strokeWidth={4}
              strokeLinecap="round"
              opacity={0.15}
              filter="url(#edgeShadowFilter)"
            />
          )}
          {/* Main edge stroke */}
          <path
            d={p.d}
            fill="none"
            stroke={p.color}
            strokeWidth={p.selected ? 3.5 : 2.8}
            strokeDasharray={p.dash}
            strokeLinecap="round"
            opacity={p.selected ? 1 : p.isNodeConnected ? 0.95 : 0.85}
            className={p.selected ? "edge-animated-dash" : undefined}
            style={{ transition: "stroke-width 0.15s ease, opacity 0.15s ease" }}
          />
          {/* Arrowhead indicator at target end — drawn AFTER the path so it
              sits on top, with a subtle white stroke for contrast against
              any background. */}
          <polygon
            points={(() => {
              const s = p.arrowSize;
              const a = p.angle;
              const tipX = p.arrowX;
              const tipY = p.arrowY;
              // Triangle pointing toward the target
              const p1x = tipX - s * Math.cos(a - Math.PI / 6);
              const p1y = tipY - s * Math.sin(a - Math.PI / 6);
              const p2x = tipX - s * Math.cos(a + Math.PI / 6);
              const p2y = tipY - s * Math.sin(a + Math.PI / 6);
              return `${tipX},${tipY} ${p1x},${p1y} ${p2x},${p2y}`;
            })()}
            fill={p.color}
            stroke="white"
            strokeWidth={0.5}
            strokeOpacity={0.6}
            opacity={p.selected ? 1 : p.isNodeConnected ? 0.95 : 0.85}
            style={{ transition: "opacity 0.15s ease" }}
          />
          {/* Edge label with pill background, hover scale + brighter, contrasting text outline */}
          {p.label && editingEdgeId !== p.id && (
            <g
              style={{ pointerEvents: "auto", cursor: "pointer" }}
              onMouseEnter={() => setHoveredLabelId(p.id)}
              onMouseLeave={() => setHoveredLabelId(null)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                handleLabelDoubleClick(p.id, p.mx, p.my, p.hasCustomLabel ? p.label : null);
              }}
            >
              {(() => {
                const labelLen = p.label.length;
                // Better width estimate: average char width ~7px at 12px font, plus generous padding
                const textW = labelLen * 7 + 20;
                const textH = 22;
                const isLabelHovered = hoveredLabelId === p.id;
                // Semi-transparent edge-color-tinted background + subtle border for the pill
                const pillFill = `${p.color}20`;
                const pillStroke = `${p.color}80`;
                // Outer contrasting outline (white with low opacity — reads on both light and dark)
                const outlineStroke = "rgba(255,255,255,0.85)";
                // Text drop-shadow for readability on busy backgrounds
                const labelOpacity = isLabelHovered ? 1 : p.selected ? 0.98 : 0.92;
                return (
                  <g
                    style={{
                      transition: "transform 0.15s ease, filter 0.15s ease",
                      transformOrigin: `${p.mx}px ${p.my}px`,
                      transform: isLabelHovered ? "scale(1.1)" : "scale(1)",
                      filter: isLabelHovered ? "brightness(1.18)" : "none",
                    }}
                  >
                    <rect
                      x={p.mx - textW / 2}
                      y={p.my - textH / 2}
                      width={textW}
                      height={textH}
                      rx={textH / 2}
                      fill={pillFill}
                      stroke={pillStroke}
                      strokeWidth={1.4}
                      opacity={labelOpacity}
                    />
                    {/* Contrasting outline behind the text for readability on busy backgrounds */}
                    <text
                      x={p.mx}
                      y={p.my + 4}
                      textAnchor="middle"
                      fontSize={12}
                      fill="transparent"
                      stroke={outlineStroke}
                      strokeWidth={2}
                      strokeLinejoin="round"
                      fontWeight={700}
                      style={{
                        pointerEvents: "none",
                        userSelect: "none",
                        filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))",
                      }}
                    >
                      {p.label}
                    </text>
                    {/* Main label text on top */}
                    <text
                      x={p.mx}
                      y={p.my + 4}
                      textAnchor="middle"
                      fontSize={12}
                      fill={p.color}
                      fontWeight={600}
                      style={{
                        pointerEvents: "none",
                        userSelect: "none",
                        filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))",
                      }}
                    >
                      {p.label}
                    </text>
                  </g>
                );
              })()}
              {/* Tooltip hint on hover */}
              {hoveredLabelId === p.id && (
                <g style={{ pointerEvents: "none" }}>
                  {(() => {
                    const tipText = "Clique duplo para editar label";
                    const tipW = tipText.length * 6.5 + 16;
                    const tipH = 20;
                    const tipY = p.my + 18;
                    return (
                      <>
                        <rect
                          x={p.mx - tipW / 2}
                          y={tipY}
                          width={tipW}
                          height={tipH}
                          rx={4}
                          fill="rgba(0,0,0,0.85)"
                          opacity={0.95}
                        />
                        <text
                          x={p.mx}
                          y={tipY + 14}
                          textAnchor="middle"
                          fontSize={10}
                          fill="white"
                          fontWeight={400}
                        >
                          {tipText}
                        </text>
                      </>
                    );
                  })()}
                </g>
              )}
            </g>
          )}
          {/* Inline editing foreignObject */}
          {editingEdgeId === p.id && editingPosition && (
            <foreignObject
              x={editingPosition.mx - 80}
              y={editingPosition.my - 14}
              width={160}
              height={28}
              style={{ pointerEvents: "auto" }}
            >
              <div xmlns="http://www.w3.org/1999/xhtml" style={{ width: "100%", height: "100%", display: "flex", alignItems: "center" }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleEditCommit();
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      handleEditCancel();
                    }
                  }}
                  onBlur={handleEditCommit}
                  style={{
                    width: "100%",
                    height: "22px",
                    fontSize: "12px",
                    fontWeight: 600,
                    background: "var(--node-bg)",
                    border: `1.5px solid ${p.color}`,
                    borderRadius: "6px",
                    padding: "2px 6px",
                    outline: "none",
                    textAlign: "center",
                    color: p.color,
                  }}
                />
              </div>
            </foreignObject>
          )}
        </g>
      ))}
      {tempPath && (
        <path
          d={tempPath}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={2}
          strokeDasharray="5 4"
          opacity={0.7}
        />
      )}
    </svg>
  );
}

export const MapEdges = memo(EdgesComponent);
