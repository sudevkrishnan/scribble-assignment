# Discovery Notes — Scribble Starter

## Scope of review
Read `backend/src` (models, services, api) and `frontend/src` (state, services, pages) to verify what the starter actually does, beyond the README's claims.

## What exists today
- Backend: Express + TS, in-memory `Map<string, Room>` store (`roomStore.ts`), Zod-validated `POST /rooms`, `POST /rooms/:code/join`, `GET /rooms/:code`, `GET /health`.
- Frontend: Vite + React + TS, `RoomStore` (custom external-store class, not Zustand/Context-as-doc'd) wired through `RoomStoreProvider`/`useRoomState`, pages for Start/Create/Join/Lobby/Game, manual "Refresh Room" button on Lobby.
- Game model (`models/game.ts`): `Room` has `code`, `status` (only literal value `"lobby"`), `participants[]`, timestamps. No `hostId`, no `drawerId`, no `secretWord`, no `guesses`, no `scores`, no round/result state at all.

## Gaps (incomplete behavior)
1. **No host concept.** `Room`/`Participant` have no `isHost`/`hostId` field; `LobbyPage`'s "Start Game" button is unconditionally enabled and just navigates to `/game` client-side — no server call, no 2-player minimum check, no host-only restriction.
2. **No drawer/word/round state.** `RoomStatus` type only has `"lobby"`; nothing models an active round, drawer assignment, or secret-word visibility. `GamePage` (per README) is placeholder-only.
3. **No polling.** Lobby refresh is a manual button (`handleRefresh` in `LobbyPage.tsx`) calling `roomStore.fetchRoom()` once per click; no `setInterval`/polling loop anywhere in frontend.
4. **Player-name validation is absent, not just "not yet strict."** `schemas.ts`: `playerName: z.string().optional()`. `roomStore.ts` `displayName()` silently substitutes `"Player"` for falsy names instead of trimming/rejecting empty or whitespace-only input — this is an existing wrong-default behavior, not a no-op gap.
5. **Room code validation is a no-op.** `roomCodeParamsSchema` is `z.object({ code: z.string() })` — empty string passes Zod; join failure only surfaces as a generic 404 "Unable to join room" from `roomStore.joinRoom` returning `null` for unknown codes. No distinct "invalid code format" vs "room not found" feedback.
6. **No drawing, guessing, or scoring logic anywhere.** No canvas event model, no guess endpoint/schema, no score field on `Participant`, no result/restart endpoints.

## Assumptions
1. The `toRoomSnapshot(room, viewerParticipantId)` function already accepts a viewer ID but currently ignores it (`void viewerParticipantId`) — this is the intended seam for later drawer-only word visibility (viewer-scoped snapshot fields) rather than a separate new endpoint.
2. "Deterministic secret word selection" (Scenario 2) should be implemented using `STARTER_WORDS`/`STARTER_ROLES` already seeded in `backend/src/seed/starterData.ts` and exposed via `listWords()`/`toRoomSnapshot` — no new word source is expected, and out-of-scope rules forbid random/custom word packs, so determinism likely means index-based (e.g. by room creation order or round number), not `Math.random()`.

## Relevant files
- `backend/src/models/game.ts` — core types; will need `hostId`/drawer/round/score additions.
- `backend/src/services/roomStore.ts` — in-memory CRUD, name defaulting, snapshot building.
- `backend/src/api/rooms.ts`, `backend/src/api/schemas.ts` — routes and Zod validation (currently permissive).
- `backend/src/seed/starterData.ts` — `STARTER_WORDS`, `STARTER_ROLES`.
- `frontend/src/state/roomStore.ts` — client store; no polling, no round/score state.
- `frontend/src/services/api.ts` — typed fetch client mirroring backend snapshot shape.
- `frontend/src/pages/LobbyPage.tsx` — manual refresh button, unconditional Start Game button.
- `frontend/src/pages/GamePage.tsx` — placeholder canvas/guess/scoreboard/result UI (not yet reviewed in detail, per README confirmed non-functional).
