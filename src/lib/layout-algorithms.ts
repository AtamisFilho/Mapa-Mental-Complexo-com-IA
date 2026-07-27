// Auto-layout algorithms for mind maps.
// Each function takes the current nodes + edges and returns new positions
// for every node (without mutating the input).
//
// Layouts supported:
//   1. tree-left       — root on left, children spread to the right (horizontal)
//   2. tree-right      — root on right, children spread to the left (mirror of tree-left)
//   3. tree-down       — root on top, children below (vertical, org-chart style)
//   4. tree-up         — root on bottom, children above (mirror of tree-down)
//   5. radial          — root at center, children in concentric rings
//   6. organic         — simplified force-directed layout
//   7. balanced        — Reingold-Tilford tidy tree (tighter spacing, equalized subtrees)
//   8. grid            — grid arranged by depth level (depth = row, siblings share a row)
//   9. packed          — cluster packing grouped by node kind
//  10. layered         — Sugiyama-style layered DAG (handles cycles, multi-parent)
//
// Backward compatibility aliases:
//   - "tree-horizontal" → "tree-left"
//   - "tree-vertical"   → "tree-down"
//
// All algorithms handle:
//   - Empty node list → []
//   - Single node → [{ id, x: 0, y: 0 }]
//   - Disconnected components → laid out separately and stacked
//   - Cyclic edges → back-edges ignored during traversal

import type { MapNode, MapEdge, NodeKind } from "./types";

export type LayoutType =
  | "tree-left" // alias-friendly: root left → children right
  | "tree-right" // root right → children left
  | "tree-down" // root top → children below
  | "tree-up" // root bottom → children above
  | "radial" // root center → rings
  | "organic" // force-directed
  | "balanced" // Reingold-Tilford tidy tree
  | "grid" // depth-keyed grid
  | "packed" // pack clusters by kind
  | "layered" // Sugiyama layered DAG
  // Legacy aliases (kept for backward compatibility with persisted state)
  | "tree-horizontal"
  | "tree-vertical";

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

// ── Tree (horizontal — root LEFT, children RIGHT) ─────
// "tree-left" / legacy "tree-horizontal". Root on the left, children
// spread to the right. depth = +X (children move right).
export function layoutTreeHorizontal(
  nodes: MapNode[],
  edges: MapEdge[]
): LayoutResult[] {
  return layoutTreeDirectional(nodes, edges, "left");
}

// Alias for clarity.
export function layoutTreeLeft(
  nodes: MapNode[],
  edges: MapEdge[]
): LayoutResult[] {
  return layoutTreeDirectional(nodes, edges, "left");
}

// ── Tree (horizontal mirrored — root RIGHT, children LEFT) ─────
// "tree-right". Root on the right, children spread to the left.
// depth = -X (children move left), so the root sits at x=0 and the
// deepest leaves sit furthest to the left at the most negative x.
export function layoutTreeRight(
  nodes: MapNode[],
  edges: MapEdge[]
): LayoutResult[] {
  return layoutTreeDirectional(nodes, edges, "right");
}

// ── Tree (vertical — root TOP, children BELOW) ─────
// "tree-down" / legacy "tree-vertical". Root on top, children below.
// depth = +Y (children move down).
export function layoutTreeVertical(
  nodes: MapNode[],
  edges: MapEdge[]
): LayoutResult[] {
  return layoutTreeDirectional(nodes, edges, "down");
}

// Alias for clarity.
export function layoutTreeDown(
  nodes: MapNode[],
  edges: MapEdge[]
): LayoutResult[] {
  return layoutTreeDirectional(nodes, edges, "down");
}

// ── Tree (vertical mirrored — root BOTTOM, children ABOVE) ─────
// "tree-up". Root at the bottom, children spread upward.
// depth = -Y (children move up), so the root sits at y=0 and the
// deepest leaves sit at the most negative y.
export function layoutTreeUp(
  nodes: MapNode[],
  edges: MapEdge[]
): LayoutResult[] {
  return layoutTreeDirectional(nodes, edges, "up");
}

