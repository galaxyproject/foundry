# NEXTFLOW → CWL pipeline scenarios

Concrete end-to-end journeys for the NEXTFLOW → CWL pipeline, exercised against
the properties in `eval.md`. A pipeline scenario names the journey input **once**;
each step's Mold oracle applies to that step's output as the journey advances.
Materialize Nextflow fixtures with `make fixtures-nextflow`; CWL tool-library
fixtures with `make fixtures-cwl`.

## Case: nf-core/demo end to end

- fixture: `workflow-fixtures/pipelines/nf-core__demo` (tiny; FastQC + MultiQC,
  the full journey is tractable).
- expect: the journey produces a CWL Workflow (`class: Workflow`) plus a
  CommandLineTool per step, all passing `cwltool --validate`; the sample sheet
  (`params.input`) surfaces as the primary workflow input; the FastQC/MultiQC
  reports surface as workflow outputs; no placeholder step or unresolved `run:`
  target remains.
- expect: each CommandLineTool carries its source module's container as a
  `DockerRequirement` (or `SoftwareRequirement`), traceable to the module's
  `container` directive; no tool is left unprovenanced.
- expect: the bundled nf-test snapshots reach a cwltool-runnable job file with
  expected-output assertions; `source.derived_from: test-evidence` is preserved,
  not synthesized.

## Case: nf-core/sarek scatter + branch mapping

- fixture: `workflow-fixtures/pipelines/nf-core__sarek`, scope-narrowed to the
  first 5 workflow steps.
- expect: per-sample channels map to CWL step-level `scatter`; the load-bearing
  toggle controls (`step`, `tools`, `aligner`) reach the CWL Workflow as
  `when`-gated steps or an explicit stated scope decision; the data-flow brief
  records the `scatter`/`when` choices the template then renders.

## Not yet walkable — what a first walk needs

The extraction/design chain ([[summarize-nextflow]] →
[[nextflow-summary-to-cwl-interface]] → [[nextflow-summary-to-cwl-data-flow]] →
[[summary-to-cwl-template]]) carries real bodies and references. The per-tool
authoring and validation loop is seeded stubs, so these cases define the target,
not a passing suite. To make even the demo case walkable:

1. Real bodies + `eval.md` oracles for [[summarize-cwl-tool]] and
   [[implement-cwl-tool-step]].
2. A failure-classification rubric for [[validate-cwl]] and a real body for
   [[implement-cwl-workflow-test]].
3. A CWL tool reuse-vs-author decision — no [[discover-shed-tool]] analog exists;
   `bio-cwl-tools` is a pinned fixture nothing looks up.
4. A CWL run path — [[run-workflow-test]] is Planemo-oriented; cwltool execution
   is unowned.

Until (1)–(2) land, the tractable move is a partial walk of the demo case through
the real extraction chain, stopping at the first placeholder CommandLineTool.
