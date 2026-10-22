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
  `--concrete` — and leaves every other drafty step untouched.

## Property: an implemented step leaves no TODO sentinel behind

- bucket: implementation
- check: deterministic + llm-judged
- assertion: after the cast skill implements the chosen step, the mutated draft
  contains **no** `TODO` / `TODO_*` token — `tool_id` is concrete, each output
  port is renamed from its `TODO_*` sentinel to the wrapper's real name, and
  every downstream consumer's source is repointed to that real name (no dangling
  `TODO_` reference). Mechanically: `grep -c TODO` on the result is 0.
  Hallucination guardrail: a fabricated `tool_id` or an invented output port
  that doesn't match the resolved wrapper's summary is a failure, not a pass.

## Property: an Apply Rules step's rules run on the identifiers its input has

- bucket: implementation
- check: deterministic
- assertion: build the identifier paths the step's input would produce: each
  `paired` level gives `forward`/`reverse`, and each `paired_or_unpaired` level
  gives either those or `unpaired`, covering both variants. Running the step's
  `rules` over those paths with Galaxy's `galaxy.util.rules_dsl` raises no
  error, and the mapped identifiers are unique. For a sample-sheet input, the
  paths include two rows that share every column value, as one sample with two
  runs does. Fails if a regex expects sample-sheet column or source field names
  (`1`/`2`, `fastq_1`) at a paired level, if one variant of a
  `paired_or_unpaired` input fails, or if those two rows map to one identifier.

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

## Property: no acceptable shed candidate falls through to authoring

- bucket: routing
- check: llm-judged
- assertion: when the chosen step's `_plan_*` describes behavior with no
  acceptable Tool Shed candidate, [[discover-shed-tool]] returns no match and the
  skill falls through to [[author-galaxy-tool-wrapper]] rather than guessing a
  wrapper.

## Property: a step that needs a tool is recorded, not improvised

- bucket: routing
- check: deterministic + llm-judged
- assertion: when no acceptable Tool Shed candidate meets the chosen step, the
  call appends an open, non-blocking `kind: needs_tool` ledger entry for that
  step, with `unmet` and `missing` citing the searches run. The draft is
  unchanged unless [[author-galaxy-tool-wrapper]] ran in the same call and
  wrote the tool inline as the step's `run:`. Fails if a step gets a Tool Shed
  `tool_id` that discovery didn't return, if the run's tool cache holds a
  `source: local` entry under a Tool Shed id, or if a wrapper file is written
  anywhere outside the run's outputs.

## Property: an inline tool step is bound from its own declaration

- bucket: implementation
- check: deterministic
- assertion: on a step whose `run:` is a `GalaxyUserTool`, the call renames
  each `TODO_*` port to one of the tool's declared `inputs` or `outputs` names,
  and leaves the step with no `tool_id` or `tool_version`. It runs no Tool Shed
  search, cache `add` or summary for the step. `gxwf draft-validate --concrete
  --strict-state` passes.

## Property: a TODO step a built-in meets uses it, at a named version

- bucket: routing
- check: llm-judged
- assertion: when the chosen step's `tool_id` is `TODO` and a built-in
  collection operation meets its `_plan_*` contract, the skill picks that
  built-in, not a Tool Shed wrapper. Its version comes from the step plan, the
  run's cache, or [[galaxy-collection-tools]], and the step's `tool_version` is
  the version of the cache entry its summary was built from. Fails if the skill
  blocks the step because only a Tool Shed search came up empty, if it uses a
  version none of those sources names, or if the step's version differs from
  the cached one. When no source names a version, the call instead leaves the
  draft unchanged and appends a non-blocking `gap` entry naming the step and
  the sources checked; a blocking entry for a missing version fails.

## Property: a step nothing can implement ends the call blocked

- bucket: routing
- check: deterministic + llm-judged
- assertion: when no stock, Tool Shed, or authored wrapper can produce the
  chosen step's declared output from its wired inputs, the call either changes
  the draft through [[repair-galaxy-draft-topology]] or leaves a blocking ledger
  entry naming the step, open or surrendered. Mechanically: a call that leaves
  the draft byte-identical must have appended or updated such an entry, or,
  for a built-in tool no source gives a version for, a non-blocking `gap`
  entry naming the step. Returning with the draft
  and ledger both unchanged fails, as does writing `galaxy-workflow.gxwf.yml`
  before the terminal call.

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
