/**
 * collab-service — real-time collaboration mini-service for the mind-map app.
 *
 * Runs a socket.io server on port 3003 (hardcoded — the Caddy gateway on :81
 * routes `?XTransformPort=3003` requests here).
 *
 * Protocol (all events scoped to a room `room:<mapId>`):
 *
 *  Client → Server
 *  ────────────────────────────────────────────────────────────────
 *   join          { mapId, userId, displayName, color }
 *   leave         { mapId, userId }
 *   cursor:move   { mapId, userId, x, y }            (world coords)
 *   node:update   { mapId, nodeId, patch, userId }
 *   node:add      { mapId, node,     userId }
 *   node:delete   { mapId, nodeId,   userId }
 *   edge:add      { mapId, edge,     userId }
 *   edge:delete   { mapId, edgeId,   userId }
 *
 *  Server → Client (broadcast to room, including sender where noted)
 *  ────────────────────────────────────────────────────────────────
 *   presence:update  { users: [{ userId, displayName, color, lastSeen }] }
 *   cursor:move      { userId, displayName, color, x, y }   (to others only)
 *   node:update      { nodeId, patch, userId }              (to others only)
 *   node:add         { node,     userId }                    (to others only)
 *   node:delete      { nodeId,   userId }                    (to others only)
 *   edge:add         { edge,     userId }                    (to others only)
 *   edge:delete      { edgeId,   userId }                    (to others only)
 *
 * Notes:
 *  - The server keeps an in-memory roster of who is in each room so it can
 *    broadcast presence updates. State is NOT persisted — restarting the
 *    service drops all presence (clients will re-join on reconnect).
 *  - `cursor:move` is throttled server-side to ~30fps per user: if a packet
 *    arrives <16ms after the previous one from the same user, it is dropped.
 */

import { createServer } from "http";
import { Server } from "socket.io";

// Porta dinâmica: em produção (Railway) usa process.env.PORT; no sandbox local usa 3003
const PORT = Number(process.env.PORT) || 3003;

// ── Types ──────────────────────────────────────────────────────────────────

interface RoomUser {
  userId: string;
  displayName: string;
  color: string;
  lastSeen: number;
  socketId: string;
}

interface JoinPayload {
  mapId: string;
  userId: string;
  displayName: string;
  color: string;
}

interface LeavePayload {
  mapId: string;
  userId: string;
}

interface CursorMovePayload {
  mapId: string;
  userId: string;
  displayName?: string;
  color?: string;
  x: number;
  y: number;
}

interface NodeUpdatePayload {
  mapId: string;
  nodeId: string;
  patch: Record<string, unknown>;
  userId: string;
}

interface NodeAddPayload {
  mapId: string;
  node: Record<string, unknown>;
  userId: string;
}

interface NodeDeletePayload {
  mapId: string;
  nodeId: string;
  userId: string;
}

interface EdgeAddPayload {
  mapId: string;
  edge: Record<string, unknown>;
  userId: string;
}

interface EdgeDeletePayload {
  mapId: string;
  edgeId: string;
  userId: string;
}

// ── In-memory state ────────────────────────────────────────────────────────

// mapId → (userId → RoomUser)
const rooms = new Map<string, Map<string, RoomUser>>();

// socketId → Set<mapId> so we can clean up on disconnect
const socketToRooms = new Map<string, Set<string>>();

// socketId → userId (best-known) for logging on disconnect
const socketToUserId = new Map<string, string>();

// userId → last cursor-move timestamp (for 30fps throttle). Keyed by userId
// because a single user may reconnect with a new socket id.
const lastCursorTs = new Map<string, number>();

const CURSOR_MIN_INTERVAL_MS = 16; // ≈ 60fps cap; the spec says ~30fps so this is generous
const CURSOR_DROP_INTERVAL_MS = 16; // drop if same user moved <16ms ago (per spec)

function roomOf(mapId: string): string {
  return `room:${mapId}`;
}