// Shared directional tree layout. The "direction" parameter controls
// how depth maps onto the (x, y) plane:
//   - "left"  : depth → +X, breadth → Y (root left, children right)
//   - "right" : depth → -X, breadth → Y (root right, children left)
//   - "down"  : depth → +Y, breadth → X (root top, children below)
//   - "up"    : depth → -Y, breadth → X (root bottom, children above)
//
// For mirrored directions ("right", "up") the final positions are
// negated on the depth axis so the root remains at the origin and
// children extend in the opposite direction.
function layoutTreeDirectional(
  nodes: MapNode[],
  edges: MapEdge[],
  direction: "left" | "right" | "down" | "up"
): LayoutResult[] {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) return [{ id: nodes[0].id, x: 0, y: 0 }];

  const isHorizontal = direction === "left" || direction === "right";
  // Use distinct gaps per orientation — horizontal trees have wider
  // depth gaps (so labels read left-to-right) while vertical trees
  // have larger node breadths (more horizontal room per node).
  const HORIZONTAL_DEPTH_GAP = 280;
  const HORIZONTAL_NODE_BREADTH = 88;
  const HORIZONTAL_ROW_GAP = 24;
  const HORIZONTAL_COMPONENT_GAP = 80;

  const VERTICAL_DEPTH_GAP = 160;
  const VERTICAL_NODE_BREADTH = 220;
  const VERTICAL_ROW_GAP = 40;
  const VERTICAL_COMPONENT_GAP = 120;

  const opts = isHorizontal
    ? {
        depthGap: HORIZONTAL_DEPTH_GAP,
        nodeBreadth: HORIZONTAL_NODE_BREADTH,
        rowGap: HORIZONTAL_ROW_GAP,
        componentGap: HORIZONTAL_COMPONENT_GAP,
        axis: "horizontal" as const,
      }
    : {
        depthGap: VERTICAL_DEPTH_GAP,
        nodeBreadth: VERTICAL_NODE_BREADTH,
        rowGap: VERTICAL_ROW_GAP,
        componentGap: VERTICAL_COMPONENT_GAP,
        axis: "vertical" as const,
      };

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
  let currentTop = 0;

  for (const root of roots) {
    if (placed.has(root.id)) continue;
    const leaves = leafCount.get(root.id) ?? 1;
    const subtreeBreadth = leaves * (opts.nodeBreadth + opts.rowGap);
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
        depthGap: opts.depthGap,
        nodeBreadth: opts.nodeBreadth,
        rowGap: opts.rowGap,
        axis: opts.axis,
      }
    );
    currentTop += subtreeBreadth + opts.componentGap;
  }

  // Place orphans below / to the right of the main layout.
  for (const n of nodes) {
    if (!placed.has(n.id)) {
      if (opts.axis === "horizontal") {
        results.push({ id: n.id, x: 0, y: currentTop });
      } else {
        results.push({ id: n.id, x: currentTop, y: 0 });
      }
      currentTop += opts.nodeBreadth + opts.rowGap + opts.componentGap;
    }
  }

  // For mirrored directions, negate the depth axis so the root stays
  // at the origin and children extend in the opposite direction.
  if (direction === "right") {
    return results.map((r) => ({ ...r, x: -r.x }));
  }
  if (direction === "up") {
    return results.map((r) => ({ ...r, y: -r.y }));
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

// ── Balanced (Reingold-Tilford tidy tree) ────────────
// A more compact horizontal tree that equalizes subtree widths via
// a post-order "contour" merge. Children are placed so that their
// subtree contours don't overlap the previous sibling's contour.
//
// This is a faithful (simplified) implementation of the classic
// Reingold-Tilford algorithm with equal-sized leaves. The result
// is significantly more compact than `tree-horizontal` for deep,
// uneven trees because siblings hug each other's actual contours
// rather than being spaced by leaf count.
export function layoutBalanced(
  nodes: MapNode[],
  edges: MapEdge[]
): LayoutResult[] {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) return [{ id: nodes[0].id, x: 0, y: 0 }];

  const LEVEL_GAP = 260; // distance between depth levels (x)
  const NODE_GAP = 24; // vertical gap between adjacent nodes (y)
  const NODE_HEIGHT = 88; // vertical extent used to space leaves
  const COMPONENT_GAP = 80;

  const roots = findRoots(nodes, edges);
  const childrenMap = buildChildrenMap(edges);
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const placed = new Set<string>();
  const results: LayoutResult[] = [];

  // Each subtree's left and right contour (y-extents at each depth).
  // Used to compute the minimum horizontal offset for the next sibling.
  type Contour = number[]; // index = depth-from-subtree-root, value = y-extent
  interface SubtreeLayout {
    nodeId: string;
    // map of nodeId -> { x, y } relative to the subtree root
    positions: Map<string, { x: number; y: number }>;
    leftContour: Contour; // minimum y at each depth
    rightContour: Contour; // maximum y at each depth
  }

  // Recursive layout. Returns the SubtreeLayout rooted at `id`.
  // `depth` is the depth of `id` within its subtree (always 0 here).
  const layoutSubtree = (id: string): SubtreeLayout | null => {
    if (placed.has(id)) return null;
    placed.add(id);

    const kids = (childrenMap.get(id) ?? []).filter(
      (k) => nodeById.has(k) && !placed.has(k)
    );

    const positions = new Map<string, { x: number; y: number }>();
    positions.set(id, { x: 0, y: 0 });

    if (kids.length === 0) {
      return {
        nodeId: id,
        positions,
        leftContour: [0],
        rightContour: [NODE_HEIGHT],
      };
    }

    // Layout each child first.
    const childSubs: SubtreeLayout[] = [];
    for (const k of kids) {
      const sub = layoutSubtree(k);
      if (sub) childSubs.push(sub);
    }
    if (childSubs.length === 0) {
      return {
        nodeId: id,
        positions,
        leftContour: [0],
        rightContour: [NODE_HEIGHT],
      };
    }

    // Stack children vertically, shifting each by the minimum offset
    // so its left contour doesn't overlap the previous sibling's
    // right contour. The first child starts at y=0.
    let cursorY = 0;
    const mergedLeft: Contour = [];
    const mergedRight: Contour = [];

    childSubs.forEach((sub, i) => {
      if (i === 0) {
        // Place at y=0, no shift needed.
        cursorY = 0;
      } else {
        // Find the maximum overlap between sub.leftContour[d] and
        // mergedRight[d] across all depths that exist in both. The
        // shift must push sub past the right contour of the merged
        // set so far, plus NODE_GAP.
        const prev = childSubs[i - 1];
        const maxDepth = Math.min(
          sub.leftContour.length,
          mergedRight.length
        );
        let neededShift = -Infinity;
        for (let d = 0; d < maxDepth; d++) {
          const leftAtD = sub.leftContour[d] ?? 0;
          const rightAtD = mergedRight[d] ?? 0;
          // We want leftAtD + shift >= rightAtD + NODE_GAP
          const shift = rightAtD + NODE_GAP - leftAtD;
          if (shift > neededShift) neededShift = shift;
        }
        if (neededShift === -Infinity) neededShift = 0;
        // Also ensure the child starts after the previous child's bottom.
        const prevBottom =
          prev.positions.get(prev.nodeId)!.y + prev.rightContour[0];
        cursorY = Math.max(cursorY + NODE_HEIGHT + NODE_GAP, neededShift);
        // Use the more conservative of the two.
        cursorY = Math.max(cursorY, neededShift);
        void prevBottom;
      }

      // Translate the child's positions into this subtree's frame.
      for (const [nid, p] of sub.positions.entries()) {
        positions.set(nid, {
          x: p.x + LEVEL_GAP,
          y: p.y + cursorY,
        });
      }

      // Merge the child's contours into the merged set, offsetting by cursorY.
      for (let d = 0; d < sub.leftContour.length; d++) {
        const leftAtD = (sub.leftContour[d] ?? 0) + cursorY;
        const rightAtD = (sub.rightContour[d] ?? 0) + cursorY;
        if (d >= mergedLeft.length) {
          mergedLeft.push(leftAtD);
          mergedRight.push(rightAtD);
        } else {
          if (leftAtD < mergedLeft[d]) mergedLeft[d] = leftAtD;
          if (rightAtD > mergedRight[d]) mergedRight[d] = rightAtD;
        }
      }
      // After processing the child, advance cursorY to the bottom of the child subtree.
      const childBottom = mergedRight[0] ?? cursorY + NODE_HEIGHT;
      cursorY = childBottom;
    });

    // The root sits at the vertical midpoint of its children.
    // Find the first and last child's root y to compute the midpoint.
    const firstChildY = positions.get(childSubs[0].nodeId)!.y;
    const lastChildY = positions.get(childSubs[childSubs.length - 1].nodeId)!.y;
    const rootY = (firstChildY + lastChildY) / 2;

    // Shift everything so the root sits at y=0.
    for (const [nid, p] of positions.entries()) {
      positions.set(nid, { x: p.x, y: p.y - rootY });
    }

    // Build the final contours (root at depth 0).
    const leftContour = [0, ...mergedLeft.map((v) => v - rootY)];
    const rightContour = [
      NODE_HEIGHT,
      ...mergedRight.map((v) => v - rootY),
    ];

    return {
      nodeId: id,
      positions,
      leftContour,
      rightContour,
    };
  };

  // Layout each root component and stack them vertically.
  let currentY = 0;
  for (const root of roots) {
    if (placed.has(root.id)) continue;
    const sub = layoutSubtree(root.id);
    if (!sub) continue;

    // Compute the bounding box of this subtree.
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of sub.positions.values()) {
      if (p.y < minY) minY = p.y;
      if (p.y + NODE_HEIGHT > maxY) maxY = p.y + NODE_HEIGHT;
    }

    // Translate into the global frame.
    for (const [nid, p] of sub.positions.entries()) {
      results.push({ id: nid, x: p.x, y: p.y + currentY - minY });
    }
    currentY += maxY - minY + COMPONENT_GAP;
  }

  // Place orphan nodes below everything else.
  for (const n of nodes) {
    if (!placed.has(n.id)) {
      results.push({ id: n.id, x: 0, y: currentY });
      currentY += NODE_HEIGHT + NODE_GAP + COMPONENT_GAP;
    }
  }

  return results;
}

