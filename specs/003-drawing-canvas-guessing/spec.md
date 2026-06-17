# Feature Specification: Drawing Canvas, Guess Submission & Scoring

**Feature Branch**: `003-drawing-canvas-guessing`

**Created**: 2026-06-17

**Status**: Draft

**Input**: User description: "Given a round is active with a drawer and guessers (all scores start at 0), When the drawer draws/clears the canvas and guessers submit their guesses, Then the drawing is visible on the drawer's screen; guesses are trimmed, case-insensitively compared, and empty ones rejected; the guess history is synced to all players via polling; correct guesses score 100 (incorrect add 0). Interactive drawing canvas, clear canvas, guess submission with validation, synced guess history via polling, deterministic scoring."

## Clarifications

### Session 2026-06-17

- Q: The guess history (FR-010, FR-017) records and syncs "what they
  guessed" to everyone — should the literal guessed text always be visible
  to other guessers, even though that would reveal the secret word to
  everyone the instant anyone solves it? → A: Show the literal guessed text
  to everyone only once that guess is marked correct (the word is revealed
  at that point anyway); incorrect guesses remain visible to other
  guessers only as an attempt (guesser name + incorrect marker), with the
  attempted text hidden from anyone other than the guesser who submitted it
  and the drawer.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Drawer Draws on an Interactive Canvas (Priority: P1)

The drawer, once assigned, can freely draw on a canvas using basic pointer
input, and sees their own strokes appear immediately on their screen.

**Why this priority**: Without a working canvas the drawer has no way to
convey the secret word at all — this is the foundational interaction every
other story in this phase depends on.

**Independent Test**: As the drawer, press and drag on the canvas; confirm
continuous strokes render immediately, matching the pointer's path, with no
visible lag or missing segments.

**Acceptance Scenarios**:

1. **Given** an active round with an assigned drawer, **When** the drawer
   presses down and drags across the canvas, **Then** a continuous stroke
   is drawn following the pointer path on the drawer's screen.
2. **Given** the drawer is mid-stroke, **When** they lift the pointer and
   press down again elsewhere, **Then** a new, separate stroke begins
   without connecting to the previous one.
3. **Given** a non-drawer (guesser) views the game screen, **When** they
   attempt to draw on the canvas, **Then** no stroke is drawn — drawing
   input is accepted only from the drawer.

---

### User Story 2 - Drawer Clears the Canvas (Priority: P2)

The drawer can clear the entire canvas back to blank with a single action,
discarding everything drawn so far.

**Why this priority**: A mistake-recovery action that materially improves
usability, but the game is still playable without it (User Story 1 alone
delivers a usable canvas).

**Independent Test**: As the drawer, draw several strokes, click "Clear,"
and confirm the canvas is immediately blank with no residual strokes.

**Acceptance Scenarios**:

1. **Given** the drawer has drawn one or more strokes, **When** they
   trigger the clear action, **Then** the canvas immediately becomes
   blank.
2. **Given** the canvas was just cleared, **When** the drawer draws a new
   stroke, **Then** only the new stroke is visible — no prior strokes
   reappear.
3. **Given** a guesser views the game screen, **When** the drawer clears
   the canvas, **Then** no clear control is available to the guesser (the
   action is drawer-only).

---

### User Story 3 - Guesser Submits a Validated Guess (Priority: P1)

A guesser types a word and submits it as a guess; the system trims it,
rejects it if empty, and records it for scoring and history.

**Why this priority**: Guessing is the other half of the core gameplay loop
— without validated guess submission there is nothing for the drawer's
canvas to be answered against, and no path to scoring.

**Independent Test**: As a guesser, submit a blank/whitespace-only guess and
confirm it is rejected with no entry added; submit a guess with
leading/trailing whitespace and confirm it is trimmed before being recorded.

**Acceptance Scenarios**:

1. **Given** an active round, **When** a guesser submits an empty or
   whitespace-only guess, **Then** the guess is rejected with a clear
   message and no entry is added to the guess history.
2. **Given** an active round, **When** a guesser submits a guess with
   leading/trailing whitespace (e.g., `"  pizza  "`), **Then** the
   trimmed form (`"pizza"`) is what gets recorded and compared.
3. **Given** an active round, **When** the drawer attempts to submit a
   guess, **Then** the submission is rejected — only guessers may submit
   guesses.
4. **Given** an active round, **When** a guesser submits a non-empty,
   valid guess, **Then** a new entry is added to the guess history
   recording who guessed, what they guessed, and whether it was correct.

---

### User Story 4 - Guess History Synced to All Players (Priority: P1)

Every participant — drawer and guessers alike — sees the same, growing list
of submitted guesses, kept up to date via polling.

**Why this priority**: Shared visibility into what's been guessed is what
makes this a group game rather than isolated private guesses; it must land
alongside guess submission to make User Story 3 observable and useful.

