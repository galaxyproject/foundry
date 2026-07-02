# apply-galaxy-workflow-changeset eval

Abstract oracle for the draft emitted by applying a change-set to a concrete workflow. Fixture-bound cases live in the pipeline's `scenarios.md`.

## Property: the emitted draft conforms to the draft contract

- check: deterministic
- assertion: the draft passes [[draft-validate]] — well-formed sentinels, settled topology, and `_plan_*` fields only on drafty steps.

## Property: untouched regions are byte-stable

- check: deterministic
- assertion: a structural diff of the emitted draft against the input workflow touches only steps/inputs/outputs the change-set names (or their necessary consequences). Every other step keeps its `tool_id`, `tool_version`, `tool_state`, labels, and connections. Reordering, relabeling, or reformatting an unrelated region is a failure.

## Property: each change-set entry is realized at the right tier

- check: llm-judged
- assertion: every direct edit (rewire, relabel, parameter, add/remove input/output, remove-step) is applied inline; every tool-introducing/replacing edit lands as a drafty step with `_plan_*` context — not assumed to exist and not left as a bare `TODO` without planning fields. No entry is silently dropped or half-applied.

## Property: no change beyond the change-set

- check: llm-judged
- assertion: the draft introduces no step, input, output, or parameter change the change-set did not call for or structurally require. Necessary consequences (rewiring a consumer of a replaced producer) are allowed; unprompted enrichment or version bumps of untouched tools are not.

## Property: uncomputable edits go to the ledger, not a fabricated wire

- check: llm-judged
- assertion: an edit whose output cannot be computed from its wired inputs appends an open blocking entry to the [[open-requirements-ledger]] naming the edit and the missing evidence; the Mold never invents a connection to make the graph look complete.

## Property: no-tool change-sets produce a concrete workflow

- check: deterministic
- assertion: a change-set with no `add-step` / `replace-tool` yields a draft with no drafty steps (`draft: false`), so the downstream per-step loop runs zero iterations.
