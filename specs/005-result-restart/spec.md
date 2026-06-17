# Feature Specification: Round Result, Host Restart & Final Validation

**Feature Branch**: `005-result-restart`

**Created**: 2026-06-17

**Status**: Draft

**Input**: User description: "implement scenario phase 4 Result, Restart & Final Validation - Given a round has ended, When the result state is displayed and the host restarts, Then all players see the correct word, final scores, and full guess history; on restart, everyone returns to the lobby with players preserved and all round state cleared. Shared result state visible to all players, clean restart to lobby with players preserved and round state cleared"

## Clarifications

### Session 2026-06-17

- Q: How does a round actually transition into the result state? → A:
  Host manually triggers an explicit "End Round" action whenever they
  choose to end it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Shared Round Result Visible to Everyone (Priority: P1)

When the host ends the round, every participant — drawer and guessers
alike — sees the same result view: the correct secret word (no longer
hidden), each participant's final score, and the complete guess history
with every guess's literal text visible (not just the previously-redacted
subset).

**Why this priority**: The result is the payoff moment of the round — every
participant needs a consistent, trustworthy view of what happened and how
they did. Without it, the round has no satisfying conclusion and players
cannot verify scores or settle disputes about what was guessed.

**Independent Test**: With a room that has an active round, several guesses
(some correct, some incorrect) and a non-zero score, have the host trigger
"End Round" and confirm every participant's client displays the same secret
word, the same set of final scores, and the same full guess history
(including the literal text of guesses that were previously hidden from
non-submitting guessers).

**Acceptance Scenarios**:

1. **Given** an active round, **When** the host triggers "End Round,"
   **Then** the room transitions to the result state and the secret word
   is shown in full to every participant, regardless of whether they were
   the drawer or a guesser.
2. **Given** the host has ended the round, **When** any participant views
   the result state, **Then** every participant's final score is shown,
   identical across every viewer's client.
3. **Given** the host ends a round that had a mix of correct and incorrect
   guesses from multiple guessers, **When** any participant views the
   result state, **Then** the full guess history is shown with every
   entry's literal guessed text visible to every viewer, including guesses
   that were previously redacted for non-submitting guessers during the
   active round.
4. **Given** the host triggers "End Round," **When** other participants'
   clients next poll, **Then** every connected client transitions to the
   result view without requiring a manual page reload or rejoin.
5. **Given** a non-host participant attempts to trigger "End Round,"
   **When** the request is submitted, **Then** it is rejected — only the
   host may end the round.
6. **Given** a round has not yet been ended, **When** any participant
   views the game screen, **Then** no result state is shown and redaction
   rules for the active round (per the prior phase's guess-history
   visibility rule) still apply.

---

### User Story 2 - Host Restarts to a Clean Lobby (Priority: P1)

From the result state, the host can trigger a restart that returns every
participant to the lobby, preserving the existing set of players but
clearing all round-specific state (drawer assignment, secret word, strokes,
guesses, and scores) so the next game starts fresh.

**Why this priority**: Without a restart path, a room is a dead end after
one round — players would have to abandon the room and create/join a new
one, losing the convenience of an already-assembled group. This is the
mechanism that makes the room reusable across multiple rounds/games.

**Independent Test**: From the result state with a populated guess history
and non-zero scores, have the host trigger restart, and confirm every
connected participant lands on the lobby screen with the same roster of
players, while a fresh round subsequently starts with an empty canvas,
empty guess history, and all scores back at zero.

**Acceptance Scenarios**:

1. **Given** the result state is displayed, **When** the host triggers
   restart, **Then** every participant — including the host — is returned
   to the lobby screen.
2. **Given** the result state is displayed, **When** the host triggers
   restart, **Then** the same participants who were in the room remain in
   the room (no one is removed, no one is added) on the lobby screen.
3. **Given** the result state is displayed, **When** the host triggers
   restart, **Then** every participant's score is reset to 0, the drawer
   assignment and secret word are cleared, and the canvas strokes and
   guess history are emptied.
4. **Given** the result state is displayed, **When** a non-host
   participant attempts to trigger restart, **Then** the request is
   rejected — only the host may restart the room.
5. **Given** a room has been restarted to the lobby, **When** the host
   starts the game again, **Then** a new round begins exactly as it did
   the first time (drawer assignment and secret word selection follow the
   same rules as the prior phase), with no leftover state from the
   previous round.

---

