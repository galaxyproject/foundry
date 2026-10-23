---
type: cli-command
tool: foundry
command: validate-test-data-refs
package: "@galaxy-foundry/gxwf-foundry"
tags:
  - cli/foundry
status: draft
created: 2026-10-15
revised: 2026-10-23
revision: 2
summary: "AJV gate for the test-data-refs document the test-data-resolution chain writes."
related_notes:
  - "[[test-data-refs]]"
---

# `foundry validate-test-data-refs`

Validate a `test-data-refs.json` document against the [[test-data-refs]] schema. Every leg of the `test-data-resolution` chain ([[nextflow-to-test-data]], [[cwl-to-test-data]], [[paper-to-test-data]], [[find-test-data]]) runs it before returning, and [[implement-galaxy-workflow-test]] can rely on the shape.

## Output

Prints `<path>: valid` to stdout on success (exit `0`). Schema failure: stderr diagnostics, exit `3`. Input errors exit `1`. With `--schema-sha256 <hex>` it first compares the hash of the schema it carries against `<hex>`, the pin a cast bundle records in `_verify.json`: a mismatch exits `4` without validating, because the validator and the bundle disagree about the contract (see [[schema-packages]]). Given the pin and no artifact, it checks only the pin.

## Examples

```bash
foundry validate-test-data-refs test-data-refs.json
```

## Gotchas

- **A gap is a valid document.** A ref with `resolved: false` and a reason satisfies the schema, so exit `0` means the refs are well-formed, not that every input has data. Decide whether to continue down the chain from `refs[].resolved`, not from the exit code.
