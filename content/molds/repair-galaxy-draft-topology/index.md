---
type: mold
name: repair-galaxy-draft-topology
axis: target-specific
target: galaxy
tags:
  - mold
  - target/galaxy
status: draft
created: 2026-06-16
revised: 2026-06-16
revision: 1
ai_generated: true
summary: "Re-wire a Galaxy draft region when a step's declared output can't be computed from its wired inputs."
input_artifacts:
  - id: galaxy-workflow-draft
    description: "Partially-realized gxformat2 draft (see [[galaxy-workflow-draft-format]]) whose topology can't support a declared step — the region to repair."
  - id: open-requirements-ledger
    description: "Carried obligations from [[open-requirements-ledger]]; the open blocking entries name which step output is uncomputable and what evidence is missing."
output_artifacts:
  - id: galaxy-workflow-draft
    kind: yaml
    default_filename: galaxy-workflow-draft.gxwf.yml
    schema: "[[galaxy-workflow-draft]]"
    description: "Re-wired gxformat2 draft: a producer step (or small sub-path) inserted so the previously-blocked step's declared output is computable; new steps land at draft (TODO) tier."
  - id: open-requirements-ledger
    kind: yaml
    default_filename: open-requirements.ledger.yml
    description: "Ledger with the addressed blocking entries marked resolved, or surrendered with a note when no producer can be found within the escalation budget."
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
    purpose: "Read open blocking entries to scope the repair; mark each resolved or surrender it, feeding the loop's decreasing-blocker convergence gate."
    verification: "Promote after a run closes a blocking entry and the loop terminates on the reduced open count."
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
    purpose: "Preserve collection typing and map-over/reduction semantics when an inserted producer step joins or reshapes collection inputs."
    trigger: "When the repair inserts or rewires steps touching collection inputs, outputs, or mapped/reduced connections."
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
  - "[[implement-galaxy-tool-step]]"
  - "[[compare-against-iwc-exemplar]]"
---
# repair-galaxy-draft-topology

Topology is settled upstream by the `*-summary-to-galaxy-template` Mold, and the per-step loop is wrapper-tier — it does not edit topology. This Mold is the **escalation target** the loop reaches when implementation proves the settled topology cannot support a declared step: a step output that needs evidence no wired input carries (the connection graph validates fine, but nothing produces what the output requires). Wrapper-tier gaps — no Tool Shed wrapper picked yet — are not this case; those route through the discover-or-author branch.

You are invoked with the partially-realized draft and the [[open-requirements-ledger]]. Read the open blocking entries: each names a step, the uncomputable output, and the missing evidence. Your job is **bounded topology repair** — not re-settling the workflow. Repair the named region and nothing else; the surrounding topology, already-realized steps, and workflow interface stay put.

Decide the *shape* of the fix from the missing evidence, the surrounding data-flow design ([[galaxy-data-flow-draft-contract]]), IWC structure, and the pattern pages. It may be one producer step, or a small sub-path of a few tools, or — when the declared output is genuinely uncomputable and no producer exists — narrowing the step to what its inputs can support. Insert the new step(s) in the draft superset ([[galaxy-workflow-draft-format]]): concrete topology and edges, wrapper-tier `TODO` for `tool_id` and ports, `_plan_*` fields carrying intent. The existing discover-or-author → `summarize-galaxy-tool` → `implement-galaxy-tool-step` machinery realizes them on later loop iterations; do not resolve wrappers here.

Then update the ledger. For each blocking entry your repair addresses, mark it `resolved` with a note on how (producer added, sub-path added, output narrowed). The loop's convergence gate counts open blocking entries and requires each escalation to strictly reduce that count, under a hard cap on escalations. If you cannot close an entry — no producer is discoverable and the output cannot be honestly narrowed — **surrender it**: leave it open with a note, so the terminal path writes it into the final draft as a labelled gap rather than spinning or fabricating. Never insert a producer whose own output is uncomputable from what feeds it; that grows the DAG without reducing the open count and the loop will not converge.
