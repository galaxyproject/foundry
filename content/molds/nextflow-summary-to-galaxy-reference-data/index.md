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
revision: 3
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
    purpose: "Read `reference_assets[]` (curated path-typed inputs with `used_by` attribution to consuming subworkflows), `reference_rebuilds[]` (compute-if-missing rebuild rules with builder process and guard), and `params[]` provenance (`source_kind`, including `getGenomeAttribute` for nf-core key-expanded bundles) to determine which reference assets the source pipeline consumes and how it rebuilds them when absent."
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
  - "[[nextflow-summary-to-galaxy-template]]"
related_molds:
  - "[[nextflow-summary-to-galaxy-interface]]"
  - "[[nextflow-summary-to-galaxy-data-flow]]"
  - "[[nextflow-summary-to-galaxy-template]]"
---
# nextflow-summary-to-galaxy-reference-data

Classify the ways the Nextflow pipeline uses reference data using [[nextflow-reference-data-classification]], then use [[nextflow-to-galaxy-reference-data-mapping]] to determine and describe how each classified asset maps onto the target Galaxy workflow. Output is a reviewable Markdown brief consumed by [[nextflow-summary-to-galaxy-interface]], [[nextflow-summary-to-galaxy-data-flow]], and [[nextflow-summary-to-galaxy-template]] before they pin workflow inputs, data-flow edges, and the gxformat2 skeleton.

## Reading the summary

The [[summary-nextflow]] schema surfaces reference-data evidence directly — read these fields before falling back to raw `workflow.conditionals[]` or guard-text inference:

- **`reference_assets[]`** — the curated asset inventory. Each entry has `param` (FK into `params[]`), `asset_kind` (`fasta`, `fasta_index`, `sequence_dictionary`, `bwa_index`, `tabix_index`, `gtf`, `gff`, `bed`, `vcf`, `database`, `other`), `required`, `source_kind`, `used_by` (consuming subworkflow/process names), and `evidence.confidence`. Use this as the primary input to classification — it already filters out non-asset path params and attributes callers.
- **`reference_rebuilds[]`** — detected compute-if-missing branches. Each entry binds `asset_param` to a `builder` process plus its `builder_outputs`, the verbatim `guard`, resolved `guard_params`, and `fallback_for` (the `<asset>_in`-style take when paired). When `reference_rebuilds[]` is non-empty, the *compute-if-missing* classification applies to those `asset_param` values. Empty `reference_rebuilds[]` does NOT mean "no compute-if-missing" — some pipelines use positive-form idioms (`if (<asset>) { unpack } else { build }`) that the detector does not yet match (see galaxyproject/foundry#229 follow-ups).
- **`params[].source_kind == "getGenomeAttribute"`** plus `params[].source_expression` — the *key-expanded bundle* signal. A pipeline that synthesizes many path params via `getGenomeAttribute('attr')` is using the iGenomes pattern; classify the bundle accordingly.
- **`subworkflows[].invocations[]`** — caller-side argument binding onto `take:` names. Use when `reference_assets[].used_by` is ambiguous or when verifying that the same param threads into multiple subworkflows.

If a needed signal is missing from the summary (e.g. RNA-seq's positive-form rebuild idiom is not yet detected), say so in the brief and flag the asset as *rebuild-unverified* rather than re-parsing source files.
