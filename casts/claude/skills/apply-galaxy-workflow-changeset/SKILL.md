---
name: apply-galaxy-workflow-changeset
description: "Apply a reviewed change-set to a concrete Galaxy workflow: untouched regions preserved, tool-introducing edits injected as drafty steps."
---

# apply-galaxy-workflow-changeset

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Apply a reviewed change-set to a concrete Galaxy workflow: untouched regions preserved, tool-introducing edits injected as drafty steps.

## Inputs

- Read artifact `galaxy-workflow`. Produced by `advance-galaxy-draft-step`. The concrete gxformat2 workflow being modified (already converted from .ga if needed). The substrate edits apply to — untouched regions must survive byte-for-byte.
- Read artifact `galaxy-workflow-changeset`. Produced by `interview-to-galaxy-workflow-changeset`. Reviewed, step-anchored change-set from interview-to-galaxy-workflow-changeset; the edit intents to realize.
- Read artifact `open-requirements-ledger`. Produced by `advance-galaxy-draft-step`, `apply-galaxy-workflow-changeset`, `compare-against-iwc-exemplar`, `cwl-summary-to-galaxy-data-flow`, `cwl-summary-to-galaxy-interface`, `cwl-summary-to-galaxy-template`, `freeform-summary-to-galaxy-data-flow`, `freeform-summary-to-galaxy-interface`, `freeform-summary-to-galaxy-template`, `implement-galaxy-tool-step`, `interview-to-galaxy-workflow-changeset`, `nextflow-summary-to-galaxy-data-flow`, `nextflow-summary-to-galaxy-interface`, `nextflow-summary-to-galaxy-reference-data`, `nextflow-summary-to-galaxy-template`, `repair-galaxy-draft-topology`. Carried obligations ledger open-requirements-ledger: read open entries bearing on the edits; append any an edit cannot satisfy and mark resolved the ones it closes.

## Outputs

- Write artifact `galaxy-workflow-draft` as `galaxy-workflow-draft.gxwf.yml`. Format: `yaml`. Schema: galaxy-workflow-draft. gxformat2 draft (see galaxy-workflow-draft-format) of the whole workflow: untouched steps carried at Resolved tier verbatim; tool-introducing/replacing edits injected as drafty steps with _plan_* fields for the per-step loop; direct edits applied inline.
- Write artifact `open-requirements-ledger` as `open-requirements.ledger.yml`. Format: `yaml`. Updated obligations ledger: new unmet needs an edit surfaces appended; prior entries its edits close marked resolved.

## Required Tools

- **`gxwf`** (gxwf). `npm install -g @galaxy-tool-util/cli@^1.8.1`.
  Ephemeral run: `npx --yes --package @galaxy-tool-util/cli@1.8.1 gxwf`.
  Check: `gxwf --help | grep -q draft-validate`.
  Docs: https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli

## Load Upfront

- `references/notes/galaxy-workflow-draft-format.md`: Research note copied verbatim into the bundle. Represent the whole workflow as a draft: carry untouched steps at Resolved tier, inject tool-introducing/replacing edits as drafty steps with _plan_state / _plan_context / _plan_in / _plan_out.
- `references/notes/open-requirements-ledger.md`: Research note copied verbatim into the bundle. Carry the open-requirements ledger: append an edit's unmet need (e.g. a rewire with no reachable producer) rather than fabricating a connection, and mark resolved the ones its edits close.
- `references/schemas/galaxy-workflow-draft.schema.json`: Schema file copied verbatim into the bundle. Output contract: the emitted gxformat2 draft conforms to galaxy-workflow-draft. Cast bundles the JSON Schema so the skill carries its output shape alongside draft-validate checks.

## Load On Demand

- `references/cli/draft-validate.json`: CLI command reference packaged as a sidecar. Validate the emitted draft against draft-contract rules (sentinel form, topology, _plan_* placement) before handing off to the per-step loop. Use when: after writing the modified draft workflow file.

## Validation

- Validate `galaxy-workflow-draft.gxwf.yml` for artifact `galaxy-workflow-draft` against the galaxy-workflow-draft schema when a validator is available.

## Procedure

Apply a reviewed change-set to a concrete Galaxy workflow and emit a `galaxy-workflow-draft.gxwf.yml`. This skill plays the topology-settling role the `*-to-galaxy-template` skills play in the greenfield pipelines — but it starts from an already-concrete workflow, so its defining job is to change **only** what the change-set names and carry everything else through untouched.

**An edit is a drafty region.** The Foundry already drains drafty steps out of a partially-concrete workflow via advance-galaxy-draft-step. So this skill does not resolve tools or run an edit loop of its own. It represents the whole modified workflow as a draft (see galaxy-workflow-draft-format): untouched steps carried at Resolved tier verbatim, and any edit that introduces or replaces a tool injected as a **drafty step + `_plan_*`** for the per-step loop to realize.

### What to apply directly vs. defer

- **Direct edits (applied inline, no drafty step).** `remove-step`, `rewire`, `relabel` / `annotate`, `change-parameter`, `add-input` / `remove-input`, `add-output` / `expose-output`. These need no tool resolution: edit the concrete step/input/output in place and rewire consumers as the change-set dictates. A change-set of purely direct edits yields a draft with `draft: false` — an immediately concrete workflow, no loop iterations.
- **Deferred edits (injected as drafty steps).** `add-step` and `replace-tool` (when the replacement is a different tool or an unpinned version). Add the step at draft tier with `tool_id: TODO` (or Identity-pinned when the change-set pinned an id), and record the operation, source evidence, and constraints in `_plan_state` / `_plan_context` / `_plan_in` / `_plan_out` so advance-galaxy-draft-step can resolve a wrapper and concretize it.

### Preserve untouched regions

Every step, input, and output the change-set does not name must survive byte-for-byte: same `tool_id`, `tool_version`, `tool_state`, labels, and connections. Do not reorder, reformat, re-case, or "tidy" an unrelated region — a structural diff of the emitted workflow against the input must touch only the change-set's targets and their necessary consequences (e.g. rewiring a consumer of a replaced producer). Gratuitous churn is a defect, not a style choice.

### Computability and the ledger

An edit can create a gap the connection graph won't catch: a rewire whose source doesn't carry what the consumer needs, or a `replace-tool` whose new tool can't supply a downstream port. Before handing off, check each edited region is computable from what feeds it. Where you find a gap you can't wire, append a blocking entry to the open-requirements-ledger naming the edit, the uncomputable output, and the missing evidence — so the per-step loop or repair-galaxy-draft-topology acts on it rather than discovering it late. Never fabricate a connection to make the graph look complete. More generally, carry the ledger: read the entries bearing on the edits and mark resolved the ones the change-set closes.

### Hand off

Run draft-validate on the emitted draft (sentinel form, topology, `_plan_*` placement). On green, hand the draft to advance-galaxy-draft-step, which drains any injected drafty steps and extracts the concrete `galaxy-workflow.gxwf.yml`. If the change-set was all direct edits, the loop is a no-op and the workflow is already concrete.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
