---

description: "Task list for Player Name Validation, Drawer Assignment & Secret Word Visibility"
---

# Tasks: Player Name Validation, Drawer Assignment & Secret Word Visibility

**Input**: Design documents from `/specs/002-drawer-word-assignment/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/rooms-api.md, research.md, quickstart.md

**Tests**: Included per the project constitution's Test-First & Verification
Discipline principle, consistent with phase 1.

**Organization**: Tasks are grouped by user story (US1–US4, matching spec.md
priorities — all P1, since they're tightly coupled facets of one round-start
transition).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- File paths are exact and relative to the repository root

## Path Conventions

- Backend: `backend/src/{api,services,models}/`
- Frontend: `frontend/src/{pages,services}/`

---

## Phase 1: Setup

**Purpose**: Confirm a clean starting point before making changes

- [ ] T001 Run `npm run build && npm test` in `backend/` and `frontend/` and confirm both pass on the current `002-drawer-word-assignment` branch before any code changes

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared model/type changes and the pure word-selection helper that every user story depends on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 Add `drawerParticipantId?: string` and `secretWord?: string` to `Room` in `backend/src/models/game.ts`
- [ ] T003 Add `isDrawer: boolean` to `RoomSnapshotParticipant` and `secretWord?: string` to `RoomSnapshot` in `backend/src/models/game.ts`
- [ ] T004 [P] Add a pure `selectSecretWord(code: string): string` hash helper in `backend/src/services/roomStore.ts`, implementing the polynomial rolling hash from research.md (no RNG, no time input)
- [ ] T005 [P] Add cases to `backend/src/services/roomStore.test.ts` for `selectSecretWord`: always returns one of the 5 starter words; the same code always returns the same word across repeated calls
- [ ] T006 [P] Mirror `isDrawer` on `Participant` and `secretWord?: string` on `RoomSnapshot` in `frontend/src/services/api.ts`

**Checkpoint**: Model/type foundation and the word-selection function ready — user story implementation can now begin

---

## Phase 3: User Story 1 - Player Name Validation on Create/Join (Priority: P1)

**Goal**: Blank/whitespace-only names are rejected with a clear message on both create and join; valid names are trimmed

**Independent Test**: Submit empty and whitespace-only names on both Create Room and Join Room; confirm rejection with a clear message and no room/participant created. Submit a padded name; confirm it's trimmed and accepted.

- [ ] T007 [US1] Change `playerName` in `createRoomSchema` and `joinRoomSchema` to `z.string().trim().min(1, "Player name is required")` (drop `.optional()`) in `backend/src/api/schemas.ts`
- [ ] T008 [US1] Remove the `displayName()` fallback in `backend/src/services/roomStore.ts`; `createParticipant` now receives an already-validated, trimmed, non-empty name
- [ ] T009 [P] [US1] Add cases to `backend/src/api/schemas.test.ts`: blank/whitespace `playerName` rejected for both schemas with the message "Player name is required"; a padded name (e.g., `"  Alice  "`) is trimmed to `"Alice"`
- [ ] T010 [P] [US1] Add cases to `backend/src/api/rooms.test.ts`: `POST /rooms` and `POST /:code/join` with a blank/whitespace `playerName` return `400` with message "Player name is required"

**Checkpoint**: User Story 1 is independently functional and testable

---

## Phase 4: User Story 2 - Drawer Assignment at Round Start (Priority: P1)

**Goal**: The host becomes the round's drawer at successful start, visible to every participant via `isDrawer` — and every participant, not only the host, actually reaches the screen where that's visible

**Independent Test**: With a host and a guesser, start the game and confirm every connected participant's snapshot shows the host's `isDrawer: true` and the guesser's `isDrawer: false`; confirm the guesser is automatically navigated to the game screen without manual action.

- [ ] T011 [US2] In `startGame()` in `backend/src/services/roomStore.ts`, assign `room.drawerParticipantId = room.hostParticipantId` the first time a room transitions to active, guarded by `if (!room.drawerParticipantId)` (per research.md's idempotency decision)
- [ ] T012 [US2] Compute `isDrawer` per participant (`participant.id === room.drawerParticipantId`) in `toRoomSnapshot()` in `backend/src/services/roomStore.ts`
- [ ] T013 [P] [US2] Add cases to `backend/src/services/roomStore.test.ts`: after a successful start, the host's snapshot entry has `isDrawer: true` and every other participant's has `isDrawer: false`; repeating `startGame()` on an already-active room does not change `drawerParticipantId`
- [ ] T014 [US2] Add a `useEffect` to `frontend/src/pages/LobbyPage.tsx` that watches `room.status` and calls `navigate("/game")` for every participant (not only the host, who already navigates explicitly in `handleStart()`) once it becomes `"active"` — closes the coverage gap found by `/speckit-analyze` (FR-012, SC-006; see research.md's "How non-host participants reach the game screen" decision). Verified manually via `quickstart.md` scenario 2, not an automated test (see research.md's testing note on why).

**Checkpoint**: User Story 2 is independently functional and testable — including for non-host participants

---

## Phase 5: User Story 3 - Deterministic Secret Word Selection (Priority: P1)

**Goal**: A secret word from the starter list is selected once at start, reproducibly, from the room code alone

**Independent Test**: Start a room's game and note the secret word; re-fetch the room as the drawer and confirm the same word; confirm repeating the start action doesn't change it.

- [ ] T015 [US3] In `startGame()` in `backend/src/services/roomStore.ts`, assign `room.secretWord = selectSecretWord(room.code)` the first time a room transitions to active, using the same guard as T011
- [ ] T016 [P] [US3] Add cases to `backend/src/services/roomStore.test.ts`: after a successful start, `room.secretWord` is one of the 5 starter words; repeating `startGame()` on an already-active room does not change `secretWord`

**Checkpoint**: User Stories 1, 2, AND 3 all work independently

---

## Phase 6: User Story 4 - Drawer-Only Word Visibility (Priority: P1)

**Goal**: The secret word and candidate word list never appear in a non-drawer's data, in the UI or the raw response

**Independent Test**: With a round started, fetch the room as the drawer (secret word + full word list present) and as a guesser (neither present, `secretWord` key absent, `availableWords` empty) — verify via both the UI and the raw response body.

- [ ] T017 [US4] In `toRoomSnapshot()` in `backend/src/services/roomStore.ts`, set `secretWord` only when `viewerParticipantId === room.drawerParticipantId` (omitted otherwise via `undefined`), and set `availableWords` to the full starter list only for the drawer, an empty array otherwise (including before the round starts, when there is no drawer yet)
- [ ] T018 [P] [US4] Add cases to `backend/src/services/roomStore.test.ts`: drawer's snapshot includes `secretWord` and the full `availableWords`; a non-drawer's snapshot has no `secretWord` key and an empty `availableWords`; a pre-start snapshot has neither for any viewer
- [ ] T019 [P] [US4] Add a route-level case to `backend/src/api/rooms.test.ts`: `GET /rooms/:code?participantId=<drawer>` includes `secretWord`; the same room fetched with a different `participantId` does not
- [ ] T020 [US4] Update `frontend/src/pages/GamePage.tsx` to label the drawer for every viewer (via each participant's `isDrawer`) and to display the secret word only when `room.secretWord` is present in the fetched snapshot
- [ ] T021 [P] [US4] Add a case to `frontend/src/services/api.test.ts` reflecting the new `isDrawer`/`secretWord` fields in a `fetchRoom` response shape

**Checkpoint**: All four user stories work independently and together — this phase's full scope is complete

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final end-to-end validation

- [ ] T022 Walk through `specs/002-drawer-word-assignment/quickstart.md` end-to-end with two browser tabs and record any deviations (including scenario 2's auto-navigation step)
- [ ] T023 Run `npm run build && npm test` in both `backend/` and `frontend/` and confirm all green

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational only; fully independent of US2–US4 (different files: `schemas.ts` vs. `startGame()`/`toRoomSnapshot()`/`LobbyPage.tsx`)
- **User Story 2 (Phase 4)**: Depends on Foundational only
- **User Story 3 (Phase 5)**: Depends on Foundational only; shares `startGame()` with US2 (sequential edits to the same function, not parallel) but has independent test assertions
- **User Story 4 (Phase 6)**: Depends on Foundational; logically builds on US2/US3's `drawerParticipantId`/`secretWord` fields existing, but is testable on its own once they're present (it's the exposure/redaction concern, not the assignment one)
- **Polish (Phase 7)**: Depends on all four user stories being complete

### Within Each User Story

- Backend model/service changes before backend route-level tests
- Backend changes before frontend type/UI changes (US2's T014, US4's T020/T021)
- Tests for a change are added alongside that change's task

### Parallel Opportunities

- T004–T006 (Foundational, after T002–T003 land) can run in parallel — different files
- US1 (Phase 3) can be implemented in parallel with US2+US3 (Phase 4+5) by different people — disjoint files
- Within US4, T018/T019/T021 (test files) can run in parallel with each other once T017/T020 land

---

## Parallel Example: Foundational Phase

```bash
# After T002-T003 (sequential, same file) land:
Task: "Add selectSecretWord hash helper in backend/src/services/roomStore.ts"
Task: "Add roomStore.test.ts cases for selectSecretWord determinism"
Task: "Mirror isDrawer/secretWord types in frontend/src/services/api.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: confirm blank-name rejection and trimming via quickstart scenario 1
5. This alone is a meaningful, shippable input-integrity fix even before drawer/word work lands

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. Add US1 → validate via quickstart scenario 1
3. Add US2 → validate via quickstart scenario 2 (drawer labeled for everyone, guesser auto-navigated)
4. Add US3 → validate via quickstart scenario 3 (same room, same word, repeatedly)
5. Add US4 → validate via quickstart scenario 4 (guesser's view/response has no secret word)
6. Polish → run full automated suite (T023)

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Commit after each task or logical group, per the constitution's
  AI-Assisted Development & Self-Review principle
- Verify `npm test` stays green after each task before moving to the next
- Avoid: vague tasks, same-file conflicts marked [P], cross-story file edits that break independence
- T014 (non-host navigation) is intentionally verified manually rather than
  via an automated component test — see research.md's testing note; the
  project has no component-rendering test infrastructure and adding one for
  a single trivial effect would be disproportionate scope creep
