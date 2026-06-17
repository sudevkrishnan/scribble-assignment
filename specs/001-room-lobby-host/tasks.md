---

description: "Task list for Room Setup, Host Assignment & Lobby Sync"
---

# Tasks: Room Setup, Host Assignment & Lobby Sync

**Input**: Design documents from `/specs/001-room-lobby-host/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/rooms-api.md, research.md, quickstart.md

**Tests**: Included per the project constitution's Test-First & Verification
Discipline principle (every behavioral change requires a corresponding
`vitest` case), even though the spec itself didn't explicitly request TDD.

**Organization**: Tasks are grouped by user story (US1–US4, matching spec.md
priorities) so each story is independently implementable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- File paths are exact and relative to the repository root

## Path Conventions

- Backend: `backend/src/{api,services,models}/`
- Frontend: `frontend/src/{pages,services,state}/`

---

## Phase 1: Setup

**Purpose**: Confirm a clean starting point before making changes

- [X] T001 Run `npm run build && npm test` in `backend/` and `frontend/` and confirm both pass on the current `001-room-lobby-host` branch before any code changes

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared model/type changes and the client identity helper that every later user story depends on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Add `hostParticipantId: string` to `Room` and extend `RoomStatus` to `"lobby" | "active"` in `backend/src/models/game.ts`
- [X] T003 Add `isHost: boolean` to each participant entry and `canStart: boolean` to `RoomSnapshot` in `backend/src/models/game.ts`
- [X] T004 Set `hostParticipantId` to the creating participant's `id` inside `createRoom` in `backend/src/services/roomStore.ts`
- [X] T005 Compute `isHost` per participant (`participant.id === room.hostParticipantId`) and `canStart` (`participants.length >= 2`) inside `toRoomSnapshot` in `backend/src/services/roomStore.ts`
- [X] T006 [P] Add cases to `backend/src/services/roomStore.test.ts`: creator has `isHost: true`; `canStart` is `false` at 1 participant and `true` at 2+ participants
- [X] T007 [P] Mirror `isHost`, `canStart`, and the `RoomStatus` union (`"lobby" | "active"`) in the `RoomSnapshot`/`Participant` types in `frontend/src/services/api.ts`
- [X] T008 [P] Create `frontend/src/state/roomIdentity.ts` exporting `getStoredIdentity(code)`, `setStoredIdentity(code, identity)`, and `clearStoredIdentity(code)`, backed by `window.sessionStorage` under key `scribble:room:<code>` (see research.md)
- [X] T009 [P] Add `frontend/src/state/roomIdentity.test.ts` covering set/get/clear round-trips and confirming two different room codes don't collide

**Checkpoint**: Model, snapshot, and identity-storage foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 - Host a Game by Creating a Room (Priority: P1) 🎯 MVP

**Goal**: Creator is automatically the room's host, with a unique code

**Independent Test**: Create a room solo and confirm a unique code is returned and the creator is host; create a second room and confirm it has a distinct code with its own host

- [X] T010 [US1] After a successful create, call `setStoredIdentity(code, { participantId, isHost: true })` inside `createRoom()` in `frontend/src/state/roomStore.ts`
- [X] T011 [P] [US1] Add a case to `backend/src/services/roomStore.test.ts`: two sequential `createRoom` calls produce distinct codes, and each creator is host only of their own room
- [X] T012 [P] [US1] Add `frontend/src/state/roomStore.test.ts` (new file) with a case asserting `createRoom()` persists identity via the `roomIdentity` helper from T008

**Checkpoint**: User Story 1 is independently functional and testable

---

## Phase 4: User Story 2 - Join an Existing Room by Code (Priority: P2)

**Goal**: Joining validates empty/invalid-format/not-found codes with distinct, clear messages, and never affects other rooms

**Independent Test**: Join an existing room successfully as a non-host; separately, attempt empty, malformed, and well-formed-but-unknown codes and confirm three distinct error messages; confirm a second room is unaffected

- [X] T013 [US2] Add a `ROOM_CODE_PATTERN` matching the existing 4-character generation alphabet (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`) in `backend/src/api/schemas.ts`
- [X] T014 [US2] Update `POST /:code/join` in `backend/src/api/rooms.ts` to return `400 "Room code is required"` for empty/whitespace codes, `400 "Room code is invalid"` for format mismatches, and `404 "Room not found"` for well-formed but unmatched codes
- [X] T015 [P] [US2] Add cases for empty, malformed, and well-formed-but-unmatched room codes — implemented as `backend/src/api/rooms.test.ts` (new route-level integration test, deviating from the planned `schemas.test.ts` location since the 400-vs-404 distinction is enforced in the route handler, not the Zod schema; uses a real ephemeral-port listener + `fetch`, no new test dependency)
- [X] T016 [P] [US2] Add a case to `backend/src/services/roomStore.test.ts` confirming a join into one room never mutates a second room's participant list (isolation)
- [X] T017 [US2] Update `joinRoom` error handling in `frontend/src/services/api.ts` to surface the three distinct backend messages verbatim to the caller — already satisfied by the existing generic `request()` error path (verified, no code change needed)
- [X] T018 [P] [US2] Add cases to `frontend/src/services/api.test.ts` asserting the three distinct join error messages propagate from the response body
- [X] T019 [US2] After a successful join, call `setStoredIdentity(code, { participantId, isHost: false })` inside `joinRoom()` in `frontend/src/state/roomStore.ts` — implemented alongside T010 (same method block)

