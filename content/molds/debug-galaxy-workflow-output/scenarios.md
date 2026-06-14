# debug-galaxy-workflow-output scenarios

Concrete cases for `debug-galaxy-workflow-output`, exercised against the
abstract properties in `eval.md`. Each case binds a failing-run fixture and
states its expected diagnosis; the `eval.md` oracle is applied to whatever the
case produces.

## Case: distinguish failure surfaces

- fixture: failed Planemo workflow test with structured output, invocation id,
  at least one failed or missing output, and access to Galaxy API details.
- expect: classifies the first failure surface as tool/job failure, workflow
  invocation failure, collection output mismatch, missing workflow output, or
  assertion mismatch before proposing repairs.

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

## Case: reference gap discovery

- fixture: any debug run where the failure cannot be classified confidently from
  existing references.
- expect: creates or recommends a focused follow-up for reference documentation,
  pattern capture, API verification, or eval coverage rather than converting
  uncertainty into a repair recipe.
