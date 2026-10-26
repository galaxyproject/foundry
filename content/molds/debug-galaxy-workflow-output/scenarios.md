# debug-galaxy-workflow-output scenarios

## Case: distinguish failure surfaces

- fixture: failed Planemo workflow test with structured output, invocation id,
  at least one failed or missing output, and access to Galaxy API details.
- expect: classifies the first failure surface as workflow import rejection,
  tool/job failure, workflow invocation failure, collection output mismatch,
  missing workflow output, or assertion mismatch before proposing repairs.

## Case: workflow import rejected by a Galaxy defect

- fixture: failed workflow test whose handoff carries no workflow, history, or
  invocation id because `POST /api/workflows/upload` returned 500 with a server
  traceback — e.g. the ncbi/egapx run in issue #726, where Galaxy 26.1.2.dev0 raised
  `IntegrityError` importing a workflow in which a step with a workflow output
  or post-job action is followed by an embedded `GalaxyUserTool` step.
- expect: classifies the surface as a workflow import rejection, records the
  upload status and body, the server-log traceback and the Planemo terminal
  log, and states that no structured Planemo output exists. Bisects with
  self-contained two-step synthetic workflows (one failing variant, one
  passing control) and routes the result upstream as a minimal repro without
  reordering steps or dropping workflow outputs from the real workflow.

## Case: workflow import rejected for its content

- fixture: failed workflow test where the upload returned 400 with a
  validation message — e.g. a `type: frame` comment missing `position` and
  `size` (issue #580).
- expect: classifies the surface as a workflow import rejection caused by the
  workflow's content, names the offending construct, and routes the fix back to
  the phase that emitted it rather than reporting a Galaxy defect.

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
