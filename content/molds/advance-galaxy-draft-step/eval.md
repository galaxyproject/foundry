# advance-galaxy-draft-step eval

Evaluation oracle for the `advance-galaxy-draft-step` Mold and its CLI
companions (`gxwf draft-next-step` / `draft-validate` / `draft-extract`). This
file is the **abstract oracle**: properties any run must satisfy, independent of
fixture. Concrete fixtures and their expected values (the degraded-step fixture,
its picked step name, its TODO ports, the round-trip oracle) live in
`scenarios.md`; the oracle here is applied to whatever a scenario produces.
Properties are tagged by bucket:

- **picker** — does the loop oracle pick the right step and terminate?
- **validation** — does draft validation gate the draft correctly?
- **extract** — does the concrete projection stay a sound prefix?
- **implementation** — does a step get concretized without sentinels or fabrication?
- **routing** — does a failed iteration route back to the right surface?

## Property: draft-next-step picks the drafty step deterministically

- bucket: picker
- check: deterministic
- assertion: on a draft with at least one drafty step, `gxwf draft-next-step`
  reports `draft: true` and `step` names the next drafty step (the picker's
  topological + alphabetical tiebreak), and the pick is stable across re-runs.
  `work` lists the chosen step's `TODO[...]` sentinels followed by its `_plan_*`
  fields. Fails if a step other than the next-drafty pick is chosen, if the pick
  is non-deterministic across runs, or if `work` drops the sentinels/plan.

## Property: a fully concrete workflow terminates the loop

- bucket: picker
- check: deterministic
- assertion: on a `class: GalaxyWorkflow` (every step concrete, no `TODO_*`,
  no `_plan_*`), `gxwf draft-next-step` emits exactly `{ "draft": false }` — no
  `step`, no `work`. Guards against the orchestrator looping forever on an
  already-concrete workflow.

## Property: a well-formed draft validates clean before implementation

- bucket: validation
- check: deterministic
- assertion: `gxwf draft-validate <draft> --concrete` exits 0 (`draft valid`,
  `Concrete: OK`) on a well-formed draft whose drafty step still carries pending
  `TODO_*` / `_plan_*`. Validation philosophy: the drafty step is excluded from
  the concrete projection (validated over the steps that don't depend on it),
  not treated as malformed. Fails if pending sentinels make `draft-validate`
  error.

## Property: pre-implementation extract is the maximal concrete prefix

- bucket: extract
- check: deterministic
- assertion: `gxwf draft-extract <draft>` returns `class: GalaxyWorkflow` with
  all `_plan_*` stripped, omitting the drafty step **and** every step that
  depends on it, and dropping any `outputs` sourced from those omitted steps.
  Pre-implementation extract is a prefix, not the round-trip oracle —
  equivalence to the implemented oracle only holds after the drafty step is
  implemented.

## Property: one invocation advances exactly one step

- bucket: implementation
- check: llm-judged
- assertion: on a draft with two or more drafty tool steps and a fully concrete
  topology, one invocation of the cast skill advances the `draft-next-step`
  pick — resolves a wrapper, implements that one step, runs `draft-validate`
  `--concrete` — and leaves every other drafty step untouched. A call that goes
  straight to repair from step 1 resolves and implements nothing.

## Property: an implemented step leaves no TODO sentinel behind

- bucket: implementation
- check: deterministic + llm-judged
- assertion: after the cast skill implements the chosen step, that step's
  block contains **no** `TODO` / `TODO_*` token — `tool_id` is concrete, each
  output port is renamed from its `TODO_*` sentinel to the wrapper's real name,
  and every downstream consumer's source is repointed to that real name (no
  dangling `TODO_` reference to the step). Mechanically: `grep -c TODO` is 0 on
  the step's block and on references to its outputs; on the whole draft only
  at the loop endstate, since other drafty steps keep theirs mid-loop.
  Hallucination guardrail: a fabricated `tool_id` or an invented output port
  that doesn't match the resolved wrapper's summary is a failure, not a pass.

## Property: no source argument leaves the loop without a disposition