**Checkpoint**: User Stories 1 AND 2 both work independently

---

## Phase 5: User Story 3 - Automatic Lobby Updates (Priority: P2)

**Goal**: The lobby's participant list refreshes on its own (~2s) without manual action

**Independent Test**: With two tabs in the same room's lobby, join a third tab and confirm the first two update within a few seconds with no action taken

- [X] T020 [US3] Add `startPolling()` / `stopPolling()` to `frontend/src/state/roomStore.ts` using `setInterval` (~2000ms) to call the existing `fetchRoom()`
- [X] T021 [US3] In `frontend/src/pages/LobbyPage.tsx`, start polling in a `useEffect` on mount and stop it on unmount; remove the manual "Refresh Room" button (now redundant per research.md)
- [X] T022 [P] [US3] Add a case to `frontend/src/state/roomStore.test.ts` verifying `startPolling` invokes `fetchRoom` on each tick and `stopPolling` clears the interval (use `vi.useFakeTimers`)

**Checkpoint**: User Stories 1, 2, AND 3 all work independently

---

## Phase 6: User Story 4 - Host-Gated Game Start (Priority: P2)

**Goal**: Only the host can start, and only with ≥2 participants; everyone else understands why the control isn't available to them

**Independent Test**: Non-host sees no start control; host with 1 participant sees a disabled control with a reason; host with 2+ participants sees an enabled control

- [X] T023 [US4] Add `startGameSchema` (`{ participantId: string }`) to `backend/src/api/schemas.ts`
- [X] T024 [US4] Add `startGame(code, participantId)` to `backend/src/services/roomStore.ts`: reject if `participantId !== room.hostParticipantId` or `participants.length < 2`; on success set `status` to `"active"`; return a typed success/failure-reason result
- [X] T025 [US4] Add `POST /:code/start` in `backend/src/api/rooms.ts`, mapping `startGame` results to `400`/`403`/`404`/`409` per `contracts/rooms-api.md`
- [X] T026 [P] [US4] Add cases to `backend/src/services/roomStore.test.ts`: non-host start rejected, <2 participants rejected, host with ≥2 participants succeeds and sets `status` to `"active"`
- [X] T027 [P] [US4] Add a case to `backend/src/api/schemas.test.ts` for a missing/blank `participantId` on start
- [X] T028 [US4] Add `startGame(code, participantId)` to `frontend/src/services/api.ts`
- [X] T029 [US4] Add a `startGame()` action to `frontend/src/state/roomStore.ts` that calls the API and updates the room snapshot on success
- [X] T030 [US4] In `frontend/src/pages/LobbyPage.tsx`, render the Start control only for the host (`room.participants` entry matching the stored `participantId` has `isHost: true`); disable it with a visible "need 2 players" message when `!room.canStart`; enable it otherwise; wire its click to `startGame()`
- [X] T031 [P] [US4] Add a case to `frontend/src/services/api.test.ts` for the `startGame` request shape

