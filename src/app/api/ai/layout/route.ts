import { NextRequest, NextResponse } from "next/server";

interface LNode {
  id: string;
  parentId?: string | null;
}
interface ReqNode extends LNode {
  title?: string;
  kind?: string;
}

// Deterministic radial/tree auto-layout. No AI needed — fast and reproducible.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const nodes: ReqNode[] = body.nodes ?? [];
  const edges: Array<{ sourceId: string; targetId: string }> = body.edges ?? [];
  const mode: "radial" | "tree" = body.mode ?? "radial";

  if (!nodes.length) {
    return NextResponse.json({ positions: {} });
  }

  // Build adjacency from edges (treat as undirected to find structure),
  // but prefer parentId when present.
  const children = new Map<string | null, string[]>();
  const hasParent = new Set<string>();
  for (const n of nodes) {
    const p = n.parentId ?? null;
    if (!children.has(p)) children.set(p, []);
    children.get(p)!.push(n.id);
    if (p) hasParent.add(n.id);
  }
  // If no parentId structure, derive from edges: pick roots = nodes with no incoming
  if ([...children.keys()].every((k) => k !== null) === false || children.get(null)?.length === 0) {
    // build from edges
    const incoming = new Set<string>();
    const out: Record<string, string[]> = {};
    for (const e of edges) {
      if (!out[e.sourceId]) out[e.sourceId] = [];
      out[e.sourceId].push(e.targetId);
      incoming.add(e.targetId);
    }
    const roots = nodes.filter((n) => !incoming.has(n.id));
    children.clear();
    children.set(null, roots.map((r) => r.id));
    for (const n of nodes) {
      const kids = out[n.id] ?? [];
      children.set(n.id, kids);
      for (const k of kids) hasParent.add(k);
    }
  }

  const positions: Record<string, { x: number; y: number }> = {};
  const roots = children.get(null) ?? [];
  if (roots.length === 0) {
    // fallback grid
    nodes.forEach((n, i) => {
      positions[n.id] = { x: (i % 6) * 220, y: Math.floor(i / 6) * 130 };
    });
    return NextResponse.json({ positions });
  }

  if (mode === "tree") {
    // horizontal tree layout
    const ringX = [0, 280, 560, 840, 1120, 1400];
    const levelY: Record<number, number> = {};
    const assign = (id: string, depth: number, ySlot: { v: number }) => {
      positions[id] = { x: ringX[Math.min(depth, ringX.length - 1)], y: ySlot.v * 110 };
      ySlot.v += 1;
      const kids = children.get(id) ?? [];
      for (const k of kids) assign(k, depth + 1, ySlot);
    };
    const slot = { v: 0 };
    for (const r of roots) assign(r, 0, slot);
  } else {
    // radial
    const ringRadius = [0, 300, 540, 740, 900, 1040];
    const assign = (id: string, depth: number, parentAngle: number | null, arc: number) => {
      const radius = ringRadius[Math.min(depth, ringRadius.length - 1)];
      const kids = (children.get(id) ?? []).filter((k) => k !== id);
      let angle: number;
      if (depth === 0) {
        angle = 0;
      } else if (parentAngle === null) {
        angle = 0;
      } else {
        angle = parentAngle;
      }
      if (depth === 0) {
        positions[id] = { x: 0, y: 0 };
        // distribute kids around full circle
        kids.forEach((k, i) => {
          const a = (i / Math.max(kids.length, 1)) * Math.PI * 2 - Math.PI / 2;
          positions[k] = {
            x: Math.cos(a) * ringRadius[1],
            y: Math.sin(a) * ringRadius[1],
          };
          assign(k, 1, a, Math.PI * 0.6);
        });
      } else {
        // already positioned by parent; place kids in an arc around parent's angle
        const parentPos = positions[id];
        const baseAngle = Math.atan2(parentPos.y, parentPos.x);
        const r = ringRadius[Math.min(depth + 1, ringRadius.length - 1)];
        kids.forEach((k, i) => {
          const t = kids.length === 1 ? 0.5 : i / (kids.length - 1);
          const a = baseAngle - arc / 2 + arc * t;
          positions[k] = { x: Math.cos(a) * r, y: Math.sin(a) * r };
          assign(k, depth + 1, a, arc * 0.7);
        });
      }
    };
    for (const r of roots) assign(r, 0, null, Math.PI * 2);
  }

  // ensure every node has a position
  let fallbackIdx = 0;
  for (const n of nodes) {
    if (!positions[n.id]) {
      positions[n.id] = { x: (fallbackIdx % 6) * 220, y: Math.floor(fallbackIdx / 6) * 130 };
      fallbackIdx++;
    }
  }

  return NextResponse.json({ positions });
}
