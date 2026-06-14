# nextflow-test-to-cwl-test-plan scenarios

Concrete cases for `nextflow-test-to-cwl-test-plan`, exercised against the
abstract properties in `eval.md`. Each case binds a fixture and states its
expected values; the `eval.md` oracle is applied to whatever the case produces.

## Case: plan-not-final-tests boundary

- fixture: cast skill output for an nf-core/demo or nf-core/bacass Nextflow summary.
- expect: output describes a CWL workflow test plan, not concrete CWL job files
  or final assertion artifacts. Every test description carries provenance and
  evidence for its inputs, expected outputs, assertion intent, tolerances, and
  omissions.
