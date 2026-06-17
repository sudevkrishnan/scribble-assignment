# Research: Round Result, Host Restart & Final Validation

No `NEEDS CLARIFICATION` markers remain in the plan's Technical Context —
this phase reuses the stack, patterns, and constraints already established
in phases 1-3 (`backend/` + `frontend/`, Express/Zod, React/react-router,
in-memory `Room` store, ~2s polling). The items below record the small set
of decisions specific to this feature.

## Decision: Result is a `Room.status` value, not a new entity

**Decision**: Add `"result"` as a third member of `RoomStatus` (alongside
existing `"lobby"` | `"active"`), rather than introducing a separate
`RoundResult` record or a boolean flag on `Room`.

**Rationale**: Every value the result view needs (secret word, scores,
guess history) already exists on `Room`/`Participant`. A status value is
the minimal change that lets `toRoomSnapshot()` branch its redaction logic
exactly the way it already branches on `"active"` vs `"lobby"`, and lets
the frontend route on `room.status` exactly as `LobbyPage`/`GamePage`
already do. No data model migration, no new collection.

**Alternatives considered**:
- A separate `roundEndedAt`/`isResult` boolean alongside `status: "active"`:
  rejected — it would require every consumer of `status` to also check a
  second flag, doubling the branching surface for no benefit over a single
  three-value union.
- A `RoomHistory`/`pastRounds` array recording each completed round:
  rejected — out of scope (the constitution and README explicitly exclude
  multi-round history/persistence beyond the current round; restart fully
  clears state rather than archiving it).

## Decision: Result-state redaction bypass lives in `toRoomSnapshot`

**Decision**: `toRoomSnapshot()` gains one additional branch: when
`room.status === "result"`, every viewer gets `secretWord` and every
`guesses[].text`, unconditionally — overriding the `viewerIsDrawer` /
`guess.correct` / "is this my own guess" checks that govern the `"active"`
redaction rule.

**Rationale**: Keeps all redaction logic in the single existing function
that already owns it, instead of duplicating projection logic in routes or
the frontend. Mirrors how `availableWords`/`secretWord` already branch on
`viewerIsDrawer` today — this just adds a second condition (`OR
room.status === "result"`) that also satisfies the gate.

**Alternatives considered**: Redacting in the route handler before
sending the response: rejected — `toRoomSnapshot` is reused identically by
every route (`GET /:code`, every action route's response, `end-round`,
`restart`), so branching there guarantees every response path reveals
consistently with no risk of one route forgetting the bypass.

## Decision: `endRound` / `restartRoom` follow the existing host-only-action shape

**Decision**: Both new `roomStore` functions return the same
`{ ok: true; room } | { ok: false; reason }` discriminated union already
used by `startGame`/`addStroke`/`clearCanvas`/`submitGuess`, with reason
sets (`"not_found" | "not_host" | "not_active"` for `endRound`;
`"not_found" | "not_host" | "not_result"` for `restartRoom`) mapped to
404/403/409 in `rooms.ts` exactly like the existing
`START_GAME_ERROR_BY_REASON` / `DRAWING_ACTION_ERROR_BY_REASON` maps.

**Rationale**: Zero new error-handling patterns to learn or review;
`startGame` already established "host-only, gated on a specific
`room.status`" as a shape, and `endRound`/`restartRoom` are structurally
identical (gate on `"active"` and `"result"` respectively instead of
`"lobby"`).

**Alternatives considered**: A single generic `transitionRoom(code,
participantId, from, to)` helper: rejected — the two actions have
different side effects beyond the status flip (`restartRoom` also clears
`drawerParticipantId`/`secretWord`/`strokes`/`guesses`/scores; `endRound`
does not touch any of those), so a generic transition function would need
an awkward side-effect callback parameter for one extra status flip saved.
Keeping them as two small, explicit functions matches the existing
`addStroke`/`clearCanvas` precedent of separate functions per action.

## Decision: Frontend routes on `room.status` exactly like phases 1-3

**Decision**: Add one route, `/result`, backed by a new `ResultPage`
component. Existing pages each gain one more "if status is X, navigate"
effect, mirroring the pattern `LobbyPage` already uses for
`status === "active" → navigate("/game")`.

**Rationale**: Consistent with the existing reattach-after-reload flow
(`roomStore.reattach()` + the per-page status effects) — a client that
reloads mid-result or mid-restart lands on the correct page purely by
polling `GET /:code` and reacting to `status`, with no new client-side
state needed.

**Alternatives considered**: Rendering the result view as a conditional
block inside `GamePage` instead of a new route: rejected — `GamePage` is
already laid out around an active round (canvas, guess form); reusing it
for the result view would require hiding/repurposing most of its layout,
whereas a dedicated `ResultPage` can reuse `Scoreboard`/`ResultPanel`
directly without fighting the active-round layout.
