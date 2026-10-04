# Engineering standards

Binding rules for this repository, and the only project-specific input of the SDD workflow
(`/sdd-*` skills). A feature that must deviate from a rule records the deviation and its
justification in its plan's *Standards* section; silence is not an override. Changes to this
file are reviewed like code.

## Project

- **Type**: mobile application, single React Native codebase for iOS and Android.
- **Stack**: derive versions from `package.json` and `tsconfig.json`; never pin them here.
  No `package.json` yet means the app is not created — see `README.md`.
- **Layout** — a file's directory decides what it may import; imports flow
  UI → hooks → domain → data only:

  ```
  src/app/          composition root: providers, navigation
  src/features/<f>/ screens/, components/, hooks/, index.ts (the feature's public API)
  src/components/   shared generic UI, used by 2+ features
  src/theme/        the single source of visual tokens
  src/hooks/  src/services/ (API, storage)  src/domain/ (renderer-free rules)  src/lib/  src/types/
  ```

- **Capabilities bare React Native lacks**, which the rules below require: a navigation
  library (bottom tabs + stack) and platform secure storage. The first feature that needs
  either one adds it and justifies it in its plan.

## Rules

### I. Native mobile experience

- Common tasks complete in 1–2 interactions from their entry point.
- Prefer selection over free text when the domain is enumerable. Predictable fields ship a
  preselected default and restore the user's previous choice where it is reusable.
- Navigate with bottom tabs, stacks, bottom sheets or modals; never more than 3 levels deep.
- Use native patterns where they fit the task: swipe actions, pull to refresh, long press,
  haptics, native date/time pickers, momentum scrolling, sticky headers.
- Primary actions stay visible without scrolling.

### II. Reusable component architecture

- A UI pattern used by 2+ screens lives in `src/components/`. The second copy of any logic is
  extracted, not duplicated.
- Components are small, single-purpose, and render in isolation with only theme and i18n
  providers.
- No business logic in view components — it belongs in hooks, services or domain modules,
  testable without a renderer.

### III. Centralized theming (non-negotiable)

- No hardcoded visual values in components: no hex/`rgba()`/named colours, and no literal
  spacing, type size, radius or elevation. Everything resolves from theme tokens — semantic
  colour, typography, spacing, radius, component tokens.
- Light and dark are both complete; a screen broken in either mode is unfinished.

### IV. Complete async states (non-negotiable)

- Every async operation handles loading, success, empty, error and retry.
- Loading shows a layout-matching skeleton — never a blank screen.
- Empty explains what is missing and offers the action that fixes it.
- Error shows an actionable message with retry — never raw exception text or status codes.
- No silent `catch`: surface the failure to the user or log it.
- Successful mutations confirm explicitly.

### V. Accessibility by default

- Interactive elements expose role and label. Touch targets are ≥ 44×44 pt.
- Layout survives increased OS font scaling; no fixed-height text containers that clip.
- WCAG AA contrast in both themes. State is never conveyed by colour alone.
- With an external keyboard, focus order is logical and every action is reachable.

### VI. Performance on low-end devices

- Lists that can exceed one screen are virtualized. Animations hold 60 FPS and never block
  interaction.
- No synchronous heavy work on the JS thread. Memoize derived values and stabilize callbacks
  in lists and frequently re-rendering components.
- Deduplicate and cache reusable requests. Lazy-load screens and heavy dependencies; justify
  every new dependency's bundle cost in the plan.

### VII. Deterministic lifecycle and state

- On unmount, release everything: listeners, timers, in-flight requests, subscriptions,
  animations, sockets. Camera and microphone are released when the screen loses focus.
- One source of truth per piece of state. State is local by default and lifted only when 2+
  consumers need it. Persisted and shared data is normalized.

### VIII. Type-safe, testable code

- TypeScript `strict`. No `any` — use `unknown` with narrowing. Every suppression comment
  carries its justification.
- No magic numbers or strings (constants or tokens). No dead, commented-out or unused code.
- Names describe intent; folder structure makes a feature's boundary obvious.

### Security

- No secrets in source, committed config or build artifacts — use the environment or secure
  storage. `.env.example` holds empty values only.
- Credentials, tokens, personal, health and payment data never reach logs, analytics or
  crash reports.
- Tokens and sensitive values live in platform secure storage, never plain async storage.
- Client validation is UX only; integrity rules are also enforced server-side.

### Definition of done

- **Every feature**: native UX, consistent theming, reusable components, responsive layout,
  all async states, cleanup on unmount, accessibility. Missing any of these means
  incomplete, not "polish pending".
- **Forms**:
  - validate while typing, with inline field messages;
  - keep entered values across failed validation and navigating away and back;
  - support keyboard next/previous between fields;
  - scroll to the first invalid field on submit;
  - autofocus only an unambiguous next field.
- **Lists**:
  - pull to refresh, skeleton loading, empty state;
  - infinite loading when unbounded;
  - search, filter and sort when longer than one screen;
  - swipe actions where a per-item action makes sense.

## Verification

Confirm the exact script names in `package.json` once the app exists.

- Fast (per slice): `npx tsc --noEmit` · `npm run lint` · `npm test -- <touched paths>`
- Full (before done): `npx tsc --noEmit` · `npm run lint` · `npm test`
- Type check and lint must pass; a failing check is never waived to ship.

## Design

- **Targets**: phone artboards 390×844 (iOS and Android) · light and dark
- **Theming source**: `@chipmobilesdk/rn-theme` (agent skill `sdk-rn-theme`); app config in `src/theme/`
- **Design system**: none yet — run `/sdd-design-build-system`
- **Every screen design shows**:
  - light and dark;
  - for async content: skeleton loading, empty, error with retry, and success confirmation;
  - the primary action without scrolling;
  - touch targets ≥ 44×44 pt;
  - no state carried by colour alone;
  - navigation depth ≤ 3.
