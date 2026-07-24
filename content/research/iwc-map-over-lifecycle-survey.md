---
type: research
tags:
  - source/nextflow
  - target/galaxy
status: draft
created: 2026-05-03
revised: 2026-05-03
revision: 1
ai_generated: true
related_notes:
  - "[[iwc-transformations-survey]]"
  - "[[iwc-conditionals-survey]]"
  - "[[iwc-tabular-operations-survey]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
  - "[[nextflow-operators-to-galaxy-collection-recipes]]"
  - "[[component-nextflow-pipeline-anatomy]]"
  - "[[cleanup-sync-and-publish-nonempty-results]]"
  - "[[fan-in-bundle-consume-and-flatten]]"
  - "[[manifest-to-mapped-collection-lifecycle]]"
  - "[[reshape-relabel-remap-by-collection-axis]]"
  - "[[iwc-shortcuts-anti-patterns]]"
  - "[[nextflow-patterns]]"
related_patterns:
  - "[[galaxy-collection-patterns]]"
  - "[[galaxy-conditionals-patterns]]"
  - "[[galaxy-tabular-patterns]]"
  - "[[collection-cleanup-after-mapover-failure]]"
  - "[[sync-collections-by-identifier]]"
  - "[[harmonize-by-sortlist-from-identifiers]]"
  - "[[collection-flatten-after-fanout]]"
  - "[[collection-unbox-singleton]]"
  - "[[collection-build-named-bundle]]"
  - "[[tabular-to-collection-by-row]]"
  - "[[tabular-concatenate-collection-to-table]]"
  - "[[tabular-pivot-collection-to-wide]]"
  - "[[conditional-gate-on-nonempty-result]]"
summary: "Survey of IWC map-over lifecycle recipes, with a Nextflow-to-Galaxy crosswalk for collection construction, cleanup, reshape, reduce, and publish phases."
---

# IWC map-over lifecycle survey

Source corpus: 120 cleaned `gxformat2` workflows under `$IWC_FORMAT2/`, with structural scans over `$IWC_SKELETONS/`. Nextflow comparison uses local fixtures under `workflow-fixtures/pipelines/` plus existing Foundry notes. This survey is intentionally lifecycle-shaped: it composes existing operation pattern pages rather than rediscovering each collection tool.

Scope is the end-to-end shape around Galaxy collection map-over:

1. Prepare a collection from user input, manifest rows, existing datasets, or domain fan-out.
2. Map a domain tool over the collection.
3. Clean empty or failed per-element outputs.
4. Synchronize, relabel, reshape, flatten, or unbox collection shape.
5. Reduce or aggregate mapped outputs into report-ready files, tables, or bundles.
6. Publish final datasets/collections, sometimes behind conditional gates.

Out of scope:

- Re-surveying individual collection operations already covered by [[iwc-transformations-survey]].
- Rewriting operation pattern decisions already captured in [[galaxy-collection-patterns]], [[galaxy-conditionals-patterns]], or [[galaxy-tabular-patterns]].
- Treating domain tools as collection patterns unless their collection lifecycle role is the reusable part.
- Proposing pages for corpus-zero Galaxy collection capabilities.

## 1. Lifecycle shapes observed

### Shape A — manifest to collection to mapped fetch to reshaped outputs

The SRA manifest workflow shows the fullest prepare-map-reshape lifecycle. A tabular manifest is cut down to SRA accessions, split into one collection element per row, mapped through `fasterq_dump`, then relabeled and reshaped into paired/single outputs.

Evidence:

