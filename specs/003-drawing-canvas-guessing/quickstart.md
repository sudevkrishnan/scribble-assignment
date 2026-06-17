# Quickstart: Validate Drawing Canvas, Guess Submission & Scoring

## Prerequisites

- Same as phase 1/2: two browser tabs, backend on `:3001`, frontend on
  `:5173`.
- A room with a host (Tab A) and at least one guesser (Tab B) that has
  already started (per phase 2's flow) — Tab A is the drawer, Tab B is a
  guesser. Open a third tab (Tab C, also a guesser) for the redaction
  scenario.

## Setup

```bash
cd backend && npm install && npm run dev   # http://localhost:3001
cd frontend && npm install && npm run dev  # http://localhost:5173
```

## Scenario walkthroughs

### 1. Drawer draws on the canvas (US1)

1. As Tab A (drawer), press and drag across the canvas → confirm a
   continuous stroke renders immediately, following the pointer path.
2. Lift the pointer, press down elsewhere, and drag again → confirm a
   second, visually separate stroke (not connected to the first).
3. As Tab B (guesser), attempt to click/drag on the canvas → confirm
   nothing is drawn.
4. Wait one poll cycle (~2s) and confirm Tab B's canvas now shows both of
   Tab A's strokes.

### 2. Drawer clears the canvas (US2)

1. With strokes already on the canvas (from scenario 1), click "Clear" in
   Tab A → confirm the canvas is immediately blank in Tab A.
2. Wait one poll cycle and confirm Tab B's canvas is also blank.
3. Confirm Tab B has no clear control available.
4. Draw a new stroke in Tab A → confirm only the new stroke appears (no
   reappearance of the cleared strokes) in either tab.

### 3. Guesser submits a validated guess (US3)

1. As Tab B, submit a blank guess (or one consisting only of spaces) →
   confirm it's rejected with a clear message and nothing is added to the
   guess history in any tab.
2. As Tab B, submit `"  pasta  "` (assume the secret word is not "pasta")
   → confirm the recorded/displayed entry shows the trimmed `"pasta"`.
3. As Tab A (drawer), attempt to submit a guess → confirm it's rejected.

### 4. Guess history synced, with redaction (US4)

1. Note the secret word from Tab A's drawer view (e.g., `"pizza"`).
2. As Tab C, submit an incorrect guess (e.g., `"pasta"`).
3. Wait one poll cycle; confirm Tab B's guess history shows Tab C's
   attempt with Tab C's name and an incorrect marker, but **not** the text
   `"pasta"`.
4. Confirm Tab C's own view of that same entry **does** show `"pasta"`.
5. Confirm Tab A's (drawer's) view of that same entry also shows `"pasta"`.
6. As Tab C, submit the correct word (`"pizza"`).
7. Wait one poll cycle; confirm Tab B's guess history now shows the literal
   text `"pizza"` for that entry, marked correct.

### 5. Deterministic scoring (US5)

1. Before any guesses, confirm every participant's score is `0` in every
   tab.
2. As Tab B, submit the secret word in a different case (e.g., `"PIZZA"`
   if the secret word is `"pizza"`) → confirm Tab B's score becomes `100`
   in every tab within one poll cycle.
3. As Tab C, submit an incorrect guess → confirm Tab C's score remains `0`.
4. As Tab B, submit another guess (correct or not) → confirm the guess is
   still recorded and scored independently (another correct guess adds
   another `100`; an incorrect one adds `0`).

## Automated checks

```bash
cd backend && npm run build && npm test
cd frontend && npm run build && npm test
```

All four must pass, per the constitution's Test-First & Verification
Discipline principle. Canvas pixel rendering itself is not asserted by
`vitest` (see `research.md`'s canvas-testing decision) — steps 1-2 above are
the authoritative verification for actual drawing behavior.
