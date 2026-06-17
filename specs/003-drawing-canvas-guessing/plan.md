# Implementation Plan: Drawing Canvas, Guess Submission & Scoring

**Branch**: `003-drawing-canvas-guessing` | **Date**: 2026-06-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-drawing-canvas-guessing/spec.md`

## Summary

Add a drawer-only freehand canvas (draw + clear) backed by a new
`Room.strokes` array, a guesser-only validated guess endpoint that appends
to `Room.guesses` and atomically scores `+100`/`+0` against the room's
secret word (trimmed, case-insensitive), and extend `GET /rooms/:code`'s
existing polling snapshot with `strokes`, a per-viewer-redacted `guesses`
projection (literal guess text hidden from non-drawer, non-submitting
viewers unless the guess was correct), and every participant's `score`.

## Technical Context

**Language/Version**: TypeScript 5.6, Node.js 24, ES modules throughout (unchanged from phases 1-2)

**Primary Dependencies**: Backend — Express 4, Zod 3 (now also validating stroke points and guess text). Frontend — React 18, react-router-dom 6, Vite 5, native Canvas 2D API (`HTMLCanvasElement.getContext("2d")`, no charting/drawing library). No new dependencies.

**Storage**: In-memory only (unchanged); `strokes`/`guesses`/`score` are new fields on the existing in-memory `Room`/`Participant`, not new storage.

**Testing**: Vitest in both `backend/` and `frontend/`, extending the existing test files (`roomStore.test.ts`, `schemas.test.ts`, `rooms.test.ts`, `api.test.ts`); canvas pointer-to-stroke logic isolated into a unit-testable hook/reducer since `jsdom` has no Canvas 2D context (see `research.md`).

**Target Platform**: Browser client + local Node HTTP server (unchanged)

**Project Type**: Web application (existing `backend/` + `frontend/` split, unchanged)

**Performance Goals**: Guess comparison and score update are O(1) per submission; redaction projection in `toRoomSnapshot` is O(guesses) per poll — negligible at lab scale (a handful of rooms, short rounds).

**Constraints**: No WebSockets/database/auth (constitution Additional Constraints, unchanged). Scoring MUST be deterministic — given the same secret word and guess sequence, identical scores every time (spec FR-019), independent of timing/request order between different guessers.

**Scale/Scope**: Same lab scale as phases 1-2 — a handful of concurrent rooms, single backend process, no stroke/guess count limits (per spec Assumptions).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Code Quality & Maintainability | New fields/endpoints added to existing `game.ts`/`roomStore.ts`/`rooms.ts` (no new layers); new frontend pieces (canvas hook, wired `GuessForm`/`Scoreboard`/`ResultPanel`) live in existing `components`/`state` dirs; no new top-level deps. | PASS |
| II. Test-First & Verification Discipline | New `vitest` cases planned for stroke append/clear, guess validation/trim/case-insensitivity, scoring, and per-viewer guess redaction, extending existing test files; canvas pixel rendering verified manually per `quickstart.md` (jsdom has no Canvas 2D context). | PASS |
| III. Determinism & Game-Rule Integrity | Scoring is a pure function of (secret word, guess text) — no RNG, no wall-clock dependence; server-authoritative `Room.strokes`/`guesses`/`score`, frontend never invents local score state (no optimistic score changes). | PASS |
| IV. Security & Input Integrity | Stroke points and guess text validated with Zod at the API boundary before reaching `roomStore`; guess text trimmed/rejected if empty with a clear error; drawer/guesser role checks enforced server-side, not just hidden in the UI. | PASS |
| V. User Experience & Feedback Clarity | Drawer sees own strokes with zero perceptible delay (local render before round trip); guess rejection shows a specific message; role-gated controls (canvas, clear, guess form) are visually distinguished per role. | PASS |
| VI. Performance & Resource Efficiency | No new unbounded collections beyond per-room `strokes`/`guesses` (bounded by room lifetime, same as `participants`); redaction computed per-poll, O(guesses), well within lab scale. | PASS |
| VII. AI-Assisted Development & Self-Review | Scope held strictly to FR-001–FR-019; no timers, multi-round play, or moderation introduced; redaction rule traces directly to the Clarifications session decision (Option C). | PASS |

No violations. Complexity Tracking section is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/003-drawing-canvas-guessing/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/
    └── rooms-api.md      # Phase 1 output (additions to phases 1-2's contract)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/
│   │   └── game.ts            # MODIFY: add Stroke, GuessEntry types;
│   │                           #         Room gains strokes[]/guesses[];
│   │                           #         Participant gains score;
│   │                           #         RoomSnapshot gains strokes/guesses,
│   │                           #         RoomSnapshotParticipant gains score
│   ├── services/
│   │   ├── roomStore.ts       # MODIFY: addStroke(), clearCanvas(),
│   │   │                      #         submitGuess() (trim/compare/score
│   │   │                      #         atomically); toRoomSnapshot() adds
│   │   │                      #         per-viewer guess-text redaction
│   │   └── roomStore.test.ts  # MODIFY: add cases for stroke append/clear,
│   │                          #         guess validation/scoring, redaction
│   ├── api/
│   │   ├── schemas.ts         # MODIFY: add strokeSchema (points[]),
│   │   │                      #         clearCanvasSchema, guessSchema
│   │   │                      #         (trimmed, non-empty text)
│   │   ├── schemas.test.ts    # MODIFY: add cases for the new schemas
│   │   ├── rooms.ts           # MODIFY: add POST /:code/strokes,
│   │   │                      #         POST /:code/clear,
│   │   │                      #         POST /:code/guesses
│   │   └── rooms.test.ts      # MODIFY: add route-level cases incl.
│   │                          #         role-gating (403) and redaction
│   └── seed/starterData.ts    # (no change)
└── tests/                      # (none beyond existing co-located *.test.ts)

frontend/
├── src/
│   ├── services/
│   │   ├── api.ts             # MODIFY: Stroke/GuessSnapshotEntry types,
│   │   │                      #         Participant gains score,
│   │   │                      #         RoomSnapshot gains strokes/guesses;
│   │   │                      #         add addStroke/clearCanvas/submitGuess
│   │   └── api.test.ts        # MODIFY: add cases for the new API calls
│   ├── state/
│   │   └── roomStore.ts       # MODIFY: add drawStroke()/clearCanvas()/
│   │                          #         submitGuess() methods that call the
│   │                          #         API and update RoomState from the
│   │                          #         returned snapshot (no local-only
│   │                          #         score/guess invention)
│   ├── components/
│   │   ├── DrawingCanvas.tsx  # NEW: <canvas> + pointer handlers; uses a
│   │   │                      #      small stroke-builder hook (unit
│   │   │                      #      testable independent of canvas paint)
│   │   │                      #      to turn pointer events into Stroke
│   │   │                      #      points; drawer-only, read-only canvas
│   │   │                      #      view for guessers
│   │   ├── GuessForm.tsx      # MODIFY: wire onSubmit to roomStore.submitGuess,
│   │   │                      #         surface validation error message
│   │   ├── Scoreboard.tsx     # MODIFY: render room.participants sorted by
│   │   │                      #         score, replacing the placeholder
│   │   └── ResultPanel.tsx    # MODIFY: render room.guesses (per-viewer
│   │                          #         redacted shape from the snapshot)
│   └── pages/
│       └── GamePage.tsx       # MODIFY: render <DrawingCanvas> (drawer can
│                               #         draw/clear, guessers view-only)
│                               #         instead of the placeholder div
└── tests/                      # (none beyond existing co-located *.test.ts)
```

**Structure Decision**: Same `backend/` + `frontend/` split as phases 1-2.
All changes are additive/modifying within the existing
`api → services → models` (backend) and `services/state/components/pages`
(frontend) layering — one new frontend component (`DrawingCanvas.tsx`) for
the canvas itself, no new top-level directories or libraries.

## Complexity Tracking

> Not applicable — no constitution violations to justify.
