# changeset-to-galaxy-test-plan eval

Evaluation oracle for the `changeset-to-galaxy-test-plan` Mold. This file is the
**abstract oracle**: properties any emitted Galaxy workflow test plan must
satisfy, independent of which workflow summary and change-set it ran on.
Concrete fixtures and expected values live in `scenarios.md`; the oracle here is
applied to whatever a scenario produces.

## Property: schema-valid test plan

- check: deterministic
- assertion: emits a YAML Galaxy workflow test plan that validates against the [[galaxy-workflow-test-plan]] schema via `foundry validate-galaxy-workflow-test-plan`.

## Property: regression baseline carried forward

- check: llm-judged
- assertion: every existing test case in the summary's `tests[]` survives in the plan as a `derived_from: test-evidence` case, except where a change-set edit intentionally changes that case's output; none is silently dropped. A baseline assertion an edit invalidates is updated or loosened (with a rationale in `omissions[]`), never deleted to force a pass.

## Property: mixed provenance marked honestly

- check: llm-judged
- assertion: the plan sets `source.derived_from: mixed`; carried-forward baseline cases and their assertions read `test-evidence`, while change-set-driven cases/assertions read `evidence: intent` unless the change-set pinned a concrete `expected_value` (then `test-evidence`). Provenance is not flattened to a single basis.

## Property: change coverage without over-reach

- check: llm-judged
- assertion: each change-set edit that alters observable behavior (a changed output, an exposed/added output, a new observable step, a new input) has a corresponding new or updated assertion/case; internal-only edits (`rewire`, `relabel`, `remove-step` with no output change) add no assertions, and no assertions are invented for untouched regions beyond baseline coverage.

## Property: label and fixture status explicit

- check: deterministic
- assertion: baseline bindings carry `label_status: resolved`; change-set-added labels carry `assumed` (or `unresolved`); reused fixtures keep their baseline provenance while a change-set-added input's fixture carries `storage: unresolved` / `location: null` with known provenance recorded, rather than an invented label or URL. Unsettleable additions appear in `unresolved[]` with a `blocking` flag.

## Property: plan-not-final-tests boundary

- check: llm-judged
- assertion: output describes a Galaxy workflow test plan, not concrete `tests-format` details; assertion intent references tests-format assertion families by name and carries provenance for inputs, expected outputs, tolerances, and omissions, so [[implement-galaxy-workflow-test]] can author the final tests after reconciling change-set-added labels against the real draft.
