"use client";

import { memo, useMemo } from "react";
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

function EdgesComponent({ nodes, edges, connectingFrom, cursorWorld }: Props) {
  const selectEdge = useMindMapStore((s) => s.selectEdge);
  const selectedEdgeIds = useMindMapStore((s) => s.selectedEdgeIds);
  const deleteEdge = useMindMapStore((s) => s.deleteEdge);
  const showLabels = useSettingsStore((s) => s.settings.visual.edgeLabels);
  const antialias = useSettingsStore((s) => s.settings.performance.antialiasing);

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
        return {
          id: e.id,
          d: bez(sx, sy, tx, ty),
          mx: (sx + tx) / 2,
          my: (sy + ty) / 2,
          color: meta.color,
          dash: meta.dash === "none" ? undefined : meta.dash,
          label: showLabels ? (e.label || meta.label) : (e.label || null),
          selected: selectedEdgeIds.includes(e.id),
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      d: string;
      mx: number;
      my: number;
      color: string;
      dash?: string;
      label: string | null;
      selected: boolean;
    }>;
  }, [edges, nodeMap, showLabels, selectedEdgeIds]);

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
              deleteEdge(p.id);
            }}
          />
          <path
            d={p.d}
            fill="none"
            stroke={p.color}
            strokeWidth={p.selected ? 3 : 1.8}
            strokeDasharray={p.dash}
            strokeLinecap="round"
            opacity={p.selected ? 1 : 0.55}
            style={{ transition: "stroke-width 0.12s ease, opacity 0.12s ease" }}
          />
          {p.label && (
            <g>
              <rect
                x={p.mx - (p.label.length * 3.4 + 8)}
                y={p.my - 9}
                width={p.label.length * 6.8 + 16}
                height={18}
                rx={9}
                fill="var(--node-bg)"
                stroke="var(--node-border)"
                strokeWidth={1}
                opacity={0.92}
              />
              <text
                x={p.mx}
                y={p.my + 3.5}
                textAnchor="middle"
                fontSize={10}
                fill={p.color}
                fontWeight={600}
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {p.label}
              </text>
            </g>
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
