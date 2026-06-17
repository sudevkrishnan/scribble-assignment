<!--
Sync Impact Report
- Version change: (template, unratified) → 1.0.0
- Modified principles: all 5 template placeholders replaced; expanded from 5
  to 7 principles
- Added principles: I. Code Quality & Maintainability, II. Test-First &
  Verification Discipline, III. Determinism & Game-Rule Integrity,
  IV. Security & Input Integrity, V. User Experience & Feedback Clarity,
  VI. Performance & Resource Efficiency, VII. AI-Assisted Development &
  Self-Review
- Added sections: Additional Constraints (non-negotiable architectural
  boundaries), Development Workflow
- Removed sections: none (template placeholders only)
- Templates requiring updates:
  - .specify/templates/plan-template.md ✅ no changes needed — its
    "Constitution Check" gate is filled dynamically per-feature from this
    file at /speckit-plan time, no hardcoded principle list to update
  - .specify/templates/spec-template.md ✅ no changes needed — generic,
    no constitution-specific references
  - .specify/templates/tasks-template.md ✅ no changes needed — already has
    generic "Security hardening" / "Performance optimization" polish-phase
    slots that future /speckit-tasks runs can map to Principles IV and VI
  - AGENTS.md ✅ no changes needed — constitution is a superset, consistent
    with existing forbidden items (no WebSockets/DB/auth)
  - README.md ✅ no changes needed — constitution reflects README's phased
    checkpoints, scope, and evaluation rubric as written
- Follow-up TODOs: none — no placeholders deferred
-->

# Scribble Constitution

## Core Principles

### I. Code Quality & Maintainability
TypeScript strict mode is non-negotiable in both `backend/` and `frontend/`; `any`
MUST NOT be introduced — use `unknown` plus narrowing when a type is genuinely
dynamic. Backend code MUST keep the existing layering (`api` → `services` →
`models`) and frontend code MUST keep state in `src/state`, not scattered across
components. Prefer pure functions and immutable updates over in-place mutation,
especially for room/game state. Every PR MUST stay traceable to a spec/plan/task
item; unrelated refactors and unjustified new top-level dependencies are
forbidden. Code review (human or AI-assisted) MUST check naming, duplication,
and dead code before merge, not just "does it run."

**Rationale**: This is a brownfield lab graded on traceability and reasoning
quality, not feature volume. A consistent, typed, layered codebase is what
makes AI-assisted changes reviewable and keeps drift between spec and
implementation visible.

### II. Test-First & Verification Discipline
Every behavioral change (room lifecycle, drawer assignment, guess validation,
scoring, restart) MUST have a corresponding test in `vitest` before or
alongside the change — extending `roomStore.test.ts` / `schemas.test.ts` /
`api.test.ts` patterns rather than inventing new test infra. `npm run build`
and `npm test` MUST pass in both `backend/` and `frontend/` before a slice is
considered done (this mirrors the CI gates in `.github/workflows/ci.yml`).
Acceptance criteria from the spec MUST also be verified manually with two
browser tabs for any multi-player flow (join, lobby sync, drawing, guessing,
restart) — automated tests alone do not satisfy a scenario's "Definition of
Done."

**Rationale**: The lab is explicitly evaluated on "working game flow" across
two browsers and on edge-case handling, not just unit coverage. Tests anchor
AI-assisted iteration so regressions in scoring/sync rules are caught
immediately.

### III. Determinism & Game-Rule Integrity
Game rules MUST behave identically given identical inputs: secret word
selection, drawer assignment, scoring (exact match, case-insensitive,
trimmed), and round/result transitions MUST be deterministic and MUST NOT
depend on wall-clock time, random number generators without a fixed/seeded
source, or client-side state that isn't reconcilable from the server snapshot.
The backend in-memory store remains the single source of truth; the frontend
MUST treat polled snapshots as authoritative and MUST NOT locally invent state
(e.g., optimistic score changes) that could diverge from the server. Room
codes MUST guarantee isolation — actions in one room MUST NOT leak into
another room's state.

**Rationale**: Multiplayer correctness in a polling-based, in-memory game
hinges entirely on deterministic, server-authoritative rules. Non-determinism
or client-side state drift is the most likely source of subtle, hard-to-spec
bugs in this architecture.

### IV. Security & Input Integrity
All request payloads MUST be validated with `Zod` at the API boundary
(`backend/src/api/schemas.ts`) before touching service/model logic — no
unvalidated input reaches `roomStore`. Player names and guesses MUST be
trimmed and rejected if empty/whitespace-only, with a clear error returned to
the caller (never a silent no-op or a 500). Room codes MUST be validated for
format before lookup, and invalid/unknown codes MUST return a clear,
non-leaking error (no stack traces, no internal state) rather than crashing
the request. Per the lab's explicit scope boundaries, the project MUST NOT add
authentication, sessions, persistent storage, or any dependency that expands
the attack surface beyond what is required for an in-memory, single-process
game (see Additional Constraints).

**Rationale**: With no auth layer, input validation at the boundary is the
only line of defense against malformed or hostile requests corrupting shared
room state. Security here means correctness and containment, not
authentication.

