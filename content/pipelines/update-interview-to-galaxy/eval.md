# UPDATE-INTERVIEW → GALAXY pipeline eval

Pipeline-level oracle for the UPDATE-INTERVIEW → GALAXY journey. This judges the
**end-to-end** and **cross-step** properties no single Mold owns; each member
Mold's own `eval.md` still applies to its step's output (composition). Properties
are abstract — concrete journeys live in `scenarios.md`.

An update journey is judged against **two artifacts**: the emitted workflow and
the **starting** workflow it modified. Several properties below are only
meaningful as a comparison between the two — the distinguishing feature of an
edit pipeline versus a greenfield one.

## Property: the final workflow validates and round-trips

- check: deterministic
- assertion: the gxformat2 workflow emerging from the journey passes terminal
  `gxwf validate` and round-trips (export/import) without loss, and carries no
  unresolved `TODO`/`_plan_*` sentinels left behind by an unfinished edit.

## Property: untouched regions are byte-stable

- check: deterministic
- assertion: a structural diff of the emitted workflow against the starting
  workflow touches **only** the steps, inputs, and outputs named (directly or by
  necessary consequence) in the change-set. Every other step keeps its `tool_id`,
  `tool_version`, `tool_state`, and input connections unchanged. Reordering,
  relabeling, or reformatting an unrelated region is a failure.

## Property: every requested change is realized

- check: llm-judged
- assertion: each entry in the change-set is observable in the emitted workflow —
  an added step present and wired, a replaced tool swapped, a parameter at its new
  value, an exposed output surfaced. No change-set entry is silently dropped or
  half-applied (e.g. a step added but never connected to its intended consumer).

## Property: no change beyond what was requested

- check: llm-judged
- assertion: the emitted workflow introduces no step, input, output, or parameter
  change the change-set did not call for or structurally require. "Necessary
  consequence" (rewiring a consumer of a replaced producer) is allowed; unprompted
  enrichment, tidying, or version bumps of untouched tools are not.

## Property: the change-set is a faithful, anchored translation of the interview

- check: llm-judged
- assertion: every change-set entry either anchors to a real step/input/output in
  the starting-workflow summary or is explicitly marked `new`; none references a
  step the workflow does not contain. Requested changes the workflow cannot
  support surface on the [[open-requirements-ledger]] rather than being invented or
  quietly dropped.

## Property: the regression baseline is preserved

- check: deterministic
- assertion: any test the starting workflow shipped still passes on the emitted
  workflow, except on outputs an edit intentionally changed; those exceptions are
  reflected in updated assertions, not deletions. New behavior gains added
  assertions; the old ones are not silently discarded.

## Property: edits that need a tool resolve through discover-or-author

- check: llm-judged
- assertion: a change-set entry that introduces or replaces a tool lands as a
  drafty step and is resolved through the per-step loop's discover-or-author path —
  a pinned Tool Shed changeset or an authored wrapper — never assumed to exist.
  Edits with no tool need (rewire, relabel, parameter, expose-output) are applied
  directly and do **not** spawn drafty steps.

## Property: the per-step loop terminates at a real endstate

- check: deterministic
- assertion: the `[loop]` phase ([[advance-galaxy-draft-step]]) is judged at its
  endstate, not per iteration: it runs only when the change-set introduced drafty
  steps, and exits only when `gxwf draft-next-step` reports none remain. A
  change-set of purely direct edits yields zero iterations and an immediately
  concrete workflow.

## Property: starting-format normalization is lossless

- check: deterministic
- assertion: when the starting workflow is supplied as `.ga`, its conversion to
  `.gxwf.yml` (owned by [[summarize-galaxy-workflow]]) round-trips without dropping
  steps, connections, or parameters — the modification is judged against the
  converted baseline, and format conversion alone introduces no diff attributable
  to the pipeline.
