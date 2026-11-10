---
type: research
title: "Nextflow-to-Galaxy channel shape mapping"
tags:
  - source/nextflow
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-11-10
revision: 3
related_notes:
  - "[[nextflow-workflow-io-semantics]]"
  - "[[nextflow-params-to-galaxy-inputs]]"
  - "[[nextflow-path-glob-to-galaxy-datatype]]"
  - "[[galaxy-collection-semantics]]"
  - "[[galaxy-collection-tools]]"
  - "[[galaxy-apply-rules-dsl]]"
  - "[[iwc-transformations-survey]]"
  - "[[nextflow-operators-to-galaxy-collection-recipes]]"
  - "[[galaxy-data-flow-draft-contract]]"
  - "[[iwc-conditionals-survey]]"
  - "[[manifest-to-mapped-collection-lifecycle]]"
  - "[[map-workflow-enum-to-tool-parameter]]"
  - "[[regex-relabel-via-tabular]]"
  - "[[relabel-via-rules-and-find-replace]]"
  - "[[reshape-relabel-remap-by-collection-axis]]"
  - "[[sync-collections-by-identifier]]"
  - "[[harmonize-by-sortlist-from-identifiers]]"
  - "[[derive-parameter-from-file]]"
  - "[[conditional-route-between-alternative-outputs]]"
  - "[[open-requirements-ledger]]"
  - "[[tabular-compute-new-column]]"
  - "[[tabular-concatenate-collection-to-table]]"
  - "[[tabular-cut-and-reorder-columns]]"
  - "[[tabular-filter-by-column-value]]"
  - "[[tabular-filter-by-regex]]"
  - "[[tabular-group-and-aggregate-with-datamash]]"
  - "[[tabular-join-on-key]]"
  - "[[tabular-pivot-collection-to-wide]]"
  - "[[tabular-prepend-header]]"
  - "[[tabular-relabel-by-row-counter]]"
  - "[[tabular-split-taxonomy-string]]"
  - "[[tabular-sql-query]]"
  - "[[tabular-synthesize-bed-from-3col]]"
  - "[[tabular-to-collection-by-row]]"
  - "[[iwc-map-over-lifecycle-survey]]"
  - "[[nextflow-patterns]]"
related_molds:
  - "[[nextflow-summary-to-galaxy-interface]]"
  - "[[nextflow-summary-to-galaxy-data-flow]]"
  - "[[nextflow-summary-to-galaxy-template]]"
  - "[[implement-galaxy-tool-step]]"
sources:
  - "https://github.com/galaxyproject/foundry/issues/52"
  - "https://github.com/galaxyproject/foundry/issues/757"
summary: "Maps common Nextflow channel, tuple, and path shapes to Galaxy dataset and collection shapes."
---

# Nextflow-to-Galaxy Channel Shape Mapping

This note maps source-level Nextflow channel shapes onto Galaxy data and dataset-collection shapes. Evidence quality is uneven: Galaxy collection semantics and IWC collection operations are well grounded; several Nextflow shapes are observed in the pinned fixtures; `fromFilePairs` and arbitrary deep tuple mapping remain low-confidence without direct fixture evidence.

## Shape Mapping

