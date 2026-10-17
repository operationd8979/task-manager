---
rev: 1
spec_rev: 2
design_rev: none
---
# Plan: Theme package 1.0 migration

## Context

- **Stack**: React Native 0.86.2, React 19.2.3, TypeScript strict, `react-native-unistyles`
  ^3.3.0 with its Babel plugin (`root: 'src'`), `@react-navigation/native` ^7.3.14 (native
  stack). `@chipmobilesdk/rn-theme` 1.0.0 is installed and its skill is synced at 1.0.0.
- **Baseline**: `npx tsc --noEmit` reports 305 errors, all from the 0.2.x API.
- **Theme layer today** ([src/theme/](../../src/theme/)): `setup.ts` spreads `appColor`,
  `appSpacing`, `appType` onto the built themes; `theme.ts` exports the `appTheme()` cast;
  `tokens.ts` holds the pinned 0.2.2 colours plus self-made `APP_SPACING.gap12`,
  `TAP_TARGET_MIN`, `GLYPH_ALIGN`, `MAX_FONT_SCALE`, `ZERO_RADIUS`, `TYPE_OVERRIDE`;
  `mode.ts` orders `setAdaptiveThemes`/`setTheme` by hand;
  [src/types/unistyles.d.ts](../../src/types/unistyles.d.ts) augments the package's
  `StyleTheme`.
- **Consumers**: 27 files call `appTheme(` (25 stylesheets, plus `useUnistyles` in
  `Chevron`, `Sheet`, `Skeleton`). [Text.tsx](../../src/components/Text.tsx) reads
  `MAX_FONT_SCALE`. `NavigationContainer` in [App.tsx](../../src/app/App.tsx) has no theme.
- **Bug evidence** (Babel transform of the project config): `Notice.tsx` today records only
  `uni__dependencies:[4]` (variants) per style — never `0` (theme). Written as
  `StyleSheet.create(theme => …)` with `byTone` the same styles record `[0]` and `[0,4]`.
- **Colour roles in use**: `onBackground` 42, `color.border` 19 (12 dividers, 7 interactive
  boundaries), `background` 12, `disabled` 10 (readable text and skipped-state marks),
  `surface` 9, `success` 8, `onSurface` 5, `error` 4 (overdue), `primary` 1; `appColor`
  accent group ~73, `textMuted` 26, `skeletonFrom` 2, `scrim` 1. `lineStrong` and
  `skeletonTo` are unused.
- **1.0 palette for the brand** (probe): light background `#FFF8F6`, `surfaceContainerHigh`
  `#F3E5E3`, `outline` `#85736F`, `outlineVariant` `#D8C2BD`; dark background `#181211`,
  `surfaceContainerHigh` `#2F2827`. `auditTheme` returns `[]` for both.
- **Tests**: [jest.setup.js](../../jest.setup.js) mocks `react-native-unistyles` with a
  hand-assembled theme from `tokens.ts`; component tests mount `Chip`, `TaskRow`,
  `BannerSlot`, `RemoveAdsSection`, `PrivacyPolicyRow`.
- **Device**: Android AVD `Pixel_3a_API_36_extension_level_17_x86_64` is available.
- **Design**: none. The visual reference is the Claude Design system, re-synced in SL-5.

## Approach

The theme becomes one typed config passed to `createUnistylesConfig`, and the app augments
Unistyles from `typeof config.themes`, so `theme` in every stylesheet is fully typed and no
cast is needed. Colours come from the generated palette; app colour tokens either map to a
1.0 role or tone, or are declared in `extend` derived from roles. Every stylesheet is
rewritten as `StyleSheet.create(theme => ({…}))` using package tokens and presets. Runtime
mode switching and the navigation theme use the package helpers. Tests run against the real
built themes, audit them, and assert that the Babel plugin records the theme dependency in
every themed stylesheet.

- D-1 The config object lives in a module free of Unistyles (`src/theme/config.ts`,
  `satisfies ThemeConfig`); `setup.ts` passes it to `createUnistylesConfig` and the Jest mock
  passes it to `buildThemes` — over keeping it inline in `setup.ts`, because the Jest mock of
  `react-native-unistyles` cannot require a module that imports `react-native-unistyles`.
