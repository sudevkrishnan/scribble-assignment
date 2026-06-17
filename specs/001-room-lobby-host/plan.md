# Implementation Plan: Room Setup, Host Assignment & Lobby Sync

**Branch**: `001-room-lobby-host` | **Date**: 2026-06-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-room-lobby-host/spec.md`

## Summary

Add host assignment to room creation, validate join-by-code with three
distinct error cases (empty / invalid format / not found), keep rooms fully
isolated (already true via the in-memory `Map`), replace the Lobby's manual
refresh with ~2s automatic polling, gate the Start control to the host with
a 2-player minimum, and persist each client's participant identity in
`sessionStorage` so a tab reload reattaches to the same room/role instead of
starting over.

## Technical Context

**Language/Version**: TypeScript 5.6, Node.js 24 (per `.nvmrc`), ES modules throughout

**Primary Dependencies**: Backend — Express 4, Zod 3. Frontend — React 18, react-router-dom 6, Vite 5. No new dependencies.

**Storage**: In-memory only (`Map<string, Room>` in `backend/src/services/roomStore.ts`). Client-side: `sessionStorage` for participant identity reattachment (tab-scoped, not shared across tabs — required so two tabs can still simulate two distinct players). No database, per the constitution's Additional Constraints.

**Testing**: Vitest in both `backend/` and `frontend/`, extending `roomStore.test.ts`, `schemas.test.ts`, `api.test.ts`.

**Target Platform**: Browser client (frontend) + local Node HTTP server (backend), per the lab's existing setup.

**Project Type**: Web application (existing `backend/` + `frontend/` split)

**Performance Goals**: Lobby reflects a new participant within ~2-3s (FR-008, SC-004) via fixed-interval polling; no specific request-rate target beyond what one ~2s poll per connected client implies.

**Constraints**: No WebSockets, no database/persistent server-side storage, no auth — per constitution Additional Constraints. Client identity persistence MUST use tab-scoped storage only (see Research).

**Scale/Scope**: Lab-scale — a handful of concurrent rooms, each with a small number of participants, single backend process, no horizontal scaling concerns.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Code Quality & Maintainability | Stays within existing `api → services → models` layering and `src/state` pattern; no new top-level deps; strict TS, no `any`. | PASS |
| II. Test-First & Verification Discipline | New `vitest` cases planned for host assignment, code-format/not-found distinction, isolation, polling, start-gating, and identity reattachment, extending existing test files. Two-tab manual verification captured in quickstart.md. | PASS |
| III. Determinism & Game-Rule Integrity | Host is decided deterministically (creator only); start-gating rule (host + ≥2 participants) is a pure server-side check; frontend treats poll snapshots as authoritative, never inventing host/participant state locally. | PASS |
| IV. Security & Input Integrity | Room code format validated by Zod against the existing generation alphabet before lookup; join/start payloads validated at the API boundary; error responses carry no internal/stack detail. | PASS |
| V. User Experience & Feedback Clarity | Three distinct, specific error messages for empty/invalid/not-found; Start control visibly disabled (not hidden) for the host below 2 players, with an explanation; automatic polling removes the manual-refresh burden. | PASS |
| VI. Performance & Resource Efficiency | Polling stays at the spec's ~2s interval (no tighter); room lookups remain `Map` O(1); no new unbounded collections introduced. | PASS |
| VII. AI-Assisted Development & Self-Review | Plan stays scoped to spec's 4 user stories; no drawer/word/round logic implemented here (explicitly deferred per spec Assumptions). | PASS |

No violations. Complexity Tracking section is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/001-room-lobby-host/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/             # Phase 1 output
│   └── rooms-api.md
└── tasks.md               # Phase 2 output (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/
│   │   └── game.ts            # MODIFY: add hostParticipantId to Room/RoomSnapshot,
│   │                           #         isHost flag per participant in snapshot,
│   │                           #         RoomStatus union gains "active"
│   ├── services/
│   │   ├── roomStore.ts       # MODIFY: createRoom sets host; add startGame(),
│   │   │                      #         isRoomCodeFormatValid() helper
│   │   └── roomStore.test.ts  # MODIFY: add cases for host assignment, start gating
│   ├── api/
│   │   ├── schemas.ts         # MODIFY: roomCodeParamsSchema enforces code format;
│   │   │                      #         add startGameSchema (participantId in body)
│   │   ├── schemas.test.ts    # MODIFY: add format-validation cases
│   │   ├── rooms.ts           # MODIFY: join returns distinct 400 (invalid format)
│   │   │                      #         vs 404 (not found); add POST /:code/start
│   │   └── router.ts          # (no change expected; verify error mapping)
│   └── seed/starterData.ts    # (no change)
└── tests/                      # (none beyond existing co-located *.test.ts)

frontend/
├── src/
│   ├── state/
│   │   └── roomStore.ts       # MODIFY: read/write sessionStorage for identity,
│   │                          #         add startPolling()/stopPolling(), startGame()
│   ├── services/
│   │   ├── api.ts             # MODIFY: add startGame(code, participantId); surface
│   │   │                      #         distinct error messages from response body
│   │   └── api.test.ts        # MODIFY: add startGame test, error-message cases
│   └── pages/
│       └── LobbyPage.tsx      # MODIFY: auto-poll on mount/unmount, host-gated
│                               #         Start button (disabled + reason, or hidden
│                               #         for non-host), remove manual Refresh button
└── tests/                      # (none beyond existing co-located *.test.ts)
```

**Structure Decision**: Existing `backend/` + `frontend/` web-application split is
unchanged. All work is additive within the existing `api → services → models`
(backend) and `state/services/pages` (frontend) layering — no new top-level
directories or packages.

## Complexity Tracking

> Not applicable — no constitution violations to justify.
