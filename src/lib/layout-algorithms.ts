// Auto-layout algorithms for mind maps.
// Each function takes the current nodes + edges and returns new positions
// for every node (without mutating the input).
//
// Layouts supported:
//   1. tree-horizontal — root on left, children spread to the right
//   2. tree-vertical   — root on top, children below (org-chart style)
//   3. radial          — root at center, children in concentric rings
//   4. organic         — simplified force-directed layout
//
// All algorithms handle:
//   - Empty node list → []
//   - Single node → [{ id, x: 0, y: 0 }]
//   - Disconnected components → laid out separately and stacked
//   - Cyclic edges → back-edges ignored during traversal

import type { MapNode, MapEdge } from "./types";

export type LayoutType =
  | "tree-horizontal"
  | "tree-vertical"
  | "radial"
  | "organic";

export interface LayoutResult {
  id: string;
  x: number;
  y: number;
}

// ── Helpers ──────────────────────────────────────────

// Find root nodes (no incoming edges). If the graph is cyclic (no roots),
// fall back to the first node so the layout still produces something.
function findRoots(nodes: MapNode[], edges: MapEdge[]): MapNode[] {
  const targetIds = new Set(edges.map((e) => e.targetId));
  const roots = nodes.filter((n) => !targetIds.has(n.id));
  return roots.length > 0 ? roots : nodes.length > 0 ? [nodes[0]] : [];
}

// Map sourceId -> array of targetIds.
function buildChildrenMap(edges: MapEdge[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const e of edges) {
    if (!m.has(e.sourceId)) m.set(e.sourceId, []);
    m.get(e.sourceId)!.push(e.targetId);
  }
  return m;
}

// Snap a value to a grid of the given size (used for organic clean-up).
function snap(value: number, grid: number): number {
  return Math.round(value / grid) * grid;
}

// Compute the leaf count of each subtree reachable from `rootId`.
// Cycle-safe: tracks visited within a single traversal. Writes results
// into the shared `leafCount` map.
function computeLeafCounts(
  rootId: string,
  childrenMap: Map<string, string[]>,
  nodeById: Map<string, MapNode>,
  leafCount: Map<string, number>
): number {
  const stack: Array<{ id: string; state: "enter" | "exit" }> = [
    { id: rootId, state: "enter" },
  ];
  const localVisited = new Set<string>();
  const kidsOf = new Map<string, string[]>();

  // Iterative DFS — gather the actual (cycle-safe) children of each node.
  while (stack.length) {
    const { id, state } = stack.pop()!;
    if (state === "exit") {
      const kids = kidsOf.get(id) ?? [];
      if (kids.length === 0) {
        leafCount.set(id, 1);
      } else {
        let total = 0;
        for (const k of kids) total += leafCount.get(k) ?? 1;
        leafCount.set(id, Math.max(1, total));
      }
      continue;
    }
    if (localVisited.has(id)) continue;
    localVisited.add(id);
    const validKids = (childrenMap.get(id) ?? []).filter(
      (k) => nodeById.has(k) && !localVisited.has(k)
    );
    kidsOf.set(id, validKids);
    stack.push({ id, state: "exit" });
    for (const k of validKids) {
      stack.push({ id: k, state: "enter" });
    }
  }
  return leafCount.get(rootId) ?? 1;
}

