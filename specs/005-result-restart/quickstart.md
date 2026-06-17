# Quickstart: Validate Round Result, Host Restart & Final Validation

## Prerequisites

- Same as phases 1-3: two browser tabs, backend on `:3001`, frontend on
  `:5173`.
- A room with a host (Tab A) and at least one guesser (Tab B) that has
  already started and played a round per phase 3's flow — Tab A is the
  drawer/host, Tab B is a guesser. Open a third tab (Tab C, also a
  guesser) to confirm the result reveal is identical across every viewer.

## Setup

```bash
cd backend && npm install && npm run dev   # http://localhost:3001
cd frontend && npm install && npm run dev  # http://localhost:5173
```

## Scenario walkthroughs

### 1. Shared round result visible to everyone (US1)

1. With an active round, have Tab C submit one incorrect guess and Tab B
   submit the correct secret word, so there's a mix of correct/incorrect
   history and a non-zero score (per phase 3's flow). Confirm Tab C does
   *not* see Tab B's incorrect-attempt text yet (still phase 3's
   redaction rule, per `contracts/rooms-api.md`).
2. As Tab A (host), click "End Round".
3. Confirm Tab A's view immediately shows: the secret word, every
   participant's score (Bob's incremented by 100), and the full guess
   history with every entry's literal text visible — including the entry
   that was previously redacted for Tab C.
4. Wait one poll cycle (~2s) and confirm Tab B and Tab C both land on the
   same result view, with identical secret word, scores, and fully
   unredacted guess history (Tab C can now see the text it couldn't see
   moments before).
5. As Tab B (non-host), attempt to trigger "End Round" again — confirm no
   such control is available to a non-host.

### 2. Host restarts to a clean lobby (US2)

1. From the result view (continuing from scenario 1), as Tab A (host),
   click "Restart".
2. Confirm Tab A immediately lands on the lobby screen, showing the same
   three participants (Alice, Bob, Cara) and no score/role/word
   information from the prior round.
3. Wait one poll cycle and confirm Tab B and Tab C also land on the lobby
   screen with the same roster.
4. As Tab B (non-host), attempt to trigger "Restart" from a re-opened
   result view — confirm no such control is available to a non-host (and
   the room is already back in the lobby regardless).
5. As Tab A (host), click "Start Game" again. Confirm a new round begins:
   a drawer is assigned, a secret word is selected, the canvas is blank,
   the guess history is empty, and every participant's score starts at 0
   — with no leftover strokes, guesses, or scores from the previous
   round.
6. Play this second round through to "End Round" again and confirm the
   result view reflects only this round's data (not a combination with
   the first round's).

## Expected outcome

- Every connected participant sees an identical, fully unredacted result
  (word/scores/history) within one poll cycle of "End Round."
- Restart returns every participant to the lobby with the same roster,
  within one poll cycle, and leaves zero residual round state observable
  by any participant.
- A restarted room supports a full second round-to-result cycle with no
  cross-contamination from the first round's state.
