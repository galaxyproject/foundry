---
type: research
tags:
  - target/galaxy
status: draft
created: 2026-05-01
revised: 2026-05-02
revision: 2
ai_generated: true
related_notes:
  - "[[galaxy-collection-tools]]"
  - "[[galaxy-collection-semantics]]"
  - "[[galaxy-apply-rules-dsl]]"
  - "[[iwc-tabular-operations-survey]]"
  - "[[iwc-shortcuts-anti-patterns]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
  - "[[nextflow-operators-to-galaxy-collection-recipes]]"
  - "[[collection-build-list-paired-with-apply-rules]]"
  - "[[collection-build-named-bundle]]"
  - "[[collection-cleanup-after-mapover-failure]]"
  - "[[collection-flatten-after-fanout]]"
  - "[[collection-split-identifier-via-rules]]"
  - "[[collection-swap-nesting-with-apply-rules]]"
  - "[[collection-unbox-singleton]]"
  - "[[galaxy-collection-patterns]]"
  - "[[harmonize-by-sortlist-from-identifiers]]"
  - "[[regex-relabel-via-tabular]]"
  - "[[relabel-via-rules-and-find-replace]]"
  - "[[sync-collections-by-identifier]]"
  - "[[tabular-to-collection-by-row]]"
  - "[[iwc-conditionals-survey]]"
  - "[[iwc-map-over-lifecycle-survey]]"
  - "[[iwc-parameter-derivation-survey]]"
summary: "Corpus survey of collection-shape transformations across IWC: built-in collection ops, toolshed transformers, and the multi-step recipes that bracket map-over."
---

# IWC collection-transformations survey

Source corpus: 120 cleaned `gxformat2` workflows under `$IWC_FORMAT2/`. Counts below are step-occurrence counts produced by `grep -rh "^[[:space:]]*- tool_id:" --include="*.yml" | sort | uniq -c` summed across nesting levels (top-level steps, subworkflow embeddings, and trailing `unique_tools` blocks); see [[iwc-tabular-operations-survey]] for the same caveats. Skeleton scans use `$IWC_SKELETONS/` for step-graph topology.

Scope is the **shape-only** transformations on dataset collections — operations that reshape `list`, `paired`, `list:paired`, `list:list`, … structure or annotate elements, without touching file bytes (or only touching them as a side effect of a structural ask). Out of scope:

- Map-over reductions intrinsic to running a tool against a list input (covered by [[galaxy-collection-semantics]]; surfaces in workflows as the connection itself, not a tool step).
- Domain content tools that *happen* to consume or produce collections (`samtools_merge`, `bamtools_split_ref`, `ucsc_fasplit`, `gops_merge_1`, `fasta_merge_files_and_filter_unique_sequences`, …). Surveyed inline in §6 for completeness, *but* their pattern home is in their domain hierarchy, not here. Flagged distinctly so a future reviewer can pull them out if scope tightens.
- The Apply Rules rule-grammar reference itself (in [[galaxy-apply-rules-dsl]]); this survey only catalogs which **rule-shapes** the corpus actually exercises.
- Tabular bridges (`collapse_dataset`, `collection_column_join`, `tp_split_on_column`) already surveyed by [[iwc-tabular-operations-survey]]; revisited from the collection side for recipe coverage.

## 1. The shape of collection work in IWC

Three distinct activities cover essentially everything the corpus does with collection structure:

- **Cleanup after fan-out.** A tool maps over a collection and some elements fail or come back empty; downstream consumers can't tolerate that. `__FILTER_EMPTY_DATASETS__` (64) and `__FILTER_FAILED_DATASETS__` (13) are the by-far dominant tools in the survey, and the recipe is almost always "tool produces collection → filter → next step."
- **Identifier wrangling.** Collection element identifiers are the workflow's only non-file metadata channel. `iuc/collection_element_identifiers` (~99) extracts identifiers as a tabular dataset; `__RELABEL_FROM_FILE__` (39), `__FILTER_FROM_FILE__` (20), `tp_find_and_replace`, `tp_split_on_column`, awk all push identifier mappings around, and the relabel/filter ops feed back into the collection. Apply Rules (22) is the "structured" form of the same activity — it does identifier-as-tabular wrangling end-to-end without leaving collection-land.
- **Structural reshape.** `__FLATTEN__` (11), `__APPLY_RULES__` (22), `__BUILD_LIST__` (7), `__MERGE_COLLECTION__` (12), `__ZIP_COLLECTION__` (2), `__UNZIP_COLLECTION__` (9), `__DUPLICATE_FILE_TO_COLLECTION__` (3), `__SORTLIST__` (8) — actually change the type or order of the collection. Apply Rules is the structural Swiss-army knife; the others are special cases that survive because they're more legible.

What's not here: cross-product, harmonize, split-paired-and-unpaired, nest, tag-from-file, filter-null, keep-success — see §6 for the full corpus-zero list. The corpus does not exercise the full collection-tools catalog.

## 2. Tool inventory

### 2a. Built-in `__*__` collection ops

| Steps | Tool | Operation |
|---|---|---|
| 64 | `__FILTER_EMPTY_DATASETS__` | Drop empty elements (or replace with a sentinel) |
| 46 | `__EXTRACT_DATASET__` | Take one element out of a collection (most often "unbox a singleton") |
| 39 | `__RELABEL_FROM_FILE__` | Rewrite element identifiers from a tabular mapping file |
| 22 | `__APPLY_RULES__` | Structural reshape via the rules DSL |
| 20 | `__FILTER_FROM_FILE__` | Keep / drop elements based on an identifier list file |
| 13 | `__FILTER_FAILED_DATASETS__` | Drop red (errored) elements |
| 12 | `__MERGE_COLLECTION__` | Concatenate two collections, with conflict policy |
| 11 | `__FLATTEN__` | Collapse a nested collection into a flat list with merged identifiers |
| 9  | `__UNZIP_COLLECTION__` | Split a `paired` into separate forward / reverse datasets |
| 8  | `__SORTLIST__` | Reorder elements (alpha, numeric, or `sort_type: file`) |
| 7  | `__BUILD_LIST__` | Build a `list` from individual datasets / collections |
| 3  | `__DUPLICATE_FILE_TO_COLLECTION__` | Broadcast a single dataset to a list of N copies |
| 2  | `__ZIP_COLLECTION__` | Combine forward / reverse datasets into a `paired` |

First citations:

