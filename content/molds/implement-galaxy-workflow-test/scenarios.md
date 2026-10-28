# implement-galaxy-workflow-test scenarios

## Case: tests-format schema gate

- fixture: Galaxy workflow test plan for an IWC-style workflow such as SARS-CoV-2 variant calling, ChIPseq-SR, or RNAseq.
- expect: the authored `-tests.yml` validates against the tests-format schema before any Planemo invocation.

## Case: workflow/test cross-check gate

- fixture: authored `-tests.yml` plus the target Galaxy workflow in gxformat2 or native Galaxy workflow format.
- expect: `checkTestsAgainstWorkflow` reports zero missing input labels, zero missing output labels, no missing required inputs, and no JSON-type mismatches.

## Case: mapped-over output the plan calls a dataset

- fixture: `ncbi/egapx` through `nextflow-to-galaxy`. Output `star_bam` has `outputSource: rnaseq_short/star_bam`. Inside the subworkflow, `star_wnode.reads` (`paired_or_unpaired`) is fed `short_reads` (`list:paired_or_unpaired`), so the step maps over the list. The test plan says `output_kind: dataset`, `collection_shape: null`.
- expect: `gxwf validate --connections` (`@galaxy-tool-util/cli` 1.14.0) resolves `rnaseq_short`'s `star_bam` to `collection_type: list`. The test asserts `star_bam` as `class: Collection`, `collection_type: list`, not a bare `ftype: bam`. The handoff reports the plan's `output_kind: dataset` as a test-plan defect. `checkTestsAgainstWorkflow` passes both forms, so it cannot settle this case.

## Case: static CLI validation

- fixture: authored `-tests.yml` and workflow fixture for a representative IWC workflow.
- expect: gxwf or Planemo static validation reaches a clean result, or emits only explicitly documented warnings that do not block runtime testing.

## Case: managed Galaxy runtime green

- fixture: authored workflow test for a representative IWC workflow with staged test data and tools available.
- expect: `planemo test` passes on a managed Galaxy, and the result preserves enough invocation, job, and assertion artifact context for debugging if the run fails.