| Nextflow shape | Galaxy shape | Confidence | Notes |
|---|---|---|---|
| `path(x)` or a single `Channel.fromPath(...).first()` | `File` | High | One dataset input or output. |
| `val(meta)` alone | No dataset shape | High | Treat as identifiers, labels, tags, sample-sheet metadata, or parameters. It is not a Galaxy dataset by itself. For a value computed per sample and read back as a parameter, see "Per-element parameters from `meta`" below. |
| Repeated `tuple val(meta), path(file)` | `list` | High | One dataset per sample/key. Galaxy maps tools over list collections. |
| One `tuple(meta, [R1, R2])` | `paired` | High | Use only when the workflow input is one paired sample or one tool consumes one pair. |
| Repeated `tuple(meta, [R1, R2])` | `list:paired` | High | Common paired-end workflow input shape. |
| Repeated `tuple(meta, [single])` | `list` | High | nf-core often normalizes single-end reads to one-element lists, but Galaxy should not model this as `paired`. |
| Mixed single-end and paired-end reads | `paired_or_unpaired` or split `list` plus `list:paired` | Medium | Galaxy supports mixed collections, but branch-splitting may be clearer when tools diverge. |
| `tuple(meta, path(a), path(b))` | Parallel lists or per-step `File` inputs | Medium | Not automatically a `paired` collection. It is usually a keyed record of multiple tool inputs. |
| Global file plus per-sample files | Broadcast `File` plus mapped `list` | Medium | If one input is global, connect it once and map the collection input. |
| `collect()` or `toList()` | Collection reduction | High | Usually one downstream invocation over a collection or multiple-input value. |
| `collectFile(...)` | `File` | High | Nextflow creates one new file; Galaxy should model a tool output, not a collection operation. |
| `groupTuple()` by key | `list`, `list:paired`, or `list:list` | Medium | Depends on grouped payload and whether the grouping axis matters downstream. |
| `transpose()` after grouping | Explicit reshape or subcollection mapping | Medium | May need flattening, Apply Rules, or identifier-preserving reshaping. |
| `combine(..., by: key)` or `join(...)` | Multi-input collection map if identifiers match | Medium | Otherwise use explicit synchronization by identifiers/order. |
| `branch { ... }` | Branch wiring or explicit filters | Medium | Shape is whatever each branch returns; per-element routing needs review. |
| `mix(...)` | Merge compatible streams/collections | Medium | Use direct wiring for reports/versions; use `__MERGE_COLLECTION__` or `__BUILD_LIST__` when materialized. |
| `multiMap { ... }` | Synchronized split into Galaxy inputs | Medium | Usually channel-only fan-out, but downstream rejoin depends on identifier discipline. |
| `fromFilePairs` | `paired` or `list:paired` | Low | Conceptually clean, but not directly observed in the pinned fixtures. |
| Arbitrary deep tuples | Parallel lists, `list:list`, or manual modeling | Low | Galaxy collection types are not arbitrary tuple records. Require per-tool review. |

## Explicit Galaxy Operations

Use explicit Galaxy collection-operation or tabular steps when the translation changes materialized collection shape rather than only wiring an existing collection into a mapped step.

| Need | Candidate Galaxy recipe |
|---|---|
| Build a collection from separate datasets | `__BUILD_LIST__` |
| Pair forward/reverse files | `__ZIP_COLLECTION__` or Apply Rules paired mapping |
| Split paired reads into forward/reverse collections | `__UNZIP_COLLECTION__` |
| Flatten nested collections | `__FLATTEN__` |
| Regroup, swap nesting, split identifiers, or build pairs from metadata | `__APPLY_RULES__` |
| Harmonize sibling collections by identifiers/order | identifier extraction, filtering, sorting, or relabeling |
| Remove empty, failed, or null elements after fan-out | filter empty/failed/null collection tools |
| Unbox a singleton collection | `__EXTRACT_DATASET__` |
| Convert a collection of tabular outputs to one table | `collapse_dataset` or `collection_column_join` |

## Per-element parameters from `meta`

nf-core pipelines often compute a value per sample, write it into `meta`, and read it as a parameter in that sample's later processes. nf-core/rnaseq's `strandedness: auto` path sets `meta.strandedness` this way. The rows above change the data. This route changes a tool parameter per element and leaves the data as it is.

Keep the value as one dataset per element, in a collection with the same structure and order as the data collection. Map `param_value_from_file` over it, set `param_type` to match the target parameter, and connect the typed output (`integer_param`, `float_param`, `text_param` or `boolean_param`) to the downstream step that maps over the data collection:

```text
per-element values (list) ──> param_value_from_file (mapped) ──> integer_param ──┐
                                                                                 ▼
reads (list) ──────────────────────────────────────────────> downstream tool (mapped, parameter)
```

Galaxy runs one job per element, and each job gets its own element's value. [[derive-parameter-from-file]] covers the `param_value_from_file` step itself.

