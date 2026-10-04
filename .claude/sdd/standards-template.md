# Engineering standards

<!--
Copy to docs/standards.md and fill in. This is the ONLY project-specific input of the SDD
workflow: the sdd-* skills are generic and read their project rules from here.
Delete sections that do not apply (e.g. ## Design in an API-only repo).
Keep the four ## headings below as named — the skills look them up.
-->

## Project

- **Type**: <web app | API service | mobile app | library | CLI | …>
- **Stack**: derive versions from <package.json | pyproject.toml | go.mod | …>; never pin them here.
- **Layout**: <where code goes and which layer may import which>

## Rules

<!-- Binding MUST statements, grouped by theme. One line of rationale where it helps judgment. -->

### Security

-

### Definition of done

<!-- What every delivered feature must include before it counts as done. -->

-

## Verification

<!-- Commands /sdd-implement runs. Fast checks run per slice; full checks before done. -->

- Fast: `<typecheck>` · `<lint>` · `<unit tests for touched code>`
- Full: `<all of the above>` · `<integration/e2e if any>`

## Design

<!-- UI projects only. Read by /sdd-design; the Design system line is maintained by
/sdd-design-build-system. -->

- **Targets**: <artboard sizes per platform, e.g. desktop 1440 / mobile 390×844> · <light, dark>
- **Theming source**: <package and/or path holding the tokens; its agent skill if one exists>
- **Design system**: none yet — run `/sdd-design-build-system`
- **Every screen design shows**: <states and constraints a design must make visible>