- `$IWC_FORMAT2/data-fetching/sra-manifest-to-concatenated-fastqs/sra-manifest-to-concatenated-fastqs.gxwf.yml:175` uses `split_file_to_collection`.
- `$IWC_FORMAT2/data-fetching/sra-manifest-to-concatenated-fastqs/sra-manifest-to-concatenated-fastqs.gxwf.yml:204` maps `fasterq_dump` over the collection.
- `$IWC_FORMAT2/data-fetching/sra-manifest-to-concatenated-fastqs/sra-manifest-to-concatenated-fastqs.gxwf.yml:238` and `:261` relabel paired and single outputs with `__RELABEL_FROM_FILE__`.
- `$IWC_FORMAT2/data-fetching/sra-manifest-to-concatenated-fastqs/sra-manifest-to-concatenated-fastqs.gxwf.yml:283` and `:328` reshape with `__APPLY_RULES__`.

Lifecycle recipe: `manifest/table -> collection -> mapped fetch -> relabel -> reshape -> publish paired/single outputs`.

Existing pages cover the phase leaves: [[tabular-to-collection-by-row]], [[regex-relabel-via-tabular]], and [[collection-build-list-paired-with-apply-rules]]. What is missing is the end-to-end recipe that tells a translator when these pages compose.

### Shape B — mapped search produces sparse results, cleanup syncs siblings, non-empty result gates reports

The MGnify rRNA prediction workflow shows the most important cleanup-and-publish lifecycle. Multiple per-sample steps can emit empty collections. The workflow drops empties, uses identifiers from the cleaned collection to filter sibling inputs, then gates Krona and BIOM export on computed non-empty booleans.

Evidence:

- `$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:352` and `:367` filter empty SSU/LSU BED outputs.
- `$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:407` and `:427` extract collection identifiers.
- `$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:447` and `:470` use `__FILTER_FROM_FILE__` to sync sibling collections to the cleaned result set.
- `$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:1361` starts an embedded `Map empty/not empty collection to boolean` subworkflow.
- `$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:1486`, `:1514`, `:1552`, `:1588`, and `:1626` gate Krona/BIOM publishing steps downstream.

Lifecycle recipe: `mapped search -> FILTER_EMPTY -> identifiers -> FILTER_FROM_FILE sibling sync -> non-empty boolean -> conditional report/export`.

Existing pages cover the leaves: [[collection-cleanup-after-mapover-failure]], [[sync-collections-by-identifier]], and [[conditional-gate-on-nonempty-result]]. The lifecycle-level value is the sequence and the decision point: per-element cleanup is not enough if a sibling collection must stay aligned, and report export should be gated at the whole-result level.

### Shape C — domain fan-out, axis swap, relabel, remap

The influenza consensus/subtyping workflow shows a dense collection-axis lifecycle. Domain fan-out creates a nested shape whose useful map-over axis is not the one Galaxy currently exposes. The workflow uses Apply Rules, identifier extraction, text replacement, relabeling, and another Apply Rules pass before downstream consensus steps.

Evidence:

- `$IWC_FORMAT2/virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping.gxwf.yml:943` uses `__APPLY_RULES__` for axis reshaping.
- `$IWC_FORMAT2/virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping.gxwf.yml:974` and `:995` extract collection identifiers.
- `$IWC_FORMAT2/virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping.gxwf.yml:1016` rewrites identifiers with `tp_find_and_replace`.
- `$IWC_FORMAT2/virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping.gxwf.yml:1046` relabels with `__RELABEL_FROM_FILE__`.
- `$IWC_FORMAT2/virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping.gxwf.yml:1068` reshapes again with `__APPLY_RULES__`.
- `$IWC_FORMAT2/virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping.gxwf.yml:1117` runs `ivar_consensus` on the corrected shape.

Lifecycle recipe: `domain fan-out -> reshape axes -> derive labels -> relabel -> reshape again -> mapped consensus`.

This is high-density but narrow evidence. It probably belongs as a recipe pattern or section in a lifecycle MOC before being treated as a broad operation.

### Shape D — sibling collection order harmonization before mapped paired processing

The pox-virus half-genome workflow shows sibling collection ordering as lifecycle setup. Pool-specific data is derived, Pool2 is sorted by Pool1 identifiers, and both pools then feed mapped paired processing.

Evidence:

