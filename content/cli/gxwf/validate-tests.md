---
type: cli-command
tool: gxwf
command: validate-tests
package: "@galaxy-tool-util/cli"
upstream: "https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli/spec/gxwf.json"
tags:
  - cli-command
  - cli/gxwf
status: draft
created: 2026-05-03
revised: 2026-05-06
revision: 3
ai_generated: true
summary: "Validate Galaxy workflow test files and optionally cross-check labels against their workflow."
related_notes:
  - "[[tests-format]]"
  - "[[planemo-asserts-idioms]]"
---

# `gxwf validate-tests`

Validate a Galaxy workflow test file (`*-tests.yml` or `*.gxwf-tests.yml`) against the Galaxy tests schema. Optionally cross-check the test file against a workflow so missing input labels, missing output labels, and type mismatches fail before a slow Planemo run.

`<file>` is a workflow test YAML file, usually named `<workflow>-tests.yml` or `<workflow>.gxwf-tests.yml`.

## Output

Default output is human-readable validation diagnostics.

With `--json`, the command emits a structured report describing schema errors and, when `--workflow` is supplied, workflow-coherence errors such as missing labels or incompatible input values.

## Examples

```bash
gxwf validate-tests workflow-tests.yml
gxwf validate-tests workflow-tests.yml --json
gxwf validate-tests workflow-tests.yml --workflow workflow.gxwf.yml --json
```

## Gotchas

- This is the cheap static gate before Planemo. It does not execute the workflow and does not prove assertions pass on real outputs.
- Use `--workflow` whenever the workflow file is available. Schema-valid tests can still reference stale input/output labels after workflow edits.
- Run this before `planemo workflow_test_on_invocation` or full `planemo test`; it catches authoring mistakes without starting Galaxy.
- The assertion vocabulary itself comes from [[tests-format]]; strategy for choosing assertions lives in [[planemo-asserts-idioms]].
