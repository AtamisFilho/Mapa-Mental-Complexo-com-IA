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
