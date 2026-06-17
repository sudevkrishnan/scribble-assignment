# Implementation Plan: Player Name Validation, Drawer Assignment & Secret Word Visibility

**Branch**: `002-drawer-word-assignment` | **Date**: 2026-06-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-drawer-word-assignment/spec.md`

## Summary

Replace the silent "Player" name fallback with server-side trim+reject
validation on create/join; on a successful `POST /rooms/:code/start`, assign
the host as drawer and deterministically pick a secret word from a hash of
the room code; redact the secret word and the candidate word list from every
non-drawer participant's snapshot, while making the drawer's identity itself
visible to everyone via a new `isDrawer` flag.

## Technical Context

**Language/Version**: TypeScript 5.6, Node.js 24, ES modules throughout (unchanged from phase 1)

**Primary Dependencies**: Backend — Express 4, Zod 3 (now also used for the name-validation rule). Frontend — React 18, react-router-dom 6, Vite 5. No new dependencies.

**Storage**: In-memory only (unchanged); the secret word/drawer are new fields on the existing in-memory `Room`, not new storage.

**Testing**: Vitest in both `backend/` and `frontend/`, extending the phase-1 test files (`roomStore.test.ts`, `schemas.test.ts`, `rooms.test.ts`, `api.test.ts`).

**Target Platform**: Browser client + local Node HTTP server (unchanged)

**Project Type**: Web application (existing `backend/` + `frontend/` split, unchanged)

**Performance Goals**: Word selection must be O(1) per start (a small string hash over a 4-character code) — no measurable performance impact.

**Constraints**: No WebSockets/database/auth (constitution Additional Constraints, unchanged). Word selection MUST be a pure function of the room code only — no RNG, no wall-clock time (per spec FR-007 and Edge Cases).

**Scale/Scope**: Same lab scale as phase 1 — a handful of concurrent rooms, single backend process.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Code Quality & Maintainability | Validation rule added via Zod (existing pattern); drawer/word logic added to existing `roomStore.ts`/`game.ts`, no new layers; no new top-level deps. | PASS |
| II. Test-First & Verification Discipline | New `vitest` cases planned for name rejection/trimming, drawer assignment, word-hash determinism, and redaction (drawer vs. non-drawer snapshots), extending existing test files. | PASS |
| III. Determinism & Game-Rule Integrity | Word selection is a pure function of the room code (no RNG, no time); drawer is always the host (no ambiguity per spec Edge Cases); redaction is computed server-side from `viewerParticipantId`, never client-trusted. | PASS |
| IV. Security & Input Integrity | Name validated at the Zod boundary; secret word and candidate list are never serialized into a non-drawer's response — not just hidden in the UI (satisfies the "non-UI path" edge case). | PASS |
| V. User Experience & Feedback Clarity | Blank-name rejection gives a specific message ("Player name is required"); the drawer is clearly labeled for every participant via `isDrawer`. | PASS |
| VI. Performance & Resource Efficiency | Hash computation is O(code length) = O(4); no new unbounded collections. | PASS |
| VII. AI-Assisted Development & Self-Review | Scope held strictly to FR-001–FR-011; drawing/guessing/scoring remain untouched (deferred per spec Assumptions). | PASS |

No violations. Complexity Tracking section is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/002-drawer-word-assignment/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
└── contracts/
    └── rooms-api.md       # Phase 1 output (additions to phase 1's contract)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/
│   │   └── game.ts            # MODIFY: Room gains drawerParticipantId?/secretWord?;
│   │                           #         RoomSnapshotParticipant gains isDrawer;
│   │                           #         RoomSnapshot gains secretWord?
│   ├── services/
│   │   ├── roomStore.ts       # MODIFY: createParticipant requires non-blank name;
│   │   │                      #         add selectSecretWord(code) hash helper;
│   │   │                      #         startGame() assigns drawer+word (once);
│   │   │                      #         toRoomSnapshot() redacts for non-drawers
│   │   └── roomStore.test.ts  # MODIFY: add cases for drawer/word assignment,
│   │                          #         idempotent repeat-start, redaction
│   ├── api/
│   │   ├── schemas.ts         # MODIFY: createRoomSchema/joinRoomSchema require
│   │   │                      #         trimmed, non-empty playerName
│   │   ├── schemas.test.ts    # MODIFY: add blank/whitespace-name rejection cases
│   │   └── rooms.test.ts      # MODIFY: add route-level redaction assertions
│   └── seed/starterData.ts    # (no change — same 5-word list)
└── tests/                      # (none beyond existing co-located *.test.ts)

frontend/
├── src/
│   ├── services/
│   │   ├── api.ts             # MODIFY: Participant gains isDrawer; RoomSnapshot
│   │   │                      #         gains secretWord?
│   │   └── api.test.ts        # MODIFY: add case(s) reflecting the new fields
│   └── pages/
│       ├── GamePage.tsx       # MODIFY: label the drawer for every viewer; show
│       │                      #         the secret word only when room.secretWord
│       │                      #         is present (i.e., viewer is the drawer)
│       └── LobbyPage.tsx      # MODIFY: navigate every participant (not only the
│                               #         host) to /game once room.status becomes
│                               #         "active" (closes a coverage gap found by
│                               #         /speckit-analyze — see research.md)
└── tests/                      # (none beyond existing co-located *.test.ts)
```

**Structure Decision**: Same `backend/` + `frontend/` split as phase 1. All
changes are additive/modifying within the existing `api → services → models`
(backend) and `services/pages` (frontend) layering — no new top-level
directories.

## Complexity Tracking

> Not applicable — no constitution violations to justify.
