# implement-galaxy-workflow-test eval

Evaluation plan for the `implement-galaxy-workflow-test` Mold. This file is the
**abstract oracle**: properties any authored Galaxy workflow test must satisfy,
independent of which workflow fixture it was authored against. Concrete fixtures
and their expected values live in `scenarios.md`; the oracle here is applied to
whatever a scenario produces. Every property is deterministic — each gate is
mechanically checkable.

## Property: tests-format schema gate

- check: deterministic
- assertion: the authored `-tests.yml` validates against the tests-format schema
  before any Planemo invocation.

## Property: workflow/test cross-check gate

- check: deterministic
- assertion: `checkTestsAgainstWorkflow` against the target Galaxy workflow (in
  gxformat2 or native Galaxy workflow format) reports zero missing input labels,
  zero missing output labels, and no collection/datatype mismatches.

## Property: static CLI validation

- check: deterministic
- assertion: gxwf or Planemo static validation reaches a clean result, or emits
  only explicitly documented warnings that do not block runtime testing.

## Property: managed Galaxy runtime green

- check: deterministic
- assertion: `planemo test` passes on a managed Galaxy with staged test data and
  tools available, and the result preserves enough invocation, job, and
  assertion artifact context for debugging if the run fails.
