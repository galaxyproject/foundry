---
type: mold
name: workflow-brief-to-galaxy-template
axis: target-specific
target: galaxy
tags:
  - target/galaxy
status: draft
created: 2026-05-05
revised: 2026-09-20
revision: 7
summary: "Build a gxformat2 skeleton from a reviewed Workflow Brief and its Galaxy design briefs, consulting retained source evidence."
input_artifacts:
  - id: workflow-brief
    description: "Expert-reviewed implementation contract governing scope and requirements."
  - id: freeform-summary
    role: source-evidence
    optional: true
    description: "Optional narrative source evidence retained from brief production; consult it for source-backed detail within the selected scope."
  - id: summary-nextflow
    role: source-evidence
    optional: true
    description: "Optional structured Nextflow source evidence; source processes and channels are evidence, not a Galaxy topology mandate."
  - id: workflow-brief-galaxy-interface
    description: "Galaxy interface brief from [[workflow-brief-to-galaxy-interface]] that pins workflow inputs, outputs, labels."
  - id: workflow-brief-galaxy-data-flow
    description: "Galaxy data-flow brief from [[workflow-brief-to-galaxy-data-flow]] that pins abstract operations and collection choices."
  - id: iwc-comparison-notes
    description: "Structural diff guidance from [[compare-against-iwc-exemplar]] (run on the design brief); steers the skeleton toward IWC-aligned structure before per-step authoring. Carries an inline gxformat2 excerpt of the nearest exemplar."
  - id: iwc-exemplar-gxformat2
    description: "Cleaned gxformat2 view of the nearest IWC exemplar's relevant subgraph from [[compare-against-iwc-exemplar]]; pattern-match the draft's input/collection shapes, map-over wiring, output promotion, and post-job actions against this concrete idiom. Absent when no nearest exemplar was found."
  - id: open-requirements-ledger
    description: "Carried obligations ledger [[open-requirements-ledger]]: the run's open, resolved, and surrendered entries with their provenance. Absent on the first Mold of a run; start an empty one."
output_artifacts:
  - id: galaxy-workflow-draft
    kind: yaml
    default_filename: galaxy-workflow-draft.gxwf.yml
    schema: "[[galaxy-workflow-draft]]"
    description: "gxformat2 draft (see [[galaxy-workflow-draft-format]]): topology fully resolved (workflow inputs, outputs, step set, edges); tool_id / state / tool_shed_repository and wrapper-determined port names may be TODO with free-text _plan_state / _plan_context / _plan_in / _plan_out per step for later implementation Molds."
  - id: open-requirements-ledger
    kind: yaml
    default_filename: open-requirements.ledger.yml
    description: "Carried obligations ledger re-emitted by this step: entries it appended or closed updated, every other entry passed through with its provenance intact."
references:
  - kind: schema
    ref: "[[workflow-brief-schema]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: cast-validated
    purpose: "Carry the required implementation-contract shape into skeleton construction."
  - kind: research
    ref: "[[workflow-brief-design]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Keep the reviewed brief authoritative while using retained summaries as evidence rather than replacement intent."
    verification: "Confirm a worked run preserves brief scope and bytes through topology construction."
  - kind: schema
    ref: "[[galaxy-workflow-draft]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: cast-validated
    purpose: "Output contract: the emitted gxformat2 draft conforms to [[galaxy-workflow-draft]]. Cast bundles the JSON Schema so the skill carries its output shape alongside the [[draft-validate]] CLI checks."
  - kind: cli-command
    ref: "[[draft-validate]]"
    used_at: runtime
    load: on-demand
    mode: sidecar
    evidence: hypothesis
    purpose: "Validate the emitted draft against draft-contract rules (sentinel form, topology, _plan_* placement) before handing off."
    trigger: "After writing or modifying the draft workflow file."
    verification: "Cast the skill, run on a representative paper-derived summary, confirm draft-validate diagnostics route back."
  - kind: research
    ref: "[[open-requirements-ledger]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Close the open entries the settled topology discharges, and append a blocking entry for any settled step whose declared output no wired input can supply — the computability gap gxwf validation cannot see, raised here rather than left for the per-step loop to hit."
    verification: "Promote after a worked run shows entries this Mold appends or resolves are consumed downstream without re-derivation."
  - kind: research
    ref: "[[galaxy-workflow-draft-format]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Emit the gxformat2 draft superset: TODO tool_id, optional state / tool_shed_repository, and per-step _plan_state / _plan_context planning fields."
    verification: "Promote after a downstream per-step implementation Mold consumes _plan_state and _plan_context without re-deriving intent from source evidence."
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
    purpose: "Respect the handoff from the Workflow-Brief-to-Galaxy interface and data-flow briefs to the gxformat2 skeleton."
    trigger: "When translating abstract nodes, unresolved tool needs, and placeholder transformations into template TODOs."
    verification: "Promote after two worked brief-to-Galaxy templates preserve the design-brief/template split without schema changes."
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
  - kind: research
    ref: "[[galaxy-workflow-comments]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Group the settled step set into titled stage frames (the gxformat2 `comments:` array) so the skeleton carries the analysis-stage narrative IWC authors annotate by hand. Schema-legal and optional."
    trigger: "After topology is settled and the skeleton can be partitioned into named analysis stages (inputs, per-stage step clusters, parameter-derivation knots, visualization/outputs)."
