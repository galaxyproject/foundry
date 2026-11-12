---
type: cli-command
tool: foundry
command: nextflow-parity
package: "@galaxy-foundry/gxwf-foundry"
tags:
  - cli/foundry
status: draft
created: 2026-11-12
revised: 2026-11-12
revision: 1
related_notes:
  - "[[open-requirements-ledger]]"
  - "[[galaxy-workflow-draft-format]]"
summary: "Join a nextflow-to-galaxy run's summary, ledger, draft snapshot, final workflow and their `gxwf diff` into source-parity rows and findings."
---

# `foundry nextflow-parity`

Assemble the joins a source-parity report needs from five files of one `nextflow-to-galaxy` run:

- `--summary`: the run's `summary-nextflow.json`.
- `--ledger`: the [[open-requirements-ledger]].
- `--snapshot`: `galaxy-workflow-draft.snapshot.gxwf.yml`, the draft as the per-step loop first received it, with `_plan_*` intact.
- `--workflow`: the final `galaxy-workflow.gxwf.yml`.
- `--diff`: `gxwf diff --json <snapshot> <workflow>`.

It joins what has a key and reports each difference with no recorded reason as a finding, without judging any of them.

Steps are keyed as `gxwf diff` keys them. A dict-form step's key is its dict key. A list-form step's key is its label, else its `id`, else its index counted after the inputs. Inside a subworkflow step that is inline on both sides, the only place `gxwf diff` looks inside one, a step's key is `<parent>/<key>`.

## Output

Exit `0` whenever the files could be joined, findings or not. A summary without `processes`, a diff without `steps.removed`, `inputs` or `outputs`, a malformed ledger, or a snapshot and workflow the diff didn't compare exits `3`. A step only in the snapshot must be in the diff's `steps.removed`, and a step only in the workflow in its `steps.added`. Read and parse failures exit `1`.

Stdout holds one JSON object:

- `steps`: one row per step in the snapshot or the final workflow, in that order:
  - `status`: `kept`, `removed` or `added`.
  - `plan_state`: what the snapshot's `_plan_state` holds: `calls` (a document with a `calls` list), `text`, `none`, or `absent` for a step the snapshot lacks.
  - `calls`: the summary call paths the step translates. `calls_from` says whether they came from `_plan_state` or from flag records that name the step.
  - `tool_id` and `tool_version`: from the final workflow, or from the snapshot for a removed step.
  - `source`: each call's process, tool, the tool's declared versions, and the process's `container` and `conda` text.
  - `dropped_entries`: the `kind: dropped` entries whose top-level `step` names a removed step.
- `inputs`: the diff's `added` and `removed` inputs, and `unwired`, the final inputs that feed no step.
- `outputs`: the diff's `added` and `changed` outputs, and `removed` as `{output, source_step, dropped_entries}`, where `source_step` is the snapshot step the output came from, and `dropped_entries` holds the drops naming that step plus the drops whose backticked `units` name the output.
- `source_args.rows`: one row per `effective_args` row in the summary, with its `process`, `call`, `key`, `ids` and `tie`, plus:
  - `steps`: the snapshot steps whose `_plan_state.calls` include the call, and `steps_from: plan_state`. A step the template resolved has no `_plan_state`. When no step lists the call, `steps` holds the steps named by flag records that cite an id effective for this call alone, and `steps_from` is `records`, so a `withLabel` entry several calls share never maps a call. With no step either way, `steps` is empty and `steps_from` is `null`. Every row of one call gets the same `steps`.
  - `covered_by`: for an unmapped call, the drops other than flag records whose backticked `units` name a segment of its call path.
  - `entries`: each id's `expression` and the well-formed flag records joined on `source_arg.step` and `source_arg.arg`, as `{id, step, collection, disposition, status, flags}`. `disposition` is the decision's `carried` or `not_applicable`, or `dropped` or `gap` for an entry.
- `source_args.overridden`: the `resolved_args` entries no `effective_args` row names. They need no record.
- `source_args.stray_records`: flag records joined to no row, with a `problem`: `unknown-step`, `unknown-arg`, `not-effective` (an overridden entry), or `other-step` (effective, but for another step's calls).
- `scope`: the [[check-scope-records]] result against the summary.
- `other_drops`: `kind: dropped` entries with no `source_arg` and no `scope_branch` that no removed step's `dropped_entries` lists: the design tier's cuts, output drops, and step drops that name a kept step or lack a `because`.
- `findings`: one `{kind, subject, detail?}` per difference with no recorded reason:
  - `step-removed-unrecorded`: a removed step no drop names.
  - `output-removed-unrecorded`: a removed output no drop names, by its source step or in `units`. `detail` is the source step.
  - `input-unwired`: a final input that feeds no step.
  - `source-arg-unrecorded`: an effective entry for a kept step with no flag record. `subject` is the step and `detail` the entry id.
  - `source-arg-stray`: a stray flag record. `detail` is its problem.
  - `source-arg-malformed`: a record with `source_arg` that gives no reason, so it records nothing: `source_arg` lacks a string `step` or `arg`, a decision's `disposition` isn't `carried` or `not_applicable`, or a dropped entry has no `because`. `detail` says which. Its entry stays unrecorded.
  - `call-unmapped`: a call with effective arguments that no step translates and no drop covers.
  - `scope-record`: a scope-record problem.

## Examples

```sh
gxwf diff --json galaxy-workflow-draft.snapshot.gxwf.yml galaxy-workflow.gxwf.yml > parity-diff.json
foundry nextflow-parity --summary summary-nextflow.json --ledger open-requirements.ledger.yml \
  --snapshot galaxy-workflow-draft.snapshot.gxwf.yml --workflow galaxy-workflow.gxwf.yml \
  --diff parity-diff.json > nextflow-galaxy-parity.json
```

## Gotchas

- Diff the snapshot, not `galaxy-workflow.extracted.gxwf.yml`. Only the snapshot keeps `_plan_state.calls`, and only the snapshot shows what the per-step loop removed. Passing a different pair than the diff compared exits `3`.
- `gxwf diff` pairs list-form steps that share an `id` across a relabel. This command doesn't, so a relabelled list-form step exits `3`. Drafts use dict-form steps.
- `call-unmapped` sees only calls with `effective_args`. The summary has no full path for a call without arguments, so a call with none that no step translates leaves no finding.
- A removed step that repair folded into another records no drop, so it appears as `step-removed-unrecorded`. The report says so. It doesn't excuse it.
- Removed and added inputs have no key the ledger joins on, so they are listed but never become findings here. The [[nextflow-summary-to-galaxy-parity]] Mold reads their reason from the ledger's prose and lists the unexplained ones as findings.
- Tool versions are joined on the source side only. The wrapper's own software requirement isn't in any of the five files.
- The flag join stops at the entry. Which flags of a closure a record covers can't be checked without evaluating it.
