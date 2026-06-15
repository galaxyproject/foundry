# refinement — freeform-summary-to-galaxy-template

## Structure the `_plan_*` planning fields

Shares the draft format with [[nextflow-summary-to-galaxy-template]] and [[cwl-summary-to-galaxy-template]] — see [[galaxy-workflow-draft-format]]. Open work for the next refinement (parallel across the three template Molds):

- **`_plan_state`** — grow structure for parameter hints. Candidate shape: array of `{ name?, source_evidence, intent, value | range | enum, required }`. `source_evidence` should be able to cite the upstream `freeform-summary.md` path (methods passage, interview answer, supplementary table, parameter mention) so the per-step Mold doesn't re-derive it. Free-form sources will more often have ranges or vague intent than nf-core/CWL sources — the structure should accommodate "unspecified, default" as a first-class value.
- **`_plan_context`** — split the free-text bag into typed fields. Likely: `source_command` (paper-quoted CLI, when given), `conda`, `containers`, `env`, `preconditions[]`, `postconditions[]`, `scratch_needs`. Most paper sources will populate few of these; treat all fields as optional. Cite the originating paper section/figure for any inferred value.
- **`_plan_in` / `_plan_out`** — decide structure for wrapper port-name intent. Candidate `_plan_out`: array of `{ semantic_name, downstream_consumers[], required_for }` keyed off the `TODO_<hint>` placeholder used in `out[].id`. Candidate `_plan_in`: map keyed by the `TODO_<hint>` placeholder used as the `in:` key to `{ semantic_name, source_step_output, shape_constraint }`. Free-form sources rarely name wrapper ports — semantic role plus a source-evidence citation is usually all that's available.
- **Strip step** — specify the deterministic transform that drops all `_plan_*` and rejects any remaining `TODO` or `TODO_<hint>` sentinel in `tool_id`, `tool_version`, `out[].id`, `in[]` keys, or `outputSource` once a draft is promoted to a runnable gxformat2 workflow. Likely lives in a small `foundry-build` helper rather than a Mold.
- **Schema strategy** — extend gxformat2 with `_plan_*` and the relaxed `tool_id` / `tool_state` / `tool_shed_repository` / port-name rules, or validate via a sibling wrapping schema. Either way, `gxwf validate --no-tool-state` should still apply to the gxformat2 portion.

## Fan-in / combine node (issue #303)

The rule "a ≥2-dataset-input step under a 1→1 reshape intent is a missing-combine-node smell; split it into an explicit combine node + single-input reshapes" now lives in [[galaxy-workflow-draft-format]] (topology section) and is named as an idiom in [[galaxy-data-flow-draft-contract]]. Open work:

- **Two-dataset tabular concat recipe gap.** A plain two-dataset → one tabular concat (`cat1` / `tp_cat`) has no dedicated reachable pattern page: [[tabular-concatenate-collection-to-table]] (`collapse_dataset`) is collection→one and explicitly says it is not a substitute, while [[interval-mask-by-set-algebra]] §concat covers only the interval case (`gops_concat_1`). The split rule still lands the right topology and the per-step Mold resolves `cat1`/`tp_cat` downstream, but decide whether the corpus has enough uptake to warrant a `tabular-concatenate-two-datasets` recipe page vs. a gap note.
- **Pattern trigger vs. constraint.** The rule is stated as a topology constraint in the shared draft-format note, not as a pattern trigger in the template `references:`. Decide whether a dedicated concat/combine pattern trigger is warranted if drafts keep folding combines into reshapes.
