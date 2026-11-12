---
type: mold
name: nextflow-summary-to-galaxy-parity
axis: source-specific
source: nextflow
target: galaxy
tags:
  - source/nextflow
  - target/galaxy
status: draft
created: 2026-11-12
revised: 2026-11-12
revision: 1
summary: "Report how the finished Galaxy workflow differs from its Nextflow source, and which differences have no recorded reason."
input_artifacts:
  - id: summary-nextflow
    description: "Structured Nextflow pipeline summary from [[summarize-nextflow]]: the source side of every comparison, including `effective_args` and each process's tool, container and conda."
  - id: open-requirements-ledger
    description: "Carried obligations ledger [[open-requirements-ledger]] as the run left it: the drops, flag records, scope records and gaps that give a difference its reason."
  - id: galaxy-workflow-draft-snapshot
    description: "The draft as the per-step loop first received it, `_plan_*` intact, from [[advance-galaxy-draft-step]]: the designed workflow, and through `_plan_state.calls` the map from steps to source calls."
  - id: galaxy-workflow
    description: "The final gxformat2 workflow after the test phase: the workflow the report compares with the source."
  - id: workflow-test-result
    optional: true
    description: "Structured handoff from [[run-workflow-test]]: its status says what the run verified, and a missing or red result leaves every claim in the report unverified at runtime."
output_artifacts:
  - id: nextflow-galaxy-parity-report
    kind: markdown
    default_filename: nextflow-galaxy-parity-report.md
    description: "Reviewable Markdown report of how the final workflow differs from the Nextflow source: outputs, tool versions, parameters and inputs, behaviour, scope, unverified items, and every difference with no recorded reason."
references:
  - kind: cli-tool
    ref: "[[gxwf]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Runs `gxwf diff --json` on the snapshot and the final workflow; `diff` needs a release newer than the pinned one."
    verification: "Promote once the pinned `@galaxy-tool-util/cli` release ships `gxwf diff`."
  - kind: cli-command
    ref: "[[nextflow-parity]]"
    used_at: runtime
    load: upfront
    mode: sidecar
    evidence: hypothesis
    purpose: "Join the summary, ledger, snapshot, final workflow and their diff deterministically, so the report renders joins and findings instead of re-deriving them."
    verification: "Promote after a nextflow-to-galaxy run's report lists every finding the command emitted and no difference the command marked recorded as unrecorded."
  - kind: research
    ref: "[[open-requirements-ledger]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Read each record kind the report links to: step drops, flag records under Source arguments, scope records under Source scope, plain gaps and decisions."
    verification: "Promote after a worked run's report links each listed difference to the ledger entry that records it."
  - kind: schema
    ref: "[[summary-nextflow]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Read source-side detail the command doesn't join: params, publishDir targets, closures in `resolved_args`, and `script_excerpt` flags."
    trigger: "When a report row needs a source fact beyond what `foundry nextflow-parity` printed."
  - kind: research
    ref: "[[galaxy-workflow-draft-format]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Read a snapshot step's `_plan_state`, `_plan_context` and TODO sentinels when explaining what the step was designed to carry."
    trigger: "When a step's planned behaviour must be compared with its final state and the parity JSON does not settle it."
---

# nextflow-summary-to-galaxy-parity

Report how the finished Galaxy workflow differs from the Nextflow pipeline it was translated from. Run it once the test phase has settled, whether the test passed or not. The report only reports. It doesn't change the workflow or the ledger, it doesn't send the run back into the test loop, and it doesn't judge whether a difference is acceptable. It says what changed, links each difference to the ledger record that gives its reason, and lists every difference with no recorded reason as a finding.

The ledger alone isn't enough. A run can remove a step, leave an input unwired or drop a flag without writing any ledger entry, so read the differences from the workflows and the summary, and read the reasons from the ledger.

## Sequence

