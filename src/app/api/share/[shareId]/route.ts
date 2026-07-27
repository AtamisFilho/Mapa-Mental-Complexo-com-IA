import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface Params {
  params: Promise<{ shareId: string }>;
}

/**
 * PUBLIC endpoint — no auth. Look up a map by its `shareId` and return the
 * full map data (nodes + edges) in the same shape as `GET /api/maps/[id]`.
 *
 * Response:
 *   200 { map: { id, title, description, theme, nodes, edges } }
 *   404 { error: "Map not found" }
 *
 * Note: We deliberately omit sensitive fields (tags, starred, createdAt,
 * updatedAt) — but the response shape is structurally compatible with the
 * `loadMap(map)` action in the Zustand store, which only reads id / title /
 * description / theme / nodes / edges. Extra fields would simply be ignored.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { shareId } = await params;

  if (!shareId) {
    return NextResponse.json({ error: "Map not found" }, { status: 404 });
  }

  const map = await db.mindMap.findUnique({
    where: { shareId },
    include: { nodes: true, edges: true },
  });

  if (!map) {
    return NextResponse.json({ error: "Map not found" }, { status: 404 });
  }

  return NextResponse.json({
    map: {
      id: map.id,
      title: map.title,
      description: map.description,
      theme: map.theme,
      nodes: map.nodes,
      edges: map.edges,
    },
  });
}
