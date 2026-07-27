import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// List all maps (summaries)
export async function GET() {
  const maps = await db.mindMap.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { nodes: true } } },
  });
  return NextResponse.json({
    maps: maps.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      theme: m.theme,
      tags: m.tags,
      starred: m.starred,
      nodeCount: m._count.nodes,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    })),
  });
}

// Create a new map
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const title = (body.title as string)?.trim() || "Novo Mapa Mental";
  const description = (body.description as string) || null;
  const theme = (body.theme as string) || "emerald";
  const tags = (body.tags as string) || null;

  // Optional: pre-populate nodes/edges (used for templates & import)
  type NodeInput = {
    title: string;
    kind?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    content?: string | null;
    note?: string | null;
    color?: string | null;
    parentId?: string | null;
  };
  type EdgeInput = {
    sourceId: string; // index-keyed like "0", "1", ...
    targetId: string;
    label?: string | null;
    kind?: string;
  };

  const templateNodes = Array.isArray(body.nodes) ? (body.nodes as NodeInput[]) : null;
  const templateEdges = Array.isArray(body.edges) ? (body.edges as EdgeInput[]) : null;

  // Validate kind enum (allow only known kinds; default to "concept")
  const VALID_KINDS = ["concept", "question", "action", "idea", "resource", "goal"];
  const VALID_EDGE_KINDS = ["related", "causes", "supports", "contradicts", "depends"];

  const nodesToCreate = templateNodes && templateNodes.length > 0
    ? templateNodes.map((n, i) => ({
        title: n.title ?? `Nó ${i + 1}`,
        kind: (VALID_KINDS.includes(n.kind ?? "") ? n.kind! : "concept") as
          | "concept" | "question" | "action" | "idea" | "resource" | "goal",
        x: n.x ?? 0,
        y: n.y ?? 0,
        width: n.width ?? 220,
        height: n.height ?? 88,
        content: n.content ?? null,
        note: n.note ?? null,
        color: n.color ?? null,
        parentId: n.parentId ?? null,
      }))
    : [
        {
          title: title || "Tópico central",
          kind: "goal" as const,
          x: 0,
          y: 0,
          width: 220,
          height: 88,
        },
      ];

  const map = await db.mindMap.create({
    data: {
      title,
      description,
      theme,
      tags,
      nodes: {
        create: nodesToCreate,
      },
    },
    include: { nodes: true, edges: true },
  });

  // If template edges were provided (indexed by node position), create them
  if (templateEdges && templateEdges.length > 0) {
    const byIdx = new Map(map.nodes.map((n, i) => [String(i), n.id]));
    const edgeCreates: Array<{
      sourceId: string;
      targetId: string;
      label: string | null;
      kind: "related" | "causes" | "supports" | "contradicts" | "depends";
      mapId: string;
    }> = [];
    for (const e of templateEdges) {
      const srcId = byIdx.get(String(e.sourceId));
      const tgtId = byIdx.get(String(e.targetId));
      if (!srcId || !tgtId || srcId === tgtId) continue;
      const kind = (VALID_EDGE_KINDS.includes(e.kind ?? "") ? e.kind! : "related") as
        | "related" | "causes" | "supports" | "contradicts" | "depends";
      edgeCreates.push({
        sourceId: srcId,
        targetId: tgtId,
        label: e.label ?? null,
        kind,
        mapId: map.id,
      });
    }
    if (edgeCreates.length > 0) {
      await db.edge.createMany({ data: edgeCreates });
    }
    // Reload with edges
    const fresh = await db.mindMap.findUnique({
      where: { id: map.id },
      include: { nodes: true, edges: true },
    });
    if (fresh) return NextResponse.json({ map: fresh });
  }

  return NextResponse.json({ map });
}
