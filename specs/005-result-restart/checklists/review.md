# Gameplay, Edge Case, UX & Consistency Requirements Checklist: Round Result, Host Restart & Final Validation

**Purpose**: Validate the quality (completeness, clarity, consistency, measurability, coverage) of the requirements in spec.md covering state-transition correctness, edge cases/failure modes, UX/feedback clarity, and cross-phase consistency for this feature — as a PR reviewer gate, independent of the implementation.
**Created**: 2026-06-17
**Feature**: [spec.md](../spec.md)
**Depth**: Standard | **Audience**: PR reviewer

**Note**: This checklist tests whether the requirements are written clearly and completely — it does not test whether the implementation behaves correctly.

## Gameplay & State-Transition Correctness

- [x] CHK001 Are the three valid `Room` lifecycle states (lobby/active/result) and their transition triggers each attributable to exactly one explicit requirement, with no transition left to be inferred? [Completeness, Spec §FR-001, FR-006, Key Entities] — No gap found: FR-001 (active→result), FR-006/FR-008 (result→lobby), and the prior phase's lobby→active rule together cover every transition; Key Entities' Room bullet summarizes the same set.
- [x] CHK002 Is "host" as the sole authority for "End Round" and "restart" defined precisely enough to be unambiguous, or does it rely on an undefined external reference? [Clarity, Spec §FR-001a, FR-006, FR-007] — No gap found: Assumptions explicitly ties this to "the host already being the sole authority for starting the game in the prior phase," consistent with that phase's `hostParticipantId` concept; no redefinition needed for a spec at this level.
- [x] CHK003 Is the rejection condition for "End Round" attempted on a room that is already in the result state (a repeated End Round) explicitly covered, or only the lobby case? [Completeness, Spec §FR-001a] — No gap found: FR-001a's "reject it when the room is not currently in an active round" is phrased generally enough to cover both the lobby and already-result cases without needing a separate clause.
- [x] CHK004 Is the atomicity of the multi-field restart reset (drawer, secret word, strokes, guesses, every score) specified, so a concurrent poll cannot observe a partially-cleared room? [Gap, Spec §FR-010] — **Resolved**: added an atomicity sentence to FR-010 requiring the reset to apply as a single state transition.
- [x] CHK005 Is it specified that a drawing, clear-canvas, or guess-submission attempt made after "End Round" is rejected, reusing the existing active-round gate, or is this left to be inferred from a different phase's spec? [Gap, Consistency with prior phase] — **Resolved**: added an Edge Cases bullet making this explicit; no implementation change was needed since the existing `status !== "active"` checks already reject these once `status` is `"result"`.

## Edge Cases & Failure Modes

- [x] CHK006 Is the behavior for a guesser who disconnects before the round ends and reconnects only after restart explicitly defined? [Completeness, Spec §Edge Cases] — No gap found: already covered by the first Edge Cases bullet.
- [x] CHK007 Is triggering restart before the round has reached the result state (i.e., still active) explicitly addressed as a rejection rather than left ambiguous? [Coverage, Spec §Edge Cases, FR-008] — No gap found: covered by both the second Edge Cases bullet and FR-008.
- [x] CHK008 Is the single-participant case (host alone, no guessers) for restart explicitly addressed, rather than only the multi-participant case? [Edge Case, Spec §Edge Cases] — No gap found: explicitly covered by the third Edge Cases bullet.
- [x] CHK009 Is repeated/idempotent restart (issuing the request again once already back in the lobby) specified as a defined rejection rather than an undefined or erroring state? [Edge Case, Spec §Edge Cases, FR-008] — No gap found: explicitly covered by the fourth Edge Cases bullet and FR-008.
- [x] CHK010 Is the lifecycle of a room left indefinitely in the result state (e.g., every participant abandons it without the host restarting) addressed, or intentionally left out of scope? [Gap, Coverage] — No gap found (intentionally out of scope): consistent with the project-wide absence of any room-expiry/cleanup mechanism in every prior phase; no phase introduces persistence or scheduled cleanup, so this is a pre-existing, accepted scope boundary rather than one specific to this feature.

## UX & Feedback Clarity

- [x] CHK011 Are the visibility requirements for the host-only "End Round" and "Restart" controls specified for non-host viewers, mirroring the prior phase's requirement that role-restricted controls be visually distinguished (not just rejected server-side)? [Gap, Spec §FR-013] — **Resolved**: added FR-013, mirroring phase 3's `FR-005a` precedent; the implementation already satisfied this (both buttons are host-gated), so this closes a documentation gap rather than requiring a code change.
- [x] CHK012 Is there a minimum content bar for the rejection message shown to a non-host attempting "End Round" or "restart," or only that a rejection occurs at all? [Clarity, Spec §FR-001a, FR-007] — No gap found: consistent with the established, intentionally-loose convention from every prior phase (e.g., "Player name is required") — exact message wording is left to implementation, not mandated by spec.
- [x] CHK013 Is it specified that the result view must be distinguishable from the active-round view so a participant can tell the round has actually ended? [Clarity, Spec §FR-001, US1 Acceptance Scenario 1] — No gap found: "the room transitions to the result state" plus Key Entities' description of the result view as a distinct, fully-revealed view is sufficient specification for a functional spec at this level; pixel/layout-level distinctness is an implementation concern, not a requirements gap.
- [x] CHK014 Are the feedback requirements for the moment between a guesser's last poll and the host's "End Round" trigger (a stale active-round view) addressed, or left undefined? [Gap, Edge Case] — No gap found: this is the same "stale-by-up-to-one-poll-cycle" behavior already accepted across every prior phase (per phase 3's equivalent checklist finding); SC-002 already bounds this to "within one polling interval."

## Cross-Feature Consistency

- [x] CHK015 Does FR-004's description of the redaction rule it overrides restate that rule precisely enough to be self-contained, or does a reviewer need to cross-reference the prior phase's spec to understand what's being overridden? [Clarity, Consistency, Spec §FR-004] — No gap found: FR-004 already restates the overridden rule inline ("the active-round redaction rule that hides incorrect guesses' text from non-submitting guessers").
- [x] CHK016 Is the Assumptions section's distinction between "restart-then-replay" and the constitution's prohibited "multiple rounds"/"drawer rotation" mechanic consistent with how the prior phase's spec described round/result transitions as deferred, out-of-scope work for "a later phase"? [Consistency, Spec §Assumptions] — No gap found: phase 3's Assumptions explicitly deferred "round/result transitions... to a later phase," and this spec is that later phase; the two specs' framing is consistent and non-contradictory.
- [x] CHK017 Is "players preserved" defined precisely enough to distinguish what carries over (id/name/host role) from what doesn't (score/drawer/word), avoiding any reader inferring more state survives restart than actually does? [Clarity, Spec §Assumptions, FR-009, FR-010] — No gap found: the Assumptions section's "Players preserved" bullet explicitly enumerates both halves of this distinction.
- [x] CHK018 Are "End Round" and "Restart" used as the canonical terms throughout the spec without an inconsistent synonym (e.g., "end the round" vs. "finish the round," "reset" vs. "restart") that could confuse traceability to tasks/contracts? [Consistency, Terminology] — No gap found: a scan of spec.md confirms "End Round" and "restart"/"Restart" are used consistently throughout, matching `tasks.md` and `contracts/rooms-api.md`'s terminology.

## Notes

- Check items off as completed: `[x]`
- Add comments or findings inline
- Link to relevant resources or documentation
- Items are numbered sequentially for easy reference
