---
type: mold
name: nextflow-summary-to-galaxy-reference-data
axis: source-specific
source: nextflow
target: galaxy
tags:
  - mold
  - source/nextflow
  - target/galaxy
status: draft
created: 2026-05-10
revised: 2026-05-10
revision: 2
ai_generated: true
summary: "Decide the Galaxy-side shape of external reference data declared by a Nextflow pipeline."
input_artifacts:
  - id: summary-nextflow
    description: "Structured Nextflow pipeline summary emitted by [[summarize-nextflow]]; the source for reference-data param evidence."
output_artifacts:
  - id: nextflow-galaxy-reference-data
    kind: markdown
    default_filename: nextflow-galaxy-reference-data.md
    description: "Reviewable Markdown brief: per-asset reference inputs, requiredness, rebuild-on-absence behavior, iGenomes key disposition, open questions."
references:
  - kind: schema
    ref: "[[summary-nextflow]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Read params, channels, and compute-if-missing branches that determine which reference assets the source pipeline consumes."
  - kind: research
    ref: "[[nextflow-reference-data-classification]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Classify the source pipeline's reference-data usage against the eight Nextflow-side classifications (none, reference-producing, single asset, coordinated bundle, key-expanded bundle, compute-if-missing, multi-DB pick-list, parallel bundles plus cohort data)."
  - kind: research
    ref: "[[nextflow-to-galaxy-reference-data-mapping]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Apply the v1 Galaxy posture (explicit optional inputs + in-tool rebuild) and datatype defaults when translating each classified asset into the brief."
  - kind: research
    ref: "[[nextflow-params-to-galaxy-inputs]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Cross-check reference selectors against the broader params translation rules — curated string enums, do-not-introduce-new-data-tables, runtime-control exclusion."
    trigger: "When a reference param looks like a curated selector (closed enum, .loc-keyed) rather than a data-bearing path."
related_notes:
  - "[[summary-nextflow]]"
  - "[[nextflow-reference-data-classification]]"
  - "[[nextflow-to-galaxy-reference-data-mapping]]"
related_molds:
  - "[[nextflow-summary-to-galaxy-interface]]"
  - "[[nextflow-summary-to-galaxy-data-flow]]"
---
# nextflow-summary-to-galaxy-reference-data

Classify the ways the Nextflow pipeline uses reference data using [[nextflow-reference-data-classification]], then use [[nextflow-to-galaxy-reference-data-mapping]] to determine and describe how each classified asset maps onto the target Galaxy workflow. Output is a reviewable Markdown brief consumed by [[nextflow-summary-to-galaxy-interface]], [[nextflow-summary-to-galaxy-data-flow]], and [[nextflow-summary-to-galaxy-template]] before they pin workflow inputs, data-flow edges, and the gxformat2 skeleton.
