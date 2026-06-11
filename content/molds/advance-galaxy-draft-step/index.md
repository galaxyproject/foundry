---
type: mold
name: advance-galaxy-draft-step
axis: target-specific
target: galaxy
tags:
  - mold
  - target/galaxy
status: draft
created: 2026-06-02
revised: 2026-06-02
revision: 1
ai_generated: true
summary: "Advance the gxformat2 draft by one step: pick the next drafty step, resolve a wrapper, implement the step, and validate."
loop_endstate: "It owns its own endstate oracle (`gxwf draft-next-step`) and concretizes one drafty step per call; re-invoke until it reports `draft: false`, then continue."
input_artifacts:
  - id: galaxy-workflow-draft
    description: "gxformat2 draft (see [[galaxy-workflow-draft-format]]) mutated in-place across iterations; topology is fully concrete, individual tool steps may still carry `TODO_*` sentinels and `_plan_*` planning fields."
output_artifacts:
  - id: galaxy-workflow-draft
    kind: yaml
    default_filename: galaxy-workflow-draft.gxwf.yml
    schema: "[[galaxy-workflow-draft]]"
    description: "Same draft with one additional step concretized (one loop iteration). Once every step is concrete, [[draft-next-step]] reports `draft: false` and the harness exits the loop."
references:
  - kind: schema
    ref: "[[galaxy-workflow-draft]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: cast-validated
    purpose: "In/out contract: the draft this Mold reads and mutates one step per iteration conforms to [[galaxy-workflow-draft]]. Cast bundles the JSON Schema alongside the [[draft-validate]] CLI checks."
  - kind: cli-command
    ref: "[[draft-next-step]]"
    used_at: runtime
    load: upfront
    mode: sidecar
    evidence: hypothesis
    purpose: "Deterministically pick the next drafty step (or report no remaining work). The orchestrator owns the loop oracle so the harness reduces to `while draft: invoke skill`."
    trigger: "At the start of every iteration, before any per-step work."
    verification: "Cast the skill, run on a multi-step IWC-derived draft, confirm the orchestrator picks one step per call and exits when draft: false."
  - kind: cli-command
    ref: "[[draft-validate]]"
    used_at: runtime
    load: on-demand
    mode: sidecar
    evidence: hypothesis
    purpose: "Validate the mutated draft against draft-contract rules and, with --concrete, also gate the extracted concrete subset (including the step just implemented) against full gxformat2."
    trigger: "After implementing or modifying the chosen step in the draft."
    verification: "Cast the skill, exercise on an IWC-derived draft, confirm both draft-contract diagnostics and concrete-projection diagnostics route back to the step the iteration touched."
  - kind: schema
    ref: "[[galaxy-tool-summary]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Bind the chosen step against the deterministic tool summary manifest emitted by [[summarize-galaxy-tool]] — read `parsed_tool` for ports/datatypes and `input_schemas.workflow_step_linked` for valid step `tool_state` shape."
    trigger: "After a wrapper has been resolved for the chosen step and before implementing it."
  - kind: research
    ref: "[[galaxy-tool-job-failure-reference]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Classify [[draft-validate]] diagnostics against wrapper-defined runtime failure semantics so the iteration routes back to the right authoring surface (implementation vs. wrapper choice)."
    trigger: "When draft-validate fails after a step has been implemented, or when a selected wrapper has explicit failure semantics that may surface at runtime."
related_molds:
  - "[[discover-shed-tool]]"
  - "[[author-galaxy-tool-wrapper]]"
  - "[[summarize-galaxy-tool]]"
  - "[[implement-galaxy-tool-step]]"
  - "[[validate-galaxy-workflow]]"
related_notes:
  - "[[galaxy-workflow-draft-format]]"
  - "[[galaxy-data-flow-draft-contract]]"
---

# advance-galaxy-draft-step

Orchestrator Mold for the per-step Galaxy authoring loop. One invocation advances the gxformat2 draft by **one** step: pick → resolve a wrapper → summarize the wrapper → implement the step → validate. The harness loop reduces to `while (gxwf draft-next-step <wf>).draft: invoke skill`.

This Mold is **single-entry, single-exit**: it owns the loop oracle ([[draft-next-step]]) and the per-step validator ([[draft-validate]] `--concrete`). Iterations terminate when the draft has no remaining drafty steps; the harness then drops out of the loop and proceeds to terminal validation via [[validate-galaxy-workflow]].

## Sequence

1. **Pick.** Run [[draft-next-step]]. If `draft: false`, return — the loop is done. Otherwise carry the chosen step id forward.
2. **Resolve a wrapper.** Branch on whether the template already pinned wrapper identity (see the tiers in [[galaxy-workflow-draft-format]]):
   - **Identity-pinned** — `tool_id` is concrete and `tool_version` is `TODO`. Treat the pin as a strong seed: confirm it via [[discover-shed-tool]] and resolve the changeset, correcting the `tool_id` only if discovery contradicts the pin (a pinned id is high-confidence template evidence, not a guess to re-derive from scratch).
   - **Deferred** — `tool_id` is `TODO`. Search fresh: run [[discover-shed-tool]] against the step's `_plan_*` context.

   Either way, if no acceptable shed candidate emerges, fall through to [[author-galaxy-tool-wrapper]].
3. **Summarize the wrapper.** Invoke [[summarize-galaxy-tool]] on the resolved wrapper to produce a [[galaxy-tool-summary]] for the next phase.
4. **Implement.** Invoke [[implement-galaxy-tool-step]] with the summary and the draft; it resolves the chosen step's remaining `TODO_*` / `_plan_*` slots into a concrete `tool_id` (confirming or correcting any pinned identity), `tool_version`, `tool_state`, and wrapper-determined port names.
5. **Validate.** Run [[draft-validate]] `--concrete` over the mutated draft. On green, return; the next iteration starts at step 1. On red, route per the failure-routing rules below.

## Failure routing

`draft-validate --concrete` failures fall into three buckets:

- **Local to the just-implemented step** (sentinel violation, wrong port name, malformed `tool_state`) — re-enter [[implement-galaxy-tool-step]] with the diagnostic.
- **Wrapper-choice mismatch** (selected wrapper cannot satisfy the step's `_plan_*` contract — wrong datatype, missing parameter, incompatible collection shape) — back out to step 2 and pick a different wrapper, either via [[discover-shed-tool]] with refined criteria or by escalating to [[author-galaxy-tool-wrapper]].
- **Earlier-step defect surfaced by the growing concrete projection** (e.g. a connection that looked fine in isolation breaks once a downstream step pulls a previously-deferred port into scope) — flag to the user. The orchestrator does not unwind prior iterations on its own; cross-step rework belongs at the harness level. *Open question: at what threshold should this Mold attempt to re-enter [[implement-galaxy-tool-step]] for an earlier step versus always escalating?*

Consult [[galaxy-tool-job-failure-reference]] when the wrapper has explicit failure semantics that affect routing — strict-shell behavior, dynamic outputs, or non-default stdio rules can present as wrapper-choice mismatches even when the static shape validates.

## Why orchestrator-shaped

Prior pipelines expressed the iteration as four entries: a `discover-or-author` branch plus `summarize-galaxy-tool`, `implement-galaxy-tool-step`, and `validate-galaxy-step`. Collapsing them into one orchestrator keeps the per-iteration narrative — including the discover-or-author branch and the failure-routing rules — in a single procedural surface that the cast skill can render coherently. Leaf Molds stay independently castable for ad-hoc invocation; only the pipeline shape changes.
