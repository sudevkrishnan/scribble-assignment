# Feature Specification: Room Setup, Host Assignment & Lobby Sync

**Feature Branch**: `001-room-lobby-host`

**Created**: 2026-06-17

**Status**: Draft

**Input**: User description: "Given a player wants to host or join a drawing game, When they create or join a room via a unique code, Then the creator is automatically the host; invalid/empty codes are rejected with clear feedback; rooms should be fully isolated; the lobby refreshes via polling (~2s); and only the host can start the game once at least 2 players are present. When joining attempt errors it should be conveyed with clear error messages."

## Clarifications

### Session 2026-06-17

- Q: What rule distinguishes an "invalid format" room code from a "not found" room code? → A: Fixed-length (4-character), fixed-alphabet code matching the existing `roomStore.ts` `generateCode()` scheme; anything not matching that shape is invalid format, anything matching but unmatched to a room is not found.
- Q: Should a participant's identity (especially host status) survive a page reload? → A: Yes — the client MUST persist its participant identity (e.g., via browser storage local to that client) so a reload reattaches the same participant/host without rejoining. This is client-side persistence only; server-side databases or any persistent storage remain explicitly out of scope for the whole project, not just this phase.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Host a Game by Creating a Room (Priority: P1)

A player who wants to start a new game creates a room and is automatically
recognized as that room's host, with a unique code to share with others.

**Why this priority**: Without room creation and host assignment, no game can
ever begin. This is the entry point for every other scenario in the lab.

**Independent Test**: Create a room as a single player and confirm the room
is created, a unique code is shown, and the creator is marked as host —
without needing any other player to join.

**Acceptance Scenarios**:

1. **Given** a player on the Create Room screen, **When** they submit a valid
   player name, **Then** a new room is created with a unique code and the
   creator is marked as the host of that room.
2. **Given** two players create rooms one after another, **When** both rooms
   exist, **Then** each room has a distinct code and each creator is host of
   only their own room.

---

### User Story 2 - Join an Existing Room by Code (Priority: P1)

A second player joins a room a host has already created, using the room
code, and sees a clear error if the code is invalid, empty, or unknown.

**Why this priority**: A single-player room has no game. Joining is required
for the lobby (and every later scenario) to have more than one participant.

**Independent Test**: With a room already created, join it from a second
session using its code and confirm the join succeeds and the new
participant appears as a non-host. Separately, attempt to join with an
empty code, a malformed code, and a well-formed but non-existent code, and
confirm each attempt is rejected with a distinct, human-readable message.

**Acceptance Scenarios**:

1. **Given** a room exists with code `ABCD`, **When** a second player submits
   `ABCD` with a valid player name, **Then** they join the room as a
   non-host participant and the room's participant count increases by one.
2. **Given** a player submits an empty or whitespace-only room code,
   **When** they attempt to join, **Then** the join is rejected and a clear
   message indicates the code is required.
3. **Given** a player submits a code that doesn't match the expected room
   code format, **When** they attempt to join, **Then** the join is rejected
   and a clear message indicates the code is invalid.
4. **Given** a player submits a well-formed code that doesn't match any
   existing room, **When** they attempt to join, **Then** the join is
   rejected and a clear message indicates the room could not be found.
5. **Given** two separate rooms exist with different codes, **When** a
   player joins one of them, **Then** the other room's participant list and
   state are unaffected (rooms are fully isolated).

---

### User Story 3 - Automatic Lobby Updates (Priority: P2)

Everyone in a room's lobby sees the current participant list update on its
own, without needing to manually refresh.

**Why this priority**: Builds directly on US1/US2 — the lobby must reflect
who has joined so the host can judge when enough players are present, but
the game is still playable (with manual refresh) without this.

**Independent Test**: With two browser sessions in the same room's lobby,
join a third session and confirm the first two sessions' participant lists
update on their own within a few seconds, with no manual action.

**Acceptance Scenarios**:

1. **Given** a player is on the Lobby screen for a room, **When** another
   player joins that room, **Then** the first player's participant list
   updates automatically within roughly 2 seconds, without the player
   taking any action.
2. **Given** a player is on the Lobby screen, **When** no one else is in the
   room, **Then** the lobby continues to poll for updates without showing
   an error or requiring user action.

---

### User Story 4 - Host-Gated Game Start (Priority: P2)

Only the host can start the game, and only once at least two players are in
the room — everyone else sees why the action isn't available to them yet.

**Why this priority**: Prevents premature or unauthorized game starts; depends
on host assignment (US1) and an accurate, current participant count (US3),
but the room/lobby flow is usable without it.

**Independent Test**: As a non-host, confirm no start control is available.
As the host with fewer than two participants, confirm the start control is
present but disabled with an explanation. As the host with two or more
participants, confirm the start control becomes available.

**Acceptance Scenarios**:

1. **Given** a non-host participant viewing the lobby, **When** the lobby
   renders, **Then** no control to start the game is available to them.
2. **Given** the host viewing the lobby with only one participant (themself),
   **When** the lobby renders, **Then** the start control is visibly present
   but disabled, with a message explaining at least 2 players are needed.
3. **Given** the host viewing the lobby with two or more participants,
   **When** the lobby renders, **Then** the start control is enabled and
   available to the host.

