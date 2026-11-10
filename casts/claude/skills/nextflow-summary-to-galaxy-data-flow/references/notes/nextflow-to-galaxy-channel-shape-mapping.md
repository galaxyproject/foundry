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

This note maps source-level Nextflow channel shapes onto Galaxy data and dataset-collection shapes. The Confidence column marks how well each row is grounded.

## Shape Mapping

| Nextflow shape | Galaxy shape | Confidence | Notes |
|---|---|---|---|
| `path(x)` or a single `Channel.fromPath(...).first()` | `File` | High | One dataset input or output. |
| `val(meta)` alone | No dataset shape | High | Treat as identifiers, labels, tags, sample-sheet metadata, or parameters. It is not a Galaxy dataset by itself. For a value computed per sample and read by a later process as a tool argument, see "Per-element parameters from `meta`" below. |
| Repeated `tuple val(meta), path(file)` | `list` | High | One dataset per sample/key. Galaxy maps tools over list collections. |
| One `tuple(meta, [R1, R2])` | `paired` | High | Use only when the workflow input is one paired sample or one tool consumes one pair. |
| Repeated `tuple(meta, [R1, R2])` | `list:paired` | High | Common paired-end workflow input shape. |
| Repeated `tuple(meta, [single])` | `list` | High | nf-core often normalizes single-end reads to one-element lists, but Galaxy should not model this as `paired`. |
| Mixed single-end and paired-end reads | `paired_or_unpaired` or split `list` plus `list:paired` | Medium | Galaxy supports mixed collections, but branch-splitting may be clearer when tools diverge. |
| `tuple(meta, path(a), path(b))` | Parallel lists or per-step `File` inputs | Medium | Not automatically a `paired` collection. It is usually a keyed record of multiple tool inputs. |
| Global file plus per-sample files | Broadcast `File` plus mapped `list` | Medium | If one input is global, connect it once and map the collection input. |
| `collect()` or `toList()` | Collection reduction | High | Usually one downstream invocation over a collection or multiple-input value. |
| `collectFile(...)` | `File` | High | Nextflow creates one new file. Galaxy should model a tool output, not a collection operation. |
| `groupTuple()` by key | `list`, `list:paired`, or `list:list` | Medium | Depends on grouped payload and whether the grouping axis matters downstream. |
| `transpose()` after grouping | Explicit reshape or subcollection mapping | Medium | May need flattening, Apply Rules, or identifier-preserving reshaping. |
| `combine(..., by: key)` or `join(...)` | Multi-input collection map if identifiers match | Medium | Otherwise use explicit synchronization by identifiers/order. |
| `branch { ... }` | Branch wiring or explicit filters | Medium | Shape is whatever each branch returns; per-element routing needs review. |
| `mix(...)` | Merge compatible streams/collections | Medium | Use direct wiring for reports/versions, and `__MERGE_COLLECTION__` or `__BUILD_LIST__` when materialized. |
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

nf-core pipelines often compute a value per sample, write it into `meta`, and read it as a tool argument in that sample's later processes. In nf-core/rnaseq's `strandedness: auto` path, `subworkflows/nf-core/fastq_qc_trim_filter_setstrandedness/main.nf` returns `meta + [strandedness: ...]`, and later modules read `meta.strandedness`. The collection operations above reshape data. This route keeps the data as it is and varies a tool parameter per element.

Carry the value as a one-value dataset per element, in a collection with the same structure and order as the data collection. Map `param_value_from_file` over it and choose `param_type` by the target: `integer` or `float` for a number, `boolean` for a boolean, `text` for text. Connect the matching output (`integer_param`, `float_param`, `boolean_param` or `text_param`) to the target parameter of the step that maps over the data collection:

```text
per-element values (list) ──> param_value_from_file (mapped) ──> integer_param ──┐
                                                                                 ▼
reads (list) ──────────────────────────────────────────> downstream tool (mapped, target parameter)
```

Galaxy runs one job per element and pairs the two collections by position, not by element identifier. A same-length value collection in another order runs without error and gives each element the value at its position, not its own. Produce the values with a step mapped over the data collection so they inherit its order. When they arrive as a separate collection, reorder them first: run `collection_element_identifiers` on the data collection, then `__SORTLIST__` with `sort_type: file` on the value collection, connecting the identifier file to `sort_type|sort_file` ([[harmonize-by-sortlist-from-identifiers]]).

