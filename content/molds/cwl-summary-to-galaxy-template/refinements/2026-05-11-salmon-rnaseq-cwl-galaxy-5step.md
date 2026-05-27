---
mold: cwl-summary-to-galaxy-template
date: 2026-05-11
intent: 5-step CWL→Galaxy emulation on hubmapconsortium/salmon-rnaseq pipeline.cwl
decision: keep
---

## What worked

- Skeleton structurally validates via `gxwf validate --no-tool-state` despite carrying TODO `tool_id` / `tool_version` and TODO_-prefixed port names everywhere. `_plan_state` / `_plan_context` survives validation untouched.
- Collapsing the CWL `salmon` + `salmon-mouse` `when:` branches into one parameterized `salmon_alevin` step (per the data-flow brief's recommendation) produced a single linear path with no `pick_value` step — cleaner than mirroring the CWL shape.
- Flattening `salmon-quantification.cwl` into the main workflow eliminated a workflow boundary that exists in CWL only because the nested workflow was reused-by-design but is never actually reused.
- Per-step `_plan_context` blocks captured the source CWL filename for every step, which is what `implement-galaxy-tool-step` will need first.

## Gaps surfaced

1. **`gxwf validate --no-tool-state` accepts `TODO_*` connections without complaint.** This is fine — the eval explicitly says "draft is expected to *fail* a strict validate" — but `--no-tool-state` is permissive enough that it also misses real wiring bugs. Two of my output `outputSource: step/TODO_output_id` references would never resolve at runtime because the named outputs only exist in the matching step's `out:` list, where I also wrote `TODO_*`. The draft is internally consistent only by convention: I used the same TODO suffix on both sides. A stricter "TODO-aware" lint that requires `outputSource: X/Y` to match a `step X` with an `out: [{id: Y}]` would catch the cases where the suffix drifts. This is a gxwf concern more than a Mold concern, but the Mold could emit a self-check comment.

2. **Optional `image_directory` flowing into `squidpy_analysis` is wired but ungated.** Galaxy gxformat2 has no step-level `when:`, so the brief routes the conditional through "wrappers tolerate absent inputs". The skeleton wires `TODO_img_dir: image_directory` directly. This is correct for gxformat2 semantics but the per-step authoring Mold downstream needs to know the wrapper *must* accept absent input. The current `_plan_state` captures it for `squidpy_analysis` but not for `annotate_cells`, which also takes optional `image_directory` and `metadata_directory`. Tightening: every step that consumes an optional workflow input should call that out in `_plan_state` (or a dedicated `_plan_optional_inputs` field).

3. **No `_plan_test_*` or fixture hint slot.** The data-flow brief flagged "no tests discoverable" and the template Mold has nowhere to land that signal beyond a top-level `doc:`. Either the template emits a placeholder `_plan_tests` block at the workflow root or the format explicitly carries "test plan deferred" as a structured signal so `cwl-test-to-galaxy-test-plan` can pick it up without re-reading the data-flow brief.

## Open questions

- Strengthen `_plan_state` to require optional-input flags per step?
- Add a workflow-level `_plan_tests` / `_plan_fixtures` block to the gxformat2 draft format?
- Is it worth emitting a one-line `_plan_self_check` per step asserting that the `outputSource` suffix matches one of the listed `out:` ids, even when both sides are TODO?
