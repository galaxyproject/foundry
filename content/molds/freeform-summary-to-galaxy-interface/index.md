---
type: mold
name: freeform-summary-to-galaxy-interface
axis: source-specific
source: freeform
target: galaxy
tags:
  - source/freeform
  - target/galaxy
status: reviewed
created: 2026-06-09
revised: 2026-07-24
revision: 2
ai_generated: true
summary: "Map a free-form source summary into a Galaxy workflow interface design brief."
input_artifacts:
  - id: freeform-summary
    description: "Free-form source summary emitted by [[summarize-paper]] or [[interview-to-freeform-summary]]; methods, tools, sample data, references, and workflow intent with explicit uncertainty."
  - id: open-requirements-ledger
    description: "Carried obligations ledger [[open-requirements-ledger]]: read prior open entries; this design step appends new unmet needs and marks ones its decisions resolve."
output_artifacts:
  - id: freeform-galaxy-interface
    kind: markdown
    default_filename: freeform-galaxy-interface.md
    description: "Reviewable Markdown brief: Galaxy workflow inputs, outputs, labels, collection shapes, checkpoint outputs, source-summary provenance, confidence, open questions."
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
  - kind: research
    ref: "[[galaxy-workflow-testability-design]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Choose stable workflow input/output labels and promoted checkpoint outputs that future tests can address."
    trigger: "When deciding labels, public outputs, checkpoint outputs, or fixture-compatible collection inputs."
  - kind: research
    ref: "[[galaxy-collection-semantics]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Choose Galaxy collection input shapes (File / list / paired / list:paired / record) from the source's per-sample, paired, grouped, or nested data descriptions."
    trigger: "When the free-form summary describes paired reads, per-sample groups, nested or grouped inputs, or any input that should become a Galaxy dataset collection."
  - kind: research
    ref: "[[galaxy-sample-sheet-collections]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Pick the right sample_sheet variant and translate described per-sample column metadata into Galaxy column_definitions when the source describes sample-sheet-shaped inputs."
    trigger: "When the free-form summary describes a sample sheet, a per-sample/per-record table, or any table mapping samples to files that should become a Galaxy collection or sample-sheet input."
related_notes:
  - "[[freeform-summary-to-galaxy-data-flow]]"
  - "[[freeform-summary-to-galaxy-template]]"
---
# freeform-summary-to-galaxy-interface

Read a free-form source summary and emit a reviewable Markdown interface brief for a Galaxy workflow. Capture workflow inputs, workflow outputs, labels, Galaxy collection shapes, checkpoint outputs worth exposing for tests, source-summary provenance, confidence, and open questions.

Free-form sources are narrative- or interview-derived and carry explicit uncertainty. Translate what the summary supports into interface decisions; carry unresolved interface choices forward as open questions rather than inventing precise inputs, outputs, or labels.

The output is not a gxformat2 skeleton and not a workflow schema. It is a design handoff consumed by [[freeform-summary-to-galaxy-data-flow]], [[freeform-summary-to-galaxy-template]], and later test-plan work.

Carry the [[open-requirements-ledger]] through this step: read the open entries that bear on the choices you make here, mark resolved any your decisions close, and append any new unmet need you surface — a declared output with no producer, an unpinned parameter, a tool with no corpus exemplar — so a later Mold inherits it instead of re-deriving it.
