---
type: cli-command
tool: foundry
command: validate-summary-galaxy-workflow
package: "@galaxy-foundry/gxwf-foundry"
tags:
  - cli/foundry
status: draft
created: 2026-07-01
revised: 2026-08-04
revision: 2
summary: "AJV gate for summarize-galaxy-workflow JSON documents."
related_notes:
  - "[[summary-galaxy-workflow]]"
---

# `foundry validate-summary-galaxy-workflow`

Validate a JSON document against the [[summary-galaxy-workflow]] schema bundled with `@galaxy-foundry/gxwf-foundry`. The Galaxy workflow summarizer is run by an LLM Mold rather than shipped as a foundry subcommand; this gate exists so [[summarize-galaxy-workflow]] can schema-check its output against a single canonical schema.

## Output

Prints `<path>: valid` to stdout on success (exit `0`). On schema failure, prints AJV diagnostics to stderr and exits `3`. Input errors exit `1`.

## Examples

```bash
foundry validate-summary-galaxy-workflow summary-galaxy-workflow.json
```

## Gotchas

- **Shape is all this checks, and the producer is an LLM.** [[summarize-galaxy-workflow]] writes these documents, so a summary can name steps the workflow does not have, or miss ones it does, and still pass. Exit `0` means safe to parse, never faithful to the workflow.
- The gate cannot substitute for [[gxwf validate]]. That runs against the workflow; this runs against a description of it, and the two disagree exactly when the summary is wrong — the case worth catching.
