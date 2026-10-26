# implement-galaxy-workflow-test eval

Evaluation plan for the `implement-galaxy-workflow-test` Mold. This file is the
**abstract oracle**: properties any authored Galaxy workflow test must satisfy,
independent of which workflow fixture it was authored against. Concrete fixtures
and their expected values live in `scenarios.md`; the oracle here is applied to
whatever a scenario produces. Most properties are deterministic gates; datatype
agreement and plan-defect reporting are judged until a static gate covers them.

## Property: tests-format schema gate

- check: deterministic
- assertion: the authored `-tests.yml` validates against the tests-format schema
  before any Planemo invocation.

## Property: workflow/test cross-check gate

- check: deterministic
- assertion: `checkTestsAgainstWorkflow` against the target Galaxy workflow (in
  gxformat2 or native Galaxy workflow format) reports zero missing input labels,
  zero missing output labels, no missing required inputs, and no job value of
  an incompatible JSON type. It checks nothing about collection shape or
  datatype; passing it is not evidence of either.

## Property: output and input kind match the workflow

- check: deterministic
- assertion: every asserted output whose producing step resolved cleanly in
  `gxwf validate --connections --json` takes collection form (`class:
  Collection` and the same `collection_type`) exactly when that step's
  `resolved_outputs` entry has a non-null `collection_type`, and dataset form
  when it is null. Every job input bound to a `data_collection` workflow input
  is `class: Collection` with the declared `collection_type`, and every input
  bound to a `data` input is not. An output whose kind could not be resolved
  (a `skip` or non-`ok` connection upstream) is named in the handoff as
  hand-checked, not silently asserted in dataset form.

## Property: datatypes agree with the workflow

- check: llm-judged
- assertion: each output `ftype` names the producing tool output's format (or
  its `format_source` input's datatype), and each job input `filetype` is the
  workflow input's declared `format` or a subtype of it.

## Property: plan/workflow disagreement surfaces

- check: llm-judged
- assertion: when the test plan's `output_kind` or `collection_shape` for an
  output disagrees with the workflow's resolved kind, the handoff reports it as
  a test-plan defect naming the output, the plan value, and the resolved value.
  The disagreement must not vanish into an assertion that silently follows
  either side.

## Property: static CLI validation

- check: deterministic
- assertion: gxwf or Planemo static validation reaches a clean result, or emits
  only explicitly documented warnings that do not block runtime testing.

## Property: managed Galaxy runtime green

- check: deterministic
- assertion: `planemo test` passes on a managed Galaxy with staged test data and
  tools available, and the result preserves enough invocation, job, and
  assertion artifact context for debugging if the run fails.