function getRoomRoster(mapId: string): Map<string, RoomUser> {
  let r = rooms.get(mapId);
  if (!r) {
    r = new Map();
    rooms.set(mapId, r);
  }
  return r;
}

function publicRoster(roster: Map<string, RoomUser>) {
  return Array.from(roster.values()).map((u) => ({
    userId: u.userId,
    displayName: u.displayName,
    color: u.color,
    lastSeen: u.lastSeen,
  }));
}

function broadcastPresence(io: Server, mapId: string, roster: Map<string, RoomUser>) {
  io.to(roomOf(mapId)).emit("presence:update", {
    mapId,
    users: publicRoster(roster),
  });
}

function removeSocketFromAllRooms(io: Server, socketId: string) {
  const mapIds = socketToRooms.get(socketId);
  if (!mapIds) return;
  for (const mapId of mapIds) {
    const roster = rooms.get(mapId);
    if (!roster) continue;
    // find user(s) associated with this socket
    for (const [userId, user] of roster) {
      if (user.socketId === socketId) {
        roster.delete(userId);
        lastCursorTs.delete(userId);
        console.log(
          `[presence] ${user.displayName} (${userId}) left room ${mapId}`
        );
      }
    }
    if (roster.size === 0) {
      rooms.delete(mapId);
    } else {
      broadcastPresence(io, mapId, roster);
    }
  }
  socketToRooms.delete(socketId);
}

// ── Server setup ───────────────────────────────────────────────────────────

