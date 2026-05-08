---
type: mold
name: nextflow-summary-to-galaxy-template
axis: source-specific
source: nextflow
target: galaxy
tags:
  - mold
  - source/nextflow
  - target/galaxy
status: draft
created: 2026-05-05
revised: 2026-05-06
revision: 2
ai_generated: true
summary: "gxformat2 skeleton with per-step TODOs from a Nextflow summary and prior Galaxy design briefs."
input_artifacts:
  - id: summary-nextflow
    description: "Structured Nextflow pipeline summary emitted by [[summarize-nextflow]]; consulted while emitting placeholder steps."
  - id: nextflow-galaxy-interface
    description: "Galaxy interface brief from [[nextflow-summary-to-galaxy-interface]] that pins workflow inputs, outputs, labels."
  - id: nextflow-galaxy-data-flow
    description: "Galaxy data-flow brief from [[nextflow-summary-to-galaxy-data-flow]] that pins abstract operations and collection choices."
  - id: iwc-comparison-notes
    description: "Structural diff guidance from [[compare-against-iwc-exemplar]] (run on the design briefs); steers the skeleton toward IWC-aligned structure before per-step authoring."
output_artifacts:
  - id: galaxy-workflow-draft
    kind: yaml
    default_filename: galaxy-workflow-draft.gxwf.yml
    description: "gxformat2 skeleton: workflow inputs, outputs, placeholder steps, rough connections, TODO slots for later implementation Molds."
references:
  - kind: schema
    ref: "[[summary-nextflow]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Read process, channel, operator, and fixture structure when emitting placeholder steps and TODO context."
  - kind: research
    ref: "[[gxformat2-schema]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Use the gxformat2 structural vocabulary for workflow inputs, outputs, steps, and producer-side output actions while emitting the skeleton."
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
    purpose: "Respect the handoff from abstract data-flow draft to gxformat2 skeleton."
    trigger: "When translating abstract nodes, unresolved tool needs, and placeholder transformations into template TODOs."
    verification: "Promote after two worked Nextflow-to-Galaxy templates preserve the data-flow/template split without schema changes."
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
  - kind: research
    ref: "[[nextflow-conditional-to-galaxy-subworkflow-when]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Emit `when:` clauses on the right step type (subworkflow vs tool) and the right output fan-in primitive (`pick_value`, modes `first_non_null` / `first_or_skip` / `the_only_non_null`) when the data-flow brief carries a conditional disposition through to the skeleton."
    trigger: "When the upstream data-flow brief assigns a source conditional to a subworkflow `when:` or inline `when:` shape, or when emitting the merge step for two or more `when:`-gated branches that produce the same logical output."
related_notes:
  - "[[summary-nextflow]]"
  - "[[nextflow-summary-to-galaxy-interface]]"
  - "[[nextflow-summary-to-galaxy-data-flow]]"
---
# nextflow-summary-to-galaxy-template

Read the original Nextflow source artifact, the `summary-nextflow.json` summary, the Nextflow-to-Galaxy interface brief, and the Nextflow-to-Galaxy data-flow brief. Emit a gxformat2 skeleton with workflow inputs, workflow outputs, placeholder steps, rough connections, and TODO slots for later implementation Molds.

The interface and data-flow briefs guide the skeleton, but they do not replace source evidence. Treat the prior-step index as the working context: Nextflow source, source summary, interface brief, data-flow brief, and any open questions carried forward.
