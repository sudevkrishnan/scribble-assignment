# Contract: Rooms API (Phase 4 additions/changes)

Extends phase 3's contract (`specs/003-drawing-canvas-guessing/contracts/rooms-api.md`).
Only deltas are documented here.

## POST /rooms/:code/end-round (new)

Ends the active round, transitioning the room to the `"result"` status.
Host-only.

**Request**: `{ "participantId": string }`

**Response 200**:
```json
{ "room": { "...": "full RoomSnapshot, status now \"result\", secretWord and every guess's text now visible to every viewer" } }
```

**Errors**:
- `400` — `participantId` missing: `{ "message": "..." }` (Zod-derived).
- `403` — caller is not the room's host: `{ "message": "Only the host can end the round" }`.
- `404` — room not found: `{ "message": "Room not found" }`.
- `409` — room is not `active`: `{ "message": "Round is not active" }`.

## POST /rooms/:code/restart (new)

Restarts the room from the `"result"` status back to `"lobby"`,
preserving `participants` (id/name/host flag) and clearing
`drawerParticipantId`, `secretWord`, `strokes`, `guesses`, and every
participant's `score` (reset to `0`). Host-only.

**Request**: `{ "participantId": string }`

**Response 200**:
```json
{ "room": { "...": "full RoomSnapshot, status now \"lobby\", same participants, scores all 0, no drawer/secretWord/strokes/guesses" } }
```

**Errors**:
- `400` — `participantId` missing: `{ "message": "..." }` (Zod-derived).
- `403` — caller is not the room's host: `{ "message": "Only the host can restart the room" }`.
- `404` — room not found: `{ "message": "Room not found" }`.
- `409` — room is not in the `"result"` state (e.g., still active, or
  already back in the lobby): `{ "message": "Room is not in the result state" }`.

## GET /rooms/:code (response shape changes when `status === "result"`)

While `status === "result"`, `secretWord` and every entry in `guesses` are
unredacted for every viewer — the active-round redaction rules
(drawer-only `secretWord`, per-viewer guess-text visibility) no longer
apply. `availableWords` keeps its existing drawer-only rule (unrelated to
the result reveal). `strokes` and every participant's `score` were already
unredacted in every status.

**Response 200**, any viewer (host, drawer, or any guesser), after the
host has ended the round from the phase 3 contract example's state:
```json
{
  "room": {
    "code": "AB3D",
    "status": "result",
    "participants": [
      { "id": "uuid-host", "name": "Alice", "joinedAt": "...", "isHost": true, "isDrawer": true, "score": 0 },
      { "id": "uuid-bob", "name": "Bob", "joinedAt": "...", "isHost": false, "isDrawer": false, "score": 100 },
      { "id": "uuid-cara", "name": "Cara", "joinedAt": "...", "isHost": false, "isDrawer": false, "score": 0 }
    ],
    "availableWords": [],
    "roles": ["drawer", "guesser"],
    "canStart": true,
    "secretWord": "pizza",
    "strokes": [{ "points": [{ "x": 10, "y": 12 }, { "x": 14, "y": 16 }] }],
    "guesses": [
      { "id": "g1", "participantId": "uuid-bob", "correct": true, "text": "pizza" },
      { "id": "g2", "participantId": "uuid-cara", "correct": false, "text": "pasta" }
    ]
  }
}
```
Note `secretWord` is now present for every viewer (including Cara, a
non-drawer guesser, who could not see it during the active round), and
`g2`'s `text` is now visible to every viewer (it was hidden from everyone
but Cara and the drawer during the active round, per the phase 3
redaction rule).

**Response 200**, any viewer, after the host has then restarted the room:
```json
{
  "room": {
    "code": "AB3D",
    "status": "lobby",
    "participants": [
      { "id": "uuid-host", "name": "Alice", "joinedAt": "...", "isHost": true, "isDrawer": false, "score": 0 },
      { "id": "uuid-bob", "name": "Bob", "joinedAt": "...", "isHost": false, "isDrawer": false, "score": 0 },
      { "id": "uuid-cara", "name": "Cara", "joinedAt": "...", "isHost": false, "isDrawer": false, "score": 0 }
    ],
    "availableWords": [],
    "roles": ["drawer", "guesser"],
    "canStart": true,
    "strokes": [],
    "guesses": []
  }
}
```
Note `secretWord` is omitted entirely (matching its `string | undefined`
type — never serialized as `null`), the same three participants (same
`id`s) remain, all with `isDrawer: false`/`score: 0`, and `strokes`/
`guesses` are fully cleared with `status` back to `"lobby"` — identical in
shape to a freshly created room with three participants already joined.
