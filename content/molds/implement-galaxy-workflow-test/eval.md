# implement-galaxy-workflow-test eval

Evaluation plan for the `implement-galaxy-workflow-test` Mold. This file is the
**abstract oracle**: properties any authored Galaxy workflow test must satisfy,
independent of which workflow fixture it was authored against. Concrete fixtures
and their expected values live in `scenarios.md`; the oracle here is applied to
whatever a scenario produces. Most properties are deterministic gates; datatype
agreement and handoff reporting are judged.

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
- assertion: every asserted output whose producing step's `resolved_outputs`
  entry in `gxwf validate --connections --json` has a non-null
  `collection_type`, with no `skip` connection on the path to that step, takes
  collection form (`class: Collection` and that `collection_type`). For a
  subworkflow output only the collection form is checked; its depth is
  confirmed by hand. Every job input bound to a `data_collection` workflow
  input is `class: Collection` with the declared `collection_type`, and every
  input bound to a `data` input is not.

## Property: datatypes agree with the workflow

- check: llm-judged
- assertion: each output `ftype` names the producing output's datatype (the
  step's `change_datatype` when set, otherwise the tool output's format or its
  `format_source` input's datatype), and each job input `filetype` is the
  workflow input's declared `format` or a subtype of it.

## Property: unresolved kinds and plan disagreements surface

- check: llm-judged
- assertion: an output whose kind `--connections` cannot settle (any value
  at or behind a `skip`, a null on a declared collection output, or a null
  from a subworkflow) is named in the handoff as hand-checked, not silently
  asserted in either form. When the test plan's `output_kind` or `collection_shape`
  disagrees with the workflow's resolved kind, the handoff reports it as a
  test-plan defect naming the output, the plan value, and the resolved value;
  it must not vanish into an assertion that silently follows either side.

## Property: static CLI validation

- check: deterministic
- assertion: gxwf or Planemo static validation reaches a clean result, or emits
  only explicitly documented warnings that do not block runtime testing.

## Property: managed Galaxy runtime green

- check: deterministic
- assertion: `planemo test` passes on a managed Galaxy with staged test data and
  tools available, and the result preserves enough invocation, job, and
  assertion artifact context for debugging if the run fails.
