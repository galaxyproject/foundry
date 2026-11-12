---
name: improve-galaxy-workflow-efficiency
description: "Find steps in an existing Galaxy workflow that a documented lower-cost alternative can replace, and emit them as a reviewable change-set."
---

# improve-galaxy-workflow-efficiency

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Find steps in an existing Galaxy workflow that a documented lower-cost alternative can replace, and emit them as a reviewable change-set.

## Inputs

- Read artifact `summary-galaxy-workflow`. Schema: summary-galaxy-workflow. Produced by `summarize-galaxy-workflow`. Structured summary of the existing workflow from summarize-galaxy-workflow: each step's `tool_id`, `tool_state`, connections and outputs, the workflow inputs' formats, the edge graph, and any existing tests. The anchor set every change-set entry addresses.
- Read artifact `open-requirements-ledger`. Produced by `advance-galaxy-draft-step`, `apply-galaxy-workflow-changeset`, `compare-against-iwc-exemplar`, `cwl-summary-to-galaxy-data-flow`, `cwl-summary-to-galaxy-interface`, `cwl-summary-to-galaxy-template`, `freeform-summary-to-galaxy-data-flow`, `freeform-summary-to-galaxy-interface`, `freeform-summary-to-galaxy-template`, `implement-galaxy-tool-step`, `improve-galaxy-workflow-efficiency`, `interview-to-galaxy-workflow-changeset`, `mature-galaxy-workflow-for-iwc`, `nextflow-summary-to-galaxy-data-flow`, `nextflow-summary-to-galaxy-interface`, `nextflow-summary-to-galaxy-reference-data`, `nextflow-summary-to-galaxy-template`, `repair-galaxy-draft-topology`, `workflow-brief-to-galaxy-data-flow`, `workflow-brief-to-galaxy-interface`, `workflow-brief-to-galaxy-template`. Carried obligations ledger open-requirements-ledger: the run's open, resolved, and surrendered entries with their provenance. Absent on the first Mold of a run; start an empty one.

## Outputs

- Write artifact `galaxy-workflow-changeset` as `galaxy-workflow-changeset.md`. Format: `markdown`. Reviewable change-set in the same entry format interview-to-galaxy-workflow-changeset emits: one `replace-tool` or `change-parameter` entry per proposed efficiency edit, each anchored to an existing step, preceded by a summary of the levers consulted and the matching steps left unchanged with the reason. The human approval point before apply-galaxy-workflow-changeset touches the workflow.
- Write artifact `open-requirements-ledger` as `open-requirements.ledger.yml`. Format: `yaml`. Carried obligations ledger re-emitted by this step: a decision for every matching step, swapped or kept, and every other entry passed through with its provenance intact.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- `references/notes/galaxy-efficient-tool-substitutions.md`: Research note copied verbatim into the bundle. The substitution table: which tools have a lower-cost replacement, the replacement's exact `tool_id`, how ports and parameters map, and the opt-out conditions that keep the original.
- `references/notes/open-requirements-ledger.md`: Research note copied verbatim into the bundle. Record each swap or kept original as a decision, and a matching step whose evidence is too thin to judge as an open entry.
- `references/schemas/summary-galaxy-workflow.schema.json`: Schema file copied verbatim into the bundle. Input contract: read step tool ids, settings, connections, input formats, and tests from the existing-workflow summary.

## Load On Demand

- None declared.

## Validation

- None declared.

## Procedure

Propose edits that make an existing Galaxy workflow cheaper to run without changing what it computes, and hand them over as a reviewable change-set. A cheaper step saves compute on every Galaxy server that runs the workflow, once per sample in every invocation.

The skill acts only on **levers**, the efficiency changes a referenced note documents with its evidence and its exceptions. Today that is the substitution table in galaxy-efficient-tool-substitutions. It does not apply general judgment about what looks slow, and it does not edit the workflow. apply-galaxy-workflow-changeset applies the change-set after a person approves it.

### Procedure

#### 1. Find the matching steps

Read the summary-galaxy-workflow. For each step, including steps inside subworkflows, compare its `tool_id` with each row of the substitution table. A row matches when the step's `tool_id` names the row's original owner, repository, and tool id, at any version. List every matching step by label, or by step id when it has no label.

If no step matches, emit a change-set with no entries and a summary saying which levers were consulted. That is a correct result, not a failure.

#### 2. Check each match against the row's opt-outs

An opt-out keeps the original tool. Check every condition the row lists, using only what the summary shows:

- **Inputs.** Trace the step's input connection upstream to the nearest declared format: an upstream step's output-format setting, or a workflow input's declared format.
- **Settings.** Read the step's `tool_state` for any setting the row says the replacement cannot express.
- **Downstream consumers.** Follow the graph edges from each of the step's outputs. Read each consumer's tool and the settings that act on the data, such as a pattern a filter or find-and-replace step matches.
- **Tests.** Read the existing tests in the summary for assertions on the step's outputs that the row says the replacement breaks.

When a condition holds, keep the original. When the summary cannot settle a condition, for example a collection input with no declared format, propose the swap but name the unsettled condition in the entry's intent, so the reviewer settles it before approving. Append an open entry to the open-requirements-ledger naming the step and the missing evidence. Never present an unsettled condition as checked.

#### 3. Write the change-set

Use the entry format of interview-to-galaxy-workflow-changeset, so apply-galaxy-workflow-changeset and changeset-to-galaxy-test-plan consume it unchanged. Start the document with a short summary: the levers consulted, the steps swapped, and the matching steps kept, each with the opt-out that applied. Then write one entry per swapped step:

- **kind** — `replace-tool`.
- **anchor** — the step label, quoted from the summary.
- **intent** — the replacement's exact `tool_id` from the table, with no version, so the apply step pins its identity and the per-step loop resolves the version. Name each source setting and its counterpart from the row's parameter mapping, and state that the step's output connections stay as they are when the row says the port names match.
- **acceptance** — the step runs the replacement tool, every former consumer still receives the same output port, and each carried setting reads its former value. Name every existing test assertion on the step's outputs that must change under the row's test guidance, so the test plan replaces it instead of meeting it as a failure.

When a row requires a consumer's settings to change with the swap, add a `change-parameter` entry anchored to that consumer, ordered after the `replace-tool` entry. If you cannot state the consumer's new value from the row and the summary, keep the original tool instead.

#### 4. Record the decisions

Append one `decision` to the open-requirements-ledger for each matching step. A swap reads `decision: "Replace <original> with <replacement> at <step>"`. A kept original reads `decision: "Keep <original> at <step>"` with the opt-out in `rationale`. Cite the lever's note in every rationale.

### Scope

- **Only documented levers.** An edit this skill proposes traces to a row or rule in a referenced note. No version bumps, no tidying, and no restructuring the note does not cover. Each of those changes behavior or review burden in ways no lever has measured.
- **No tool resolution.** Name the replacement's identity and leave version and changeset to the per-step loop, as for any `replace-tool` edit.
- **No workflow edits.** The change-set is the output. Applying it is apply-galaxy-workflow-changeset's job.
- **An explicit request wins.** When the workflow's annotation, the step's annotation, or the caller states that a step must use the original tool, keep it and record that as the reason.

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