Galaxy pairs the two collections by position, not by element identifier. Produce the values with a step mapped over the data collection itself, so they inherit its order. When they arrive as a separate collection, reorder them with [[harmonize-by-sortlist-from-identifiers]] first. A same-length collection in another order runs without error and gives each element a different element's value.

| Value reaches | Evidence | Status |
|---|---|---|
| Integer tool parameter | `verification/workflows/per-element-parameter-from-file/`, values 1 and 3 on two elements | Verified |
| Text tool parameter | Galaxy's `lib/galaxy_test/workflow/map_over_expression.gxwf.yml` | Verified |
| Per-element `when` (boolean) | Galaxy's API test `test_run_workflow_conditional_step_map_over_expression_tool` skips one of two elements | Verified |
| Parameter inside a tool conditional's case | IWC `epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun`: "split min value", "convert min nb of reads to parameter", then `samtools_view` `target` in "select random reads" | Wiring only, values identical across elements |
| `select` parameter | None | Not tested |
| A tool conditional's test parameter | Conflicting reports in [#661](https://github.com/galaxyproject/foundry/issues/661) and [#667](https://github.com/galaxyproject/foundry/issues/667). Salmon's `--libType` needs this edge | Open |

When the target parameter's row isn't verified, fall back in this order:

1. For a small fixed set of values, gate one branch per value with a per-element `when` and give each branch's step a fixed parameter. Rejoin the branches per [[conditional-route-between-alternative-outputs]].
2. Otherwise, expose one workflow-level parameter for all elements and append a `kind: dropped` entry to the [[open-requirements-ledger]] naming the per-element variation. Expose the computing step's output as a workflow output so a user can run once, read the computed values, and re-run with the value they choose.

## Evidence

Corpus-observed Galaxy semantics:

- [[galaxy-collection-semantics]] defines map-over, reduction, paired collections, nested collections, and `sample_sheet` behavior.
- [[galaxy-collection-tools]] catalogs built-in collection operation tools.
- [[galaxy-apply-rules-dsl]] explains identifier-derived collection reshaping.
- [[iwc-transformations-survey]] records which collection transformations appear in IWC workflows.

Pinned fixture examples used by the research pass:

- `workflow-fixtures/pipelines/nf-core__demo/subworkflows/local/utils_nfcore_demo_pipeline/main.nf` for `tuple(meta, reads)` paired-read handling.
- `workflow-fixtures/pipelines/nf-core__rnaseq/main.nf` for single-end versus paired-end branching and reads normalization.
- `workflow-fixtures/pipelines/nf-core__taxprofiler/main.nf` and `workflow-fixtures/pipelines/nf-core__taxprofiler/subworkflows/local/*/main.nf` for `groupTuple`, `transpose`, `mix`, `combine`, and `multiMap` patterns.
- `workflow-fixtures/pipelines/nf-core__fetchngs/workflows/sra/main.nf` for `collectFile` and accession-driven data fetching.
- `$IWC_FORMAT2/virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping.gxwf.yml` as a Galaxy `list:paired` exemplar.

## Low-Confidence TODOs

- Confirm `fromFilePairs` with a direct fixture or external Nextflow documentation before treating it as corpus-observed.
- Define a small shape grammar for `summary-nextflow` outputs, or explicitly require downstream Molds to preserve shape strings plus rationale.
- Decide whether mixed single/paired reads should prefer Galaxy `paired_or_unpaired` or split branches.
- Add a decision rule for grouped runs: preserve as `list:list` when the run axis matters; reduce to `list` only when downstream semantics ignore that axis.
- Avoid using `list:list` just because a Nextflow tuple is nested.

## Mold Use

- [[nextflow-summary-to-galaxy-interface]] should consult this note while choosing Galaxy-facing workflow input/output collection shapes.
- [[nextflow-summary-to-galaxy-data-flow]] should consult this note while translating source channel shapes into Galaxy-facing abstract data-flow.
- [[nextflow-summary-to-galaxy-template]] should consult this note while choosing workflow input/output collection shapes.
- [[implement-galaxy-tool-step]] should consult this note when deciding whether a concrete tool connection can be direct mapped wiring or needs an explicit collection operation.
