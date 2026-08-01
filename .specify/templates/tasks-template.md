---

description: "Task list template for feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: The examples below include test tasks. Tests are OPTIONAL - only include them if explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single React Native codebase (bare CLI workflow). Layer boundaries are enforced by
directory — see Principle II in `.specify/memory/constitution.md`.

- **Composition root**: `src/app/` (navigation, providers)
- **Feature code**: `src/features/[feature-name]/{screens,components,hooks}/`
- **Shared UI**: `src/components/` — used by 2+ features
- **Theme tokens**: `src/theme/` — the only place color/spacing/radius values may be defined
- **Logic layers**: `src/hooks/`, `src/services/`, `src/domain/`, `src/lib/`
- **Tests**: `__tests__/` at root for app-level; co-located `__tests__/` per module
- **Native**: `android/`, `ios/` — touch only when a feature needs native config
- Adjust against the Structure Decision in plan.md before writing task paths

<!--
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.

  The /speckit-tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - Feature requirements from plan.md
  - Entities from data-model.md
  - Endpoints from contracts/

  Tasks MUST be organized by user story so each story can be:
  - Implemented independently
  - Tested independently
  - Delivered as an MVP increment

  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create the `src/` layer structure per plan.md (app, features, components, theme, hooks, services, domain, lib, types)
- [ ] T002 Reduce the root app entry (`App.tsx`) to a thin shell mounting `src/app/`
- [ ] T003 [P] Verify the repo's configured linter and formatter run clean
- [ ] T004 [P] Confirm `tsc --noEmit` passes with `strict: true`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

Examples of foundational tasks (adjust based on your project):

- [ ] T005 Define theme tokens in `src/theme/` — semantic colors, typography, spacing, radius, elevation — with complete light AND dark palettes (Principle III)
- [ ] T006 Implement `ThemeProvider` + `useTheme()` in `src/app/providers/` wired to OS color scheme
- [ ] T007 [P] Set up navigation in `src/app/navigation/` — bottom tabs + stack, typed route params (Principle I)
- [ ] T008 [P] Build shared state primitives in `src/components/`: `Skeleton`, `EmptyState`, `ErrorState` with retry (Principle IV)
- [ ] T009 [P] Create base entities in `src/domain/` that all stories depend on
- [ ] T010 Configure error handling and logging that never records sensitive data (Security Constraints)
- [ ] T011 [P] Add a cleanup-safe async hook in `src/hooks/` (abortable request + unmount teardown) for reuse (Principle VII)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 1 (OPTIONAL - only if tests requested) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T012 [P] [US1] Unit test for [domain rule] in src/domain/__tests__/[name].test.ts
- [ ] T013 [P] [US1] Component test for [screen] in src/features/[feature]/__tests__/[Screen].test.tsx

### Implementation for User Story 1

- [ ] T014 [P] [US1] Create [Entity1] type + rules in src/domain/[entity1].ts
- [ ] T015 [P] [US1] Create [Entity2] type + rules in src/domain/[entity2].ts
- [ ] T016 [US1] Implement [Service] in src/services/[service].ts (depends on T014, T015)
- [ ] T017 [US1] Implement use[Feature] hook in src/features/[feature]/hooks/ — owns loading/success/empty/error/retry (Principle IV)
- [ ] T018 [US1] Build [Screen] in src/features/[feature]/screens/ using theme tokens only (Principle III)
- [ ] T019 [US1] Render all five async states via the shared Skeleton/EmptyState/ErrorState components
- [ ] T020 [US1] Add accessibility roles/labels and verify 44×44 pt touch targets (Principle V)
- [ ] T021 [US1] Verify unmount teardown: listeners, timers, in-flight requests, animations (Principle VII)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 2 (OPTIONAL - only if tests requested) ⚠️

- [ ] T022 [P] [US2] Unit test for [domain rule] in src/domain/__tests__/[name].test.ts
- [ ] T023 [P] [US2] Component test for [screen] in src/features/[feature]/__tests__/[Screen].test.tsx

### Implementation for User Story 2

- [ ] T024 [P] [US2] Create [Entity] type + rules in src/domain/[entity].ts
- [ ] T025 [US2] Implement [Service] in src/services/[service].ts
- [ ] T026 [US2] Implement use[Feature] hook with full async state coverage in src/features/[feature]/hooks/
- [ ] T027 [US2] Build [Screen] in src/features/[feature]/screens/ with theming + accessibility
- [ ] T028 [US2] Promote any component now used by US1 and US2 into src/components/ (Principle II)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - [Title] (Priority: P3)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 3 (OPTIONAL - only if tests requested) ⚠️

- [ ] T029 [P] [US3] Unit test for [domain rule] in src/domain/__tests__/[name].test.ts
- [ ] T030 [P] [US3] Component test for [screen] in src/features/[feature]/__tests__/[Screen].test.tsx

### Implementation for User Story 3

- [ ] T031 [P] [US3] Create [Entity] type + rules in src/domain/[entity].ts
- [ ] T032 [US3] Implement [Service] in src/services/[service].ts
- [ ] T033 [US3] Build [Screen] + hook in src/features/[feature]/ with full state, theming, accessibility

**Checkpoint**: All user stories should now be independently functional

---

[Add more user story phases as needed, following the same pattern]

---

## Phase N: Compliance Verification & Polish

**Purpose**: Verify constitution compliance across stories and clean up

**⚠️ Note**: Theming, async states, accessibility, and cleanup are NOT polish items —
the constitution treats a feature missing them as incomplete, so they belong in each
story's own tasks. This phase VERIFIES them; it does not introduce them.

### Compliance verification (mandatory)

- [ ] TXXX Audit for hardcoded colors/spacing/radius — zero literals outside `src/theme/` (Principle III)
- [ ] TXXX Verify every screen renders correctly in BOTH light and dark mode (Principle III)
- [ ] TXXX Verify every async path shows loading/success/empty/error/retry; no blank screens (Principle IV)
- [ ] TXXX Screen-reader pass + OS font scaling pass on every new screen (Principle V)
- [ ] TXXX Verify lists are virtualized and scrolling holds 60 FPS on a low-end device (Principle VI)
- [ ] TXXX Verify unmount teardown on every new screen — no leaked listeners, timers, requests, animations (Principle VII)
- [ ] TXXX Confirm no `any`, no magic numbers/strings, no dead code; `npm run lint` and `tsc --noEmit` clean (Principle VIII)
- [ ] TXXX Confirm no secrets in source and no sensitive data in logs (Security Constraints)

### Polish

- [ ] TXXX [P] Documentation updates
- [ ] TXXX Extract any logic duplicated across stories (Principle II)
- [ ] TXXX [P] Additional unit tests (if requested)
- [ ] TXXX Run quickstart.md validation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Domain types and rules before services
- Services before hooks
- Hooks before screens (screens compose, they do not hold business logic)
- Theme tokens exist before any component that consumes them
- A story is not complete until its states, accessibility, and cleanup tasks are done
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (if tests requested):
Task: "Unit test for [domain rule] in src/domain/__tests__/[name].test.ts"
Task: "Component test for [screen] in src/features/[feature]/__tests__/[Screen].test.tsx"

# Launch all domain entities for User Story 1 together:
Task: "Create [Entity1] type + rules in src/domain/[entity1].ts"
Task: "Create [Entity2] type + rules in src/domain/[entity2].ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
