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
        const sx = s.x + s.width / 2;
        const sy = s.y + (s.height ?? 72) / 2;
        const tx = t.x + t.width / 2;
        const ty = t.y + (t.height ?? 72) / 2;
        const meta = EDGE_KIND_META[e.kind as keyof typeof EDGE_KIND_META] ?? EDGE_KIND_META.related;
        const isSelected = selectedEdgeIds.includes(e.id);
        // Edge is "connected to selected node" if either source or target is selected
        const isNodeConnected = selectedNodeSet.has(e.sourceId) || selectedNodeSet.has(e.targetId);
        const angle = endAngle(sx, sy, tx, ty);
        // Arrowhead position: slightly before the target center
        const arrowSize = 6;
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
            strokeWidth={p.selected ? 3.5 : 2.4}
            strokeDasharray={p.dash}
            strokeLinecap="round"
            opacity={p.selected ? 1 : p.isNodeConnected ? 0.9 : 0.8}
            className={p.selected ? "edge-animated-dash" : undefined}
            style={{ transition: "stroke-width 0.15s ease, opacity 0.15s ease" }}
          />
          {/* Arrowhead indicator at target end */}
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
            opacity={p.selected ? 1 : p.isNodeConnected ? 0.7 : 0.5}
            style={{ transition: "opacity 0.15s ease" }}
          />
          {/* Edge label with improved background and sizing */}
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
              {/* Measure text width more accurately: use per-character estimate with padding */}
              {(() => {
                const labelLen = p.label.length;
                // Better width estimate: average char width ~7px at 12px font, plus generous padding
                const textW = labelLen * 7 + 20;
                const textH = 22;
                return (
                  <>
                    <rect
                      x={p.mx - textW / 2}
                      y={p.my - textH / 2}
                      width={textW}
                      height={textH}
                      rx={textH / 2}
                      fill="var(--node-bg)"
                      stroke={p.color}
                      strokeWidth={1.4}
                      opacity={p.selected ? 0.98 : 0.92}
                    />
                    <text
                      x={p.mx}
                      y={p.my + 4}
                      textAnchor="middle"
                      fontSize={12}
                      fill={p.color}
                      fontWeight={600}
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {p.label}
                    </text>
                  </>
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
