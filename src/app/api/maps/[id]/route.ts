import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface Params {
  params: Promise<{ id: string }>;
}

// GET a single map with all nodes & edges
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const map = await db.mindMap.findUnique({
    where: { id },
    include: { nodes: true, edges: true },
  });
  if (!map) {
    return NextResponse.json({ error: "Map not found" }, { status: 404 });
  }
  return NextResponse.json({ map });
}

// PUT — full save (replace nodes & edges)
export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const exists = await db.mindMap.findUnique({ where: { id } });
  if (!exists) {
    return NextResponse.json({ error: "Map not found" }, { status: 404 });
  }

  // update meta
  const title = body.title ?? exists.title;
  const description = body.description ?? exists.description;
  const theme = body.theme ?? exists.theme;
  const tags = body.tags ?? exists.tags;
  const starred = body.starred ?? exists.starred;

  await db.mindMap.update({
    where: { id },
    data: { title, description, theme, tags, starred },
  });

  // replace nodes & edges in a transaction
  const nodes = Array.isArray(body.nodes) ? body.nodes : [];
  const edges = Array.isArray(body.edges) ? body.edges : [];

  await db.$transaction([
    db.node.deleteMany({ where: { mapId: id } }),
    db.edge.deleteMany({ where: { mapId: id } }),
    ...nodes.map((n: Record<string, unknown>) =>
      db.node.create({
        data: {
          id: n.id as string,
          mapId: id,
          parentId: (n.parentId as string) ?? null,
          title: (n.title as string) ?? "Sem título",
          content: (n.content as string) ?? null,
          note: (n.note as string) ?? null,
          kind: (n.kind as string) ?? "concept",
          color: (n.color as string) ?? null,
          icon: (n.icon as string) ?? null,
          image: (n.image as string) ?? null,
          x: (n.x as number) ?? 0,
          y: (n.y as number) ?? 0,
          width: (n.width as number) ?? 180,
          height: (n.height as number) ?? 72,
          collapsed: (n.collapsed as boolean) ?? false,
          updatedAt: new Date(),
        },
      })
    ),
    ...edges.map((e: Record<string, unknown>) =>
      db.edge.create({
        data: {
          id: e.id as string,
          mapId: id,
          sourceId: e.sourceId as string,
          targetId: e.targetId as string,
          label: (e.label as string) ?? null,
          kind: (e.kind as string) ?? "related",
        },
      })
    ),
  ]);

  const updated = await db.mindMap.findUnique({
    where: { id },
    include: { nodes: true, edges: true },
  });
  return NextResponse.json({ map: updated });
}

// DELETE a map
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await db.mindMap.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
<<<<<<< HEAD

// PATCH — metadata-only update (title, description, theme, tags, starred).
// This avoids the destructive PUT flow which deletes & recreates every node
// and edge just to rename a map (wiping createdAt timestamps and losing
// concurrent edits). Use PATCH for any metadata change; PUT remains for
// full-graph saves.
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const exists = await db.mindMap.findUnique({ where: { id } });
  if (!exists) {
    return NextResponse.json({ error: "Map not found" }, { status: 404 });
  }

  // Only update fields that are explicitly provided.
  const data: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.title === "string") data.title = body.title.slice(0, 200);
  if (typeof body.description === "string") data.description = body.description.slice(0, 2000);
  if (typeof body.theme === "string") data.theme = body.theme;
  if (typeof body.tags === "string") data.tags = body.tags;
  if (typeof body.starred === "boolean") data.starred = body.starred;

  const updated = await db.mindMap.update({
    where: { id },
    data,
    include: { nodes: true, edges: true },
  });
  return NextResponse.json({ map: updated });
}
=======
>>>>>>> origin/main
