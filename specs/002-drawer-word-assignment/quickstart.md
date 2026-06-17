# Quickstart: Validate Player Name Validation, Drawer Assignment & Secret Word Visibility

## Prerequisites

- Same as phase 1 (`specs/001-room-lobby-host/quickstart.md`): two browser
  tabs, backend on `:3001`, frontend on `:5173`.

## Setup

```bash
cd backend && npm install && npm run dev   # http://localhost:3001
cd frontend && npm install && npm run dev  # http://localhost:5173
```

## Scenario walkthroughs

### 1. Player name validation (US1)

1. On Create Room, submit a blank name → expect "Player name is required"
   and no room created.
2. Submit a whitespace-only name (e.g., `"   "`) → same rejection.
3. Submit `"  Alice  "` → confirm the room is created and the participant's
   displayed name is `"Alice"` (trimmed).
4. Repeat 1–3 on Join Room against an existing room code.

### 2. Drawer assignment (US2)

1. Tab A creates a room (becomes host); Tab B joins.
2. Tab A starts the game (per phase 1's host-gated start) — Tab A navigates
   to the Game screen immediately.
3. Without touching Tab B, wait up to ~2 seconds (one poll cycle) and
   confirm Tab B is automatically taken to the Game screen too, with no
   manual action — this is the part `/speckit-analyze` flagged as missing
   before implementation.
4. On the Game screen in both tabs, confirm Tab A's name is labeled
   "Drawer" and Tab B's is not, in both tabs' views.

### 3. Deterministic secret word (US3)

1. Note the room code and the secret word shown to the drawer (Tab A).
2. Without restarting the backend, fetch the room as the drawer again
   (e.g., reload Tab A) → confirm the same secret word is shown.
3. Create a second room with a different code and start it → confirm its
   secret word is one of the five starter words (independently valid; not
   required to differ from the first room's).

### 4. Drawer-only visibility (US4)

1. As Tab B (guesser), confirm the Game screen does not show the secret
   word anywhere.
2. Open browser dev tools' network tab on Tab B, inspect the `GET
   /rooms/:code` response body, and confirm it has no `secretWord` key and
   an empty `availableWords` array.
3. Confirm Tab A's (drawer's) equivalent response does include both.

## Automated checks

```bash
cd backend && npm run build && npm test
cd frontend && npm run build && npm test
```

All four must pass, per the constitution's Test-First & Verification
Discipline principle.