- `$IWC_FORMAT2/virology/pox-virus-amplicon/pox-virus-half-genome.gxwf.yml:363` uses `split_file_to_collection`.
- `$IWC_FORMAT2/virology/pox-virus-amplicon/pox-virus-half-genome.gxwf.yml:391` uses `__SORTLIST__`.
- `$IWC_FORMAT2/virology/pox-virus-amplicon/pox-virus-half-genome.gxwf.yml:480` maps `fastp` over the second pool after sorting.
- `$IWC_FORMAT2/virology/pox-virus-amplicon/pox-virus-half-genome.gxwf.yml:1171` uses `samtools_merge` as a later collection-style reduction.
- `$IWC_FORMAT2/virology/pox-virus-amplicon/pox-virus-half-genome.gxwf.yml:1315` flattens later nested output.

Lifecycle recipe: `derive/split sibling collection -> sort by sibling identifiers -> mapped paired processing -> reduce/flatten`.

This composes [[harmonize-by-sortlist-from-identifiers]], map-over semantics, and [[collection-flatten-after-fanout]].

### Shape E — fan-in bundle, downstream collection consumer, pooled flatten

MAGs generation shows map-over lifecycle in the opposite direction: multiple tool outputs are bundled into a collection, consumed by a downstream refinement tool, then flattened for pooled downstream processing.

Evidence:

- `$IWC_FORMAT2/microbiome/mags-building/MAGs-generation.gxwf.yml:961` builds a collection with `__BUILD_LIST__`.
- `$IWC_FORMAT2/microbiome/mags-building/MAGs-generation.gxwf.yml:995` consumes that collection with `binette`.
- `$IWC_FORMAT2/microbiome/mags-building/MAGs-generation.gxwf.yml:1037` flattens nested bins with `__FLATTEN__`.

Lifecycle recipe: `parallel outputs -> BUILD_LIST fan-in -> downstream collection consumer -> FLATTEN pooled result`.

Existing coverage: [[collection-build-named-bundle]] and [[collection-flatten-after-fanout]]. The lifecycle-level point is that collection construction is not just input preparation; it also appears as mid-workflow fan-in before a collection-aware tool.

## 2. Phase inventory, demoted

The earlier collection survey already counted individual tools. For lifecycle purposes, the inventory is more useful as phase membership:

| Lifecycle phase | Common IWC mechanism | Existing page coverage |
|---|---|---|
| Prepare from rows or manifest | `split_file_to_collection`, `__BUILD_LIST__`, Apply Rules paired mapping | [[tabular-to-collection-by-row]], [[collection-build-named-bundle]], [[collection-build-list-paired-with-apply-rules]] |
| Map domain tool | Native Galaxy collection map-over by connecting collection input | [[galaxy-collection-patterns]], [[galaxy-collection-semantics]] |
| Drop unusable elements | `__FILTER_EMPTY_DATASETS__`, `__FILTER_FAILED_DATASETS__` | [[collection-cleanup-after-mapover-failure]] |
| Sync sibling collections | `collection_element_identifiers`, `__FILTER_FROM_FILE__`, `__SORTLIST__`, `__RELABEL_FROM_FILE__` | [[sync-collections-by-identifier]], [[harmonize-by-sortlist-from-identifiers]], [[regex-relabel-via-tabular]] |
| Reshape axes | `__APPLY_RULES__`, `__FLATTEN__`, `__EXTRACT_DATASET__` | [[collection-swap-nesting-with-apply-rules]], [[collection-flatten-after-fanout]], [[collection-unbox-singleton]] |
| Aggregate tabular/report output | `collapse_dataset`, `collection_column_join`, domain reducers, report tools | [[tabular-concatenate-collection-to-table]], [[tabular-pivot-collection-to-wide]] |
| Publish | workflow outputs, `__BUILD_LIST__`, conditional `when`, singleton extraction | [[collection-build-named-bundle]], [[conditional-gate-on-nonempty-result]], [[collection-unbox-singleton]] |

## 3. Nextflow channel-shape implications

