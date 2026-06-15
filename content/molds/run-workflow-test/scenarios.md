# run-workflow-test scenarios

Concrete cases for `run-workflow-test`, exercised against the abstract properties
in `eval.md`. Each case binds an input condition and states its expected values;
the `eval.md` oracle is applied to whatever the case produces.

## Case: structured Planemo artifact capture

- fixture: workflow test run with Planemo configured to emit structured test output.
- expect: preserves the invocation id, history id, workflow id, Planemo
  structured result, and any test output artifact paths needed by debug molds.

## Case: existing versus managed Galaxy mode

- fixture: workflow test configuration that can run against either an existing
  Galaxy or a Planemo-managed Galaxy.
- expect: records which Galaxy mode was used, how tools/workflows/test data were
  staged, and which API credentials or URLs are needed for follow-up failure
  inspection.

## Case: failure modality handoff

- fixture: workflow test run that exits non-zero or reports failed assertions,
  failed jobs, failed invocation, missing outputs, or upload/staging problems.
- expect: hands off a structured summary that identifies the observed failure
  modality and the next reference surface to inspect: Planemo result, Galaxy job
  API, Galaxy invocation API, history contents, or test assertion report.