- D-2 Colour mapping from 0.2.x usage:

  | 0.2.x | 1.0 |
  |---|---|
  | `color.border` as divider | `theme.border.top/bottom` preset or `color.outlineVariant` |
  | `color.border` on inputs, textarea, chip, segmented, date-time field | `color.outline` |
  | `color.surface` (inputs, done/skipped/dragging rows, toast, boxes) | `color.surfaceContainerHigh` |
  | `color.disabled` / `appColor.textMuted` as text | `color.onSurfaceVariant` or `theme.text.*Muted` |
  | `color.disabled` as the skipped dot/ring | `color.outline` (non-text ≥ 3:1) |
  | `color.error` (overdue), `appColor.accentInk` on background | `tone.accent.fg` |
  | `appColor.accentFill` / `onAccent` | `tone.accent.fill` / `tone.accent.onFill` |
  | `appColor.accentSoft` / `accentInk` on it | `tone.accent.container` / `tone.accent.onContainer` |
  | `appColor.scrim` | `color.scrim` |
  | `appColor.skeletonFrom` | `appColor.skeleton` (extend: `surfaceContainerHigh`) |
  | `lineStrong`, `skeletonTo` | removed (unused) |

  `surfaceContainerHigh` over `surface`, because 1.0's `surface` equals `background` and the
  raised areas of AC-2.7 would vanish.
- D-3 The accent tone is seeded from the brand primary (`tones: { accent: BRAND_COLORS.primary }`)
  — over a separate accent hex, because the design's accent *is* the brand primary; a future
  divergence changes one line.
- D-4 Notice keeps its public `tone: 'warning' | 'neutral'` and maps it to the `accent` /
  `neutral` tone variants internally — over renaming the prop, because "warning" names the
  caller's intent, not a colour.
- D-5 `DisplayMode` keeps its stored value `'auto'`; a one-line `toThemeMode()` maps it to
  `applyThemeMode('system')` — over renaming the persisted value, which would need a
  settings migration for no user benefit.
- D-6 The navigation theme comes from a `ThemedNavigationContainer` that reads `useUnistyles()`
  and passes `toNavigationTheme(theme, rt.themeName)` — over calling the hook in `App`, which
  would re-render the whole provider tree on every theme change.
- D-7 `Text` reads `theme.maxFontScale` through `useUnistyles()` — over a module-scope
  constant, which would keep an app-owned duplicate (AC-4.3); the hook re-renders only on a
  theme change, which the user initiates.
- D-8 Literal `fontWeight` in stylesheets becomes `...theme.font.<weight>` (package rule; a
  literal breaks custom fonts on Android). The `TYPE_OVERRIDE` typography override keeps its
  weights, since overrides cannot read the theme.
- D-9 The "plugin records the theme dependency" check is a Jest test that Babel-transforms
  every `src` file calling `StyleSheet.create` with the project config — over a manual device
  check alone, because a re-introduced cast would otherwise pass every other check silently.

## Changes

- `src/theme/config.ts` — add: the single `ThemeConfig` — brand, typography (System font,
  `maxFontScale: 1.7`), `tones.accent`, `extend` (`appColor.skeleton`, `appType.sheetTitle`,
  `appType.clock` with `presets.tabularNums` and `theme.font.heavy`), overrides (radius 0,
  11/13/15/20/24 type scale), `strict: __DEV__`.
- `src/theme/setup.ts` — change: `createUnistylesConfig(themeConfig, { adaptiveThemes: true })`,
  augment `UnistylesThemes`/`UnistylesBreakpoints` from `typeof`, `StyleSheet.configure`.
- `src/theme/theme.ts`, `src/types/unistyles.d.ts` — remove.
- `src/theme/tokens.ts` — change: keep only tokens 1.0 lacks (`TYPE_OVERRIDE`, `ROW_MIN_HEIGHT`,
  `BAR_HEIGHT`, `DAY_ICON_SIZE`, `NAV_CHEVRON_SIZE`, `SHEET_CHEVRON_SIZE`,
  `LIST_BOTTOM_PADDING`); drop colours, `APP_SPACING`, `APP_TYPE`, `TAP_TARGET_MIN`,
  `GLYPH_ALIGN`, `MAX_FONT_SCALE`, `ZERO_RADIUS`.
- `src/theme/brand.ts` — change: comments to 1.0 semantics (tone-mapped roles); values kept.
- `src/theme/mode.ts` — change: only `toThemeMode(DisplayMode): ThemeMode`.
- `src/theme/__tests__/theme.test.ts` — add: audit `[]` both themes; app pairs on
  `surfaceContainerHigh` ≥ 4.5:1; strict override throws `ThemeContrastError`.
- `src/theme/__tests__/styleDependencies.test.ts` — add: D-9.
- `jest.setup.js` — change: mock themes from `buildThemes(themeConfig)`; `useUnistyles`
  also returns `rt.themeName`.