| Target | Evidence | Status |
|---|---|---|
| Integer tool parameter | `verification/workflows/per-element-parameter-from-file/`: values 1 and 3 on two elements, and positional pairing in its second case | Verified |
| Text tool parameter | Galaxy's `lib/galaxy_test/workflow/map_over_expression.gxwf.yml` and its `-tests.yml`: per-element values `A` and `B` reach a text input | Verified |
| Per-element `when` (boolean) | Galaxy's `lib/galaxy_test/api/test_workflows.py::test_run_workflow_conditional_step_map_over_expression_tool`: one of two elements is skipped | Verified |
| Parameter inside a tool conditional's case | IWC `epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun`: mapped "convert min nb of reads to parameter" feeds `samtools_view`'s `mode\|subsample_config\|subsampling_mode\|target`, with values identical across elements | Wiring only |
| `select` tool parameter | The same fixture's `per-element-select-boolean` workflow: text values `C` and `D` choose `Cut1`'s `delimiter` per element | Verified |
| Boolean tool parameter | The same workflow: `true` and `false` set `wc_gnu`'s `include_header` per element | Verified |
| Float tool parameter | None | Not tested |
| A tool conditional's test parameter | [#661](https://github.com/galaxyproject/foundry/issues/661) reports a Galaxy 500 when one is connected. [#667](https://github.com/galaxyproject/foundry/issues/667) reports a workflow connecting one that runs on usegalaxy.org | Open |

Use this route for every target except the Open row, and cover a Wiring only or Not tested target with a workflow test whose elements carry different values. rnaseq's strandedness reaches both kinds of target. featureCounts' `strand_specificity` is a `select` and takes this route. A `select` takes an option value, not the source's string, so translate first: featureCounts' options are `0`, `1` and `2`, where rnaseq writes `unstranded`, `forward` and `reverse`. [[map-workflow-enum-to-tool-parameter]] does this with `map_param_value`, which hasn't been tested mapped over elements. Salmon's `--libType` is `strandedness`, the test parameter of its `libtype` conditional, and takes the fallback.

For a conditional's test parameter, or when a workflow test of this route fails, fall back in this order:

1. For a small fixed set of values, run one branch per value. For each value, write a per-element boolean file with a mapped comparison step, read it with mapped `param_value_from_file` (`param_type: boolean`), gate that value's branch with `when`, and give the branch's step that value as a fixed parameter. Rejoin the branches with Galaxy's built-in `pick_value` (`pick_style: first_or_error`) mapped over the branch outputs, never `__MERGE_COLLECTION__`. A gated mapped step still emits a full-size collection with its skipped elements as null, so a merge returns one element per branch per sample. Galaxy's `test_run_workflow_conditional_step_map_over_expression_tool_pick_value` covers this mapped rejoin, and [[conditional-route-between-alternative-outputs]] covers `pick_value`'s settings.
2. Otherwise, expose one workflow-level parameter for all elements. Append a `kind: dropped` entry to the [[open-requirements-ledger]] whose `units` names the per-element parameter and whose `because` cites the Open row or the failing test. Expose the computing step's output as a workflow output so a user can run once, read the computed values, and re-run with the value they choose.

## Evidence

Corpus-observed Galaxy semantics:

- [[galaxy-collection-semantics]] defines map-over, reduction, paired collections, nested collections, and `sample_sheet` behavior.
- [[galaxy-collection-tools]] catalogs built-in collection operation tools.
- [[galaxy-apply-rules-dsl]] explains identifier-derived collection reshaping.
- [[iwc-transformations-survey]] records which collection transformations appear in IWC workflows.

Nextflow fixture examples:

- `workflow-fixtures/pipelines/nf-core__demo/subworkflows/local/utils_nfcore_demo_pipeline/main.nf` for `tuple(meta, reads)` paired-read handling.
- `workflow-fixtures/pipelines/nf-core__rnaseq/main.nf` for single-end versus paired-end branching and reads normalization.
- `workflow-fixtures/pipelines/nf-core__taxprofiler/main.nf` and `workflow-fixtures/pipelines/nf-core__taxprofiler/subworkflows/local/*/main.nf` for `groupTuple`, `transpose`, `mix`, `combine`, and `multiMap` patterns.
- `workflow-fixtures/pipelines/nf-core__fetchngs/workflows/sra/main.nf` for `collectFile` and accession-driven data fetching.
- IWC `virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping` as a Galaxy `list:paired` exemplar.

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
