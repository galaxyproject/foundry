# refinement — cwl-summary-to-galaxy-template

## Structure the `_plan_*` planning fields

Shares the draft format with [[nextflow-summary-to-galaxy-template]] and [[paper-summary-to-galaxy-template]] — see [[galaxy-workflow-draft-format]]. Open work for the next refinement (parallel across the three template Molds):

- **`_plan_state`** — grow structure for parameter hints. Candidate shape: array of `{ name?, source_evidence, intent, value | range | enum, required }`. `source_evidence` should be able to cite the upstream `summary-cwl.json` path (CommandLineTool, input binding, requirement) so the per-step Mold doesn't re-derive it.
- **`_plan_context`** — split the free-text bag into typed fields. Likely: `source_command` (CWL `baseCommand` + `arguments`), `conda` (from `SoftwareRequirement`/`hints` when present), `containers` (CWL `DockerRequirement` URIs), `env` (`EnvVarRequirement`), `preconditions[]`, `postconditions[]`, `scratch_needs` (CWL `ResourceRequirement`). `summary-cwl` extracts most of these per CommandLineTool; the template Mold should forward them rather than restate in prose.
- **Non-tool steps** — decide whether `_plan_*` belongs on subworkflow, pause, or input steps. Today the format only specifies tool steps.
- **Strip step** — specify the deterministic transform that drops `_plan_*` and rejects any remaining `TODO` once a draft is promoted to a runnable gxformat2 workflow. Likely lives in a small `foundry-build` helper rather than a Mold.
- **Schema strategy** — extend gxformat2 with `_plan_*` and the relaxed `tool_id` / `tool_state` / `tool_shed_repository` rules, or validate via a sibling wrapping schema. Either way, `gxwf validate --no-tool-state` should still apply to the gxformat2 portion.