1. **Diff the designed workflow against the final one.** Run `gxwf diff --json galaxy-workflow-draft.snapshot.gxwf.yml galaxy-workflow.gxwf.yml` and save the output as `nextflow-galaxy-parity.diff.json`. Diff the snapshot, not `galaxy-workflow.extracted.gxwf.yml`: only the snapshot keeps `_plan_state.calls` and shows what the per-step loop removed.
2. **Join deterministically.** Run [[nextflow-parity]] with the summary, the ledger, the snapshot, the final workflow and the diff, and save its JSON as `nextflow-galaxy-parity.json` beside the report. Render from that JSON. Don't re-derive a join it printed. When either command fails, say so at the top of the report, give its error, and write each section from the files directly, marking every row unverified.
3. **Write the report** with the sections below, in this order. Name each step, input, output and entry by its key or `id`, so a reader can find it.
4. **Hand off.** Emit `nextflow-galaxy-parity-report.md`. Leave the workflow, the ledger and the test result as they were.

## Report sections

### Outputs

List every output of the snapshot as carried, renamed or reshaped (`outputs.changed`), or removed. For a removed output, give the drops in its `dropped_entries`, which name its source step or the output itself, or list it as a finding. Then list the outputs the design tier never declared, from the drops in `other_drops` and the scope drops whose `units` or `unmet` name an output, each with its `because`.

### Tool versions

For each tool step in the final workflow, give the wrapper `tool_id` and `tool_version` beside the source: each call's process, its tool's declared versions, and the process's `container` and `conda` text. For an embedded user-defined tool, the wrapper's software requirement is in the final workflow: compare it. For a Tool Shed wrapper, the requirement isn't in any input. A wrapper version that starts with the software version, such as `1.15.1+galaxy2`, is evidence of it but not proof, so mark that comparison unverified. Flag every comparison where the versions differ. A tool with several declared versions differs from a wrapper that matches only one of them.

### Parameters and inputs

- **Exposed:** each final workflow input that feeds a step, with the source param it came from where the input's `doc` or the ledger names one.
- **Not carried:** each input in `inputs.unwired`. It is declared but changes nothing, so it is never listed as exposed. Inputs in `inputs.removed` follow, each with the ledger text that explains it, or as a finding.
- **Fixed:** source params or controls the workflow sets to one value: the scope decision's `controls`, and flags carried into `state`.
- **Source arguments:** one table row per kept step and effective entry in `source_args.rows`, giving the entry `id`, its `expression`, `tie` where set, and each joined record's `id`, `disposition` and `flags`. An entry with no record is a finding. List `source_args.overridden` separately as needing no record, and each `source_args.stray_records` item with its problem. A closure's flags can't be checked against its records without evaluating it, so for a closure, compare the flags it can set with the records' `flags` by reading, and list any flag no record covers.

### Behavioural changes

List each change between the snapshot and the final workflow that changes what a step does: a removed step, a replaced `tool_id`, a changed settled `state` value, a new or removed `when`, or a connection between settled ports that moved. Skip changes that only replace a `TODO` sentinel or a `TODO_*` port with the value the design asked for. Link each change to the ledger entry that records it: a step drop by its `step`, a flag record by `source_arg.step`, or a decision or entry whose text names the step. A removed step repair folded into another has no drop, so it is still a finding. Say that it may be a fold.

### Source scope

When the ledger holds a scope decision, give its `id`, `decision`, `candidate` and each fixed control with its `from`. Then list each scope drop: its `id`, the `selected_by` controls that would run the branch, its `units` and its `because`. Scope rows come from the ledger alone, joined on `scope_branch.decision`. A plain drop raised in the same run, such as steps past a caller's cap, isn't a scope row. List each `scope.problems` item as a finding. When there is no scope decision, say so in one line.

### Unverified

List what nothing in the run checked: open gaps and tie gaps, surrendered entries, decisions marked `confidence: low`, drops whose `because` cites nothing, tool-version comparisons marked unverified, and claims the test didn't exercise. When `workflow-test-result` is missing or its status isn't `pass`, say first that no claim in the report was verified by a passing run.

### Findings

List every item in the JSON's `findings`, then every difference you found while writing the sections that has no recorded reason. Give each its kind, its subject and the section it came from. Don't rank them, and don't say which are acceptable.

Later review or maturation of the workflow can read this report as evidence of what it doesn't carry from the source.
