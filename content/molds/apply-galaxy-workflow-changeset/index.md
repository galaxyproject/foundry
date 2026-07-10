---
type: mold
name: apply-galaxy-workflow-changeset
axis: target-specific
target: galaxy
tags:
  - mold
  - target/galaxy
status: draft
created: 2026-07-01
revised: 2026-07-01
revision: 1
ai_generated: true
summary: "Apply a reviewed change-set to a concrete Galaxy workflow: untouched regions preserved, tool-introducing edits injected as drafty steps."
input_artifacts:
  - id: starting-galaxy-workflow
    description: "The normalized concrete gxformat2 workflow being modified, emitted by [[summarize-galaxy-workflow]] (passthrough when already gxformat2, the `.ga`→gxformat2 conversion otherwise). The substrate edits apply to — untouched regions must survive byte-for-byte."
  - id: galaxy-workflow-changeset
    description: "Reviewed, step-anchored change-set from [[interview-to-galaxy-workflow-changeset]]; the edit intents to realize."
  - id: open-requirements-ledger
    description: "Carried obligations ledger [[open-requirements-ledger]]: read open entries bearing on the edits; append any an edit cannot satisfy and mark resolved the ones it closes."
output_artifacts:
  - id: galaxy-workflow-draft
    kind: yaml
    default_filename: galaxy-workflow-draft.gxwf.yml
    schema: "[[galaxy-workflow-draft]]"
    description: "gxformat2 draft (see [[galaxy-workflow-draft-format]]) of the whole workflow: untouched steps carried at Resolved tier verbatim; tool-introducing/replacing edits injected as drafty steps with _plan_* fields for the per-step loop; direct edits applied inline."
  - id: open-requirements-ledger
    kind: yaml
    default_filename: open-requirements.ledger.yml
    description: "Updated obligations ledger: new unmet needs an edit surfaces appended; prior entries its edits close marked resolved."
references:
  - kind: schema
    ref: "[[galaxy-workflow-draft]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: cast-validated
    purpose: "Output contract: the emitted gxformat2 draft conforms to [[galaxy-workflow-draft]]. Cast bundles the JSON Schema so the skill carries its output shape alongside [[draft-validate]] checks."
  - kind: research
    ref: "[[galaxy-workflow-draft-format]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Represent the whole workflow as a draft: carry untouched steps at Resolved tier, inject tool-introducing/replacing edits as drafty steps with _plan_state / _plan_context / _plan_in / _plan_out."
    verification: "Promote after a downstream advance-galaxy-draft-step run drains the injected drafty steps without round-tripping back through the change-set."
  - kind: cli-command
    ref: "[[draft-validate]]"
    used_at: runtime
    load: on-demand
    mode: sidecar
    evidence: hypothesis
    purpose: "Validate the emitted draft against draft-contract rules (sentinel form, topology, _plan_* placement) before handing off to the per-step loop."
    trigger: "After writing the modified draft workflow file."
    verification: "Cast the skill, run on a representative workflow + change-set, confirm draft-validate diagnostics route back."
  - kind: research
    ref: "[[open-requirements-ledger]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Carry the open-requirements ledger: append an edit's unmet need (e.g. a rewire with no reachable producer) rather than fabricating a connection, and mark resolved the ones its edits close."
    verification: "Promote after a worked run shows entries this Mold appends or resolves are consumed downstream without re-derivation."
related_molds:
  - "[[interview-to-galaxy-workflow-changeset]]"
  - "[[advance-galaxy-draft-step]]"
  - "[[repair-galaxy-draft-topology]]"
related_notes:
  - "[[interview-to-galaxy-workflow-changeset]]"
  - "[[galaxy-workflow-draft-format]]"
  - "[[open-requirements-ledger]]"
---
# apply-galaxy-workflow-changeset

Apply a reviewed change-set to a concrete Galaxy workflow and emit a `galaxy-workflow-draft.gxwf.yml`. This Mold plays the topology-settling role the `*-to-galaxy-template` Molds play in the greenfield pipelines — but it starts from an already-concrete workflow, so its defining job is to change **only** what the change-set names and carry everything else through untouched.

**An edit is a drafty region.** The Foundry already drains drafty steps out of a partially-concrete workflow via [[advance-galaxy-draft-step]]. So this Mold does not resolve tools or run an edit loop of its own. It represents the whole modified workflow as a draft (see [[galaxy-workflow-draft-format]]): untouched steps carried at Resolved tier verbatim, and any edit that introduces or replaces a tool injected as a **drafty step + `_plan_*`** for the per-step loop to realize.

## What to apply directly vs. defer

- **Direct edits (applied inline, no drafty step).** `remove-step`, `rewire`, `relabel` / `annotate`, `change-parameter`, `add-input` / `remove-input`, `add-output` / `expose-output`. These need no tool resolution: edit the concrete step/input/output in place and rewire consumers as the change-set dictates. A change-set of purely direct edits yields a draft with `draft: false` — an immediately concrete workflow, no loop iterations.
- **Deferred edits (injected as drafty steps).** `add-step` and `replace-tool` (when the replacement is a different tool or an unpinned version). Add the step at draft tier with `tool_id: TODO` (or Identity-pinned when the change-set pinned an id), and record the operation, source evidence, and constraints in `_plan_state` / `_plan_context` / `_plan_in` / `_plan_out` so [[advance-galaxy-draft-step]] can resolve a wrapper and concretize it.

## Preserve untouched regions

Every step, input, and output the change-set does not name must survive byte-for-byte: same `tool_id`, `tool_version`, `tool_state`, labels, and connections. Do not reorder, reformat, re-case, or "tidy" an unrelated region — a structural diff of the emitted workflow against the input must touch only the change-set's targets and their necessary consequences (e.g. rewiring a consumer of a replaced producer). Gratuitous churn is a defect, not a style choice.

## Computability and the ledger

An edit can create a gap the connection graph won't catch: a rewire whose source doesn't carry what the consumer needs, or a `replace-tool` whose new tool can't supply a downstream port. Before handing off, check each edited region is computable from what feeds it. Where you find a gap you can't wire, append a blocking entry to the [[open-requirements-ledger]] naming the edit, the uncomputable output, and the missing evidence — so the per-step loop or [[repair-galaxy-draft-topology]] acts on it rather than discovering it late. Never fabricate a connection to make the graph look complete. More generally, carry the ledger: read the entries bearing on the edits and mark resolved the ones the change-set closes.

## Hand off

Run [[draft-validate]] on the emitted draft (sentinel form, topology, `_plan_*` placement). On green, hand the draft to [[advance-galaxy-draft-step]], which drains any injected drafty steps and extracts the concrete `galaxy-workflow.gxwf.yml`. If the change-set was all direct edits, the loop is a no-op and the workflow is already concrete.
