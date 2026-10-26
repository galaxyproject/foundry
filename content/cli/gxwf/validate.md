---
type: cli-command
tool: gxwf
command: validate
package: "@galaxy-tool-util/cli"
source_url: "https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli/spec/gxwf.json"
tags:
  - cli/gxwf
status: draft
created: 2026-05-02
revised: 2026-10-26
revision: 4
summary: "Validate Galaxy workflow structure, tool state, and optional connection compatibility before runtime execution."
---

# `gxwf validate`

Validate a Galaxy workflow source file before attempting runtime execution. Use this as the design-time guardrail after step implementation and again after final workflow assembly.

## Output

Default output is human-readable diagnostics. JSON output should be treated as the preferred cast-skill interface; free-text diagnostics are a fallback for humans.

With `--connections`, `connection_report.step_results[]` has one entry per top-level step (`label`, or `step` id when unlabelled). Each entry carries its `connections[]` (`status` `ok`, `skip` or invalid) and `resolved_outputs[]` (`name`, `collection_type`).

## Resolving an output's kind

Find the step and output that produce a workflow output. In gxformat2, split `outputSource` into `<step_label>/<output_name>`; with no `/` the source is a workflow input, whose single output is `output`. In a native `.ga`, take the step and `output_name` carrying that `workflow_outputs[].label`. Read that step's `resolved_outputs[name].collection_type`.

- With every connection on the path to the step `ok`, a non-null value is the resolved collection type, including map-over: a dataset output of a step mapped over a `list` resolves to `list`.
- Null means dataset only when the tool declares a dataset output (not a collection) and the path is clean. A collection output whose type could not be resolved also reports null, with `ok` connections, so a null on a declared collection output is unknown.
- A `skip` connection contributes no map-over rank, and its effect propagates downstream behind `ok` connections. Any value, null or not, at or downstream of a `skip` is unknown: a non-null type there can be missing a rank.
- Subworkflow steps report resolved outputs, but the subworkflow's inner steps and their skips are not in `step_results`. A null from a subworkflow output is unknown unless you trace the inner chain by hand.

## Examples

```bash
gxwf validate workflow.ga
gxwf validate workflow.gxwf.yml --json
gxwf validate workflow.gxwf.yml --json --connections --strict
gxwf validate workflow.ga --mode json-schema --tool-schema-dir ./tool-schemas --json
```

## Gotchas

- Validation is design-time structure checking. It does not prove that a workflow test will pass under Planemo.
- Run after each generated Galaxy step when the harness can still attribute failures to the fresh step.
- Run again after assembly to catch cross-step or workflow-level issues before runtime testing.
- Prefer `--json` whenever a cast skill or harness needs to classify diagnostics.
- Use `--connections` when tool cache metadata is available and data-shape compatibility matters, especially around collections and map-over.
- `--no-tool-state` weakens validation. If used, record why tool metadata was unavailable and rerun without it before final runtime testing.
