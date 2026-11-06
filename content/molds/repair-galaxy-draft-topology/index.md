---
type: mold
name: repair-galaxy-draft-topology
axis: target-specific
target: galaxy
tags:
  - target/galaxy
status: draft
created: 2026-06-16
revised: 2026-11-06
revision: 6
summary: "Make the smallest structural edit that closes an open blocking entry in a settled Galaxy draft."
input_artifacts:
  - id: galaxy-workflow-draft
    description: "Partially-realized gxformat2 draft (see [[galaxy-workflow-draft-format]]) with an open blocking entry."
  - id: open-requirements-ledger
    description: "Carried obligations ledger [[open-requirements-ledger]]: the run's open, resolved, and surrendered entries with their provenance. Absent on the first Mold of a run; start an empty one."
output_artifacts:
  - id: galaxy-workflow-draft
    kind: yaml
    default_filename: galaxy-workflow-draft.gxwf.yml
    schema: "[[galaxy-workflow-draft]]"
    description: "Edited gxformat2 draft. Each blocking entry addressed is closed by the named edits, and new or replaced steps land at draft tier."
  - id: open-requirements-ledger
    kind: yaml
    default_filename: open-requirements.ledger.yml
    description: "Carried obligations ledger re-emitted by this step: entries it appended or closed updated, every other entry passed through with its provenance intact."
references:
  - kind: schema
    ref: "[[galaxy-workflow-draft]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: cast-validated
    purpose: "In/out contract: the draft this Mold reads and re-wires conforms to [[galaxy-workflow-draft]]; cast bundles the JSON Schema so the re-wired draft stays inside the superset the per-step loop expects."
  - kind: research
    ref: "[[galaxy-workflow-draft-format]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Emit re-wired steps in the draft superset (TODO tool_id, _plan_* fields) so existing per-step machinery realizes them; respect the settle-vs-repair boundary."
    verification: "Promote after a repair run inserts a producer the per-step loop then realizes without re-running the template Mold over the whole draft."
  - kind: research
    ref: "[[open-requirements-ledger]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Scope the repair from the open blocking entries — each names the step and what's missing — then mark resolved each one repaired, and leave any it cannot close open with a note."
    verification: "Promote after a run closes a blocking entry and the loop terminates on the reduced open count."
  - kind: cli-command
    ref: "[[draft-validate]]"
    used_at: runtime
    load: upfront
    mode: sidecar
    evidence: hypothesis
    purpose: "Check the draft contract, including dangling edges and sources, on the edited draft."
    trigger: "After every edit."
    verification: "Cast the skill, run a removal repair on a real draft, confirm the diagnostics name any source left dangling and the repaired draft exits 0."
  - kind: research
    ref: "[[galaxy-data-flow-draft-contract]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Re-wire the affected region consistently with the data-flow design that settled the surrounding topology."
    verification: "Promote after two repairs preserve the surrounding data-flow design without re-deriving it from the source."
  - kind: research
    ref: "[[galaxy-collection-semantics]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Preserve collection typing and map-over/reduction semantics when an edit joins or reshapes collection inputs, and quote the rule when a removal rests on it."
    trigger: "When the repair inserts or rewires steps touching collection inputs, outputs, or mapped/reduced connections, or a removal rests on collection semantics."
  - kind: research
    ref: "[[gxformat2-schema]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Keep post-job actions and nested parameter keys correct when an edit moves them."
    trigger: "When an edit touches `out:` actions (`hide`, `rename`, `change_datatype`) or wires a nested parameter."
  - kind: pattern
    ref: "[[galaxy-conditionals-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Choose how to merge when a `when`-gated step's output feeds another step."
    trigger: "When an inserted or rewired step consumes a `when`-gated step's output."
  - kind: pattern
    ref: "[[galaxy-collection-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Choose a corpus-attested collection recipe when the missing producer is a collection construction, reshape, or bridge."
    trigger: "When the repair sub-path needs collection cleanup, reshaping, relabeling, identifier synchronization, or a collection-tabular bridge."
  - kind: pattern
    ref: "[[galaxy-tabular-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Choose a corpus-attested tabular recipe when the missing evidence is a column, key, or aggregate a tabular step can produce."
    trigger: "When the repair sub-path needs a computed column, join key, filter criterion, or aggregate the blocked step depends on."
