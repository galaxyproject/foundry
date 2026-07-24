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

## Tier maturity — what would gate the walk

Every phase carries a body, so the journey runs end to end today. What it lacks is
per-step gating and depth on the CWL-authoring tier:

1. [[summarize-cwl-tool]], [[implement-cwl-tool-step]], [[validate-cwl]], and
   [[implement-cwl-workflow-test]] carry one-line bodies but no `eval.md` oracles
   and no packaged `references:` — so the walk runs but isn't gated per step.
2. No CWL tool reuse-vs-author decision — there's no [[discover-shed-tool]]
   analog; `bio-cwl-tools` is a pinned fixture nothing looks up.
3. The run path is unproven for CWL — [[run-workflow-test]] executes via Planemo;
   a cwltool execution path isn't established.

The near-term move is a first walk of the demo case to see where the thin
authoring bodies produce placeholder or unprovenanced steps, then harden those
molds against what it surfaces.
