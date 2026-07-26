"use client";

import { create } from "zustand";
import type {
  MapNode,
  MapEdge,
  Viewport,
  NodeKind,
  EdgeKind,
  MindMapData,
} from "@/lib/types";

interface HistoryEntry {
  nodes: MapNode[];
  edges: MapEdge[];
}

interface MindMapState {
  // data
  mapId: string | null;
  title: string;
  description: string;
  nodes: MapNode[];
  edges: MapEdge[];
  dirty: boolean;
  saving: boolean;
  lastSavedAt: string | null;

  // view
  viewport: Viewport;
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  hoveredNodeId: string | null;

  // history
  past: HistoryEntry[];
  future: HistoryEntry[];

  // actions: data
  loadMap: (map: MindMapData) => void;
  setMeta: (title: string, description: string) => void;
  addNode: (partial: Partial<MapNode> & { title: string }) => string;
  updateNode: (id: string, patch: Partial<MapNode>) => void;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => string | null;
  addEdge: (sourceId: string, targetId: string, kind?: EdgeKind, label?: string) => void;
  updateEdge: (id: string, patch: Partial<MapEdge>) => void;
  deleteEdge: (id: string) => void;
  setNodes: (nodes: MapNode[]) => void;
  setEdges: (edges: MapEdge[]) => void;
  mergeNodes: (nodes: MapNode[]) => void;
  mergeEdges: (edges: MapEdge[]) => void;
  markSaved: () => void;
  setSaving: (v: boolean) => void;

  // actions: view
  setViewport: (vp: Viewport) => void;
  panBy: (dx: number, dy: number) => void;
  zoomBy: (factor: number, cx?: number, cy?: number) => void;
  resetViewport: () => void;
  selectNode: (id: string, additive?: boolean) => void;
  selectEdge: (id: string) => void;
  clearSelection: () => void;
  setHovered: (id: string | null) => void;
  focusNode: (id: string) => void;
  fitToView: (padding?: number) => void;
  toggleCollapse: (id: string) => void;
  organizeLayout: () => void;

  // history
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
}

let idCounter = 0;
const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;