related_molds:
  - "[[freeform-summary-to-galaxy-template]]"
  - "[[workflow-brief-to-galaxy-template]]"
  - "[[implement-galaxy-tool-step]]"
  - "[[compare-against-iwc-exemplar]]"
  - "[[apply-galaxy-workflow-changeset]]"
---
# repair-galaxy-draft-topology

Topology is settled upstream by the `*-summary-to-galaxy-template` Mold, and the per-step loop doesn't edit it. This Mold makes the structural edits a settled draft still needs. It runs on an open blocking entry in the [[open-requirements-ledger]]: the settled draft can't give a correct run, and a structural edit closes it. A missing wrapper is this case only when the discover-or-author branch is exhausted: no stock, shed or authored wrapper can produce the step's declared output from its wired inputs, or the ledger already records the wrapper as confirmed absent. A tool version missing from a local cache is not absence. When the ledger records absence, don't search again.

Decide the edit from the entry, the surrounding data-flow design ([[galaxy-data-flow-draft-contract]]), IWC structure, and the pattern pages.

**Edit.** Close each entry with the smallest set of edits, named by change-set kind: `remove-step`, `rewire`, `change-parameter`, `add-input`, `remove-input`, `add-output` / `expose-output`, `add-step`, `replace-tool`. Apply the direct kinds in place. `add-step` and `replace-tool` land at draft tier ([[galaxy-workflow-draft-format]]): concrete topology and edges, wrapper-tier `TODO` for `tool_id` and ports, `_plan_*` carrying intent. The discover-or-author → `summarize-galaxy-tool` → `implement-galaxy-tool-step` machinery realizes them on later loop iterations. A step duplicated from a realized step keeps its pin and `state`, and changes only the key that distinguishes it. Everything the entries don't name stays as it is.

**Interface.** Change the workflow interface only when an entry names that as the remedy or a narrowing requires it. Promote an input with a default equal to the literal it replaces, and remove the literal from `state`. Expose an output by removing its `hide`, unless the design wants it hidden. Removing an input or output is a narrowing: append a `kind: dropped` entry with its `units` and a cited `because`.

**Claims.** A claim about a step with no resolved wrapper is not a fact. Attach it to that step as a plain ledger entry with `step:` set, and keep it out of `doc:`. "Computable" means the tool's semantics give what the output declares, including element count and identifiers for collections. Reading a pinned wrapper's command block or a consumer's parser is allowed. Picking a wrapper is not.

**Removal.** When nothing can close an entry against a drafty step, narrow the step if it isn't fully redundant, and rewrite its `_plan_*` to the reduced job. Otherwise remove it, append the `kind: dropped` entry, and resolve the blocking entry with a note naming the drop. A removal's `because` quotes the primary artifact it rests on: the search run, the wrapper's ports or command block, the semantics rule. The quoted artifacts must carry the removal alone: strike everything uncited, and the removal must still follow. Naming the blocking entry is not a citation, and a tool search says nothing about stock tools. Don't remove a realized step.

**After every edit:**

1. Remove what existed only to feed a removed step: compute it by walking every step's `in:`, the workflow outputs, and `${label}` in `out:` `rename`, not from the entry's wording.
2. Rewrite or remove mentions of removed ids and labels in `doc`, `_plan_*` and comment frames, and any `doc` promising what a removed step supplied.
3. Move a removed step's `rename` or `change_datatype` to the step that inherits its consumers.
4. If an edit touched a step with a twin, a step duplicated from the same tool and plan, make the same edit there.
5. Run [[draft-validate]], with `--concrete --strict-state` when an edit touched a realized step, and fix what it reports.

**Ledger.** Mark each entry you close `resolved`, with a note naming the kinds you applied. A repair must leave fewer open blocking entries than it found. Never insert a producer whose own output is uncomputable from what feeds it. Leave an entry `open`, with a note saying what's unproven, when a consumer truly needs the removed output, when no other edit closes an entry on a realized step, or when the removal doesn't follow from what you can quote. An entry on a realized step reaches the final artifact as a labelled gap. A drafty step stays drafty, and the call reports it.
