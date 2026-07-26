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

  const map = await db.mindMap.create({
    data: {
      title,
      description,
      theme,
      tags,
      nodes: {
        create: [
          {
            title: title || "Tópico central",
            kind: "goal",
            x: 0,
            y: 0,
            width: 200,
            height: 80,
          },
        ],
      },
    },
    include: { nodes: true, edges: true },
  });

  return NextResponse.json({ map });
}
