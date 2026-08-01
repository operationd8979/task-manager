# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: DERIVE these values, do not copy them forward from a previous plan
  and do not guess. Read the repository's package.json, tsconfig.json and lockfile and
  record what is actually installed, with versions. A value that cannot be established
  from the repo is NEEDS CLARIFICATION and must be resolved in Phase 0 research.

  The lines below state which file answers each field.
-->

**Language/Version**: [TypeScript version from package.json devDependencies; confirm
`strict` is on via tsconfig.json and its `extends` base. React version from dependencies]

**Primary Dependencies**: [React Native version and workflow — bare CLI vs Expo — from
package.json; then the runtime dependencies this feature relies on. Any dependency this
feature ADDS must be justified here against Principle VI (bundle size)]

**Storage**: [The installed persistence library, or NEEDS CLARIFICATION if the feature
persists data and none is installed. Sensitive values require platform secure storage per
Security & Data Handling Constraints; plain async storage is not acceptable for tokens/PII]

**Testing**: [Test runner and preset from package.json and its config file; where tests
live in this repo]

**Target Platform**: [iOS/Android minimum versions. Note whether native projects are
committed (bare) or generated (managed)]

**Project Type**: Mobile application — single React Native codebase. [State whether a
backend lives in this repository or is an external dependency]

**Performance Goals**: 60 FPS animations and scrolling on a low-end device;
no blocking work on the JS thread (Principle VI)

**Constraints**: Offline-friendly where feasible; light and dark theme both complete;
touch targets ≥ 44×44 pt; navigation depth ≤ 3 levels (Principles I, III, V)

**Scale/Scope**: [number of screens / entities this feature adds]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Every gate below is derived from `.specify/memory/constitution.md` v1.0.0. Mark each
PASS, or FAIL with a row in Complexity Tracking. An unjustified FAIL blocks the plan.

| # | Principle | Gate | Status |
|---|-----------|------|--------|
| I | Native Mobile Experience First | Primary task completes in 1–2 interactions; navigation depth ≤ 3; selection preferred over typing; defaults preselected; native gestures used where they fit | [PASS/FAIL] |
| II | Generic, Reusable Component Architecture | Shared patterns placed in `src/components/`; no business logic in view components; imports flow UI → hooks → domain → data only | [PASS/FAIL] |
| III | Centralized Theming (NON-NEGOTIABLE) | Zero hardcoded colors/spacing/radius literals; all values from `src/theme/`; light and dark both complete | [PASS/FAIL] |
| IV | Complete Async State Coverage (NON-NEGOTIABLE) | Every async path defines loading (skeleton), success, empty, error, retry; no blank screens; no silent catch | [PASS/FAIL] |
| V | Accessibility by Default | Roles/labels on interactive elements; targets ≥ 44×44 pt; layout survives OS font scaling; WCAG AA contrast both themes | [PASS/FAIL] |
| VI | Performance on Low-End Devices | Lists virtualized; re-renders bounded; no JS-thread blocking; requests deduped/cached; new dependencies justified | [PASS/FAIL] |
| VII | Deterministic Resource & State Lifecycle | Unmount clears listeners, timers, in-flight requests, subscriptions, animations; single source of truth per state | [PASS/FAIL] |
| VIII | Type-Safe, Testable Code | No `any`; no magic numbers/strings; business logic testable without a renderer | [PASS/FAIL] |

**Security check**: no secrets in source; no sensitive data in logs/analytics; client
validation treated as UX only. [PASS/FAIL]

**Delivery baselines**: forms and lists in this feature meet the Mandatory Delivery
Baselines section of the constitution. [PASS/FAIL/N-A]

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

<!--
  ACTION REQUIRED: Expand the tree below with the REAL files this feature adds or
  changes. Keep the layer boundaries: a file's directory determines what it may
  import (Principle II). Do not invent parallel structures.
-->

```text
src/
├── app/                     # Composition root: providers, navigation, entry wiring
│   ├── navigation/          # Stack + bottom tab navigators, route types
│   └── providers/           # Theme, safe area, query/state providers
├── features/
│   └── [feature-name]/      # One folder per feature; the feature's public API is index.ts
│       ├── screens/         # Screen components (composition only, no business logic)
│       ├── components/      # Components private to this feature
│       ├── hooks/           # Feature state and side effects
│       └── index.ts
├── components/              # Shared generic UI, reused by 2+ features
├── theme/                   # Single source of truth: color, typography, spacing, radius tokens
├── hooks/                   # Shared hooks
├── services/                # Data access: API clients, storage adapters
├── domain/                  # Entities and business rules; renderer-free, unit-testable
├── lib/                     # Framework-agnostic utilities
└── types/                   # Shared type declarations

__tests__/                   # App-level tests
android/                     # Native Android project (present in bare workflow)
ios/                         # Native iOS project (present in bare workflow)
```

**Structure Decision**: Single React Native codebase. [State which of the directories
above already exist in this repository and which this feature creates — check before
writing.] `src/` is introduced by the first feature that needs it and MUST follow the
layering above; the root app entry stays a thin shell that mounts `src/app/`.
[State whether a backend lives in this repository; if this feature needs one and it
does not, record it as an external dependency in Technical Context.]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., new state management dependency] | [current need] | [why local state + context insufficient] |
| [e.g., hardcoded color in a native module bridge] | [specific problem] | [why a theme token cannot reach it] |
