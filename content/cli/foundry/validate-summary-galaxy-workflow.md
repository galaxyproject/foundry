---
type: cli-command
tool: foundry
command: validate-summary-galaxy-workflow
package: "@galaxy-foundry/foundry"
upstream: "https://github.com/galaxyproject/foundry/blob/main/packages/foundry/src/program.ts"
tags:
  - cli-command
  - cli/foundry
status: draft
created: 2026-07-01
revised: 2026-07-01
revision: 1
ai_generated: true
summary: "AJV gate for summarize-galaxy-workflow JSON documents."
related_notes:
  - "[[summary-galaxy-workflow]]"
---

# `foundry validate-summary-galaxy-workflow`

Validate a JSON document against the [[summary-galaxy-workflow]] schema bundled with `@galaxy-foundry/foundry`. The Galaxy workflow summarizer is run by an LLM Mold rather than shipped as a foundry subcommand; this gate exists so [[summarize-galaxy-workflow]] can schema-check its output against a single canonical schema.

## Output

Silent on success (exit `0`). On schema failure, prints AJV diagnostics to stderr and exits `3`. Input errors exit `1`.

## Examples

```bash
foundry validate-summary-galaxy-workflow summary-galaxy-workflow.json
```