// ── Grid (depth-keyed grid layout) ───────────────────
// Each depth level occupies one row. Within a row, siblings are
// arranged left-to-right in creation order. Useful for getting a
// quick overview of the tree's depth structure without overlap.
export function layoutGrid(
  nodes: MapNode[],
  edges: MapEdge[]
): LayoutResult[] {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) return [{ id: nodes[0].id, x: 0, y: 0 }];

  const ROW_HEIGHT = 140; // y distance between depth rows
  const COL_WIDTH = 260; // x distance between siblings
  const COMPONENT_GAP = 80;

  const roots = findRoots(nodes, edges);
  const childrenMap = buildChildrenMap(edges);
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  // Compute depth of each node via BFS from each root. Cycle-safe.
  const depthById = new Map<string, number>();
  const nodesAtDepth = new Map<number, string[]>();

  const visit = (startId: string) => {
    const queue: Array<{ id: string; depth: number }> = [
      { id: startId, depth: 0 },
    ];
    const visited = new Set<string>();
    while (queue.length) {
      const { id, depth } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      if (!depthById.has(id) || depthById.get(id)! < depth) {
        depthById.set(id, depth);
      }
      const maxDepth = Math.max(depth, depthById.get(id) ?? 0);
      if (!nodesAtDepth.has(maxDepth)) nodesAtDepth.set(maxDepth, []);
      if (!nodesAtDepth.get(maxDepth)!.includes(id)) {
        nodesAtDepth.get(maxDepth)!.push(id);
      }
      for (const k of childrenMap.get(id) ?? []) {
        if (nodeById.has(k) && !visited.has(k)) {
          queue.push({ id: k, depth: depth + 1 });
        }
      }
    }
  };

  for (const r of roots) visit(r.id);

  // Place orphans at depth 0.
  let orphanDepth = 0;
  for (const n of nodes) {
    if (!depthById.has(n.id)) {
      if (!nodesAtDepth.has(orphanDepth)) nodesAtDepth.set(orphanDepth, []);
      nodesAtDepth.get(orphanDepth)!.push(n.id);
      depthById.set(n.id, orphanDepth);
    }
  }

  // Compute the maximum number of nodes at any depth (to center rows).
  const maxRowWidth = Math.max(
    ...Array.from(nodesAtDepth.values()).map((arr) => arr.length)
  );
  const totalWidth = maxRowWidth * COL_WIDTH;

  const results: LayoutResult[] = [];
  const sortedDepths = Array.from(nodesAtDepth.keys()).sort((a, b) => a - b);
  let yCursor = 0;
  for (const depth of sortedDepths) {
    const ids = nodesAtDepth.get(depth)!;
    const rowWidth = ids.length * COL_WIDTH;
    const xOffset = (totalWidth - rowWidth) / 2;
    ids.forEach((id, i) => {
      results.push({
        id,
        x: xOffset + i * COL_WIDTH,
        y: yCursor,
      });
    });
    yCursor += ROW_HEIGHT + COMPONENT_GAP;
  }

  return results;
}

