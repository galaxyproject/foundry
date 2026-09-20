---
type: mold
name: workflow-brief-to-galaxy-data-flow
axis: target-specific
target: galaxy
tags:
  - target/galaxy
status: draft
created: 2026-06-09
revised: 2026-09-20
revision: 4
summary: "Translate a reviewed Workflow Brief and its Galaxy interface into a Galaxy data-flow design brief."
input_artifacts:
  - id: workflow-brief
    description: "Expert-reviewed implementation contract governing scientific scope, requirements, and acceptance criteria."
  - id: freeform-summary
    role: source-evidence
    optional: true
    description: "Optional narrative source evidence retained from brief production; consult it for details within the selected scope."
  - id: summary-nextflow
    role: source-evidence
    optional: true
    description: "Optional structured Nextflow source evidence; consult it without treating source implementation as Galaxy design."
  - id: workflow-brief-galaxy-interface
    description: "Preceding Galaxy interface brief from [[workflow-brief-to-galaxy-interface]] that pins inputs, outputs, and labels."
  - id: open-requirements-ledger
    description: "Carried workflow-run knowledge [[open-requirements-ledger]] initialized by the interface Mold."
output_artifacts:
  - id: workflow-brief-galaxy-data-flow
    kind: markdown
    default_filename: workflow-brief-galaxy-data-flow.md
    description: "Reviewable Markdown brief: abstract operations, collection map/reduce choices, shape-changing placeholder steps, unresolved Galaxy tool needs, confidence, open questions."
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
    purpose: "Carry the required implementation-contract shape into this design step."
  - kind: research
    ref: "[[workflow-brief-design]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Keep reviewed intent authoritative while using source summaries only as supporting evidence."
    verification: "Confirm a worked run preserves scope and the brief's bytes while resolving Galaxy data-flow choices."
  - kind: research
    ref: "[[open-requirements-ledger]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Inherit open entries rather than re-deriving them, close the ones this brief's wiring and collection decisions settle, and append data-flow obligations the narrative leaves open — a described transformation with no named tool, an implied intermediate the source never states, an ordering the prose doesn't fix."
    verification: "Promote after a worked run shows entries this Mold appends or resolves are consumed downstream without re-derivation."
  - kind: research
    ref: "[[galaxy-data-flow-draft-contract]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Keep the data-flow brief separate from gxformat2 templating and concrete step implementation."
    verification: "Promote after two worked brief-to-Galaxy translations preserve this Mold boundary without moving fields."
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
    trigger: "When the interface brief carries a sample_sheet[:paired|:paired_or_unpaired|:record] input, or supporting evidence describes per-sample/per-record metadata that must survive map-over steps."
related_notes:
  - "[[workflow-brief-to-galaxy-interface]]"
  - "[[workflow-brief-to-galaxy-template]]"
---
# workflow-brief-to-galaxy-data-flow

Read the reviewed Workflow Brief plus the preceding Galaxy interface brief and emit a reviewable Markdown data-flow brief. Consult retained source evidence when available. Capture abstract operations, collection map/reduce choices, shape-changing placeholder transformations, unresolved Galaxy tool needs, confidence, and open questions.

The Workflow Brief governs scope and requirements. A `freeform-summary` or `summary-nextflow` can substantiate details within that scope but cannot broaden it or turn source implementation into assumed Galaxy wiring. Translate what the brief, interface, and evidence support; classify the rest as unresolved tool needs or ledger obligations. If correct implementation requires changing reviewed intent, propose a brief change and stop rather than silently applying it.

The output is not gxformat2 and should not resolve exact Tool Shed tools. [[workflow-brief-to-galaxy-template]] turns this handoff and the interface brief into a skeleton.
