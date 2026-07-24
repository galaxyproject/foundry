---
type: cli-command
tool: gxwf
command: validate
package: "@galaxy-tool-util/cli"
upstream: "https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli/spec/gxwf.json"
tags:
  - cli/gxwf
status: draft
created: 2026-05-02
revised: 2026-05-06
revision: 3
ai_generated: true
summary: "Validate Galaxy workflow structure, tool state, and optional connection compatibility before runtime execution."
---

# `gxwf validate`

Validate a Galaxy workflow source file before attempting runtime execution. Use this as the design-time guardrail after step implementation and again after final workflow assembly.

## Output

Default output is human-readable diagnostics. JSON output should be treated as the preferred cast-skill interface; free-text diagnostics are a fallback for humans.

## Examples

```bash
gxwf validate workflow.ga
gxwf validate workflow.gxwf.yml --json
gxwf validate workflow.gxwf.yml --json --connections --strict
gxwf validate workflow.ga --mode json-schema --tool-schema-dir ./tool-schemas --json
```

## Gotchas

- Validation is design-time structure checking. It does not prove that a workflow test will pass under Planemo.
- Run after each generated Galaxy step when the harness can still attribute failures to the fresh step.
- Run again after assembly to catch cross-step or workflow-level issues before runtime testing.
- Prefer `--json` whenever a cast skill or harness needs to classify diagnostics.
- Use `--connections` when tool cache metadata is available and data-shape compatibility matters, especially around collections and map-over.
- `--no-tool-state` weakens validation. If used, record why tool metadata was unavailable and rerun without it before final runtime testing.
