---
type: mold
name: workflow-brief-to-galaxy-interface
axis: target-specific
target: galaxy
tags:
  - target/galaxy
status: draft
created: 2026-06-09
revised: 2026-09-20
revision: 4
summary: "Map a reviewed Workflow Brief into a Galaxy workflow interface design brief, consulting retained source evidence when available."
input_artifacts:
  - id: workflow-brief
    description: "Expert-reviewed implementation contract. Its objective, scope, requirements, acceptance criteria, and exclusions govern every interface decision."
  - id: freeform-summary
    role: source-evidence
    optional: true
    description: "Optional narrative source evidence; it may clarify the selected scope but cannot broaden or override the brief."
  - id: summary-nextflow
    role: source-evidence
    optional: true
    description: "Optional structured Nextflow source evidence; process, channel, parameter, and test facts are evidence rather than assumed Galaxy design."
  - id: open-requirements-ledger
    optional: true
    description: "Carried workflow-run knowledge [[open-requirements-ledger]]. Absent on the first design Mold of a run; initialize an empty ledger."
output_artifacts:
  - id: workflow-brief-galaxy-interface
    kind: markdown
    default_filename: workflow-brief-galaxy-interface.md
    description: "Reviewable Markdown brief: Galaxy workflow inputs, outputs, labels, collection shapes, checkpoint outputs, Workflow Brief provenance, supporting-evidence citations, confidence, and open questions."
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
    purpose: "Validate the required Workflow Brief before treating it as the implementation contract."
  - kind: research
    ref: "[[workflow-brief-design]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Preserve the authority boundary between reviewed intent, optional source evidence, and downstream Galaxy design decisions."
    verification: "Confirm a worked run does not broaden brief scope from richer source evidence and leaves the brief unchanged."
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
    trigger: "When the brief or supporting evidence describes paired reads, per-sample groups, nested or grouped inputs, or any input that should become a Galaxy dataset collection."
  - kind: research
    ref: "[[galaxy-sample-sheet-collections]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Pick the right sample_sheet variant and translate described per-sample column metadata into Galaxy column_definitions when the source describes sample-sheet-shaped inputs."
    trigger: "When the brief or supporting evidence describes a sample sheet, a per-sample/per-record table, or any table mapping samples to files that should become a Galaxy collection or sample-sheet input."
related_notes:
  - "[[workflow-brief-to-galaxy-data-flow]]"
  - "[[workflow-brief-to-galaxy-template]]"
---
# workflow-brief-to-galaxy-interface

Read the reviewed, unchanged Workflow Brief and emit a reviewable Markdown interface brief for a Galaxy workflow. Capture workflow inputs, workflow outputs, labels, Galaxy collection shapes, checkpoint outputs worth exposing for tests, provenance, confidence, and open questions.

The Workflow Brief is authoritative for objective, included and excluded scope, expert requirements, and acceptance criteria. Consult a retained `freeform-summary` or `summary-nextflow` only as supporting evidence for the selected work. Evidence may supply methods, formats, parameters, datasets, or uncertainty that the concise brief omits, but it cannot silently add analyses or override an expert decision. A hand-authored brief with no source summary is valid.

Translate what the reviewed contract and available evidence support into Galaxy interface decisions. Record evidence as discoveries, authorized mappings as decisions, missing actionable detail as obligations, and any needed change to expert intent as a proposed brief-change recommendation in the ledger. Never edit the brief or apply a proposed change here.

The output is not a gxformat2 skeleton and not a workflow schema. It is a design handoff consumed by [[workflow-brief-to-galaxy-data-flow]], [[workflow-brief-to-galaxy-template]], and later test-plan work.
