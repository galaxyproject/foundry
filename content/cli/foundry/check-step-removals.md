---
type: cli-command
tool: foundry
command: check-step-removals
package: "@galaxy-foundry/gxwf-foundry"
tags:
  - cli/foundry
status: draft
created: 2026-11-12
revised: 2026-11-12
revision: 1
related_notes:
  - "[[open-requirements-ledger]]"
summary: "Check that every step a `gxwf diff` reports removed has a `kind: dropped` ledger entry naming it."
---

# `foundry check-step-removals`

Read the JSON a `gxwf diff --json <before> <after>` prints and an [[open-requirements-ledger]], and check that every step the diff lists under `steps.removed` is labelled as a drop. A removed step is labelled when an obligation entry under `entries` (or a ledger written as a bare list of entries) has `kind: dropped`, a top-level `step` equal to the removed step's key, and no `source_arg`. A step inside an inline subworkflow is keyed by its path, the parent step's key and its own joined by `/` (`nested/first`), and only that full key names it. A step whose key has no `/` also matches its label.

`<diff.json>` is a path, or `-` to read the diff from stdin.

## Output

Exit `0` means every removed step is labelled, including when none was removed. Exit `4` means at least one is not. A diff without a `steps.removed` object, a ledger that is neither a mapping nor a list, or an `entries` that holds something other than a list exits `3`. An empty ledger, a mapping without `entries`, or an empty `entries:` key has no drops. Read and parse failures exit `1`.

Without `--json`, each unlabelled step prints on stderr, inputs that feed no step print on stdout, and a closing count prints on stdout when every removal is labelled or on stderr when one isn't. With `--json`, stdout holds:

- `ok`: whether every removed step is labelled.
- `removed_steps`: one `{step, label, dropped_entries}` per removed step, in the diff's order. `dropped_entries` lists the ids of the entries that label it.
- `unlabelled`: the keys of removed steps no entry labels.
- `unwired_inputs`: the diff's `unwired_inputs`, the AFTER inputs that feed no step. Reported only, they never change the exit code.

## Examples

```sh
gxwf diff --json galaxy-workflow.extracted.gxwf.yml galaxy-workflow.gxwf.yml > step-diff.json
foundry check-step-removals step-diff.json open-requirements.ledger.yml --json
gxwf diff --json galaxy-workflow.extracted.gxwf.yml galaxy-workflow.gxwf.yml \
  | foundry check-step-removals - open-requirements.ledger.yml
```

## Gotchas

- A per-flag record from **Source arguments** carries `source_arg` and is never a step drop, even when it also sets `step`. A plain gap naming the step doesn't label it either: a gap says the run couldn't do the work, not that it chose to cut it.
- Only entries under `entries` count. A decision under `decisions` labels nothing.
- An entry's `status` doesn't matter. An open drop and a surrendered one both label the step.
- The check reads the step list only. It says nothing about whether a drop's `because` is cited or still true.
- `step: first` names the top-level step `first`, never `nested/first`. Copy the key from `unlabelled` into the entry.
