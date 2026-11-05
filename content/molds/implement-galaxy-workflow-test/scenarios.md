# implement-galaxy-workflow-test scenarios

## Case: tests-format schema gate

- fixture: Galaxy workflow test plan for an IWC-style workflow such as SARS-CoV-2 variant calling, ChIPseq-SR, or RNAseq.
- expect: the authored `-tests.yml` validates against the tests-format schema before any Planemo invocation.

## Case: workflow/test cross-check gate

- fixture: authored `-tests.yml` plus the target Galaxy workflow in gxformat2 or native Galaxy workflow format.
- expect: `checkTestsAgainstWorkflow` reports zero missing input labels, zero missing output labels, and no collection/datatype mismatches.

## Case: static CLI validation

- fixture: authored `-tests.yml` and workflow fixture for a representative IWC workflow.
- expect: gxwf or Planemo static validation reaches a clean result, or emits only explicitly documented warnings that do not block runtime testing.

## Case: data-table values have rows

- fixture: a workflow fixing a step's database value in its tool state, with a `test-data-refs.json` that holds no ref for that value and no staged table.
- expect: the test stages `tool_data_table_conf.xml.test` for that table, or reports the gap when no test-size database exists. It doesn't reach Planemo with an unmet value.

## Case: managed Galaxy runtime green

- fixture: authored workflow test for a representative IWC workflow with staged test data and tools available.
- expect: `planemo test` passes on a managed Galaxy, and the result preserves enough invocation, job, and assertion artifact context for debugging if the run fails.
