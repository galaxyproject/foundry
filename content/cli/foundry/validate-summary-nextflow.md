---
type: cli-command
tool: foundry
command: validate-summary-nextflow
package: "@galaxy-foundry/gxwf-foundry"
tags:
  - cli/foundry
status: draft
created: 2026-05-11
revised: 2026-10-23
revision: 3
summary: "AJV gate for summarize-nextflow JSON documents."
related_notes:
  - "[[summary-nextflow]]"
---

# `foundry validate-summary-nextflow`

Validate a JSON document against the [[summary-nextflow]] schema bundled with `@galaxy-foundry/gxwf-foundry`. Useful when a summary was produced by a non-foundry tool or hand-edited and needs a schema gate before downstream consumption.

## Output

Prints `<path>: valid` to stdout on success (exit `0`). On schema failure, prints AJV diagnostics to stderr and exits `3`. Input errors (missing file, malformed JSON) exit `1`. With `--schema-sha256 <hex>` it first compares the hash of the schema it carries against `<hex>`, the pin a cast bundle records in `_verify.json`: a mismatch exits `4` without validating, because the validator and the bundle disagree about the contract (see [[schema-packages]]). Given the pin and no artifact, it checks only the pin.

## Examples

```bash
foundry validate-summary-nextflow summary.json
```

## Gotchas

- For the producer path (run the summarizer and validate in one shot), use `foundry summarize-nextflow` — validation is on by default there. This subcommand is for after-the-fact validation only.
