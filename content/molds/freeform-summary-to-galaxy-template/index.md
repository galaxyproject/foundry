---
type: mold
name: freeform-summary-to-galaxy-template
axis: source-specific
source: freeform
target: galaxy
tags:
  - mold
  - source/freeform
  - target/galaxy
status: draft
created: 2026-05-05
revised: 2026-06-11
revision: 4
ai_generated: true
summary: "gxformat2 skeleton with per-step TODOs from a free-form summary and Galaxy design brief."
input_artifacts:
  - id: freeform-summary
    description: "Free-form source summary emitted by [[summarize-paper]] or [[interview-to-freeform-summary]]; consulted while emitting placeholder steps."
  - id: freeform-galaxy-interface
    description: "Galaxy interface brief from [[freeform-summary-to-galaxy-interface]] that pins workflow inputs, outputs, labels."
  - id: freeform-galaxy-data-flow
    description: "Galaxy data-flow brief from [[freeform-summary-to-galaxy-data-flow]] that pins abstract operations and collection choices."
  - id: iwc-comparison-notes
    description: "Structural diff guidance from [[compare-against-iwc-exemplar]] (run on the design brief); steers the skeleton toward IWC-aligned structure before per-step authoring. Carries an inline gxformat2 excerpt of the nearest exemplar."
  - id: iwc-exemplar-gxformat2
    description: "Cleaned gxformat2 view of the nearest IWC exemplar's relevant subgraph from [[compare-against-iwc-exemplar]]; pattern-match the draft's input/collection shapes, map-over wiring, output promotion, and post-job actions against this concrete idiom. Absent when no nearest exemplar was found."
  - id: open-requirements-ledger
    description: "Carried obligations ledger [[open-requirements-ledger]]: read prior open entries; this design step appends new unmet needs and marks ones its decisions resolve."
output_artifacts:
  - id: galaxy-workflow-draft
    kind: yaml
    default_filename: galaxy-workflow-draft.gxwf.yml
    schema: "[[galaxy-workflow-draft]]"
    description: "gxformat2 draft (see [[galaxy-workflow-draft-format]]): topology fully resolved (workflow inputs, outputs, step set, edges); tool_id / tool_state / tool_shed_repository and wrapper-determined port names may be TODO with free-text _plan_state / _plan_context / _plan_in / _plan_out per step for later implementation Molds."
  - id: open-requirements-ledger
    kind: yaml
    default_filename: open-requirements.ledger.yml
    description: "Updated obligations ledger: new unmet needs this step surfaces appended; prior entries its decisions close marked resolved."
references:
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
    purpose: "Carry the open-requirements ledger: read open entries bearing on this step's decisions, mark resolved the ones it closes, and append any new unmet need it surfaces."
    verification: "Promote after a worked run shows entries this Mold appends or resolves are consumed downstream without re-derivation."
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
    purpose: "Respect the handoff from the freeform-to-Galaxy interface and data-flow briefs to the gxformat2 skeleton."
    trigger: "When translating abstract nodes, unresolved tool needs, and placeholder transformations into template TODOs."
    verification: "Promote after two worked freeform-to-Galaxy templates preserve the design-brief/template split without schema changes."
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
  - "[[freeform-summary-to-galaxy-interface]]"
  - "[[freeform-summary-to-galaxy-data-flow]]"
---
# freeform-summary-to-galaxy-template

Read the original free-form source artifact if present, the free-form summary Markdown document, and the freeform-to-Galaxy interface and data-flow briefs. Emit a gxformat2 skeleton with workflow inputs, workflow outputs, placeholder steps, rough connections, and TODO slots for later implementation Molds.

The free-form summary does not have a concrete schema yet; treat it as Markdown. Treat the prior-step index as the working context: source transcript or paper, free-form summary, freeform-to-Galaxy interface and data-flow briefs, and any open questions carried forward.

Topology is this Mold's job to settle. The output must be concrete gxformat2: workflow inputs with their final collection shapes and formats, workflow outputs, the step set, the producer→consumer edge graph, branches, and `when:` guards are all decided here. The upstream freeform-to-Galaxy interface and data-flow briefs guide those decisions, but if they hedge or leave a topology choice open, this Mold makes the call from source evidence, IWC exemplars, and pattern pages — never emit a topology `TODO`. Wrapper resolution, by contrast, is **evidence-gated, not source-gated**: resolve each tool step to the tier its evidence supports — **Resolved** (fully concrete, no `_plan_*`), **Identity-pinned** (concrete `tool_id`, parameters and changeset left to the per-step Mold), or **Deferred** (`tool_id: TODO`) — as defined in [[galaxy-workflow-draft-format]]. Capture whatever you defer in the `_plan_*` family (`_plan_state`, `_plan_context`, `_plan_in`, `_plan_out`) so the per-step Mold has the source evidence and constraints it needs.

Source tendency: free-form sources rarely name tools, so steps land in **Deferred** more often than nf-core or CWL — but a free-form source that *does* name a specific tool/version with evidence hardens to the matching tier, and a corpus-confirmed utility wrapper (interval/tabular/collection op) is not deferred just because the surrounding prose is informal. When deferring a domain tool, cite the originating paper section, interview answer, figure, or supplementary table in `_plan_context`, and record vague intent in `_plan_state` ("default settings", "stranded reverse if mentioned, else unstranded") so the per-step Mold knows the evidence ceiling.

Before handing off, sanity-check that each step is computable from what feeds it. Once the step set is settled, re-read it and ask, for each step, whether the operation its intent implies can actually be produced from the inputs you wired. The connection graph only knows that ports connect — not what each port is supposed to *contain* — so an output that needs evidence no input carries will validate fine and still be impossible to implement. Where you spot that gap, don't leave it implicit: wire (or add) the step that supplies the missing input, or record the unmet need plainly in `_plan_state` so the per-step Mold or a reviewer can act on it rather than discover it late.

Things worth a second look:

- an output column or field that no wired input carries;
- an aggregate or summary whose grouping key isn't present upstream;
- a filter or threshold whose criterion isn't produced by any input;
- a join whose key doesn't exist on both sides;
- a step whose `_plan_*` promises more than its `in:` ports can supply;
- if classification step, is that classification/enumeration possible only from inputs.

Optionally, once topology is settled, group the step set into titled stage frames via the gxformat2 `comments:` array (one frame per analysis stage, `contains_steps:` populated, color decorative) — see [[galaxy-workflow-comments]] for the convention.

Before handing off, check each settled step is computable from what feeds it. The connection graph knows that ports connect, not what they carry — so a declared output that needs evidence no wired input supplies will validate yet can't be implemented. Where you find that gap, wire (or add) the producer; if you can't, append a blocking entry to the [[open-requirements-ledger]] naming the step, the uncomputable output, and the missing evidence (and record vague intent in `_plan_state`) so the per-step loop or [[repair-galaxy-draft-topology]] acts on it rather than discovering it late. More generally, carry the ledger: read the entries bearing on your topology decisions and mark resolved the ones you close.

Output shape is gxformat2 with wrapper-tier relaxations and `_plan_state` / `_plan_context` / `_plan_in` / `_plan_out` per tool step — see [[galaxy-workflow-draft-format]]. Refinement open work for those planning fields lives in `refinement.md`.