- bucket: implementation
- check: deterministic + llm-judged
- assertion: when the chosen step's `_plan_state` carried `resolved_args`
  before implementation, then by validation the ledger holds a record whose
  `source_arg` names that step and the entry's `id` for each flag of every
  entry `_plan_state` listed, per the ledger's **Source arguments** rules. The
  stripped `_plan_state` does not excuse a missing record.

## Property: the implemented loop round-trips to the oracle

- bucket: implementation
- check: llm-judged
- assertion: the extracted, class-promoted result is structurally equivalent to
  the fixture's round-trip oracle, modulo the deltas the fixture documents
  (tool_version / changeset drift, defensible `state` values,
  `hide` / `rename` UI choices, and export-only blocks not produced by the
  per-step loop). A structurally different wrapper is acceptable only if it
  satisfies the chosen step's `_plan_*` contract.

## Property: the loop terminates without per-step work on a concrete draft

- bucket: picker
- check: llm-judged
- assertion: when `draft-next-step` reports `draft: false`, the cast skill
  returns without invoking discover-or-author, summarize, or implement.

## Property: the last concretizing call emits the concrete workflow

- bucket: picker
- check: deterministic
- assertion: when an invocation concretizes the last drafty step, or a repair
  removes it, it leaves `gxwf draft-next-step` reporting `draft: false` and writes
  `galaxy-workflow.gxwf.yml` (`class: GalaxyWorkflow`, no `_plan_*`) before
  returning, without a further invocation.

## Property: only a miss falls through to authoring

- bucket: routing
- check: llm-judged
- assertion: the skill invokes [[author-galaxy-tool-wrapper]] only when
  [[discover-shed-tool]] returns `miss`. Authoring after a confirmed `weak`
  candidate, or for a found wrapper that can't serve the step, is a failure;
  that wrapper reaches [[repair-galaxy-draft-topology]] through a blocking entry
  naming it.

## Property: only recorded evidence skips wrapper resolution

- bucket: routing
- check: llm-judged
- assertion: an `open` blocking entry against the picked step that records the
  wrapper as confirmed absent, the author branch as ruled out, a found wrapper
  that can't serve the step, or why the wired inputs can't supply the step goes
  straight to [[repair-galaxy-draft-topology]]
  with no new search. An entry holding only Tool Shed misses or a tool version
  missing from a cache goes through wrapper resolution first.

## Property: open blocking entries reach repair before extract

- bucket: routing
- check: llm-judged
- assertion: once no drafty step is left, an `open` blocking entry on a realized
  step or with no `step` goes to [[repair-galaxy-draft-topology]] before
  [[draft-extract]] runs, and a call stops escalating at the cap. An earlier-step
  defect a structural edit closes appends a blocking entry and escalates.

## Property: the escalation budget tracks each repair

- bucket: routing
- check: deterministic + llm-judged
- assertion: each escalation raises `topology_repair.escalations` by one and
  appends the post-repair open blocking-entry count to `open_history`. A repair that
  leaves fewer entries than it found doesn't trip the gate, even when the count is
  higher than the last one in `open_history`. A repair that doesn't sets `escalations`
  to `cap`.

## Property: reuse a wrapper already pinned in the draft

- bucket: routing
- check: llm-judged
- assertion: when the chosen step's `tool_id` matches a `tool_id` already concrete
  on another step of the same draft, the skill adopts that sibling's `tool_id`
  and `tool_version` and reuses its tool summary, without invoking
  [[discover-shed-tool]], a bare-id cache/version lookup, or
  [[summarize-galaxy-tool]] again for that identity.

## Property: a --concrete failure routes to the right surface

- bucket: routing
- check: llm-judged
- assertion: when `draft-validate --concrete` fails on a wrapper-choice mismatch
  (datatype, collection shape, or missing parameter), the skill classifies the
  failure per the failure-routing rules in `index.md` and re-enters wrapper
  resolution, not step implementation.

## Property: skipped tool-state checks block advancement

- bucket: validation
- check: deterministic + llm-judged
- assertion: validation uses `--concrete --strict-state --json` with the run's
  cache directory. A skipped tool-state check produces a nonzero exit status;
  the loop resolves the metadata failure and reruns validation before advancing.
