---
type: mold
name: advance-galaxy-draft-step
axis: target-specific
target: galaxy
tags:
  - mold
  - target/galaxy
status: reviewed
created: 2026-06-02
revised: 2026-07-24
revision: 3
ai_generated: true
summary: "Advance the gxformat2 draft by one step: pick the next drafty step, resolve a wrapper, implement the step, and validate."
loop_endstate: "It owns its own endstate oracle (`gxwf draft-next-step`) and concretizes one drafty step per call; re-invoke until it reports `draft: false`, then it extracts the concrete `galaxy-workflow.gxwf.yml` (via `gxwf draft-extract`) and continues."
input_artifacts:
  - id: galaxy-workflow-draft
    description: "gxformat2 draft (see [[galaxy-workflow-draft-format]]) mutated in-place across iterations; topology is fully concrete, individual tool steps may still carry `TODO_*` sentinels and `_plan_*` planning fields."
  - id: open-requirements-ledger
    description: "Carried obligations ledger [[open-requirements-ledger]]: after implementing the chosen step, read it for a new `open` blocking entry [[implement-galaxy-tool-step]] appended (the step's declared output can't be computed from its wired inputs), and count open blocking entries for the escalation convergence gate."
output_artifacts:
  - id: galaxy-workflow-draft
    kind: yaml
    default_filename: galaxy-workflow-draft.gxwf.yml
    schema: "[[galaxy-workflow-draft]]"
    description: "Same draft with one additional step concretized (one loop iteration). Once every step is concrete, [[draft-next-step]] reports `draft: false` and the harness exits the loop."
  - id: galaxy-workflow
    kind: yaml
    default_filename: galaxy-workflow.gxwf.yml
    description: "Concrete gxformat2 workflow (`class: GalaxyWorkflow`) extracted from the fully-concretized draft at loop endstate via [[draft-extract]]: drafty steps dropped, `_plan_*` planning fields stripped, class promoted. The runnable, testable artifact that downstream Molds ([[implement-galaxy-workflow-test]], [[validate-galaxy-workflow]], [[run-workflow-test]]) consume."
  - id: open-requirements-ledger
    kind: yaml
    default_filename: open-requirements.ledger.yml
    description: "Same ledger carried through the iteration: a blocking entry [[implement-galaxy-tool-step]] appended is routed to [[repair-galaxy-draft-topology]] and returns marked `resolved` or `surrendered`."
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
  - kind: cli-command
    ref: "[[draft-extract]]"
    used_at: runtime
    load: on-demand
    mode: sidecar
    evidence: hypothesis
    purpose: "At loop endstate, extract the concrete gxformat2 workflow from the fully-concretized draft — drop drafty steps, strip `_plan_*` fields, promote `class` to `GalaxyWorkflow` — and write it as the runnable `galaxy-workflow.gxwf.yml`."
    trigger: "When [[draft-next-step]] reports `draft: false` (no remaining drafty steps)."
    verification: "Cast the skill, run the loop to endstate on an IWC-derived draft, confirm draft-extract emits a `class: GalaxyWorkflow` file that passes terminal `gxwf validate` with no `_plan_*` fields or drafty steps."
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
  - kind: research
    ref: "[[open-requirements-ledger]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Recognize the blocking entry [[implement-galaxy-tool-step]] appends (its shape and `open | resolved | surrendered` status) so the orchestrator can detect the raised computability gap, count open blocking entries for the convergence gate, and escalate to [[repair-galaxy-draft-topology]]."
    verification: "Promote after a run where a blocking entry appended by implement is detected here and drives an escalation that strictly reduces the open count."
related_molds:
  - "[[discover-shed-tool]]"
  - "[[author-galaxy-tool-wrapper]]"
  - "[[summarize-galaxy-tool]]"
  - "[[implement-galaxy-tool-step]]"
  - "[[repair-galaxy-draft-topology]]"
  - "[[validate-galaxy-workflow]]"
related_notes:
  - "[[galaxy-workflow-draft-format]]"
  - "[[galaxy-data-flow-draft-contract]]"
  - "[[open-requirements-ledger]]"
---

# advance-galaxy-draft-step

Orchestrator Mold for the per-step Galaxy authoring loop. One invocation advances the gxformat2 draft by **one** step: pick → resolve a wrapper → summarize the wrapper → implement the step → validate. The harness loop reduces to `while (gxwf draft-next-step <wf>).draft: invoke skill`.

This Mold is **single-entry, single-exit**: it owns the loop oracle ([[draft-next-step]]) and the per-step validator ([[draft-validate]] `--concrete`). Iterations terminate when the draft has no remaining drafty steps; on that terminal call the Mold extracts the concrete `galaxy-workflow.gxwf.yml` (via [[draft-extract]]) — that promoted-class workflow, not the `-draft` file, is what downstream Molds test and run — and the harness then drops out of the loop and proceeds to terminal validation via [[validate-galaxy-workflow]].

## Sequence

