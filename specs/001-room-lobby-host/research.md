# Research: Room Setup, Host Assignment & Lobby Sync

No `NEEDS CLARIFICATION` markers remain in the Technical Context — all spec
ambiguities were resolved during `/speckit-clarify`. This file records the
implementation-level decisions needed to execute the plan.

## Decision: Client identity storage mechanism

**Decision**: Use `window.sessionStorage`, keyed per room code, to persist
`{ participantId, isHost }` for the current tab.

**Rationale**: FR-014 requires reload reattachment without server-side
persistence. The lab's own verification method (README "Quick Verification"
and this spec's Independent Tests) opens **two browser tabs** to simulate two
players — `localStorage` is shared across all tabs of the same origin, so
using it would make both tabs collapse onto the same stored participant
identity, breaking the two-tab testing convention this whole lab depends on.
`sessionStorage` is scoped per tab (and cleared when the tab/window closes),
which reattaches a reloaded tab to its own identity while keeping separate
tabs independent.

**Alternatives considered**:
- `localStorage` — rejected: breaks two-tab multiplayer testing (shared
  across tabs).
- In-memory only (current behavior) — rejected: this is exactly the gap
  FR-014 was written to close; a reload would lose identity entirely.
- URL query/hash param carrying `participantId` — rejected: leaks an
  internal identifier into a shareable URL and is easier to tamper with by
  copy-pasting a link to someone else, which would let a guesser impersonate
  another participant.

## Decision: Room code format validation rule

**Decision**: Validate join-by-code against the exact alphabet already used
by `generateCode()` in `roomStore.ts` (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`,
excluding ambiguous `I`, `O`, `0`, `1`), fixed length 4, case-insensitive
(uppercased before validation, matching existing `code.toUpperCase()` calls).

**Rationale**: Resolved directly during `/speckit-clarify` (Option A) — reuse
the existing generation scheme rather than introducing a new one, since the
spec explicitly scopes this phase to validation, not regeneration.

**Alternatives considered**: Generic `[A-Z0-9]{4}` (rejected — would accept
codes the system could never have generated, e.g. containing `O`/`0`,
weakening the "invalid format" signal).

## Decision: What "start the game" does in this phase

**Decision**: Add `POST /rooms/:code/start` that performs only the two gating
checks from FR-010/FR-011 (caller is host; room has ≥2 participants) and, on
success, flips `Room.status` from `"lobby"` to `"active"`. No drawer
assignment, word selection, or round data is created here.

**Rationale**: The spec's Assumptions explicitly defer "the actual gameplay
transition (drawer assignment, secret word selection, round state)" to a
later phase. A status flip is the minimal, honest signal that the gate
passed — it gives the next phase's spec a concrete `"active"` state to build
on, without this phase inventing gameplay behavior it isn't scoped to own.

**Alternatives considered**: No endpoint at all, gating done purely in the
frontend — rejected: the spec's Edge Cases explicitly require a non-UI
("direct action") attempt to be rejected by the same rule, which requires a
server-side check, not just a disabled button.

## Decision: Lobby polling implementation

**Decision**: `setInterval` in a `useEffect` on `LobbyPage`, calling the
existing `fetchRoom()` every 2000ms, cleared on unmount; remove the manual
"Refresh Room" button since it becomes redundant.

**Rationale**: Matches FR-008's fixed ~2s interval (Assumptions: no adaptive/
configurable interval needed this phase); `useEffect` cleanup avoids leaking
intervals across navigation, aligning with the constitution's Performance
principle (bounded resource use).

**Alternatives considered**: Keep manual refresh alongside polling — rejected
as needless UI clutter once polling satisfies the same need (constitution
Code Quality principle: avoid unjustified complexity); a global polling
service in `state/roomStore.ts` instead of page-local `useEffect` — viable
but deferred as unnecessary abstraction for a single page's polling need
(YAGNI; revisit only if a second page needs the same polling later).
