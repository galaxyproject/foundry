---
type: cli-command
tool: gxwf
command: draft-next-step
package: "@galaxy-tool-util/cli"
upstream: "https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli/spec/gxwf.json"
tags:
  - cli/gxwf
status: draft
created: 2026-05-27
revised: 2026-05-27
revision: 1
ai_generated: true
related_notes:
  - "[[galaxy-workflow-draft]]"
summary: "Pick the next drafty step a harness should work on, or report no remaining work; deterministic topological + alphabetical tiebreak."
---

# `gxwf draft-next-step`

Deterministic next-step picker for the per-step authoring loop. Wraps `nextDraftStep` from `@galaxy-tool-util/schema`. Native (.ga) input is rejected — drafts are format2-only.

The harness loop reads as: `while (next = gxwf draft-next-step <wf>).draft: invoke per-step skill on next.step`.

## Output

Default output is pretty JSON — the agent-loop wire format. Same input → byte-identical output. `--output-format markdown` renders a human-glance checklist instead.

JSON fields:

- `draft` (bool) — `true` while a drafty step remains, `false` at the terminal cases below.
- `step` (string array) — the picked step's **path**: a single id at top level (`["merge assembled transcripts"]`), or the full path through containing subworkflow steps when the pick is nested. The leaf (last element) is the step to work on.
- `work` (string array) — the chosen step's remaining `TODO[...]` sentinels followed by its `_plan_*` fields, in checklist order.

At the terminal cases the object is just `{ "draft": false }` — no `step` or `work` keys.

Two terminal cases both surface as `draft: false`:

- The workflow's class is already `GalaxyWorkflow` (concretization complete, class promoted).
- The class is still `GalaxyWorkflowDraft` but every step is fully resolved (no `TODO_*`, no `_plan_*`). The harness's next move is [[draft-extract]] (which calls `promoteFullyConcreteDrafts` to flip the class) followed by terminal [[validate]].

## Examples

```bash
gxwf draft-next-step workflow.gxwf.yml
gxwf draft-next-step workflow.gxwf.yml --output-format markdown
```

Harness loop sketch:

```bash
while [ "$(gxwf draft-next-step workflow.gxwf.yml | jq -r .draft)" = "true" ]; do
  step=$(gxwf draft-next-step workflow.gxwf.yml | jq -r '.step | last')
  # invoke per-step skill on step, which mutates workflow.gxwf.yml in place
done
```

## Gotchas

- Pick order is **topological** (a step waits until its `in:` sources are concretized) with **alphabetical tiebreak** on step id at the same level. Same input across runs returns the same pick — safe to call repeatedly without state.
- Descends into draft subworkflows; the returned `step` array is the full path through containing subworkflow steps (leaf last).
- A `draft: false` result does **not** mean the workflow has passed [[validate]] yet. It means the per-step authoring loop is done; the harness still owns the promote + terminal-validate pass.
- This command does not mutate the workflow file. It's a pure observer.
- Insertion order of step dicts does not affect output — semantically equal workflows produce identical picks.
