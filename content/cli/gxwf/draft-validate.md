---
type: cli-command
tool: gxwf
command: draft-validate
package: "@galaxy-tool-util/cli"
upstream: "https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli/spec/gxwf.json"
tags:
  - cli-command
  - cli/gxwf
status: draft
created: 2026-05-27
revised: 2026-05-27
revision: 1
ai_generated: true
related_notes:
  - "[[galaxy-workflow-draft]]"
summary: "Validate a `class: GalaxyWorkflowDraft` workflow against draft-contract rules; with --concrete, also validate the extracted concrete subset."
---

# `gxwf draft-validate`

Validate a draft Galaxy workflow against the **draft contract**: sentinel form, dangling edge references, top-level `_plan_*` placement, `_plan_*` on fully-resolved tool steps, and recursive draft subworkflows. Native (.ga) input is rejected — drafts are format2-only.

Distinct from [[validate]], which validates a fully concrete `class: GalaxyWorkflow` and would reject the draft relaxations outright. Use `draft-validate` during the per-step authoring loop; use `validate` at the terminal pass once `promoteFullyConcreteDrafts` has flipped the class.

## Output

Default output is human-readable: counted buckets for structure / topology / semantic errors and warnings, plus a one-line survey (TODO sentinel count, paths carrying `_plan_*`). `--json` emits a `SingleDraftValidationReport`; `--report-html` and `--report-markdown` write the same data as a self-contained HTML page or templated Markdown. With `--concrete`, the report carries an optional `concrete: ConcreteValidationReport` whose buckets (`structure_errors`, `strict_structure_errors`, `strict_encoding_errors`, `strict_state_errors`, `tool_state`, `connection_report`) are **absent when the corresponding check did not run** — readers should treat absence as "not run," not as "passed."

## Flags

`--concrete` runs the extract+promote pipeline (`extractConcreteSubset` → `stripPlanFields` → `promoteFullyConcreteDrafts`) and applies the full concrete `gxformat2` validation surface to the result. The following pass-through flags only take effect under `--concrete`; passing them without it prints a stderr warning and no-ops:

- `--cache-dir <dir>` — tool cache for tool-state lookups.
- `--no-tool-state` — skip tool-state validation on the concrete pass. Combined with `--strict-state`, the strict flag warns + no-ops (there's no state to be strict about).
- `--connections` — run connection validation on the concrete subset.
- `--strict` — escalate every strict bucket (structure, encoding, state) to error.
- `--strict-structure` / `--strict-encoding` / `--strict-state` — escalate one bucket only.

Draft structural errors gate the concrete pass entirely — the pipeline would mutate a malformed input, so the concrete section is skipped and only the draft buckets populate.

## Examples

```bash
gxwf draft-validate workflow.gxwf.yml
gxwf draft-validate workflow.gxwf.yml --json
gxwf draft-validate workflow.gxwf.yml --concrete --json
gxwf draft-validate workflow.gxwf.yml --concrete --strict --cache-dir ~/.cache/gxwf
gxwf draft-validate workflow.gxwf.yml --report-html report.html
```

## Exit codes

- `0` — clean draft (no structure / topology / semantic errors; warnings allowed). Under `--concrete`, also requires the concrete pass to be clean.
- `1` — draft validation errors (topology or semantic). With `--concrete`, also returned when the concrete projection fails — including strict-* failures that `gxwf validate` would have exited `2` on standalone. The asymmetry is deliberate: the draft itself parsed, only its projection failed.
- `2` — parse failure, native input rejected, structural decode failure (class is not `GalaxyWorkflowDraft`), or a stdout-sink collision between `--json` and `--report-{html,markdown}=-`.

## Gotchas

- The draft validator is **contract-shaped**, not workflow-shaped. It will not catch tool-state errors, parameter-name mismatches, or other concerns that belong to [[validate]] on the concretized subset. Use `--concrete` (or run [[draft-extract]] | [[validate]] manually) when you need both surfaces.
- A draft with zero implemented steps still runs the `--concrete` pipeline, but the projection is empty — the concrete buckets report `skipped` semantics (absent in the JSON) rather than a green pass. Signal grows as the loop fills steps in; do not interpret early-loop runs as evidence the workflow concretizes correctly.
- `_plan_*` on a fully-resolved tool step is a `semanticError`, not a warning. Strip planning fields explicitly via [[draft-extract]] (or `stripPlanFields`) when a step concretizes; the per-step Mold should never carry them forward.
- Subworkflow draft roots are validated recursively; diagnostics carry the outer step path.
- `TODO`, `TODO_x`, `TODO-x` are sentinels; `TODONE` and `TODOLIST` are not.
- Prefer `--json` whenever a cast skill or harness needs to classify diagnostics.
