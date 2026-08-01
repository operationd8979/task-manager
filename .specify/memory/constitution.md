<!--
SYNC IMPACT REPORT
==================
Version change: TEMPLATE (unfilled) → 1.0.0
Bump rationale: MAJOR — first ratified constitution; all placeholder principles replaced with
concrete, binding governance derived from the repository's Mobile Application Standards.

Modified principles:
  [PRINCIPLE_1_NAME] → I. Native Mobile Experience First
  [PRINCIPLE_2_NAME] → II. Generic, Reusable Component Architecture
  [PRINCIPLE_3_NAME] → III. Centralized Theming (NON-NEGOTIABLE)
  [PRINCIPLE_4_NAME] → IV. Complete Async State Coverage (NON-NEGOTIABLE)
  [PRINCIPLE_5_NAME] → V. Accessibility by Default
  (added)           → VI. Performance on Low-End Devices
  (added)           → VII. Deterministic Resource & State Lifecycle
  (added)           → VIII. Type-Safe, Testable Code

Added sections:
  - Security & Data Handling Constraints (was [SECTION_2_NAME])
  - Mandatory Delivery Baselines (new)
  - Development Workflow & Quality Gates (was [SECTION_3_NAME])

Removed sections: none

Templates requiring updates:
  ✅ .specify/templates/plan-template.md — UPDATED. Technical Context prefilled with the
     verified stack (React Native 0.86.2 bare CLI, React 19.2.3, TypeScript 5.8 strict,
     Jest 29 + @react-native/jest-preset). "Constitution Check" replaced with a hard
     8-principle gate table plus security and delivery-baseline gates. Project Structure
     replaced: the generic single/web/mobile options (which assumed separate native
     ios/ and android/ source trees) now describe the real single-codebase src/ layering.
  ✅ .specify/templates/tasks-template.md — UPDATED. Path Conventions rewritten for the
     React Native layer structure. Setup and Foundational phases now seed theme tokens,
     navigation, shared state components, and cleanup-safe async hooks. Sample tasks
     converted from Python to .ts/.tsx paths. New mandatory "Compliance Verification"
     phase; per-story tasks now carry states/a11y/cleanup so they are not deferred to
     polish. Task ordering updated to domain → services → hooks → screens.
  ✅ .specify/templates/spec-template.md — no change needed by design; specs stay
     technology-agnostic (what/why, not how), and this constitution adds no new
     mandatory spec sections.
  ✅ .specify/templates/checklist-template.md — no change needed; it is a generic
     scaffold whose items are generated per feature by /speckit-checklist.
  ✅ .specify/extensions/*/commands/*.md — reviewed; no agent-specific or outdated references.
  ✅ CLAUDE.md — generic SPECKIT block, no principle references to update.

Known stack gaps (resolve during the first feature's Phase 0 research):
  - No navigation library installed; Principle I requires bottom tabs + stack.
  - No storage library installed; Security Constraints require platform secure storage
    for tokens and personal data.
  - Only runtime dependency beyond React Native core is react-native-safe-area-context.

Deferred TODOs: none
-->

# Task Manager Constitution

Binding standards for this React Native mobile application. These rules apply to every feature,
screen, and component unless a specification explicitly overrides them and records the
justification in that specification's Complexity Tracking table.

## Core Principles

### I. Native Mobile Experience First

The application MUST feel like a premium native mobile app, never like a website in a WebView.

- Every common task MUST be completable in 1–2 user interactions from its entry point.
- Selection MUST be preferred over free-text entry wherever the input domain is enumerable.
- Every form field with a predictable value MUST ship a sensible preselected default, and
  MUST restore the user's previous selection where the value is reusable.
- Navigation MUST use bottom tabs, stack navigation, bottom sheets, or modals for temporary
  workflows. Navigation chains deeper than three levels are forbidden.
- Native interaction patterns MUST be used where they fit the task: swipe actions, pull to
  refresh, long press, drag and drop, floating action button, haptic feedback, native
  date/time pickers, infinite scrolling, momentum scrolling, sticky headers.
- Primary actions MUST remain visible without scrolling.

**Rationale**: Interaction cost, not feature count, determines whether a mobile app feels
premium. Fixing interaction models after screens ship is far more expensive than getting the
gesture and navigation vocabulary right the first time.

### II. Generic, Reusable Component Architecture

Implementation MUST be generic first and feature-specific only when genuinely unavoidable.

- A UI pattern used by two or more screens MUST live in the shared component layer.
- Components MUST be small, single-purpose, and renderable in isolation without app-level
  context beyond theme and i18n providers.
- Business logic MUST NOT live in view components; it belongs in hooks, services, or domain
  modules that are unit-testable without a renderer.
- Layers MUST depend inward only: UI → application/hooks → domain → data. Reverse imports
  are forbidden.
- Duplicated logic is a defect. The second occurrence MUST be extracted, not copied.

**Rationale**: Clean architecture and reusability are what keep a mobile codebase changeable
at month twelve. Feature-shaped code compounds into rewrites.

### III. Centralized Theming (NON-NEGOTIABLE)

All visual values MUST resolve from a single theme source of truth.

- Hardcoded colors are forbidden in component code — no hex literals, no `rgba()` strings,
  no named CSS colors outside the theme definition.
- The theme MUST expose semantic color tokens (not raw palette names), component tokens,
  typography tokens, spacing tokens, and radius tokens.
- Light mode and dark mode MUST both be complete. A screen that is unreadable or unstyled in
  either mode is an incomplete screen.
- Spacing, type scale, elevation/shadow, and corner radius MUST come from tokens; ad-hoc
  numeric literals for these properties are forbidden.

**Rationale**: A single token source is the only mechanism that makes dark mode, rebranding,
and accessibility contrast fixes tractable instead of a full-codebase audit.

### IV. Complete Async State Coverage (NON-NEGOTIABLE)

Every asynchronous operation MUST handle five states: loading, success, empty, error, retry.

- Loading MUST render a skeleton matching the eventual layout, not a bare spinner on a blank
  screen. Blank screens are forbidden in all cases.
- Empty states MUST explain what is missing and offer the action that resolves it.
- Error states MUST show an actionable message and a retry affordance. Raw exception text or
  status codes MUST NOT be shown to users.
- Failures MUST NOT be silently swallowed. Every `catch` either surfaces state to the user or
  records the failure through the app's logging path.
- Successful mutations MUST give explicit confirmation feedback.

**Rationale**: Mobile networks fail constantly. Unhandled states are the most common source of
user-visible breakage and the cheapest class of defect to prevent at implementation time.

### V. Accessibility by Default

Accessibility is a delivery requirement, not a later pass.

- Every interactive element MUST expose an accessible role and label to screen readers.
- Touch targets MUST be at least 44×44 points.
- Layouts MUST remain usable with OS font scaling increased; fixed-height text containers that
  clip scaled text are forbidden.
- Text and essential UI MUST meet WCAG AA contrast in both light and dark themes.
- Where an external keyboard applies, focus order MUST be logical and all actions reachable.

**Rationale**: Retrofitted accessibility requires re-opening every screen. Building it in costs
close to nothing per component.

### VI. Performance on Low-End Devices

The performance target is a low-end device, not the developer's phone.

- Any list that can exceed one screen of content MUST be virtualized.
- Animations MUST hold 60 FPS, MUST NOT block interaction, and MUST serve usability rather
  than decoration.
- The JS thread MUST NOT be blocked by synchronous work; expensive computation MUST be
  memoized, deferred, or moved off the critical path.
- Re-renders MUST be bounded: stable callbacks and memoized derived values are required where
  a component sits inside a list or re-renders on frequent state change.
- Network requests MUST be deduplicated and cached where the data is reusable. Redundant
  requests for already-held data are defects.
- Screens and heavy dependencies MUST be lazily loaded; bundle growth MUST be justified.

**Rationale**: The user base's slowest device sets the perceived quality of the app, and
performance regressions are invisible until they are systemic.

### VII. Deterministic Resource & State Lifecycle

Nothing may outlive the screen that created it.

- On unmount, code MUST remove listeners, clear timers and intervals, abort in-flight requests,
  dispose subscriptions, stop animations, and close websocket connections.
- Camera and microphone resources MUST be released explicitly when the capturing screen loses
  focus or unmounts.
- State MUST have exactly one source of truth. Duplicating server state into local state, or
  the same value into two stores, is forbidden.
- State MUST be local by default; it is lifted to shared scope only when two or more consumers
  genuinely require it.
- Persisted and shared data MUST be normalized. Deeply nested mutable state trees are forbidden.

**Rationale**: Leaked resources and duplicated state produce the two defect classes hardest to
reproduce in mobile apps: gradual degradation and inconsistent UI.

### VIII. Type-Safe, Testable Code

Code MUST be production quality at first submission.

- TypeScript MUST run in `strict` mode. `any` is forbidden; use `unknown` with narrowing or a
  precise type. Any suppression comment MUST carry an inline justification.
- Magic numbers and magic strings MUST be named constants or theme tokens.
- Dead code, commented-out code, and unused exports MUST NOT be committed.
- Business logic MUST be importable and testable without mounting a screen, and MUST be
  compatible with unit, component, and integration testing.
- Naming MUST describe intent; folder structure MUST make a feature's boundary obvious.

**Rationale**: Typing and testability are what allow the other seven principles to be enforced
mechanically rather than by reviewer memory.

## Security & Data Handling Constraints

- Secrets, API keys, and credentials MUST NOT appear in source, configuration committed to the
  repository, or build artifacts. They are supplied through environment/secure storage.
- Sensitive data — credentials, tokens, personal data, health data, payment data — MUST NOT be
  written to logs, analytics events, or crash reports.
- Client-side validation is a UX affordance only. Every rule that protects data integrity MUST
  also be enforced server-side; the client MUST NOT be treated as trusted.
- Tokens and other sensitive values MUST be stored in platform secure storage, never in plain
  async storage.

## Mandatory Delivery Baselines

These baselines are checked per screen before a feature is considered complete.

**Forms** MUST validate while typing, show inline field-level messages, preserve entered values
across validation failures and navigation-away-and-back, support keyboard navigation between
fields, and scroll automatically to the first invalid field on submit. Autofocus is applied only
where the field is unambiguously the user's next action.

**Lists** MUST provide pull to refresh, skeleton loading, and an empty state. Infinite loading is
required where the dataset is unbounded. Search, filtering, and sorting are required where the
dataset can exceed one screen. Swipe actions are provided where a per-item action is meaningful.

**Every feature delivered** MUST include: native mobile UX, consistent theming, reusable
components, responsive layout, loading/error/empty/success states, memory-safe cleanup, and
accessibility support. A feature missing any of these is incomplete, not "polish pending".

## Development Workflow & Quality Gates

- `/speckit-plan` MUST complete the Constitution Check gate before Phase 0 research and MUST
  re-check it after Phase 1 design.
- Any principle violation MUST be recorded in the plan's Complexity Tracking table with the
  concrete need and the simpler alternative that was rejected. Unjustified violations block
  the plan.
- Task generation MUST allocate explicit tasks for theming tokens, async state coverage,
  accessibility, and resource cleanup rather than assuming they are implied by feature tasks.
- Code review MUST verify compliance with these principles. A reviewer citing a principle by
  number is sufficient grounds to request changes.
- Type checking and linting MUST pass before merge. Failing gates are not waived to unblock
  delivery.

## Governance

This constitution supersedes all other development practices, conventions, and habits in this
repository. Where a specification conflicts with it, the specification MUST state the override
explicitly and justify it; silence is not an override.

**Amendment procedure**: Amendments are proposed as a change to this file, MUST state the
motivation and the migration impact on existing code, and MUST be reviewed and approved before
merge. On approval, the version and Last Amended date are updated in the same change, and all
dependent templates under `.specify/templates/` are re-checked for consistency.

**Versioning policy**: Semantic versioning applies to this document.

- MAJOR — a principle is removed or redefined in a backward-incompatible way, or governance
  changes in a way that invalidates prior compliance.
- MINOR — a new principle or section is added, or existing guidance is materially expanded.
- PATCH — clarifications, wording, and typo fixes that do not change what is required.

**Compliance review**: Compliance is verified at three checkpoints — the plan's Constitution
Check gate, code review before merge, and feature completion against the Mandatory Delivery
Baselines. Runtime development guidance for agents lives in `CLAUDE.md` and the active
feature's `plan.md`; neither may contradict this document.

**Version**: 1.0.0 | **Ratified**: 2026-08-01 | **Last Amended**: 2026-08-01