// ── Packed (cluster packing by kind) ─────────────────
// Groups nodes by their `kind` (concept, question, action, etc.) and
// packs each group into a tight rectangular cluster. Clusters are then
// arranged in a 2-row layout. Useful for organizing maps by category
// rather than by hierarchy.
export function layoutPacked(
  nodes: MapNode[],
  edges: MapEdge[]
): LayoutResult[] {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) return [{ id: nodes[0].id, x: 0, y: 0 }];

  const CELL_W = 240;
  const CELL_H = 100;
  const CELL_GAP = 16;
  const CLUSTER_GAP = 80;

  // Group nodes by kind.
  const byKind = new Map<NodeKind, MapNode[]>();
  for (const n of nodes) {
    const k = n.kind;
    if (!byKind.has(k)) byKind.set(k, []);
    byKind.get(k)!.push(n);
  }

  // Pack each cluster into a rectangle (compute columns = ceil(sqrt(n))).
  type Cluster = {
    kind: NodeKind;
    width: number;
    height: number;
    positions: Map<string, { x: number; y: number }>;
  };
  const clusters: Cluster[] = [];
  for (const [kind, group] of byKind) {
    const n = group.length;
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const positions = new Map<string, { x: number; y: number }>();
    group.forEach((node, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      positions.set(node.id, {
        x: col * (CELL_W + CELL_GAP),
        y: row * (CELL_H + CELL_GAP),
      });
    });
    clusters.push({
      kind,
      width: cols * (CELL_W + CELL_GAP) - CELL_GAP,
      height: rows * (CELL_H + CELL_GAP) - CELL_GAP,
      positions,
    });
  }

  // Arrange clusters in a 2-row balanced layout.
  const halfCount = Math.ceil(clusters.length / 2);
  const topRow = clusters.slice(0, halfCount);
  const bottomRow = clusters.slice(halfCount);
  const rowWidth = (arr: Cluster[]) =>
    arr.reduce((sum, c) => sum + c.width, 0) +
    (arr.length - 1) * CLUSTER_GAP;
  const topWidth = rowWidth(topRow);
  const bottomWidth = rowWidth(bottomRow);
  const totalWidth = Math.max(topWidth, bottomWidth);
  const topHeight = Math.max(0, ...topRow.map((c) => c.height));
  const bottomHeight = Math.max(0, ...bottomRow.map((c) => c.height));
  const totalHeight = topHeight + bottomHeight + CLUSTER_GAP;

  const results: LayoutResult[] = [];
  // Place top row.
  let xCursor = (totalWidth - topWidth) / 2;
  for (const c of topRow) {
    for (const [nid, p] of c.positions.entries()) {
      results.push({
        id: nid,
        x: xCursor + p.x,
        y: p.y,
      });
    }
    xCursor += c.width + CLUSTER_GAP;
  }
  // Place bottom row.
  xCursor = (totalWidth - bottomWidth) / 2;
  const yOffset = topHeight + CLUSTER_GAP;
  for (const c of bottomRow) {
    for (const [nid, p] of c.positions.entries()) {
      results.push({
        id: nid,
        x: xCursor + p.x,
        y: yOffset + p.y,
      });
    }
    xCursor += c.width + CLUSTER_GAP;
  }

  // Center the whole thing on the origin.
  const cx = totalWidth / 2;
  const cy = totalHeight / 2;
  return results.map((r) => ({ id: r.id, x: r.x - cx, y: r.y - cy }));
}