- `__FILTER_EMPTY_DATASETS__` — `$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml` (used 6× in this one workflow as cleanup gates between awk reshapes; see §4).
- `__EXTRACT_DATASET__` — `$IWC_FORMAT2/VGP-assembly-v2/Scaffolding-HiC-VGP8/Scaffolding-HiC-VGP8.gxwf.yml` (used 5× to unbox singleton-collection outputs; see §4 recipe E).
- `__APPLY_RULES__` — `$IWC_FORMAT2/virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping.gxwf.yml` (4 distinct invocations in one workflow; the densest single use; see §3).
- `__BUILD_LIST__` — `$IWC_FORMAT2/amplicon/qiime2/qiime2-III-VI-downsteam/QIIME2-VI-diversity-metrics-and-estimations.gxwf.yml:340` (4 BUILD_LIST steps grouping QIIME2 outputs into named result bundles; the textbook use).
- `__ZIP_COLLECTION__` — `$IWC_FORMAT2/genome-assembly/quality-and-contamination-control-raw-reads/quality_and_contamination_control_raw_reads.gxwf.yml:65` and `$IWC_FORMAT2/virology/pox-virus-amplicon/pox-virus-half-genome.gxwf.yml:1068`.
- `__SORTLIST__` first non-trivial use — `$IWC_FORMAT2/virology/pox-virus-amplicon/pox-virus-half-genome.gxwf.yml:550` (`sort_type: file`, `sort_file: ConnectedValue` — sort one collection by another's identifier order; the "harmonize sibling collections" idiom).

### 2b. Toolshed collection-shape transformers

| Steps | Tool | Operation |
|---|---|---|
| ~99 | `toolshed.g2.bx.psu.edu/repos/iuc/collection_element_identifiers/collection_element_identifiers/0.0.2` | Emit element identifiers as a single-column tabular |
| ~44 | `toolshed.g2.bx.psu.edu/repos/nml/collapse_collections/collapse_dataset/5.1.0` | Collection of tabulars → single tabular, optionally injecting element identifier as a column |
| ~32 | `toolshed.g2.bx.psu.edu/repos/iuc/collection_column_join/collection_column_join/0.0.3` | Outer-join a collection of `(id, value)` tabulars on the id column → wide table |
| ~18 | `toolshed.g2.bx.psu.edu/repos/bgruening/split_file_to_collection/split_file_to_collection/0.5.2` | Split a single file into a collection (by line count, regex, or column) |
| (small) | `toolshed.g2.bx.psu.edu/repos/bgruening/split_file_on_column/tp_split_on_column/0.6` | Split a tabular into a collection keyed by a column value |

`collection_element_identifiers` is the linchpin of nearly every identifier-wrangling recipe in the corpus; see §4 recipes A, F, G. `collapse_dataset` and `collection_column_join` already have homes in [[iwc-tabular-operations-survey]] §2i and §2l respectively but show up here from the collection side as bridges between collection-land and tabular-land — the most common reason to leave a collection is `collapse_dataset`, the most common reason to land in a wide table is `collection_column_join`.

### 2c. Domain tools that produce / consume collections (for completeness; not in scope)

These tools have collection-shape inputs or outputs but their *operation* is domain content, not structural. They probably belong on a tool-domain pattern page, not here. Captured so a later reviewer can pull them out cleanly:

| Steps | Tool | Why it shows up |
|---|---|---|
| moderate | `iuc/bamtools_split_mapped` | Splits a BAM into mapped/unmapped → 2-element collection. `$IWC_FORMAT2/microbiome/host-contamination-removal/host-contamination-removal-long-reads/host-or-contamination-removal-on-long-reads.gxwf.yml:155`, `$IWC_FORMAT2/microbiome/pathogen-identification/nanopore-pre-processing/Nanopore-Pre-Processing.gxwf.yml:493`. |
| 1 file | `iuc/bamtools_split_ref` | Splits a BAM by reference → per-reference collection. `$IWC_FORMAT2/virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping.gxwf.yml:891`. The output feeds the densest collection-recipe in the corpus (§4 recipe H). |
| moderate | `iuc/ucsc_fasplit/fasplit/482` | Splits a multi-record FASTA into a collection of N pieces. Used heavily across hyphy workflows: `$IWC_FORMAT2/comparative_genomics/hyphy/hyphy-preprocessing.gxwf.yml:77`, `hyphy-core.gxwf.yml:114`. |
| 2 | `devteam/merge/gops_merge_1` | Galaxy operations merge — concatenate-and-resolve interval files. `$IWC_FORMAT2/sars-cov-2-variant-calling/sars-cov-2-consensus-from-variation/consensus-from-variation.gxwf.yml:445`. Operates on individual datasets, not collections. |
| moderate | `iuc/samtools_merge/samtools_merge/1.22+galaxy1` | Merges a collection of BAMs into a single BAM. `$IWC_FORMAT2/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:1767`, `Scaffolding-HiC-VGP8/Scaffolding-HiC-VGP8.gxwf.yml:1245`, `virology/pox-virus-amplicon/pox-virus-half-genome.gxwf.yml`. The pox-virus use is interesting — `samtools_merge` on a `__APPLY_RULES__`-shaped 2-element collection is doing collection-style reduction. |

The boundary is fuzzy. `samtools_merge` and `gops_merge_1` reduce a collection to a single dataset — if you squint, that's a "fold" over the collection. The corpus uses them that way (pox-virus-half-genome step 38: `__APPLY_RULES__` → `samtools_merge` produces a per-pool merged BAM; this is the "reduction-after-shape-restructure" pattern). Decision deferred to /iwc-survey-act whether to surface this in a "fold-over-collection" pattern or leave it on a domain page.

### 2d. Notable IWC absences (catalog vs corpus)

The reference catalog [[galaxy-collection-tools]] documents these tools, but **zero corpus uptake**. Per `docs/PATTERNS.md` corpus-first policy, no candidate patterns for these:

- `__NEST__` — add a nesting level. Zero. Authors who need extra nesting reach for `__APPLY_RULES__` instead.
- `__HARMONIZELISTS__` — make two collections share identifiers in same order. Zero. The corpus-attested recipe is `__SORTLIST__` with `sort_type: file` driven by the other collection's identifiers (see §4 recipe I).
- `__CROSS_PRODUCT_FLAT__`, `__CROSS_PRODUCT_NESTED__` — all-vs-all. Zero. Cross-product analyses in IWC happen at the tool wrapper layer (e.g., `qiime2__diversity__beta_group_significance`) rather than as a collection step.
- `__SPLIT_PAIRED_AND_UNPAIRED__` — separate mixed paired/unpaired. Zero. The corpus is uniformly all-paired or all-single, with branching by upstream classification (`fastq_dl`'s `single_end_collection` / `paired_end_collection` outputs handle this at fetch time).
- `__TAG_FROM_FILE__` — apply tags from a tabular mapping. Zero. Tag manipulation, where it occurs, is via `__APPLY_RULES__` (the velocyto example, §3 shape D).
- `__FILTER_NULL__` — drop nulls produced by conditional steps. Zero. Workflows in the corpus don't use conditional execution heavily enough to need it; the closest equivalent is `__FILTER_FAILED_DATASETS__` after a step that may produce errors.
- `__KEEP_SUCCESS_DATASETS__` — positive-selection sibling of FILTER_FAILED. Zero. The negative form `__FILTER_FAILED_DATASETS__` dominates 13 to 0.
- `__DUPLICATE_FILE_TO_COLLECTION__` — only 3 step instances, all in one workflow (`influenza-consensus-and-subtyping.gxwf.yml` steps 11-13), used as a broadcast-for-pairing setup before `__APPLY_RULES__`. Effectively a hapax for that one workflow's pairing fan-out. Note as "barely attested" — not a candidate.

## 3. Apply Rules — what shapes the corpus actually uses

22 `__APPLY_RULES__` step instances across 11 distinct workflow files. Extracting the `tool_state.rules` blob from each shows the corpus uses Apply Rules in a small handful of shapes. The DSL spans dozens of rule types ([[galaxy-apply-rules-dsl]]); the corpus exercises ~5.

### Shape A — swap nesting levels (regroup `list:list` by inner identifier)

Rules: `add_column_metadata identifier0` then `identifier1`. Mapping: `list_identifiers: [1, 0]` (reversed).

Used 4× in `$IWC_FORMAT2/virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping.gxwf.yml` (steps 14, 34, 39, 43). After `bamtools_split_ref` produces a per-sample collection of per-segment BAMs (a `list:list` keyed by `sample → segment`), this shape regroups it to `list:list` keyed by `segment → sample` — letting downstream `ivar_consensus` and friends fan out per segment with all samples grouped underneath.

### Shape B — split identifier into nesting levels via regex

Rules: `add_column_metadata identifier0` + `add_column_regex` (regex that captures the prefix and suffix of the identifier into two new columns). Mapping: `list_identifiers: [1, 2]`.

Example: `$IWC_FORMAT2/epigenetics/average-bigwig-between-replicates/average-bigwig-between-replicates.gxwf.yml` — regex `^(.*)_([^_]*)$` against `identifier0` of the input flat list, then maps `[1, 2]` to produce a `list:list` keyed by `sample_prefix → replicate_suffix`. Two add_column_regex steps, one with `replacement: \1` and one with `\2` — the rule grammar's "single regex with two captures" form (`group_count: 2`) is *not* what the corpus uses; the corpus pattern is two parallel regex steps with a single capture each.

### Shape C — promote identifier(s) to a paired collection level

Rules: `add_column_metadata identifier0` (+ identifier1, optionally identifier2) plus a possible regex strip. Mapping: `list_identifiers: [N]` + `paired_identifier: [M]`.

Examples:

- `$IWC_FORMAT2/amplicon/dada2/dada2_paired.gxwf.yml` (step "Sort samples") — adds metadata identifier0 + identifier1, sorts by column 0, maps `list_identifiers: [0]` + `paired_identifier: [1]`. Produces a sample-sorted `list:paired` from a `list:paired` input. The `sort` rule is doing the work here; the rest is a no-op reshape.
- `$IWC_FORMAT2/data-fetching/parallel-accession-download/parallel-accession-download.gxwf.yml` ("flatten paired output" and "flatten single end output") — uses identifier0 + identifier1 + identifier2 to flatten a deeper structure into `list:paired` (or just `list`) with the inner-most identifier becoming the paired tag.
- `$IWC_FORMAT2/data-fetching/sra-manifest-to-concatenated-fastqs/sra-manifest-to-concatenated-fastqs.gxwf.yml` (steps 12 and 13) — same shape but with a regex strip `(.*?)___(.*)` in the middle to clean a transient delimiter from the identifiers before mapping.

### Shape D — filter elements by identifier pattern

Rules: `add_column_metadata identifier0` + `identifier1` + `add_filter_matches value: "barcodes"`. Mapping: `list_identifiers: [0]`.

Used once: `$IWC_FORMAT2/scRNAseq/velocyto/Velocyto-on10X-from-bundled.gxwf.yml` ("extract barcodes from bundle") — picks out the inner element whose `identifier1` is literally `barcodes` from a 10x bundle collection. Rare but instructive: filter-by-identifier is *possible* via Apply Rules but the corpus mostly uses `__FILTER_FROM_FILE__` (with `collection_element_identifiers` upstream) for this kind of work.

### Shape E — reshape a flat list into `list:list` by re-using the same identifier

Rules: `add_column_metadata identifier0` + `add_column_metadata identifier0` (yes, twice). Mapping: `list_identifiers: [0, 1]`.

Used once: `$IWC_FORMAT2/epigenetics/atacseq/atacseq.gxwf.yml` ("Isolate each bigwig do normalize not average"). Effect: the flat list becomes a `list:list` where outer and inner identifiers are both the original identifier — one element per outer key, with that single inner element. This looks like a workaround to satisfy a downstream tool that wants a `list:list` even when there's no real grouping. Note as a foot-gun example, not a candidate pattern.

### Shape F — broadcast-then-pair (paired with `__DUPLICATE_FILE_TO_COLLECTION__`)

Used once: influenza step 14, paired with the 3× `__DUPLICATE_FILE_TO_COLLECTION__` upstream (steps 11-13). The broadcasts produce three N-element collections; Apply Rules with `list_identifiers: [1, 0]` reshapes them into the `list:list` keyed by `sample → segment` that downstream `vapor` expects. This is a hapax recipe — not a candidate pattern in itself, but worth noting as the only attested use of `__DUPLICATE_FILE_TO_COLLECTION__`.

**Apply Rules summary:** the corpus uses Apply Rules for (i) swapping nesting levels, (ii) splitting identifiers into nesting via regex, (iii) building `list:paired` from a flat list with paired tags, and (iv) one-off filter-by-identifier. It does *not* use Apply Rules for tag manipulation (no `tags`/`group_tags` mappings observed), sample-sheet integration (no `add_column_from_sample_sheet_index`), arithmetic filters (no `add_filter_compare`), or substring extraction (no `add_column_substr`). The DSL is far richer than the corpus.

## 4. Multi-step recipes

The high-value section. Recipes here are *connection-shaped*: only visible from skeleton scans, not from grep. Each recipe is named operation-anchored and carries 2-3 corpus citations and a candidate-quality assessment.

### Recipe A — `iuc/collection_element_identifiers → __FILTER_FROM_FILE__` ("sync sibling collections by identifier")

Take the identifier list of one collection, use it as a filter mask for another. Pattern: extract identifiers from collection `X`, then `__FILTER_FROM_FILE__(input=Y, filter_source=identifiers_of_X)` to keep only Y's elements present in X.

Citations:

- `$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml` steps 12-18: `__FILTER_EMPTY_DATASETS__(SSU BED)` → `collection_element_identifiers` → `__FILTER_FROM_FILE__(Processed sequences, filter=identifiers)`. Same pattern doubled for LSU. The "drop the matching FASTQ records when the BED was empty" idiom — keeps two collections in sync after one of them gets filtered.
- `$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-its/mgnify-amplicon-pipeline-v5-its.gxwf.yml` steps 2-4: same shape, used once.
- `$IWC_FORMAT2/microbiome/metagenomic-raw-reads-amr-analysis/metagenomic-raw-reads-amr-analysis.gxwf.yml` steps 11, 19: `collection_element_identifiers` of the input → `__RELABEL_FROM_FILE__` of a downstream collection (relabel variant of the same idea — synthesize a per-sample identifier from input identifiers, then push it onto the output of a tool that lost the per-element identity).

**Keep as candidate `multi-step:sync-collections-by-identifier`.** This is the single most foot-gun-prone collection idiom in the corpus — without it, downstream collection-zip / map-over connections silently lose pairing. Highly worth a pattern page.

### Recipe B — `__APPLY_RULES__ → collection_element_identifiers → tp_find_and_replace → __RELABEL_FROM_FILE__` ("structured relabel via Apply Rules")

When the new identifiers are derived from old identifiers by a regex transform, the corpus does it in two stages: Apply Rules to extract / restructure identifiers as a tabular, then relabel from that tabular. Used after a `bamtools_split_ref`-style structural fan-out where the auto-generated element names carry tool-prefix junk (e.g. `MAPPED.<reference>`).

Citations:

- `$IWC_FORMAT2/virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping.gxwf.yml` steps 34-38: bamtools_split_ref output → `__APPLY_RULES__` (Shape A swap) → `collection_element_identifiers` ×2 → `tp_find_and_replace` → `__RELABEL_FROM_FILE__` → `__APPLY_RULES__` (Shape A again). Six steps, three of them collection-ops; the densest collection-wrangling segment in the corpus.

**Keep as candidate `multi-step:relabel-via-rules-and-find-replace`.** Common enough to deserve a page; the doubled `collection_element_identifiers` is non-obvious (the second one is the post-relabel identifiers feeding a downstream count). One workflow uses it heavily; second-citation strength is light. Start the page documenting *the influenza pattern specifically* and let evidence accumulate before generalizing.

### Recipe C — `<tool that fails per-element> → __FILTER_FAILED_DATASETS__` and `<tool that may emit empty> → __FILTER_EMPTY_DATASETS__` ("cleanup-after-fanout")

By far the most common collection idiom — `__FILTER_EMPTY_DATASETS__` (64) and `__FILTER_FAILED_DATASETS__` (13) almost never appear except as the immediate downstream of a tool that maps over a list. Citations:

- `$IWC_FORMAT2/microbiome/pathogen-identification/pathogen-detection-pathogfair-samples-aggregation-and-visualisation/Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation.gxwf.yml` steps 10-14: five distinct inputs each immediately go through `__FILTER_FAILED_DATASETS__`. The "input might have failed elements; make sure they don't poison downstream" pattern, applied symmetrically to every per-sample input.
- `$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml` 6× use of `__FILTER_EMPTY_DATASETS__` interleaved with `tp_awk_tool` reshapes — every awk step that could produce zero-line output for some elements is followed by an EMPTY filter before the next consumer.
- `$IWC_FORMAT2/microbiome/metagenomic-raw-reads-amr-analysis/metagenomic-raw-reads-amr-analysis.gxwf.yml:225`: `argNorm on Groot output` → `__FILTER_FAILED_DATASETS__` with a `replacement:` second input (the rare two-input form: drop failures *and* substitute a sentinel for downstream merge consistency).

**Keep as candidate `multi-step:cleanup-after-mapover-failure`** — single highest-frequency collection idiom in the corpus. Pattern page should distinguish three sub-cases:

1. EMPTY filter: drop elements that came back zero-length (awk filter, `cmsearch_deoverlap`, etc.).
2. FAILED filter: drop elements that errored (red state) — different from empty.
3. Replacement form: pre-supply a sentinel dataset to substitute, so collection length stays stable for downstream zips.

Distinct from `__FILTER_FROM_FILE__` (which uses an external identifier list); EMPTY/FAILED are content-driven.

### Recipe D — `<tool that produces collection of tabulars> → collapse_dataset → tabular work` ("collection-to-tabular bridge")

The dominant way to leave collection-land. `collapse_dataset` with `add_name: true, place_name: same_multiple, one_header: true` (44 step instances corpus-wide) injects element identifiers as a leading column and dedupes per-element headers, producing a single tabular ready for `Cut1`/`Filter1`/`datamash_ops` etc. Documented from the tabular side in [[iwc-tabular-operations-survey]] §2i and §5 idiom 5; from the collection side, this is the bridge.

Citations:

- `$IWC_FORMAT2/sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:414` — canonical citation, full triad on.
- `$IWC_FORMAT2/microbiome/pathogen-identification/pathogen-detection-pathogfair-samples-aggregation-and-visualisation/Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation.gxwf.yml:553` — same shape, with `collection_column_join` downstream.
- `$IWC_FORMAT2/virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping.gxwf.yml` steps 21, 22, 28, 44, 45 — five distinct `collapse_dataset` steps in one workflow, each immediately followed by a tabular tool (`Grep1`, `tp_find_and_replace`, `Filter1`).

**Cross-reference, do not write again.** [[iwc-tabular-operations-survey]] §candidate 9 already proposes `collection-to-single-tabular-with-collapse_dataset` as an operation pattern. Do not duplicate; cross-link from this hierarchy to the tabular page once it lands. (The collection-side page may want a one-paragraph "you're entering tabular-land" pointer.)

### Recipe E — `__EXTRACT_DATASET__` as "unbox a singleton"

The dominant use of `__EXTRACT_DATASET__` (46 steps) is *not* "pull element K out of an N-element collection" — it's "the upstream step always produces a 1-element collection and I need it as a dataset." Often paired with a conditional `pick_value` upstream that branches on `Has a single sample` / `Has multiple samples`.

Citations:

- `$IWC_FORMAT2/VGP-assembly-v2/Scaffolding-HiC-VGP8/Scaffolding-HiC-VGP8.gxwf.yml`: 5× `__EXTRACT_DATASET__` for QC outputs (steps 27, 29, 48, 58, 60, plus several labeled "Alignment Scores", "Alignment Stats"); each one unboxes a singleton image / report from `multiqc` or `pretext_snapshot`.
- `$IWC_FORMAT2/VGP-assembly-v2/Assembly-Hifi-HiC-phasing-VGP4/Assembly-Hifi-HiC-phasing-VGP4.gxwf.yml`: 6× `__EXTRACT_DATASET__` for merqury and PNG outputs.
- `$IWC_FORMAT2/VGP-assembly-v2/Purge-duplicates-one-haplotype-VGP6b/Purging-duplicates-one-haplotype-VGP6b.gxwf.yml`: 6× same shape.

**Keep as candidate `collection-unbox-singleton`** — the recipe is single-tool but the *use case* is non-obvious to anyone reading these workflows for the first time. Distinguish from "extract the i-th element" (which is the same tool with `which: by_index` or `by_identifier`, but corpus uptake is small — `which: first` dominates).

### Recipe F — `__FILTER_EMPTY_DATASETS__ → collection_column_join` ("non-empty wide pivot")

`collection_column_join` requires every element to be a non-empty `(id, value)` tabular; an empty element propagates as a hole. Pattern: filter empties out first.

Citations:

- `$IWC_FORMAT2/microbiome/pathogen-identification/pathogen-detection-pathogfair-samples-aggregation-and-visualisation/Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation.gxwf.yml` steps 29, 35: `Grouping1` → `__FILTER_EMPTY_DATASETS__` → `collection_column_join`.
- (Counter-evidence: most `collection_column_join` users in the corpus do *not* run a FILTER_EMPTY upstream — `$IWC_FORMAT2/microbiome/mags-building/MAGs-generation.gxwf.yml` steps 51, 53 don't, neither does `mapseq-to-ampvis2.gxwf.yml`. Suggests this is a defensive idiom, not a universal one. Pattern page should call out *when* the filter is needed — small N, possibly-empty per-sample outputs — vs. when it's overkill.)

**Merge into the `collection_column_join` pattern page (already proposed in [[iwc-tabular-operations-survey]] §candidate 8) as a "guarding wide-pivot against empty inputs" sub-section.** Not a standalone page.

### Recipe G — `tp_find_and_replace → __RELABEL_FROM_FILE__` ("regex relabel via tabular")

The lightweight cousin of Recipe B. When relabel is a simple find-and-replace over identifiers (no Apply Rules structural changes needed), the corpus does:

1. `collection_element_identifiers` (or other source) → tabular of identifiers.
2. `tp_find_and_replace` over that tabular.
3. `__RELABEL_FROM_FILE__` with the modified file.

Citations:

- `$IWC_FORMAT2/data-fetching/sra-manifest-to-concatenated-fastqs/sra-manifest-to-concatenated-fastqs.gxwf.yml` "generate table for relabelling" → `__RELABEL_FROM_FILE__` ×2 — relabel both paired and unpaired output collections of `fasterq_dump` from a hand-rolled mapping table.
- `$IWC_FORMAT2/microbiome/metagenomic-raw-reads-amr-analysis/metagenomic-raw-reads-amr-analysis.gxwf.yml` step 19: `collection_element_identifiers(reads)` → `__RELABEL_FROM_FILE__(downstream collection, mapping=identifiers)`.

**Keep as candidate `multi-step:regex-relabel-via-tabular`.** Sibling to Recipe B; pattern page should connect them — Recipe B for structural reshape *and* relabel, Recipe G for relabel-only.

### Recipe H — `<tool with structural fan-out> → __FLATTEN__` ("flatten after broadcast")

Less common than expected. `__FLATTEN__` (11) is mostly used to collapse a `list:list` produced by per-sample fan-out back into a flat list once the per-sample axis is no longer interesting:

- `$IWC_FORMAT2/microbiome/mags-building/MAGs-generation.gxwf.yml` "Pool Bins from all samples" — flatten a `list:list` of bins into one flat list of bins for downstream pool-level processing.
- `$IWC_FORMAT2/transcriptomics/rnaseq-pe/rnaseq-pe.gxwf.yml` step 11 — flatten paired collection to flat list for MultiQC consumption.
- `$IWC_FORMAT2/microbiome/metagenomic-raw-reads-amr-analysis/metagenomic-raw-reads-amr-analysis.gxwf.yml` step 15 — flatten `list:list` from `sylph_profile` for downstream relabel.

**Keep as candidate `collection-flatten-after-fanout`** — small footprint but the use case is clear and the idiom is one-step. Pattern page is short.

### Recipe I — `__SORTLIST__ sort_type: file` ("harmonize sibling collections by identifier order")

`__HARMONIZELISTS__` has zero corpus uptake (§2d), but the underlying *operation* is attested via `__SORTLIST__` with `sort_type: file` driven by the sibling collection's identifier list:

- `$IWC_FORMAT2/virology/pox-virus-amplicon/pox-virus-half-genome.gxwf.yml:541-562` — `__SORTLIST__(input=PE Reads Pool2, sort_type: file, sort_file=collection_element_identifiers(PE Reads Pool1))`. Reorders Pool2 to match Pool1's element order so downstream zips line up.
- `$IWC_FORMAT2/VGP-assembly-v2/Scaffolding-HiC-VGP8/Scaffolding-HiC-VGP8.gxwf.yml` (subworkflow, 4× SORTLIST with `sort_type: file`) — same shape, reorder one collection by another's identifiers.

**Keep as candidate `multi-step:harmonize-by-sortlist-from-identifiers`.** Renames the `HARMONIZELISTS` capability into the recipe the corpus actually uses. (Note: SORTLIST drops elements not in the sort-file, so this is also a filter; it does *not* preserve elements not in the sort-key. Worth flagging as a foot-gun on the pattern page.)

### Recipe J — `Cut to get only SRA → split_file_to_collection → fasterq_dump` ("file-to-collection for per-row fan-out")

Used to fan a single tabular out to one element per row, so a downstream tool can map over it. The `split_by: col` parameter shape is the canonical knob; `match_regex` / `sub_regex` extract the new element identifier from a column value.

Citations:

- `$IWC_FORMAT2/data-fetching/sra-manifest-to-concatenated-fastqs/sra-manifest-to-concatenated-fastqs.gxwf.yml` "split file to get one SRA per file + header" — split a one-column file of SRA accessions into a 1-element-per-accession collection so `fasterq_dump` runs once per accession via map-over. The `split_parms.split_by.id_col: "1"` + `match_regex: (.*)` shape.
- `$IWC_FORMAT2/sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:895` — split a per-clade-VCF combined tabular into a collection of per-clade tabulars.
- `$IWC_FORMAT2/epigenetics/consensus-peaks/consensus-peaks-chip-sr.gxwf.yml:415` and `consensus-peaks-atac-cutandrun.gxwf.yml:440` — same tool, similar fan-out from a sample-list tabular to a sample collection.

**Keep as candidate `multi-step:tabular-to-collection-by-row`.** Inverse of `collapse_dataset`. The tool is `split_file_to_collection`; the recipe context is the surrounding `Cut1`-prepare-then-split pattern. Pattern page mirrors `collection-to-single-tabular-with-collapse_dataset` from [[iwc-tabular-operations-survey]].

### Recipe K — `__BUILD_LIST__` for grouping named outputs

`__BUILD_LIST__` (7 step instances) is rarely used to "build a collection from datasets" — its dominant use is to bundle several differently-named tool outputs into one named collection for organizational / output-publishing purposes:

- `$IWC_FORMAT2/amplicon/qiime2/qiime2-III-VI-downsteam/QIIME2-VI-diversity-metrics-and-estimations.gxwf.yml:340-` — 4 BUILD_LIST steps gathering Emperor plots, PCoA results, distance matrices, and richness vectors into separately-named output collections.
- `$IWC_FORMAT2/microbiome/mags-building/MAGs-generation.gxwf.yml:961` — assemble four bin-table outputs (one per binner) into one input collection for `binette` to consume.

**Keep as candidate `collection-build-named-bundle`** — but cite the qiime2 use as the canonical "output organization" example and the mags-generation use as the canonical "fan-in for a downstream tool" example. Pattern page is short; the tool's `id_cond/id_select` parameter (`idx` / `identifier` / `manual`) is the only real knob.

## 5. Decision points and redundancy

Where the corpus shows multiple tools / shapes competing for one job. Resolutions belong to /iwc-survey-act, not here.

| Operation | Tools competing | Corpus signal |
|---|---|---|
| Drop failed/errored elements | `__FILTER_FAILED_DATASETS__` (13) vs `__KEEP_SUCCESS_DATASETS__` (0) | Negative form wins 13-0 |
| Drop empty elements | `__FILTER_EMPTY_DATASETS__` (64) vs `__FILTER_NULL__` (0) | EMPTY wins; NULL never used |
| Filter by identifier list | `__FILTER_FROM_FILE__` (20) vs Apply Rules `add_filter_matches` (1) | FILTER_FROM_FILE dominates by far |
| Relabel | `__RELABEL_FROM_FILE__` (39) vs Apply Rules with regex (Shape B/C) | RELABEL_FROM_FILE for from-file mappings; Apply Rules for derived-from-existing-identifier |
| Reshape `list:list` to swap nesting | `__APPLY_RULES__` Shape A (5×) vs no alternative | Apply Rules is the only attested path |
| Add nesting level | `__APPLY_RULES__` Shape B (1×) vs `__NEST__` (0) | Apply Rules dominates; `__NEST__` corpus-zero |
| Harmonize sibling collections | `__SORTLIST__ sort_type: file` (5+×) vs `__HARMONIZELISTS__` (0) | SORTLIST dominates the role HARMONIZELISTS would have played |
| Flatten `list:list` to flat list | `__FLATTEN__` (11) vs Apply Rules with `list_identifiers: [N]` mapping a single column | FLATTEN dominates simple cases; Apply Rules used only when relabeling-while-flattening |
| Build a collection from individual datasets | `__BUILD_LIST__` (7) vs `__MERGE_COLLECTION__` (12) | BUILD_LIST when starting from N datasets; MERGE_COLLECTION when starting from 2+ existing collections |
| Combine forward/reverse into paired | `__ZIP_COLLECTION__` (2) vs Apply Rules Shape C | ZIP_COLLECTION rare in corpus — only 2 hits, both at fastp-output integration points; Apply Rules Shape C dominates the data-fetching cases |

The Apply Rules-vs-dedicated-tool tension is the most architectural decision point. Pattern: dedicated tools dominate for one-shot operations (FLATTEN, FILTER_*); Apply Rules takes over only when the operation needs (a) two or more transformations fused (regex + reshape), (b) reshape that doesn't have a dedicated tool (NEST, swap nesting levels), or (c) integration with a regex-derived tag.

## 6. Recurring single-tool parameter idioms

Where a single tool has a *recurring parameter shape* the corpus uses, beyond the trivial. These are smaller than recipes but deserve to be on the eventual pattern page for the operation.

- **`collection_element_identifiers` is always a no-knob extraction.** Tool has no parameters worth varying; output shape is "one identifier per line, no header." Always feeds either `__FILTER_FROM_FILE__`, `wc_gnu`-then-`param_value_from_file`, or `tp_find_and_replace`-then-`__RELABEL_FROM_FILE__`.
- **`collapse_dataset` triad is `add_name: true, place_name: same_multiple, one_header: true`.** See [[iwc-tabular-operations-survey]] §5 idiom 5. Without the triad you get duplicated headers or lost per-row sample identity. Both bugs are silent.
- **`__FILTER_EMPTY_DATASETS__` `replacement` parameter is rarely used.** 1 attested use (`metagenomic-raw-reads-amr-analysis.gxwf.yml:225` provides a replacement file via `tp_text_file_with_recurring_lines`); the other 63 step instances drop empties without substitution. The replacement form is the "preserve collection length for downstream zip" path; pattern page should call out *when* to reach for it.
- **`__SORTLIST__` is dominantly `sort_type: file` (Recipe I), occasionally `sort_type: alpha`.** Numeric sort observed once (proteomics/openms-metaprosip.gxwf.yml). The file-driven shape is the harmonize idiom; alpha is rare cleanup.
- **`split_file_to_collection` is dominantly `split_by: col` with `match_regex: (.*)` and a `sub_regex`.** The line-count and regex-block split modes the tool supports are not used in IWC; everything is "one-element-per-row of a tabular." Pattern page should lead with the col mode and footnote the others.
- **`__BUILD_LIST__` is `id_select: identifier` for tool-output fan-in; `id_select: manual` for organizational bundles.** The qiime2 usage is `manual` (the user names the elements `bray_curtis_pcoa_results` etc.); the mags-generation usage relies on `identifier` to inherit the downstream tool's identifier. Distinct cases.
- **`__APPLY_RULES__` workflow-form vs interactive-form.** All corpus uses set `editing: false` and `connectable: true` at the rule level; the `RuntimeValue` `collapsible_value` blob is workflow-API plumbing. None of the corpus uses surface a static rule preview. Implication for an authoring agent: the workflow-form rule blob is what gets persisted; live preview is interactive-only.

## 7. Candidate pattern boundaries

Operation-anchored pattern proposals. Each carries scope sketch, primary corpus citations (file:line), and an explicit keep / drop / merge call. Recipes (multi-step) are first-class candidates per `docs/PATTERNS.md`. Numbering parallels [[iwc-tabular-operations-survey]] §4 and continues from a fresh start since the hierarchies are independent.

### Keep

1. **`collection-cleanup-after-mapover-failure`** — Recipe C. Cite `$IWC_FORMAT2/microbiome/pathogen-identification/pathogen-detection-pathogfair-samples-aggregation-and-visualisation/Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation.gxwf.yml:10-14` (5× FILTER_FAILED), `$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml` (multiple FILTER_EMPTY uses), `$IWC_FORMAT2/microbiome/metagenomic-raw-reads-amr-analysis/metagenomic-raw-reads-amr-analysis.gxwf.yml:225` (replacement form). Cover three sub-cases: drop-empty, drop-failed, drop-with-replacement. **Highest-frequency collection idiom by far. Keep.**

2. **`multi-step:sync-collections-by-identifier`** — Recipe A. Cite `$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:12-18`, `mgnify-amplicon-pipeline-v5-its.gxwf.yml:2-4`, `microbiome/metagenomic-raw-reads-amr-analysis/metagenomic-raw-reads-amr-analysis.gxwf.yml:11,19`. **Foot-gun-prone, non-obvious. Keep.**

3. **`collection-unbox-singleton` (`__EXTRACT_DATASET__` `which: first`)** — Recipe E. Cite `$IWC_FORMAT2/VGP-assembly-v2/Scaffolding-HiC-VGP8/Scaffolding-HiC-VGP8.gxwf.yml:27,29,48,58,60`, `Assembly-Hifi-HiC-phasing-VGP4/Assembly-Hifi-HiC-phasing-VGP4.gxwf.yml`, `Purge-duplicates-one-haplotype-VGP6b/Purging-duplicates-one-haplotype-VGP6b.gxwf.yml`. **Distinct from "extract i-th element" — corpus signal is dominantly the singleton case. Keep.**

4. **`multi-step:regex-relabel-via-tabular`** — Recipe G. Cite `$IWC_FORMAT2/data-fetching/sra-manifest-to-concatenated-fastqs/sra-manifest-to-concatenated-fastqs.gxwf.yml`, `$IWC_FORMAT2/microbiome/metagenomic-raw-reads-amr-analysis/metagenomic-raw-reads-amr-analysis.gxwf.yml:11-19`, `$IWC_FORMAT2/virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping.gxwf.yml:35-38`. Sibling page to candidate 5; cross-link both. **Keep.**

5. **`multi-step:relabel-via-rules-and-find-replace`** — Recipe B. Cite `$IWC_FORMAT2/virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping.gxwf.yml:34-38`. **Light second-citation evidence — only one workflow uses the full shape. Keep tentatively, document narrowly to the influenza pattern, and let evidence accumulate before generalizing.**

6. **`collection-swap-nesting-with-apply-rules`** — Apply Rules Shape A. Cite `$IWC_FORMAT2/virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping.gxwf.yml` steps 14, 34, 39, 43 (4× in one workflow). Pattern page documents the `add_column_metadata identifier0/1` + `list_identifiers: [1, 0]` rule shape — the canonical "regroup `list:list` by inner key" recipe. **Keep — only attested way to do this transformation; deserves to be discoverable.**

7. **`collection-split-identifier-via-rules`** — Apply Rules Shape B. Cite `$IWC_FORMAT2/epigenetics/average-bigwig-between-replicates/average-bigwig-between-replicates.gxwf.yml`. **Light single-workflow attestation. Keep tentatively, possibly merge with candidate 6 into a single "Apply Rules — corpus-attested shapes" page if both stay thin.**

8. **`collection-build-list-paired-with-apply-rules`** — Apply Rules Shape C. Cite `$IWC_FORMAT2/amplicon/dada2/dada2_paired.gxwf.yml`, `$IWC_FORMAT2/data-fetching/parallel-accession-download/parallel-accession-download.gxwf.yml`, `$IWC_FORMAT2/data-fetching/sra-manifest-to-concatenated-fastqs/sra-manifest-to-concatenated-fastqs.gxwf.yml:12-13`. **Three independent workflows, sibling shape. Keep.**

9. **`multi-step:harmonize-by-sortlist-from-identifiers`** — Recipe I. Cite `$IWC_FORMAT2/virology/pox-virus-amplicon/pox-virus-half-genome.gxwf.yml:541-562`, `$IWC_FORMAT2/VGP-assembly-v2/Scaffolding-HiC-VGP8/Scaffolding-HiC-VGP8.gxwf.yml` (subworkflow, 4×). **Replaces the absent `__HARMONIZELISTS__` capability with the corpus-attested recipe. Keep.**

10. **`multi-step:tabular-to-collection-by-row`** — Recipe J. Cite `$IWC_FORMAT2/data-fetching/sra-manifest-to-concatenated-fastqs/sra-manifest-to-concatenated-fastqs.gxwf.yml`, `$IWC_FORMAT2/sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:895`, `$IWC_FORMAT2/epigenetics/consensus-peaks/consensus-peaks-chip-sr.gxwf.yml:415`, `consensus-peaks-atac-cutandrun.gxwf.yml:440`. **Inverse of `collapse_dataset`; deserves a dedicated page. Keep.**

11. **`collection-flatten-after-fanout`** (`__FLATTEN__`) — Recipe H. Cite `$IWC_FORMAT2/microbiome/mags-building/MAGs-generation.gxwf.yml`, `$IWC_FORMAT2/transcriptomics/rnaseq-pe/rnaseq-pe.gxwf.yml:11`, `$IWC_FORMAT2/microbiome/metagenomic-raw-reads-amr-analysis/metagenomic-raw-reads-amr-analysis.gxwf.yml:15`. **One-tool one-step recipe; pattern page is short but the use case isn't obvious. Keep.**

12. **`collection-build-named-bundle`** (`__BUILD_LIST__`) — Recipe K. Cite `$IWC_FORMAT2/amplicon/qiime2/qiime2-III-VI-downsteam/QIIME2-VI-diversity-metrics-and-estimations.gxwf.yml:340-` (manual-id form), `$IWC_FORMAT2/microbiome/mags-building/MAGs-generation.gxwf.yml:961` (identifier-id form). **Two distinct sub-cases worth distinguishing on one page. Keep.**

### Drop

13. **`collection-zip-paired`** (`__ZIP_COLLECTION__`) — only 2 corpus uses (`pox-virus-half-genome.gxwf.yml`, `quality_and_contamination_control_raw_reads.gxwf.yml`). **Drop as standalone; cover briefly inside candidate 8 (Apply Rules Shape C is the dominant alternative).**

14. **`collection-unzip-paired`** (`__UNZIP_COLLECTION__`) — 9 step instances, all the trivial split-paired-into-forward-and-reverse use. The tool is one-parameter; **drop as standalone, mention as a one-line recipe inside candidate 3 (`collection-unbox-singleton`) since its dominant downstream is "now extract one of the halves."**

15. **`collection-merge`** (`__MERGE_COLLECTION__`) — 12 step instances. Tool has interesting `duplicate_options` (keep_first / keep_last / suffix_conflict / ...) but corpus uses don't surface conflicts (the merges are usually concatenating two disjoint collections). **Drop as a pattern page; document inline as a one-section note on candidate 12 (`collection-build-named-bundle`) — they're sibling assembly ops.**

16. **`collection-broadcast-via-duplicate`** (`__DUPLICATE_FILE_TO_COLLECTION__`) — 3 step instances, one workflow, hapax. **Drop. Document as a footnote on candidate 6 (`collection-swap-nesting-with-apply-rules`) since its only attested use is the influenza Recipe F broadcast-then-pair.**

17. **`collection-sort-alpha`** (`__SORTLIST__` `sort_type: alpha` or `numeric`) — 1 step instance (proteomics). **Drop. Cover inside candidate 9 (`multi-step:harmonize-by-sortlist-from-identifiers`) as a sub-section on alternative sort modes.**

### Gaps (no pattern page; document corpus-zero status)

18. `__NEST__`, `__HARMONIZELISTS__`, `__CROSS_PRODUCT_FLAT__`, `__CROSS_PRODUCT_NESTED__`, `__SPLIT_PAIRED_AND_UNPAIRED__`, `__TAG_FROM_FILE__`, `__FILTER_NULL__`, `__KEEP_SUCCESS_DATASETS__`. Per `docs/PATTERNS.md` corpus-first, no pages. Recorded in §2d.

### Cross-reference (already proposed elsewhere; do not duplicate)

19. **`collection-to-single-tabular-with-collapse_dataset`** — proposed in [[iwc-tabular-operations-survey]] §candidate 9. From the collection-side, this is Recipe D. Add cross-link only.

20. **`collection-to-wide-table-with-collection_column_join`** — proposed in [[iwc-tabular-operations-survey]] §candidate 8. From the collection side, this is Recipe F's terminus. Add cross-link plus the "guard with `__FILTER_EMPTY_DATASETS__` upstream when N is small" sub-section.

### Domain-tools-as-collection-ops (separate scope decision)

21. **`bamtools_split_*`, `ucsc_fasplit`, `samtools_merge`, `gops_merge_1`, `fasta_merge_files_and_filter_unique_sequences` etc.** — flagged in §2c. These produce or consume collections as a side-effect of a domain content operation. Pattern home is *probably* a domain-specific page (`bam-split-by-reference`, `fasta-split-into-pieces`, etc.); not on this hierarchy. Defer the scope question to /iwc-survey-act.

## 8. Open questions

Numbered for reference in /iwc-survey-act.

- **Q1.** `multi-step:relabel-via-rules-and-find-replace` (candidate 5) is attested only in `influenza-consensus-and-subtyping.gxwf.yml`. Write the page and let evidence accumulate, or wait until a second workflow attests? Lean: write narrowly, scoped to the influenza case verbatim. Risk: the page becomes orphan documentation if no second instance ever appears.
- **Q2.** Apply Rules Shape A (swap nesting, candidate 6) and Shape B (split via regex, candidate 7) — keep as separate pages or merge into a single `apply-rules-corpus-shapes` page that catalogs all attested shapes? Lean: separate pages, one shape per page, since they're distinct operations even if both implemented via Apply Rules. Argument for merging: each shape is light on second-citation evidence individually.
- **Q3.** Recipe F (`__FILTER_EMPTY_DATASETS__ → collection_column_join`) is defensive-but-inconsistent in the corpus — half of `collection_column_join` users don't filter upstream. Pattern page should *recommend* the filter or *describe* the corpus split? Need a call: prescriptive (recommend always) vs. descriptive (note when it's needed and when it isn't).
- **Q4.** `__FILTER_EMPTY_DATASETS__` `replacement` parameter is used 1× out of 64. Worth its own sub-section, or footnote? Lean: sub-section, because it's the *only* way to keep collection length stable for downstream zips, and that's a sharp use case.
- **Q5.** `__BUILD_LIST__` (candidate 12) splits naturally into "manual-id bundle" (qiime2) vs "tool-output fan-in" (mags). One pattern page with two sub-cases, or two separate pages? Lean: one page; the tool is the same and the parameter difference is just `id_select: manual` vs `identifier`.
- **Q6.** Domain content tools that operate on collections (§2c, candidate 21) — `bamtools_split_ref` etc. Surface in this hierarchy as cross-references, or leave entirely to domain pages and don't mention here? Lean: cross-reference only, with a "this is a content tool that happens to fan out / fan in via collections" line so a reader who's looking for "how do I split a BAM" finds the right page.
- **Q7.** `__SORTLIST__` `sort_type: file` (Recipe I, candidate 9) doubles as a filter — it drops elements not present in the sort key. Pattern page should call this out; should it *also* propose this as the "intersect-by-identifier" pattern? The corpus may be using SORTLIST-as-intersect intentionally. Need to check.
- **Q8.** `collection_element_identifiers` is a single-tool no-parameter passthrough but it shows up in 7+ recipes here. Is its primary home the pattern page for whichever recipe it appears in, or does it deserve a one-pager for "extracting collection identifiers as data"? Lean: no standalone page; it's a building block, document inline on each recipe.
- **Q9.** `__EXTRACT_DATASET__` (candidate 3) — corpus uses are ~all `which: first` for unbox-singleton. The `by_index` and `by_identifier` modes the tool supports get effectively zero corpus uptake. Pattern page should mention the other modes briefly or drop them entirely (corpus-first)? Lean: footnote them, since they're trivial parameter variants and a reader might still need them.
- **Q10.** Tags / group_tags are used heavily in the *tabular* survey (datamash, `Add_a_column1`) but **never** in collection-land via `__TAG_FROM_FILE__` or Apply Rules `tags`/`group_tags` mappings. Is this a real gap or am I missing something? Worth a re-grep on group-tag usage anywhere a collection step touches it.
