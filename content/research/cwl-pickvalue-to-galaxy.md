---
type: research
title: "CWL pickValue → Galaxy pick_value (post galaxy#22222)"
tags:
  - source/cwl
  - target/galaxy
status: draft
created: 2026-05-11
revised: 2026-05-11
revision: 1
ai_generated: true
related_notes:
  - "[[component-cwl-workflow-anatomy]]"
  - "[[galaxy-data-flow-draft-contract]]"
  - "[[galaxy-workflow-draft-format]]"
related_molds:
  - "[[cwl-summary-to-galaxy-data-flow]]"
  - "[[cwl-summary-to-galaxy-template]]"
summary: "CWL `pickValue` (first_non_null / the_only_non_null / all_non_null) → Galaxy's native `pick_value` workflow step added by galaxyproject/galaxy#22222."
---

# CWL `pickValue` → Galaxy `pick_value`

Audience: a Mold author who just saw a `pickValue:*` marker in a `summary-cwl.json` edge `via:` array (or a `WorkflowOutputParameter.output_source` multi-value carrying a `pickValue` hint) and needs to emit gxformat2.

## CWL `pickValue` — canonical semantics

Source: CWL v1.2 schema `Workflow.yml` (`PickValueMethod`) and the rendered spec at <https://www.commonwl.org/v1.2/Workflow.html#PickValueMethod>.

- **`first_non_null`** — "For the first level of a list input, pick the first non-null element. The result is a scalar. **It is an error if there is no non-null element.**"
- **`the_only_non_null`** — "For the first level of a list input, pick the single non-null element. The result is a scalar. **It is an error if there is more than one non-null element.**"
- **`all_non_null`** — "For the first level of a list input, pick all non-null values. **The result is a list, which may be empty.**"

Placement: declared on **both** `WorkflowStepInput` and `WorkflowOutputParameter` with identical semantics. Operates on the array produced when `source:` / `outputSource:` is multi-valued. First level only; composes with `linkMerge` (which builds the array `pickValue` then filters).

