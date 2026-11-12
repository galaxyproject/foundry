---
name: nextflow-summary-to-galaxy-parity
description: "Report how the finished Galaxy workflow differs from its Nextflow source, and which differences have no recorded reason."
---

# nextflow-summary-to-galaxy-parity

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Report how the finished Galaxy workflow differs from its Nextflow source, and which differences have no recorded reason.

## Inputs

- Read artifact `summary-nextflow`. Schema: summary-nextflow. Produced by `summarize-nextflow`. Structured Nextflow pipeline summary from summarize-nextflow: the source side of every comparison, including `effective_args` and each process's tool, container and conda.
- Read artifact `open-requirements-ledger`. Produced by `advance-galaxy-draft-step`, `apply-galaxy-workflow-changeset`, `compare-against-iwc-exemplar`, `cwl-summary-to-galaxy-data-flow`, `cwl-summary-to-galaxy-interface`, `cwl-summary-to-galaxy-template`, `freeform-summary-to-galaxy-data-flow`, `freeform-summary-to-galaxy-interface`, `freeform-summary-to-galaxy-template`, `implement-galaxy-tool-step`, `interview-to-galaxy-workflow-changeset`, `mature-galaxy-workflow-for-iwc`, `nextflow-summary-to-galaxy-data-flow`, `nextflow-summary-to-galaxy-interface`, `nextflow-summary-to-galaxy-reference-data`, `nextflow-summary-to-galaxy-template`, `repair-galaxy-draft-topology`, `workflow-brief-to-galaxy-data-flow`, `workflow-brief-to-galaxy-interface`, `workflow-brief-to-galaxy-template`. Carried obligations ledger open-requirements-ledger as the run left it: the drops, flag records, scope records and gaps that give a difference its reason.
- Read artifact `galaxy-workflow-draft-snapshot`. Schema: galaxy-workflow-draft. Produced by `advance-galaxy-draft-step`. The draft as the per-step loop first received it, `_plan_*` intact, from advance-galaxy-draft-step: the designed workflow, and through `_plan_state.calls` the map from steps to source calls.
- Read artifact `galaxy-workflow`. Produced by `advance-galaxy-draft-step`, `mature-galaxy-workflow-for-iwc`. The final gxformat2 workflow after the test phase: the workflow the report compares with the source.
- Read artifact `workflow-test-result`. Optional; absence is allowed and must be reported honestly. Produced by `run-workflow-test`. Structured handoff from run-workflow-test: its status says what the run verified, and a missing or red result leaves every claim in the report unverified at runtime.

## Outputs

- Write artifact `nextflow-galaxy-parity-report` as `nextflow-galaxy-parity-report.md`. Format: `markdown`. Reviewable Markdown report of how the final workflow differs from the Nextflow source: outputs, tool versions, parameters and inputs, behaviour, scope, unverified items, and every difference with no recorded reason.

## Required Tools

- **`foundry`** (foundry). `npm install -g @galaxy-foundry/gxwf-foundry`.
  Ephemeral run: `npx --package @galaxy-foundry/gxwf-foundry foundry`.
  Check: `foundry --help`.
  Docs: https://github.com/galaxyproject/foundry/blob/main/packages/gxwf-foundry/README.md
- **`gxwf`** (gxwf). `npm install -g '@galaxy-tool-util/cli@^1.15.0'`.
  Ephemeral run: `npx --yes --package @galaxy-tool-util/cli@1.15.0 gxwf`.
  Check: `gxwf --help | grep -q draft-validate`.
  Docs: https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli
  Bundled reference: `references/cli/gxwf.md`.

## Load Upfront

- `references/cli/nextflow-parity.json`: CLI command reference packaged as a sidecar. Join the summary, ledger, snapshot, final workflow and their diff deterministically, so the report renders joins and findings instead of re-deriving them.
- `references/cli/gxwf.md`: CLI tool reference copied verbatim into the bundle. Run `gxwf diff --json` on the snapshot and the final workflow.
- `references/notes/open-requirements-ledger.md`: Research note copied verbatim into the bundle. Read each record kind the report links to: step drops, flag records under Source arguments, scope records under Source scope, plain gaps and decisions.

## Load On Demand

- `references/notes/galaxy-workflow-draft-format.md`: Research note copied verbatim into the bundle. Read a snapshot step's `_plan_state`, `_plan_context` and TODO sentinels when explaining what the step was designed to carry. Use when: a step's planned behaviour must be compared with its final state and the parity JSON does not settle it.
- `references/schemas/summary-nextflow.schema.json`: Schema file copied verbatim into the bundle. Read source-side detail the command doesn't join: params, publishDir targets, closures in `resolved_args`, and `script_excerpt` flags. Use when: a report row needs a source fact beyond what `foundry nextflow-parity` printed.

## Validation

- None declared.

## Procedure

Report how the finished Galaxy workflow differs from the Nextflow pipeline it was translated from, whether the test passed or not. Say what changed, link each difference to the ledger record that gives its reason, and list every difference with no recorded reason as a finding. You must not change the workflow, the ledger or the test result, and must not judge whether a difference is acceptable.

Read the differences from the workflows and the summary, and the reasons from the ledger. A difference with no ledger entry is still a difference.

### Sequence

