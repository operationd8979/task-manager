---
name: sdd-design-build-system
description: "Build or re-sync the project's Claude Design system from its theming source (a theming package or theme code), then record it in docs/standards.md so /sdd-design uses it. Re-run after the theme changes; pass an existing design-system link to adopt it instead."
argument-hint: "[theming package | theme path | claude.ai design-system link]"
---

## Input

```text
$ARGUMENTS
```

Read `.claude/sdd/conventions.md` and the `## Design` section of `docs/standards.md`.

## 1. Resolve the source

- Argument is a claude.ai design-system link → **adopt** it: read its `project/README.md`
  to confirm it is a design system, then go to step 4.
- Argument names a package or path → that is the theming source.
- Otherwise use the *Theming source* line in `## Design`.
- Otherwise look: a theming or token dependency in the manifest, theme/token files in the
  repo. Several candidates → ask. None → stop and ask for the source.

## 2. Learn the tokens — exact values only

- Theming library ships an agent skill → invoke it to learn the token model: names,
  themes, how values are derived. Do not reverse-engineer library internals.
- Take values from where this project configures the theme: brand inputs, overrides,
  custom tokens.
- Values the library *derives* (generated palettes, computed scales): obtain the resolved
  output, e.g. by running the library on the project's config in a scratch script. If that
  is impossible, mark the token unresolved — never estimate a value.
- Inventory: colour roles per theme, type scale and fonts, spacing, radius, elevation.
  Shared UI components only if the user asks for them.
- Note the source version (package version or commit) for the record.

## 3. Build or re-sync

- Call the Artifact tool with `action: "quickstart"` and `intent: "other"`, then use the
  **Design System** type it lists. Follow that type's instructions and its `from-code`
  reference for every file and format rule — they are authoritative.
- `## Design` already records a system → re-sync **that** system file by file, per the
  type's revising rules. Keep its link and keep edits people made there.
- Otherwise create one titled `<project name> design system`.
- Keep the theming library's own token names, so a design maps 1:1 to code.
- The README states how tokens reach code (where they are defined, how components consume
  them) and usage rules that name tokens.
- Check text/background contrast in every theme. Keep a failing pair the source defines, but
  flag it.

## 4. Record

Update only these two lines under `## Design` in `docs/standards.md`, adding them if missing:

```
- **Theming source**: <package@version and/or path>
- **Design system**: <link> — built from <source>@<version> on <YYYY-MM-DD>
```

`/sdd-design` reads this line, so no skill needs changing when the theming library changes.
Existing canvases keep their old tokens until they are next revised.

## 5. Report

Link, source and version, token counts per family, unresolved or left-out items, flagged
contrast pairs, assumptions.
