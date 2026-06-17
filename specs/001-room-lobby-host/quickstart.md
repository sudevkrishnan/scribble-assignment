# Quickstart: Validate Room Setup, Host Assignment & Lobby Sync

## Prerequisites

- Node.js 18+ (24 recommended per `.nvmrc`), npm 9+
- Two browser tabs/windows (to act as two separate players — uses
  `sessionStorage`, so each tab keeps its own identity; see research.md)

## Setup

```bash
cd backend && npm install && npm run dev   # http://localhost:3001
cd frontend && npm install && npm run dev  # http://localhost:5173
```

## Scenario walkthroughs

These map directly to the spec's User Stories and Acceptance Scenarios.

### 1. Host a room (US1)

1. Tab A: open `http://localhost:5173`, Create Room with a player name.
2. Confirm a unique room code is shown and Tab A is host (e.g., the Start
   control is visible, even if disabled).
3. Repeat in Tab B with a different name → confirm a different code, and
   Tab B is host of its own room (not Tab A's).

### 2. Join validation (US2)

1. Tab B: go to Join Room, submit an empty code → expect the
   "code is required" message.
2. Submit an obviously malformed code (e.g., `12` or `abcde`) → expect the
   "code is invalid" message.
3. Submit a well-formed but unused code (e.g., `ZZZZ` if unused) → expect
   "Room not found".
4. Submit Tab A's real code → confirm Tab B joins as non-host and Tab A's
   participant count increases.
5. Confirm Tab A's room is unaffected if you repeat steps with a third
   tab/room (isolation, SC-003).

### 3. Lobby auto-polling (US3)

1. With Tab A and Tab B both on the Lobby screen for the same room, take no
   manual action.
2. Confirm Tab A's participant list updates to include Tab B within ~2-3
   seconds, with no refresh click.

### 4. Host-gated start (US4)

1. With only Tab A (host) in the room, confirm the Start control is visible
   but disabled, with a message about needing 2 players.
2. After Tab B joins, confirm Tab A's Start control becomes enabled.
3. Confirm Tab B (non-host) never sees a Start control at all.
4. Click Start in Tab A → confirm success (room status becomes active per
   the contract; full gameplay is out of scope this phase).

### 5. Reload reattachment (FR-014 / SC-006)

1. In Tab A (host), reload the browser tab.
2. Confirm Tab A returns to the same room, still shown as host — not bounced
   back to the Start screen.
3. Stop the backend process, then reload Tab A again → confirm the stale
   identity is detected (room not found) and Tab A returns cleanly to the
   Start screen with a clear message, not a silent failure.

## Automated checks

```bash
cd backend && npm run build && npm test
cd frontend && npm run build && npm test
```

All four must pass before considering this phase done, per the constitution's
Test-First & Verification Discipline principle.
