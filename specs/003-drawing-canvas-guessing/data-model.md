# Data Model: Drawing Canvas, Guess Submission & Scoring

Extends phase 1-2's model (`backend/src/models/game.ts`). Only new/changed
fields are described; everything else (`Room.code`, `hostParticipantId`,
`drawerParticipantId`, `secretWord`, etc.) is unchanged.

## Stroke (new)

A single continuous pointer-drag drawing action.

| Field | Type | Notes |
|---|---|---|
| `points` | `{ x: number; y: number }[]` | Ordered points sampled along the pointer path from pointer-down to pointer-up. Coordinates are canvas-relative (not viewport-relative), so they render identically regardless of a client's window size. |

**Validation rules**:
- `points` MUST have at least 1 entry to be appended (a pointer-down with no
  movement before pointer-up is still a valid, single-point stroke — a dot).
- No upper bound on point count or stroke count per round (in-memory, lab
  scale — Constitution Principle VI's "bounded footprint" is satisfied by
  the room itself being removable, not by capping strokes).

**Lifecycle**: Created on drawer pointer-down, points appended on
pointer-move while pressed, finalized (appended to `Room.strokes`) on
pointer-up. The entire `Room.strokes` array is replaced with `[]` on a
drawer-triggered clear — strokes are otherwise immutable once finalized.

## GuessEntry (new)

A single guess submission, recorded in `Room.guesses` in submission order.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` (UUID) | Stable identity for the entry, mirroring `Participant.id`'s generation. |
| `participantId` | `string` | The submitting guesser's participant ID. |
| `text` | `string` | The trimmed guess text. Always stored; redaction (per the Clarifications session) happens only at `toRoomSnapshot` time, never at storage time. |
| `correct` | `boolean` | Result of the case-insensitive, trimmed comparison against `Room.secretWord` at submission time. |
| `submittedAt` | `string` (ISO 8601) | Same `now()` helper used elsewhere in `roomStore.ts`. |

**Validation rules** (enforced before an entry is created, at the Zod
boundary and in `roomStore`):
- The submitting participant MUST NOT be `Room.drawerParticipantId` (FR-009).
- The raw input, after `.trim()`, MUST be non-empty (FR-007/FR-008) — Zod's
  `z.string().trim().min(1, ...)` mirrors the existing `playerName` rule.

**Redaction rule applied per viewer in `toRoomSnapshot`** (not stored on the
entry itself): a viewer sees `text` only if they are the drawer, the
submitting guesser, or `entry.correct` is `true`; otherwise the viewer's
projected entry omits `text` and includes only `participantId` and
`correct: false`.

## Participant (extended)

| Field | Type | Notes |
|---|---|---|
| `score` | `number` | **New.** Non-negative integer, defaults to `0` at participant creation (`createParticipant`). Incremented by exactly `100` inside `submitGuess` whenever that participant's guess is `correct`; never decremented, never touched by any other action (drawing, clearing). |

`RoomSnapshotParticipant` (the redacted, viewer-facing shape) gains `score`
unconditionally — scores are never secret (per spec Assumptions), so no
viewer-specific branching is needed here, unlike `isDrawer`/`secretWord`.

## Room (extended)

| Field | Type | Notes |
|---|---|---|
| `strokes` | `Stroke[]` | **New.** Defaults to `[]`. Only mutated by the assigned drawer's draw/clear actions, and only while `status === "active"`. |
| `guesses` | `GuessEntry[]` | **New.** Defaults to `[]`. Append-only; never mutated or removed by a clear action (FR-006). |

## RoomSnapshot (extended, viewer-projected)

| Field | Type | Notes |
|---|---|---|
| `strokes` | `Stroke[]` | **New.** Identical for every viewer — drawing has no secrecy rule. |
| `guesses` | `GuessSnapshotEntry[]` | **New.** Per-viewer projection of `Room.guesses`, where `GuessSnapshotEntry` is `{ id, participantId, correct, text? }` — `text` present only per the redaction rule above. |

`RoomSnapshotParticipant.score` is added as described above.

## State Transitions

- **Stroke**: `(no stroke)` → `in-progress` (pointer-down) → `finalized,
  appended to Room.strokes` (pointer-up). A clear action transitions
  `Room.strokes` back to `[]` in one step; it does not affect in-progress
  strokes on the drawer's own client (the drawer cannot clear mid-stroke
  since drawing and clearing are both drawer-only, sequential UI actions).
- **GuessEntry**: created once, fully formed (`text`/`correct` both set at
  creation from the comparison against `Room.secretWord`), and never
  transitions again — there's no later edit, retraction, or "upgrade" of an
  entry's `correct` value.
- **Participant.score**: `0` at round start → `+100` per accepted correct
  guess from that participant, monotonically non-decreasing for the
  lifetime of the round (no scenario in this phase removes points).