// Shared recursive placement routine for tree layouts.
// Returns `{ nextBreadth, centerBreadth }` so the caller knows where the
// next sibling should start and where this subtree's center sits.
//
// For horizontal trees: breadth = Y axis, depth = X axis.
// For vertical trees:   breadth = X axis, depth = Y axis.
function placeTree(
  rootId: string,
  depth: number,
  topBreadth: number,
  childrenMap: Map<string, string[]>,
  nodeById: Map<string, MapNode>,
  placed: Set<string>,
  leafCount: Map<string, number>,
  results: LayoutResult[],
  opts: {
    depthGap: number;
    nodeBreadth: number;
    rowGap: number;
    axis: "horizontal" | "vertical";
  }
): { nextBreadth: number; centerBreadth: number } {
  if (placed.has(rootId)) {
    return { nextBreadth: topBreadth, centerBreadth: topBreadth };
  }
  placed.add(rootId);

  const rowBreadth = opts.nodeBreadth + opts.rowGap;
  const kids = (childrenMap.get(rootId) ?? []).filter(
    (k) => nodeById.has(k) && !placed.has(k)
  );

  if (kids.length === 0) {
    // Leaf — occupies one row, centered on topBreadth + nodeBreadth/2.
    const centerBreadth = topBreadth + opts.nodeBreadth / 2;
    const depthCoord = depth * opts.depthGap;
    const breadthCoord = topBreadth;
    if (opts.axis === "horizontal") {
      results.push({ id: rootId, x: depthCoord, y: breadthCoord });
    } else {
      results.push({ id: rootId, x: breadthCoord, y: depthCoord });
    }
    return { nextBreadth: topBreadth + rowBreadth, centerBreadth };
  }

  // Place each child sequentially, tracking first and last child's center.
  let nextBreadth = topBreadth;
  let firstCenter = 0;
  let lastCenter = 0;
  for (let i = 0; i < kids.length; i++) {
    const r = placeTree(
      kids[i],
      depth + 1,
      nextBreadth,
      childrenMap,
      nodeById,
      placed,
      leafCount,
      results,
      opts
    );
    nextBreadth = r.nextBreadth;
    if (i === 0) firstCenter = r.centerBreadth;
    lastCenter = r.centerBreadth;
  }

  // Internal node centered between first & last child's centers.
  const myCenterBreadth = (firstCenter + lastCenter) / 2;
  const depthCoord = depth * opts.depthGap;
  const breadthCoord = myCenterBreadth - opts.nodeBreadth / 2;
  if (opts.axis === "horizontal") {
    results.push({ id: rootId, x: depthCoord, y: breadthCoord });
  } else {
    results.push({ id: rootId, x: breadthCoord, y: depthCoord });
  }
  return { nextBreadth, centerBreadth: myCenterBreadth };
}

// ── Tree (horizontal) ────────────────────────────────
// Root on the left, children spread to the right.
export function layoutTreeHorizontal(
  nodes: MapNode[],
  edges: MapEdge[]
): LayoutResult[] {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) return [{ id: nodes[0].id, x: 0, y: 0 }];

  const HORIZONTAL_GAP = 280; // distance between depth levels (x)
  const NODE_BREADTH = 88; // node height (y) — used as row unit
  const ROW_GAP = 24; // vertical gap between siblings
  const COMPONENT_GAP = 80; // gap between disconnected components

  const roots = findRoots(nodes, edges);
  const childrenMap = buildChildrenMap(edges);
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const leafCount = new Map<string, number>();

  // Pre-compute leaf counts for every root component (cycle-safe).
  for (const r of roots) {
    if (!leafCount.has(r.id)) {
      computeLeafCounts(r.id, childrenMap, nodeById, leafCount);
    }
  }

  const results: LayoutResult[] = [];
  const placed = new Set<string>();
  let currentTop = 0;

  for (const root of roots) {
    if (placed.has(root.id)) continue;
    const leaves = leafCount.get(root.id) ?? 1;
    const subtreeBreadth = leaves * (NODE_BREADTH + ROW_GAP);
    placeTree(
      root.id,
      0,
      currentTop,
      childrenMap,
      nodeById,
      placed,
      leafCount,
      results,
      {
        depthGap: HORIZONTAL_GAP,
        nodeBreadth: NODE_BREADTH,
        rowGap: ROW_GAP,
        axis: "horizontal",
      }
    );
    currentTop += subtreeBreadth + COMPONENT_GAP;
  }

  // Place any orphan nodes (cyclic or unreachable) below everything else.
  for (const n of nodes) {
    if (!placed.has(n.id)) {
      results.push({ id: n.id, x: 0, y: currentTop });
      currentTop += NODE_BREADTH + ROW_GAP + COMPONENT_GAP;
    }
  }

  return results;
}

// ── Tree (vertical) ──────────────────────────────────
// Root on top, children below — org-chart style.
export function layoutTreeVertical(
  nodes: MapNode[],
  edges: MapEdge[]
): LayoutResult[] {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) return [{ id: nodes[0].id, x: 0, y: 0 }];

  const VERTICAL_GAP = 160; // distance between depth levels (y)
  const NODE_BREADTH = 220; // node width (x) — used as row unit
  const ROW_GAP = 40; // horizontal gap between siblings
  const COMPONENT_GAP = 120; // gap between disconnected components

  const roots = findRoots(nodes, edges);
  const childrenMap = buildChildrenMap(edges);
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const leafCount = new Map<string, number>();

  for (const r of roots) {
    if (!leafCount.has(r.id)) {
      computeLeafCounts(r.id, childrenMap, nodeById, leafCount);
    }
  }

  const results: LayoutResult[] = [];
  const placed = new Set<string>();
  let currentLeft = 0;

  for (const root of roots) {
    if (placed.has(root.id)) continue;
    const leaves = leafCount.get(root.id) ?? 1;
    const subtreeBreadth = leaves * (NODE_BREADTH + ROW_GAP);
    placeTree(
      root.id,
      0,
      currentLeft,
      childrenMap,
      nodeById,
      placed,
      leafCount,
      results,
      {
        depthGap: VERTICAL_GAP,
        nodeBreadth: NODE_BREADTH,
        rowGap: ROW_GAP,
        axis: "vertical",
      }
    );
    currentLeft += subtreeBreadth + COMPONENT_GAP;
  }

  // Orphan nodes — place to the right of everything.
  for (const n of nodes) {
    if (!placed.has(n.id)) {
      results.push({ id: n.id, x: currentLeft, y: 0 });
      currentLeft += NODE_BREADTH + ROW_GAP + COMPONENT_GAP;
    }
  }

  return results;
}