The broad Nextflow anatomy note, [[component-nextflow-pipeline-anatomy]], is still a stub. Two narrower notes are usable prior work: [[nextflow-to-galaxy-channel-shape-mapping]] and [[nextflow-operators-to-galaxy-collection-recipes]]. Local Nextflow fixtures were materialized under `workflow-fixtures/pipelines/` for this pass.

### Clean mappings

| Nextflow pattern | Galaxy/IWC lifecycle analogue | Evidence and caveat |
|---|---|---|
| Samplesheet rows become repeated `tuple(meta, path)` records | Galaxy workflow input `list` / `list:paired`, or manifest-to-collection preparation | nf-core/demo samplesheet normalization in `$PIPELINES/nf-core__demo/subworkflows/local/utils_nfcore_demo_pipeline/main.nf:102-120`; Galaxy analogue in `$IWC_FORMAT2/transcriptomics/rnaseq-pe/rnaseq-pe.gxwf.yml:5-11` and SRA manifest split at `$IWC_FORMAT2/data-fetching/sra-manifest-to-concatenated-fastqs/sra-manifest-to-concatenated-fastqs.gxwf.yml:175`. Rich `meta` fields still need a representation choice. |
| `tuple(meta, path)` map-over | Native Galaxy collection map-over | nf-core/rnaseq branches normalized inputs in `$PIPELINES/nf-core__rnaseq/workflows/rnaseq/main.nf:152-164`; Galaxy examples are ordinary collection inputs to mapped tools, e.g. MGnify list input at `$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:5-9`. |
| `collect()`, `toList()`, `collectFile()` for report or file materialization | Aggregate/report tool, `collapse_dataset`, `collection_column_join`, or one explicit output file | nf-core/demo MultiQC collection in `$PIPELINES/nf-core__demo/workflows/demo.nf:106-115`; Galaxy tabular aggregation examples include `$IWC_FORMAT2/sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:413-433`. |
| `mix()` of final report/version channels | Report aggregation or output bundle | nf-core/taxprofiler mixes optional MultiQC inputs in `$PIPELINES/nf-core__taxprofiler/workflows/taxprofiler.nf:350-393`; Galaxy bundle analogue is `__BUILD_LIST__` in `$IWC_FORMAT2/amplicon/qiime2/qiime2-III-VI-downsteam/QIIME2-VI-diversity-metrics-and-estimations.gxwf.yml:337-374`. |

### Mappings that need review

| Nextflow pattern | Galaxy pressure point | Likely Galaxy strategy |
|---|---|---|
| `branch` per element | Galaxy `when` is step-level, not arbitrary per-element channel routing | Use workflow booleans or data-derived booleans for whole-step gates; use explicit filters/classifiers for per-element routing. MGnify's non-empty boolean gate is the grounded whole-step pattern. |
| `join()` / `combine(by:)` keyed pairing | Galaxy map-over is safe only when identifiers and structure already align | Use identifier extraction, filtering, sorting, or relabeling; review `remainder`, duplicate keys, and unmatched elements. |
| `groupTuple()` / `transpose()` | Galaxy collection types are structured but not arbitrary tuple records | Use nested collections, Apply Rules, `__FLATTEN__`, or domain reducers only when the grouping axis is real in Galaxy. |
| Unkeyed `combine()` / Cartesian expansion | Weak IWC support for cross-product collection tools | Treat as user-review trigger unless a concrete domain operation justifies it. |
| `publishDir` path rules | Galaxy outputs are labeled datasets/collections, not filesystem layouts | Translate intent into workflow output labels, collection bundles, or report artifacts; do not preserve path layout literally. |

### Nextflow-first recipe boundaries

The Nextflow-first layer probably should not replace Galaxy operation patterns. It should route from source idioms to the Galaxy pages that implement them:

