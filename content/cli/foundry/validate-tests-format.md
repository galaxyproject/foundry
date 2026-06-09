---
type: cli-command
tool: foundry
command: validate-tests-format
package: "@galaxy-foundry/foundry"
upstream: "https://github.com/galaxyproject/foundry/blob/main/packages/foundry/src/program.ts"
tags:
  - cli-command
  - cli/foundry
status: draft
created: 2026-05-11
revised: 2026-05-11
revision: 1
ai_generated: true
summary: "AJV gate for Galaxy workflow tests YAML, with optional workflow cross-check."
related_notes:
  - "[[tests-format]]"
---

# `foundry validate-tests-format`

Validate a Galaxy workflow tests YAML file (`*-tests.yml`, `*.gxwf-tests.yml`) against the [[tests-format]] schema vendored from `@galaxy-tool-util/schema`. Mirrors `gxwf validate-tests` so harnesses that already depend on `@galaxy-foundry/foundry` do not need a separate gxwf install.

## Output

Default output is human-readable diagnostics. `--json` emits a structured report. Schema failure exits `3`; input errors exit `1`.

## Examples

```bash
foundry validate-tests-format workflow-tests.yml
foundry validate-tests-format workflow-tests.yml --workflow workflow.gxwf.yml --json
```

## Gotchas

- Cross-checking against a workflow is opt-in via `--workflow`. Without it, the gate is schema-only and will not catch label drift between tests and workflow.
- Prefer `gxwf validate-tests` when a harness already depends on gxwf; this subcommand exists to keep foundry self-contained.
