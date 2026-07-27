import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface Params {
  params: Promise<{ id: string }>;
}

// PATCH /api/maps/[id]/star — toggle (or explicitly set) the `starred` flag.
//
// Request body (optional):
//   { "starred": boolean }   -> set to this exact value
//   {} | omit                 -> flip the current value
//
// Response:
//   200 { map: { id, starred, updatedAt } }
//   404 { error: "Map not found" }
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const exists = await db.mindMap.findUnique({
    where: { id },
    select: { starred: true },
  });
  if (!exists) {
    return NextResponse.json({ error: "Map not found" }, { status: 404 });
  }

  // If body provides an explicit boolean, use it; otherwise toggle.
  const next =
    typeof body?.starred === "boolean" ? body.starred : !exists.starred;

  const updated = await db.mindMap.update({
    where: { id },
    data: { starred: next },
    select: { id: true, starred: true, updatedAt: true },
  });

  return NextResponse.json({ map: updated });
}
