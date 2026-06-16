---
type: mold
name: nextflow-summary-to-galaxy-interface
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
summary: "Map a Nextflow summary into a Galaxy workflow interface design brief."
input_artifacts:
  - id: summary-nextflow
    description: "Structured Nextflow pipeline summary emitted by [[summarize-nextflow]]; the source-of-truth JSON for interface choices."
  - id: nextflow-galaxy-reference-data
    description: "Reference-data shape brief from [[nextflow-summary-to-galaxy-reference-data]] that pins per-asset reference inputs and rebuild-on-absence behavior."
  - id: open-requirements-ledger
    description: "Carried obligations ledger [[open-requirements-ledger]]: read prior open entries; this design step appends new unmet needs and marks ones its decisions resolve."
output_artifacts:
  - id: nextflow-galaxy-interface
    kind: markdown
    default_filename: nextflow-galaxy-interface.md
    description: "Reviewable Markdown brief: Galaxy workflow inputs, outputs, labels, collection shapes, checkpoint outputs, source provenance."
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
    purpose: "Read source-level channel, parameter, process, and test-fixture evidence before choosing Galaxy workflow inputs and outputs."
  - kind: research
    ref: "[[nextflow-params-to-galaxy-inputs]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Translate Nextflow launch params, materialized inputs, sample sheets, and control flags into gxformat2-compatible Galaxy workflow inputs."
  - kind: research
    ref: "[[nextflow-path-glob-to-galaxy-datatype]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Choose Galaxy datatype extensions and confidence notes for data inputs, collection elements, and exposed outputs."
  - kind: research
    ref: "[[nextflow-to-galaxy-channel-shape-mapping]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Choose Galaxy File/list/paired/list:paired/list:list interface shapes from Nextflow channel shapes."
  - kind: research
    ref: "[[galaxy-workflow-testability-design]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Choose stable workflow input/output labels and promoted checkpoint outputs that future tests can address."
    trigger: "When deciding labels, public outputs, checkpoint outputs, or fixture-compatible collection inputs."
  - kind: research
    ref: "[[galaxy-sample-sheet-collections]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Pick the right sample_sheet variant and translate nf-schema column metadata into Galaxy column_definitions when the source pipeline uses sample-sheet-shaped inputs."
    trigger: "When the Nextflow summary reports a samplesheetToList materialization, a parameter whose nf-schema entry sets schema: assets/schema_*.json, or a channel built from splitCsv(header: true) over a tabular params input."
  - kind: research
    ref: "[[nextflow-reference-data-classification]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Cross-check source-side reference-data classifications before translating the reference-data brief into Galaxy workflow inputs."
    trigger: "When the reference-data brief is silent, low-confidence, or conflicts with source evidence for iGenomes-derived params, coordinated bundles, compute-if-missing branches, multi-DB pick-lists, or cohort-specific assets."
  - kind: research
    ref: "[[nextflow-to-galaxy-reference-data-mapping]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Translate iGenomes-style and per-asset reference-data params into Galaxy inputs without inheriting nf-core's reference-resolution magic; v1 posture is explicit optional inputs with in-tool rebuild on absence."
    trigger: "When the source pipeline declares iGenomes-derived params (params.genome with getGenomeAttribute), per-asset reference path params (fasta, fasta_fai, dict, bwa_index, dbsnp, known_indels, intervals, pon), or any compute-if-missing index-building branch in the source."
related_notes:
  - "[[summary-nextflow]]"
  - "[[nextflow-summary-to-galaxy-template]]"
  - "[[nextflow-reference-data-classification]]"
  - "[[nextflow-params-to-galaxy-inputs]]"
  - "[[nextflow-path-glob-to-galaxy-datatype]]"
---
# nextflow-summary-to-galaxy-interface

Read a Nextflow summary and emit a reviewable Markdown interface brief for a Galaxy workflow. Capture workflow inputs, workflow outputs, labels, Galaxy collection shapes, checkpoint outputs worth exposing for tests, source-summary provenance, confidence, and open questions.

The output is not a gxformat2 skeleton and not a workflow schema. It is a design handoff consumed by [[nextflow-summary-to-galaxy-data-flow]], [[nextflow-summary-to-galaxy-template]], and later test-plan work.

Carry the [[open-requirements-ledger]] through this step: read the open entries that bear on the choices you make here, mark resolved any your decisions close, and append any new unmet need you surface — a declared output with no producer, an unpinned parameter, a tool with no corpus exemplar — so a later Mold inherits it instead of re-deriving it.
