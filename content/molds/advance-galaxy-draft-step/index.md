---
type: mold
name: advance-galaxy-draft-step
axis: target-specific
target: galaxy
tags:
  - target/galaxy
status: reviewed
created: 2026-06-02
revised: 2026-10-22
revision: 12
summary: "Advance the gxformat2 draft by one step: pick the next drafty step, resolve a wrapper, implement the step, and validate."
loop_endstate: "It owns its own endstate oracle (`gxwf draft-next-step`) and concretizes one drafty step per call; re-invoke until it reports `draft: false`, then it extracts the concrete `galaxy-workflow.gxwf.yml` (via `gxwf draft-extract`) and continues."
input_artifacts:
  - id: galaxy-workflow-draft
    description: "gxformat2 draft (see [[galaxy-workflow-draft-format]]) mutated in-place across iterations; topology is fully concrete, individual tool steps may still carry `TODO_*` sentinels and `_plan_*` planning fields."
  - id: open-requirements-ledger
    description: "Carried obligations ledger [[open-requirements-ledger]]: the run's open, resolved, and surrendered entries with their provenance. Absent on the first Mold of a run; start an empty one."
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
    description: "Carried obligations ledger re-emitted by this step: entries it appended or closed updated, every other entry passed through with its provenance intact."
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
    purpose: "Validate the draft and its concrete subset with --concrete --strict-state --json; skipped tool-state checks must fail the gate."
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
  - kind: cli-command
    ref: "[[add]]"
    used_at: runtime
    load: on-demand
    mode: sidecar
    evidence: corpus-observed
    purpose: "Cache the resolved wrapper for summarization and validation, using its confirmed tool version. For a stock tool, add confirms the version: the shed serves it, or Galaxy's declared equivalent, which then becomes the pin."
    trigger: "After resolving the wrapper and version, if the shared cache lacks that pin."
    verification: "Confirm add caches the resolved pin and draft-validate --concrete --strict-state --json validates its state using the same --cache-dir."
  - kind: cli-command
    ref: "[[list]]"
    used_at: runtime
    load: on-demand
    mode: sidecar
    evidence: corpus-observed
    purpose: "Read a stock tool's cached version when the step plan has no version pin."
    trigger: "In step 2, when the chosen step's tool is a bare/stock id and its concrete version isn't already known from a step-plan pin."
    verification: "Cast the skill, populate a cache with a stock tool, run list --json, confirm the reported version is what add's --tool-version uses for that bare id."
  - kind: schema
    ref: "[[galaxy-tool-summary]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Bind the chosen step against the deterministic tool summary manifest emitted by [[summarize-galaxy-tool]] — read `parsed_tool` for ports/datatypes and `input_schemas.workflow_step_linked` for valid step `state` shape."
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
    ref: "[[galaxy-collection-tools]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Find a built-in collection operation that meets a step's plan, and its newest version at the page's Galaxy commit."
    trigger: "In step 2, when the chosen step's `tool_id` is `TODO`, or its tool is a stock collection operation whose version the step plan and the cache don't give."
  - kind: research
    ref: "[[galaxy-apply-rules-dsl]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Write an Apply Rules step's `rules` against the identifiers each level of its input carries, which for a paired level are `forward`, `reverse` and `unpaired`."
    trigger: "In step 4, when the chosen step's tool is `__APPLY_RULES__`."
  - kind: research
    ref: "[[open-requirements-ledger]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Read the ledger after each step implementation for a newly appended blocking entry, count the open blocking entries the convergence gate reads, and maintain the topology_repair escalation budget the loop's termination guard depends on."
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

Choose a writable tool-cache directory for the run. Pass the same `--cache-dir <dir>` to cache commands, wrapper summarization, and validation.