- `samplesheet-to-collection-input` -> [[tabular-to-collection-by-row]], [[collection-build-list-paired-with-apply-rules]], [[galaxy-collection-patterns]].
- `keyed-join-to-identifier-synchronized-mapover` -> [[sync-collections-by-identifier]], [[harmonize-by-sortlist-from-identifiers]], [[regex-relabel-via-tabular]].
- `grouped-channel-to-regrouped-collection` -> [[collection-swap-nesting-with-apply-rules]], [[collection-flatten-after-fanout]], [[collection-unbox-singleton]].
- `mapped-output-cleanup` -> [[collection-cleanup-after-mapover-failure]], [[conditional-gate-on-nonempty-result]].
- `final-report-aggregation` -> [[tabular-concatenate-collection-to-table]], [[tabular-pivot-collection-to-wide]], [[collection-build-named-bundle]].

This is a strong argument for a source-pattern layer above the Galaxy pattern layer; see open questions.

## 4. Candidate pattern boundaries

### Keep

1. **`galaxy-map-over-lifecycle-patterns` MOC.** Existing pages are phase-specific. A MOC can route authors through prepare -> map -> cleanup -> sync -> reshape -> aggregate -> publish without duplicating operation details. Evidence spans MGnify, SRA manifest, influenza, pox-virus, and MAGs.

2. **`manifest-to-mapped-collection-lifecycle` recipe.** Scope: a tabular manifest/list becomes a collection, a mapped tool runs once per row/key, and outputs are relabeled or reshaped. Strongest evidence: SRA manifest and pox-virus.

3. **`cleanup-sync-and-publish-nonempty-results` recipe.** Scope: mapped outputs may be empty; clean them, use identifiers to keep siblings aligned, and gate reports on non-empty results. Strongest evidence: MGnify rRNA prediction.

4. **`reshape-relabel-remap-by-collection-axis` recipe.** Scope: domain fan-out creates the wrong axis; use Apply Rules and relabeling to expose the downstream map-over axis. Evidence is dense but mostly influenza; keep as a recipe page with confidence caveats, not a broad operation.

5. **Nextflow-source-pattern MOC.** Scope: source-facing pages that explain Nextflow channel/operator idioms and list Galaxy pattern pages that implement each idiom. This is not an IWC pattern page in the same sense as collection leaves; it is a translation index over them.

### Merge / cross-link, do not duplicate

6. Cleanup variants belong in [[collection-cleanup-after-mapover-failure]].
7. Sibling sync belongs in [[sync-collections-by-identifier]] and [[harmonize-by-sortlist-from-identifiers]].
8. Collection-to-tabular reduction belongs in [[tabular-concatenate-collection-to-table]] and [[tabular-pivot-collection-to-wide]].
9. Output singleton extraction and bundling belong in [[collection-unbox-singleton]] and [[collection-build-named-bundle]].

### Drop

10. Tool-anchored lifecycle pages such as `FILTER_EMPTY lifecycle` or `Apply Rules lifecycle`.
11. Generic `map-over-in-galaxy` as an operation page. Map-over itself is semantics; corpus-backed reusable value is in the lifecycle recipes around it.
12. Unkeyed Nextflow `combine` / Cartesian product as a corpus-backed pattern. Treat it as review-trigger until stronger IWC evidence appears.

## 5. Open questions

1. Should `galaxy-map-over-lifecycle-patterns` be a `pattern_kind: moc` page under `content/patterns/`, or remain a research survey until one conversion workflow uses it?
2. Should lifecycle recipes be standalone recipe pages, or sections inside the lifecycle MOC that link to existing operations?
3. Is dense single-workflow evidence enough for `reshape-relabel-remap-by-collection-axis`, or should it stay survey-only until a second workflow attests the full sequence?
4. Should source-pattern pages be a new note type, a `research/component` subtype convention, or ordinary `pattern` pages with source-specific metadata?
5. If source-pattern pages list `implemented_by` Galaxy pattern pages, should that field be schema-validated as wiki links?
6. How prescriptive should Nextflow-first pages be when the mapping is lossy: default recipe plus review triggers, or review-only until verified in a conversion?
