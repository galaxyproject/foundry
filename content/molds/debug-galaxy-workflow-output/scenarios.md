# debug-galaxy-workflow-output scenarios

## Case: distinguish failure surfaces

- fixture: `content/molds/review-galaxy-workflow/examples/planemo-failure/`,
  whose `workflow-test-result.json` reports an unmet `has_text` assertion on
  `MultiQC Report` after the job succeeded.
- expect: classifies the first failure surface as an assertion mismatch, not a
  tool/job failure, before proposing any repair.

## Case: job failure reference capture

- fixture: failed workflow test where a Galaxy job has state `error`, `failed`,
  `stopped`, or equivalent terminal failure.
- expect: records job id, tool id, exit code, job messages, stdout/stderr
  distinction, output dataset state, and whether the wrapper failure semantics
  explain the failure.

## Case: invocation failure reference capture

- fixture: failed workflow test where the invocation state or invocation
  messages indicate scheduling, materialization, cancellation, conditional, or
  output-resolution failure.
- expect: records invocation state, structured message reason, affected step,
  subworkflow path if present, jobs summary, and whether Planemo surfaced or hid
  the relevant Galaxy API detail.

## Case: collection output mismatch capture

- fixture: failed workflow test where a collection or mapped output has wrong
  nesting, missing elements, or mismatched element identifiers.
- expect: diagnoses the collection shape / mapping / reduction /
  element-identifier mismatch as the failure surface — and for a
  Nextflow-translated workflow, traces it to a possibly-lossy operator
  translation — rather than relaxing the assertion to make the test pass.

## Case: a green run that lost a step on a misread log line

- fixture: `content/molds/run-workflow-test/examples/unlabelled-step-removal/`,
  whose `workflow-test-result.json` reports `unlabelled-step-removal` for
  `subsample_reads`.
- expect: the first failure surface is the unlabelled step removal. The report
  notes that the gap `subsample-reads-validation-failed` rests only on Galaxy's
  `validation_failed` log line, which is not a failure verdict
  (galaxyproject/galaxy#24837). It recommends restoring `subsample_reads` from
  `galaxy-workflow.extracted.gxwf.yml` and rerunning, and does not recommend
  recording a drop on that evidence.

## Case: reference gap discovery

- fixture: any debug run where the failure cannot be classified confidently from
  existing references.
- expect: creates or recommends a focused follow-up for reference documentation,
  pattern capture, API verification, or eval coverage rather than converting
  uncertainty into a repair recipe.
