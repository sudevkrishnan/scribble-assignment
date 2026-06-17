# Data Model: Room Setup, Host Assignment & Lobby Sync

## Entities

### Room (backend, `models/game.ts`)

| Field | Type | Notes |
|---|---|---|
| `code` | `string` | Existing. 4-char code from the fixed alphabet (see research.md). Unique key in the `rooms` Map. |
| `status` | `"lobby" \| "active"` | MODIFIED — adds `"active"`, set once the host successfully starts (FR-010/011). Future phases will extend this union further. |
| `participants` | `Participant[]` | Existing. |
| `hostParticipantId` | `string` | NEW — the `id` of the participant who created the room (FR-001, FR-009). Set once at creation; never reassigned in this phase (per spec Assumptions). |
| `createdAt` / `updatedAt` | `string` | Existing. |

### Participant (backend, `models/game.ts`)

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Existing (`randomUUID()`). |
| `name` | `string` | Existing. |
| `joinedAt` | `string` | Existing. |

No new fields on `Participant` itself — host-ness is derived (`participant.id === room.hostParticipantId`), not stored redundantly per-participant, to avoid two sources of truth.

### RoomSnapshot (backend → frontend wire shape, `models/game.ts` / `frontend/src/services/api.ts`)

| Field | Type | Notes |
|---|---|---|
| `code` | `string` | Existing. |
| `status` | `"lobby" \| "active"` | MODIFIED, mirrors Room. |
| `participants` | `(Participant & { isHost: boolean })[]` | MODIFIED — each participant entry gains a computed `isHost` flag so the frontend never has to compare IDs itself. |
| `availableWords` / `roles` | unchanged | Existing, untouched by this phase. |
| `canStart` | `boolean` | NEW — computed server-side: `participants.length >= 2`. Lets the frontend render the disabled-with-reason state (FR-012) without re-deriving the rule. |

### Client-side identity record (frontend, `sessionStorage`)

Stored under key `scribble:room:<code>`, value:

```json
{ "participantId": "uuid", "isHost": true }
```

Written on successful create/join; read on app load to attempt reattachment
(FR-014); cleared when a `404` (not-found) response is received for that
code, per the spec's stale-identity edge case.

## State Transitions

```
Room.status: "lobby" --(POST /rooms/:code/start, host + ≥2 participants)--> "active"
```

No other transitions are in scope for this phase. `"active"` is a terminal
state for this feature; the next phase's spec owns what happens after it.

## Validation Rules (from Functional Requirements)

- Room code, on join: trim → reject empty (FR-004) → validate against fixed
  alphabet/length (FR-005) → look up (FR-006).
- Start: caller's `participantId` MUST equal `room.hostParticipantId`
  (FR-010); `room.participants.length >= 2` (FR-011); both checked
  server-side regardless of UI state (Edge Cases).
