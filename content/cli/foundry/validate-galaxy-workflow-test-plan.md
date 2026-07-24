---
type: cli-command
tool: foundry
command: validate-galaxy-workflow-test-plan
package: "@galaxy-foundry/foundry"
upstream: "https://github.com/galaxyproject/foundry/blob/main/packages/foundry/src/program.ts"
tags:
  - cli/foundry
status: draft
created: 2026-06-16
revised: 2026-06-16
revision: 1
ai_generated: true
summary: "AJV gate for Galaxy workflow test-plan YAML documents."
related_notes:
  - "[[galaxy-workflow-test-plan]]"
---

# `foundry validate-galaxy-workflow-test-plan`

Validate a Galaxy workflow test-plan document against the [[galaxy-workflow-test-plan]] schema bundled with `@galaxy-foundry/foundry`. This is the schema gate the Galaxy test-plan producer Molds ([[nextflow-test-to-galaxy-test-plan]], [[cwl-test-to-galaxy-test-plan]], [[freeform-summary-to-galaxy-test-plan]]) emit against before [[implement-galaxy-workflow-test]] consumes the plan.

## Output

Silent on success (exit `0`). On schema failure, prints AJV diagnostics to stderr and exits `3`. Input errors (missing file, malformed YAML) exit `1`.

## Examples

```bash
foundry validate-galaxy-workflow-test-plan galaxy-test-plan.yml
```

## Gotchas

- The plan artifact is **YAML**, not JSON; the validator parses YAML (a JSON superset, so a `.json` plan also validates). Unlike `validate-tests-format`, there is no `--workflow` cross-check — label reconciliation against the workflow draft is [[implement-galaxy-workflow-test]]'s job.
- The schema requires every top-level key (`plan_version`, `source`, `workflow`, `test_cases`, `unresolved`, `omissions`, `warnings`); empty arrays are valid, but the keys must be present. Record unknowns explicitly (`null`, `label_status: unresolved`, `storage: unresolved`) rather than omitting fields.
