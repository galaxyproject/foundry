---
name: advance-galaxy-draft-step
description: "Advance the gxformat2 draft by one step: pick the next drafty step, resolve a wrapper, implement the step, and validate."
---

# advance-galaxy-draft-step

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Advance the gxformat2 draft by one step: pick the next drafty step, resolve a wrapper, implement the step, and validate.

## Inputs

- Read artifact `galaxy-workflow-draft`. Schema: galaxy-workflow-draft. Produced by `advance-galaxy-draft-step`, `cwl-summary-to-galaxy-template`, `freeform-summary-to-galaxy-template`, `implement-galaxy-tool-step`, `nextflow-summary-to-galaxy-template`. gxformat2 draft (see galaxy-workflow-draft-format) mutated in-place across iterations; topology is fully concrete, individual tool steps may still carry `TODO_*` sentinels and `_plan_*` planning fields.

## Outputs

- Write artifact `galaxy-workflow-draft` as `galaxy-workflow-draft.gxwf.yml`. Format: `yaml`. Schema: galaxy-workflow-draft. Same draft with one additional step concretized (one loop iteration). Once every step is concrete, draft-next-step reports `draft: false` and the harness exits the loop.

## Required Tools

- **`gxwf`** (gxwf). `npm install -g @galaxy-tool-util/cli`.
  Ephemeral run: `npx --package @galaxy-tool-util/cli gxwf`.
  Check: `gxwf --version`.
  Docs: https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli

## Load Upfront

- `references/cli/draft-next-step.json`: CLI command reference packaged as a sidecar. Deterministically pick the next drafty step (or report no remaining work). The orchestrator owns the loop oracle so the harness reduces to `while draft: invoke skill`. Use when: at the start of every iteration, before any per-step work.
- `references/schemas/galaxy-workflow-draft.schema.json`: Schema file copied verbatim into the bundle. In/out contract: the draft this Mold reads and mutates one step per iteration conforms to galaxy-workflow-draft. Cast bundles the JSON Schema alongside the draft-validate CLI checks.

## Load On Demand

- `references/cli/draft-validate.json`: CLI command reference packaged as a sidecar. Validate the mutated draft against draft-contract rules and, with --concrete, also gate the extracted concrete subset (including the step just implemented) against full gxformat2. Use when: after implementing or modifying the chosen step in the draft.
- `references/notes/galaxy-tool-job-failure-reference.md`: Research note copied verbatim into the bundle. Classify draft-validate diagnostics against wrapper-defined runtime failure semantics so the iteration routes back to the right authoring surface (implementation vs. wrapper choice). Use when: draft-validate fails after a step has been implemented, or when a selected wrapper has explicit failure semantics that may surface at runtime.
- `references/schemas/galaxy-tool-summary.schema.json`: Schema file copied verbatim into the bundle. Bind the chosen step against the deterministic tool summary manifest emitted by summarize-galaxy-tool — read `parsed_tool` for ports/datatypes and `input_schemas.workflow_step_linked` for valid step `tool_state` shape. Use when: after a wrapper has been resolved for the chosen step and before implementing it.

## Validation

- Validate `galaxy-workflow-draft.gxwf.yml` for artifact `galaxy-workflow-draft` against the galaxy-workflow-draft schema when a validator is available.

## Procedure

Orchestrator skill for the per-step Galaxy authoring loop. One invocation advances the gxformat2 draft by **one** step: pick → resolve a wrapper → summarize the wrapper → implement the step → validate. The harness loop reduces to `while (gxwf draft-next-step <wf>).draft: invoke skill`.

This skill is **single-entry, single-exit**: it owns the loop oracle (draft-next-step) and the per-step validator (draft-validate `--concrete`). Iterations terminate when the draft has no remaining drafty steps; the harness then drops out of the loop and proceeds to terminal validation via validate-galaxy-workflow.

### Sequence

1. **Pick.** Run draft-next-step. If `draft: false`, return — the loop is done. Otherwise carry the chosen step id forward.
2. **Resolve a wrapper.** Try discover-shed-tool against the step's `_plan_*` context; if no acceptable shed candidate emerges, fall through to author-galaxy-tool-wrapper.
3. **Summarize the wrapper.** Invoke summarize-galaxy-tool on the resolved wrapper to produce a galaxy-tool-summary for the next phase.
4. **Implement.** Invoke implement-galaxy-tool-step with the summary and the draft; it replaces the chosen step's `TODO_*` / `_plan_*` slots with concrete `tool_id`, `tool_state`, and wrapper-determined port names.
5. **Validate.** Run draft-validate `--concrete` over the mutated draft. On green, return; the next iteration starts at step 1. On red, route per the failure-routing rules below.

### Failure routing

`draft-validate --concrete` failures fall into three buckets:

- **Local to the just-implemented step** (sentinel violation, wrong port name, malformed `tool_state`) — re-enter implement-galaxy-tool-step with the diagnostic.
- **Wrapper-choice mismatch** (selected wrapper cannot satisfy the step's `_plan_*` contract — wrong datatype, missing parameter, incompatible collection shape) — back out to step 2 and pick a different wrapper, either via discover-shed-tool with refined criteria or by escalating to author-galaxy-tool-wrapper.
- **Earlier-step defect surfaced by the growing concrete projection** (e.g. a connection that looked fine in isolation breaks once a downstream step pulls a previously-deferred port into scope) — flag to the user. The orchestrator does not unwind prior iterations on its own; cross-step rework belongs at the harness level. *Open question: at what threshold should this skill attempt to re-enter implement-galaxy-tool-step for an earlier step versus always escalating?*

Consult galaxy-tool-job-failure-reference when the wrapper has explicit failure semantics that affect routing — strict-shell behavior, dynamic outputs, or non-default stdio rules can present as wrapper-choice mismatches even when the static shape validates.

### Why orchestrator-shaped

Prior pipelines expressed the iteration as four entries: a `discover-or-author` branch plus `summarize-galaxy-tool`, `implement-galaxy-tool-step`, and `validate-galaxy-step`. Collapsing them into one orchestrator keeps the per-iteration narrative — including the discover-or-author branch and the failure-routing rules — in a single procedural surface that the skill can render coherently. Leaf skills stay independently castable for ad-hoc invocation; only the pipeline shape changes.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
