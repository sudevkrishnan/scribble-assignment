# Feature Specification: Player Name Validation, Drawer Assignment & Secret Word Visibility

**Feature Branch**: `002-drawer-word-assignment`

**Created**: 2026-06-17

**Status**: Draft

**Input**: User description: "Given a game is starting and player names are trimmed (empty/whitespace-only rejected with a message), When the first round begins, Then the host (or first player) becomes the clearly-identified drawer, and the secret word (deterministically selected from the starter list) is visible only to the drawer. Player name validation (trim, reject empty), drawer assignment, deterministic secret word selection, drawer-only word visibility"

## Clarifications

### Session 2026-06-17

- Q: How should the secret word be deterministically selected from the starter list when a round begins? → A: Derived from the room code (e.g. a hash of the code picks the index), so different rooms get different words but the same room always reproduces the same word.
- Q: Should the candidate word list (`availableWords`) also be hidden from non-drawer participants, now that drawer-only secret word visibility is being enforced? → A: Yes — hide it from non-drawers too; only the drawer needs to see anything about the word pool, and they have the actual secret word directly.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Player Name Validation on Create/Join (Priority: P1)

A player creating or joining a room must provide a usable display name —
blank or whitespace-only names are rejected with a clear message instead of
being silently replaced with a generic placeholder.

**Why this priority**: This is a foundational input-integrity fix that the
previous phase explicitly deferred. Drawer/word assignment needs a reliable,
non-empty name to label "Drawer" against, so this must land first.

**Independent Test**: Submit an empty name and a whitespace-only name on both
the Create Room and Join Room screens; confirm both are rejected with a
clear message and no room/participant is created. Submit a name with
leading/trailing whitespace; confirm it's trimmed and accepted.

**Acceptance Scenarios**:

1. **Given** the Create Room screen, **When** a player submits an empty or
   whitespace-only name, **Then** the request is rejected with a clear
   message and no room is created.
2. **Given** the Join Room screen, **When** a player submits an empty or
   whitespace-only name, **Then** the request is rejected with a clear
   message and they do not join the room.
3. **Given** either screen, **When** a player submits a name with
   leading/trailing whitespace (e.g., `"  Alice  "`), **Then** the name is
   trimmed before being stored and displayed (e.g., `"Alice"`).

---

### User Story 2 - Drawer Assignment at Round Start (Priority: P1)

When the host starts the game, the host is assigned as the round's drawer,
and this is clearly visible to every participant.

**Why this priority**: Drawer assignment is the pivot the rest of gameplay
(drawing, guessing, scoring) depends on; without a clearly identified drawer,
no later phase can build guess validation against "who is the drawer."

**Independent Test**: With a host and at least one guesser in the lobby,
start the game and confirm every connected participant's view clearly shows
the host as "Drawer" and every other participant as a guesser.

**Acceptance Scenarios**:

1. **Given** a room with a host and one or more other participants,
   **When** the host starts the game, **Then** the host becomes the round's
   drawer.
2. **Given** the round has started, **When** any participant views the game
   screen, **Then** the drawer is clearly and unambiguously identified
   (e.g., labeled "Drawer") to everyone, including the drawer themselves.
3. **Given** the round has started, **When** a non-drawer participant views
   the game screen, **Then** they are clearly identified as a guesser, not
   as the drawer.

---

### User Story 3 - Deterministic Secret Word Selection (Priority: P1)

When the round starts, a secret word is selected from the starter word list
using a rule that always produces the same word for the same room, so
behavior is reproducible and testable.

**Why this priority**: Scoring and guess validation (future phases) require
a stable, known answer for the round; non-deterministic selection would make
this and downstream phases unverifiable.

**Independent Test**: Start the same room's game twice in a row (e.g., via
restart, once that exists) or inspect the same room's selected word across
repeated server-side checks; confirm the same room always yields the same
word. Start games in two different rooms; confirm each gets a word from the
starter list (not necessarily different from each other, but each
independently valid).

**Acceptance Scenarios**:

1. **Given** a room starts its round, **When** the secret word is selected,
   **Then** it is one of the five starter words (`rocket`, `pizza`,
   `castle`, `guitar`, `sunflower`).
2. **Given** the same room code, **When** the selection rule is evaluated
   again for that room, **Then** it deterministically produces the same
   word every time (no randomness).

---

### User Story 4 - Drawer-Only Word Visibility (Priority: P1)

The secret word — and the candidate word list it came from — is visible
only to the drawer; every other participant's view never includes it.