// ── Radial ───────────────────────────────────────────
// Root at center, children in concentric rings. Each node gets an angular
// sector proportional to its subtree leaf-count, so children stay close to
// their parent's angle — keeping edges visually grouped.
export function layoutRadial(
  nodes: MapNode[],
  edges: MapEdge[]
): LayoutResult[] {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) return [{ id: nodes[0].id, x: 0, y: 0 }];

  const RING_RADIUS = 240;
  const roots = findRoots(nodes, edges);
  const childrenMap = buildChildrenMap(edges);
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const leafCount = new Map<string, number>();

  // Compute leaf counts for each root subtree.
  for (const r of roots) {
    if (!leafCount.has(r.id)) {
      computeLeafCounts(r.id, childrenMap, nodeById, leafCount);
    }
  }

  const results: LayoutResult[] = [];
  const placed = new Set<string>();

  // Recursively place a node at the angular midpoint of its sector.
  // Children share the parent's sector, partitioned by their own leaf counts.
  const place = (
    id: string,
    depth: number,
    startAngle: number,
    endAngle: number
  ): void => {
    if (placed.has(id)) return;
    placed.add(id);

    const angle = (startAngle + endAngle) / 2;
    const radius = depth * RING_RADIUS;
    const w = nodeById.get(id)?.width ?? 220;
    const h = nodeById.get(id)?.height ?? 88;
    results.push({
      id,
      x: Math.cos(angle) * radius - w / 2,
      y: Math.sin(angle) * radius - h / 2,
    });

    const kids = (childrenMap.get(id) ?? []).filter(
      (k) => nodeById.has(k) && !placed.has(k)
    );
    if (kids.length === 0) return;

    const myLeaves = leafCount.get(id) ?? 1;
    const span = endAngle - startAngle;
    let cursor = startAngle;
    for (const k of kids) {
      const kl = leafCount.get(k) ?? 1;
      const sector = (kl / myLeaves) * span;
      place(k, depth + 1, cursor, cursor + sector);
      cursor += sector;
    }
  };

  // Single root: occupy the full circle. Multiple roots: split the circle
  // by subtree size and place each root at depth 0 in its sector's center.
  if (roots.length === 1) {
    place(roots[0].id, 0, 0, 2 * Math.PI);
  } else {
    const totalLeaves =
      roots.reduce((a, r) => a + (leafCount.get(r.id) ?? 1), 0) || 1;
    let cursor = -Math.PI / 2; // start at top
    for (const r of roots) {
      const rLeaves = leafCount.get(r.id) ?? 1;
      const sector = (rLeaves / totalLeaves) * 2 * Math.PI;
      place(r.id, 0, cursor, cursor + sector);
      cursor += sector;
    }
  }

  // Orphan nodes (cyclic or unreachable) stacked to the left.
  let orphY = 0;
  for (const n of nodes) {
    if (!placed.has(n.id)) {
      results.push({ id: n.id, x: -300, y: orphY });
      orphY += 120;
    }
  }

  return results;
}

