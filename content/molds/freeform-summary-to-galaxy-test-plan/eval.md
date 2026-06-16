# freeform-summary-to-galaxy-test-plan eval

Evaluation oracle for the `freeform-summary-to-galaxy-test-plan` Mold. This file
is the **abstract oracle**: properties any synthesized Galaxy workflow test plan
must satisfy, independent of which free-form summary it ran on. Concrete
fixtures and their expected values live in `scenarios.md`; the oracle here is
applied to whatever a scenario produces.

## Property: schema-valid synthesized test plan

- check: deterministic
- assertion: emits a YAML Galaxy workflow test plan that validates against the [[galaxy-workflow-test-plan]] schema via `foundry validate-galaxy-workflow-test-plan`.

## Property: synthesized provenance marked

- check: llm-judged
- assertion: the plan declares `source.derived_from: intent`, and assertions synthesized without upstream test evidence carry `evidence: intent` with honest `confidence`. Concrete expected values from the summary (named tokens, counts, figures) are recorded as `expected_value`, not invented.

## Property: label and fixture assumptions explicit

- check: deterministic
- assertion: workflow-label bindings carry a `label_status` of `assumed` or `unresolved` (with `workflow.label_source: interface-brief`), and fixtures that the summary names only by description carry `storage: unresolved` / `location: null` with the known provenance recorded, rather than invented labels or URLs.

## Property: plan-not-final-tests boundary

- check: llm-judged
- assertion: output describes a Galaxy workflow test plan, not concrete test details that belong only in the Galaxy `tests-format` schema. Assertion intent references tests-format assertion families by name and carries provenance for inputs, expected outputs, tolerances, and omissions.

## Property: implementable assertion intent

- check: deterministic
- assertion: assertion intent is specific enough for [[implement-galaxy-workflow-test]] to materialize Planemo-runnable Galaxy workflow tests after reconciling labels against the real draft, without re-reading the original free-form summary.

## Property: weak outputs handled deliberately

- check: llm-judged
- assertion: weakly assertable outputs are either backed by a stronger promoted checkpoint or recorded in `omissions[]` with a rationale; unresolvable bindings and fixtures appear in `unresolved[]` with a `blocking` flag rather than being silently asserted around.
