# Implementation Plan: Round Result, Host Restart & Final Validation

**Branch**: `005-result-restart` | **Date**: 2026-06-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-result-restart/spec.md`

## Summary

Add a third `Room.status` value, `"result"`, entered only via a new
host-only `POST /:code/end-round` action on an active round. While in
`"result"`, `toRoomSnapshot()` reveals the secret word and every guess's
literal text to every viewer unconditionally, bypassing the phases 2-3
drawer/redaction rules. A new host-only `POST /:code/restart` action
transitions `"result"` back to `"lobby"`, preserving `room.participants`
(id/name/host flag) while clearing `drawerParticipantId`, `secretWord`,
`strokes`, `guesses`, and resetting every participant's `score` to `0`, so
the room can start an independent new round exactly as it did the first
time.

## Technical Context

**Language/Version**: TypeScript 5.6, Node.js 24, ES modules throughout (unchanged from phases 1-3)

**Primary Dependencies**: Backend — Express 4, Zod 3 (two new tiny schemas, same shape as `clearCanvasSchema`/`startGameSchema`). Frontend — React 18, react-router-dom 6, Vite 5. No new dependencies.

**Storage**: In-memory only (unchanged); no new fields are needed on `Room`/`Participant` beyond widening `RoomStatus` — result-state visibility is computed in `toRoomSnapshot()` from existing data, and restart clears existing fields back to their `createRoom`/`createParticipant` defaults.

**Testing**: Vitest in both `backend/` and `frontend/`, extending the existing test files (`roomStore.test.ts`, `schemas.test.ts`, `rooms.test.ts`, `api.test.ts`, plus a new `ResultPage`/`roomStore` frontend test for the restart-triggered navigation).

**Target Platform**: Browser client + local Node HTTP server (unchanged)

**Project Type**: Web application (existing `backend/` + `frontend/` split, unchanged)

**Performance Goals**: `endRound`/`restartRoom` are O(1) plus O(participants) for the score reset — negligible at lab scale. Result-state redaction bypass in `toRoomSnapshot` is O(guesses), same cost class as the existing per-viewer redaction it replaces for that status.

**Constraints**: No WebSockets/database/auth (constitution Additional Constraints, unchanged). No timers/countdowns — round end and restart are both exclusively host-triggered, explicit actions (per Clarifications). Restart must be deterministic and total: zero residual round state observable afterward (spec FR-010, SC-004).

**Scale/Scope**: Same lab scale as phases 1-3 — a handful of concurrent rooms, single backend process, no history retained across restarts (in-memory, replaced in place).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Code Quality & Maintainability | New status value and two new actions added to the existing `game.ts`/`roomStore.ts`/`rooms.ts`/`schemas.ts` layering (no new layers); new frontend `ResultPage` lives in existing `pages/` dir, reusing `ResultPanel`/`Scoreboard`; no new top-level deps. | PASS |
| II. Test-First & Verification Discipline | New `vitest` cases planned for `endRound`/`restartRoom` (host-only, status-gated), result-state snapshot redaction bypass, and route-level 403/404/409 mapping, extending existing test files. | PASS |
| III. Determinism & Game-Rule Integrity | `endRound`/`restartRoom` are pure state transitions keyed only on `room.status`/`hostParticipantId` — no RNG, no wall-clock dependence; restart resets scores/drawer/word to the same defaults `createRoom`/`createParticipant` already establish, so a restarted room is indistinguishable from a freshly created one. | PASS |
| IV. Security & Input Integrity | Host-only checks enforced server-side in `roomStore` (mirroring `startGame`'s `hostParticipantId` check), not just hidden in the UI; both new routes validated with Zod (`participantId` required) before reaching `roomStore`. | PASS |
| V. User Experience & Feedback Clarity | "End Round" and "Restart" controls visible only to the host; result view shows a clear, unambiguous full reveal (word/scores/history) distinct from the redacted in-round view. | PASS |
| VI. Performance & Resource Efficiency | No new unbounded collections; restart shrinks `strokes`/`guesses` back to `[]`, capping per-room memory growth across repeated games rather than letting it accumulate. | PASS |
| VII. AI-Assisted Development & Self-Review | Scope held strictly to FR-001–FR-012; no timers, multi-round history, or moderation introduced; the round-end trigger mechanism traces directly to the Clarifications session decision (host-triggered "End Round," Option A). | PASS |

No violations. Complexity Tracking section is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/005-result-restart/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md          # Phase 1 output
└── contracts/
    └── rooms-api.md      # Phase 1 output (additions to phases 1-3's contract)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/
│   │   └── game.ts            # MODIFY: RoomStatus gains "result"; no
│   │                           #         other type shape changes needed
│   ├── services/
│   │   ├── roomStore.ts       # MODIFY: add endRound(), restartRoom();
│   │   │                      #         toRoomSnapshot() bypasses
│   │   │                      #         secretWord/guess-text redaction
│   │   │                      #         unconditionally when
│   │   │                      #         room.status === "result"
│   │   └── roomStore.test.ts  # MODIFY: add cases for endRound/restartRoom
│   │                          #         (host-only, status-gated) and the
│   │                          #         result-state redaction bypass
│   ├── api/
│   │   ├── schemas.ts         # MODIFY: add endRoundSchema, restartSchema
│   │   │                      #         (both `{ participantId }`, same
│   │   │                      #         shape as clearCanvasSchema)
│   │   ├── schemas.test.ts    # MODIFY: add cases for the new schemas
│   │   ├── rooms.ts           # MODIFY: add POST /:code/end-round,
│   │   │                      #         POST /:code/restart
│   │   └── rooms.test.ts      # MODIFY: add route-level cases incl.
│   │                          #         403/404/409 mapping and the
│   │                          #         unredacted result-state GET shape
│   └── seed/starterData.ts    # (no change)
└── tests/                      # (none beyond existing co-located *.test.ts)

frontend/
├── src/
│   ├── services/
│   │   ├── api.ts             # MODIFY: RoomStatus gains "result"; add
│   │   │                      #         endRound()/restartRoom() calls
│   │   └── api.test.ts        # MODIFY: add cases for the new API calls
│   ├── state/
│   │   └── roomStore.ts       # MODIFY: add endRound()/restartRoom()
│   │                          #         methods calling the API and
│   │                          #         updating RoomState from the
│   │                          #         returned snapshot
│   ├── components/
│   │   └── ResultPanel.tsx    # MODIFY: when room.status === "result",
│   │                          #         render every guess's text
│   │                          #         unconditionally (already present
│   │                          #         per-viewer in the snapshot — no
│   │                          #         new client-side redaction logic
│   │                          #         needed) and surface the revealed
│   │                          #         secret word
│   └── pages/
│       ├── GamePage.tsx       # MODIFY: host-only "End Round" button,
│       │                      #         calling roomStore.endRound();
│       │                      #         navigate to /result when
│       │                      #         room.status becomes "result"
│       ├── ResultPage.tsx     # NEW: renders the full reveal (secret
│       │                      #      word, Scoreboard, ResultPanel) plus
│       │                      #      a host-only "Restart" button calling
│       │                      #      roomStore.restartRoom(); navigates
│       │                      #      to /lobby when room.status becomes
│       │                      #      "lobby"
│       └── LobbyPage.tsx      # MODIFY: navigate to /result if a
│                               #         reattaching client finds
│                               #         room.status === "result"
│   └── routes/
│       └── index.tsx          # MODIFY: add Route path="/result"
│                               #         element={<ResultPage />}
└── tests/                      # (none beyond existing co-located *.test.ts)
```

**Structure Decision**: Same `backend/` + `frontend/` split as phases 1-3.
All backend changes are additive within the existing
`api → services → models` layering — one widened union type
(`RoomStatus`), two new `roomStore` functions, two new routes, two new
schemas. Frontend adds one new page (`ResultPage.tsx`) under the existing
`pages/` directory and one new route, reusing `ResultPanel`/`Scoreboard`
rather than duplicating their rendering logic — no new top-level
directories or libraries.

## Complexity Tracking

> Not applicable — no constitution violations to justify.
