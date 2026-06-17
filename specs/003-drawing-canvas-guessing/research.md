# Research: Drawing Canvas, Guess Submission & Scoring

No `NEEDS CLARIFICATION` markers remain in the Technical Context — this
phase reuses the stack, layering, and sync model already established by
phases 1-2 (`backend/` Express+Zod+in-memory store, `frontend/` React+polling
state). The decisions below cover the design questions specific to this
phase's three new mechanics: canvas sync, guess redaction, and scoring.

## Decision: Canvas representation and sync model

**Decision**: Represent the canvas as an ordered array of `Stroke` objects
(`{ points: { x: number; y: number }[] }`) on the `Room`, appended to on each
drawer pointer-drag and replaced with `[]` on clear. The full `strokes` array
is included in every `RoomSnapshot` (visible to all viewers — drawing is not
secret) and re-rendered from scratch by guessers' clients on each poll.

**Rationale**: Matches the existing pattern of the backend in-memory store
being the single source of truth and the frontend treating polled snapshots
as authoritative (Constitution Principle III) — there is no delta/patch
protocol to keep clients in sync with, which keeps clear-canvas trivial
(`strokes = []`) and avoids any "did the guesser miss a delta" failure mode.
At lab scale (a handful of rooms, short rounds, simple shapes), re-sending
the full stroke array each poll is well within the performance/footprint
expectations in Constitution Principle VI — no pagination or diffing needed.

**Alternatives considered**:
- *Incremental diffs (only new points since last poll)* — rejected: adds a
  per-viewer "last seen" cursor to track, contradicting the
  snapshot-is-authoritative model and adding complexity with no measurable
  benefit at this scale.
- *Canvas image (e.g., base64 PNG) instead of vector strokes* — rejected:
  the drawer's own screen must render strokes immediately and locally
  (FR-002) before any round trip, which is natural for vector point data fed
  straight into `CanvasRenderingContext2D.lineTo`, but awkward for an image
  blob; vector strokes also keep clear-canvas a one-line state reset.

## Decision: Guess history redaction per viewer

**Decision**: `submitGuess` appends a `GuessEntry` (`participantId`, `text`,
`correct`, `submittedAt`) to the room's `guesses` array unconditionally.
`toRoomSnapshot(room, viewerParticipantId)` maps each entry to a
viewer-specific shape: the literal `text` is included only when the viewer
is the drawer, the viewer is the submitting guesser, or `correct` is `true`;
otherwise `text` is omitted (matching the existing `secretWord`/
`availableWords` redaction pattern from phase 2's `toRoomSnapshot`).

**Rationale**: Reuses the exact redaction mechanism already proven in phase
2 (computed server-side from `viewerParticipantId`, never client-trusted) —
satisfies the Clarifications-session decision (Option C) without inventing a
new mechanism, and keeps the guess's "ground truth" record (with `text`
always present in the backend's stored entry) intact for scoring/audit even
though it's redacted per-viewer in the snapshot.

**Alternatives considered**:
- *Separate `/guesses` endpoint returning the same redacted shape* —
  rejected: would duplicate the per-viewer redaction logic outside
  `toRoomSnapshot` and require a second polling loop on the frontend;
  embedding `guesses` directly in `RoomSnapshot` keeps one poll, one
  endpoint, consistent with phase 1/2's single `GET /rooms/:code`.

## Decision: Scoring storage and update path

**Decision**: Add `score: number` to `Participant` (defaulting to `0` at
creation, already true before a round starts since scores "start at 0").
`submitGuess` increments the submitting participant's `score` by exactly
`100` when the trimmed, case-insensitive comparison matches `room.secretWord`,
and leaves it unchanged otherwise — a pure, synchronous update inside the
same store call that appends the `GuessEntry`, so a guess's history entry
and its score effect are always applied atomically (no risk of one
succeeding without the other).

**Rationale**: Co-locating the score field on `Participant` (rather than a
separate `scores` map keyed by ID) keeps `RoomSnapshot.participants` the
single place every viewer reads both identity and score from, consistent
with how `isDrawer`/`isHost` were added in phase 2. Atomic update inside
`submitGuess` guarantees FR-018's determinism — score state can never
diverge from the guess history it was derived from.

**Alternatives considered**:
- *Derive score on every read by replaying the guess history* — rejected:
  works but is unnecessary recomputation on every poll for no benefit, and
  the lab's scale doesn't need that purity; a stored, incrementally-updated
  field is simpler to reason about and test directly.

## Decision: Canvas interaction testing strategy

**Decision**: Keep the pointer-event-to-stroke-array logic (start stroke on
pointer-down, append points on pointer-move while pressed, end stroke on
pointer-up) in a small pure reducer/hook that `vitest` can exercise directly
with synthetic point sequences, independent of actual `<canvas>` pixel
painting (which `jsdom`, the project's existing test environment, does not
implement). The `<canvas>` element's `getContext("2d")` drawing calls remain
a thin, untested-at-the-unit-level rendering layer driven by that stroke
state — manual two-browser verification (Constitution Principle II) covers
the actual visual rendering.

**Rationale**: `jsdom` (already configured in `frontend/vitest.config.ts`)
has no canvas 2D context implementation, so asserting pixel output isn't
feasible without adding a new dependency (e.g., `canvas` npm package) that
the constitution's "no unjustified new dependencies" rule would require
explicit justification for, which this lab-scope feature doesn't warrant.
Isolating the stroke-array logic from the imperative paint calls means the
testable, deterministic part (what points belong to what stroke) is fully
covered by `vitest`, while the actual paint is verified the same way phase
1/2's multi-browser flows were — manually.

**Alternatives considered**:
- *Add the `canvas` npm package to get real pixel assertions in jsdom* —
  rejected: a new dependency whose only purpose is enabling a kind of test
  this lab doesn't require (constitution Principle I: "unjustified new
  top-level dependencies are forbidden").
