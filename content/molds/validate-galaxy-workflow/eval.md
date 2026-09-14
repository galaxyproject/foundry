# validate-galaxy-workflow eval

Evaluation oracle for the `validate-galaxy-workflow` Mold. This file is the **abstract oracle**: properties any run must satisfy, independent of fixture. Concrete fixtures and their expected values live in `scenarios.md`.

## Property: a clean workflow validates and proceeds

- check: deterministic
- assertion: a complete gxformat2 workflow that passes terminal `gxwf` validation is reported as a clean validation result, and the harness is allowed to proceed to [[run-workflow-test]].

## Property: workflow-level errors are classified as terminal, not runtime

- check: llm-judged
- assertion: a workflow-level connection or output problem is classified as a terminal workflow-validation failure, with the likely responsible phase identified; it is not mistaken for a Planemo runtime failure.

## Property: the validation-versus-runtime boundary is made explicit

- check: llm-judged
- assertion: when a workflow passes static validation but still carries a plausible runtime-failure risk (missing tool runtime behavior, optional-output assumptions, collection element mismatch), the run records why static validation is insufficient and names the runtime artifact that should prove or disprove the risk (invocation messages, job details, output collections, or Planemo structured test output).

## Property: the result artifact is always emitted

- check: deterministic
- assertion: every run writes `galaxy-workflow-validation-result.json` — clean, failing, or unable to execute — carrying a `status` from the closed set `pass | fail | not-run` and a `not_run_reason` whenever the status is `not-run`. A run that validates something and hands nothing on fails this property even when its prose conclusion is correct, because a downstream reviewer then has nothing to cite.
