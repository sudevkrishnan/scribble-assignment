---

description: "Task list for Round Result, Host Restart & Final Validation"
---

# Tasks: Round Result, Host Restart & Final Validation

**Input**: Design documents from `/specs/005-result-restart/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/rooms-api.md, research.md, quickstart.md

**Tests**: Included per the project constitution's Test-First & Verification
Discipline principle, consistent with phases 1-3.

**Organization**: Tasks are grouped by user story (US1-US2, matching
spec.md priorities — both P1).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US2)
- File paths are exact and relative to the repository root

## Path Conventions

- Backend: `backend/src/{api,services,models}/`
- Frontend: `frontend/src/{pages,components,services,state,routes}/`

---

## Phase 1: Setup

**Purpose**: Confirm a clean starting point before making changes

- [X] T001 Run `npm run build && npm test` in `backend/` and `frontend/` and confirm both pass on the current `005-result-restart` branch before any code changes

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Widen the shared `RoomStatus` type that both `endRound` and `restartRoom` gate on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Widen `RoomStatus` to `"lobby" | "active" | "result"` in `backend/src/models/game.ts` (type-only change; no other field shapes change per data-model.md)
- [X] T003 [P] Mirror the widened `RoomStatus` union in `frontend/src/services/api.ts`

**Checkpoint**: Shared status type ready — user story implementation can now begin

---

## Phase 3: User Story 1 - Shared Round Result Visible to Everyone (Priority: P1)

**Goal**: The host can end the active round via an explicit action, transitioning the room to a `"result"` status in which the secret word and every guess's literal text are visible to every viewer, unconditionally

**Independent Test**: With an active round containing a mix of correct/incorrect guesses from multiple guessers, have the host trigger "End Round" and confirm every participant's client shows the same secret word, same scores, and same fully unredacted guess history (including entries previously hidden from non-submitting guessers), within one poll cycle, with no manual reload.

- [X] T004 [US1] Add `endRoundSchema` (`{ participantId: string }`, same shape as `clearCanvasSchema`) to `backend/src/api/schemas.ts`
- [X] T005 [US1] Add `endRound(code, participantId)` to `backend/src/services/roomStore.ts`: returns a typed failure (`"not_found" | "not_host" | "not_active"`) for room-not-found/non-host/non-active-round, otherwise sets `room.status = "result"` with no other field changes
- [X] T006 [P] [US1] Add `POST /:code/end-round` to `backend/src/api/rooms.ts`, with an `END_ROUND_ERROR_BY_REASON` map mirroring `START_GAME_ERROR_BY_REASON`'s shape, mapping `endRound`'s failure reasons to `403`/`404`/`409` per `contracts/rooms-api.md`
- [X] T007 [US1] In `toRoomSnapshot()` in `backend/src/services/roomStore.ts`, add a `room.status === "result"` branch that reveals `secretWord` to every viewer and every `guesses[].text` to every viewer, unconditionally, overriding the existing `viewerIsDrawer`/own-entry/`correct` checks (those checks remain in effect only while `status === "active"`); `availableWords` keeps its existing drawer-only rule unchanged
- [X] T008 [P] [US1] Add cases to `backend/src/services/roomStore.test.ts`: `endRound` transitions `"active"` → `"result"` for the host; rejects a non-host; rejects when the room isn't active (including when already in `"result"` or still `"lobby"`); leaves `strokes`/`guesses`/every `score` untouched
- [X] T009 [P] [US1] Add cases to `backend/src/services/roomStore.test.ts` for the `toRoomSnapshot` result-state bypass: a non-drawer, non-submitting guesser's snapshot includes `secretWord` and every guess's `text` once `status === "result"`, where the same viewer's snapshot omitted them while `status === "active"`; also assert every participant's `score` is present and identical across viewers' snapshots in the result state (FR-003 — already unredacted in every status, but not previously pinned down by a result-state-specific assertion)
- [X] T010 [P] [US1] Add cases to `backend/src/api/schemas.test.ts` for `endRoundSchema`: rejects a missing/blank `participantId`; accepts a valid one
- [X] T011 [P] [US1] Add cases to `backend/src/api/rooms.test.ts` for `POST /:code/end-round`: `200` for the host (room transitions to `"result"`), `403` for a non-host, `404` for an unknown room, `409` when the room isn't `"active"`; add a case for `GET /:code` returning the unredacted shape (matching `contracts/rooms-api.md`'s result-state example) once `status === "result"`
- [ ] T012 [US1] Add `endRound(code, participantId)` to `frontend/src/services/api.ts`
- [ ] T013 [P] [US1] Add an `endRound()` method to `frontend/src/state/roomStore.ts` calling `api.endRound` and updating `RoomState` from the returned snapshot
- [ ] T014 [US1] Add a host-only "End Round" button to `frontend/src/pages/GamePage.tsx`, calling the store's `endRound`, and two effects: one that navigates to `/result` once `room.status === "result"`, and a symmetric safety-net effect that navigates to `/lobby` if `room.status === "lobby"` is observed while still mounted here (covers a client whose poll lands after the host has both ended the round *and* restarted, skipping the `/result` transition entirely — mirrors `LobbyPage`'s analogous result-skip safety net added in T026)
- [ ] T015 [US1] Add `frontend/src/routes/index.tsx`'s `Route path="/result"` pointing at a new `frontend/src/pages/ResultPage.tsx` (created in this task): renders `Scoreboard`, `ResultPanel`, and the revealed `room.secretWord`, with an effect redirecting to `/` if `room` is null (mirroring `GamePage`'s pattern), and — critically — calls `roomStore.startPolling()` on mount / `stopPolling()` on unmount exactly like `GamePage`/`LobbyPage` already do, so a participant sitting on this page keeps observing `room.status` and can detect the host's later restart (without this, FR-011/SC-003 silently fail for anyone already on `/result`) — the host-only "Restart" control is added in US2's tasks, not here
- [ ] T016 [P] [US1] Add a case to `frontend/src/services/api.test.ts` for `endRound`, and a case to `frontend/src/state/roomStore.test.ts` confirming `endRound()` calls the API and updates `RoomState`'s `room` from the response

**Checkpoint**: User Story 1 is independently functional and testable — the host can end a round and every viewer sees the full, unredacted result

---

## Phase 4: User Story 2 - Host Restarts to a Clean Lobby (Priority: P1)

**Goal**: From the result state, the host can restart the room back to `"lobby"`, preserving `participants` while clearing `drawerParticipantId`, `secretWord`, `strokes`, `guesses`, and every `score`

**Independent Test**: From the result state with a populated guess history and non-zero scores, have the host trigger restart, and confirm every connected participant lands on the lobby screen with the same roster, while a fresh round subsequently starts with an empty canvas, empty guess history, and all scores back at zero.

- [X] T017 [US2] Add `restartSchema` (`{ participantId: string }`, same shape as `endRoundSchema`) to `backend/src/api/schemas.ts`
- [X] T018 [US2] Add `restartRoom(code, participantId)` to `backend/src/services/roomStore.ts`: returns a typed failure (`"not_found" | "not_host" | "not_result"`) for room-not-found/non-host/room-not-in-result-state, otherwise sets `room.status = "lobby"`, `room.drawerParticipantId = undefined`, `room.secretWord = undefined`, `room.strokes = []`, `room.guesses = []`, and every `participant.score = 0` in `room.participants`, leaving `participants` (id/name/`joinedAt`) and `hostParticipantId` untouched
- [X] T019 [P] [US2] Add `POST /:code/restart` to `backend/src/api/rooms.ts`, with a `RESTART_ERROR_BY_REASON` map, mapping `restartRoom`'s failure reasons to `403`/`404`/`409` per `contracts/rooms-api.md`
- [X] T020 [P] [US2] Add cases to `backend/src/services/roomStore.test.ts`: `restartRoom` transitions `"result"` → `"lobby"` for the host, resetting `drawerParticipantId`/`secretWord`/`strokes`/`guesses`/every `score` to their cleared defaults while preserving every participant's `id`/`name`/`joinedAt` and `hostParticipantId`; rejects a non-host; rejects when the room isn't in `"result"` (including `"active"` and already-`"lobby"`, confirming idempotent rejection rather than a no-op success); **and** (FR-012/SC-005) after a successful `restartRoom`, call `startGame` again on the same room and assert it succeeds, assigns a fresh `drawerParticipantId`/`secretWord` exactly as it did the first time, and that `strokes`/`guesses` remain empty and every `score` remains `0` going into the new round — i.e. no residual data from the first round leaks into the second
- [X] T021 [P] [US2] Add cases to `backend/src/api/schemas.test.ts` for `restartSchema`: rejects a missing/blank `participantId`; accepts a valid one
- [X] T022 [P] [US2] Add cases to `backend/src/api/rooms.test.ts` for `POST /:code/restart`: `200` for the host (room transitions to `"lobby"` with participants preserved and scores reset), `403` for a non-host, `404` for an unknown room, `409` when the room isn't `"result"`
- [ ] T023 [US2] Add `restartRoom(code, participantId)` to `frontend/src/services/api.ts`
- [ ] T024 [P] [US2] Add a `restartRoom()` method to `frontend/src/state/roomStore.ts` calling `api.restartRoom` and updating `RoomState` from the returned snapshot
- [ ] T025 [US2] Add a host-only "Restart" button to `frontend/src/pages/ResultPage.tsx` (created in T015), calling the store's `restartRoom`, and an effect that navigates to `/lobby` once `room.status === "lobby"`
- [ ] T026 [US2] Add an effect to `frontend/src/pages/LobbyPage.tsx` that navigates to `/result` if a reattaching/polling client finds `room.status === "result"` (covers a guesser who reloads or was disconnected while the host already ended the round)
- [ ] T027 [P] [US2] Add a case to `frontend/src/services/api.test.ts` for `restartRoom`, and a case to `frontend/src/state/roomStore.test.ts` confirming `restartRoom()` calls the API and updates `RoomState`'s `room` from the response

**Checkpoint**: User Stories 1 and 2 both work independently and together — a room can complete a full round → result → restart → new-round cycle

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final end-to-end validation

- [ ] T028 Walk through `specs/005-result-restart/quickstart.md` end-to-end across three browser tabs (host/drawer + two guessers): result reveal (including the previously-redacted entry becoming visible to every viewer) and restart (roster preserved, all round state cleared, a second round completes independently) both match `contracts/rooms-api.md` and the spec
- [ ] T029 Run `npm run build && npm test` in both `backend/` and `frontend/` and confirm all green

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS both user stories (both `endRound` and `restartRoom` gate on `RoomStatus` values that don't exist until T002/T003 land)
- **User Story 1 (Phase 3)**: Depends on Foundational only
- **User Story 2 (Phase 4)**: Depends on Foundational; also depends on a room being able to reach `"result"` status to be testable end-to-end (US1's `endRound`), but `restartRoom`'s own implementation, tests, and route are in disjoint files from US1's — only the *manual/quickstart* verification of US2 needs US1 to exist first, not the code itself
- **Polish (Phase 5)**: Depends on both user stories being complete

### Within Each User Story

- Backend model/service changes before backend route-level tests
- Backend changes before frontend type/UI changes
- Tests for a change are added alongside that change's task

### Parallel Opportunities

- T002–T003 (Foundational) can run in parallel — different files
- Within US1, T008–T011 and T016 (test files) can run in parallel with each other once their corresponding implementation tasks land
- Within US2, T020–T022 and T027 (test files) can run in parallel with each other once their corresponding implementation tasks land
- US1's backend tasks (T004–T011) and US2's backend tasks (T017–T022) touch the same files (`schemas.ts`, `roomStore.ts`, `rooms.ts`, their test files) — sequential within a developer, but the two stories' tasks are independently reviewable/testable units once both land

---

## Parallel Example: Foundational Phase

```bash
# T002 and T003 touch different files and have no dependencies on each other:
Task: "Widen RoomStatus in backend/src/models/game.ts"
Task: "Mirror RoomStatus in frontend/src/services/api.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: confirm the host can end a round and every viewer sees the same unredacted secret word, scores, and guess history within one poll cycle, via quickstart scenario 1
5. This alone delivers the round's "payoff moment," even before restart exists — a room could otherwise sit in `"result"` indefinitely (acceptable for manual validation, not a final state for the feature)

### Incremental Delivery

1. Setup + Foundational → foundation ready (shared `RoomStatus` widened)
2. Add US1 → validate via quickstart scenario 1 (shared result reveal)
3. Add US2 → validate via quickstart scenario 2 (restart, roster preserved, full reset, independent second round)
4. Polish → run full automated suite (T029) and the full manual quickstart (T028)

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Commit after each task or logical group, per the constitution's
  AI-Assisted Development & Self-Review principle
- Verify `npm test` stays green after each task before moving to the next
- Avoid: vague tasks, same-file conflicts marked [P], cross-story file edits that break independence
- No timer/countdown logic is introduced anywhere in this phase — both
  `endRound` and `restartRoom` are purely host-triggered, explicit actions,
  per the Clarifications session decision (spec.md, Option A)
- `ResultPage.tsx` is created once, in US1 (T015), with US2 (T025) adding
  to it rather than creating a second new file — this is the one
  intentional cross-story edit to the same file, called out explicitly
  rather than left implicit
