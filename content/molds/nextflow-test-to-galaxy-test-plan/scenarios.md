# nextflow-test-to-galaxy-test-plan scenarios

Concrete cases for `nextflow-test-to-galaxy-test-plan`, exercised against the
abstract properties in `eval.md`. Each case binds a fixture and states its
expected values; the `eval.md` oracle is applied to whatever the case produces.

## Case: schema-valid translated test plan

- fixture: nf-core/bacass or minimal demo Nextflow summary containing nf-test profiles, params, input fixtures, expected outputs, and snapshot evidence.
- expect: emits a Galaxy workflow test plan that validates against the handoff schema selected for Galaxy workflow tests.

## Case: plan-not-final-tests boundary

- fixture: cast skill output for an nf-core/bacass or minimal demo Nextflow summary.
- expect: output describes a Galaxy workflow test plan, not concrete test details that belong only in the Galaxy `tests-format` schema. Every test description carries provenance and evidence for its inputs, expected outputs, assertion intent, tolerances, and omissions.

## Case: workflow-aware compatibility

- fixture: translated Galaxy workflow test plan plus matching draft Galaxy workflow skeleton when available.
- expect: plan records the workflow labels, collections, and datatypes it depends on when a draft workflow is available, or records unresolved mapping assumptions when evaluating from the Nextflow summary alone.

## Case: implementable assertion intent

- fixture: translated Galaxy workflow test plan for the demo or bacass cast.
- expect: assertion intent is specific enough for [[implement-galaxy-workflow-test]] to materialize Planemo-runnable Galaxy workflow tests without re-reading the original nf-test files.

## Case: nf-test snapshot fidelity

- fixture: nf-test snapshot evidence covering outputs such as `succeeded_task_count`, `versions.yml`, stable named files, and directory outputs with ignore globs.
- expect: translated assertion intent exercises the same output intent using suitable assertion families such as `has_text`, `has_n_lines`, `has_size`, stable-name checks, or documented omissions for intentionally unstable files.
