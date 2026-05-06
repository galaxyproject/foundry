# refinement — paper-summary-to-galaxy-template

## Structure the `_plan_*` planning fields

Shares the draft format with [[nextflow-summary-to-galaxy-template]] and [[cwl-summary-to-galaxy-template]] — see [[galaxy-workflow-draft-format]]. Open work for the next refinement (parallel across the three template Molds):

- **`_plan_state`** — grow structure for parameter hints. Candidate shape: array of `{ name?, source_evidence, intent, value | range | enum, required }`. `source_evidence` should be able to cite the upstream `summary-paper.json` path (methods passage, supplementary table, parameter mention) so the per-step Mold doesn't re-derive it. Paper sources will more often have ranges or vague intent than nf-core/CWL sources — the structure should accommodate "unspecified, default" as a first-class value.
- **`_plan_context`** — split the free-text bag into typed fields. Likely: `source_command` (paper-quoted CLI, when given), `conda`, `containers`, `env`, `preconditions[]`, `postconditions[]`, `scratch_needs`. Most paper sources will populate few of these; treat all fields as optional. Cite the originating paper section/figure for any inferred value.
- **Non-tool steps** — decide whether `_plan_*` belongs on subworkflow, pause, or input steps. Today the format only specifies tool steps.
- **Strip step** — specify the deterministic transform that drops `_plan_*` and rejects any remaining `TODO` once a draft is promoted to a runnable gxformat2 workflow. Likely lives in a small `foundry-build` helper rather than a Mold.
- **Schema strategy** — extend gxformat2 with `_plan_*` and the relaxed `tool_id` / `tool_state` / `tool_shed_repository` rules, or validate via a sibling wrapping schema. Either way, `gxwf validate --no-tool-state` should still apply to the gxformat2 portion.
