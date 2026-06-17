# Data Model: Player Name Validation, Drawer Assignment & Secret Word Visibility

## Entities

### Room (backend, `models/game.ts`) — extends phase 1

| Field | Type | Notes |
|---|---|---|
| `drawerParticipantId` | `string \| undefined` | NEW — set once, at successful start, to `room.hostParticipantId` (FR-004). Undefined while `status === "lobby"`. |
| `secretWord` | `string \| undefined` | NEW — set once, at successful start, via the room-code hash (FR-007, research.md). Undefined while `status === "lobby"`. |
| *(all phase-1 fields unchanged)* | | `code`, `status`, `participants`, `hostParticipantId`, `createdAt`, `updatedAt` |

### Participant (backend, `models/game.ts`) — unchanged

No new fields on the stored `Participant` itself — `isDrawer` is derived at
snapshot time from `room.drawerParticipantId`, the same pattern phase 1 used
for `isHost`, to avoid two sources of truth.

### RoomSnapshotParticipant (backend wire shape) — extends phase 1

| Field | Type | Notes |
|---|---|---|
| `isDrawer` | `boolean` | NEW — `participant.id === room.drawerParticipantId`. Public to every viewer (FR-006). |
| *(isHost, id, name, joinedAt)* | | Unchanged from phase 1. |

### RoomSnapshot (backend → frontend wire shape) — extends phase 1

| Field | Type | Notes |
|---|---|---|
| `secretWord` | `string \| undefined` | NEW — present only when the requesting `viewerParticipantId` is the drawer; omitted (not merely empty) for everyone else (FR-008/FR-009). |
| `availableWords` | `string[]` | MODIFIED behavior — full 5-word list only for the drawer; empty array for everyone else, including pre-start (FR-010). |
| *(status, code, participants, roles, canStart)* | | Unchanged shape from phase 1; `status` can now imply a round is active per phase 1's `"active"` value. |

## State Transitions

```
Room.drawerParticipantId: undefined --(successful POST /:code/start, first time)--> hostParticipantId
Room.secretWord:          undefined --(successful POST /:code/start, first time)--> hash(code) → STARTER_WORDS[index]
```

Both transitions happen exactly once per room, guarded by presence
(`if (!room.drawerParticipantId)`), and never change again within this
phase's scope (no drawer rotation, no re-rolled word — see research.md).

## Validation Rules (from Functional Requirements)

- Player name, on create and join: trim → reject if empty after trimming,
  with message "Player name is required" (FR-001/002/003).
- Secret word selection: pure function of `room.code` only — no random
  number generator, no timestamp input (FR-007, Edge Cases).
- Snapshot redaction: `secretWord` and a non-empty `availableWords` MUST
  NEVER appear in a response where `viewerParticipantId !== room.drawerParticipantId`,
  including for requests made outside the normal UI flow (FR-009/FR-010,
  Edge Cases — enforced server-side, not delegated to the client).
