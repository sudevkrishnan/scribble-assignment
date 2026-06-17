# Contract: Rooms API (Phase 2 additions/changes)

Extends phase 1's contract (`specs/001-room-lobby-host/contracts/rooms-api.md`).
Only deltas are documented here.

## POST /rooms (request validation tightened)

**Request**: `{ "playerName": string }` — now **required**, trimmed, and
must be non-empty after trimming.

**New error** (400, replaces silent "Player" fallback):
```json
{ "message": "Player name is required" }
```
Triggered by an absent, empty, or whitespace-only `playerName`.

**Response 201** (room shape changes — see below).

## POST /rooms/:code/join (request validation tightened)

**Request**: `{ "playerName": string }` — same tightened rule as create.

**New error** (400): identical body/condition as create's.

(Phase 1's three join-by-code errors — required/invalid/not-found — are
unchanged.)

## POST /rooms/:code/start (response shape changes only — same status codes as phase 1)

On success, the returned `room` now has `drawerParticipantId` reflected via
each participant's `isDrawer`, and the caller (the host, who is always the
drawer) receives `secretWord` and the full `availableWords` list in the same
response, since the host is starting the round and is the drawer.

## GET /rooms/:code (response shape changes — redaction)

**Response 200**, viewer is the drawer:
```json
{
  "room": {
    "code": "AB3D",
    "status": "active",
    "participants": [
      { "id": "uuid-host", "name": "Alice", "joinedAt": "...", "isHost": true, "isDrawer": true },
      { "id": "uuid-guest", "name": "Bob", "joinedAt": "...", "isHost": false, "isDrawer": false }
    ],
    "availableWords": ["rocket", "pizza", "castle", "guitar", "sunflower"],
    "roles": ["drawer", "guesser"],
    "canStart": true,
    "secretWord": "pizza"
  }
}
```

**Response 200**, viewer is NOT the drawer (same room, same instant):
```json
{
  "room": {
    "code": "AB3D",
    "status": "active",
    "participants": [
      { "id": "uuid-host", "name": "Alice", "joinedAt": "...", "isHost": true, "isDrawer": true },
      { "id": "uuid-guest", "name": "Bob", "joinedAt": "...", "isHost": false, "isDrawer": false }
    ],
    "availableWords": [],
    "roles": ["drawer", "guesser"],
    "canStart": true
  }
}
```
Note `secretWord` is absent entirely (not `null`, not empty string) and
`availableWords` is `[]` — verifiable by asserting the key is missing /
the array has zero length, per FR-009/FR-010.

Before the round starts (`status: "lobby"`), every viewer's response omits
`secretWord` and has an empty `availableWords`, since no drawer is assigned
yet.
