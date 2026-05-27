---
mold: summarize-cwl
date: 2026-05-11
intent: 5-step CWL→Galaxy emulation on hubmapconsortium/salmon-rnaseq pipeline.cwl
decision: schema-change
---

## What worked

- `cwltool --validate` + `cwltool --pack` produced a clean 14-entry `$graph` JSON for a v1.2 source. Procedure survives the v1.2 case once the normalizer is sidestepped.
- Schema accommodated the fixture: scatter at the workflow level (fastqc), array inputs (`Directory[]`), optional Directory inputs, a nested Workflow with its own `when:` and `pickValue` machinery.

## Gaps surfaced

1. **`cwl-normalizer` rejects v1.2 inputs outright.** The user's patched `cwl-utils` (`fix-normalizer-ruamel-018`) fixes the ruamel-0.18 breakage but does **not** address the more fundamental bug: `normalizer.py` only upgrades `draft-3 | v1.0 | v1.1` and falls through to an error for any other version, including v1.2. The error message itself is also broken — `_logger.error("Sorry, %s in %s is not a supported CWL version by this tool.", (version, document))` passes a tuple as a single arg and trips a `TypeError: not enough arguments for format string` in stdlib `logging`. Two separate bugs: (a) v1.2 should be a no-op upgrade, not an error, and (b) the error-formatting call shape is wrong. Same workaround as the ga4gh run: `cwltool --pack` substitutes for `cwl-normalizer`.

2. **Extractor (and skill procedure) loses nested-workflow wiring.** This is the salmon-rnaseq–specific finding: the LLM-emulated `summary-cwl.json` represents `salmon-quantification.cwl` as a `tools[]` entry with a `_NestedWorkflow` hint that lists only `{id, run, scatter}` per inner step. The nested workflow's `in:` / `out:` graph, its `when: $(inputs.organism == 'human')` predicates, and its `pickValue: first_non_null` merge on `output_dir` are **not** in the summary. I had to read `steps/salmon-quantification.cwl` directly to drive the data-flow brief. The biggest Galaxy translation decision in this workflow (collapse `when:`-split salmon vs salmon-mouse into one parameterized step) is invisible in the summary.

   This is the highest-leverage `summarize-cwl` improvement: the schema and the procedure should preserve nested-workflow internals — at minimum `inputs`, `outputs`, `steps[].in[]`, `steps[].out`, `steps[].when`, and `steps[].in[].pick_value`. Either by extending the nested-workflow record shape in `tools[]`, or by promoting nested workflows into their own top-level `subworkflows[]` array. The latter feels right: nested workflows are workflows, not tools.

3. **`Directory[]` workflow input + workflow-step `scatter` over it.** The schema accepted it; the brief consumed it. But the summary's `workflow_inputs[].type: "array"` is lossy — the array's `items` (Directory) is gone. Galaxy collection-shape choice (list:paired vs list:list vs Apply Rules) hinges on the inner type. The summary should preserve `array.items` either as a structured field or as a more discriminating type string (`Directory[]` rather than `array`).

4. **No tests discoverable, no jobs file at repo root.** The HuBMAP repo has no sibling job YAML / inputs JSON at the entrypoint location; the `data/` directory contains references but no per-assay job. The procedure correctly emitted `tests: []` but the user-facing experience is that the downstream test-plan Mold is blocked with no breadcrumbs. Worth a procedure note: when `tests: []` is emitted, surface what locations were searched.

## Open questions

- Promote nested workflows to a structured `subworkflows[]` array rather than smuggling them through `tools[]` with a `_NestedWorkflow` hint?
- Should `summary-cwl` retain `array.items` (or use a richer type representation) so collection-shape downstream Molds don't lose the inner type?
- Is it worth opening a `cwl-utils` issue for the v1.2-input and error-format bugs in `cwl-normalizer`?