- `src/app/App.tsx`, `src/features/settings/screens/SettingsScreen.tsx` — change:
  `applyThemeMode(toThemeMode(mode))`; App uses `ThemedNavigationContainer`.
- `src/app/navigation/ThemedNavigationContainer.tsx` — add: D-6.
- `src/components/Text.tsx` — change: D-7.
- `src/components/*.tsx` (ActionRow, Chevron, Chip, EmptyState, ErrorState, Notice,
  Segmented, Sheet, Skeleton, Toast) — change: direct typed theme, D-2 roles, presets;
  ActionRow row and Notice `toneText` per FR-4.
- `src/features/**` (BannerSlot, RemoveAdsSection, RemoveAdsSheet, SettingsScreen,
  DateTimeField, DeleteSeriesSheet, Field, RecurrenceSheet, RowActionsSheet, ScopeSheet,
  TimeShiftSheet, TaskFormSheet, DatePickerSheet, DayBar, TaskRow, TimelineScreen) — change:
  same as above.
- `docs/standards.md` — change: *Theming source* and *Design system* lines (SL-5).
- `specs/001-timeline-task-manager/design/design-system.md` — change: one-line superseded
  note on the colour tables (A-6).

## Standards

- **III Centralized theming**: no colour literal leaves `src/theme/`; the config's only
  literals are the three brand colours. Light and dark are checked on the emulator (SL-2, SL-4).
- **V Accessibility**: AA is enforced by `auditTheme` plus app-specific pairs (US-3); touch
  targets use `size.touchTarget`; interactive borders move to `outline` ≥ 3:1 (AC-2.6).
- **VI Performance**: one `useUnistyles` subscription per `Text` (D-7) and one for the
  navigation container (D-6); styles otherwise update natively without re-render.
- **VIII Type-safe**: no cast on the theme; `satisfies` keeps the config's inferred types.

## Slices

- [x] SL-1 Theme config on 1.0 with audited, real themes in tests — covers AC-3.1, AC-3.2,
  AC-3.3, AC-3.4, FR-1, FR-6, FR-7 — verify: `npx jest src/theme` green; `npx tsc --noEmit`
  reports no error in `src/theme/` or `jest.setup.js`.
- [x] SL-2 Runtime: mode switch, navigation theme, font-scale ceiling, hook-based colours
  (Chevron, Sheet scrim, Skeleton) — covers AC-1.3, AC-1.4, AC-1.5, AC-1.6, AC-2.2 — verify:
  tsc shows no error in the touched files; emulator: Tự động follows an OS scheme change,
  Tối survives one; no light flash during the Settings slide in dark.
- [x] SL-3 Shared components (`src/components`, App boot style) on the typed theme, presets
  and D-2 roles; ActionRow and Notice per FR-4; plugin dependency test — covers AC-2.4,
  AC-2.5, AC-2.6, AC-2.8, AC-4.4, FR-3, FR-4 — verify: `npx jest src/components src/theme`
  green, including D-9 for every file in `src/components`.
- [x] SL-4 Feature stylesheets on the typed theme — covers AC-1.1, AC-1.2, AC-2.1, AC-2.3,
  AC-2.7, AC-4.1, AC-4.2, AC-4.3, FR-2 — verify: full `npx tsc --noEmit`, `npm run lint`,
  `npm test` green; `git grep -nE "appTheme\(|color\.border|as (AppTheme|StyleTheme)"`
  empty; emulator: switch Sáng ↔ Tối in Settings, go back — timeline, open each sheet, every
  surface follows at once in both directions.
- [ ] SL-5 Records — covers FR-5, A-6 — verify: `docs/standards.md` names
  `@chipmobilesdk/rn-theme@1.0.0`; `/sdd-design-build-system` re-synced and its link
  recorded; 001 design-system note present.

## Verification

