# Data Model: Round Result, Host Restart & Final Validation

Extends phases 1-3's model (`backend/src/models/game.ts`). Only
new/changed members are described; everything else (`Stroke`,
`GuessEntry`, `Participant.score`, etc.) is unchanged in shape.

## RoomStatus (extended)

| Before | After |
|---|---|
| `"lobby" \| "active"` | `"lobby" \| "active" \| "result"` |

**State transitions**:

```text
lobby --(startGame, host, >=2 participants)--> active
active --(endRound, host)--> result
result --(restartRoom, host)--> lobby
```

- `lobby → active`: unchanged from phase 2 (`startGame`).
- `active → result`: **new**. Only the host may trigger it
  (`endRound`), only while `status === "active"`. No other field changes —
  `strokes`, `guesses`, and every `score` are left exactly as they were at
  the moment of transition, since the result view is required to show them.
- `result → lobby`: **new**. Only the host may trigger it
  (`restartRoom`), only while `status === "result"`. Side effects (see
  Room below) clear all round-specific fields.
- No other transitions are valid: `restartRoom` while `status !== "result"`
  and `endRound` while `status !== "active"` are both rejected, never
  silently ignored or auto-corrected.

## Room (extended — fields unchanged, redaction/transition rules extended)

| Field | Type | Notes |
|---|---|---|
| `status` | `RoomStatus` | Now three-valued; see transitions above. |

**On a successful `restartRoom`** (`result → lobby`), the following
existing fields are reset, in place, on the same `Room` record (no new
`Room` object, no participant list replacement):

| Field | Reset to |
|---|---|
| `drawerParticipantId` | `undefined` |
| `secretWord` | `undefined` |
| `strokes` | `[]` |
| `guesses` | `[]` |
| every `Participant.score` in `participants` | `0` |

`participants` itself (the array of `Participant` records — `id`, `name`,
`joinedAt`) and `hostParticipantId` are **not** touched by restart — this
is what "players preserved" means concretely.

**On a successful `endRound`** (`active → result`), no field other than
`status` changes — the result view's job is to display `strokes`,
`guesses`, every `score`, and `secretWord` exactly as they stood at the
end of the round.

## RoomSnapshot (redaction rule extended)

The existing per-viewer redaction in `toRoomSnapshot()` (drawer sees
`secretWord`/`availableWords`; a guesser's own/correct guesses show
`text`, others don't) applies **only while `status === "active"`**. When
`status === "result"`:

| Field | Active-round rule | Result-state rule |
|---|---|---|
| `secretWord` | Drawer only | **Every viewer**, unconditionally |
| `availableWords` | Drawer only | Unchanged (drawer only) — not part of the result reveal, the candidate-word pool was never part of "what happened this round" |
| `guesses[].text` | Drawer, own entries, or `correct: true` entries | **Every entry, every viewer**, unconditionally |

`strokes` and every participant's `score` were already unredacted in every
status — unchanged.

No new fields are added to `RoomSnapshot` — the result view is the same
shape as the active-round snapshot, just with `status: "result"` and wider
visibility on the two fields above.

## Validation rules for the two new actions

- **`endRound(code, participantId)`**: rejects if room not found
  (`not_found`), if `participantId !== room.hostParticipantId`
  (`not_host`), or if `room.status !== "active"` (`not_active`). On
  success, sets `status = "result"` only.
- **`restartRoom(code, participantId)`**: rejects if room not found
  (`not_found`), if `participantId !== room.hostParticipantId`
  (`not_host`), or if `room.status !== "result"` (`not_result`). On
  success, applies the field resets listed above and sets
  `status = "lobby"`.

Both checks mirror `startGame`'s existing `hostParticipantId` comparison —
no new identity/authorization mechanism is introduced.
