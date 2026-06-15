# debug-galaxy-workflow-output eval

Evaluation plan for the `debug-galaxy-workflow-output` Mold. This file is the
**abstract oracle**: properties any debug run must satisfy, independent of which
failing workflow test it triaged. Concrete failing-run fixtures and their
expected diagnoses live in `scenarios.md`; the oracle here is applied to
whatever a scenario produces.

## Property: classifies the failure surface before repairing

- check: llm-judged
- assertion: given a failed Galaxy workflow run handoff, the report classifies
  the first failure surface as one of tool/job failure, workflow invocation
  failure, collection output mismatch, missing workflow output, or assertion
  mismatch before proposing any repairs.

## Property: captures job-failure evidence

- check: llm-judged
- assertion: when a Galaxy job is in a terminal failure state, the report
  records job id, tool id, exit code, job messages, the stdout/stderr
  distinction, output dataset state, and whether the wrapper failure semantics
  explain the failure.

## Property: captures invocation-failure evidence

- check: llm-judged
- assertion: when the invocation state or messages indicate a scheduling,
  materialization, cancellation, conditional, or output-resolution failure, the
  report records invocation state, the structured message reason, the affected
  step, the subworkflow path if present, the jobs summary, and whether Planemo
  surfaced or hid the relevant Galaxy API detail.

## Property: diagnoses collection mismatch rather than relaxing the assertion

- check: llm-judged
- assertion: when a collection or mapped output has wrong nesting, missing
  elements, or mismatched element identifiers, the report diagnoses the
  collection shape / mapping / reduction / element-identifier mismatch as the
  failure surface — and for a Nextflow-translated workflow, traces it to a
  possibly-lossy operator translation — rather than relaxing the assertion to
  make the test pass.

## Property: surfaces reference gaps instead of guessing a fix

- check: llm-judged
- assertion: when the failure cannot be classified confidently from existing
  references, the report creates or recommends a focused follow-up for reference
  documentation, pattern capture, API verification, or eval coverage rather than
  converting uncertainty into a repair recipe.