// ── Layered DAG (Sugiyama-style) ─────────────────────
// A simplified Sugiyama framework for layered layout:
//   1. Cycle removal — reverse back-edges (DFS-based).
//   2. Layer assignment — longest-path layering from sources.
//   3. Ordering — barycenter heuristic, 24 iterations.
//   4. Coordinate assignment — barycenter-based x positions.
//
// Best for maps with multiple parents, cross-links, or cycles
// (which the pure tree layouts can't handle gracefully).
export function layoutLayered(
  nodes: MapNode[],
  edges: MapEdge[]
): LayoutResult[] {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) return [{ id: nodes[0].id, x: 0, y: 0 }];

  const LAYER_GAP = 160; // y distance between layers
  const NODE_GAP = 40; // x gap between nodes in the same layer
  const NODE_BREADTH = 220; // node width (used for spacing)

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const ids = nodes.map((n) => n.id);
  const idSet = new Set(ids);

  // 1. Cycle removal via DFS — mark back-edges and reverse them.
  const adj = new Map<string, string[]>();
  const reversedEdges = new Set<string>(); // edge ids that get reversed
  for (const e of edges) {
    if (!idSet.has(e.sourceId) || !idSet.has(e.targetId)) continue;
    if (!adj.has(e.sourceId)) adj.set(e.sourceId, []);
    adj.get(e.sourceId)!.push(e.targetId);
  }
  const edgePairs = edges
    .filter((e) => idSet.has(e.sourceId) && idSet.has(e.targetId))
    .map((e) => ({ id: e.id, source: e.sourceId, target: e.targetId }));

  const state = new Map<string, "white" | "gray" | "black">();
  ids.forEach((id) => state.set(id, "white"));
  const dfsVisit = (u: string) => {
    state.set(u, "gray");
    for (const v of adj.get(u) ?? []) {
      const s = state.get(v);
      if (s === "white") {
        dfsVisit(v);
      } else if (s === "gray") {
        // back-edge: mark the corresponding edge for reversal
        const ep = edgePairs.find(
          (e) => e.source === u && e.target === v
        );
        if (ep) reversedEdges.add(ep.id);
      }
    }
    state.set(u, "black");
  };
  for (const id of ids) if (state.get(id) === "white") dfsVisit(id);

  // Build a DAG adjacency that respects the reversal.
  const dagAdj = new Map<string, string[]>();
  const dagIn = new Map<string, number>();
  ids.forEach((id) => {
    dagAdj.set(id, []);
    dagIn.set(id, 0);
  });
  for (const e of edgePairs) {
    let src = e.source;
    let tgt = e.target;
    if (reversedEdges.has(e.id)) {
      [src, tgt] = [tgt, src];
    }
    dagAdj.get(src)!.push(tgt);
    dagIn.set(tgt, (dagIn.get(tgt) ?? 0) + 1);
  }

  // 2. Longest-path layering — sources at layer 0, each node's layer
  // is the longest path from any source.
  const layer = new Map<string, number>();
  // Topological order via Kahn's algorithm.
  const inDegree = new Map(dagIn);
  const queue: string[] = [];
  for (const [id, deg] of inDegree) if (deg === 0) queue.push(id);
  const topo: string[] = [];
  while (queue.length) {
    const u = queue.shift()!;
    topo.push(u);
    for (const v of dagAdj.get(u) ?? []) {
      inDegree.set(v, (inDegree.get(v) ?? 0) - 1);
      if (inDegree.get(v) === 0) queue.push(v);
    }
  }
  // Assign layers in topo order.
  for (const u of topo) {
    const inEdges = ids.filter((id) =>
      (dagAdj.get(id) ?? []).includes(u)
    );
    if (inEdges.length === 0) {
      layer.set(u, 0);
    } else {
      layer.set(
        u,
        Math.max(...inEdges.map((id) => (layer.get(id) ?? 0) + 1))
      );
    }
  }
  // Any nodes not in topo (cycles we missed) get layer 0.
  for (const id of ids) if (!layer.has(id)) layer.set(id, 0);

  // 3. Group by layer.
  const layers = new Map<number, string[]>();
  for (const [id, l] of layer) {
    if (!layers.has(l)) layers.set(l, []);
    layers.get(l)!.push(id);
  }
  const sortedLayerIdx = Array.from(layers.keys()).sort((a, b) => a - b);

  // 4. Ordering via barycenter heuristic.
  // For each layer (top-down), reorder nodes by the barycenter of
  // their parents' x-positions. Then bottom-up by children's x.
  // Initial x = index in the layer.
  const xById = new Map<string, number>();
  for (const l of sortedLayerIdx) {
    const arr = layers.get(l)!;
    arr.forEach((id, i) => xById.set(id, i));
  }
  const barycenter = (arr: string[], neighbors: (id: string) => string[]) => {
    return arr
      .map((id) => {
        const ns = neighbors(id).filter((n) => xById.has(n));
        const b =
          ns.length === 0
            ? xById.get(id)!
            : ns.reduce((s, n) => s + (xById.get(n) ?? 0), 0) / ns.length;
        return { id, b };
      })
      .sort((a, b) => a.b - b.b);
  };
  for (let iter = 0; iter < 24; iter++) {
    // Top-down: reorder by parents' barycenter.
    for (let li = 1; li < sortedLayerIdx.length; li++) {
      const l = sortedLayerIdx[li];
      const parents = (id: string) =>
        ids.filter((pid) => (dagAdj.get(pid) ?? []).includes(id));
      const sorted = barycenter(layers.get(l)!, parents);
      layers.set(
        l,
        sorted.map((s) => s.id)
      );
      sorted.forEach((s, i) => xById.set(s.id, i));
    }
    // Bottom-up: reorder by children's barycenter.
    for (let li = sortedLayerIdx.length - 2; li >= 0; li--) {
      const l = sortedLayerIdx[li];
      const children = (id: string) => dagAdj.get(id) ?? [];
      const sorted = barycenter(layers.get(l)!, children);
      layers.set(
        l,
        sorted.map((s) => s.id)
      );
      sorted.forEach((s, i) => xById.set(s.id, i));
    }
  }

  // 5. Coordinate assignment — center each layer on its mean x.
  const results: LayoutResult[] = [];
  let yCursor = 0;
  for (const l of sortedLayerIdx) {
    const arr = layers.get(l)!;
    const layerWidth = arr.length * (NODE_BREADTH + NODE_GAP) - NODE_GAP;
    const startX = -layerWidth / 2;
    arr.forEach((id, i) => {
      results.push({
        id,
        x: startX + i * (NODE_BREADTH + NODE_GAP),
        y: yCursor,
      });
    });
    yCursor += LAYER_GAP;
  }

  // Center on origin.
  const xs = results.map((r) => r.x);
  const ys = results.map((r) => r.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  return results.map((r) => ({
    id: r.id,
    x: snap(r.x - cx, 20),
    y: snap(r.y - cy, 20),
  }));
}