- Fast: `npx tsc --noEmit` · `npm run lint` · `npm test -- <touched paths>`
- Full: `npx tsc --noEmit` · `npm run lint` · `npm test`
- Evidence (2026-10-17; Android emulator Pixel 3a API 36, debug build + Metro):
  - AC-1.1 — emulator: Settings light → Dark recoloured Settings within 1 s; back to timeline
    dark; new-task sheet opened afterwards dark. Every other sheet: `styleDependencies.test.ts`
    (theme dependency recorded for each themed style, 26 files) ✓
  - AC-1.2 — emulator: Dark → Light, Settings and timeline light at once ✓
  - AC-1.3 — emulator: Automatic with `cmd uimode night yes/no`, app follows both ways ✓
  - AC-1.4 — emulator: Light selected, OS night yes → app stays light ✓
  - AC-1.5 — emulator: screen recording of the dark back-slide, 20 fps frames show no light
    background behind the sliding screens ✓
  - AC-1.6 — `App.tsx` applies `applyThemeMode(toThemeMode(stored))` after settings load,
    same point as before; code review ✓ (cold start with a stored mode not re-run on device)
  - AC-2.1 — no colour override in `config.ts` (FR-6); type scale, spacing, radius 0 and heights
    unchanged in `tokens.ts`/overrides; emulator screenshots light and dark ✓
  - AC-2.2 — `Text` passes `theme.maxFontScale` (1.7, `buildThemes` probe) ✓
  - AC-2.3 — `appType.clock` spreads `presets.tabularNums` (`fontVariant: ['tabular-nums']`) ✓
  - AC-2.4 — glyph styles spread `presets.glyphAlign` (same two properties as before) ✓
  - AC-2.5 — touch targets from `size.touchTarget` / `box.touchTarget` (44) ✓
  - AC-2.6 — inputs, textarea, chip, segmented, date-time field use `color.outline`;
    `auditTheme` guarantees outline ≥ 3:1 on background/surface; emulator shows them ✓
  - AC-2.7 — done row on `surfaceContainerHigh` distinct in both themes (emulator); inputs and
    toast on the same tier ✓
  - AC-2.8 — overdue, primary fill and warning notice read `tone.accent`; `theme.test.ts`
    checks `tone.accent.fg` ≥ 4.5:1 on the raised tier; audit covers the rest ✓
  - AC-3.1, AC-3.2 — `theme.test.ts` "passes the package contrast audit" (light, dark) ✓
  - AC-3.3 — `theme.test.ts` "contrast enforcement" (strict throws; strict off never throws) ✓
  - AC-3.4 — `theme.test.ts` "keeps … readable on the raised surface" (5 pairs × 2 themes) ✓
  - AC-4.1 — `git grep` for `appTheme(`, `color.border`, theme casts: empty ✓
  - AC-4.2 — `npx tsc --noEmit` 0 errors (from 305), `npm run lint` clean, `npm test`
    40 suites / 380 tests ✓
  - AC-4.3 — `git grep` for the removed self-made tokens and `setAdaptiveThemes`: empty in
    `src` ✓
  - AC-4.4 — muted text on `onSurfaceVariant`/`text.*Muted`, dividers on `border.*`/
    `outlineVariant`, controls on `outline`; `color.disabled` remains only on the inactive
    purchase button outline ✓
  - FR-1 — imports only from `@chipmobilesdk/rn-theme` root ✓ · FR-2 — US-3 tests ✓ ·
    FR-3 — no colour literal outside `src/theme/` (`git grep`) ✓ · FR-4 — ActionRow and Notice
    as required, presets across all stylesheets ✓ · FR-6 — `config.ts` overrides radius and
    typography only ✓ · FR-7 — `strict: __DEV__` ✓ · FR-5 — see SL-5

## Notes

- SL-1: a bare `satisfies ThemeConfig` loses custom tone names once `extend` is present
  (`extend`'s parameter is contextually typed with no tones, so TypeScript infers none);
  `satisfies ThemeConfig<object, keyof typeof APP_TONES>` keeps them. Not in the package
  README — worth reporting upstream.
- SL-3: the Unistyles Babel plugin is a no-op when `NODE_ENV=test`, so D-9 compiles in a child
  process with `NODE_ENV=development`; the test also asserts the plugin was active.
- SL-2/SL-4: `SettingsScreen` reads `size.touchTarget` through `useUnistyles()` for its loading
  skeleton heights (the only token used outside a stylesheet).
- SL-5 (open): `docs/standards.md` *Theming source* updated; 001 design-system note added.
  The design-system re-sync is written (tokens.json: 98 colours × 2 themes, 28 type styles;
  README; cover rebound to 1.0 names) but its publish is blocked: the session's Read
  permission rule refuses `tokens.json` as a source file. *Design system* line waits for it.
- Seen on the emulator, out of scope, not caused by this migration as far as checked:
  - Android renders `fontWeight: '600'` with `fontFamily: 'System'` as regular. 0.2.2 also put
    `fontFamily: 'System'` in every typography token (checked in its tarball), so this predates
    1.0. 1.0's per-weight Android font map (`typography.fonts`) can fix it; it is a visual
    change for its own decision.
  - Status-bar icons stay light on light screens; the app sets no status-bar style (unchanged
    code).
  - The task form's Date field wraps `2026-10-17` onto two lines at 393 dp width. Its style
    values are unchanged; not compared against a 0.2.2 build.

## Changelog

- r1 (2026-10-17): created from spec r2, no design.