**Why this priority**: This is the core secrecy guarantee the guessing game
depends on; without it, guessers could trivially see the answer and the game
has no challenge.

**Independent Test**: With a round started, inspect the drawer's view and
confirm the secret word is shown. Inspect a guesser's view (and the raw data
available to their client) and confirm neither the secret word nor the
candidate word list appears anywhere.

**Acceptance Scenarios**:

1. **Given** a round has started, **When** the drawer views the game
   screen, **Then** the secret word is clearly displayed to them.
2. **Given** a round has started, **When** a guesser views the game screen,
   **Then** the secret word is not displayed, hinted at, or otherwise
   discoverable from their view.
3. **Given** a round has started, **When** a guesser's client receives data
   about the room, **Then** that data does not include the secret word or
   the candidate word list in any field.

---

### Edge Cases

- A player name consisting only of unicode whitespace/invisible characters
  MUST be treated as blank and rejected, not merely literal ASCII spaces.
- Drawer assignment MUST always resolve to the host — since the host is
  always the room's creator and no leave/disconnect handling exists yet
  (per the prior phase's Assumptions), "host" and "first player" are the
  same participant; there is no scenario in this phase where they differ.
- Word selection MUST NOT depend on wall-clock time, request order, or any
  other non-reproducible input — only the room code.
- A guesser attempting to retrieve the secret word through any non-UI path
  (e.g., a direct request for room data) MUST still never receive it — the
  restriction is enforced by what the server sends, not by hiding it in the
  UI only.
- If the host starts the game more than once (e.g., a double-click or a
  retried request), the same drawer and same secret word MUST result — no
  re-randomization or reassignment on a repeated start.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST trim leading/trailing whitespace from a submitted
  player name before validating or storing it, on both create and join.
- **FR-002**: System MUST reject an empty or whitespace-only player name on
  create with a clear, specific message, and MUST NOT create a room.
- **FR-003**: System MUST reject an empty or whitespace-only player name on
  join with a clear, specific message, and MUST NOT add the participant.
- **FR-004**: System MUST assign the host as the round's drawer at the
  moment the game successfully starts.
- **FR-005**: System MUST identify exactly one drawer per active round.
- **FR-006**: System MUST make the drawer's identity visible to every
  participant's view, distinguishing the drawer from guessers.
- **FR-007**: System MUST select a secret word from the starter word list
  (`rocket`, `pizza`, `castle`, `guitar`, `sunflower`) at the moment the game
  successfully starts, using a rule based solely on the room's code, so the
  same room always reproduces the same word.
- **FR-008**: System MUST include the secret word in data sent to the
  drawer's client.
- **FR-009**: System MUST NOT include the secret word, in any field, in data
  sent to a non-drawer participant's client.
- **FR-010**: System MUST NOT include the candidate word list in data sent
  to a non-drawer participant's client.
- **FR-011**: System MUST produce the same drawer and the same secret word
  if the start action is repeated for a room that has already started.

### Key Entities

- **Round**: The single active round for a room once started; has exactly
  one drawer (a Participant) and one secret word (drawn from the starter
  list).
- **Participant** *(extends the prior phase's entity)*: Gains a derived
  drawer/guesser distinction for the active round, in addition to its
  existing host/non-host distinction.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of create/join attempts with an empty or whitespace-only
  name are rejected with a clear message, with no room or participant
  created as a side effect.
- **SC-002**: 100% of names containing leading/trailing whitespace are
  stored and displayed in trimmed form.
- **SC-003**: 100% of started rounds result in exactly one participant
  (the host) being clearly identified as the drawer to all participants.
- **SC-004**: 100% of started rounds select a secret word from the 5-word
  starter list, and repeating the selection for the same room code always
  yields the same word.
- **SC-005**: 0% of data delivered to a non-drawer participant's client
  contains the secret word or the candidate word list, across 100% of
  inspected requests/responses for that participant.

## Assumptions

- This phase supersedes the prior phase's player-name Assumption (which
  deferred name validation and kept a default-name fallback); that fallback
  is removed by FR-002/FR-003.
- The secret-word selection rule (room-code-derived) is a permanent,
  reproducible function of the room code only — it does not need to change
  per round, since multiple rounds remain out of scope per the lab's
  exclusions.
- "The round" in this phase refers only to drawer/word assignment at start;
  drawing interaction, guess submission, scoring, and round/result
  transitions remain out of scope and are covered by later phases.
- Existing room/lobby/start-gating behavior from the prior phase
  (`001-room-lobby-host`) is unchanged except where this spec explicitly
  modifies it (player-name validation, and the data now attached at
  successful start).