**Independent Test**: With two guessers in the same room, have one submit an
incorrect guess and confirm the other guesser's history shows only the
guesser's name and an incorrect marker (not the guessed text); have the
same guesser then submit the correct word and confirm the other guesser's
history now shows the literal guessed text for that entry.

**Acceptance Scenarios**:

1. **Given** a guesser submits a valid, incorrect guess, **When** any
   other guesser's client next polls, **Then** that entry appears in
   their guess history attributed to the submitting guesser and marked
   incorrect, but without the guessed text.
2. **Given** a guesser submits a valid, correct guess, **When** any other
   participant's client next polls, **Then** that entry appears in their
   guess history showing the literal guessed text, attributed to the
   submitting guesser and marked correct.
3. **Given** a guesser submits any valid guess, **When** that same
   guesser's client next polls, **Then** their own history entry always
   shows their own literal guessed text, correct or not.
4. **Given** a guesser submits any valid guess, **When** the drawer's
   client next polls, **Then** the drawer's history view always shows the
   literal guessed text, correct or not.
5. **Given** multiple guesses have been submitted by different guessers,
   **When** any participant views the guess history, **Then** every
   submitted guess is shown in submission order, each attributed to the
   guesser who made it, subject to the text-visibility rule above.
6. **Given** a guess was rejected for being empty, **When** any
   participant views the guess history, **Then** that rejected attempt
   does not appear in the history.

---

### User Story 5 - Deterministic Scoring on Correct Guesses (Priority: P1)

A guess that matches the secret word (case-insensitively, after trimming)
immediately and deterministically awards that guesser 100 points; a guess
that doesn't match awards 0.

**Why this priority**: Scoring is the payoff that makes guessing meaningful;
it depends on guess submission and history (User Stories 3-4) already
working, so it is the natural capstone of this phase.

**Independent Test**: With a known secret word, have a guesser submit the
exact word in a different case (e.g., `"PIZZA"` vs. `"pizza"`) and confirm
their score increases by exactly 100; have another guesser submit an
incorrect word and confirm their score is unchanged.

**Acceptance Scenarios**:

1. **Given** the secret word is `"pizza"`, **When** a guesser submits
   `"pizza"`, `"PIZZA"`, or `"PiZzA"`, **Then** the guess is scored as
   correct and that guesser's score increases by exactly 100.
2. **Given** the secret word is `"pizza"`, **When** a guesser submits any
   other word (e.g., `"pasta"`), **Then** the guess is scored as
   incorrect and that guesser's score is unchanged (increases by 0).
3. **Given** a guesser has already guessed correctly in the round,
   **When** they submit another guess, **Then** that subsequent guess is
   still recorded and scored independently using the same matching rule
   (no special-casing for "already solved").
4. **Given** scores start at 0 for every participant at round start,
   **When** the round progresses through several guesses, **Then** each
   participant's displayed score always equals the sum of 100-point
   awards from their own correct guesses, and never reflects another
   participant's guesses.

---

### Edge Cases

- A guess consisting only of unicode whitespace/invisible characters MUST be
  treated as blank and rejected, the same as ASCII whitespace.
- A guess that matches the secret word except for surrounding whitespace
  (e.g., `" pizza "`) MUST still be scored as correct, since trimming
  happens before comparison.
- The drawer's client MUST render a line segment connecting every consecutive
  pair of pointer-move events it receives during a stroke, with no
  batching, throttling, or sampling that would skip a received event —
  so the rendered line's continuity is bounded by the input device's own
  event rate, not by an additional rendering-side gap.
- Clearing the canvas MUST NOT affect the guess history or any scores —
  these are independent pieces of state.
- The drawer attempting to submit a guess, and a guesser attempting to draw
  or clear the canvas, MUST both be rejected — the two roles' actions are
  mutually exclusive.
- Once a guesser's guess is marked correct and its text revealed to
  everyone, any of that guesser's later guesses in the same round still
  follow the same per-guess visibility rule (e.g., a later incorrect guess
  is still hidden from other guessers) — revealing one entry's text does
  not change the visibility rule applied to other entries.
- A guesser polling mid-stroke MUST see the canvas only on its next poll,
  not as a live, persistent connection — out-of-date-by-up-to-one-poll-cycle
  display is expected and acceptable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow the assigned drawer, and only the drawer, to
  add strokes to the active round's canvas via continuous pointer-drag
  input.
- **FR-002**: System MUST render the drawer's own strokes on the drawer's
  screen immediately as they draw, without waiting for any round trip.
- **FR-003**: System MUST treat a pointer lift followed by a new pointer-down
  as the start of a new, visually separate stroke.
- **FR-004**: System MUST reject drawing input from any non-drawer
  participant.
- **FR-005**: System MUST allow the drawer, and only the drawer, to trigger
  a clear action that removes all strokes from the active round's canvas.
- **FR-006**: System MUST NOT allow a clear action to affect the guess
  history or any participant's score.
- **FR-007**: System MUST trim leading/trailing whitespace from a submitted
  guess before validating or comparing it.
