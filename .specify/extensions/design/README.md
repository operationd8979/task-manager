# Design extension

Inserts a traceable UX/UI design phase between `/speckit-specify` and `/speckit-plan`.

```
specify → clarify → [ design.brief → « design externally » → design.import → design.check ] → plan → tasks → implement
                                                                                    └── gate ──┘
```

## Why three commands and not one

The phase contains a human checkpoint that cannot be automated: someone has to actually
design. A single command would have to block across that boundary. Splitting at the
boundary also makes each half independently re-runnable, which is what you want in
practice — the brief is regenerated when the spec changes, the import is re-run when the
design changes, and the check is re-run after every fix until it comes back clean.

| Command | Writes | Re-run when |
|---|---|---|
| `/speckit-design-brief` | `brief.md`, `manifest.json` | The spec changed |
| `/speckit-design-import` | design artifacts, `traceability.md`, `manifest.json` | The design changed |
| `/speckit-design-check` | nothing (read-only) | After any fix, until READY |

## Provider support

`source.provider` in `design-config.yml`:

- **`claude-design`** — artifacts are pulled directly from a claude.ai/design project via
  the `DesignSync` tool. No export step, no copy-paste, no manual file handling.
- **`figma`** — same shape, via an available Figma MCP tool.
- **`manual`** — the user drops exported files into `<feature>/design/source/`.

Only the outbound direction stays manual: the brief has to be pasted into the design tool
by a human, because that tool is driven from a browser, not from this repo.

## How traceability is enforced

Three mechanisms, none of which rely on anyone remembering:

1. **Citation over copying.** Design artifacts reference `FR-###` / `US-#` / `SC-###`.
   The one place restating requirement text is correct is `brief.md`, which is generated,
   marked do-not-edit, and regenerated whenever the spec changes.
2. **A generated traceability matrix.** Every requirement appears with either a design
   surface or a stated reason for having none. Blank is not an allowed answer.
3. **Hash-based staleness.** `manifest.json` records the spec hash at brief time and at
   import time, plus a hash per artifact. `check-design-prerequisites.ps1` recomputes them,
   so a spec edited after the design, or an imported artifact edited by hand, is detected
   mechanically rather than noticed by luck.

## Nothing here is project-specific

The artifact file names, the identifier prefixes, the token package, and the constitution
gates to verify all come from `design-config.yml`. A project with different design
vocabulary edits that file; the skills and templates are unchanged. `design_system.package`
empty means the design defines and documents its own token set.

## Files

```
.specify/extensions/design/
  extension.yml            manifest: commands, templates, hooks
  design-config.yml        this project's configuration
  config-template.yml      documented defaults for a new project
  commands/                portable copies of the three commands
  templates/               brief, artifact structure, traceability matrix
.specify/scripts/powershell/
  check-design-prerequisites.ps1   paths, artifact inventory, staleness hashes
.claude/skills/speckit-design-{brief,import,check}/SKILL.md   materialized for Claude
```

`commands/*.md` are the portable source; `.claude/skills/*/SKILL.md` are what the Claude
integration actually loads. They are byte-identical copies — re-copy after editing either
side, the same way spec-kit materializes core commands per integration.

## Hooks

Registered in `.specify/extensions.yml`, both `optional: true` so they prompt rather than
take over:

- `after_clarify` → offers `/speckit-design-brief` once requirements are stable
- `before_plan` → offers `/speckit-design-check` as the gate into planning

A feature with no interface skips both by declining the prompt.
