---
type: cli-command
tool: foundry
command: validate-workflow-brief
package: "@galaxy-foundry/gxwf-foundry"
tags:
  - cli/foundry
status: draft
created: 2026-09-17
revised: 2026-09-17
revision: 3
summary: "Validate the title and required sections of a Markdown Workflow Brief."
---

# `foundry validate-workflow-brief`

Validate a Markdown document against the section contract described in [[workflow-brief-design]].

## Output

Prints `<path>: valid` to stdout on success (exit `0`). Missing, duplicate, or empty required sections produce diagnostics on stderr and exit `3`. Input read failures exit `1`.

## Examples

```sh
foundry validate-workflow-brief workflow-brief.md
```

## Gotchas

- This checks the document title, required sections, their content, and parent-scoped subsections. It does not verify semantic completeness, expert approval, or environment readiness.
- Headings inside code fences, block quotes, and HTML comments do not satisfy section requirements.
- A valid brief may contain blockers. Use `foundry check-workflow-brief` to stop on workflow or environment blockers.
- Additional sections, prose, tables, and explicit unknowns are allowed. Heading case and section order are flexible.