- **FR-008**: System MUST reject an empty or whitespace-only guess (after
  trimming) with a clear message, and MUST NOT add it to the guess history
  or affect any score.
- **FR-009**: System MUST reject a guess submission from the drawer; only
  guessers may submit guesses.
- **FR-010**: System MUST record each accepted (non-empty, trimmed) guess in
  a guess history, attributed to the submitting guesser, in submission
  order, along with whether it was scored correct.
- **FR-011**: System MUST compare an accepted guess to the round's secret
  word case-insensitively after trimming both sides.
- **FR-012**: System MUST award exactly 100 points to a guesser's score when
  their submitted guess matches the secret word per the comparison rule in
  FR-011.
- **FR-013**: System MUST award exactly 0 points (no change) to a guesser's
  score when their submitted guess does not match the secret word.
- **FR-014**: System MUST continue to accept and score subsequent guesses
  from a guesser who has already guessed correctly in the round, using the
  same matching and scoring rule.
- **FR-015**: System MUST initialize every participant's score to 0 at the
  point a round becomes active.
- **FR-016**: System MUST make the current canvas state available to every
  participant's client via polling, so guessers' views reflect the drawer's
  latest strokes and clears within one polling cycle.
- **FR-017**: System MUST make the current guess history and every
  participant's current score available to every participant's client via
  polling.
- **FR-018**: System MUST include the literal guessed text in a guess
  history entry sent to a given participant's client only when that
  participant is the drawer, the guesser who submitted that entry, or the
  entry was scored correct; for any other participant viewing an incorrect
  entry that isn't their own, the entry MUST include only the submitting
  guesser's identity and the incorrect marker, never the guessed text.
- **FR-019**: System MUST keep scoring deterministic — given the same secret
  word and the same sequence of submitted guesses, the resulting scores MUST
  always be identical, independent of timing or request order between
  different guessers.
- **FR-020**: For a redacted guess-history entry (per FR-018), the UI MUST
  still display, at minimum, the submitting guesser's identity and a
  visual indicator that the attempt was incorrect — the absence of the
  guessed text MUST NOT be presented as a missing or broken entry.

### Key Entities

- **Stroke**: A single continuous pointer-drag drawing action, represented
  as an ordered sequence of points; the canvas is the ordered collection of
  all strokes drawn since the last clear.
- **Guess**: A single submission by a guesser — the trimmed text, the
  submitting participant, and whether it was scored correct — appended to
  the round's guess history in submission order. The guessed text is
  visible to the drawer and to the submitting guesser unconditionally, and
  to every other participant only once the entry is marked correct;
  incorrect entries shown to other guessers carry the guesser's identity
  and the incorrect marker without the text.
- **Score** *(extends Participant from prior phases)*: A non-negative
  integer per participant, starting at 0 when the round becomes active and
  incremented by 100 for each of that participant's own correct guesses.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the drawer's pointer-drag strokes render on the
  drawer's own screen with no perceptible delay (within the same
  interaction, before any network round trip).
- **SC-002**: 100% of drawing and clear attempts by non-drawer participants
  are rejected, with the canvas unchanged.
- **SC-003**: 100% of empty or whitespace-only guess submissions are
  rejected with a clear message and never appear in the guess history.
- **SC-004**: 100% of guesses that match the secret word case-insensitively
  (after trimming) result in exactly a 100-point increase for the
  submitting guesser, and 0% of non-matching guesses change any score.
- **SC-005**: 100% of connected participants see a given canvas update,
  guess-history entry, or score change within one polling cycle of it
  occurring, with no manual refresh required — where a polling cycle is
  the client's configured poll interval (currently ~2s; the "~2s" figure
  is descriptive context, not itself the pass/fail threshold — "one
  polling cycle" is).
- **SC-006**: Repeating an identical sequence of guesses against the same
  secret word always produces the same final scores, across 100% of
  repeated trials.

## Assumptions

- "The round" in this phase covers live drawing, guessing, and scoring only;
  round/result transitions (e.g., what happens after a correct guess, time
  limits, or moving to a next round) remain out of scope and are covered by
  a later phase, per the lab's explicit exclusions on timers/multi-round
  play.
- The canvas is a single shared drawing surface per room with no per-tool
  options (color, brush size, undo single-stroke) — only freehand drawing
  and a full clear, matching the lab's minimal-scope guidance.
- Guess history and scores persist only in-memory for the lifetime of the
  active round/room, consistent with the project's no-persistent-storage
  constraint.
- There is no limit on how many guesses a single guesser may submit,
  including after guessing correctly (FR-014); the lab's scope excludes any
  "game over" or "round complete" condition in this phase.
- Canvas strokes and scores carry no secrecy and are visible to every
  participant unconditionally; only the literal text of an incorrect guess
  is restricted (per the Clarifications session), continuing the prior
  phase's principle of not letting one participant's view leak the answer
  to others before they've earned it.
