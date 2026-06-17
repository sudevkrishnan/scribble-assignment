# Research: Player Name Validation, Drawer Assignment & Secret Word Visibility

No `NEEDS CLARIFICATION` markers remain — both spec ambiguities were
resolved inline during `/speckit-specify`. This file records the
implementation-level decisions needed to execute the plan.

## Decision: Player name validation rule

**Decision**: `z.string().trim().min(1, "Player name is required")` for
`playerName` on both `createRoomSchema` and `joinRoomSchema`, removing the
field's `.optional()` and removing `roomStore.ts`'s `displayName()` fallback
that defaulted blank names to `"Player"`.

**Rationale**: Zod's `.trim()` transforms the value before `.min()` validates
it, so a single declarative rule satisfies both "trim" (FR-001) and "reject
empty/whitespace-only with a specific message" (FR-002/FR-003) — consistent
with phase 1's existing pattern of surfacing the specific Zod issue message
via `router.ts`'s error handler.

**Alternatives considered**: Keeping the fallback and only rejecting at the
UI layer — rejected, since the spec's edge case requires rejection
regardless of UI path (server-side, not just hidden in a form).

## Decision: Secret word selection — room-code-derived hash

**Decision**: A small deterministic string hash over the room code, reduced
modulo the starter word list's length:

```text
hash = 0
for each character c in code:
  hash = (hash * 31 + charCodeOf(c)) | 0   // 32-bit overflow wraps, stays deterministic
index = abs(hash) % STARTER_WORDS.length
secretWord = STARTER_WORDS[index]
```

**Rationale**: Resolved during `/speckit-specify` clarification (room-code-
derived, not "always first word"). A simple polynomial rolling hash is
sufficient — it doesn't need cryptographic properties, only determinism (same
input → same output, forever) and a reasonably even spread across the 5
words so different rooms don't all land on the same word. `| 0` keeps the
arithmetic in 32-bit integer range so the result is stable across runs/Node
versions (no floating-point drift).

**Alternatives considered**: `Array.prototype.reduce` with `charCodeAt` sum
(simpler, but clusters anagram-like codes — e.g., `"ABCD"` and `"BADC"` would
hash identically since order wouldn't matter with a pure sum); a crypto hash
like SHA-256 — rejected as overkill for a 5-bucket selection with no security
requirement on the hash itself.

## Decision: Redaction shape on `RoomSnapshot`

**Decision**: Add `isDrawer: boolean` to every participant entry (public —
everyone must see who's drawing, per FR-006). Add a top-level
`secretWord?: string` that is only populated when `viewerParticipantId`
matches `room.drawerParticipantId`; otherwise omitted. Change
`availableWords` to also gate on the same condition: the full 5-word list
only when the viewer is the drawer, an empty array otherwise.

**Rationale**: Resolved during `/speckit-specify` clarification (hide the
candidate list from non-drawers too). Express's `res.json()` drops
`undefined`-valued keys during serialization, so `secretWord` simply isn't
present in the wire payload for non-drawers — satisfying the spec's "not
discoverable from their view" requirement at the data layer, not just the UI
(constitution Principle IV: security is about what the server sends).

**Alternatives considered**: A separate `/rooms/:code/secret-word` endpoint
gated by drawer check — rejected as unnecessary indirection; the existing
`GET /rooms/:code?participantId=` already carries the viewer's identity and
is polled regularly, so redaction belongs there.

## Decision: Idempotent drawer/word assignment on repeated start

**Decision**: `startGame()` only assigns `drawerParticipantId`/`secretWord`
when they are not already set on the room (i.e., `if (!room.drawerParticipantId)`).
A repeated `POST /:code/start` on an already-active room re-validates host +
participant count (unchanged from phase 1) but does not reassign.

**Rationale**: Directly satisfies FR-011's "same drawer and same secret word
result" — the assignment is a one-time side effect guarded by presence, not
re-derived each call (though re-deriving would happen to produce the same
result anyway, since the hash is pure — this guard makes the intent explicit
and is the natural seam for "drawer rotation" if a future phase ever needs
it, per the lab's exclusions one round is the limit, not a foreclosed
extension point).

**Alternatives considered**: Gate on `room.status !== "active"` instead of
field presence — equivalent in current scope, but field-presence is more
direct evidence-of-assignment and reads clearer next to FR-011's wording.

## Decision: How non-host participants reach the game screen

**Decision**: Add a `useEffect` to `LobbyPage.tsx` that watches `room.status`
(already updated every ~2s by phase 1's polling) and calls `navigate("/game")`
for *any* participant once it becomes `"active"` — not only the host, who
already navigates explicitly inside `handleStart()`.

**Rationale**: `/speckit-analyze` found this gap before implementation: phase
1's `LobbyPage` only navigated the host on a successful start; a guesser had
no path to the game screen at all, since nothing else watched `room.status`.
Reusing the existing polling mechanism (no WebSockets, per the constitution)
to detect the transition is the natural fix — the data is already arriving
every poll tick, only the reaction to it was missing.

**Alternatives considered**: Polling on `GamePage` itself instead — rejected,
since a participant who never leaves the Lobby would still never arrive
there in the first place; the navigation trigger has to live where the
participant currently is (the Lobby) MUST be added there for it to fire.

**Testing note**: This is a navigation-effect wiring concern with trivial
underlying logic (`status === "active"`); the project has no
component-rendering test infrastructure (e.g., React Testing Library), and
adding one solely for this one effect would be disproportionate scope creep
per the constitution's Code Quality principle (no unjustified new
dependencies). It is verified manually via `quickstart.md`'s two-tab
walkthrough instead of an automated test — documented as a deliberate
trade-off, not an oversight.