---

### Edge Cases

- A join attempt with a room code containing extra whitespace around
  otherwise valid characters MUST be trimmed before validation, not rejected
  outright.
- Submitting an empty/whitespace-only player name on create or join uses the
  existing default-name fallback already in place; this spec does not change
  player name validation (covered in a later phase per the lab's scenario
  sequencing).
- Rapid back-to-back room creation MUST always yield distinct codes, even
  under near-simultaneous requests.
- A player attempting to start the game via a non-UI path (e.g., a direct
  action without being host) MUST be rejected by the same host/participant-
  count rule, not merely hidden in the UI.
- If the lobby poll request itself fails (e.g., transient network issue), the
  lobby MUST keep showing the last known participant list rather than
  clearing it, and MUST continue retrying on the next poll interval.
- A participant who reloads their browser tab MUST be reattached to the same
  room and participant identity (via client-local storage) rather than being
  treated as a brand-new, unrecognized visitor.
- If client-local storage holds a participant identity for a room that no
  longer exists (e.g., backend restarted), the client MUST detect the
  resulting "not found" response and clear the stale identity, returning the
  player to the start flow with a clear message — not a silent failure.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow a player to create a room and MUST
  automatically assign that player as the room's host.
- **FR-002**: System MUST generate a unique code for each room, and MUST
  guarantee no two simultaneously active rooms share a code.
- **FR-003**: System MUST allow a player to join an existing room by
  submitting its code, adding them as a non-host participant.
- **FR-004**: System MUST reject an empty or whitespace-only room code on
  join with a clear, specific message indicating a code is required.
- **FR-005**: System MUST reject a room code that does not match the
  expected code format — a fixed 4-character code drawn from the existing
  generation alphabet — with a clear, specific message indicating the code
  is invalid, distinct from the "not found" message in FR-006.
- **FR-006**: System MUST reject a well-formed code that does not match any
  existing room with a clear, specific message indicating the room could not
  be found.
- **FR-007**: System MUST keep each room's state (participants, host,
  status) fully isolated from every other room; actions in one room MUST
  NOT alter another room's state.
- **FR-008**: System MUST automatically refresh each connected player's view
  of a room's participant list on an approximately 2-second interval,
  without requiring manual action.
- **FR-009**: System MUST identify exactly one host per room, who is the
  room's creator.
- **FR-010**: System MUST allow only the host to start the game.
- **FR-011**: System MUST prevent starting the game unless the room has at
  least 2 participants, regardless of who attempts it.
- **FR-012**: System MUST communicate, to the host, why the start action is
  unavailable when the 2-player minimum is not met.
- **FR-013**: System MUST NOT expose a start-game control to non-host
  participants.
- **FR-014**: System MUST retain a participant's identity (including host
  status) across a browser reload of the same client, by persisting it in
  client-local browser storage only — no server-side database or other
  server-side persistent storage MAY be introduced to satisfy this.

### Key Entities

- **Room**: A single isolated game session identified by a unique code;
  tracks its participants, its designated host, and its current status
  (e.g., lobby).
- **Participant**: A player connected to a specific room; has a display
  name and a role flag indicating whether they are the host.
- **Host**: The participant who created the room; the only participant
  permitted to start the game, subject to the minimum-player rule.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of room-creation attempts result in the creator being
  recognized as host of that room.
- **SC-002**: 100% of join attempts with an empty, malformed, or unknown
  room code are rejected with a message that distinguishes which of those
  three problems occurred — never a generic or blank failure.
- **SC-003**: Across any two concurrently active rooms, a participant joining
  or acting in one room produces zero observable changes in the other room's
  participant list or status.
- **SC-004**: A new participant joining a room appears in every other
  connected participant's lobby view within 3 seconds, with no manual
  refresh action taken.
- **SC-005**: 100% of attempts to start a game by a non-host, or with fewer
  than 2 participants, are blocked, with the host shown a clear reason when
  the block is due to player count.
- **SC-006**: A participant who reloads their browser tab returns to the same
  room with the same host/non-host status 100% of the time the room still
  exists, with no server-side database or persistent storage involved.

## Assumptions

- Player-name validation (trimming, rejecting empty names) is explicitly out
  of scope for this spec and is addressed in a later phase, per the lab's
  scenario sequencing; the starter's existing default-name fallback remains
  unchanged here.
- Host assignment is permanent for the lifetime of the room in this phase —
  no host transfer, leave, or disconnect handling is included; that is out
  of scope until a future phase introduces it. Reloading the same browser
  tab is reattachment (per Clarifications), not a disconnect/leave event.
- Databases and any form of server-side persistent storage are out of scope
  for the entire project, not just this phase (per the project constitution's
  Additional Constraints). Client-local browser storage used solely to
  reattach a participant's own identity on reload is not server-side
  persistence and remains permitted.
- "Starting the game" in this phase refers only to the act of unlocking the
  host's start control under the right conditions; the actual gameplay
  transition (drawer assignment, secret word selection, round state) is
  covered by a later phase's specification.
- Polling at a fixed ~2-second interval is acceptable for this phase; no
  adaptive or configurable interval is required.
