# Gameplay, Sync, UX & Security Requirements Checklist: Drawing Canvas, Guess Submission & Scoring

**Purpose**: Validate the quality (completeness, clarity, consistency, measurability, coverage) of the requirements in spec.md covering core gameplay logic, real-time polling sync, UX/feedback clarity, and security/input-integrity for this feature — as a reviewer gate, independent of the implementation.
**Created**: 2026-06-17
**Feature**: [spec.md](../spec.md)

**Note**: This checklist tests whether the requirements are written clearly and completely — it does not test whether the implementation behaves correctly.

## Core Gameplay Logic — Completeness & Clarity

- [x] CHK001 Is the maximum allowed gap between consecutive points within a single stroke explicitly bounded, or is "continuous-looking line" left unquantified? [Clarity, Spec §Edge Cases] — Resolved: rewritten to tie continuity to "a line segment per received pointermove event, no skipping," a verifiable behavior instead of a visual impression.
- [ ] CHK002 Are the rules for what counts as a single vs. separate stroke fully specified for every input pattern (e.g., a pointer-down with zero movement before pointer-up)? [Completeness, Spec §FR-001, FR-003]
- [ ] CHK003 Is "drawer-only" enforcement specified as a server-side guarantee distinct from a UI-only restriction, for both drawing and clearing? [Clarity, Spec §FR-004, FR-005]
- [ ] CHK004 Are the trimming and case-insensitivity rules for guess comparison specified precisely enough to be independently re-implemented (e.g., which side is trimmed, what counts as whitespace)? [Measurability, Spec §FR-007, FR-011]
- [ ] CHK005 Is the requirement that "drawer cannot guess" and "guesser cannot draw/clear" stated as a single consistent mutual-exclusion rule, or could the two halves drift independently if one were edited? [Consistency, Spec §FR-004, FR-009]
- [ ] CHK006 Are the requirements for a repeated correct guess from the same participant (FR-014) and a subsequent incorrect guess from that same participant equally specified, or does the spec only describe the repeated-correct case? [Completeness, Spec §FR-014]
- [ ] CHK007 Is the scoring increment (exactly 100) specified as immutable for this phase, or could a future reader infer it might vary by guess speed/order without an explicit "exactly" qualifier? [Clarity, Spec §FR-012]

## Real-Time Sync & Polling — Completeness & Measurability

- [x] CHK008 Is the polling cadence ("~2s") specified as a target/expectation rather than a hard guarantee, and is that distinction clear to a reader who must design the sync mechanism? [Clarity, Spec §SC-005] — Resolved: SC-005 now states "one polling cycle" is the pass/fail threshold and "~2s" is explicitly descriptive context only.
- [ ] CHK009 Are requirements defined for what a participant's client should display in the interval between an action occurring and that participant's next poll (e.g., stale-but-not-blank state)? [Gap, Edge Case]
- [ ] CHK010 Is it specified that canvas, guess-history, and score updates all share the same poll/snapshot mechanism, or could a reader infer they might use independent sync channels? [Consistency, Spec §FR-016, FR-017]
- [ ] CHK011 Are requirements defined for how a participant's client should behave if a poll request fails transiently (vs. the room genuinely no longer existing)? [Gap, Exception Flow]
- [ ] CHK012 Is "within one polling cycle" in SC-005 measurable/testable as written, or does it depend on an implementation-specific poll interval not fixed by the spec? [Measurability, Spec §SC-005]

## UX & Feedback Clarity — Completeness & Clarity

- [ ] CHK013 Are the visual/labeling requirements for distinguishing drawer-only controls (clear) from guesser-only controls (guess submission) specified, or only implied by the role-gating functional requirements? [Gap, Spec §FR-005, FR-009]
- [ ] CHK014 Is the rejection message requirement for an empty/whitespace guess specified with any content guidance, or only as "a clear message" without a minimum bar for clarity? [Clarity, Spec §FR-008]
- [ ] CHK015 Are requirements defined for how a guesser's own pending/just-submitted guess should appear in their UI before the next poll confirms it server-side? [Gap, Edge Case]
- [ ] CHK016 Is there a requirement for visually indicating *why* a guess/draw/clear action was rejected (e.g., role vs. validation vs. round-state reasons), or only that it is rejected? [Completeness, Spec §FR-004, FR-008, FR-009]
- [x] CHK017 Are requirements for how the redacted ("incorrect, no text") guess-history entries should read to a guesser specified, so two different implementers wouldn't produce inconsistent phrasing? [Ambiguity, Spec §FR-018] — Resolved: new FR-020 sets a minimum display bar (guesser identity + incorrect indicator, not a missing/broken entry) without dictating exact copy.

## Security & Input Integrity — Completeness & Consistency

- [ ] CHK018 Is the requirement that role checks (drawer/guesser) be enforced independent of any client-supplied role claim made explicit, mirroring the prior phase's "non-UI path" guarantee for secret-word redaction? [Gap, Consistency with prior phase pattern]
- [ ] CHK019 Are the boundary-validation requirements for stroke point data (e.g., numeric type, no upper bound) as explicit as the validation requirements for guess text? [Consistency, Spec §FR-007 vs. Key Entities "Stroke"]
- [ ] CHK020 Is the redaction rule (FR-018) specified precisely enough to be testable from raw response data alone, independent of any UI rendering? [Measurability, Spec §FR-018]
- [ ] CHK021 Does the spec specify what happens if a guess's `participantId` cannot be resolved to a current room participant (e.g., a stale/disconnected ID), or is that scenario unaddressed? [Gap, Exception Flow]
- [ ] CHK022 Is it specified that the candidate guess history sent to a non-owning, non-drawer participant must omit the guessed text in *every* field of that entry (not just a primary "text" field), closing off any incidental-leak path? [Clarity, Spec §FR-018]

## Consistency With Prior Phases & Assumptions

- [ ] CHK023 Is the relationship between this phase's "everything except incorrect-guess text is visible to everyone" rule and the prior phase's "secret word/word list visible only to drawer" rule reconciled explicitly, so a reader understands these are two distinct secrecy rules with different scopes? [Consistency, Spec §Assumptions]
- [ ] CHK024 Are the Assumptions section's scope exclusions (no round/result transitions, no guess-count limits) cross-checked against the Acceptance Scenarios to confirm no scenario implicitly depends on an excluded mechanism (e.g., a "next round" reference)? [Consistency, Spec §Assumptions]

## Notes

- Check items off as completed: `[x]`
- Add comments or findings inline
- Link to relevant resources or documentation
- Items are numbered sequentially for easy reference
