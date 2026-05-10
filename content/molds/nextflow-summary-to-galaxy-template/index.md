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
revised: 2026-05-10
revision: 6
ai_generated: true
summary: "gxformat2 skeleton with per-step TODOs from a Nextflow summary and prior Galaxy design briefs."
input_artifacts:
  - id: summary-nextflow
    description: "Structured Nextflow pipeline summary emitted by [[summarize-nextflow]]; consulted while emitting placeholder steps."
  - id: nextflow-galaxy-reference-data
    description: "Reference-data shape brief from [[nextflow-summary-to-galaxy-reference-data]] that pins per-asset reference inputs, optionality, datatype hints, and rebuild-on-absence behavior the skeleton must honor."
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
    description: "gxformat2 draft (see [[galaxy-workflow-draft-format]]): topology fully resolved (workflow inputs, outputs, step set, edges); tool_id / tool_state / tool_shed_repository and wrapper-determined port names may be TODO with free-text _plan_state / _plan_context / _plan_in / _plan_out per step for later implementation Molds."
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
  - kind: research
    ref: "[[nextflow-reference-data-classification]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Cross-check source-side reference-data classifications before committing reference assets, optional inputs, and rebuild behavior into the gxformat2 skeleton."
    trigger: "When emitting workflow inputs or input-connection wiring for reference assets and the reference-data brief is silent, low-confidence, or conflicts with source evidence for iGenomes-derived params, coordinated bundles, compute-if-missing branches, multi-DB pick-lists, or cohort-specific assets."
  - kind: research
    ref: "[[nextflow-to-galaxy-reference-data-mapping]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Resolve reference-asset declarations into gxformat2 inputs with the right datatype, optionality, and rebuild-on-absence wiring; cross-check the upstream brief against the datatypes table and v1 posture when the brief is silent or low-confidence on a specific asset."
    trigger: "When emitting workflow inputs or input-connection wiring for any reference asset flagged in the reference-data brief (FASTA, fai, dict, indexes, dbsnp, known_indels, intervals, PoN, …), or when the source pipeline declares iGenomes-derived params, per-asset reference path params, or any compute-if-missing index-building branch."
related_notes:
  - "[[summary-nextflow]]"
  - "[[nextflow-summary-to-galaxy-interface]]"
  - "[[nextflow-summary-to-galaxy-data-flow]]"
  - "[[nextflow-summary-to-galaxy-reference-data]]"
  - "[[nextflow-reference-data-classification]]"
  - "[[nextflow-to-galaxy-reference-data-mapping]]"
---
# nextflow-summary-to-galaxy-template

Read the original Nextflow source artifact, the `summary-nextflow.json` summary, the Nextflow-to-Galaxy reference-data brief, the Nextflow-to-Galaxy interface brief, and the Nextflow-to-Galaxy data-flow brief. Emit a gxformat2 skeleton with workflow inputs, workflow outputs, placeholder steps, rough connections, and TODO slots for later implementation Molds.

The reference-data, interface, and data-flow briefs guide the skeleton, but they do not replace source evidence. Treat the prior-step index as the working context: Nextflow source, source summary, reference-data brief, interface brief, data-flow brief, and any open questions carried forward.

Topology is this Mold's job to settle. The output must be concrete gxformat2: workflow inputs with their final collection shapes and formats, workflow outputs, the step set, the producer→consumer edge graph, branches, and `when:` guards are all decided here. The upstream interface and data-flow briefs guide those decisions, but if they hedge or leave a topology choice open, this Mold makes the call from source evidence, IWC exemplars, and pattern pages — never emit a topology `TODO`. What is deferred to per-step authoring is strictly wrapper-tier: `tool_id`, `tool_version`, `tool_shed_repository`, `tool_state`, and the wrapper-determined port names that surface in `in:` / `out:` / `outputSource`. Capture deferred intent in the `_plan_*` family (`_plan_state`, `_plan_context`, `_plan_in`, `_plan_out`) so the per-step Mold has the source evidence and constraints it needs.

Defer thoughtfully. When research surfaces a Foundry pattern page that names the exact recipe — a [[galaxy-collection-patterns]] reshape, a [[conditional-run-optional-step]] gate, a [[galaxy-tabular-patterns]] filter — fill the step in as completely as the pattern allows: concrete `tool_id`, parameters, port names from the pattern's worked example. Pattern pages encode resolved choices; emitting `TODO` over a covered recipe discards real evidence the per-step Mold cannot recover. Defer only when the step is a domain-specific scientific tool with no covering pattern (alignment, variant calling, expression quantification, etc.), and pack `_plan_context` with the source command, conda specs, container tags, and pre/post conditions the per-step Mold will need to pick a wrapper.

Output shape is gxformat2 with wrapper-tier relaxations and `_plan_state` / `_plan_context` / `_plan_in` / `_plan_out` per tool step — see [[galaxy-workflow-draft-format]]. Refinement open work for those planning fields lives in `refinement.md`.
