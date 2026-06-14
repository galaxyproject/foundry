# validate-galaxy-workflow scenarios

Concrete cases for `validate-galaxy-workflow`, exercised against the abstract properties in `eval.md`. Each case binds a fixture and states its expected values.

## Case: complete valid workflow

- fixture: a complete gxformat2 workflow expected to pass gxwf validation.
- expect: reports a clean validation result and allows the harness to proceed to [[run-workflow-test]].

## Case: cross-step workflow error

- fixture: a complete gxformat2 workflow with a workflow-level connection or output problem.
- expect: classifies the failure as terminal workflow validation, identifies the likely responsible phase, and does not treat it as a Planemo runtime failure.

## Case: validation versus runtime boundary

- fixture: a gxformat2 workflow that passes static validation but still has a plausible runtime failure risk (missing tool runtime behavior, optional output assumptions, or collection element mismatch).
- expect: records why static validation is insufficient and names the runtime artifact that should prove or disprove the risk (invocation messages, job details, output collections, or Planemo structured test output).
