"use client";

import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { useMindMapStore } from "@/store/mindmap-store";
import type { MapNode, MapEdge } from "@/lib/types";

// ── Identity generation (PT-BR adjective + animal) ─────────────────────────

const ADJECTIVES = [
  "Sagaz",
  "Ágil",
  "Curioso",
  "Brilhante",
  "Audaz",
  "Calmo",
  "Criativo",
  "Sábio",
  "Veloz",
  "Astuto",
  "Perspicaz",
  "Tranquilo",
];

const ANIMALS = [
  "Coruja",
  "Raposa",
  "Lobo",
  "Gato",
  "Falcão",
  "Coelho",
  "Tigre",
  "Panda",
  "Leão",
  "Águia",
  "Pantera",
  "Golfinho",
];

const CURSOR_COLORS = [
  "#f43f5e", // rose
  "#f59e0b", // amber
  "#10b981", // emerald
  "#14b8a6", // teal
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#ef4444", // red
  "#84cc16", // lime
];

const SESSION_KEY = "collab-identity";

interface CollabIdentity {
  userId: string;
  displayName: string;
  color: string;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function loadOrCreateIdentity(): CollabIdentity {
  if (typeof window !== "undefined") {
    try {
      const raw = window.sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CollabIdentity;
        if (parsed.userId && parsed.displayName && parsed.color) {
          return parsed;
        }
      }
    } catch {
      /* ignore corrupt entry */
    }
  }
  const identity: CollabIdentity = {
    userId: `u-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    displayName: `${pick(ADJECTIVES)} ${pick(ANIMALS)}`,
    color: pick(CURSOR_COLORS),
  };
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(identity));
    } catch {
      /* ignore quota / privacy mode */
    }
  }
  return identity;
}

// ── Public types ───────────────────────────────────────────────────────────

export interface CollabUser {
  userId: string;
  displayName: string;
  color: string;
  lastSeen: number;
}

export interface RemoteCursor {
  userId: string;
  displayName: string;
  color: string;
  x: number;
  y: number;
}

export interface UseCollabResult {
  connected: boolean;
  users: CollabUser[];
  remoteCursors: RemoteCursor[];
  socket: Socket | null;
  identity: CollabIdentity | null;
}

// ── Hook ───────────────────────────────────────────────────────────────────

/**
 * useCollab — wires the local mind-map store to a socket.io collab service.
 *
 * Responsibilities:
 *  - Lazily loads socket.io-client only when enabled (initial bundle stays lean).
 *  - Connects via the Caddy gateway with `io("/?XTransformPort=3003")`.
 *  - Joins `room:<mapId>` on connect, leaves on unmount/mapId change.
 *  - Broadcasts local mouse position (throttled via rAF) as `cursor:move`.
 *  - Listens for `presence:update`, `cursor:move`, `node:*`, `edge:*`.
 *  - Applies remote node/edge mutations to the Zustand store, with a
 *    `suppressEmit` flag so we don't re-broadcast echoes of our own changes.
 *  - Subscribes to the local store and emits `node:*`/`edge:*` to others
 *    (debounced via microtask batching) — again skipping if the change was
 *    triggered by an incoming remote event.
 */
export function useCollab(
  mapId: string | null,
  enabled: boolean
): UseCollabResult {
  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState<CollabUser[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [identity, setIdentity] = useState<CollabIdentity | null>(null);

  // Refs for things that event handlers need to read without re-binding.
  const socketRef = useRef<Socket | null>(null);
  const identityRef = useRef<CollabIdentity | null>(null);
  const mapIdRef = useRef<string | null>(mapId);
  const remoteCursorsRef = useRef<RemoteCursor[]>([]);
  const suppressingEmitRef = useRef(false);

  // Snapshot of last-seen nodes/edges for diffing local changes.
  const lastNodesRef = useRef<Map<string, MapNode>>(new Map());
  const lastEdgesRef = useRef<Map<string, MapEdge>>(new Map());

  // Pending batch of emits for the next microtask flush.
  const pendingEmitsRef = useRef<
    Array<() => void>
  >([]);
  const flushScheduledRef = useRef(false);

  // ── Update mapId ref when prop changes ──────────────────────────────────
  useEffect(() => {
    mapIdRef.current = mapId;
  }, [mapId]);

  // ── Cursor throttling via rAF ───────────────────────────────────────────
  const cursorRafRef = useRef<number | null>(null);
  const pendingCursorRef = useRef<{ x: number; y: number } | null>(null);

  function flushCursor() {
    cursorRafRef.current = null;
    const pos = pendingCursorRef.current;
    const sock = socketRef.current;
    const ident = identityRef.current;
    const mid = mapIdRef.current;
    if (!pos || !sock || !ident || !mid || !sock.connected) {
      pendingCursorRef.current = null;
      return;
    }
    pendingCursorRef.current = null;
    sock.emit("cursor:move", {
      mapId: mid,
      userId: ident.userId,
      displayName: ident.displayName,
      color: ident.color,
      x: pos.x,
      y: pos.y,
    });
  }

  function scheduleCursorEmit(x: number, y: number) {
    pendingCursorRef.current = { x, y };
    if (cursorRafRef.current == null) {
      cursorRafRef.current = window.requestAnimationFrame(flushCursor);
    }
  }

  // ── Diff + emit helpers ─────────────────────────────────────────────────

  function scheduleEmit(fn: () => void) {
    pendingEmitsRef.current.push(fn);
    if (!flushScheduledRef.current) {
      flushScheduledRef.current = true;
      queueMicrotask(flushEmits);
    }
  }

  function flushEmits() {
    flushScheduledRef.current = false;
    const sock = socketRef.current;
    const ident = identityRef.current;
    const mid = mapIdRef.current;
    if (!sock || !sock.connected || !ident || !mid) {
      pendingEmitsRef.current = [];
      return;
    }
    if (suppressingEmitRef.current) {
      // A remote change is currently being applied — skip this flush entirely
      // so we don't echo it back.
      pendingEmitsRef.current = [];
      return;
    }
    const fns = pendingEmitsRef.current;
    pendingEmitsRef.current = [];
    for (const fn of fns) {
      try {
        fn();
      } catch {
        /* swallow individual emit failures */
      }
    }
  }

  function snapshotStore() {
    const { nodes, edges } = useMindMapStore.getState();
    lastNodesRef.current = new Map(nodes.map((n) => [n.id, n]));
    lastEdgesRef.current = new Map(edges.map((e) => [e.id, e]));
  }

  function diffAndEmitLocal() {
    if (suppressingEmitRef.current) return;
    const sock = socketRef.current;
    const ident = identityRef.current;
    const mid = mapIdRef.current;
    if (!sock || !ident || !mid) return;

    const { nodes, edges } = useMindMapStore.getState();
    const prevNodes = lastNodesRef.current;
    const prevEdges = lastEdgesRef.current;

    // ── nodes ──
    const curNodeIds = new Set<string>();
    for (const n of nodes) {
      curNodeIds.add(n.id);
      const prev = prevNodes.get(n.id);
      if (!prev) {
        // added
        scheduleEmit(() =>
          sock.emit("node:add", { mapId: mid, node: n, userId: ident.userId })
        );
      } else {
        // compute patch (only fields that actually changed)
        const patch: Partial<MapNode> = {};
        const keys = Object.keys(prev) as Array<keyof MapNode>;
        let changed = false;
        for (const k of keys) {
          // @ts-expect-error dynamic key compare on stringifiable fields
          if (prev[k] !== n[k]) {
            // @ts-expect-error dynamic key assign
            patch[k] = n[k];
            changed = true;
          }
        }
        // also catch new fields that didn't exist on prev
        for (const k of Object.keys(n) as Array<keyof MapNode>) {
          if (!(k in prev)) {
            // @ts-expect-error dynamic key assign
            patch[k] = n[k];
            changed = true;
          }
        }
        if (changed) {
          scheduleEmit(() =>
            sock.emit("node:update", {
              mapId: mid,
              nodeId: n.id,
              patch,
              userId: ident.userId,
            })
          );
        }
      }
    }
    // deleted
    for (const [id] of prevNodes) {
      if (!curNodeIds.has(id)) {
        const nodeId = id;
        scheduleEmit(() =>
          sock.emit("node:delete", {
            mapId: mid,
            nodeId,
            userId: ident.userId,
          })
        );
      }
    }

    // ── edges ──
    const curEdgeIds = new Set<string>();
    for (const e of edges) {
      curEdgeIds.add(e.id);
      const prev = prevEdges.get(e.id);
      if (!prev) {
        scheduleEmit(() =>
          sock.emit("edge:add", { mapId: mid, edge: e, userId: ident.userId })
        );
      }
    }
    for (const [id] of prevEdges) {
      if (!curEdgeIds.has(id)) {
        const edgeId = id;
        scheduleEmit(() =>
          sock.emit("edge:delete", {
            mapId: mid,
            edgeId,
            userId: ident.userId,
          })
        );
      }
    }

    // refresh snapshot for the next diff
    lastNodesRef.current = new Map(nodes.map((n) => [n.id, n]));
    lastEdgesRef.current = new Map(edges.map((e) => [e.id, e]));
  }

  // ── Main connect/disconnect effect ──────────────────────────────────────
  useEffect(() => {
    if (!enabled || !mapId) {
      // tear down any existing socket if disabled or no map
      if (socketRef.current) {
        try {
          const ident = identityRef.current;
          const mid = mapIdRef.current;
          if (ident && mid && socketRef.current.connected) {
            socketRef.current.emit("leave", {
              mapId: mid,
              userId: ident.userId,
            });
          }
        } catch {
          /* ignore */
        }
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
        setUsers([]);
        setRemoteCursors([]);
        remoteCursorsRef.current = [];
      }
      return;
    }

    let cancelled = false;
    let unsubStore: (() => void) | null = null;
    let mouseHandler: ((e: MouseEvent) => void) | null = null;

    (async () => {
      // Lazy-load socket.io-client so it's not in the initial bundle.
      const { io } = await import("socket.io-client");
      if (cancelled) return;

      const ident = loadOrCreateIdentity();
      identityRef.current = ident;
      setIdentity(ident);

      const sock = io("/?XTransformPort=3003", {
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 10000,
      });
      socketRef.current = sock;
      setSocket(sock);

      // snapshot the store so the first diff doesn't emit `node:add` for
      // every existing node.
      snapshotStore();

      sock.on("connect", () => {
        setConnected(true);
        sock.emit("join", {
          mapId,
          userId: ident.userId,
          displayName: ident.displayName,
          color: ident.color,
        });
      });

      sock.on("disconnect", () => {
        setConnected(false);
        // clear remote cursors on disconnect so we don't show stale ghosts
        setRemoteCursors([]);
        remoteCursorsRef.current = [];
        setUsers([]);
      });

      sock.on("connect_error", (err) => {
        // Don't crash — collab is best-effort. Log for debugging.
        console.warn("[collab] connect_error:", err.message);
      });

      // ── presence ──
      sock.on("presence:update", (data: { users: CollabUser[] }) => {
        if (!data || !Array.isArray(data.users)) return;
        setUsers(data.users);
      });

      // ── cursor:move (from others) ──
      sock.on("cursor:move", (c: RemoteCursor) => {
        if (!c || !c.userId) return;
        const identLocal = identityRef.current;
        if (identLocal && c.userId === identLocal.userId) return; // safety net
        const next = remoteCursorsRef.current.filter(
          (rc) => rc.userId !== c.userId
        );
        next.push({
          userId: c.userId,
          displayName: c.displayName,
          color: c.color,
          x: c.x,
          y: c.y,
        });
        remoteCursorsRef.current = next;
        setRemoteCursors(next);
      });

      // ── node / edge events from others ──
      // All handlers wrap their store mutation in `suppressingEmitRef` so the
      // local store-subscriber (which diffs + emits to others) skips the
      // change — preventing an infinite echo loop. Zustand fires subscribers
      // synchronously during `set`, so by the time `updateNode`/`addNode`/
      // etc. return, the diff has already run (and bailed). We then refresh
      // our diff-snapshot so the next real local change is correctly diffed
      // against the post-remote state, and clear the suppress flag.
      sock.on("node:update", (p: {
        nodeId: string;
        patch: Partial<MapNode>;
        userId: string;
      }) => {
        if (!p || !p.nodeId) return;
        const identLocal = identityRef.current;
        if (identLocal && p.userId === identLocal.userId) return; // echo of own change
        suppressingEmitRef.current = true;
        try {
          useMindMapStore.getState().updateNode(p.nodeId, p.patch);
        } finally {
          snapshotStore();
          suppressingEmitRef.current = false;
        }
      });

      sock.on("node:add", (p: { node: MapNode; userId: string }) => {
        if (!p || !p.node) return;
        const identLocal = identityRef.current;
        if (identLocal && p.userId === identLocal.userId) return;
        suppressingEmitRef.current = true;
        try {
          const exists = useMindMapStore
            .getState()
            .nodes.some((n) => n.id === p.node.id);
          if (!exists) {
            useMindMapStore.getState().addNode(
              p.node as Partial<MapNode> & { title: string }
            );
          }
        } finally {
          snapshotStore();
          suppressingEmitRef.current = false;
        }
      });

      sock.on("node:delete", (p: { nodeId: string; userId: string }) => {
        if (!p || !p.nodeId) return;
        const identLocal = identityRef.current;
        if (identLocal && p.userId === identLocal.userId) return;
        suppressingEmitRef.current = true;
        try {
          useMindMapStore.getState().deleteNode(p.nodeId);
        } finally {
          snapshotStore();
          suppressingEmitRef.current = false;
        }
      });

      sock.on("edge:add", (p: { edge: MapEdge; userId: string }) => {
        if (!p || !p.edge) return;
        const identLocal = identityRef.current;
        if (identLocal && p.userId === identLocal.userId) return;
        suppressingEmitRef.current = true;
        try {
          const exists = useMindMapStore
            .getState()
            .edges.some((e) => e.id === p.edge.id);
          if (!exists) {
            const e = p.edge;
            useMindMapStore
              .getState()
              .addEdge(e.sourceId, e.targetId, e.kind, e.label ?? undefined);
          }
        } finally {
          snapshotStore();
          suppressingEmitRef.current = false;
        }
      });

      sock.on("edge:delete", (p: { edgeId: string; userId: string }) => {
        if (!p || !p.edgeId) return;
        const identLocal = identityRef.current;
        if (identLocal && p.userId === identLocal.userId) return;
        suppressingEmitRef.current = true;
        try {
          useMindMapStore.getState().deleteEdge(p.edgeId);
        } finally {
          snapshotStore();
          suppressingEmitRef.current = false;
        }
      });

      // ── local mouse → cursor:move ──
      mouseHandler = (e: MouseEvent) => {
        if (!sock.connected) return;
        const vp = useMindMapStore.getState().viewport;
        // world = (screen - viewport) / zoom
        const wx = (e.clientX - vp.x) / vp.zoom;
        const wy = (e.clientY - vp.y) / vp.zoom;
        scheduleCursorEmit(wx, wy);
      };
      window.addEventListener("mousemove", mouseHandler, { passive: true });

      // ── subscribe to local store changes ──
      unsubStore = useMindMapStore.subscribe(() => {
        diffAndEmitLocal();
      });
    })();

    return () => {
      cancelled = true;
      // tear down listeners + disconnect
      if (mouseHandler) {
        window.removeEventListener("mousemove", mouseHandler);
        mouseHandler = null;
      }
      if (cursorRafRef.current != null) {
        window.cancelAnimationFrame(cursorRafRef.current);
        cursorRafRef.current = null;
      }
      if (unsubStore) {
        unsubStore();
        unsubStore = null;
      }
      const sock = socketRef.current;
      const ident = identityRef.current;
      if (sock) {
        try {
          if (ident && mapId && sock.connected) {
            sock.emit("leave", { mapId, userId: ident.userId });
          }
        } catch {
          /* ignore */
        }
        sock.removeAllListeners();
        sock.disconnect();
      }
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
      setUsers([]);
      setRemoteCursors([]);
      remoteCursorsRef.current = [];
      pendingEmitsRef.current = [];
      flushScheduledRef.current = false;
      pendingCursorRef.current = null;
    };
  }, [enabled, mapId]);

  return { connected, users, remoteCursors, socket, identity };
}
