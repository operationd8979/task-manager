---
status: done
rev: 2
---
# Theme package 1.0 migration

## Goal

The app declares `@chipmobilesdk/rn-theme` 1.0.0 but is written against 0.2.2, and it no
longer type-checks. Under 0.2.2 the app patched the package's gaps by hand: colours were
pinned over a palette that ignored the brand, app tokens were attached after configuration
and every stylesheet read the theme through a cast. That cast hides the theme from the
Unistyles compiler (verified with its Babel plugin, Unistyles 3.3.0), so styles are at risk
of not following a light/dark switch. After this feature the app runs on 1.0.0's public API
with no hand-made equivalents, takes its colours from the palette 1.0 generates from the
three brand colours, keeps its shape (type, spacing, square corners, heights), and every
screen follows a display mode change immediately.

## User stories

### US-1 Display mode applies everywhere at once (P1)

As a user, I want a change of Sáng / Tối / Tự động in Settings to recolour every screen
immediately, so that I never see a half-themed app or have to restart it.

- AC-1.1 Given the app in light mode on Settings, when the user selects Tối, then Settings
  turns dark at once and, after going back, the timeline (day bar, task rows, clock column,
  empty/error/skeleton states, notices, chips, toasts, ad banner area) and every sheet opened
  afterwards render dark — with no reload.
- AC-1.2 Given dark mode, when the user selects Sáng, then the same surfaces as AC-1.1 turn
  light at once.
- AC-1.3 Given Tự động, when the OS colour scheme changes while the app is in the foreground,
  then every visible screen follows the OS scheme.
- AC-1.4 Given Sáng or Tối is selected, when the OS colour scheme changes later, then the app
  keeps the selected mode.
- AC-1.5 Given dark mode, when navigating between the timeline and Settings, then the area
  behind the sliding screens is the dark background, never a light default.
- AC-1.6 Given a stored Sáng or Tối, when the app cold-starts, then the screens shown after
  settings load use the stored mode (behaviour unchanged from today).

### US-2 The app takes the 1.0 palette and keeps its shape (P1)

As a user, I want the app recoloured consistently from its brand while everything else stays
where I know it, so that the update reads as a refresh rather than a different app.

- AC-2.1 Given light and then dark, when any screen or sheet renders, then every colour is a
  role or tone of the palette 1.0 generates from the three brand colours — no colour is
  pinned over it — while type sizes and weights (11/13/15/20/24 scale, sheet title, clock),
  spacing, square corners and row/bar heights match the current design.
- AC-2.2 Given the OS text size at its maximum, when any screen renders, then text scales up
  to 1.7× and no further, and no text is clipped.
- AC-2.3 Given the timeline scrolling, when clock times of different digits pass (e.g.
  `09:00`, `11:30`), then the clock column does not change width.
- AC-2.4 Given Android, when an icon glyph sits next to a label, then the glyph stays
  vertically centred as today.
- AC-2.5 Given any interactive control, when measured, then its touch target is ≥ 44×44 pt.
- AC-2.6 Given a text input, textarea, unselected chip, segmented control or date-time field,
  when rendered in either theme, then its border is the palette's interactive outline and
  reaches ≥ 3:1 against the background it sits on; dividers between rows use the divider
  role.
- AC-2.7 Given a done or skipped task row, a text input or a toast — areas that are visibly
  set apart from the background today — when rendered in either theme, then they stay
  visibly set apart (a distinct surface tier from the palette).
- AC-2.8 Given an overdue task, the primary filled action and a warning notice, when
  rendered, then all three use the one accent tone, with its text ≥ 4.5:1 on what it sits
  on.

### US-3 Theme contrast is checked automatically (P2)

As the maintainer, I want the package's contrast audit to run against the app's own light
and dark themes, so that a colour change that breaks WCAG AA is caught before it ships.

- AC-3.1 Given the app's configured light and dark themes, when the test suite runs, then the
  contrast audit reports no failures.
- AC-3.2 Given a future colour override that drops a guaranteed pair below target, when the
  test suite runs, then a test fails and names the pair.
- AC-3.3 Given a development or test build, when the theme is configured with an override
  that breaks a guaranteed pair, then configuration fails with an error naming the pair;
  given a release build, then configuration never fails for contrast.
- AC-3.4 Given the text the app draws on a raised surface tier (muted, success and accent
  text on done/skipped rows, inputs and the toast), when the test suite runs, then each pair
  is checked at ≥ 4.5:1 in both themes, including pairs the package does not guarantee.