### V. User Experience & Feedback Clarity
Every user-facing action (create room, join room, start game, draw, guess,
restart) MUST give immediate, legible feedback: success states are visible,
and failure states show a specific, human-readable message — never a blank
screen, a console-only error, or a raw API error string. The lobby MUST
reflect the latest server state automatically via polling (~2s) rather than
relying on manual refresh. Host-only actions (start game) and drawer-only
information (the secret word) MUST be visually distinguished from guesser
views so role boundaries are obvious without documentation. UI MUST remain
usable (not crash, not freeze) when the backend is unreachable or returns an
error — the frontend MUST degrade to a clear error state.

**Rationale**: The business scenarios are written as user-facing Given/When/Then
flows; a technically correct backend with a confusing or silent frontend fails
the scenario even if the underlying logic is right.

### VI. Performance & Resource Efficiency
The backend MUST keep its in-memory footprint bounded: room state MUST be
explicitly removable (no orphaned rooms accumulating for the life of the
process beyond what a restart-clears-all model implies), and lookups MUST
stay O(1)/map-based rather than linear scans over growing collections.
Polling intervals (lobby ~2s, in-game sync) MUST be tuned to feel responsive
without causing excessive request volume — prefer the smallest interval that
satisfies the spec's latency expectations, not the smallest interval possible.
Frontend re-renders triggered by polling MUST be scoped (e.g., via selective
state updates) so a poll tick doesn't force full-page re-renders when only
part of the room snapshot changed.

**Rationale**: Polling is the only sync mechanism allowed in this lab; getting
its cadence and footprint wrong is the most direct way to make the game feel
laggy or to leak memory in a long-running dev server.

### VII. AI-Assisted Development & Self-Review
AI-generated code MUST be reviewed by the developer before it is committed —
no uncritical acceptance of AI output. Every Spec Kit artifact
(`/speckit.specify`, `/speckit.plan`, `/speckit.tasks`) MUST be updated
incrementally per feature group, and implementation MUST stay traceable back
to the spec item it satisfies; deviations MUST be documented rather than
silently merged. Commits MUST be granular and individually explainable — a
commit message MUST describe why a change was made, referencing the scenario
or task it advances. Before marking a task complete, the developer MUST
self-review the diff for scope creep (out-of-scope items per the lab's
explicit exclusions: WebSockets, databases, auth, multi-round play, etc.) and
remove anything that doesn't trace to an in-scope requirement.

**Rationale**: This lab's primary subject is the Spec Kit workflow itself —
graded on traceability, reasoning, and disciplined review of AI output, not
raw feature count. Unreviewed AI output is the most likely source of
unjustified dependencies, scope creep, or spec/implementation drift.

## Additional Constraints

The following architectural boundaries are non-negotiable for this project,
matching `AGENTS.md` and the lab's explicit out-of-scope list:

- **No WebSockets or real-time push protocols.** All client/server sync MUST
  use HTTP polling.
- **No databases or persistent storage** (SQL, NoSQL, SQLite, files-as-DB,
  etc.). All state MUST live in-memory in the backend process and MUST be
  expected to clear on restart.
- **No authentication, sessions, or accounts.** Players are identified only
  by in-memory room membership.
- **No multiple rounds, drawer rotation, timers, countdowns, scoring bonuses,
  custom/random word packs, spectator mode, moderation (kick/mute), room
  passwords/invite links, or deployment/CI/Docker work**, per the lab's
  explicit exclusions — these MUST NOT appear in spec, plan, tasks, or code.
- **No new state-management or routing libraries** beyond what the starter
  already ships (`react-router-dom`, the existing `src/state` pattern).

Any change that appears to require one of these boundaries to be crossed MUST
be flagged to the user as a scope conflict before implementation, not worked
around.

## Development Workflow

- Work proceeds scenario-by-scenario per the README's phased checkpoints;
  each checkpoint's spec/plan/tasks MUST be updated before its code is
  implemented, and the prior checkpoint MUST pass its acceptance criteria
  before starting the next.
- `npm run build` and `npm test` MUST pass in both `backend/` and `frontend/`
  before a slice is considered complete, matching the CI gates in
  `.github/workflows/ci.yml`.
- Pull requests MUST follow `.github/pull_request_template.md`, including
  role selection (checked by `.github/scripts/verify-pr-description.mjs`) and
  email/role identification per the README's repository workflow.
- Every PR/commit MUST be reviewable in isolation: a reviewer should be able
  to map the diff to a specific spec scenario or task without out-of-band
  context.

## Governance

This constitution supersedes ad-hoc conventions and prior informal guidance
(including `AGENTS.md`, which it codifies and may extend). Amendments require:

1. A documented rationale for the change (what gap or failure prompted it).
2. An update to this file with a version bump per the policy below.
3. A check of `.specify/templates/*.md` and `AGENTS.md` for now-inconsistent
   guidance, updated in the same change where feasible.

**Versioning policy**: MAJOR for backward-incompatible principle removals or
redefinitions; MINOR for new principles or materially expanded guidance;
PATCH for wording/clarification fixes with no semantic change.

All PRs MUST be checked against these principles before merge. Complexity or
scope that conflicts with a principle MUST be justified in the PR description
or removed. Use `AGENTS.md` and the README for day-to-day runtime development
guidance; this constitution governs when they conflict.

**Version**: 1.0.0 | **Ratified**: 2026-06-17 | **Last Amended**: 2026-06-17
