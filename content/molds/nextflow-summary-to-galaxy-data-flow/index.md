---
type: mold
name: nextflow-summary-to-galaxy-data-flow
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
revision: 4
ai_generated: true
summary: "Translate a Nextflow summary into a Galaxy data-flow design brief."
input_artifacts:
  - id: summary-nextflow
    description: "Structured Nextflow pipeline summary emitted by [[summarize-nextflow]]; the JSON the data-flow translation reads."
  - id: nextflow-galaxy-reference-data
    description: "Reference-data shape brief from [[nextflow-summary-to-galaxy-reference-data]] that pins per-asset reference inputs and rebuild-on-absence behavior."
  - id: nextflow-galaxy-interface
    description: "Preceding Galaxy interface brief from [[nextflow-summary-to-galaxy-interface]] that pins inputs, outputs, and labels."
  - id: open-requirements-ledger
    description: "Carried obligations ledger [[open-requirements-ledger]]: read prior open entries; this design step appends new unmet needs and marks ones its decisions resolve."
output_artifacts:
  - id: nextflow-galaxy-data-flow
    kind: markdown
    default_filename: nextflow-galaxy-data-flow.md
    description: "Reviewable Markdown brief: abstract operations, collection map/reduce choices, shape-changing placeholder steps, unresolved Galaxy tool needs, confidence, open questions."
  - id: open-requirements-ledger
    kind: yaml
    default_filename: open-requirements.ledger.yml
    description: "Updated obligations ledger: new unmet needs this step surfaces appended; prior entries its decisions close marked resolved."
references:
  - kind: research
    ref: "[[open-requirements-ledger]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Carry the open-requirements ledger: read open entries bearing on this step's decisions, mark resolved the ones it closes, and append any new unmet need it surfaces."
    verification: "Promote after a worked run shows entries this Mold appends or resolves are consumed downstream without re-derivation."
  - kind: schema
    ref: "[[summary-nextflow]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Read process, channel, operator, and fixture structure while drafting Galaxy-facing abstract data flow."
  - kind: research
    ref: "[[galaxy-data-flow-draft-contract]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Keep the data-flow brief separate from gxformat2 templating and concrete step implementation."
    verification: "Promote after two worked Galaxy translations preserve this Mold boundary without moving fields."
  - kind: research
    ref: "[[nextflow-to-galaxy-channel-shape-mapping]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Translate Nextflow channel, tuple, and path shapes into Galaxy dataset and collection shapes."
  - kind: research
    ref: "[[nextflow-path-glob-to-galaxy-datatype]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Preserve datatype confidence while translating path-like data-flow edges, process output patterns, and published outputs."
    trigger: "When choosing or reviewing Galaxy datatype extensions for data-flow edges, collection elements, or output datasets."
  - kind: research
    ref: "[[nextflow-operators-to-galaxy-collection-recipes]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Classify Nextflow operators as Galaxy wiring, collection semantics, explicit steps, or review triggers."
  - kind: pattern
    ref: "[[galaxy-collection-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Ground collection-shape choices in curated, corpus-observed operation and recipe patterns."
    trigger: "When selecting collection cleanup, reshape, identifier, or collection-tabular bridge patterns."
  - kind: pattern
    ref: "[[galaxy-tabular-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Ground tabular bridge and table-operation choices in curated, corpus-observed operation patterns."
    trigger: "When data-flow translation needs filtering, joining, aggregation, pivoting, or tabular-collection bridges."
  - kind: pattern
    ref: "[[galaxy-conditionals-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Ground conditional-branch and optional-step choices in curated, corpus-observed Galaxy when/pick_value patterns."
    trigger: "When data-flow translation needs optional steps, gating on non-empty results, routing between alternative outputs, or transform-or-pass-through branches."
  - kind: pattern
    ref: "[[galaxy-interval-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Ground genomic-interval operation choices in curated, corpus-observed Galaxy interval recipes."
    trigger: "When the workflow operates on genomic intervals (BED/GFF/VCF coordinate features) and data-flow translation needs overlap, merge, coverage, windowing, masking, or set-algebra steps."
  - kind: research
    ref: "[[galaxy-sample-sheet-collections]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Preserve per-row metadata on the data-flow side: keep sample_sheet column_definitions wired through identifier-keyed steps instead of dropping into parallel parameter inputs, and re-attach metadata after map-over steps that lose it."
    trigger: "When the upstream interface brief carries a sample_sheet[:paired|:paired_or_unpaired|:record] input, or when the Nextflow summary shows tuple(meta, path...) channel shape originating from samplesheetToList or splitCsv(header: true)."
  - kind: research
    ref: "[[nextflow-reference-data-classification]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Cross-check source-side reference-data classifications before deciding how reference assets and optional rebuild branches flow through the Galaxy data-flow draft."
    trigger: "When the reference-data or interface brief is silent, low-confidence, or conflicts with source evidence for iGenomes-derived params, coordinated bundles, compute-if-missing branches, multi-DB pick-lists, or cohort-specific assets."
  - kind: research
    ref: "[[nextflow-to-galaxy-reference-data-mapping]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Decide how reference assets and their indexes flow through the Galaxy data-flow draft (preserving dbkey through map-overs, deferring index-building to wrappers vs surfacing as workflow steps)."
    trigger: "When the upstream interface brief carries reference-data inputs (FASTA, fai, dict, indexes, known sites, intervals, PoN) or when the source pipeline's compute-if-missing branches imply rebuild semantics the data flow has to honor."
  - kind: research
    ref: "[[nextflow-conditional-to-galaxy-subworkflow-when]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Decide between subworkflow `when:` and inline tool-step `when:` for each source conditional, and pick the right output fan-in primitive (`pick_value` vs twin-cascade) so the data-flow brief carries a coherent conditional disposition forward."
    trigger: "When the Nextflow summary's `workflow.conditionals[]` is non-empty, or when subworkflow boundaries in the source align with parameter-driven branches (step, aligner, wes, tools, skip_*, use_*)."
related_notes:
  - "[[summary-nextflow]]"
  - "[[nextflow-summary-to-galaxy-interface]]"
  - "[[nextflow-summary-to-galaxy-template]]"
  - "[[nextflow-reference-data-classification]]"
  - "[[nextflow-params-to-galaxy-inputs]]"
  - "[[nextflow-path-glob-to-galaxy-datatype]]"
---
# nextflow-summary-to-galaxy-data-flow

Read a Nextflow summary plus the preceding Galaxy interface brief and emit a reviewable Markdown data-flow brief. Capture abstract operations, collection map/reduce choices, shape-changing placeholder transformations, unresolved Galaxy tool needs, confidence, and open questions.

The output is not gxformat2 and should not resolve exact Tool Shed tools. [[nextflow-summary-to-galaxy-template]] turns this handoff and the interface brief into a skeleton.

Carry the [[open-requirements-ledger]] through this step: read the open entries that bear on the choices you make here, mark resolved any your decisions close, and append any new unmet need you surface — a declared output with no producer, an unpinned parameter, a tool with no corpus exemplar — so a later Mold inherits it instead of re-deriving it.
