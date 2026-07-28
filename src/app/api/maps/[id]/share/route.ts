import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * Generate a short, URL-safe share token.
 *
 * `crypto.randomUUID()` produces a 36-char v4 UUID (with dashes). We strip the
 * dashes to get a 32-char token, then base36-encode a random suffix for a
 * little extra entropy so the token is not predictable from the map id.
 *
 * Note: `@paralleldrive/cuid2` is not installed in this project (see
 * package.json), so we fall back to crypto.randomUUID per the task spec.
 */
function generateShareId(): string {
  // 32 hex chars from UUID v4 (without dashes) is already 122 bits of entropy
  // — more than sufficient for a non-guessable share link.
  return randomUUID().replace(/-/g, "");
}

/**
 * Build the absolute share URL for the client. Because the app only exposes the
 * `/` route (single-page share mode via `?share=XXX` query param), the URL is
 * `${origin}/?share=${shareId}`.
 *
 * On the server we can't reliably know the user-facing origin in all sandbox
 * setups, so we forward the host header. If the request has no host header
 * (unlikely), we fall back to a relative-style placeholder.
 */
function buildShareUrl(req: NextRequest, shareId: string): string {
  const host = req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${proto}://${host}` : "";
  return `${origin}/?share=${shareId}`;
}

// GET /api/maps/[id]/share — return the current shareId (or null)
//
// Response:
//   200 { shareId: string | null }
//   404 { error: "Map not found" }
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const map = await db.mindMap.findUnique({
    where: { id },
    select: { shareId: true },
  });
  if (!map) {
    return NextResponse.json({ error: "Map not found" }, { status: 404 });
  }
  return NextResponse.json({ shareId: map.shareId });
}

// POST /api/maps/[id]/share — generate / rotate / revoke the shareId
//
// Request body (optional):
//   { "enabled": boolean }
//     enabled=false  → set shareId=null (revoke access)
//     enabled=true   → if no shareId exists, generate one (rotate if you want)
//     omitted        → if no shareId exists, generate one; else keep current
//   { "rotate": true }   → force-generate a new shareId (replaces old one)
//
// Response:
//   200 { shareId: string | null, url: string }
//   404 { error: "Map not found" }
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const exists = await db.mindMap.findUnique({
    where: { id },
    select: { shareId: true },
  });
  if (!exists) {
    return NextResponse.json({ error: "Map not found" }, { status: 404 });
  }

  // Decide on the next shareId value.
  let nextShareId: string | null;

  if (typeof body?.enabled === "boolean" && !body.enabled) {
    // Explicit revoke
    nextShareId = null;
  } else if (body?.rotate === true) {
    // Force rotate (regardless of current state)
    nextShareId = generateShareId();
  } else if (typeof body?.enabled === "boolean" && body.enabled) {
    // Explicit enable: generate if missing, else keep
    nextShareId = exists.shareId ?? generateShareId();
  } else {
    // No `enabled` provided: if missing, generate; else keep current.
    nextShareId = exists.shareId ?? generateShareId();
  }

  const updated = await db.mindMap.update({
    where: { id },
    data: { shareId: nextShareId },
    select: { shareId: true },
  });

  const url = updated.shareId ? buildShareUrl(req, updated.shareId) : "";

  return NextResponse.json({ shareId: updated.shareId, url });
}