Interaction with `when:` — `pickValue` is the canonical fan-in idiom for N branches gated by complementary `when:` predicates. Skipped steps emit `null` for their outputs; the survivor is picked. (Inference, but corroborated by the PR's stated motivation: unblocking 27+ CWL v1.2 conditional conformance tests.)

## Galaxy `pick_value` — what galaxy#22222 added

PR <https://github.com/galaxyproject/galaxy/pull/22222> (merged 2026-03-31, author jmchilton, labels `area/workflows`, `area/cwl`).

- **New workflow module type: `pick_value`.** Registered at `lib/galaxy/workflow/modules.py` `module_types["pick_value"] = PickValueModule` (~line 3108 at PR head). No DB migration — reuses `WorkflowStep.type = "pick_value"` + `tool_state = {"mode": "...", "num_inputs": N}` + standard `WorkflowStepConnection` / `WorkflowOutput`.
- **Four modes** (Galaxy is a *superset* of CWL by one extra mode):

  | Galaxy mode | Maps to CWL | All-null behavior | Output shape |
  | --- | --- | --- | --- |
  | `first_non_null` | `first_non_null` | Fail workflow (`FailWorkflowEvaluation`) | scalar dataset |
  | `first_or_skip` | *(no CWL equivalent)* | Emit a "skipped" HDA (`extension=expression.json`, `blurb=skipped`) | scalar (or skipped) |
  | `the_only_non_null` | `the_only_non_null` | Fail; also fails when `>1` non-null | scalar dataset |
  | `all_non_null` | `all_non_null` | Returns an HDCA `list` (may be empty) | `list` collection |

- **Null detection** is two-pronged (`PickValueModule._pick_from_replacements`, ~modules.py:2060–2068):
  - the `NO_REPLACEMENT` sentinel (no upstream connection, or upstream step was skipped via `when:`); or
  - an HDA with `extension == "expression.json"` and `blurb == "skipped"`.
- **gxformat2 surface** (from PR test fixtures, e.g. `lib/galaxy_test/workflow/pick_value_first_non_null_mapped.gxwf.yml`):

  ```yaml
  pick:
    type: pick_value
    in:
      input_0:
        source: branch_a/out_file1
      input_1:
        source: branch_b/out_file1
    state:
      mode: first_non_null
  ```

  Inputs are named `input_0` … `input_{N-1}`. The single output is named `output`. The editor exposes one extra empty terminal for grow-on-connect (PR body §"get_all_inputs()").
- **Mapping over collections is supported** (`_execute_mapped`, modules.py ~2130). When inputs are collections, the module iterates per-element. Output shape: `list` for the scalar modes, `list:list` for `all_non_null` (modules.py ~2211–2215).
- **CWL importer not yet wired.** The PR body explicitly says "Once CWL import integration is added, it will unblock 27+ CWL v1.2 conditional conformance tests." The *runtime* is in `main` as of 2026-03-31; the *importer* mapping `pickValue → pick_value` is future work. Translator Molds cannot yet punt to Galaxy's CWL importer — the gxformat2 file we emit must already contain the `pick_value` step.

## Mapping table

| CWL position | CWL mode | Galaxy translation |
| --- | --- | --- |
| `WorkflowOutputParameter.outputSource: [a, b, …]` + `pickValue: first_non_null` | `first_non_null` | Insert a `type: pick_value` step with `state.mode: first_non_null`, `input_0: a`, `input_1: b`, …. Wire the pick step's `output` into the workflow `outputs:` block. Direct mapping. |
| Same, `the_only_non_null` | `the_only_non_null` | Same shape; `mode: the_only_non_null`. Direct mapping. |
| Same, `all_non_null` | `all_non_null` | Same shape; `mode: all_non_null`. **Output type changes**: workflow output becomes a `list` HDCA. Surface to consumers. |
| `WorkflowStepInput.source: [a, b]` + `pickValue` | any | Insert a `pick_value` step **upstream** of the consuming step; rewire the step input to consume the pick step's `output`. There is no inline-pick on a step's input in gxformat2 — it must be a real step. (Inference; PR adds a module, not an input-side attribute.) |
| `pickValue` over all-null inputs | `first_non_null` / `the_only_non_null` | Galaxy raises `FailWorkflowEvaluation` — matches CWL "It is an error if there is no non-null element". |
| Workflow author wants "skipped" rather than "fail" on all-null | *(no CWL mode)* | Use Galaxy-only `first_or_skip`. **Flag in translator that this is a Galaxy extension, not CWL semantics.** Round-tripping back to CWL would require codifying. |

Cases that **don't** translate cleanly:

- **`scatter` + `pickValue` on the same step input.** Galaxy supports per-element mapping, but the composition is unusual in CWL; verify per-fixture (inference).
- **Deeply nested `linkMerge: merge_nested` (>1 level).** Galaxy `pick_value` operates at first level only (inference from MODES + execute logic); deeply nested cases may need a translator flag.

## Translation guidance for `cwl-summary-to-galaxy-data-flow`

Given a `summary-cwl.json` whose `graph.edges[].via` contains `"pickValue:<mode>"` (or whose `workflow_outputs[].output_source` is multi-valued — when the typed-`pick_value` field is added to the schema, prefer that):

1. **Detect by edge fan-in pattern.** Group edges by `to` (workflow-output id or step-input id) where `via` contains a `pickValue:*` token. Each group becomes one `pick_value` step.
2. **Emit a `pick_value` step per group.** Suggested step id `pick_<output_id>`. Inputs `input_0`, `input_1`, … in CWL declaration order. `state.mode` is the CWL mode verbatim.
3. **Rewire the workflow output** to read from the new pick step's `output` rather than the multi-source `outputSource` array.
4. **When `pickValue` is on a step input**, insert the `pick_value` step upstream of that step and rewire its input to a single source.
5. **Preserve upstream `when:` predicates** unchanged. `pick_value` consumes whatever each branch emits (real dataset or skipped HDA) and decides at execution.
6. **Type-shape warning for `all_non_null`**: the workflow output type changes from a CWL scalar `T` (post-pickValue) to a Galaxy `list` HDCA. Surface in the brief.
7. **Do not invent a "pick non-empty" custom tool.** Use the native `pick_value` module — prior Foundry recommendations to synthesize a picker step are superseded.
8. **Two-sibling-workflow fallback** stays valid for readability when the entire DAG splits cleanly on a single mode predicate (IWC convention: see `EBI-Metagenomics/pipeline-v5` ↔ `amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-quality-control-paired-end` / `…-single-end`). With #22222 merged, the single-workflow `pick_value` translation is now also viable; the template Mold may choose either.

## Risks, gotchas, open issues

- **Importer not wired** (PR-observed). Translators must emit the `pick_value` step themselves; Galaxy's CWL importer won't convert `pickValue` automatically yet.
- **No CWL-direct mode for `first_or_skip`.** Translator should never silently emit it from CWL input — only when the human author asks for skip-propagation semantics.
- **`the_only_non_null` is strict.** Fails on `>1` non-null too. Don't swap modes during translation.
- **Empty `all_non_null` result is legal.** Downstream tools must accept empty collections.
- **`pick_value` is a *step*, not a *step-input attribute*.** Translator can't represent a CWL inline `pickValue` on a step input without adding a real Galaxy step — step count increases vs CWL.
- **Mapped-collection output shape.** `all_non_null` over mapped inputs yields `list:list`. Consumers expecting flat `list` will break.
- **Galaxy version floor.** This module landed on `main` 2026-03-31. Workflows using `type: pick_value` will not import on older Galaxy releases. Translator should emit a metadata note / required-version hint when the draft uses `pick_value`.
- **`summary-cwl` schema gap.** The Foundry's `summary-cwl.json` schema currently encodes workflow-level `pickValue` only via edge `via` markers; first-class `pick_value` on `WorkflowOutput` would make detection trivial. Open work tracked in `content/molds/summarize-cwl/refinements/2026-05-11-mgnify-seqprep-subwf.md`.

## Citations

- PR metadata + body: <https://github.com/galaxyproject/galaxy/pull/22222>.
- `PickValueModule` implementation: `lib/galaxy/workflow/modules.py` lines 1951–2128 at PR head (mode list, error semantics, null detection, mapped execution).
- gxformat2 surface examples: `lib/galaxy_test/workflow/pick_value_first_non_null_mapped.gxwf.yml`, `pick_value_all_non_null_mapped.gxwf.yml`, `pick_value_skip_pja.gxwf.yml` at PR head.
- CWL spec: `PickValueMethod` doc strings in <https://raw.githubusercontent.com/common-workflow-language/cwl-v1.2/main/Workflow.yml>; rendered at <https://www.commonwl.org/v1.2/Workflow.html#PickValueMethod>.
- IWC fallback exemplar: `amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-quality-control-paired-end` / `…-single-end` (sibling-workflows convention).

## Evidence quality

- **PR-observed (concrete)**: module type, modes, gxformat2 surface, mapped-collection output shape, importer not yet wired, version floor.
- **CWL-spec (concrete)**: mode definitions and error conditions; placement on `WorkflowStepInput` and `WorkflowOutputParameter`.
- **Inference (marked inline)**: `pickValue` composing with `when:`; step-input-side translation requiring an upstream step; `scatter + pickValue` rarity; deeply-nested `linkMerge` interaction.