// ── Dispatcher ───────────────────────────────────────
// Convenience helper used by the store: maps a LayoutType to its function.
// Legacy types "tree-horizontal" and "tree-vertical" are mapped to their
// new canonical names for backward compatibility with persisted state.
export function computeLayout(
  type: LayoutType,
  nodes: MapNode[],
  edges: MapEdge[]
): LayoutResult[] {
  switch (type) {
    case "tree-horizontal":
    case "tree-left":
      return layoutTreeLeft(nodes, edges);
    case "tree-right":
      return layoutTreeRight(nodes, edges);
    case "tree-vertical":
    case "tree-down":
      return layoutTreeDown(nodes, edges);
    case "tree-up":
      return layoutTreeUp(nodes, edges);
    case "radial":
      return layoutRadial(nodes, edges);
    case "organic":
      return layoutOrganic(nodes, edges);
    case "balanced":
      return layoutBalanced(nodes, edges);
    case "grid":
      return layoutGrid(nodes, edges);
    case "packed":
      return layoutPacked(nodes, edges);
    case "layered":
      return layoutLayered(nodes, edges);
    default:
      return layoutTreeLeft(nodes, edges);
  }
}

// Human-readable labels (Portuguese) for each layout, used in the toolbar.
export const LAYOUT_LABELS: Record<LayoutType, string> = {
  "tree-left": "Árvore à esquerda",
  "tree-right": "Árvore à direita",
  "tree-down": "Árvore para baixo",
  "tree-up": "Árvore para cima",
  radial: "Radial",
  organic: "Orgânico",
  balanced: "Balanceada",
  grid: "Grade por níveis",
  packed: "Agrupado por tipo",
  layered: "Camadas (DAG)",
  // Legacy aliases
  "tree-horizontal": "Árvore à esquerda",
  "tree-vertical": "Árvore para baixo",
};

