# Reflection

## Starter app was a limited skelton

- **Backend (Express + TS)**: in-memory `roomStore` with `createRoom`, `joinRoom`, `getRoom`, `saveRoom`, `toRoomSnapshot`. Rooms only had a `lobby` status, a 4-char room code generator, and participants (id/name/joinedAt).
- **API routes**: `POST /rooms` (create), `POST /rooms/:code/join`, `GET /rooms/:code`. No start/draw/guess/end/restart endpoints.
- **Frontend (React)**: pages for `StartPage`, `CreateRoomPage`, `JoinRoomPage`, `LobbyPage`, `GamePage`. Components: `AppShell`, `Card`, `PageHeader`, `RoomCodeBadge`, `GuessForm`, `ResultPanel`, `Scoreboard` — mostly static/placeholder UI, no real game loop wired up.
- **No drawing canvas, no scoring logic, no round/result/restart state machine.**

## What was added

### Backend

- Game state machine in `models/game.ts` and `services/roomStore.ts`: room status now flows `lobby → playing → result` (or back to lobby on restart), with drawer/word assignment, round timing, and scoring.
- New service functions: `startGame`, `addStroke`, `clearCanvas`, `submitGuess`, `endRound`, `restartRoom` — each returning a typed `{ ok, reason }` result for explicit error handling.
- New API routes: `POST /:code/start`, `POST /:code/strokes`, `POST /:code/clear`, `POST /:code/guesses`, `POST /:code/end-round`, `POST /:code/restart`, each mapped to specific HTTP error codes (403/404/409) via reason-keyed lookup tables.
- Schema validation expanded (`schemas.ts`) for stroke points, guesses, start/end-round/restart payloads, and room-code pattern checks.
- Large expansion of `roomStore.test.ts` (+557 lines) covering the new state transitions.

### Frontend

- New `DrawingCanvas` component (freehand stroke drawing/clearing, synced to backend).
- New `strokeBuilder` utility + tests for converting pointer events to stroke point batches.
- New `ResultPage` for the post-round reveal/scoreboard screen, plus routing entry.
- `GamePage`, `LobbyPage`, `GuessForm`, `ResultPanel`, `Scoreboard` updated to drive the live game loop (start game, guessing, end round, restart) instead of static placeholders.
- New `roomIdentity` state module (+tests) for persisting participant identity across reloads.
- `api.ts` expanded with client calls for the new endpoints (start/stroke/clear/guess/end-round/restart), with matching test coverage.

### Process / tooling (not app code)

- Added Spec Kit workflow (`.specify/`, `.claude/skills/speckit-*`) for spec-driven feature development.
- Added `specs/001`–`specs/005` feature folders (spec, plan, tasks, data-model, contracts, research, quickstart, checklists) documenting each increment: room/lobby/host, drawer/word assignment, drawing canvas/guessing, and result/restart.
- Added CI workflows (build checks, PR template/validation, label automation) and Vitest setup for both backend and frontend.

/speckit-analyze is very helpful and neccessary. it found real mismatches all the time. It also caught real bugs, not just doc nits - this was super good.

multiple instances of deviation from Constitution and then rebuilding. But presence of constituion helped and controlled this.
Implementation always contracts first. and follows a very logical step.

## Summary

The starter app was a lobby-only scaffold (create/join/view room, no gameplay). What was built on top is the entire game: word/drawer assignment, live drawing canvas, guessing, round ending, scoring, result reveal, and restart — plus the full spec-driven workflow and CI/testing infrastructure used to build it incrementally.
