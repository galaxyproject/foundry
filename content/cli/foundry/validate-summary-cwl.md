---
type: cli-command
tool: foundry
command: validate-summary-cwl
package: "@galaxy-foundry/foundry"
upstream: "https://github.com/galaxyproject/foundry/blob/main/packages/foundry/src/program.ts"
tags:
  - cli/foundry
status: draft
created: 2026-05-11
revised: 2026-05-11
revision: 1
ai_generated: true
summary: "AJV gate for summarize-cwl JSON documents."
related_notes:
  - "[[summary-cwl]]"
---

# `foundry validate-summary-cwl`

Validate a JSON document against the [[summary-cwl]] schema bundled with `@galaxy-foundry/foundry`. The cwl summarizer itself is not yet shipped as a foundry subcommand; this gate exists so cwl-summary producers (current and future) can validate against a single canonical schema.

## Output

Silent on success (exit `0`). On schema failure, prints AJV diagnostics to stderr and exits `3`. Input errors exit `1`.

## Examples

```bash
foundry validate-summary-cwl summary.json
```
