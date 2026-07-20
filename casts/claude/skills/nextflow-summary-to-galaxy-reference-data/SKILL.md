---
name: nextflow-summary-to-galaxy-reference-data
description: "Decide the Galaxy-side shape of external reference data declared by a Nextflow pipeline."
---

# nextflow-summary-to-galaxy-reference-data

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Decide the Galaxy-side shape of external reference data declared by a Nextflow pipeline.

## Inputs

- Read artifact `summary-nextflow`. Schema: summary-nextflow. Produced by `summarize-nextflow`. Structured Nextflow pipeline summary emitted by summarize-nextflow; the source for reference-data param evidence.
- Read artifact `open-requirements-ledger`. Produced by `advance-galaxy-draft-step`, `apply-galaxy-workflow-changeset`, `compare-against-iwc-exemplar`, `cwl-summary-to-galaxy-data-flow`, `cwl-summary-to-galaxy-interface`, `cwl-summary-to-galaxy-template`, `freeform-summary-to-galaxy-data-flow`, `freeform-summary-to-galaxy-interface`, `freeform-summary-to-galaxy-template`, `implement-galaxy-tool-step`, `interview-to-galaxy-workflow-changeset`, `nextflow-summary-to-galaxy-data-flow`, `nextflow-summary-to-galaxy-interface`, `nextflow-summary-to-galaxy-reference-data`, `nextflow-summary-to-galaxy-template`, `repair-galaxy-draft-topology`. Carried obligations ledger open-requirements-ledger: read prior open entries; this design step appends new unmet needs and marks ones its decisions resolve.

## Outputs

- Write artifact `nextflow-galaxy-reference-data` as `nextflow-galaxy-reference-data.md`. Format: `markdown`. Reviewable Markdown brief: per-asset reference inputs, requiredness, rebuild-on-absence behavior, iGenomes key disposition, open questions.
- Write artifact `open-requirements-ledger` as `open-requirements.ledger.yml`. Format: `yaml`. Updated obligations ledger: new unmet needs this step surfaces appended; prior entries its decisions close marked resolved.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- `references/notes/nextflow-reference-data-classification.md`: Research note copied verbatim into the bundle. Classify the source pipeline's reference-data usage against the eight Nextflow-side classifications (none, reference-producing, single asset, coordinated bundle, key-expanded bundle, compute-if-missing, multi-DB pick-list, parallel bundles plus cohort data).
- `references/notes/nextflow-to-galaxy-reference-data-mapping.md`: Research note copied verbatim into the bundle. Apply the v1 Galaxy posture (explicit optional inputs + in-tool rebuild) and datatype defaults when translating each classified asset into the brief.
- `references/notes/open-requirements-ledger.md`: Research note copied verbatim into the bundle. Carry the open-requirements ledger: read open entries bearing on this step's decisions, mark resolved the ones it closes, and append any new unmet need it surfaces.
- `references/schemas/summary-nextflow.schema.json`: Schema file copied verbatim into the bundle. Read `reference_assets[]` (curated path-typed inputs with `used_by` attribution to consuming subworkflows), `reference_rebuilds[]` (compute-if-missing rebuild rules with builder process and guard), and `params[]` provenance (`source_kind`, including `getGenomeAttribute` for nf-core key-expanded bundles) to determine which reference assets the source pipeline consumes and how it rebuilds them when absent.

## Load On Demand

- `references/notes/nextflow-params-to-galaxy-inputs.md`: Research note copied verbatim into the bundle. Cross-check reference selectors against the broader params translation rules — curated string enums, do-not-introduce-new-data-tables, runtime-control exclusion. Use when: a reference param looks like a curated selector (closed enum, .loc-keyed) rather than a data-bearing path.

## Validation

- None declared.

## Procedure

Classify the ways the Nextflow pipeline uses reference data using nextflow-reference-data-classification, then use nextflow-to-galaxy-reference-data-mapping to determine and describe how each classified asset maps onto the target Galaxy workflow. Output is a reviewable Markdown brief consumed by nextflow-summary-to-galaxy-interface, nextflow-summary-to-galaxy-data-flow, and nextflow-summary-to-galaxy-template before they pin workflow inputs, data-flow edges, and the gxformat2 skeleton.

### Reading the summary

The summary-nextflow schema surfaces reference-data evidence directly — read these fields before falling back to raw `workflow.conditionals[]` or guard-text inference:

- **`reference_assets[]`** — the curated asset inventory. Each entry has `param` (FK into `params[]`), `asset_kind` (`fasta`, `fasta_index`, `sequence_dictionary`, `bwa_index`, `tabix_index`, `gtf`, `gff`, `bed`, `vcf`, `database`, `other`), `required`, `source_kind`, `used_by` (consuming subworkflow/process names), and `evidence.confidence`. Use this as the primary input to classification — it already filters out non-asset path params and attributes callers.
- **`reference_rebuilds[]`** — detected compute-if-missing branches. Each entry binds `asset_param` to a `builder` process plus its `builder_outputs`, the verbatim `guard`, resolved `guard_params`, and `fallback_for` (the `<asset>_in`-style take when paired). When `reference_rebuilds[]` is non-empty, the *compute-if-missing* classification applies to those `asset_param` values. Empty `reference_rebuilds[]` does NOT mean "no compute-if-missing" — some pipelines use positive-form idioms (`if (<asset>) { unpack } else { build }`) that the detector does not yet match (see galaxyproject/foundry#229 follow-ups).
- **`params[].source_kind == "getGenomeAttribute"`** plus `params[].source_expression` — the *key-expanded bundle* signal. A pipeline that synthesizes many path params via `getGenomeAttribute('attr')` is using the iGenomes pattern; classify the bundle accordingly.
- **`subworkflows[].invocations[]`** — caller-side argument binding onto `take:` names. Use when `reference_assets[].used_by` is ambiguous or when verifying that the same param threads into multiple subworkflows.

If a needed signal is missing from the summary (e.g. RNA-seq's positive-form rebuild idiom is not yet detected), say so in the brief and flag the asset as *rebuild-unverified* rather than re-parsing source files.

Carry the open-requirements-ledger through this step: read the open entries that bear on the choices you make here, mark resolved any your decisions close, and append any new unmet need you surface — a declared output with no producer, an unpinned parameter, a tool with no corpus exemplar — so a later skill inherits it instead of re-deriving it.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
