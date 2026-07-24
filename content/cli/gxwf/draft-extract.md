---
type: cli-command
tool: gxwf
command: draft-extract
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
summary: "Extract the concrete subset of a draft workflow: trim drafty steps, strip `_plan_*`, promote class when fully resolved."
---

# `gxwf draft-extract`

Transform a draft workflow into its already-concretized subset. Pipes three operations from `@galaxy-tool-util/schema` in order:

1. `extractConcreteSubset` — drop steps that still carry `TODO_*` or `_plan_*`; cascade through dead `in:` deps; rewrite multi-source inputs to the surviving subset; fall back to `default:` when a single source dies; recurse into draft subworkflows; drop orphan workflow outputs.
2. `stripPlanFields` — remove `_plan_*` planning fields from every surviving step and from the workflow root.
3. `promoteFullyConcreteDrafts` — flip `class: GalaxyWorkflowDraft` → `class: GalaxyWorkflow` on any (sub)workflow now carrying zero TODOs and zero `_plan_*`. Inner draft with remaining work blocks outer promotion.

Native (.ga) input is rejected — drafts are format2-only. Output format is inferred from the `-o` extension (`.ga` / `.json` → native JSON; otherwise format2 YAML) or, when emitting to stdout, matches the input format. Promoted from the earlier hidden `_draft-extract` command — same behavior, same flags, now first-class in `gxwf --help`.

## Output

By default, the trimmed workflow is written to stdout. With `-o <file>`, written to that file. `--report-json [file]` emits a `SingleDraftExtractReport` sidecar with `dropped_steps`, `dropped_outputs`, `rewritten_step_inputs`, and the post-extract class.

## Examples

```bash
gxwf draft-extract workflow.gxwf.yml > concrete.gxwf.yml
gxwf draft-extract workflow.gxwf.yml -o concrete.gxwf.yml --report-json report.json
gxwf draft-extract workflow.gxwf.yml -o concrete.ga
gxwf draft-extract workflow.gxwf.yml | gxwf validate -
```

## Exit codes

- `0` — input parsed and the extract pipeline ran (including the empty-extract case).
- `2` — parse / read failure, native input rejected, or a stdout-sink collision between the workflow output and `--report-json=-` both targeting stdout.

## Gotchas

- This command is **a transformation, not a validator**. To validate the concrete subset against full `gxformat2` rules, pipe to [[validate]] (or invoke [[draft-validate]] with `--concrete`, which runs the same pipeline internally).
- The trimmed workflow may still be `class: GalaxyWorkflowDraft` — promotion only fires when zero TODOs and zero `_plan_*` remain anywhere (including inside draft subworkflows).
- `extractConcreteSubset` operates as a fixpoint and is deterministic per-level: drops within a level sort by `(round, path)`; inner-level drops follow their containing surviving subworkflow in source iteration order.
- Outer subworkflow steps are never shrunk in v1 — inner workflows shrink in place. A drafty step at the outer level either survives whole or is dropped whole.
- Use `--report-json` whenever a cast skill needs to surface which steps were trimmed (e.g., to explain why a downstream test fails on a workflow that "validates fine but is missing the step you asked about").
