# collab-service

Real-time collaboration mini-service (presence + remote cursors + node/edge
sync) for the **Mapa Mental Complexo com IA** app.

It is a standalone [Bun](https://bun.sh) project running a
[socket.io](https://socket.io) server on **port 3003** (hardcoded — do not
change, the Caddy gateway on `:81` routes `?XTransformPort=3003` here).

## Run

```bash
cd mini-services/collab-service
bun install      # first time only
bun run dev      # bun --hot index.ts — auto-restart on file change
```

You should see:

```
collab-service listening on 3003
```

## How it integrates with the app

The Next.js frontend connects via the **Caddy gateway** with:

```ts
io("/?XTransformPort=3003", { transports: ["websocket"] });
```

`io("http://localhost:3003")` will **NOT** work — Caddy only exposes port
`:81` externally, and the gateway uses the `XTransformPort` query param to
forward to the right internal port.

## Protocol

### Client → Server

| Event         | Payload                                                       |
| ------------- | ------------------------------------------------------------- |
| `join`        | `{ mapId, userId, displayName, color }`                       |
| `leave`       | `{ mapId, userId }`                                           |
| `cursor:move` | `{ mapId, userId, x, y, displayName?, color? }` (world coords) |
| `node:update` | `{ mapId, nodeId, patch, userId }`                            |
| `node:add`    | `{ mapId, node, userId }`                                     |
| `node:delete` | `{ mapId, nodeId, userId }`                                   |
| `edge:add`    | `{ mapId, edge, userId }`                                     |
| `edge:delete` | `{ mapId, edgeId, userId }`                                   |

### Server → Client

| Event              | Payload                                                       | Recipient           |
| ------------------ | ------------------------------------------------------------- | ------------------- |
| `presence:update`  | `{ mapId, users: [{ userId, displayName, color, lastSeen }] }`| Whole room          |
| `cursor:move`      | `{ userId, displayName, color, x, y }`                        | Others in room only |
| `node:update`      | `{ nodeId, patch, userId }`                                   | Others in room only |
| `node:add`         | `{ node, userId }`                                            | Others in room only |
| `node:delete`      | `{ nodeId, userId }`                                          | Others in room only |
| `edge:add`         | `{ edge, userId }`                                            | Others in room only |
| `edge:delete`      | `{ edgeId, userId }`                                          | Others in room only |

## Behaviour notes

- **Rooms**: each map is a socket.io room named `room:<mapId>`.
- **In-memory roster**: `Map<mapId, Map<userId, RoomUser>>`. **Not persisted**
  — restarting the service drops all presence; clients re-join automatically
  on reconnect.
- **Cursor throttling**: the server drops a `cursor:move` packet if it arrives
  <16ms after the previous one from the same `userId`. This caps each user's
  cursor traffic at ~60fps (the client already throttles with rAF to ~30fps).
- **Self-echo prevention**: `cursor:move`, `node:*`, and `edge:*` events are
  broadcast with `socket.to(room)` (i.e. **not** to the sender) so the
  originating client doesn't get its own change echoed back.
- **Disconnect cleanup**: on disconnect, the user is removed from every room
  they were in and a fresh `presence:update` is broadcast for each affected
  room.
