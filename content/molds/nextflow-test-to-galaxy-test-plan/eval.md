# nextflow-test-to-galaxy-test-plan eval

## Case: schema-valid translated test plan

- check: deterministic
- fixture: nf-core/bacass or minimal demo Nextflow summary containing nf-test profiles, params, input fixtures, expected outputs, and snapshot evidence.
- expectation: emits a Galaxy workflow test plan that validates against [[galaxy-workflow-test-plan]].

## Case: plan-not-final-tests boundary

- check: llm-judged
- fixture: cast skill output for an nf-core/bacass or minimal demo Nextflow summary.
- expectation: output describes a Galaxy workflow test plan, not concrete test details that belong only in the Galaxy `tests-format` schema. Every test description carries provenance and evidence for its inputs, expected outputs, assertion intent, tolerances, and omissions.

## Case: workflow-aware compatibility

- check: deterministic
- fixture: translated Galaxy workflow test plan plus matching draft Galaxy workflow skeleton when available.
- expectation: plan records the workflow labels, collections, and datatypes it depends on when a draft workflow is available, or records unresolved mapping assumptions when evaluating from the Nextflow summary alone.

## Case: implementable assertion intent

- check: deterministic
- fixture: translated Galaxy workflow test plan for the demo or bacass cast.
- expectation: assertion intent is specific enough for [[implement-galaxy-workflow-test]] to materialize Planemo-runnable Galaxy workflow tests without re-reading the original nf-test files.

## Case: nf-test snapshot fidelity

- check: llm-judged
- fixture: nf-test snapshot evidence covering outputs such as `succeeded_task_count`, `versions.yml`, stable named files, and directory outputs with ignore globs.
- expectation: translated assertion intent exercises the same output intent using suitable assertion families such as `has_text`, `has_n_lines`, `has_size`, stable-name checks, or documented omissions for intentionally unstable files.
