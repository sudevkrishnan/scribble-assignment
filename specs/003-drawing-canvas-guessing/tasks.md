---

description: "Task list for Drawing Canvas, Guess Submission & Scoring"
---

# Tasks: Drawing Canvas, Guess Submission & Scoring

**Input**: Design documents from `/specs/003-drawing-canvas-guessing/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/rooms-api.md, research.md, quickstart.md

**Tests**: Included per the project constitution's Test-First & Verification
Discipline principle, consistent with phases 1-2. Canvas pixel rendering
itself is not unit-tested (jsdom has no Canvas 2D context — see
research.md); the pointer-to-stroke logic is isolated and unit-tested
instead, and actual rendering is verified manually via quickstart.md.

**Organization**: Tasks are grouped by user story (US1–US5, matching
spec.md priorities — US1/US3/US4/US5 are P1, US2 is P2).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- File paths are exact and relative to the repository root

## Path Conventions

- Backend: `backend/src/{api,services,models}/`
- Frontend: `frontend/src/{pages,components,services,state}/`

---

## Phase 1: Setup

**Purpose**: Confirm a clean starting point before making changes

- [X] T001 Run `npm run build && npm test` in `backend/` and `frontend/` and confirm both pass on the current `003-drawing-canvas-guessing` branch before any code changes

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared model/type changes (strokes, guesses, score) that every user story depends on — including making `strokes` actually flow into the polled snapshot, since it carries no redaction and every later story's quickstart scenario assumes guesser-side canvas sync already works

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Add `Stroke` (`{ points: { x: number; y: number }[] }`) and `GuessEntry` (`{ id, participantId, text, correct, submittedAt }`) types to `backend/src/models/game.ts`; add `strokes: Stroke[]` and `guesses: GuessEntry[]` to `Room`; add `score: number` to `Participant`
- [X] T003 Add `GuessSnapshotEntry` (`{ id, participantId, correct, text? }`) type, `strokes: Stroke[]` and `guesses: GuessSnapshotEntry[]` to `RoomSnapshot`, and `score: number` to `RoomSnapshotParticipant`, in `backend/src/models/game.ts`
- [X] T004 [P] In `backend/src/services/roomStore.ts`, initialize `score: 0` in `createParticipant()` and `strokes: []`/`guesses: []` on the `Room` created in `createRoom()`
- [X] T005 [P] Mirror `Stroke`, `GuessSnapshotEntry` types, `Participant.score`, and `RoomSnapshot.strokes`/`guesses` in `frontend/src/services/api.ts`
- [X] T006 In `toRoomSnapshot()` in `backend/src/services/roomStore.ts`, add `strokes: room.strokes` to the returned object, unconditionally for every viewer (no redaction — strokes are never secret). This must land here, not deferred to a later story's phase, so that US1/US2's own quickstart scenarios (guesser-side canvas sync) pass at their own checkpoint

**Checkpoint**: Model/type foundation ready, and strokes already flow through the polled snapshot — user story implementation can now begin

---

## Phase 3: User Story 1 - Drawer Draws on an Interactive Canvas (Priority: P1)

**Goal**: The drawer can draw continuous strokes that render immediately on their own screen; non-drawers cannot draw

**Independent Test**: As the drawer, press-drag to draw a stroke and confirm it renders immediately; lift and draw again to confirm a separate stroke; confirm a guesser's drawing attempts produce no stroke; confirm a guesser's canvas reflects the drawer's strokes within one poll cycle (covered now that T006 already wires `strokes` into the snapshot).

- [X] T007 [US1] Add `strokeSchema` (`{ participantId: string, points: { x: number; y: number }[] }`, `points` min length 1) to `backend/src/api/schemas.ts`
- [X] T008 [US1] Add `addStroke(code, participantId, points)` to `backend/src/services/roomStore.ts`: returns a typed failure for room-not-found/not-drawer/round-not-active, otherwise appends a `Stroke` to `room.strokes`
- [X] T009 [P] [US1] Add `POST /:code/strokes` to `backend/src/api/rooms.ts`, mapping `addStroke`'s failure reasons to `403`/`404`/`409` per `contracts/rooms-api.md`
- [X] T010 [P] [US1] Add cases to `backend/src/services/roomStore.test.ts`: `addStroke` appends a stroke for the drawer; rejects a non-drawer; rejects when the room isn't active
- [X] T011 [P] [US1] Add cases to `backend/src/api/schemas.test.ts` for `strokeSchema`: rejects empty `points`; accepts a valid points array
- [X] T012 [P] [US1] Add cases to `backend/src/api/rooms.test.ts` for `POST /:code/strokes`: `200` for the drawer, `403` for a non-drawer, `404` for an unknown room, `409` for a non-active room
- [X] T013 [US1] Add `addStroke(code, participantId, points)` to `frontend/src/services/api.ts`
- [X] T014 [US1] Create `frontend/src/components/DrawingCanvas.tsx`: a `<canvas>` with pointer handlers that build a `Stroke`'s `points` from pointer-down/move/up (new stroke per pointer-down), paint it immediately via `getContext("2d")` on the drawer's own canvas, and call the store's `drawStroke` on pointer-up; renders read-only (no handlers) for non-drawer viewers, painting `room.strokes` from the polled snapshot (already populated since T006)
- [X] T015 [P] [US1] Add `drawStroke(points)` to `frontend/src/state/roomStore.ts` calling `api.addStroke` and updating `RoomState` from the returned snapshot
- [X] T016 [US1] Replace the canvas placeholder in `frontend/src/pages/GamePage.tsx` with `<DrawingCanvas>`
- [X] T017 [P] [US1] Add unit tests for `DrawingCanvas`'s pointer-to-stroke point-accumulation logic (new stroke starts on pointer-down after a pointer-up, points appended while pressed), isolated from actual canvas painting per research.md's testing strategy

**Checkpoint**: User Story 1 is independently functional and testable, including guesser-side polling sync

---

## Phase 4: User Story 2 - Drawer Clears the Canvas (Priority: P2)

**Goal**: The drawer can clear all strokes back to blank in one action, without affecting guesses or scores

**Independent Test**: As the drawer, draw several strokes, trigger clear, and confirm the canvas is immediately blank for the drawer and (within one poll) for guessers, with no clear control available to guessers.

- [X] T018 [US2] Add `clearCanvasSchema` (`{ participantId: string }`) to `backend/src/api/schemas.ts`
- [X] T019 [US2] Add `clearCanvas(code, participantId)` to `backend/src/services/roomStore.ts`: same role/active checks as `addStroke`, sets `room.strokes = []`, does not touch `guesses` or any `score`
- [X] T020 [P] [US2] Add `POST /:code/clear` to `backend/src/api/rooms.ts`, same error mapping pattern as the strokes route
- [X] T021 [P] [US2] Add cases to `backend/src/services/roomStore.test.ts`: `clearCanvas` empties `strokes`; leaves `guesses`/scores untouched; rejects a non-drawer
- [X] T022 [P] [US2] Add cases to `backend/src/api/rooms.test.ts` for `POST /:code/clear`: `200`/`403`/`404`/`409`
- [X] T023 [US2] Add `clearCanvas()` to `frontend/src/services/api.ts` and a corresponding method on `frontend/src/state/roomStore.ts`
- [X] T024 [US2] Add a drawer-only "Clear" control to `frontend/src/components/DrawingCanvas.tsx` calling the store's `clearCanvas`

**Checkpoint**: User Stories 1 and 2 both work independently

---

## Phase 5: User Story 3 - Guesser Submits a Validated Guess (Priority: P1)

**Goal**: A guesser's trimmed, non-empty guess is recorded with a correctness flag; empty guesses and drawer submissions are rejected

**Independent Test**: As a guesser, submit a blank guess (rejected, nothing recorded) and a padded guess (trimmed and recorded); as the drawer, attempt to submit a guess (rejected).

- [X] T025 [US3] Add `guessSchema` (`{ participantId: string, text: z.string().trim().min(1, "Guess is required") }`) to `backend/src/api/schemas.ts`
- [X] T026 [US3] Add `submitGuess(code, participantId, text)` to `backend/src/services/roomStore.ts`: rejects the drawer and a non-active room, otherwise compares the trimmed `text` to `room.secretWord` case-insensitively and appends a fully-formed `GuessEntry` (`id`, `participantId`, `text`, `correct`, `submittedAt`) to `room.guesses`
- [X] T027 [P] [US3] Add `POST /:code/guesses` to `backend/src/api/rooms.ts`, mapping `submitGuess`'s failure reasons to `400`/`403`/`404`/`409` per `contracts/rooms-api.md`
- [X] T028 [P] [US3] Add cases to `backend/src/services/roomStore.test.ts`: trims input before comparing/recording; rejects empty/whitespace-only text; rejects a submission from the drawer; rejects when the room isn't active; records a non-matching guess with `correct: false`
- [X] T029 [P] [US3] Add cases to `backend/src/api/schemas.test.ts` for `guessSchema`: rejects blank/whitespace `text`; trims a padded value
- [X] T030 [P] [US3] Add cases to `backend/src/api/rooms.test.ts` for `POST /:code/guesses`: `200` for a guesser, `400` for a blank guess, `403` for the drawer, `404`/`409` as appropriate
- [X] T031 [US3] Add `submitGuess(code, participantId, text)` to `frontend/src/services/api.ts`
- [X] T032 [US3] Add a `submitGuess(text)` method to `frontend/src/state/roomStore.ts` calling `api.submitGuess` and updating `RoomState` from the returned snapshot
- [X] T033 [US3] Wire `frontend/src/components/GuessForm.tsx`'s `onSubmit` to the store's `submitGuess`, clearing the input on success and surfacing the rejection message on failure; disabled when the viewer is the drawer

**Checkpoint**: User Stories 1-3 all work independently

---

## Phase 6: User Story 4 - Guess History Synced to All Players (Priority: P1)

**Goal**: Every participant sees the same guess history via polling, with guess text redacted per the Clarifications session (visible only to the drawer, the submitting guesser, or once an entry is correct)

**Independent Test**: Submit an incorrect guess as one guesser and confirm a second guesser's history shows the attempt without the text; submit the correct word and confirm the text is now visible to the second guesser too.

- [X] T034 [US4] In `toRoomSnapshot()` in `backend/src/services/roomStore.ts`, project `room.guesses` into `GuessSnapshotEntry[]` per viewer: include `text` when the viewer is the drawer, the submitting guesser, or `entry.correct` is `true`; omit `text` otherwise. (`strokes` is already wired in unconditionally by T006 — this task only adds the `guesses` projection.)
- [X] T035 [P] [US4] Add cases to `backend/src/services/roomStore.test.ts`: drawer's snapshot includes `text` for every entry; a guesser's snapshot includes `text` for their own entries and any `correct: true` entry, and omits `text` for other guessers' incorrect entries
- [X] T036 [P] [US4] Add route-level cases to `backend/src/api/rooms.test.ts`: `GET /:code` as different viewers returns differently-redacted `guesses` arrays matching the examples in `contracts/rooms-api.md`
- [X] T037 [US4] Render `room.guesses` in `frontend/src/components/ResultPanel.tsx` (replacing the placeholder): guesser name + correct/incorrect marker always, literal guessed text only when present on the entry
- [X] T038 [P] [US4] Add a case to `frontend/src/services/api.test.ts` reflecting `strokes`/`guesses` in a `fetchRoom` response, including both a full entry (with `text`) and a redacted entry (no `text` key)

**Checkpoint**: User Stories 1-4 all work independently and together

---

## Phase 7: User Story 5 - Deterministic Scoring on Correct Guesses (Priority: P1)

**Goal**: A correct guess deterministically adds exactly 100 to the submitting guesser's score; an incorrect guess adds 0; the same guess sequence always reproduces the same final scores

**Independent Test**: Submit the secret word in a different case and confirm the score increases by exactly 100; submit an incorrect word from another guesser and confirm their score is unchanged; replay an identical guess sequence and confirm identical final scores.

- [X] T039 [US5] In `submitGuess()` in `backend/src/services/roomStore.ts` (extending T026), increment the submitting participant's `score` by exactly `100` when `correct` is `true`, atomically with appending the `GuessEntry`; leave `score` unchanged otherwise
- [X] T040 [P] [US5] Add cases to `backend/src/services/roomStore.test.ts`: a correct guess (including a different-case match) increases the submitting participant's score by exactly 100; an incorrect guess leaves it unchanged; a second correct guess from the same participant adds another 100; an incorrect guess submitted *after* an earlier correct guess from the same participant still adds 0 and is still recorded (FR-014); every participant's score is 0 immediately after a round starts; replaying an identical sequence of guesses (same secret word, same texts, same order) against a fresh room produces identical final scores (SC-006)
- [X] T041 [P] [US5] Add a case to `backend/src/api/rooms.test.ts`: `POST /:code/guesses`'s response reflects the updated `score` in the snapshot's `participants`
- [X] T042 [US5] Render each participant's `score` in `frontend/src/components/Scoreboard.tsx` (replacing the placeholder), sorted descending by score

**Checkpoint**: All five user stories work independently and together — this phase's full scope is complete

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final end-to-end validation

- [X] T043 Walk through `specs/003-drawing-canvas-guessing/quickstart.md` end-to-end across three browser tabs (drawer + two guessers): drawing/clearing visibility, guess validation, redacted guess-history sync, and deterministic scoring all match `contracts/rooms-api.md` and the spec. **Verified via curl against a live `npm run dev` instance** for every backend contract scenario (draw/clear role-gating, guess validation, redaction per viewer, scoring with trim/case-insensitivity) — all matched exactly. **Not done**: the actual two/three-browser-tab visual walkthrough (pointer-drawn strokes rendering on `<canvas>`, the Clear button, live polling UI) — recommend the user verify this manually in a browser, since canvas painting and pointer events can't be driven from this environment (see research.md's canvas-testing note)
- [X] T044 Run `npm run build && npm test` in both `backend/` and `frontend/` and confirm all green — 68 backend tests / 23 frontend tests, all passing

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories. Includes wiring `strokes` into `toRoomSnapshot()` (T006), since that has no redaction and every later story's manual/quickstart verification assumes it already works
- **User Story 1 (Phase 3)**: Depends on Foundational only
- **User Story 2 (Phase 4)**: Depends on Foundational; shares `DrawingCanvas.tsx`/the strokes route pattern with US1 (sequential edits to the same files, not parallel) but has independent test assertions and is independently testable once US1's canvas exists
- **User Story 3 (Phase 5)**: Depends on Foundational only; fully independent of US1/US2 (different files: `submitGuess`/`GuessForm.tsx` vs. `addStroke`/`clearCanvas`/`DrawingCanvas.tsx`)
- **User Story 4 (Phase 6)**: Depends on Foundational and on US3's `submitGuess`/`GuessEntry` existing (it redacts/displays guesses already being recorded), but is testable on its own once those exist (it's the exposure/redaction concern, not the recording one)
- **User Story 5 (Phase 7)**: Depends on Foundational and on US3's `submitGuess` existing (it extends the same function); independent of US4 (different concern — score vs. history visibility)
- **Polish (Phase 8)**: Depends on all five user stories being complete

### Within Each User Story

- Backend model/service changes before backend route-level tests
- Backend changes before frontend type/UI changes
- Tests for a change are added alongside that change's task

### Parallel Opportunities

- T004–T005 (Foundational, after T002–T003 land) can run in parallel — different files
- US3 (Phase 5) can be implemented in parallel with US1+US2 (Phase 3+4) by different people — disjoint files
- Within US1, T010/T011/T012/T017 (test files) can run in parallel with each other once their corresponding implementation tasks land
- Within US4/US5, the respective test-file tasks (T035/T036/T038, T040/T041) can run in parallel with each other

---

## Parallel Example: Foundational Phase

```bash
# After T002-T003 (sequential, same file) land:
Task: "Initialize score/strokes/guesses defaults in backend/src/services/roomStore.ts"
Task: "Mirror Stroke/GuessSnapshotEntry/score types in frontend/src/services/api.ts"
# T006 (strokes into toRoomSnapshot) depends on T002 only, can follow immediately after
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (includes strokes-in-snapshot wiring, T006)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: confirm drawing renders for the drawer, is blocked for guessers, and syncs to a guesser's canvas within one poll cycle, via quickstart scenario 1
5. This alone delivers the foundational interaction every later story depends on, even before clear/guess/score work lands