const httpServer = createServer();
const io = new Server(httpServer, {
  path: "/",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

io.on("connection", (socket) => {
  console.log(`[connect] ${socket.id}`);
  socketToRooms.set(socket.id, new Set());

  // ── join ────────────────────────────────────────────────────────────────
  socket.on("join", (payload: JoinPayload) => {
    if (!payload || !payload.mapId || !payload.userId) {
      socket.emit("error", { message: "join requires mapId and userId" });
      return;
    }
    const { mapId, userId, displayName, color } = payload;
    const roomName = roomOf(mapId);
    socket.join(roomName);

    const roster = getRoomRoster(mapId);
    roster.set(userId, {
      userId,
      displayName: displayName || "Anónimo",
      color: color || "#64748b",
      lastSeen: Date.now(),
      socketId: socket.id,
    });

    socketToUserId.set(socket.id, userId);

    const roomsForSocket = socketToRooms.get(socket.id);
    if (roomsForSocket) roomsForSocket.add(mapId);

    console.log(
      `[presence] ${displayName} (${userId}) joined room ${mapName(mapId)} — ` +
        `${roster.size} user(s) online`
    );

    // Send the newcomer the current roster (includes themselves).
    socket.emit("presence:update", {
      mapId,
      users: publicRoster(roster),
    });
    // Broadcast updated presence to everyone else in the room.
    socket.to(roomName).emit("presence:update", {
      mapId,
      users: publicRoster(roster),
    });
  });

  // ── leave ───────────────────────────────────────────────────────────────
  socket.on("leave", (payload: LeavePayload) => {
    if (!payload || !payload.mapId || !payload.userId) return;
    const { mapId, userId } = payload;
    const roomName = roomOf(mapId);
    const roster = rooms.get(mapId);
    if (roster) {
      const user = roster.get(userId);
      if (user) {
        roster.delete(userId);
        lastCursorTs.delete(userId);
        console.log(
          `[presence] ${user.displayName} (${userId}) left room ${mapName(mapId)}`
        );
      }
      if (roster.size === 0) {
        rooms.delete(mapId);
      } else {
        broadcastPresence(io, mapId, roster);
      }
    }
    socket.leave(roomName);
    const roomsForSocket = socketToRooms.get(socket.id);
    if (roomsForSocket) roomsForSocket.delete(mapId);
  });

  // ── cursor:move (throttled server-side) ─────────────────────────────────
  socket.on("cursor:move", (payload: CursorMovePayload) => {
    if (!payload || !payload.mapId || !payload.userId) return;
    const now = Date.now();
    const last = lastCursorTs.get(payload.userId) ?? 0;
    if (now - last < CURSOR_DROP_INTERVAL_MS) {
      // drop — too soon after the previous emit from this user
      return;
    }
    lastCursorTs.set(payload.userId, now);

    const roomName = roomOf(payload.mapId);
    // refresh lastSeen in roster if present
    const roster = rooms.get(payload.mapId);
    if (roster) {
      const u = roster.get(payload.userId);
      if (u) {
        u.lastSeen = now;
        // also opportunistically patch display name/color in case the client
        // refreshed its identity
        if (payload.displayName) u.displayName = payload.displayName;
        if (payload.color) u.color = payload.color;
      }
    }

    // Broadcast to OTHERS only — the sender already knows its own cursor.
    socket.to(roomName).emit("cursor:move", {
      userId: payload.userId,
      displayName:
        payload.displayName ??
        (roster?.get(payload.userId)?.displayName ?? "Anónimo"),
      color:
        payload.color ?? (roster?.get(payload.userId)?.color ?? "#64748b"),
      x: payload.x,
      y: payload.y,
    });
  });

  // ── node:* / edge:* — fan out to others in the room ──────────────────────
  socket.on("node:update", (payload: NodeUpdatePayload) => {
    if (!payload || !payload.mapId || !payload.nodeId) return;
    socket.to(roomOf(payload.mapId)).emit("node:update", {
      nodeId: payload.nodeId,
      patch: payload.patch,
      userId: payload.userId,
    });
  });

  socket.on("node:add", (payload: NodeAddPayload) => {
    if (!payload || !payload.mapId || !payload.node) return;
    socket.to(roomOf(payload.mapId)).emit("node:add", {
      node: payload.node,
      userId: payload.userId,
    });
  });

  socket.on("node:delete", (payload: NodeDeletePayload) => {
    if (!payload || !payload.mapId || !payload.nodeId) return;
    socket.to(roomOf(payload.mapId)).emit("node:delete", {
      nodeId: payload.nodeId,
      userId: payload.userId,
    });
  });

  socket.on("edge:add", (payload: EdgeAddPayload) => {
    if (!payload || !payload.mapId || !payload.edge) return;
    socket.to(roomOf(payload.mapId)).emit("edge:add", {
      edge: payload.edge,
      userId: payload.userId,
    });
  });

  socket.on("edge:delete", (payload: EdgeDeletePayload) => {
    if (!payload || !payload.mapId || !payload.edgeId) return;
    socket.to(roomOf(payload.mapId)).emit("edge:delete", {
      edgeId: payload.edgeId,
      userId: payload.userId,
    });
  });

  // ── disconnect ──────────────────────────────────────────────────────────
  socket.on("disconnect", (reason) => {
    const userId = socketToUserId.get(socket.id);
    console.log(
      `[disconnect] ${socket.id}` +
        (userId ? ` (user ${userId})` : "") +
        ` — reason: ${reason}`
    );
    removeSocketFromAllRooms(io, socket.id);
    socketToUserId.delete(socket.id);
  });

  socket.on("error", (err) => {
    console.error(`[error] socket ${socket.id}:`, err);
  });
});

function mapName(mapId: string): string {
  return mapId.length > 12 ? mapId.slice(0, 8) + "…" : mapId;
}

httpServer.listen(PORT, () => {
  console.log(`collab-service listening on ${PORT}`);
  console.log(`  socket.io path: /`);
  console.log(`  cors: *`);
});

// ── Graceful shutdown ──────────────────────────────────────────────────────

function shutdown(signal: string) {
  console.log(`\n[collab-service] received ${signal}, shutting down…`);
  io.close(() => {
    httpServer.close(() => {
      console.log("[collab-service] closed");
      process.exit(0);
    });
  });
  // Force-exit after 3s if sockets don't close cleanly
  setTimeout(() => process.exit(0), 3000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
