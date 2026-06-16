# nextflow-test-to-galaxy-test-plan eval

Evaluation oracle for the `nextflow-test-to-galaxy-test-plan` Mold. This file is
the **abstract oracle**: properties any translated Galaxy workflow test plan must
satisfy, independent of which Nextflow summary it ran on. Concrete fixtures and
their expected values live in `scenarios.md`; the oracle here is applied to
whatever a scenario produces.

## Property: schema-valid translated test plan

- check: deterministic
- assertion: emits a YAML Galaxy workflow test plan that validates against the [[galaxy-workflow-test-plan]] schema via `foundry validate-galaxy-workflow-test-plan`.

## Property: plan-not-final-tests boundary

- check: llm-judged
- assertion: output describes a Galaxy workflow test plan, not concrete test details that belong only in the Galaxy `tests-format` schema. Every test description carries provenance and evidence for its inputs, expected outputs, assertion intent, tolerances, and omissions.

## Property: workflow-aware compatibility

- check: deterministic
- assertion: plan records the workflow labels, collections, and datatypes it depends on when a draft workflow is available, or records unresolved mapping assumptions when evaluating from the Nextflow summary alone.

## Property: implementable assertion intent

- check: deterministic
- assertion: assertion intent is specific enough for [[implement-galaxy-workflow-test]] to materialize Planemo-runnable Galaxy workflow tests without re-reading the original nf-test files.

## Property: nf-test snapshot fidelity

- check: llm-judged
- assertion: translated assertion intent exercises the same output intent using suitable assertion families such as `has_text`, `has_n_lines`, `has_size`, stable-name checks, or documented omissions for intentionally unstable files.
