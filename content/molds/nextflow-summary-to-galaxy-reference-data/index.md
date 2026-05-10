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
revision: 1
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
    ref: "[[nextflow-to-galaxy-reference-data-mapping]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Apply the v1 posture (explicit optional inputs + in-tool rebuild) when translating iGenomes-style and per-asset reference params."
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
  - "[[nextflow-to-galaxy-reference-data-mapping]]"
related_molds:
  - "[[nextflow-summary-to-galaxy-interface]]"
  - "[[nextflow-summary-to-galaxy-data-flow]]"
---
# nextflow-summary-to-galaxy-reference-data

Consume the Nextflow pipeline summary and decide the shape of external reference data on the Galaxy side. Output is a reviewable Markdown brief consumed by [[nextflow-summary-to-galaxy-interface]] and [[nextflow-summary-to-galaxy-data-flow]] before they pin workflow inputs and data-flow edges.

The decisions live in [[nextflow-to-galaxy-reference-data-mapping]]: detect iGenomes-style key expansion, per-asset reference params, and compute-if-missing branches in the source; translate to explicit optional Galaxy `data` inputs with in-tool rebuild on absence; avoid introducing new admin-managed data tables. This Mold's job is to apply that research against one specific summary and write the result down before interface and data-flow design proceed.
