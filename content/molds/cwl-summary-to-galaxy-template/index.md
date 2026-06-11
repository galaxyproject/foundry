---
type: mold
name: cwl-summary-to-galaxy-template
axis: source-specific
source: cwl
target: galaxy
tags:
  - mold
  - source/cwl
  - target/galaxy
status: draft
created: 2026-05-05
revised: 2026-06-11
revision: 4
ai_generated: true
summary: "gxformat2 skeleton with per-step TODOs from a CWL summary and prior Galaxy design briefs."
input_artifacts:
  - id: summary-cwl
    description: "Structured CWL summary emitted by [[summarize-cwl]]; consulted while emitting placeholder steps."
  - id: cwl-galaxy-interface
    description: "Galaxy interface brief from [[cwl-summary-to-galaxy-interface]] that pins workflow inputs, outputs, labels."
  - id: cwl-galaxy-data-flow
    description: "Galaxy data-flow brief from [[cwl-summary-to-galaxy-data-flow]] that pins abstract operations and collection choices."
  - id: iwc-comparison-notes
    description: "Structural diff guidance from [[compare-against-iwc-exemplar]] (run on the design briefs); steers the skeleton toward IWC-aligned structure before per-step authoring. Carries an inline gxformat2 excerpt of the nearest exemplar."
  - id: iwc-exemplar-gxformat2
    description: "Cleaned gxformat2 view of the nearest IWC exemplar's relevant subgraph from [[compare-against-iwc-exemplar]]; pattern-match the draft's input/collection shapes, map-over wiring, output promotion, and post-job actions against this concrete idiom. Absent when no nearest exemplar was found."
output_artifacts:
  - id: galaxy-workflow-draft
    kind: yaml
    default_filename: galaxy-workflow-draft.gxwf.yml
    schema: "[[galaxy-workflow-draft]]"
    description: "gxformat2 draft (see [[galaxy-workflow-draft-format]]): topology fully resolved (workflow inputs, outputs, step set, edges); tool_id / tool_state / tool_shed_repository and wrapper-determined port names may be TODO with free-text _plan_state / _plan_context / _plan_in / _plan_out per step for later implementation Molds."
references:
  - kind: schema
    ref: "[[galaxy-workflow-draft]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: cast-validated
    purpose: "Output contract: the emitted gxformat2 draft conforms to [[galaxy-workflow-draft]]. Cast bundles the JSON Schema so the skill carries its output shape alongside the [[draft-validate]] CLI checks."
  - kind: schema
    ref: "[[summary-cwl]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: cast-validated
    purpose: "Read CWL source graph, step ids, command surfaces, scatter, conditionals, requirements, and warnings while emitting placeholder steps."
  - kind: cli-command
    ref: "[[draft-validate]]"
    used_at: runtime
    load: on-demand
    mode: sidecar
    evidence: hypothesis
    purpose: "Validate the emitted draft against draft-contract rules (sentinel form, topology, _plan_* placement) before handing off."
    trigger: "After writing or modifying the draft workflow file."
    verification: "Cast the skill, run on a representative CWL workflow, confirm draft-validate diagnostics route back."
  - kind: research
    ref: "[[component-cwl-workflow-anatomy]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Preserve the lightweight CWL boundary and avoid re-inferring structure already present in the summary."
    verification: "Run after the first CWL interface/data-flow briefs and confirm gxformat2 placeholder steps preserve CWL step boundaries unless the data-flow brief explicitly asks to split them."
  - kind: research
    ref: "[[gxformat2-schema]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Use the gxformat2 structural vocabulary for workflow inputs, outputs, steps, and placeholder wiring."
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
    purpose: "Translate CWL arrays, records, scatter, and secondary-file shapes into Galaxy collection typing and map-over/reduction semantics."
    trigger: "When creating workflow inputs, outputs, and placeholder connections involving collections."
  - kind: research
    ref: "[[galaxy-data-flow-draft-contract]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Respect the handoff from abstract data-flow draft to gxformat2 skeleton."
    trigger: "When translating abstract nodes, unresolved tool needs, and placeholder transformations into template TODOs."
    verification: "Promote after two worked CWL-to-Galaxy templates preserve the data-flow/template split without schema changes."
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
  - kind: pattern
    ref: "[[galaxy-conditionals-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Use corpus-grounded conditional pattern guidance for unresolved skeleton steps."
    trigger: "When adding TODO steps for optional steps, gating on non-empty results, routing between alternative outputs, or transform-or-pass-through branches."
  - kind: pattern
    ref: "[[galaxy-interval-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Use corpus-grounded genomic-interval pattern guidance for unresolved skeleton steps."
    trigger: "When adding TODO steps for interval overlap, merge, coverage, windowing, masking, or set-algebra on coordinate features."
