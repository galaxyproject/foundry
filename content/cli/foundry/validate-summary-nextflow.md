---
type: cli-command
tool: foundry
command: validate-summary-nextflow
package: "@galaxy-foundry/foundry"
upstream: "https://github.com/galaxyproject/foundry/blob/main/packages/foundry/src/program.ts"
tags:
  - cli/foundry
status: draft
created: 2026-05-11
revised: 2026-05-11
revision: 1
ai_generated: true
summary: "AJV gate for summarize-nextflow JSON documents."
related_notes:
  - "[[summary-nextflow]]"
---

# `foundry validate-summary-nextflow`

Validate a JSON document against the [[summary-nextflow]] schema bundled with `@galaxy-foundry/foundry`. Useful when a summary was produced by a non-foundry tool or hand-edited and needs a schema gate before downstream consumption.

## Output

Silent on success (exit `0`). On schema failure, prints AJV diagnostics to stderr and exits `3`. Input errors (missing file, malformed JSON) exit `1`.

## Examples

```bash
foundry validate-summary-nextflow summary.json
```

## Gotchas

- For the producer path (run the summarizer and validate in one shot), use `foundry summarize-nextflow` — validation is on by default there. This subcommand is for after-the-fact validation only.