### Incremental Delivery

1. Setup + Foundational → foundation ready (strokes already sync via polling)
2. Add US1 → validate via quickstart scenario 1 (drawing, including guesser-side sync)
3. Add US2 → validate via quickstart scenario 2 (clear)
4. Add US3 → validate via quickstart scenario 3 (guess validation)
5. Add US4 → validate via quickstart scenario 4 (synced, redacted history)
6. Add US5 → validate via quickstart scenario 5 (scoring, including determinism)
7. Polish → run full automated suite (T044)

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Commit after each task or logical group, per the constitution's
  AI-Assisted Development & Self-Review principle
- Verify `npm test` stays green after each task before moving to the next
- Avoid: vague tasks, same-file conflicts marked [P], cross-story file edits that break independence
- Canvas pixel-painting itself is intentionally not covered by an automated
  test — see research.md's canvas-testing decision; `DrawingCanvas`'s
  pointer-to-stroke point logic (T017) is the testable seam, and actual
  visual rendering is verified manually via quickstart.md (T043)
- `strokes` is wired into the polled snapshot in Foundational (T006), not
  deferred to US4's redaction work, since it carries no secrecy rule and
  US1/US2's own quickstart scenarios depend on guesser-side sync already
  working at their checkpoint — this closes the sequencing gap flagged by
  `/speckit-analyze` (finding F1) against the previous revision of this file