// ── Organic (force-directed) ─────────────────────────
// Simplified Fruchterman-Reingold: repulsion between all pairs + spring
// attraction along edges. Iterates 50 times with a cooling temperature,
// then snaps the result to a 20px grid for visual cleanliness.
export function layoutOrganic(
  nodes: MapNode[],
  edges: MapEdge[]
): LayoutResult[] {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) return [{ id: nodes[0].id, x: 0, y: 0 }];

  // Initialize on a square grid with small jitter to break symmetry.
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const cellSize = 180;
  const pos = new Map<string, { x: number; y: number }>();
  nodes.forEach((n, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    pos.set(n.id, {
      x: col * cellSize + (Math.random() - 0.5) * 30,
      y: row * cellSize + (Math.random() - 0.5) * 30,
    });
  });

  const edgePairs = edges
    .filter((e) => pos.has(e.sourceId) && pos.has(e.targetId))
    .map((e) => ({ source: e.sourceId, target: e.targetId }));

  // FR parameters — tuned for tighter, more compact layouts
  const area = cols * cellSize * cols * cellSize;
  const k = Math.sqrt(area / Math.max(1, nodes.length));
  const k2 = k * k;
  const iterations = 80;
  // Lower initial temperature prevents nodes from spreading too far
  const initialTemp = cellSize * 0.8;
  const coolingFactor = initialTemp / iterations;

  for (let iter = 0; iter < iterations; iter++) {
    const temperature = Math.max(0.01, initialTemp - iter * coolingFactor);
    const disp = new Map<string, { x: number; y: number }>();
    nodes.forEach((n) => disp.set(n.id, { x: 0, y: 0 }));

    // Repulsive forces between every pair of nodes.
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = pos.get(nodes[i].id)!;
        const b = pos.get(nodes[j].id)!;
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.01) {
          // Coincident nodes — nudge apart deterministically.
          dx = (i - j) * 0.5;
          dy = (j - i) * 0.5;
          dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        }
        const force = k2 / dist;
        const ux = dx / dist;
        const uy = dy / dist;
        disp.get(nodes[i].id)!.x += ux * force;
        disp.get(nodes[i].id)!.y += uy * force;
        disp.get(nodes[j].id)!.x -= ux * force;
        disp.get(nodes[j].id)!.y -= uy * force;
      }
    }

    // Attractive forces along edges (springs).
    for (const e of edgePairs) {
      const a = pos.get(e.source)!;
      const b = pos.get(e.target)!;
      let dx = a.x - b.x;
      let dy = a.y - b.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.01) dist = 0.01;
      const force = (dist * dist) / k;
      const ux = dx / dist;
      const uy = dy / dist;
      disp.get(e.source)!.x -= ux * force;
      disp.get(e.source)!.y -= uy * force;
      disp.get(e.target)!.x += ux * force;
      disp.get(e.target)!.y += uy * force;
    }

    // Apply displacements, clamped by temperature (limits step size).
    for (const n of nodes) {
      const d = disp.get(n.id)!;
      const dLen = Math.sqrt(d.x * d.x + d.y * d.y);
      if (dLen > 0.01) {
        const limit = Math.min(dLen, temperature);
        const ux = d.x / dLen;
        const uy = d.y / dLen;
        pos.get(n.id)!.x += ux * limit;
        pos.get(n.id)!.y += uy * limit;
      }
    }
  }

  // Center the bounding box on the origin.
  const xs = nodes.map((n) => pos.get(n.id)!.x);
  const ys = nodes.map((n) => pos.get(n.id)!.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;

  // Compute scale to fit the layout into a reasonable bounding box (~1200x800)
  // so fit-to-view doesn't zoom out too far.
  const TARGET_W = 1200;
  const TARGET_H = 800;
  const bboxW = Math.max(...xs) - Math.min(...xs) || 1;
  const bboxH = Math.max(...ys) - Math.min(...ys) || 1;
  const scale = Math.min(1, TARGET_W / bboxW, TARGET_H / bboxH);

  // Snap to a 20px grid for cleanliness.
  const GRID = 20;
  return nodes.map((n) => {
    const p = pos.get(n.id)!;
    return {
      id: n.id,
      x: snap((p.x - cx) * scale, GRID),
      y: snap((p.y - cy) * scale, GRID),
    };
  });
}

// ── Dispatcher ───────────────────────────────────────
// Convenience helper used by the store: maps a LayoutType to its function.
export function computeLayout(
  type: LayoutType,
  nodes: MapNode[],
  edges: MapEdge[]
): LayoutResult[] {
  switch (type) {
    case "tree-horizontal":
      return layoutTreeHorizontal(nodes, edges);
    case "tree-vertical":
      return layoutTreeVertical(nodes, edges);
    case "radial":
      return layoutRadial(nodes, edges);
    case "organic":
      return layoutOrganic(nodes, edges);
    default:
      return layoutTreeHorizontal(nodes, edges);
  }
}

// Human-readable labels (Portuguese) for each layout, used in the toolbar.
export const LAYOUT_LABELS: Record<LayoutType, string> = {
  "tree-horizontal": "Árvore horizontal",
  "tree-vertical": "Árvore vertical",
  radial: "Radial",
  organic: "Orgânico",
};

export const LAYOUT_DESCRIPTIONS: Record<LayoutType, string> = {
  "tree-horizontal": "Hierarquia da esquerda para a direita",
  "tree-vertical": "Hierarquia de cima para baixo",
  radial: "Anéis concêntricos a partir da raiz",
  organic: "Distribuição orgânica por forças",
};