related_notes:
  - "[[summary-cwl]]"
  - "[[cwl-summary-to-galaxy-interface]]"
  - "[[cwl-summary-to-galaxy-data-flow]]"
  - "[[component-cwl-workflow-anatomy]]"
---
# cwl-summary-to-galaxy-template

Read the original CWL source artifact, the CWL summary, the CWL-to-Galaxy interface brief, and the CWL-to-Galaxy data-flow brief. Emit a gxformat2 skeleton with workflow inputs, workflow outputs, placeholder steps, rough connections, and TODO slots for later implementation Molds.

CWL already carries structured workflow shape, so this Mold should be lighter than [[nextflow-summary-to-galaxy-template]]. Treat the prior-step index as the working context: CWL source, CWL summary, interface brief, data-flow brief, and any open questions carried forward.

Topology is this Mold's job to settle. The output must be concrete gxformat2: workflow inputs with their final collection shapes and formats, workflow outputs, the step set, the producer→consumer edge graph, branches, and `when:` guards are all decided here. The upstream interface and data-flow briefs guide those decisions, but if they hedge or leave a topology choice open, this Mold makes the call from source evidence, IWC exemplars, and pattern pages — never emit a topology `TODO`. What is deferred to per-step authoring is strictly wrapper-tier: `tool_id`, `tool_version`, `tool_shed_repository`, `tool_state`, and the wrapper-determined port names that surface in `in:` / `out:` / `outputSource`. Capture deferred intent in the `_plan_*` family (`_plan_state`, `_plan_context`, `_plan_in`, `_plan_out`) so the per-step Mold has the source evidence and constraints it needs.

Defer thoughtfully. When research surfaces a Foundry pattern page that names the exact recipe — a [[galaxy-collection-patterns]] reshape, a [[conditional-run-optional-step]] gate, a [[galaxy-tabular-patterns]] filter — fill the step in as completely as the pattern allows: concrete `tool_id`, parameters, port names from the pattern's worked example. Pattern pages encode resolved choices; emitting `TODO` over a covered recipe discards real evidence the per-step Mold cannot recover. Defer only when the step is a domain-specific CWL `CommandLineTool` with no covering pattern, and pack `_plan_context` with the `baseCommand` / `arguments`, `DockerRequirement` URIs, `SoftwareRequirement` packages, and `EnvVarRequirement` / `ResourceRequirement` constraints the per-step Mold needs to pick a wrapper.

Output shape is gxformat2 with wrapper-tier relaxations and `_plan_state` / `_plan_context` / `_plan_in` / `_plan_out` per tool step — see [[galaxy-workflow-draft-format]]. Refinement open work for those planning fields lives in `refinement.md`.

Use CWL step ids as the first pass for placeholder labels, then revise labels only when the interface/data-flow briefs or IWC comparison notes give a clearer Galaxy convention. Preserve one placeholder per logical CWL step unless the data-flow brief explicitly asks to split an expression, nested workflow, or collection operation into Galaxy-native steps.
