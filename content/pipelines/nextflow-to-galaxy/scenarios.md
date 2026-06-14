# NEXTFLOW → GALAXY pipeline scenarios

Concrete end-to-end journeys for the NEXTFLOW → GALAXY pipeline, exercised
against the properties in `eval.md`. A pipeline scenario names the journey input
**once**; each step's Mold oracle applies to that step's output as the journey
advances (it does not re-list the per-Mold scenarios). Materialize Nextflow
fixtures with `make fixtures-nextflow`.

## Case: nf-core/demo end to end

- fixture: `workflow-fixtures/pipelines/nf-core__demo` (small; the full journey
  is tractable).
- expect: the journey produces a gxformat2 workflow that validates and
  round-trips; `params.input` / the sample sheet surfaces as the primary Galaxy
  input; FastQC/MultiQC-style reports surface as workflow outputs; no
  promoted-workflow TODO sentinels remain.

## Case: nf-core/sarek capped at 5 steps

- fixture: `workflow-fixtures/pipelines/nf-core__sarek`, scope-narrowed to the
  first 5 workflow steps.
- expect: the summary's load-bearing branch controls (`step`, `tools`,
  `aligner`) survive into the interface and data-flow briefs as scope decisions;
  the per-step loop concretizes each of the 5 steps; tool resolution is recorded
  per step (discover or author); the partial scope is stated explicitly rather
  than silently dropping the remaining pipeline.

## Case: branch-control fidelity

- fixture: a Nextflow summary with a skip-style branch control (e.g.
  `skip_trim`).
- expect: the branch control reaches the final workflow as an optional path or
  an explicit design decision; it is never silently folded away between the
  interface brief and the template.
