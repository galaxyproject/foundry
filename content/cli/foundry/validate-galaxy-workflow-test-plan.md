---
type: cli-command
tool: foundry
command: validate-galaxy-workflow-test-plan
package: "@galaxy-foundry/gxwf-foundry"
tags:
  - cli/foundry
status: draft
created: 2026-06-16
revised: 2026-10-23
revision: 5
summary: "AJV gate for Galaxy workflow test-plan YAML documents."
related_notes:
  - "[[galaxy-workflow-test-plan]]"
---

# `foundry validate-galaxy-workflow-test-plan`

Validate a Galaxy workflow test-plan document against the [[galaxy-workflow-test-plan]] schema bundled with `@galaxy-foundry/gxwf-foundry`. This is the schema gate the Galaxy test-plan producer Molds ([[nextflow-test-to-galaxy-test-plan]], [[cwl-test-to-galaxy-test-plan]], [[freeform-summary-to-galaxy-test-plan]], [[workflow-brief-to-galaxy-test-plan]]) emit against before [[implement-galaxy-workflow-test]] consumes the plan.

## Output

Prints `<path>: valid` to stdout on success (exit `0`). On schema failure, prints AJV diagnostics to stderr and exits `3`. Input errors (missing file, malformed YAML) exit `1`. With `--schema-sha256 <hex>` it first compares the hash of the schema it carries against `<hex>`, the pin a cast bundle records in `_verify.json`: a mismatch exits `4` without validating, because the validator and the bundle disagree about the contract (see [[schema-packages]]). Given the pin and no artifact, it checks only the pin.

## Examples

```bash
foundry validate-galaxy-workflow-test-plan galaxy-test-plan.yml
```

## Gotchas

- The plan artifact is **YAML**, not JSON; the validator parses YAML (a JSON superset, so a `.json` plan also validates). Unlike `validate-tests-format`, there is no `--workflow` cross-check — label reconciliation against the workflow draft is [[implement-galaxy-workflow-test]]'s job.
- The schema requires every top-level key (`plan_version`, `source`, `workflow`, `test_cases`, `unresolved`, `omissions`, `warnings`); empty arrays are valid, but the keys must be present. Record unknowns explicitly (`null`, `label_status: unresolved`, `storage: unresolved`) rather than omitting fields.