related_notes:
  - "[[workflow-brief-to-galaxy-interface]]"
  - "[[workflow-brief-to-galaxy-data-flow]]"
---
# workflow-brief-to-galaxy-template

Read the unchanged Workflow Brief and its Galaxy interface and data-flow briefs. Consult the original source artifact and retained `freeform-summary` or `summary-nextflow` when present. Emit a gxformat2 skeleton with workflow inputs, workflow outputs, placeholder steps, rough connections, and TODO slots for later implementation Molds.

The Workflow Brief is the implementation contract. Source artifacts are an evidence dossier: use them to substantiate methods, formats, parameters, and named tools within the selected scope, never to reintroduce excluded work or override expert requirements. A hand-authored brief without a source summary remains a valid input; record consequential missing evidence in the ledger instead of inventing it.

Topology is this Mold's job to settle. The output must be concrete gxformat2: workflow inputs with their final collection shapes and formats, workflow outputs, the step set, the producer→consumer edge graph, branches, and `when:` guards are all decided here. The upstream Workflow-Brief-to-Galaxy interface and data-flow briefs guide those decisions, but if they hedge or leave a topology choice open, this Mold makes the call from reviewed intent, source evidence, IWC exemplars, and pattern pages — never emit a topology `TODO`. Wrapper resolution, by contrast, is **evidence-gated, not source-gated**: resolve each tool step to the tier its evidence supports — **Resolved** (fully concrete, no `_plan_*`), **Identity-pinned** (concrete `tool_id`, parameters and changeset left to the per-step Mold), or **Deferred** (`tool_id: TODO`) — as defined in [[galaxy-workflow-draft-format]]. Capture whatever you defer in the `_plan_*` family (`_plan_state`, `_plan_context`, `_plan_in`, `_plan_out`) so the per-step Mold has the source evidence and constraints it needs.

Evidence tendency: narrative sources name tools less often than structured pipeline summaries, so their steps land in **Deferred** more often — but source evidence that names a specific tool/version can harden to the matching tier, and a corpus-confirmed utility wrapper is not deferred merely because the source is informal. When deferring a domain tool, cite the originating paper section, interview answer, pipeline location, figure, or supplementary table in `_plan_context`, and record vague intent in `_plan_state` so the per-step Mold knows the evidence ceiling.

Before handing off, sanity-check that each step is computable from what feeds it. Once the step set is settled, re-read it and ask, for each step, whether the operation its intent implies can actually be produced from the inputs you wired. The connection graph only knows that ports connect — not what each port is supposed to *contain* — so an output that needs evidence no input carries will validate fine and still be impossible to implement. Where you spot that gap, don't leave it implicit: wire (or add) the step that supplies the missing input, or record the unmet need plainly in `_plan_state` so the per-step Mold or a reviewer can act on it rather than discover it late.

Things worth a second look:

- an output column or field that no wired input carries;
- an aggregate or summary whose grouping key isn't present upstream;
- a filter or threshold whose criterion isn't produced by any input;
- a join whose key doesn't exist on both sides;
- a step whose `_plan_*` promises more than its `in:` ports can supply;
- if classification step, is that classification/enumeration possible only from inputs.

Optionally, once topology is settled, group the step set into titled stage frames via the gxformat2 `comments:` array (one frame per analysis stage, `contains_steps:` populated, color decorative) — see [[galaxy-workflow-comments]] for the convention.

Before handing off, check each settled step is computable from what feeds it. The connection graph knows that ports connect, not what they carry — so a declared output that needs evidence no wired input supplies will validate yet can't be implemented. Where you find that gap, wire (or add) the producer; if you can't, record the vague intent in `_plan_state` and append a **blocking** entry to the [[open-requirements-ledger]] naming the step, the uncomputable output, and the missing evidence, so the per-step loop or [[repair-galaxy-draft-topology]] acts on it rather than discovering it late.

Output shape is gxformat2 with wrapper-tier relaxations and `_plan_state` / `_plan_context` / `_plan_in` / `_plan_out` per tool step — see [[galaxy-workflow-draft-format]]. Refinement open work for those planning fields lives in `refinement.md`.
