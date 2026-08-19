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
revised: 2026-08-19
revision: 3
summary: "Map a free-form source summary into a Galaxy workflow interface design brief."
input_artifacts:
  - id: freeform-summary
    description: "Free-form source summary emitted by [[summarize-paper]] or [[interview-to-freeform-summary]]; methods, tools, sample data, references, and workflow intent with explicit uncertainty."
  - id: open-requirements-ledger
    description: "Carried obligations ledger [[open-requirements-ledger]]: the run's open, resolved, and surrendered entries with their provenance. Absent on the first Mold of a run; start an empty one."
output_artifacts:
  - id: freeform-galaxy-interface
    kind: markdown
    default_filename: freeform-galaxy-interface.md
    description: "Reviewable Markdown brief: Galaxy workflow inputs, outputs, labels, collection shapes, checkpoint outputs, source-summary provenance, confidence, open questions."
  - id: open-requirements-ledger
    kind: yaml
    default_filename: open-requirements.ledger.yml
    description: "Carried obligations ledger re-emitted by this step: entries it appended or closed updated, every other entry passed through with its provenance intact."
references:
  - kind: research
    ref: "[[open-requirements-ledger]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Inherit open entries rather than re-deriving them, close the ones this brief's input, output, and label decisions settle, and append interface obligations the narrative never settles — an output the source names but never specifies, a parameter stated only qualitatively, a collection shape the prose doesn't determine."
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