**Checkpoint**: All four user stories work independently and together — this phase's full scope is complete

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Reload reattachment (FR-014/SC-006, not owned by a single priority story) and final validation

- [X] T032 Add `reattach()` to `frontend/src/state/roomStore.ts` (reads `getActiveRoomCode`/`getStoredIdentity`, calls `fetchRoom`, clears identity + surfaces a clear message on failure) and wire it via a `ReattachGate` bootstrap component in `frontend/src/App.tsx` that delays rendering `AppRoutes` until the reattach attempt resolves (avoids a race with `LobbyPage`'s redirect-when-no-room effect); also surface the stored error on `frontend/src/pages/StartPage.tsx`
- [X] T033 [P] Add cases to `frontend/src/state/roomStore.test.ts` for reattachment: a stored identity plus a successful fetch restores room/participant state; a stored identity plus a fetch failure clears the identity and sets a clear error; no stored identity is a no-op
- [X] T034 Walk through `specs/001-room-lobby-host/quickstart.md`: backend contract scenarios (create/host, all 3 join error cases, isolation across two rooms, non-host/under-2-player/host-with-2 start gating, not-found GET) verified end-to-end via curl against a live `npm run dev` instance — all matched `contracts/rooms-api.md` exactly. **Not done**: the two-browser-tab UI walkthrough (sessionStorage reattach, visible disabled/enabled Start button, polling) — recommend the user run this manually since it requires a real browser
- [X] T035 Run `npm run build && npm test` in both `backend/` and `frontend/` and confirm all green — 19 backend tests / 16 frontend tests, all passing

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational only
- **User Story 2 (Phase 4)**: Depends on Foundational only (uses Phase 3's `roomIdentity` pattern but not its code)
- **User Story 3 (Phase 5)**: Depends on Foundational only
- **User Story 4 (Phase 6)**: Depends on Foundational; functionally most useful once US1–US3 exist, since starting needs a host (US1) and an accurate participant count (US2, US3), but its own tasks don't edit US1–US3 files
- **Polish (Phase 7)**: Depends on all four user stories being complete

### Within Each User Story

- Backend model/service changes before backend routes
- Backend routes before frontend service/API client changes
- Frontend API client before frontend state (`roomStore.ts`) changes
- Frontend state before frontend page (`LobbyPage.tsx`/`CreateRoomPage.tsx`) wiring
- Tests for a change are added alongside that change's task (same or immediately following task)

### Parallel Opportunities

- All Foundational tasks marked [P] (T006–T009) can run in parallel once T002–T005 land
- Within each user story, test-file tasks marked [P] can run in parallel with each other (different files)
- US1, US2, and US3 touch almost entirely disjoint files (`CreateRoomPage.tsx` vs. join validation vs. polling) and can be implemented in parallel by different people once Foundational is done; US4 should follow once a host and accurate count exist to test against

---

## Parallel Example: Foundational Phase

```bash
# After T002-T005 (sequential, same files) land:
Task: "Add roomStore.test.ts cases for host assignment and canStart"
Task: "Mirror isHost/canStart/RoomStatus types in frontend/src/services/api.ts"
Task: "Create frontend/src/state/roomIdentity.ts sessionStorage helper"
Task: "Add frontend/src/state/roomIdentity.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything else)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: confirm room creation + host assignment works via quickstart scenario 1
5. Demo if ready — note a single-player room has no one to play with yet, so this MVP is a checkpoint, not a shippable increment on its own

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. Add US1 → validate via quickstart scenario 1
3. Add US2 → validate via quickstart scenario 2 (now two tabs can be in one room)
4. Add US3 → validate via quickstart scenario 3 (lobby updates without manual refresh)
5. Add US4 → validate via quickstart scenario 4 (host-gated start)
6. Polish → validate quickstart scenario 5 (reload) and run full automated suite (T035)

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Commit after each task or logical group, per the constitution's
  AI-Assisted Development & Self-Review principle
- Verify `npm test` stays green after each task before moving to the next
- Avoid: vague tasks, same-file conflicts marked [P], cross-story file edits that break independence
