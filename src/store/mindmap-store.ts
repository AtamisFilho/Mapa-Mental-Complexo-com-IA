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
import type { SubtreeTemplateNode } from "@/lib/subtree-templates";

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

  // reparent (Task 16-B)
  reparentTargetId: string | null;
  draggedNodeId: string | null;

  // search (Task 15-B)
  searchQuery: string;
  searchMatches: string[]; // nodeIds that match the current query
  highlightedMatchId: string | null;

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

  // subtree templates (Task 15-C)
  insertSubtree: (
    template: SubtreeTemplateNode,
    position: { x: number; y: number },
    parentId?: string | null
  ) => string;

  // history
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // reparent actions (Task 16-B)
  setReparentTarget: (id: string | null) => void;
  setDraggedNode: (id: string | null) => void;
  reparentNode: (nodeId: string, newParentId: string) => boolean;
  isDescendantOf: (nodeId: string, potentialAncestorId: string) => boolean;

  // search actions (Task 15-B)
  setSearchQuery: (q: string) => void;
  setSearchMatches: (ids: string[]) => void;
  setHighlightedMatch: (id: string | null) => void;
  searchNodes: (
    query: string,
    opts?: { caseSensitive?: boolean; titleOnly?: boolean }
  ) => string[];
  replaceInNode: (
    nodeId: string,
    search: string,
    replacement: string,
    opts?: { caseSensitive?: boolean }
  ) => number;
  replaceAll: (
    search: string,
    replacement: string,
    opts?: { caseSensitive?: boolean }
  ) => number;
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

  // reparent (Task 16-B)
  reparentTargetId: null,
  draggedNodeId: null,

  // search (Task 15-B)
  searchQuery: "",
  searchMatches: [],
  highlightedMatchId: null,

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
      // reset search state on map switch (Task 15-B)
      searchQuery: "",
      searchMatches: [],
      highlightedMatchId: null,
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

  insertSubtree: (template, position, parentId) => {
    // Push current state to history so the insertion is undoable as a single step
    get().pushHistory();

    // Tree layout: root at `position`. Children are indented horizontally by
    // 200px and stacked vertically with 60px spacing. Each child's subtree is
    // placed below the previous sibling's subtree (so siblings don't overlap).
    const NODE_HEIGHT = 80;
    const NODE_WIDTH = 200;
    const VERTICAL_GAP = 60;
    const HORIZONTAL_INDENT = 200;

    const addNode = get().addNode;
    const addEdge = get().addEdge;

    // Recursive helper — returns the y-coordinate of the BOTTOM of the inserted
    // subtree (so the next sibling can be placed below without overlap).
    const buildSubtree = (
      node: SubtreeTemplateNode,
      x: number,
      y: number,
      parent: string | null
    ): number => {
      const id = addNode({
        title: node.title,
        kind: node.kind,
        content: node.content,
        note: node.note,
        icon: node.icon,
        x,
        y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        parentId: parent,
      });
      if (parent) {
        addEdge(parent, id);
      }

      let bottomY = y + NODE_HEIGHT;
      const kids = node.children;
      if (kids && kids.length > 0) {
        let childY = y + NODE_HEIGHT + VERTICAL_GAP;
        for (const child of kids) {
          const childBottom = buildSubtree(
            child,
            x + HORIZONTAL_INDENT,
            childY,
            id
          );
          childY = childBottom + VERTICAL_GAP;
          if (childBottom > bottomY) bottomY = childBottom;
        }
      }
      return bottomY;
    };

    const rootId = addNode({
      title: template.title,
      kind: template.kind,
      content: template.content,
      note: template.note,
      icon: template.icon,
      x: position.x,
      y: position.y,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      parentId: parentId ?? null,
    });
    if (parentId) {
      addEdge(parentId, rootId);
    }

    // Lay out the root's children beneath it
    const kids = template.children;
    if (kids && kids.length > 0) {
      let childY = position.y + NODE_HEIGHT + VERTICAL_GAP;
      for (const child of kids) {
        const childBottom = buildSubtree(
          child,
          position.x + HORIZONTAL_INDENT,
          childY,
          rootId
        );
        childY = childBottom + VERTICAL_GAP;
      }
    }

    // Select the new root so the user can immediately interact with it
    set({ selectedNodeIds: [rootId], selectedEdgeIds: [], dirty: true });
    return rootId;
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

  // ── Reparent (Task 16-B) ──────────────────────────────────────────────
  setReparentTarget: (id) => set({ reparentTargetId: id }),
  setDraggedNode: (id) => set({ draggedNodeId: id }),

  isDescendantOf: (nodeId, potentialAncestorId) => {
    // Check if `nodeId` is a descendant of `potentialAncestorId` by traversing
    // edges downward. Returns true if the node is in the subtree of the ancestor,
    // which would create a cycle if we reparented the ancestor under the node.
    const { edges } = get();
    // Build children map (source → targets)
    const childrenOf = new Map<string, string[]>();
    for (const e of edges) {
      if (!childrenOf.has(e.sourceId)) childrenOf.set(e.sourceId, []);
      childrenOf.get(e.sourceId)!.push(e.targetId);
    }
    // BFS from potentialAncestorId
    const visited = new Set<string>();
    const queue = [potentialAncestorId];
    while (queue.length) {
      const cur = queue.shift()!;
      if (cur === nodeId) return true; // nodeId is a descendant
      if (visited.has(cur)) continue;
      visited.add(cur);
      for (const child of childrenOf.get(cur) ?? []) {
        if (!visited.has(child)) queue.push(child);
      }
    }
    return false;
  },

  reparentNode: (nodeId, newParentId) => {
    // Cannot reparent to self
    if (nodeId === newParentId) return false;
    // Cannot reparent to own descendant (would create cycle)
    if (get().isDescendantOf(newParentId, nodeId)) return false;

    // Note: pushHistory() is NOT called here because the caller
    // (handleNodePointerDown in MindMapCanvas) already pushes history
    // before the drag starts, which captures the initial state.
    // The reparent + position changes should be undoable as a single step.

    // Find the old parent edge (where targetId === nodeId)
    const oldEdge = get().edges.find((e) => e.targetId === nodeId);
    const oldEdgeKind = oldEdge?.kind ?? "related";

    // Delete old parent edge if exists
    if (oldEdge) {
      get().deleteEdge(oldEdge.id);
    }

    // Create new edge from newParentId to nodeId
    get().addEdge(newParentId, nodeId, oldEdgeKind as EdgeKind);

    // Optionally reposition node near its new parent (+200px right, +60px below)
    const newParent = get().nodes.find((n) => n.id === newParentId);
    if (newParent) {
      const draggedNode = get().nodes.find((n) => n.id === nodeId);
      if (draggedNode) {
        // Check if there are already children of the new parent at that position
        // and offset further to avoid overlap
        const childrenOfNewParent = get().edges
          .filter((e) => e.sourceId === newParentId && e.targetId !== nodeId)
          .map((e) => get().nodes.find((n) => n.id === e.targetId));
        // Calculate y offset — stack below existing children
        let yOffset = 60;
        for (const child of childrenOfNewParent) {
          if (child) {
            yOffset = Math.max(yOffset, child.y - newParent.y + child.height + 60);
          }
        }
        get().updateNode(nodeId, {
          x: newParent.x + newParent.width + 200,
          y: newParent.y + yOffset,
        });
      }
    }

    // Clear reparent state
    set({ reparentTargetId: null, draggedNodeId: null });
    return true;
  },

  // ── Search & Replace (Task 15-B) ─────────────────────────────────────
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSearchMatches: (ids) => set({ searchMatches: ids }),
  setHighlightedMatch: (id) => set({ highlightedMatchId: id }),

  searchNodes: (query, opts) => {
    const caseSensitive = opts?.caseSensitive ?? false;
    const titleOnly = opts?.titleOnly ?? false;
    const q = caseSensitive ? query : query.toLowerCase();
    if (!query.trim()) {
      set({ searchQuery: query, searchMatches: [], highlightedMatchId: null });
      return [];
    }
    const nodes = get().nodes;
    const matched = nodes
      .filter((n) => {
        const title = caseSensitive ? n.title : n.title.toLowerCase();
        if (title.includes(q)) return true;
        if (titleOnly) return false;
        const content = caseSensitive ? (n.content ?? "") : (n.content ?? "").toLowerCase();
        const note = caseSensitive ? (n.note ?? "") : (n.note ?? "").toLowerCase();
        return content.includes(q) || note.includes(q);
      })
      .map((n) => n.id);
    set({
      searchQuery: query,
      searchMatches: matched,
      highlightedMatchId: matched.length > 0 ? matched[0] : null,
    });
    return matched;
  },

  replaceInNode: (nodeId, search, replacement, opts) => {
    const caseSensitive = opts?.caseSensitive ?? false;
    if (!search) return 0;
    const node = get().nodes.find((n) => n.id === nodeId);
    if (!node) return 0;
    // Build a case-sensitive or case-insensitive regex; escape regex special chars.
    const flags = caseSensitive ? "g" : "gi";
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, flags);
    let count = 0;
    const patch: Partial<MapNode> = {};
    if (node.title) {
      const matches = node.title.match(re);
      if (matches && matches.length > 0) {
        patch.title = node.title.replace(re, replacement);
        count += matches.length;
      }
    }
    if (node.content) {
      const matches = node.content.match(re);
      if (matches && matches.length > 0) {
        patch.content = node.content.replace(re, replacement);
        count += matches.length;
      }
    }
    if (count > 0) {
      get().pushHistory();
      get().updateNode(nodeId, patch);
    }
    return count;
  },

  replaceAll: (search, replacement, opts) => {
    const caseSensitive = opts?.caseSensitive ?? false;
    if (!search) return 0;
    const matchedIds = get().searchMatches;
    if (matchedIds.length === 0) return 0;
    const flags = caseSensitive ? "g" : "gi";
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, flags);
    let total = 0;
    const nodes = get().nodes;
    const updates = new Map<string, Partial<MapNode>>();
    for (const id of matchedIds) {
      const n = nodes.find((x) => x.id === id);
      if (!n) continue;
      const patch: Partial<MapNode> = {};
      if (n.title) {
        const m = n.title.match(re);
        if (m && m.length > 0) {
          patch.title = n.title.replace(re, replacement);
          total += m.length;
        }
      }
      if (n.content) {
        const m = n.content.match(re);
        if (m && m.length > 0) {
          patch.content = n.content.replace(re, replacement);
          total += m.length;
        }
      }
      if (Object.keys(patch).length > 0) {
        updates.set(id, patch);
      }
    }
    if (updates.size > 0) {
      get().pushHistory();
      set((s) => ({
        nodes: s.nodes.map((n) =>
          updates.has(n.id)
            ? { ...n, ...updates.get(n.id)!, updatedAt: new Date().toISOString() }
            : n
        ),
        dirty: true,
      }));
    }
    return total;
  },
}));

// helper exports
export { uid };
export type { NodeKind, EdgeKind };
