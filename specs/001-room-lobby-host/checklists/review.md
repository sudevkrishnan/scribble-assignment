# PR Review Checklist: Room Setup, Host Assignment & Lobby Sync

**Purpose**: Validate the quality (completeness, clarity, consistency,
measurability, coverage) of `spec.md`'s requirements — covering core
requirement quality, security/input-integrity, and UX/feedback-clarity
dimensions — for a PR reviewer evaluating the spec before/alongside planning
for this or a follow-on phase.
**Created**: 2026-06-17
**Feature**: [spec.md](../spec.md)

**Note**: This checklist tests whether the *requirements are well-written*,
not whether the implementation works. Items below ask questions about the
spec text itself.

## Requirement Completeness

- [ ] CHK001 Are requirements defined for what happens when room-code generation collides under truly concurrent (not just sequential) requests, beyond the general "MUST always yield distinct codes" statement? [Completeness, Spec §Edge Cases]
- [ ] CHK002 Is a maximum participant count per room specified anywhere, or is "unbounded" an explicit decision? [Gap]
- [ ] CHK003 Are requirements defined for whether duplicate player display names within the same room are permitted or disallowed? [Gap]
- [ ] CHK004 Are requirements defined for the outcome when a non-host's start attempt and the host's legitimate start attempt race concurrently? [Gap, Edge Case]
- [ ] CHK005 Is the distinction between a "transient" reattachment failure and a genuine "not found" reattachment failure specified in spec.md itself (vs. only inferable)? [Completeness, Spec §Edge Cases, FR-014]

## Requirement Clarity

- [ ] CHK006 Is "approximately 2-second interval" (FR-008) given a tolerance range, or left fully to implementation discretion? [Clarity, Spec §FR-008]
- [ ] CHK007 Is "fully isolated" (FR-007) defined precisely enough to be objectively testable — i.e., does it enumerate which fields/operations must never cross rooms? [Clarity, Spec §FR-007]
- [ ] CHK008 Do FR-004/FR-005/FR-006 specify any required content for their "clear, specific" messages, or only that they must be distinct from each other? [Clarity, Spec §FR-004-006]
- [ ] CHK009 Is the exact code-format boundary (4-character, fixed alphabet) stated directly in the Functional Requirements section, or does a reader have to cross-reference the Clarifications log to find it? [Clarity, Spec §FR-005, §Clarifications]

## Requirement Consistency

- [ ] CHK010 Are the host-identification requirements (FR-009) consistent with the Key Entities description of "Host" as a permanent, creator-only role, with no contradicting statement elsewhere in the spec? [Consistency, Spec §FR-009, §Key Entities]
- [ ] CHK011 Is the "without requiring manual action" language in FR-008/US3 consistent with the spec neither requiring nor forbidding a supplementary manual refresh affordance? [Consistency, Spec §FR-008, §US3]

## Acceptance Criteria Quality

- [ ] CHK012 Can SC-004's "within 3 seconds" be objectively verified given FR-008 only commits to "approximately 2 seconds" rather than a fixed value? [Measurability, Spec §SC-004, §FR-008]
- [ ] CHK013 Does SC-006's "100% of the time the room still exists" implicitly assume a reliable network, and if so, is that assumption stated? [Measurability, Spec §SC-006]
- [ ] CHK014 Is "visibly present but disabled" (US4, Acceptance Scenario 2) specific enough to be objectively checked by a reviewer, or does it rely on subjective interpretation of "visible"? [Acceptance Criteria, Spec §US4]

## Scenario Coverage

- [ ] CHK015 Are Alternate-flow requirements defined for a host who creates a room and reloads before any other player has joined? [Coverage, Gap]
- [ ] CHK016 Are Exception-flow requirements defined for a join request submitted to a room that has already transitioned out of "lobby" status? [Coverage, Gap]
- [ ] CHK017 Are Recovery requirements defined for a non-host whose stored identity becomes stale, not only for the host's case described in the Edge Cases? [Coverage, Spec §Edge Cases]
- [ ] CHK018 Are Non-Functional requirements addressing malicious or oversized payloads to the create/join endpoints specified anywhere? [Coverage, Gap]

## Edge Case Coverage

- [ ] CHK019 Is behavior specified for a host attempting to start the game from a lobby view that hasn't yet polled the room's latest participant count? [Edge Case, Gap]
- [ ] CHK020 Does the spec address two different rooms' hosts reattaching simultaneously, or does it implicitly assume reattachment is independent per room (as Key Entities/FR-007 would suggest)? [Edge Case, Spec §Edge Cases, §FR-007]
- [ ] CHK021 Is there a stated bound on room-code generation retries in case the alphabet space were ever exhausted, or is that explicitly out of scope at this scale? [Edge Case, Gap]

## Non-Functional — Security & Input Integrity

- [ ] CHK022 Beyond "clear message," are requirements specified for what error responses must *not* expose (e.g., internal state, stack traces)? [Security, Spec §FR-004-006; constitution Principle IV]
- [ ] CHK023 Is there a requirement bounding acceptable input length/character set for player names, room codes, or participant IDs submitted by clients? [Security, Gap]
- [ ] CHK024 Does the spec explicitly require server-side re-validation of start/join eligibility independent of any client-side UI state (vs. only implying it via the "non-UI path" edge case)? [Security, Spec §Edge Cases]

## Non-Functional — UX & Feedback Clarity

- [ ] CHK025 Are requirements specified for distinguishing a disabled-due-to-player-count Start control from a hidden-for-non-host Start control beyond "visibly present" vs. "no control available"? [UX, Spec §US4]
- [ ] CHK026 Is there a requirement for what a participant sees during the loading window while reattachment or a poll request is in flight? [UX, Gap]
- [ ] CHK027 Is there a requirement for how long an error message (e.g., "room not found") should remain visible before being cleared or replaced? [UX, Gap]

## Dependencies & Assumptions

- [ ] CHK028 Is the Assumption that "reloading the same browser tab is reattachment, not a disconnect" validated against the case where the browser itself clears session storage (e.g., private/incognito mode)? [Assumption, Spec §Assumptions]
- [ ] CHK029 Is the dependency on the existing 4-character code-generation alphabet documented as a hard constraint future phases must not silently change? [Dependency, Spec §FR-005, §Clarifications]

## Ambiguities & Conflicts

- [ ] CHK030 Does FR-002's "no two simultaneously active rooms share a code" apply only while both rooms are in "lobby" status, or for a room's entire lifetime including "active"? Is this ambiguous as written? [Ambiguity, Spec §FR-002]

## Notes

- Check items off as resolved (i.e., the spec text was confirmed adequate, not that the code was tested).
- Items marked `[Gap]` indicate a requirement that doesn't currently exist anywhere in spec.md — decide whether to add it or explicitly accept it as out of scope.
- This checklist evaluates `spec.md` as written at the time of generation; if the spec is amended, re-run `/speckit-checklist` to append new items rather than editing past ones.