export const LAYOUT_DESCRIPTIONS: Record<LayoutType, string> = {
  "tree-left": "Raiz na esquerda, filhos à direita",
  "tree-right": "Raiz na direita, filhos à esquerda",
  "tree-down": "Raiz no topo, filhos abaixo",
  "tree-up": "Raiz embaixo, filhos acima",
  radial: "Anéis concêntricos a partir da raiz",
  organic: "Distribuição orgânica por forças",
  balanced: "Árvore tidy (Reingold-Tilford, mais compacta)",
  grid: "Colunas por profundidade, linhas por nível",
  packed: "Clusters quadrados agrupados por tipo de nó",
  layered: "Camadas Sugiyama (suporta múltiplos pais e ciclos)",
  // Legacy aliases
  "tree-horizontal": "Raiz na esquerda, filhos à direita",
  "tree-vertical": "Raiz no topo, filhos abaixo",
};

// Categories used to group layouts in the LayoutPanel UI.
export type LayoutCategory = "tree" | "radial" | "force" | "structured";

export const LAYOUT_CATEGORIES: Record<LayoutCategory, LayoutType[]> = {
  tree: ["tree-left", "tree-right", "tree-down", "tree-up", "balanced"],
  radial: ["radial"],
  force: ["organic"],
  structured: ["grid", "packed", "layered"],
};

export const LAYOUT_CATEGORY_LABELS: Record<LayoutCategory, string> = {
  tree: "Árvores",
  radial: "Radial",
  force: "Forças",
  structured: "Estruturados",
};

