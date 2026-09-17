---
type: cli-command
tool: foundry
command: check-workflow-brief
package: "@galaxy-foundry/gxwf-foundry"
tags:
  - cli/foundry
status: draft
created: 2026-09-17
revised: 2026-09-17
revision: 1
summary: "Check Workflow Brief structure and stop on explicit workflow or agent environment blockers."
---

# `foundry check-workflow-brief`

Read a [[workflow-brief-design]] document and check its structure and declared blockers.

## Output

Exit `0` means structurally valid with no declared blockers. Structural failure exits `3`; a valid brief with nonempty Blockers under Workflow or Agent Environment exits `4`. Input read failures exit `1`.

Without `--json`, ready status prints on stdout; errors and blockers print on stderr. With `--json`, stdout contains `valid`, `ready`, `errors`, and `blockers`. Blockers identify their parent section, heading line, and Markdown body. Input read errors still print on stderr.

## Examples

```sh
foundry check-workflow-brief workflow-brief.md
foundry check-workflow-brief workflow-brief.md --json
```

## Gotchas

- Any content in `### Blockers` blocks work, including “none”. Omit or leave the section empty when there are no blockers. Comments and separators alone are empty.
- The two Blockers sections are scoped to their respective Workflow and Agent Environment parents.
- A clear check establishes document shape and absence of declared blockers. Expert review, semantic completeness, and observed tooling/container availability still need their own checks.
- This command reads the document without editing it.