1. **Pick.** Run [[draft-next-step]]. If `draft: false`, the loop is done: run [[draft-extract]] to emit the concrete `galaxy-workflow.gxwf.yml` (drafty steps dropped, `_plan_*` stripped, `class` promoted to `GalaxyWorkflow`), then return. Otherwise carry the chosen step id forward.
2. **Resolve a wrapper.** First check for an existing pin:
   - **Already resolved in this draft** — find a concrete step with the `tool_id` named by the chosen step's `_plan_*` context or identity pin. Reuse its `tool_id` and `tool_version`, skipping [[discover-shed-tool]] for Tool Shed wrappers or cache/version lookup for stock tools. Continue to step 3.
   - **Inline tool** — the step carries `run:` with `class: GalaxyUserTool`, which [[author-galaxy-tool-wrapper]] wrote. That is its wrapper: skip discovery, the cache and [[summarize-galaxy-tool]], and go to step 4, binding ports from the tool's own `inputs` and `outputs`. The step has no `tool_id` or `tool_version`; never add one.

   Otherwise, split on whether the step's tool is a **built-in / stock** Galaxy tool — a bare id with no `owner/repo` path (`Filter1`, `sort1`, `Cut1`, `Show beginning1`, collection ops, `__APPLY_RULES__`):
   - **Built-in / stock** — the bare id *is* the wrapper identity; it does **not** route through [[discover-shed-tool]] (Tool Shed search) or [[author-galaxy-tool-wrapper]]. Only its concrete version needs resolving. The shed serves stock tools by bare id, but its TRS version-list endpoint can't list their versions, so take the version from the first of these that names one:
     - a pin in the step plan;
     - the run's cache, via `galaxy-tool-cache list`;
     - for a collection operation, the version [[galaxy-collection-tools]] lists.

     Never hand-guess a version none of these names; a built-in that isn't a collection operation still needs a plan pin or a cached version. When none names one, append a non-blocking `gap` entry for the step naming the sources you checked, leave the draft unchanged, and return. A missing version is not a computability gap, so it never goes to [[repair-galaxy-draft-topology]]. [[add]] `<id> --tool-version <v>` then confirms it. The shed may serve Galaxy's declared equivalent instead (see [[add]]); re-run `add` with the version it reported and pin that. [[summarize-galaxy-tool]] then performs the bare-id `add`/`summarize` with that explicit `--tool-version`.

     When the step's `tool_id` is `TODO`, check the built-in collection operations in [[galaxy-collection-tools]] against its plan first, because [[discover-shed-tool]]'s Tool Shed search doesn't index built-ins and can't find one. Only when no built-in meets the plan, treat it as a deferred Tool Shed step.
   - **Tool Shed wrapper** — branch on whether the template already pinned wrapper identity (see the tiers in [[galaxy-workflow-draft-format]]):
     - **Identity-pinned** — `tool_id` is concrete and `tool_version` is `TODO`. Treat the pin as a strong seed: confirm it via [[discover-shed-tool]] and resolve the changeset, correcting the `tool_id` only if discovery contradicts the pin (a pinned id is high-confidence template evidence, not a guess to re-derive from scratch).
     - **Deferred** — `tool_id` is `TODO` and no built-in meets the plan. Search fresh: run [[discover-shed-tool]] against the step's `_plan_*` context.

     Either way, if no acceptable shed candidate emerges, the step needs a tool written. Append an open, non-blocking `kind: needs_tool` entry for the step ([[open-requirements-ledger]]): `unmet` says what the tool must do, and `missing` gives the searches you ran and why each candidate failed. Leave the draft unchanged and invoke [[author-galaxy-tool-wrapper]] on it, which writes the tool inline as the step's `run:` and resolves the entry. When this call can't invoke it, return with the entry open, and the harness escalates it. Never write a wrapper yourself, run [[add]] on a local file, or pin a Tool Shed id that discovery didn't return.

     If authoring can't meet the declared output either, because the output needs something no tool can compute from the step's wired inputs, that is a computability gap: append a blocking ledger entry for this step, citing the searches you ran and any related entry's id, and go to step 5.

   If the resolved pin is absent from the cache, run [[add]] `<tool_id> --tool-version <v> --cache-dir <dir>` before summarization. In `@galaxy-tool-util/cli` 1.10.0, validation also fetches and caches missing metadata unless `--offline` is set; offline validation requires a populated cache.
