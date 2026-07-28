import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/maps/[id]/duplicate — clones an entire map (title, description,
 * theme, tags, all nodes, all edges) into a new map with a "(cópia)" suffix.
 *
 * Nodes get fresh IDs but preserve all their data (title, kind, position,
 * content, note, color, icon, image, collapsed). Edges are remapped to the
 * new node IDs via an old-id → new-id map built during creation.
 *
 * This is a non-destructive operation: the source map is never modified.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const source = await db.mindMap.findUnique({
    where: { id },
    include: { nodes: true, edges: true },
  });

  if (!source) {
    return NextResponse.json({ error: "Map not found" }, { status: 404 });
  }

  // Create the new map shell with "(cópia)" suffix
  const newTitle = `${source.title} (cópia)`;
  const clone = await db.mindMap.create({
    data: {
      title: newTitle,
      description: source.description,
      theme: source.theme,
      tags: source.tags,
    },
  });

  // Clone all nodes, building an old-id → new-id map
  const idMap = new Map<string, string>();
  const nodeCreates: Array<{
    id: string;
    mapId: string;
    parentId: string | null;
    title: string;
    content: string | null;
    note: string | null;
    kind: string;
    color: string | null;
    icon: string | null;
    image: string | null;
    x: number;
    y: number;
    width: number;
    height: number;
    collapsed: boolean;
  }> = [];

  for (const n of source.nodes) {
    const newId = `n${Math.random().toString(36).slice(2, 14)}`;
    idMap.set(n.id, newId);
    nodeCreates.push({
      id: newId,
      mapId: clone.id,
      parentId: n.parentId, // will remap below
      title: n.title,
      content: n.content,
      note: n.note,
      kind: n.kind,
      color: n.color,
      icon: n.icon,
      image: n.image,
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
      collapsed: n.collapsed,
    });
  }

  // Remap parentId references to new IDs
  for (const nc of nodeCreates) {
    if (nc.parentId) {
      nc.parentId = idMap.get(nc.parentId) ?? null;
    }
  }

  await db.node.createMany({ data: nodeCreates });

  // Clone all edges, remapping sourceId/targetId to new node IDs
  const edgeCreates: Array<{
    id: string;
    mapId: string;
    sourceId: string;
    targetId: string;
    label: string | null;
    kind: string;
  }> = [];

  for (const e of source.edges) {
    const newSource = idMap.get(e.sourceId);
    const newTarget = idMap.get(e.targetId);
    if (!newSource || !newTarget) continue;
    edgeCreates.push({
      id: `e${Math.random().toString(36).slice(2, 14)}`,
      mapId: clone.id,
      sourceId: newSource,
      targetId: newTarget,
      label: e.label,
      kind: e.kind,
    });
  }

  if (edgeCreates.length > 0) {
    await db.edge.createMany({ data: edgeCreates });
  }

  // Return the full clone with nodes + edges
  const fullClone = await db.mindMap.findUnique({
    where: { id: clone.id },
    include: { nodes: true, edges: true },
  });

  return NextResponse.json({ map: fullClone });
}
