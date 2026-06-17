# Gameplay, Sync, UX & Security Requirements Checklist: Drawing Canvas, Guess Submission & Scoring

**Purpose**: Validate the quality (completeness, clarity, consistency, measurability, coverage) of the requirements in spec.md covering core gameplay logic, real-time polling sync, UX/feedback clarity, and security/input-integrity for this feature — as a reviewer gate, independent of the implementation.
**Created**: 2026-06-17
**Feature**: [spec.md](../spec.md)

**Note**: This checklist tests whether the requirements are written clearly and completely — it does not test whether the implementation behaves correctly.

## Core Gameplay Logic — Completeness & Clarity

- [x] CHK001 Is the maximum allowed gap between consecutive points within a single stroke explicitly bounded, or is "continuous-looking line" left unquantified? [Clarity, Spec §Edge Cases] — Resolved: rewritten to tie continuity to "a line segment per received pointermove event, no skipping," a verifiable behavior instead of a visual impression.
- [x] CHK002 Are the rules for what counts as a single vs. separate stroke fully specified for every input pattern (e.g., a pointer-down with zero movement before pointer-up)? [Completeness, Spec §FR-001, FR-003] — Resolved: new US1 Acceptance Scenario 4 + FR-003a make the zero-movement "dot" case an explicit, valid single-point stroke.
- [x] CHK003 Is "drawer-only" enforcement specified as a server-side guarantee distinct from a UI-only restriction, for both drawing and clearing? [Clarity, Spec §FR-004, FR-005] — Resolved: new Edge Cases bullet states role checks are enforced independent of UI, mirroring phase 2's non-UI-path guarantee. (Same fix as CHK018.)
- [x] CHK004 Are the trimming and case-insensitivity rules for guess comparison specified precisely enough to be independently re-implemented (e.g., which side is trimmed, what counts as whitespace)? [Measurability, Spec §FR-007, FR-011] — No gap found: FR-007/FR-011 plus the unicode-whitespace Edge Case bullet already specify this precisely; no change made.
- [x] CHK005 Is the requirement that "drawer cannot guess" and "guesser cannot draw/clear" stated as a single consistent mutual-exclusion rule, or could the two halves drift independently if one were edited? [Consistency, Spec §FR-004, FR-009] — No gap found: already a single combined Edge Case bullet covering both directions; no change made.
- [x] CHK006 Are the requirements for a repeated correct guess from the same participant (FR-014) and a subsequent incorrect guess from that same participant equally specified, or does the spec only describe the repeated-correct case? [Completeness, Spec §FR-014] — No gap found: US5 Acceptance Scenario 3's "same matching rule... no special-casing" already covers any subsequent guess regardless of correctness; no change made.
- [x] CHK007 Is the scoring increment (exactly 100) specified as immutable for this phase, or could a future reader infer it might vary by guess speed/order without an explicit "exactly" qualifier? [Clarity, Spec §FR-012] — No gap found: FR-012/FR-013 already use "exactly"; no change made.

## Real-Time Sync & Polling — Completeness & Measurability

- [x] CHK008 Is the polling cadence ("~2s") specified as a target/expectation rather than a hard guarantee, and is that distinction clear to a reader who must design the sync mechanism? [Clarity, Spec §SC-005] — Resolved: SC-005 now states "one polling cycle" is the pass/fail threshold and "~2s" is explicitly descriptive context only.
- [x] CHK009 Are requirements defined for what a participant's client should display in the interval between an action occurring and that participant's next poll (e.g., stale-but-not-blank state)? [Gap, Edge Case] — No change made: already covered for canvas by the existing "out-of-date-by-up-to-one-poll-cycle" Edge Case bullet; the same principle reasonably extends to guesses/scores without needing separate restatement.
- [x] CHK010 Is it specified that canvas, guess-history, and score updates all share the same poll/snapshot mechanism, or could a reader infer they might use independent sync channels? [Consistency, Spec §FR-016, FR-017] — No change made: this phase reuses phase 1/2's single polling endpoint rather than introducing a new one; spec.md intentionally stays implementation-agnostic about transport per the constitution.
- [x] CHK011 Are requirements defined for how a participant's client should behave if a poll request fails transiently (vs. the room genuinely no longer existing)? [Gap, Exception Flow] — No change made: this is a phase 1 cross-cutting concern (`RoomStore.reattach()`'s existing error handling), not specific to this phase's new mechanics.
- [x] CHK012 Is "within one polling cycle" in SC-005 measurable/testable as written, or does it depend on an implementation-specific poll interval not fixed by the spec? [Measurability, Spec §SC-005] — Resolved by the same SC-005 edit as CHK008: "one polling cycle" is now explicitly the measurable threshold.