### US-4 Stylesheets read a typed theme (P2)

As the maintainer, I want every stylesheet to read app tokens directly from a fully typed
theme, so that the style compiler tracks every theme dependency and no cast can drift from
the runtime shape.

- AC-4.1 Given the source tree, when searched, then there is no theme cast helper, no
  `appTheme(` call, no `color.border` read, and no type assertion applied to a theme value.
- AC-4.2 Given the source tree, when `npx tsc --noEmit`, `npm run lint` and `npm test` run,
  then all three pass.
- AC-4.3 Given a token the package now provides (the 12 pt spacing step, the 44 pt touch
  target, Android glyph alignment, tabular numerals, the font-scale ceiling, the scrim colour,
  zero radius, muted text, the display-mode switch, the navigation theme), when the source is
  searched, then the app reads the package's token and keeps no duplicate of its own.
- AC-4.4 Given a muted text, divider or interactive boundary style, when inspected, then it
  uses the readable muted-text role, the divider role and the interactive-outline role
  respectively — never the disabled state colour.

## Requirements

- FR-1 The app uses only the public root API of `@chipmobilesdk/rn-theme` 1.0.0.
- FR-2 Contrast in both themes: text ≥ 4.5:1 and non-text boundaries ≥ 3:1 against the
  surface they sit on (Principle V).
- FR-3 Colour and other visual literals live only in `src/theme/` (Principle III).
- FR-4 Repeated style shapes (flex rows, divider borders, text roles, tone colours) come from
  the package presets where one exists. Mandatory examples: the action row and the notice
  tones.
- FR-5 On completion, `docs/standards.md` names `@chipmobilesdk/rn-theme@1.0.0` as the
  theming source and the Claude Design system is re-synced from it.
- FR-6 The theme configuration overrides no colour. Its only overrides are the square
  corners and the 11/13/15/20/24 type scale; app-only tokens are declared as extensions
  derived from palette roles.
- FR-7 Strict contrast checking is on in development and test builds and off in release
  builds.

## Non-goals

- iOS builds and real-device verification — deferred to the shared iOS production test round
  of all packages. Android emulator only.
- Any redesign beyond the palette change: layout, type, spacing, corners and heights stay.
- Custom fonts, extra named themes, breakpoint changes.
- Changing how the stored display mode is applied at cold start.
- Upgrading any other `@chipmobilesdk/*` package.

## Assumptions

- A-1 (confirmed 2026-10-17) Colours come from the palette 1.0 generates; nothing is pinned
  to the 0.2.2 measured values (FR-6).
- A-2 (confirmed 2026-10-17) The accent group (fill, ink, soft, on-accent) becomes a custom
  tone `accent`; the notice "warning" look uses it (AC-2.8).
- A-3 (confirmed 2026-10-17) Strict contrast mode follows the build: on in development and
  test, off in release (FR-7).
- A-4 Neutral surfaces keep the faint tint of the primary hue that 1.0 generates (no neutral
  seed), as shown when Q1 was answered.
- A-5 Token values with no 1.0 equivalent (sheet title and clock type roles, the 11/13/15/20/24
  type scale, row and bar heights, header icon and chevron sizes, skeleton colours) stay
  app-owned; app colours among them derive from palette roles.
- A-6 The colour tables of `specs/001-timeline-task-manager/design/design-system.md` are marked
  superseded by this feature with a one-line note rather than rewritten; the re-synced Claude
  Design system becomes the visual reference.

## Accepted audit exceptions

None (confirmed 2026-10-17: the generated palette audits clean in both themes).

## Clarifications

- 2026-10-17 Q: Keep the current colours, or adopt the palette 1.0 generates? → A: adopt the
  generated 1.0 palette (Goal, US-2, AC-2.1, FR-6, A-1, A-4, A-6).
- 2026-10-17 Q: Where does the accent group live? → A: custom tone `accent` (AC-2.8, A-2).
- 2026-10-17 Q: Turn on strict contrast checking? → A: `strict` in development and test only
  (AC-3.3, FR-7, A-3).
- 2026-10-17 Q: Interactive control borders reach only 1.34:1 / 1.52:1 today — how to treat
  them? → A: use the generated interactive outline (AC-2.6).

## Changelog

- r1 (2026-10-17): created.
- r2 (2026-10-17): clarified palette, accent, strict mode and control borders — US-2 rewritten
  for the generated palette; added AC-2.6–2.8, AC-3.3, AC-3.4, FR-6, FR-7, A-6; A-1–A-4 updated.
