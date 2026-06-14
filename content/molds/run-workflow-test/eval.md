# run-workflow-test eval

This file is the **abstract oracle** for the `run-workflow-test` Mold: properties
any run must satisfy, independent of fixture. Concrete input conditions and their
expected values live in `scenarios.md`; the oracle here is applied to whatever a
scenario produces.

## Property: structured Planemo artifact capture

- check: deterministic
- assertion: a run with Planemo configured to emit structured test output
  preserves the invocation id, history id, workflow id, the Planemo structured
  result, and any test-output artifact paths needed by debug molds.

## Property: existing versus managed Galaxy mode

- check: llm-judged
- assertion: the output records which Galaxy mode was used (existing/external
  Galaxy or Planemo-managed Galaxy), how tools/workflows/test data were staged,
  and which API credentials or URLs are needed for follow-up failure inspection.

## Property: failure modality handoff

- check: llm-judged
- assertion: when a run exits non-zero or reports failed assertions, failed jobs,
  a failed invocation, missing outputs, or upload/staging problems, the output
  hands off a structured summary that identifies the observed failure modality
  and the next reference surface to inspect: Planemo result, Galaxy job API,
  Galaxy invocation API, history contents, or test assertion report.