## UX & Feedback Clarity — Completeness & Clarity

- [x] CHK013 Are the visual/labeling requirements for distinguishing drawer-only controls (clear) from guesser-only controls (guess submission) specified, or only implied by the role-gating functional requirements? [Gap, Spec §FR-005, FR-009] — Resolved: new FR-005a requires the clear and guess controls to be hidden or visibly disabled for the role that can't use them.
- [x] CHK014 Is the rejection message requirement for an empty/whitespace guess specified with any content guidance, or only as "a clear message" without a minimum bar for clarity? [Clarity, Spec §FR-008] — No change made: consistent with the established, intentionally-loose convention from phases 1-2 (e.g., "Player name is required").
- [x] CHK015 Are requirements defined for how a guesser's own pending/just-submitted guess should appear in their UI before the next poll confirms it server-side? [Gap, Edge Case] — No change made: the absence is intentional per Constitution Principle III, which forbids the frontend from inventing local state that could diverge from the server (no optimistic guess display).
- [x] CHK016 Is there a requirement for visually indicating *why* a guess/draw/clear action was rejected (e.g., role vs. validation vs. round-state reasons), or only that it is rejected? [Completeness, Spec §FR-004, FR-008, FR-009] — No change made: low priority since FR-005a (new) already keeps these actions from being UI-reachable by the wrong role in normal use; the rejection messages are a defense-in-depth backstop, not a normal user-facing flow.
- [x] CHK017 Are requirements for how the redacted ("incorrect, no text") guess-history entries should read to a guesser specified, so two different implementers wouldn't produce inconsistent phrasing? [Ambiguity, Spec §FR-018] — Resolved: new FR-020 sets a minimum display bar (guesser identity + incorrect indicator, not a missing/broken entry) without dictating exact copy.

## Security & Input Integrity — Completeness & Consistency

- [x] CHK018 Is the requirement that role checks (drawer/guesser) be enforced independent of any client-supplied role claim made explicit, mirroring the prior phase's "non-UI path" guarantee for secret-word redaction? [Gap, Consistency with prior phase pattern] — Resolved by the same Edge Case bullet as CHK003.
- [x] CHK019 Are the boundary-validation requirements for stroke point data (e.g., numeric type, no upper bound) as explicit as the validation requirements for guess text? [Consistency, Spec §FR-007 vs. Key Entities "Stroke"] — Resolved: new FR-003a requires at least one point per stroke and rejects zero-point submissions; Key Entities "Stroke" now references it.
- [x] CHK020 Is the redaction rule (FR-018) specified precisely enough to be testable from raw response data alone, independent of any UI rendering? [Measurability, Spec §FR-018] — No gap found: FR-018 is already phrased entirely in terms of data sent to the client; no change made.
- [x] CHK021 Does the spec specify what happens if a guess's `participantId` cannot be resolved to a current room participant (e.g., a stale/disconnected ID), or is that scenario unaddressed? [Gap, Exception Flow] — **Resolved, and this surfaced a real bug**: `submitGuess()` previously only checked `participantId !== drawerParticipantId`, so an unknown/fabricated ID would still be recorded and broadcast as a guess. Added FR-009a, fixed `roomStore.ts` to reject unresolvable `participantId`s (`not_participant`, 403), added regression tests at both the service and route level, and updated `contracts/rooms-api.md`.
- [x] CHK022 Is it specified that the candidate guess history sent to a non-owning, non-drawer participant must omit the guessed text in *every* field of that entry (not just a primary "text" field), closing off any incidental-leak path? [Clarity, Spec §FR-018] — No gap found: the redacted entry shape only has `{id, participantId, correct}`, structurally has no secondary field that could leak text; no change made.

## Consistency With Prior Phases & Assumptions

- [x] CHK023 Is the relationship between this phase's "everything except incorrect-guess text is visible to everyone" rule and the prior phase's "secret word/word list visible only to drawer" rule reconciled explicitly, so a reader understands these are two distinct secrecy rules with different scopes? [Consistency, Spec §Assumptions] — No gap found: already reconciled by the final Assumptions bullet; no change made.
- [x] CHK024 Are the Assumptions section's scope exclusions (no round/result transitions, no guess-count limits) cross-checked against the Acceptance Scenarios to confirm no scenario implicitly depends on an excluded mechanism (e.g., a "next round" reference)? [Consistency, Spec §Assumptions] — Verified clean: none of the Acceptance Scenarios reference an excluded mechanism; no change made.

## Notes

- Check items off as completed: `[x]`
- Add comments or findings inline
- Link to relevant resources or documentation
- Items are numbered sequentially for easy reference