### Edge Cases

- If a guesser disconnects (stops polling) before a round ends and
  reconnects after restart, they MUST see the lobby state, not a stale
  result or active-round view, once their client resumes polling.
- Triggering restart while the room is still in an active round (before
  the host has triggered "End Round") MUST be rejected — restart is only
  valid from the result state; the system does not need to support
  restarting mid-round.
- If a participant is the host but the room currently has only one
  participant (the host, no guessers), the host MUST still be able to
  restart, and MUST land back in a lobby with just themselves present.
- Restart MUST be idempotent enough that issuing the request a second time
  after the room is already back in the lobby does not error or corrupt
  state — it MUST simply be rejected as a no-op (room is not in the
  result state).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST recognize a distinct "result" state for a
  room, entered only when the host triggers an explicit "End Round" action
  on an active round — there is no automatic or timer-based transition.
- **FR-001a**: The system MUST reject an "End Round" request from a
  non-host participant, and MUST reject it when the room is not currently
  in an active round.
- **FR-002**: While a room is in the result state, the system MUST reveal
  the secret word, unredacted, to every participant regardless of role.
- **FR-003**: While a room is in the result state, the system MUST show
  every participant's final score to every viewer, identically.
- **FR-004**: While a room is in the result state, the system MUST show the
  full guess history to every viewer with every entry's literal guessed
  text visible, overriding the active-round redaction rule that hides
  incorrect guesses' text from non-submitting guessers.
- **FR-005**: The system MUST propagate the transition into the result
  state to every connected participant's client via the existing polling
  mechanism, with no manual action required to observe it.
- **FR-006**: The system MUST allow only the host to trigger a restart, and
  only while the room is in the result state.
- **FR-007**: The system MUST reject a restart request from a non-host
  participant.
- **FR-008**: The system MUST reject a restart request when the room is not
  currently in the result state (e.g., still in an active round, or already
  back in the lobby).
- **FR-009**: On a successful restart, the system MUST transition the room
  back to its lobby state while preserving the existing roster of
  participants (no participant is added or removed as a side effect of
  restart).
- **FR-010**: On a successful restart, the system MUST clear all
  round-specific state: drawer assignment, secret word, canvas strokes,
  guess history, and every participant's score (reset to 0).
- **FR-011**: The system MUST propagate the restart-to-lobby transition to
  every connected participant's client via the existing polling mechanism,
  with no manual action required to observe it.
- **FR-012**: After a restart, starting the game again MUST follow the same
  drawer-assignment and secret-word-selection rules as the original game
  start, producing a fully independent new round with no residual data
  from the previous round.

### Key Entities

- **Room**: Gains a third lifecycle state ("result") alongside the existing
  lobby/active states, entered when a round ends and exited only via a
  host-triggered restart back to lobby state.
- **Result State**: Not a new stored entity but a room-status-derived view
  exposing the secret word, every participant's score, and the full,
  unredacted guess history — all already-existing data, made visible
  without the active-round redaction rules.
- **Participant**: Score is reset to 0 as part of restart; identity, name,
  and host/non-host role are preserved across restart.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of connected participants see identical secret word,
  scores, and guess history once a round reaches the result state, with no
  client-specific redaction remaining.
- **SC-002**: Every participant's client reflects the result state within
  one polling interval of the round ending, with no manual reload needed.
- **SC-003**: A host-triggered restart returns 100% of previously-connected
  participants to the lobby with their original roster intact, within one
  polling interval, with no manual reload needed.
- **SC-004**: After restart, 0 residual round artifacts (strokes, guesses,
  non-zero scores, drawer/word assignment) remain observable by any
  participant.
- **SC-005**: A restarted room can start a brand-new round and complete it
  through to a new result state without any error or inconsistency
  attributable to leftover state from the prior round.

## Assumptions

- Only the host may trigger "End Round" or restart, consistent with the
  host already being the sole authority for starting the game in the prior
  phase. No timer, countdown, or auto-detection of "every guesser solved
  it" is introduced — per the project's explicit exclusion of timers and
  multi-round mechanics, ending a round is always a deliberate host action.
- "Players preserved" means the same participant records (id, name,
  host/non-host role) carry over; it does not imply preserving any
  game-specific data such as who was drawer or what they scored, both of
  which are explicitly cleared.
- The result state and restart both rely on the existing polling mechanism
  already used for strokes/guesses sync — no new real-time transport is
  introduced.
