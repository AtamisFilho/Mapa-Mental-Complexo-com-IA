# Task 9-C — Real-time collaboration (socket.io mini-service + presence/cursors)

Agent: full-stack-developer
Task ID: 9-C

## What was built

1. **Mini-service `mini-services/collab-service/`** (independent bun project, port 3003):
   - `package.json` — name `collab-service`, type `module`, scripts: `{ "dev": "bun --hot index.ts" }`, dep `socket.io@4.8.3`
   - `index.ts` — socket.io server on **port 3003** (hardcoded), CORS `*`, path `/`, ping 25s/60s
   - In-memory roster `Map<mapId, Map<userId, RoomUser>>` + reverse `socketId → Set<mapId>` for cleanup
   - Cursor throttle: drops `cursor:move` if same `userId` moved <16ms ago (≈60fps cap)
   - Graceful shutdown on SIGTERM/SIGINT
   - `README.md` — protocol reference + run instructions

2. **`src/hooks/use-collab.ts`** — `useCollab(mapId, enabled)` hook:
   - Lazy dynamic import: `await import("socket.io-client")` (keeps initial bundle lean)
   - Connects with `io("/?XTransformPort=3003", { transports: ["websocket"] })` — never an absolute URL
   - Identity (userId, displayName, color) persisted in `sessionStorage` under `collab-identity`
   - PT-BR display name: random `{adjective} {animal}` (12 × 12 = 144 combinations)
   - 8-color cursor palette (rose, amber, emerald, teal, violet, pink, red, lime)
   - Emits `join` on connect, `leave` on unmount/mapId-change/disabled
   - `mousemove` → world coords via store viewport → `cursor:move` (throttled via `requestAnimationFrame`)
   - Listens for `presence:update`, `cursor:move`, `node:update`, `node:add`, `node:delete`, `edge:add`, `edge:delete`
   - Returns `{ connected, users, remoteCursors, socket, identity }`
   - **Feedback-loop prevention**: `suppressingEmitRef` flag set around remote-applied store mutations; Zustand fires subscribers synchronously during `set`, so the local diff subscriber sees the flag and skips re-emit. After the mutation returns, `snapshotStore()` refreshes the diff baseline and the flag is cleared.
   - Local store changes are diffed against a per-id snapshot and emitted via microtask-batched `scheduleEmit` (one flush per tick, multiple emit calls if multiple changes).

3. **`src/components/mindmap/RemoteCursors.tsx`**:
   - Renders remote cursors as absolutely-positioned floating divs over the canvas
   - Each cursor: colored arrow/pin SVG (drop-shadow) + colored pill label with display name
   - `screenX = worldX * zoom + viewport.x`, `screenY = worldY * zoom + viewport.y`
   - Reads `viewport` from `useMindMapStore` and `reducedMotion` from `useSettingsStore`
   - Framer Motion `animate` on `x/y` for spring-based smooth interpolation (or snap when reduced-motion is on)
   - `AnimatePresence` for enter/exit fade
   - Off-screen cursors (>200px outside viewport) are skipped for perf
   - Container `pointer-events: none` + `z-40` so it overlays but doesn't block canvas

4. **`src/lib/settings.ts`** (edited):
   - Added `collab: boolean` to `editor` category in `FeatureSettings` interface
   - Default `false` in `DEFAULT_SETTINGS.editor.collab`
   - Added toggle metadata to `SETTING_CATEGORIES.editor.toggles`:
     ```
     { key: "collab", label: "Colaboração em tempo real",
       description: "Mostra cursores de outros utilizadores a editar o mesmo mapa (requer serviço de collab ativo)." }
     ```
   - `settings-store.ts` already deep-merges persisted state with `DEFAULT_SETTINGS` (version 3), so existing users automatically get `collab: false` without bumping the version.

## Socket.io event protocol

### Client → Server

| Event         | Payload                                                          |
| ------------- | ---------------------------------------------------------------- |
| `join`        | `{ mapId, userId, displayName, color }`                          |
| `leave`       | `{ mapId, userId }`                                              |
| `cursor:move` | `{ mapId, userId, x, y, displayName?, color? }` (world coords)   |
| `node:update` | `{ mapId, nodeId, patch, userId }`                               |
| `node:add`    | `{ mapId, node, userId }`                                        |
| `node:delete` | `{ mapId, nodeId, userId }`                                      |
| `edge:add`    | `{ mapId, edge, userId }`                                        |
| `edge:delete` | `{ mapId, edgeId, userId }`                                      |

### Server → Client

| Event              | Payload                                                              | Recipient            |
| ------------------ | -------------------------------------------------------------------- | -------------------- |
| `presence:update`  | `{ mapId, users: [{ userId, displayName, color, lastSeen }] }`       | Whole room           |
| `cursor:move`      | `{ userId, displayName, color, x, y }`                               | Others in room only  |
| `node:update`      | `{ nodeId, patch, userId }`                                          | Others in room only  |
| `node:add`         | `{ node, userId }`                                                   | Others in room only  |
| `node:delete`      | `{ nodeId, userId }`                                                 | Others in room only  |
| `edge:add`         | `{ edge, userId }`                                                   | Others in room only  |
| `edge:delete`      | `{ edgeId, userId }`                                                 | Others in room only  |

Rooms: each map is a socket.io room named `room:<mapId>`.

## How to run the mini-service

```bash
cd mini-services/collab-service
bun install        # first time
bun run dev        # bun --hot index.ts — auto-restart on change
# → "collab-service listening on 3003"
```

Already started in background as PID 2598. Verified:
- `curl http://localhost:3003/socket.io/?EIO=4&transport=polling` → HTTP 200
- `pgrep -af "bun --hot index.ts"` → 2598

## Integration notes (for main agent)

- `useCollab(mapId, settings.editor.collab)` should be called near the top of `page.tsx` (or inside `MindMapCanvas`). The hook returns `{ connected, users, remoteCursors, socket, identity }`.
- `<RemoteCursors cursors={remoteCursors} />` should be rendered as a sibling of `<MindMapCanvas />` inside the same `relative` container — it's `position: absolute`, `inset-0`, `pointer-events: none`.
- Optional: render a small presence badge somewhere visible (e.g. top-right corner) showing `users.length` online + their colored dots + display names. Not implemented here — left to main agent's discretion.

## Lint

- `bun run lint` → **exit 0, 0 warnings, 0 errors** ✓
- Pre-existing tsc errors in `MapEdges.tsx`, `NodeEditor.tsx`, `use-toast-notify.ts` were NOT touched.

## Issues encountered

- None. All deliverables completed cleanly. The trickiest part was the feedback-loop prevention: Zustand fires subscribers synchronously during `set`, so wrapping remote-applied mutations in `suppressingEmitRef = true`/`false` with a `snapshotStore()` refresh right after the mutation returns is sufficient to prevent echoes — no microtask gymnastics needed.

## Files created / modified

- **Created** `mini-services/collab-service/package.json`
- **Created** `mini-services/collab-service/index.ts`
- **Created** `mini-services/collab-service/README.md`
- **Created** `mini-services/collab-service/bun.lock` (via `bun add socket.io`)
- **Created** `mini-services/collab-service/node_modules/` (socket.io + ~22 transitive deps)
- **Created** `src/hooks/use-collab.ts`
- **Created** `src/components/mindmap/RemoteCursors.tsx`
- **Modified** `src/lib/settings.ts` (added `collab: boolean` field + default + toggle metadata)
- **Started** collab-service in background (PID 2598, listening on port 3003)
