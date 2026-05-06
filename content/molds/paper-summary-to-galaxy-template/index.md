---
type: mold
name: paper-summary-to-galaxy-template
axis: source-specific
source: paper
target: galaxy
tags:
  - mold
  - source/paper
  - target/galaxy
status: draft
created: 2026-05-05
revised: 2026-05-06
revision: 2
ai_generated: true
summary: "gxformat2 skeleton with per-step TODOs from a paper summary and the paper-to-Galaxy design brief."
input_artifacts:
  - id: summary-paper
    description: "Paper summary emitted by [[summarize-paper]]; consulted while emitting placeholder steps."
  - id: paper-galaxy-design
    description: "Combined Galaxy design brief from [[paper-summary-to-galaxy-design]] that pins interface and data-flow choices."
  - id: iwc-comparison-notes
    description: "Structural diff guidance from [[compare-against-iwc-exemplar]] (run on the design brief); steers the skeleton toward IWC-aligned structure before per-step authoring."
output_artifacts:
  - id: galaxy-workflow-draft
    kind: yaml
    default_filename: galaxy-workflow-draft.gxwf.yml
    description: "gxformat2 draft (see [[galaxy-workflow-draft-format]]): workflow inputs, outputs, placeholder steps, rough connections, free-text _plan_state / _plan_context per step; tool_id / tool_state / tool_shed_repository may be TODO or absent for later implementation Molds."
references:
  - kind: research
    ref: "[[galaxy-workflow-draft-format]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Emit the gxformat2 draft superset: TODO tool_id, optional tool_state / tool_shed_repository, and per-step _plan_state / _plan_context planning fields."
    verification: "Promote after a downstream per-step implementation Mold consumes _plan_state and _plan_context without round-tripping back through the source summary."
  - kind: research
    ref: "[[galaxy-workflow-testability-design]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Choose stable workflow input/output labels, testable checkpoint outputs, and fixture-compatible workflow interfaces while drafting the skeleton."
    trigger: "When the template decides workflow inputs, workflow outputs, promoted checkpoints, or collection output identifiers that future tests will need to address."
  - kind: research
    ref: "[[galaxy-collection-semantics]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Preserve Galaxy collection typing and map-over/reduction semantics in the gxformat2 skeleton."
    trigger: "When creating workflow inputs, outputs, and placeholder connections involving collections."
  - kind: research
    ref: "[[galaxy-data-flow-draft-contract]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Respect the handoff from the combined paper-to-Galaxy design brief to the gxformat2 skeleton."
    trigger: "When translating abstract nodes, unresolved tool needs, and placeholder transformations into template TODOs."
    verification: "Promote after two worked paper-to-Galaxy templates preserve the design-brief/template split without schema changes."
  - kind: pattern
    ref: "[[galaxy-collection-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Use corpus-grounded collection pattern guidance for unresolved skeleton steps."
    trigger: "When adding TODO steps for collection cleanup, reshaping, relabeling, identifier synchronization, or collection-tabular bridges."
  - kind: pattern
    ref: "[[galaxy-tabular-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Use corpus-grounded tabular pattern guidance for unresolved skeleton steps."
    trigger: "When adding TODO steps for tabular filtering, projection, joins, aggregation, text-processing recipes, or tabular-collection bridges."
related_notes:
  - "[[paper-summary-to-galaxy-design]]"
---
# paper-summary-to-galaxy-template

Read the original paper artifact, the paper summary Markdown document, and the paper-to-Galaxy design brief. Emit a gxformat2 skeleton with workflow inputs, workflow outputs, placeholder steps, rough connections, and TODO slots for later implementation Molds.

The paper summary does not have a concrete schema yet; treat it as Markdown. Treat the prior-step index as the working context: paper source, paper summary, paper-to-Galaxy design brief, and any open questions carried forward.
