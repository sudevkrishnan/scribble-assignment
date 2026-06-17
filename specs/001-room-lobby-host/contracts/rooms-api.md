# Contract: Rooms API (Phase 1 additions/changes)

Base URL: `http://localhost:3001` (unchanged). All bodies are JSON.

## POST /rooms (unchanged request, modified response)

**Request**: `{ "playerName"?: string }` (unchanged)

**Response 201**:
```json
{
  "participantId": "uuid",
  "room": {
    "code": "AB3D",
    "status": "lobby",
    "participants": [{ "id": "uuid", "name": "Alice", "joinedAt": "...", "isHost": true }],
    "availableWords": [...],
    "roles": [...],
    "canStart": false
  }
}
```
Change: each participant now carries `isHost`; the creator's entry is
`isHost: true`. Top-level snapshot gains `canStart`.

## POST /rooms/:code/join (modified — distinct error cases)

**Request**: `{ "playerName"?: string }`

**Response 200**: same shape as create's `room`, joining participant has `isHost: false`.

**Errors**:

| Condition | Status | Body |
|---|---|---|
| Code is empty/whitespace-only | 400 | `{ "message": "Room code is required" }` |
| Code doesn't match the 4-char generation alphabet | 400 | `{ "message": "Room code is invalid" }` |
| Code is well-formed but no matching room | 404 | `{ "message": "Room not found" }` |

These three are distinguishable by status code, by message, or both — clients MUST be able to tell them apart per FR-004/005/006 and SC-002.

## GET /rooms/:code (modified response only)

Unchanged request shape (`participantId` query param). Response `room` gains `isHost` per participant and `canStart`, matching POST /rooms.

## POST /rooms/:code/start (NEW)

**Request**: `{ "participantId": string }`

**Response 200**:
```json
{ "room": { "...": "...", "status": "active", "canStart": true } }
```

**Errors**:

| Condition | Status | Body |
|---|---|---|
| `participantId` missing/blank | 400 | `{ "message": "participantId is required" }` |
| Room not found | 404 | `{ "message": "Room not found" }` |
| `participantId` is not the room's host | 403 | `{ "message": "Only the host can start the game" }` |
| Fewer than 2 participants | 409 | `{ "message": "At least 2 players are required to start" }` |

Enforced server-side regardless of caller (UI or otherwise), per the spec's
non-UI-path edge case. No drawer/word/round data is created by this
endpoint in this phase (see research.md).
