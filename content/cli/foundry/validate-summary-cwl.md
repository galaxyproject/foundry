---
type: cli-command
tool: foundry
command: validate-summary-cwl
package: "@galaxy-foundry/gxwf-foundry"
tags:
  - cli/foundry
status: draft
created: 2026-05-11
revised: 2026-08-04
revision: 2
summary: "AJV gate for summarize-cwl JSON documents."
related_notes:
  - "[[summary-cwl]]"
---

# `foundry validate-summary-cwl`

Validate a JSON document against the [[summary-cwl]] schema bundled with `@galaxy-foundry/gxwf-foundry`. The cwl summarizer itself is not yet shipped as a foundry subcommand; this gate exists so cwl-summary producers (current and future) can validate against a single canonical schema.

## Output

Prints `<path>: valid` to stdout on success (exit `0`). On schema failure, prints AJV diagnostics to stderr and exits `3`. Input errors exit `1`.

## Examples

```bash
foundry validate-summary-cwl summary.json
```

## Gotchas

- **There is no producer path to prefer.** Its sibling [[foundry validate-summary-nextflow]] documents that `foundry summarize-nextflow` validates by default and should be used instead; no such shortcut exists here, because nothing in `foundry` emits a summary-cwl document. Every producer is hand-written or third-party, and this gate is the only check any of them gets.
- The schema root sets `additionalProperties: false`, so a producer that adds a field it considers harmless fails outright rather than warning. Extend the schema first.