export const useMindMapStore = create<MindMapState>((set, get) => ({
  mapId: null,
  title: "Novo Mapa Mental",
  description: "",
  nodes: [],
  edges: [],
  dirty: false,
  saving: false,
  lastSavedAt: null,

  viewport: { x: 0, y: 0, zoom: 1 },
  selectedNodeIds: [],
  selectedEdgeIds: [],
  hoveredNodeId: null,

  past: [],
  future: [],

  loadMap: (map) =>
    set({
      mapId: map.id,
      title: map.title,
      description: map.description ?? "",
      nodes: map.nodes,
      edges: map.edges,
      dirty: false,
      saving: false,
      lastSavedAt: map.updatedAt ?? new Date().toISOString(),
      past: [],
      future: [],
      selectedNodeIds: [],
      selectedEdgeIds: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    }),

  setMeta: (title, description) =>
    set((s) => ({ title, description, dirty: true })),

  addNode: (partial) => {
    const id = partial.id ?? uid("n");
    const node: MapNode = {
      id,
      mapId: get().mapId ?? "",
      parentId: partial.parentId ?? null,
      title: partial.title,
      content: partial.content ?? null,
      note: partial.note ?? null,
      kind: partial.kind ?? "concept",
      color: partial.color ?? null,
      icon: partial.icon ?? null,
      image: partial.image ?? null,
      x: partial.x ?? 0,
      y: partial.y ?? 0,
      width: partial.width ?? 200,
      height: partial.height ?? 80,
      collapsed: partial.collapsed ?? false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((s) => ({ nodes: [...s.nodes, node], dirty: true }));
    return id;
  },

  updateNode: (id, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n
      ),
      dirty: true,
    })),

  deleteNode: (id) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.sourceId !== id && e.targetId !== id),
      selectedNodeIds: s.selectedNodeIds.filter((sid) => sid !== id),
      dirty: true,
    })),

  duplicateNode: (id) => {
    const src = get().nodes.find((n) => n.id === id);
    if (!src) return null;
    const newId = uid("n");
    const copy: MapNode = {
      ...src,
      id: newId,
      x: src.x + 32,
      y: src.y + 32,
      title: `${src.title} (cópia)`,
      collapsed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((s) => ({
      nodes: [...s.nodes, copy],
      selectedNodeIds: [newId],
      dirty: true,
    }));
    return newId;
  },

  addEdge: (sourceId, targetId, kind = "related", label) => {
    // avoid duplicates / self-loops
    if (sourceId === targetId) return;
    const exists = get().edges.some(
      (e) =>
        (e.sourceId === sourceId && e.targetId === targetId) ||
        (e.sourceId === targetId && e.targetId === sourceId)
    );
    if (exists) return;
    const edge: MapEdge = {
      id: uid("e"),
      mapId: get().mapId ?? "",
      sourceId,
      targetId,
      kind,
      label: label ?? null,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ edges: [...s.edges, edge], dirty: true }));
  },

  updateEdge: (id, patch) =>
    set((s) => ({
      edges: s.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      dirty: true,
    })),

  deleteEdge: (id) =>
    set((s) => ({
      edges: s.edges.filter((e) => e.id !== id),
      selectedEdgeIds: s.selectedEdgeIds.filter((sid) => sid !== id),
      dirty: true,
    })),

  setNodes: (nodes) => set({ nodes, dirty: true }),
  setEdges: (edges) => set({ edges, dirty: true }),

  mergeNodes: (incoming) =>
    set((s) => {
      const byId = new Map(s.nodes.map((n) => [n.id, n]));
      for (const n of incoming) byId.set(n.id, n);
      return { nodes: Array.from(byId.values()), dirty: true };
    }),

  mergeEdges: (incoming) =>
    set((s) => {
      const byId = new Map(s.edges.map((e) => [e.id, e]));
      for (const e of incoming) byId.set(e.id, e);
      return { edges: Array.from(byId.values()), dirty: true };
    }),

  markSaved: () =>
    set({ dirty: false, lastSavedAt: new Date().toISOString(), saving: false }),
  setSaving: (v) => set({ saving: v }),

  setViewport: (vp) => set({ viewport: vp }),
  panBy: (dx, dy) =>
    set((s) => ({
      viewport: { ...s.viewport, x: s.viewport.x + dx, y: s.viewport.y + dy },
    })),
  zoomBy: (factor, cx, cy) =>
    set((s) => {
      const newZoom = Math.min(2.5, Math.max(0.2, s.viewport.zoom * factor));
      const realFactor = newZoom / s.viewport.zoom;
      // zoom toward cursor if provided
      if (cx !== undefined && cy !== undefined) {
        const nx = cx - (cx - s.viewport.x) * realFactor;
        const ny = cy - (cy - s.viewport.y) * realFactor;
        return { viewport: { x: nx, y: ny, zoom: newZoom } };
      }
      return { viewport: { ...s.viewport, zoom: newZoom } };
    }),
  resetViewport: () => set({ viewport: { x: 0, y: 0, zoom: 1 } }),

  selectNode: (id, additive) =>
    set((s) => ({
      selectedNodeIds: additive
        ? s.selectedNodeIds.includes(id)
          ? s.selectedNodeIds.filter((x) => x !== id)
          : [...s.selectedNodeIds, id]
        : [id],
      selectedEdgeIds: [],
    })),

  selectEdge: (id) =>
    set({ selectedEdgeIds: [id], selectedNodeIds: [] }),

  clearSelection: () => set({ selectedNodeIds: [], selectedEdgeIds: [] }),

  setHovered: (id) => set({ hoveredNodeId: id }),

  focusNode: (id) => {
    const node = get().nodes.find((n) => n.id === id);
    if (!node) return;
    // center on node
    const cx = typeof window !== "undefined" ? window.innerWidth / 2 : 600;
    const cy = typeof window !== "undefined" ? window.innerHeight / 2 : 400;
    set({
      viewport: {
        x: cx - (node.x + node.width / 2),
        y: cy - (node.y + node.height / 2),
        zoom: 1,
      },
      selectedNodeIds: [id],
    });
  },

  fitToView: (padding = 60) => {
    const nodes = get().nodes;
    if (nodes.length === 0) {
      set({ viewport: { x: 0, y: 0, zoom: 1 } });
      return;
    }
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const x2s = nodes.map((n) => n.x + n.width);
    const y2s = nodes.map((n) => n.y + n.height);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...x2s);
    const maxY = Math.max(...y2s);
    const contentW = Math.max(1, maxX - minX);
    const contentH = Math.max(1, maxY - minY);
    const winW = typeof window !== "undefined" ? window.innerWidth : 1200;
    const winH = typeof window !== "undefined" ? window.innerHeight : 700;
    // Layout: toolbar (~44) on top, status (~28) + footer (~32) on bottom
    const toolbarH = 44;
    const bottomH = 60;
    const canvasTop = toolbarH;
    const canvasH = Math.max(200, winH - toolbarH - bottomH);
    const canvasCenterY = canvasTop + canvasH / 2;
    const availW = Math.max(200, winW - padding * 2);
    const availH = Math.max(150, canvasH - padding * 2);
    // Compute zoom but clamp so it stays readable
    const rawZoom = Math.min(availW / contentW, availH / contentH);
    const zoom = Math.min(2, Math.max(0.35, rawZoom));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    set({
      viewport: {
        x: winW / 2 - cx * zoom,
        y: canvasCenterY - cy * zoom,
        zoom,
      },
    });
  },

  toggleCollapse: (id) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, collapsed: !n.collapsed } : n
      ),
      dirty: true,
    })),

  organizeLayout: () => {
    const { nodes, edges } = get();
    if (nodes.length === 0) return;
    // Simple collision avoidance + radial layout
    // 1. Find roots (nodes with no incoming edges)
    const incoming = new Set(edges.map((e) => e.targetId));
    const roots = nodes.filter((n) => !incoming.has(n.id));
    const rootId = roots.length > 0 ? roots[0].id : nodes[0].id;
    // 2. Build parent-child map
    const childrenOf = new Map<string, string[]>();
    for (const e of edges) {
      if (!childrenOf.has(e.sourceId)) childrenOf.set(e.sourceId, []);
      childrenOf.get(e.sourceId)!.push(e.targetId);
    }
    // 3. BFS to assign depth levels
    const depthMap = new Map<string, number>();
    const queue: Array<{ id: string; depth: number }> = [{ id: rootId, depth: 0 }];
    const visited = new Set<string>();
    while (queue.length) {
      const { id, depth } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      depthMap.set(id, depth);
      for (const child of childrenOf.get(id) ?? []) {
        if (!visited.has(child)) queue.push({ id: child, depth: depth + 1 });
      }
    }
    // Assign depth 0 to unvisited nodes
    for (const n of nodes) {
      if (!depthMap.has(n.id)) depthMap.set(n.id, 0);
    }
    // 4. Compute positions by depth level with radial spread
    const maxDepth = Math.max(...Array.from(depthMap.values()));
    const ringRadii = [0, 260, 460, 620, 760, 900, 1040];
    const centerX = 400;
    const centerY = 300;
    // Group nodes by depth
    const byDepth = new Map<number, string[]>();
    for (const [id, d] of depthMap) {
      if (!byDepth.has(d)) byDepth.set(d, []);
      byDepth.get(d)!.push(id);
    }
    const newPositions = new Map<string, { x: number; y: number }>();
    for (const [d, ids] of byDepth) {
      const radius = d === 0 ? 0 : (ringRadii[d] ?? ringRadii[ringRadii.length - 1] + (d - ringRadii.length + 1) * 140);
      const angleStep = (2 * Math.PI) / Math.max(ids.length, 1);
      const startAngle = d === 0 ? 0 : -Math.PI / 2;
      for (let i = 0; i < ids.length; i++) {
        const angle = startAngle + i * angleStep;
        const node = nodes.find((n) => n.id === ids[i]);
        const w = node?.width ?? 220;
        const h = node?.height ?? 88;
        newPositions.set(ids[i], {
          x: centerX + Math.cos(angle) * radius - w / 2,
          y: centerY + Math.sin(angle) * radius - h / 2,
        });
      }
    }
    // 5. Simple collision resolution: push overlapping nodes apart
    const iterations = 3;
    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < nodes.length; i++) {
        const posA = newPositions.get(nodes[i].id) ?? { x: nodes[i].x, y: nodes[i].y };
        for (let j = i + 1; j < nodes.length; j++) {
          const posB = newPositions.get(nodes[j].id) ?? { x: nodes[j].x, y: nodes[j].y };
          const wA = nodes[i].width + 20; // padding
          const hA = nodes[i].height + 20;
          const wB = nodes[j].width + 20;
          const hB = nodes[j].height + 20;
          const overlapX = (wA / 2 + wB / 2) - Math.abs(posA.x + nodes[i].width / 2 - posB.x + nodes[j].width / 2);
          const overlapY = (hA / 2 + hB / 2) - Math.abs(posA.y + nodes[i].height / 2 - posB.y + nodes[j].height / 2);
          if (overlapX > 0 && overlapY > 0) {
            // Push apart along the axis with less overlap
            const push = overlapX < overlapY ? overlapX / 2 : overlapY / 2;
            const dirX = posA.x + nodes[i].width / 2 < posB.x + nodes[j].width / 2 ? -1 : 1;
            const dirY = posA.y + nodes[i].height / 2 < posB.y + nodes[j].height / 2 ? -1 : 1;
            if (overlapX < overlapY) {
              newPositions.set(nodes[i].id, { ...posA, x: posA.x + dirX * push });
              newPositions.set(nodes[j].id, { ...posB, x: posB.x - dirX * push });
            } else {
              newPositions.set(nodes[i].id, { ...posA, y: posA.y + dirY * push });
              newPositions.set(nodes[j].id, { ...posB, y: posB.y - dirY * push });
            }
          }
        }
      }
    }
    // 6. Apply new positions
    const updated = nodes.map((n) => {
      const pos = newPositions.get(n.id);
      return pos ? { ...n, x: pos.x, y: pos.y, updatedAt: new Date().toISOString() } : n;
    });
    set({ nodes: updated, dirty: true });
  },

  pushHistory: () =>
    set((s) => {
      const entry: HistoryEntry = { nodes: s.nodes, edges: s.edges };
      const past = [...s.past, entry].slice(-50);
      return { past, future: [] };
    }),

  undo: () =>
    set((s) => {
      if (s.past.length === 0) return {};
      const previous = s.past[s.past.length - 1];
      const current: HistoryEntry = { nodes: s.nodes, edges: s.edges };
      return {
        past: s.past.slice(0, -1),
        future: [current, ...s.future].slice(0, 50),
        nodes: previous.nodes,
        edges: previous.edges,
        dirty: true,
      };
    }),

  redo: () =>
    set((s) => {
      if (s.future.length === 0) return {};
      const next = s.future[0];
      const current: HistoryEntry = { nodes: s.nodes, edges: s.edges };
      return {
        past: [...s.past, current].slice(-50),
        future: s.future.slice(1),
        nodes: next.nodes,
        edges: next.edges,
        dirty: true,
      };
    }),
}));

// helper exports
export { uid };
export type { NodeKind, EdgeKind };
