# refinement — nextflow-summary-to-galaxy-template

## Structure the `_plan_*` planning fields

The draft format (see [[galaxy-workflow-draft-format]]) currently emits free-text `_plan_state` and `_plan_context` per tool step. That was the right v1 — it lets the templating agent record intent without a contract pretending to be parameterizable yet — but the per-step implementation Mold has to re-parse prose every time. Open work for the next refinement:

- **`_plan_state`** — grow structure for parameter hints. Candidate shape: array of `{ name?, source_evidence, intent, value | range | enum, required }`. `source_evidence` should be able to cite the upstream `summary-nextflow.json` path (process, channel, param) so the per-step Mold doesn't re-derive it.
- **`_plan_context`** — split the free-text bag into typed fields. Likely: `source_command`, `conda` (list of bioconda specs), `containers` (list of OCI/Singularity URIs), `env` (map), `preconditions[]`, `postconditions[]`, `scratch_needs`. `summary-nextflow` already extracts most of these per process; the template Mold should forward them rather than restate them in prose.
- **Non-tool steps** — decide whether `_plan_*` belongs on subworkflow, pause, or input steps. Today the format only specifies tool steps.
- **Strip step** — specify the deterministic transform that drops `_plan_*` and rejects any remaining `TODO` once a draft is promoted to a runnable gxformat2 workflow. Likely lives in a small `foundry-build` helper rather than a Mold.
- **Schema strategy** — extend gxformat2 with `_plan_*` and the relaxed `tool_id` / `tool_state` / `tool_shed_repository` rules, or validate via a sibling wrapping schema. Either way, `gxwf validate --no-tool-state` should still apply to the gxformat2 portion.

These same refinements apply to [[cwl-summary-to-galaxy-template]] and [[paper-summary-to-galaxy-template]], which share the draft format.