1. **Pick.** Run [[draft-next-step]]. If `draft: false`, the loop is done: run [[draft-extract]] to emit the concrete `galaxy-workflow.gxwf.yml` (drafty steps dropped, `_plan_*` stripped, `class` promoted to `GalaxyWorkflow`), then return. Otherwise carry the chosen step id forward.
2. **Resolve a wrapper.** First split on whether the step's tool is a **built-in / stock** Galaxy tool — a bare id with no `owner/repo` path (`Filter1`, `sort1`, `Cut1`, `Show beginning1`, collection ops, `__APPLY_RULES__`):
   - **Built-in / stock** — the bare id *is* the wrapper identity; it does **not** route through [[discover-shed-tool]] (Tool Shed search) or [[author-galaxy-tool-wrapper]]. Only its concrete version needs resolving: the shed serves stock tools by bare id, but its TRS version-list endpoint can't auto-resolve the version, so read it from a populated cache via `galaxy-tool-cache list` or take a known pin from the step plan — never hand-guess a stock version. [[summarize-galaxy-tool]] then performs the bare-id `add`/`summarize` with that explicit `--tool-version`.
   - **Tool Shed wrapper** — branch on whether the template already pinned wrapper identity (see the tiers in [[galaxy-workflow-draft-format]]):
     - **Identity-pinned** — `tool_id` is concrete and `tool_version` is `TODO`. Treat the pin as a strong seed: confirm it via [[discover-shed-tool]] and resolve the changeset, correcting the `tool_id` only if discovery contradicts the pin (a pinned id is high-confidence template evidence, not a guess to re-derive from scratch).
     - **Deferred** — `tool_id` is `TODO`. Search fresh: run [[discover-shed-tool]] against the step's `_plan_*` context.

     Either way, if no acceptable shed candidate emerges, fall through to [[author-galaxy-tool-wrapper]].
3. **Summarize the wrapper.** Invoke [[summarize-galaxy-tool]] on the resolved wrapper to produce a [[galaxy-tool-summary]] for the next phase.
4. **Implement.** Invoke [[implement-galaxy-tool-step]] with the summary and the draft; it resolves the chosen step's remaining `TODO_*` / `_plan_*` slots into a concrete `tool_id` (confirming or correcting any pinned identity), `tool_version`, `tool_state`, and wrapper-determined port names.
5. **Check computability.** Inspect the [[open-requirements-ledger]] for a new `open` blocking entry [[implement-galaxy-tool-step]] appended against this step — a declared output that can't be computed from its wired inputs. [[draft-validate]] cannot catch this: the connection graph knows ports connect, not what they carry, so the draft validates green even though the step can't run. If such an entry is present, escalate to [[repair-galaxy-draft-topology]] for a bounded repair (insert a producer/sub-path or honestly narrow the output); it marks the entry `resolved`, or `surrendered` when no producer is reachable. Each escalation must strictly reduce the open blocking-entry count, under a hard escalation cap; track both in the ledger's `topology_repair` block (increment `escalations`, append the post-repair open count to `open_history`, surrender once `escalations` reaches `cap`). A surrendered entry stays open and is written into the final draft as a labelled gap rather than fabricated. Then return — the next iteration resumes the loop, realizing any draft-tier steps the repair inserted. With no new blocking entry, continue to validation.
6. **Validate.** Run [[draft-validate]] `--concrete` over the mutated draft. On green, return; the next iteration starts at step 1. On red, route per the failure-routing rules below.

## Failure routing

`draft-validate --concrete` failures fall into three buckets:

- **Local to the just-implemented step** (sentinel violation, wrong port name, malformed `tool_state`) — re-enter [[implement-galaxy-tool-step]] with the diagnostic.
- **Wrapper-choice mismatch** (selected wrapper cannot satisfy the step's `_plan_*` contract — wrong datatype, missing parameter, incompatible collection shape) — back out to step 2 and pick a different wrapper, either via [[discover-shed-tool]] with refined criteria or by escalating to [[author-galaxy-tool-wrapper]].
- **Earlier-step defect surfaced by the growing concrete projection** (e.g. a connection that looked fine in isolation breaks once a downstream step pulls a previously-deferred port into scope) — flag to the user. The orchestrator does not unwind prior iterations on its own; cross-step rework belongs at the harness level. *Open question: at what threshold should this Mold attempt to re-enter [[implement-galaxy-tool-step]] for an earlier step versus always escalating?*

These are red-`draft-validate` buckets. The fourth escalation path — a step output uncomputable from its wired inputs — is **not** one of them: the draft validates green there, so it is detected from the ledger in step 5 above, not from a validation failure.

Consult [[galaxy-tool-job-failure-reference]] when the wrapper has explicit failure semantics that affect routing — strict-shell behavior, dynamic outputs, or non-default stdio rules can present as wrapper-choice mismatches even when the static shape validates.

## Why orchestrator-shaped

Prior pipelines expressed the iteration as four entries: a `discover-or-author` branch plus `summarize-galaxy-tool`, `implement-galaxy-tool-step`, and `validate-galaxy-step`. Collapsing them into one orchestrator keeps the per-iteration narrative — including the discover-or-author branch and the failure-routing rules — in a single procedural surface that the cast skill can render coherently. Leaf Molds stay independently castable for ad-hoc invocation; only the pipeline shape changes.