1. **Diff the designed workflow against the final one.** Run `gxwf diff --json galaxy-workflow-draft.snapshot.gxwf.yml galaxy-workflow.gxwf.yml` and save the output as `nextflow-galaxy-parity.diff.json`. Diff the snapshot, not `galaxy-workflow.extracted.gxwf.yml`.
2. **Join deterministically.** Run nextflow-parity with the summary, the ledger, the snapshot, the final workflow and the diff, and save its JSON as `nextflow-galaxy-parity.json` beside the report. Render from that JSON. Don't re-derive a join it printed. When either command fails, say so at the top of the report, give its error, and write each section from the files directly, marking every row unverified.
3. **Write the report** with the sections below, in this order. Name each step, input, output and entry by its key or `id`, so a reader can find it.
4. **Hand off.** Emit `nextflow-galaxy-parity-report.md`.

### Report sections

#### Outputs

List every output of the snapshot as carried, renamed or reshaped (`outputs.changed`), or removed. For a removed output, give the drops in its `dropped_entries`, or list it as a finding when there are none. Then list the outputs the design tier never declared, from the drops in `other_drops` and the scope drops whose `units` or `unmet` name an output, each with its `because`.

#### Tool versions

For each tool step in the final workflow, give the wrapper `tool_id` and `tool_version` beside the source: each call's process, its tool's declared versions, and the process's `container` and `conda` text. For an embedded user-defined tool, the wrapper's software requirement is in the final workflow: compare it. No input carries a Tool Shed wrapper's requirement. Compare with the software version a wrapper version starts with, such as `1.15.1` in `1.15.1+galaxy2`, and mark the comparison unverified. Flag every comparison where the versions differ. A tool with several declared versions differs from a wrapper that matches only one of them.

#### Parameters and inputs

- **Exposed:** each final workflow input that feeds a step, with the source param it came from where the input's `doc` or the ledger names one.
- **Not carried:** each input in `inputs.unwired`. It is declared but changes nothing, so it is never listed as exposed. Inputs in `inputs.removed` follow, each with the ledger text that explains it, or as a finding.
- **Fixed:** source params or controls the workflow sets to one value: the scope decision's `controls`, and flags carried into `state`.
- **Source arguments:** one table row per kept step and effective entry in `source_args.rows`, giving the entry `id`, its `expression`, `tie` where set, each joined record's `id`, `disposition` and `flags`, and the step's final `state` as `steps` prints it. The command doesn't map flags to `state` parameters; a reader compares them. An entry with no record is a finding. List `source_args.overridden` separately as needing no record, and each `source_args.stray_records` item with its problem. For a closure, compare the flags it can set with the records' `flags` by reading, and list any flag no record covers.

#### Behavioural changes

List each change between the snapshot and the final workflow that changes what a step does: a removed step, a replaced `tool_id`, a changed settled `state` value, a new or removed `when`, or a connection between settled ports that moved. Skip changes that only replace a `TODO` sentinel or a `TODO_*` port with the value the design asked for. Link each change to the ledger entry that records it: a step drop by its `step`, a flag record by `source_arg.step`, or a decision or entry whose text names the step. A step that repair folded into another has no drop, so it is still a finding. Say that it may be a fold.

#### Source scope

When the ledger holds a scope decision, give its `id`, `decision`, `candidate` and each fixed control with its `from`. Then list each scope drop: its `id`, the `selected_by` controls that would run the branch, its `units` and its `because`. Scope rows come from the ledger alone, joined on `scope_branch.decision`. A plain drop raised in the same run, such as steps past a caller's cap, isn't a scope row. List each `scope.problems` item as a finding. When there is no scope decision, say so in one line.

#### Unverified

List what nothing in the run checked: open gaps and tie gaps, surrendered entries, decisions marked `confidence: low`, drops whose `because` cites nothing, tool-version comparisons marked unverified, and claims the test didn't exercise. When `workflow-test-result` is missing or its status isn't `pass`, say first that no claim in the report was verified by a passing run.

#### Findings

A table with columns `kind`, `subject`, `detail` and `section`: one row per item in the JSON's `findings`, with its `kind`, `subject` and `detail` as printed, then one row per difference you found while writing the sections that has no recorded reason. Don't rank them, and don't say which are acceptable.

## Feedback Mode

- Feedback mode is off unless the caller explicitly enables `--feedback` or supplies a feedback-ledger path.
- When enabled, read `_feedback.md` before doing the work and use its registered `foundry-feedback.ledger.yml` protocol.
- Preserve harness-owned run and phase state. Append only concrete observations about a canonical Foundry source asset or a related project that this run showed to be at fault; do not put ordinary workflow requirements in this ledger.
- Before reporting completion, make one explicit pass over the work you just did. Do not ask yourself whether anything was unclear — recall what happened: where you guessed at something the instructions should have settled, needed information this bundle does not carry, hit an instruction that contradicted another or contradicted the artifacts in front of you, used a packaged reference that did not cover your case, or did something the procedure never describes.
- Append an entry for each such event that clears the protocol's bar. If none do, append nothing and report `no feedback` explicitly. Silence and a clean pass are not the same thing, and nothing downstream can tell them apart unless you say which one it was.
- Pass the same ledger path to any subagent used for this work, and merge updates serially so one writer cannot overwrite another.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