3. **Summarize the wrapper.** If step 2 reused a sibling's pin, reuse the cached [[galaxy-tool-summary]] for that `tool_id`/`tool_version` pair. Otherwise, invoke [[summarize-galaxy-tool]] to produce the summary.
4. **Implement.** Invoke [[implement-galaxy-tool-step]] with the summary and the draft; it resolves the chosen step's remaining `TODO_*` / `_plan_*` slots into a concrete `tool_id` (confirming or correcting any pinned identity), `tool_version`, `state`, and wrapper-determined port names.

   For `__APPLY_RULES__`, write each rule against the identifiers Galaxy gives the input's levels ([[galaxy-apply-rules-dsl]]). A paired level is `forward`/`reverse`, or `unpaired` for a single read, whatever the input's `fields` or sample-sheet columns are named. Each mapped identifier must also be unique per dataset, or the later dataset replaces the earlier one. A sample-sheet column can repeat across rows, such as one sample with several runs, so key on the row's identifier (`identifier0`) or add it where a column repeats. [[draft-validate]] doesn't run the rules, so a regex that misses those names, or a collision, validates green; the first fails every job and the second silently loses reads.
5. **Check computability.** Inspect the [[open-requirements-ledger]] for an `open` blocking entry against this step: one that step 2 or [[implement-galaxy-tool-step]] appended, or one an earlier Mold raised. [[draft-validate]] cannot catch this: the connection graph knows ports connect, not what they carry, so the draft validates green even though the step can't run. If such an entry is present, escalate to [[repair-galaxy-draft-topology]] for a bounded repair (insert a producer/sub-path or honestly narrow the output), then update the ledger's `topology_repair` budget as the ledger note directs — each escalation must strictly reduce the open blocking-entry count, under a hard cap, and surrender rather than retry once the cap is reached. Then return — the next iteration resumes the loop, realizing any draft-tier steps the repair inserted. With no such entry, continue to validation.
6. **Validate.** Run [[draft-validate]] `<draft> --concrete --strict-state --json --cache-dir <dir>`. `--strict-state` makes skipped tool-state checks fail validation; draft structure and topology checks still run. If metadata is unavailable, resolve the cache or fetch error and retry. Return on exit 0; route other failures using the JSON diagnostics and the rules below.

## How a call ends

A call before the terminal one ends in one of five ways:

- the picked step is concrete and validates;
- [[repair-galaxy-draft-topology]] changed the draft around it;
- the step is blocked: a blocking ledger entry this call appended or updated names it, left open when no repair closed it, and surrendered once the escalation cap is reached;
- the step's built-in tool has no version any source names: a non-blocking `gap` entry this call appended names the step and the sources checked;
- the step needs a tool written: an open `kind: needs_tool` entry this call appended names it, and [[author-galaxy-tool-wrapper]] hasn't run yet.

Never return with the draft unchanged and none of these entries: that reports no work as success. Only the terminal call runs [[draft-extract]]; an earlier extract is a partial workflow.

## Failure routing

`draft-validate --concrete --strict-state --json` failures, after resolving metadata availability, fall into three buckets:

- **Local to the just-implemented step** (sentinel violation, wrong port name, malformed `state`) — re-enter [[implement-galaxy-tool-step]] with the diagnostic.
- **Wrapper-choice mismatch** (selected wrapper cannot satisfy the step's `_plan_*` contract — wrong datatype, missing parameter, incompatible collection shape) — back out to step 2 and pick a different wrapper, either via [[discover-shed-tool]] with refined criteria or by escalating to [[author-galaxy-tool-wrapper]].
- **Earlier-step defect surfaced by the growing concrete projection** (e.g. a connection that looked fine in isolation breaks once a downstream step pulls a previously-deferred port into scope) — flag to the user. The orchestrator does not unwind prior iterations on its own; cross-step rework belongs at the harness level. *Open question: at what threshold should this Mold attempt to re-enter [[implement-galaxy-tool-step]] for an earlier step versus always escalating?*

These are red-`draft-validate` buckets. The fourth escalation path — a step output uncomputable from its wired inputs — is **not** one of them: the draft validates green there, so it is detected from the ledger in step 5 above, not from a validation failure.

Consult [[galaxy-tool-job-failure-reference]] when the wrapper has explicit failure semantics that affect routing — strict-shell behavior, dynamic outputs, or non-default stdio rules can present as wrapper-choice mismatches even when the static shape validates.

## Why orchestrator-shaped

Prior pipelines expressed the iteration as four entries: a `discover-or-author` branch plus `summarize-galaxy-tool`, `implement-galaxy-tool-step`, and `validate-galaxy-step`. Collapsing them into one orchestrator keeps the per-iteration narrative — including the discover-or-author branch and the failure-routing rules — in a single procedural surface that the cast skill can render coherently. Leaf Molds stay independently castable for ad-hoc invocation; only the pipeline shape changes.