// Small inline SVG icon string for each layout, used in the LayoutPanel
// to give a quick visual preview. 24x16 viewBox, stroke=currentColor.
export const LAYOUT_PREVIEW_SVG: Record<LayoutType, string> = {
  "tree-left":
    '<circle cx="4" cy="8" r="2" fill="currentColor"/><path d="M6 8h6M8 4h4M8 12h4" stroke="currentColor" stroke-width="1" stroke-linecap="round"/><circle cx="14" cy="8" r="1.5" fill="currentColor"/><circle cx="14" cy="4" r="1.5" fill="currentColor"/><circle cx="14" cy="12" r="1.5" fill="currentColor"/>',
  "tree-right":
    '<circle cx="20" cy="8" r="2" fill="currentColor"/><path d="M18 8h-6M16 4h-4M16 12h-4" stroke="currentColor" stroke-width="1" stroke-linecap="round"/><circle cx="10" cy="8" r="1.5" fill="currentColor"/><circle cx="10" cy="4" r="1.5" fill="currentColor"/><circle cx="10" cy="12" r="1.5" fill="currentColor"/>',
  "tree-down":
    '<circle cx="12" cy="4" r="2" fill="currentColor"/><path d="M12 6v6M6 8v4M18 8v4" stroke="currentColor" stroke-width="1" stroke-linecap="round"/><circle cx="12" cy="14" r="1.5" fill="currentColor"/><circle cx="6" cy="14" r="1.5" fill="currentColor"/><circle cx="18" cy="14" r="1.5" fill="currentColor"/>',
  "tree-up":
    '<circle cx="12" cy="14" r="2" fill="currentColor"/><path d="M12 12V6M6 10V6M18 10V6" stroke="currentColor" stroke-width="1" stroke-linecap="round"/><circle cx="12" cy="4" r="1.5" fill="currentColor"/><circle cx="6" cy="4" r="1.5" fill="currentColor"/><circle cx="18" cy="4" r="1.5" fill="currentColor"/>',
  radial:
    '<circle cx="12" cy="8" r="2" fill="currentColor"/><circle cx="12" cy="2.5" r="1.3" fill="currentColor"/><circle cx="20" cy="8" r="1.3" fill="currentColor"/><circle cx="12" cy="13.5" r="1.3" fill="currentColor"/><circle cx="4" cy="8" r="1.3" fill="currentColor"/><path d="M12 6V4M14 8h4M12 10v2M10 8H6" stroke="currentColor" stroke-width="0.8"/>',
  organic:
    '<circle cx="6" cy="6" r="1.5" fill="currentColor"/><circle cx="18" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="11" r="1.5" fill="currentColor"/><circle cx="5" cy="13" r="1.5" fill="currentColor"/><circle cx="19" cy="13" r="1.5" fill="currentColor"/><path d="M7 6l4 5M16 5l-3 6M7 13l4-2M17 13l-4-2" stroke="currentColor" stroke-width="0.7"/>',
  balanced:
    '<circle cx="3" cy="8" r="1.5" fill="currentColor"/><circle cx="10" cy="3" r="1.3" fill="currentColor"/><circle cx="10" cy="8" r="1.3" fill="currentColor"/><circle cx="10" cy="13" r="1.3" fill="currentColor"/><circle cx="18" cy="3" r="1.2" fill="currentColor"/><circle cx="18" cy="13" r="1.2" fill="currentColor"/><path d="M4 8h5M11 3h6M11 13h6M10 4v8" stroke="currentColor" stroke-width="0.7"/>',
  grid:
    '<circle cx="4" cy="4" r="1.3" fill="currentColor"/><circle cx="12" cy="4" r="1.3" fill="currentColor"/><circle cx="20" cy="4" r="1.3" fill="currentColor"/><circle cx="8" cy="10" r="1.3" fill="currentColor"/><circle cx="16" cy="10" r="1.3" fill="currentColor"/><circle cx="12" cy="14" r="1.3" fill="currentColor"/>',
  packed:
    '<rect x="2" y="2" width="8" height="8" rx="1" fill="currentColor" opacity="0.6"/><rect x="14" y="2" width="8" height="8" rx="1" fill="currentColor" opacity="0.6"/><rect x="2" y="12" width="8" height="6" rx="1" fill="currentColor" opacity="0.6"/><rect x="14" y="12" width="8" height="6" rx="1" fill="currentColor" opacity="0.6"/>',
  layered:
    '<circle cx="12" cy="3" r="1.4" fill="currentColor"/><circle cx="5" cy="9" r="1.4" fill="currentColor"/><circle cx="19" cy="9" r="1.4" fill="currentColor"/><circle cx="12" cy="14" r="1.4" fill="currentColor"/><path d="M11 4l-5 4M13 4l5 4M6 10l5 4M18 10l-5 4" stroke="currentColor" stroke-width="0.7"/>',
  // Legacy aliases
  "tree-horizontal":
    '<circle cx="4" cy="8" r="2" fill="currentColor"/><path d="M6 8h6M8 4h4M8 12h4" stroke="currentColor" stroke-width="1" stroke-linecap="round"/><circle cx="14" cy="8" r="1.5" fill="currentColor"/><circle cx="14" cy="4" r="1.5" fill="currentColor"/><circle cx="14" cy="12" r="1.5" fill="currentColor"/>',
  "tree-vertical":
    '<circle cx="12" cy="4" r="2" fill="currentColor"/><path d="M12 6v6M6 8v4M18 8v4" stroke="currentColor" stroke-width="1" stroke-linecap="round"/><circle cx="12" cy="14" r="1.5" fill="currentColor"/><circle cx="6" cy="14" r="1.5" fill="currentColor"/><circle cx="18" cy="14" r="1.5" fill="currentColor"/>',
};
