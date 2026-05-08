# implement-galaxy-workflow-test eval

## Case: tests-format schema gate

- check: deterministic
- fixture: Galaxy workflow test plan for an IWC-style workflow such as SARS-CoV-2 variant calling, ChIPseq-SR, or RNAseq.
- expectation: authored `-tests.yml` validates against the tests-format schema before any Planemo invocation.

## Case: galaxy-test-plan schema gate

- check: deterministic
- fixture: Galaxy workflow test plan emitted by [[nextflow-test-to-galaxy-test-plan]] or [[cwl-test-to-galaxy-test-plan]].
- expectation: input validates against [[galaxy-workflow-test-plan]] before any final `tests-format` YAML is authored.

## Case: workflow/test cross-check gate

- check: deterministic
- fixture: authored `-tests.yml` plus the target Galaxy workflow in gxformat2 or native Galaxy workflow format.
- expectation: `checkTestsAgainstWorkflow` reports zero missing input labels, zero missing output labels, and no collection/datatype mismatches.

## Case: static CLI validation

- check: deterministic
- fixture: authored `-tests.yml` and workflow fixture for a representative IWC workflow.
- expectation: gxwf or Planemo static validation reaches a clean result, or emits only explicitly documented warnings that do not block runtime testing.

## Case: managed Galaxy runtime green

- check: deterministic
- fixture: authored workflow test for a representative IWC workflow with staged test data and tools available.
- expectation: `planemo test` passes on a managed Galaxy, and the result preserves enough invocation, job, and assertion artifact context for debugging if the run fails.
