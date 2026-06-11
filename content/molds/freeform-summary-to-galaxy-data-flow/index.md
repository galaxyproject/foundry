---
type: mold
name: freeform-summary-to-galaxy-data-flow
axis: source-specific
source: freeform
target: galaxy
tags:
  - mold
  - source/freeform
  - target/galaxy
status: draft
created: 2026-06-09
revised: 2026-06-09
revision: 1
ai_generated: true
summary: "Translate a free-form source summary into a Galaxy data-flow design brief."
input_artifacts:
  - id: freeform-summary
    description: "Free-form source summary emitted by [[summarize-paper]] or [[interview-to-freeform-summary]]; consumed alongside the Galaxy interface brief."
  - id: freeform-galaxy-interface
    description: "Preceding Galaxy interface brief from [[freeform-summary-to-galaxy-interface]] that pins inputs, outputs, and labels."
output_artifacts:
  - id: freeform-galaxy-data-flow
    kind: markdown
    default_filename: freeform-galaxy-data-flow.md
    description: "Reviewable Markdown brief: abstract operations, collection map/reduce choices, shape-changing placeholder steps, unresolved Galaxy tool needs, confidence, open questions."
references:
  - kind: research
    ref: "[[galaxy-data-flow-draft-contract]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Keep the data-flow brief separate from gxformat2 templating and concrete step implementation."
    verification: "Promote after two worked freeform-to-Galaxy translations preserve this Mold boundary without moving fields."
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
    trigger: "When the interface brief carries a sample_sheet[:paired|:paired_or_unpaired|:record] input, or the free-form summary describes per-sample/per-record metadata that must survive map-over steps."
related_notes:
  - "[[freeform-summary-to-galaxy-interface]]"
  - "[[freeform-summary-to-galaxy-template]]"
---
# freeform-summary-to-galaxy-data-flow

Read a free-form source summary plus the preceding Galaxy interface brief and emit a reviewable Markdown data-flow brief. Capture abstract operations, collection map/reduce choices, shape-changing placeholder transformations, unresolved Galaxy tool needs, confidence, and open questions.

Free-form sources rarely give enough to fix exact operations. Translate what the summary and interface brief support, classify the rest as unresolved tool needs or open questions, and do not present narrative intent as already-decided Galaxy wiring.

The output is not gxformat2 and should not resolve exact Tool Shed tools. [[freeform-summary-to-galaxy-template]] turns this handoff and the interface brief into a skeleton.
