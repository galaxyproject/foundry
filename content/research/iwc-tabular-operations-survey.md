---
type: research
tags:
  - research/component
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-05-02
revision: 2
ai_generated: true
related_notes:
  - "[[iwc-test-data-conventions]]"
  - "[[iwc-shortcuts-anti-patterns]]"
  - "[[planemo-asserts-idioms]]"
  - "[[nextflow-operators-to-galaxy-collection-recipes]]"
  - "[[galaxy-tabular-patterns]]"
  - "[[harmonize-by-sortlist-from-identifiers]]"
  - "[[manifest-to-mapped-collection-lifecycle]]"
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
  - "[[iwc-map-over-lifecycle-survey]]"
  - "[[iwc-parameter-derivation-survey]]"
  - "[[iwc-transformations-survey]]"
summary: "Corpus survey of tabular tools and operations across IWC workflows; map for the operation pattern hierarchy on row/column data manipulation."
---

# IWC tabular operations survey

Source corpus: `/Users/jxc755/projects/repositories/workflow-fixtures/iwc-format2/`, 120 `.gxwf.yml` files across 20 domain directories. Counts below are step-occurrence counts produced by `grep -rh "^[[:space:]]*- tool_id:" --include="*.yml" | sort | uniq -c` (i.e. one count per workflow step that uses the tool, including subworkflow steps and the trailing `unique_tools` block — so the magnitudes are roughly 2x the count of *distinct* invocations a user authored, but the *ranking* is faithful). All file:line citations are into `iwc-format2/`.

The corpus is heavily skewed toward sars-cov-2 reporting, microbiome amplicon, VGP assembly QC, and scRNA-seq metadata wrangling — those four pull the tabular tooling. Pure read/align/call workflows (`read-preprocessing/`, most of `variant-calling/`) barely touch tabular operations directly; their tabular work happens inside `multiqc` rollups, which are out of scope.

## 1. Tool inventory

Ranked by step occurrences. "DT" = devteam, "BG" = bgruening, "IUC" = iuc, "NML" = nml. Display names and short forms shown after first introduction.

### 1a. Galaxy "core" tabular tools (no toolshed owner; bundled with Galaxy)

| Steps | tool_id | Short name | Operation |
|---|---|---|---|
| 127 | `Cut1` | Cut1 (Cut columns from a table) | Column projection |
| 33 | `Filter1` | Filter1 (Filter data on any column using simple expressions) | Row filter |
| 47 | `Grep1` | Grep1 (Select lines that match an expression) | Row filter (regex) |
| 25 | `sort1` | sort1 (Sort) | Sort |
| 21 | `Remove beginning1` | Remove beginning | Header strip |
| 19 | `Grouping1` | Grouping1 (Group data by a column) | Group/aggregate |
| 7 | `Paste1` | Paste1 (Paste two files side by side) | Column-bind |
| 5 | `addValue/1.0.1` (DT) | Add a column | Constant column add |
| 4 | `cat1` | Concatenate | Row-bind |

First citations:
- `Cut1` — `sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:782` (`columnList: c4,c6,c7,c13,c14,c15,c16,c17,c18,c19,c21,c22,c23,c26,c24,c25,c20`, `delimiter: T`).
- `Filter1` — `sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:545` (`cond: c4=='PASS' or c4=='.'`, `header_lines: "1"`).
- `Grep1` — `comparative_genomics/hyphy/capheine-core-and-compare.gxwf.yml:687` (`pattern: ^>`, `invert: ""`, `keep_header: false`).
- `sort1` — `VGP-assembly-v2/Purge-duplicates-one-haplotype-VGP6b/Purging-duplicates-one-haplotype-VGP6b.gxwf.yml:559`.
- `Grouping1` — `microbiome/pathogen-identification/pathogen-detection-pathogfair-samples-aggregation-and-visualisation/Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation.gxwf.yml:324` (`groupcol: "6"`, `operations: [{optype: length, opcol: "6"}]`).
- `Remove beginning1` — `microbiome/pathogen-identification/.../Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation.gxwf.yml:186`.
- `Paste1` — `genome_annotation/functional-annotation/functional-annotation-of-sequences/Functional_annotation_of_sequences.gxwf.yml:733` (two inputs, `delimiter: T`).

### 1b. bgruening text_processing suite ("tp_*")

By far the largest single family. Same upstream tool collection (`text_processing` repo, owner `bgruening`), individual tools bucketed by operation. Multiple version pins coexist in the corpus (`9.3+galaxy1`, `9.5+galaxy0`, `9.5+galaxy2`, `9.5+galaxy3`) — totals below sum across versions.

| Steps (all versions) | tool stem | Operation |
|---|---|---|
| 195 | `tp_awk_tool` | Free-form awk |
| 66 | `tp_find_and_replace` | Regex/string replace (whole-line) |
| 39 | `tp_replace_in_line` | Regex replace in line |
| 43 | `tp_grep_tool` | Row filter (regex; vs core `Grep1`) |
| 16 | `tp_sed_tool` | Free-form sed |
| 15 | `tp_cat` | Row-bind |
| 12 | `tp_text_file_with_recurring_lines` | Header/template lines (constant prefix) |
| 11 | `tp_replace_in_column` | Per-column substitution |
| ~8 | `tp_sort_header_tool` | Sort while preserving header |
| ~6 | `tp_sorted_uniq` | Dedupe (sort+uniq combined) |
| ~5 | `tp_easyjoin_tool` | Join on key |
| ~4 | `tp_head_tool` | First-N row truncate |
| ~3 | `tp_uniq_tool` | Dedupe |
| ~2 | `tp_multijoin_tool` | Multi-file outer join |

Representative full IDs (first occurrence in corpus):
- `toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_awk_tool/9.5+galaxy3` — `comparative_genomics/hyphy/hyphy-core.gxwf.yml:169`. 82 steps at `9.3+galaxy1`, 60 at `9.5+galaxy3`, 30 at `9.5+galaxy0`, 27 at `9.5+galaxy3` (sars-cov-2 cluster), 13 at `9.5+galaxy2` — that's the version-pin spread.
- `toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_find_and_replace/9.5+galaxy3` — `read-preprocessing/short-read-quality-control-and-trimming.gxwf.yml` and elsewhere; 38 steps total at this version, plus 16 at `9.5+galaxy0` and 12 at `9.3+galaxy1`. Example regex spec: `sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:390-407` (compound `find_pattern` reflowing seven `,`-collapsed datamash columns into seven plain columns; `is_regex: true`, `skip_first_line: true`).
- `toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_replace_in_line/9.5+galaxy0` — `sars-cov-2-variant-calling/sars-cov-2-pe-illumina-artic-variant-calling/pe-artic-variation.gxwf.yml:973`.
- `toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_easyjoin_tool/9.3+galaxy1` — `sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:601` (5 invocations in this single file alone — see §3).
- `toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_text_file_with_recurring_lines/9.5+galaxy3` — `comparative_genomics/hyphy/capheine-core-and-compare.gxwf.yml:663`.
- `toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_sed_tool/9.5+galaxy3` — `sars-cov-2-variant-calling/sars-cov-2-pe-illumina-artic-ivar-analysis/pe-wgs-ivar-analysis.gxwf.yml:155` (5 sed invocations in this one file).
- `toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_replace_in_column/9.5+galaxy3` — `microbiome/pathogen-identification/.../Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation.gxwf.yml:942`. Older `1.1.3` pin survives at `sars-cov-2-variant-calling/sars-cov-2-ont-artic-variant-calling/ont-artic-variation.gxwf.yml:192`.
- `toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_cat/9.5+galaxy3` — `sars-cov-2-variant-calling/sars-cov-2-pe-illumina-artic-ivar-analysis/pe-wgs-ivar-analysis.gxwf.yml:627`.
- `toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_sorted_uniq/9.5+galaxy3` — `comparative_genomics/hyphy/capheine-core-and-compare.gxwf.yml:773`.
- `toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_uniq_tool/9.5+galaxy3` — `VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:2476` (inside a subworkflow).
- `toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_head_tool/9.5+galaxy0` — `microbiome/pathogen-identification/allele-based-pathogen-identification/Allele-based-Pathogen-Identification.gxwf.yml:495`.
- `toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_grep_tool/9.5+galaxy3` — used 43x across four pins (`1.1.1`, `9.3+galaxy1`, `9.5+galaxy2`, `9.5+galaxy3` — last dominates); coexists with core `Grep1` (47x). See §3.
- `toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_multijoin_tool/9.3+galaxy1` — `microbiome/pathogen-identification/.../Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation.gxwf.yml:796`.
- `toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_sort_header_tool/9.3+galaxy1` — `sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:923`.
- `toolshed.g2.bx.psu.edu/repos/bgruening/split_file_on_column/tp_split_on_column/0.6` — `microbiome/pathogen-identification/.../Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation.gxwf.yml:369` (split a tabular into a collection by a key column).

### 1c. devteam column tools

| Steps | tool_id | Operation |
|---|---|---|
| 93 | `toolshed.g2.bx.psu.edu/repos/devteam/column_maker/Add_a_column1/2.1` | Computed column (Python expressions over `cN`) |
| 56 | `toolshed.g2.bx.psu.edu/repos/devteam/add_value/addValue/1.0.1` | Constant column add (older idiom; survives heavily in VGP) |

`column_maker/Add_a_column1/2.1` first occurrence: `sars-cov-2-variant-calling/sars-cov-2-consensus-from-variation/consensus-from-variation.gxwf.yml:344`. Representative state at `sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:294-328` — two `expressions:` entries in one step, one inserting `c7` as `AFcaller` at position `I` (insert), one replacing position `7` with `round((c18 + c19) / c6, 6)` named `AF`. The `error_handling: { auto_col_types: true, fail_on_non_existent_columns: true, non_computable: { action: --fail-on-non-computable } }` block is a stable boilerplate across the corpus — pattern page should call it out as the recommended-default tuple.

### 1d. iuc / nml tabular tools

| Steps | tool_id | Operation |
|---|---|---|
| 73 | `toolshed.g2.bx.psu.edu/repos/iuc/datamash_ops/datamash_ops/{1.1.0,1.8+galaxy0,1.9+galaxy0}` | Group/aggregate; collapse |
| 44 | `toolshed.g2.bx.psu.edu/repos/nml/collapse_collections/collapse_dataset/5.1.0` | Concatenate a collection into a single tabular (with `add_name`/`one_header`) |
| 32 | `toolshed.g2.bx.psu.edu/repos/iuc/collection_column_join/collection_column_join/0.0.3` | Wide pivot: outer-join a collection of 2-col tables on identifier → one row-per-id, one col-per-element |
| 16 | `toolshed.g2.bx.psu.edu/repos/iuc/query_tabular/query_tabular/3.3.2` | Arbitrary SQL (SQLite) over one or more tabulars |
| 11 | `toolshed.g2.bx.psu.edu/repos/iuc/filter_tabular/filter_tabular/3.3.1` | SQL-or-line-filter pre-processor |
| ~6 | `toolshed.g2.bx.psu.edu/repos/iuc/table_compute/table_compute/1.2.4+galaxy{1,2}` | Pandas-style row/col reductions and matrix ops |
| ~3 | `toolshed.g2.bx.psu.edu/repos/iuc/biom_convert/biom_convert/...` | Format conversion (BIOM↔tabular, tangentially) |

First citations:
- `datamash_ops/1.8+galaxy0` — `sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:333`. Representative state (collapse a per-effect duplication): `grouping: 1,2,3,4,5,6,7,8,9,10`, `operations: [{op_name: collapse, op_column: "11"}, ..., {op_name: collapse, op_column: "17"}]` — 7 collapses across columns 11-17 in one step. Lines 333-373.
- `datamash_ops/1.9+galaxy0` (newer pin) — `VGP-assembly-v2/Purge-duplicates-one-haplotype-VGP6b/Purging-duplicates-one-haplotype-VGP6b.gxwf.yml:746`.
- `collapse_collections/collapse_dataset/5.1.0` — `sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:414` (`filename: { add_name: true, place_name: same_multiple }`, `one_header: true`). This is the Galaxy idiom for "flatten a collection back to a single tabular while injecting the element identifier as a leading column" — one_header strips per-file headers but keeps the first.
- `collection_column_join/0.0.3` — `amplicon/amplicon-mgnify/mapseq-to-ampvis2/mapseq-to-ampvis2.gxwf.yml:202` (`identifier_column: "1"`, `fill_char: "0"`, `has_header: "0"`, `old_col_in_header: true`).
- `query_tabular/3.3.2` — `amplicon/amplicon-mgnify/mapseq-to-ampvis2/mapseq-to-ampvis2.gxwf.yml:33`. SQL example at lines 57-64: `SELECT c1, c2, c3, c3 * 100 / SUM(c3) OVER() AS relative_abundance FROM t1;` — window-function relative abundance, in one tool. The `tables_0|table` input shape and `input_opts: { linefilters: [{filter: {filter_type: comment, comment_char: "35"}}, ...] }` for skipping `#`-prefixed lines is the recurring boilerplate.
- `filter_tabular/3.3.1` — `genome_annotation/functional-annotation/functional-annotation-of-sequences/Functional_annotation_of_sequences.gxwf.yml:657`. Used as a lightweight column-projection / regex-line-filter alternative to `query_tabular` when no SQL is needed.
- `table_compute/1.2.4+galaxy2` — `epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:265` (`mode: matrixapply`, `matrixapply_func: { vector_op: min }`, `dimension: "0"` — column-wise min reduction). This is the only tool in the corpus that surfaces pandas-style reductions explicitly.

### 1e. Tabular-adjacent / built-ins worth flagging

- `wc_gnu` (72 steps) — line-count, frequently downstream of a Filter/awk to feed `param_value_from_file` (e.g. `epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:301`).
- `__APPLY_RULES__` (22), `__FLATTEN__` (11), `__RELABEL_FROM_FILE__` (39), `__FILTER_FROM_FILE__` (20), `__FILTER_EMPTY_DATASETS__` (64), `__EXTRACT_DATASET__` (46), `__MERGE_COLLECTION__` (12) — Galaxy collection ops; out of scope per task ("not row/column ops") but they bracket the tabular sections heavily.
- `compose_text_param/0.1.1` (99), `pick_value/0.2.0` (85), `param_value_from_file` (154), `map_param_value/0.2.0` (92), `collection_element_identifiers/0.0.2` (99) — the metadata-wrangling cluster around tabular steps; not tabular themselves.
- `multiqc/1.33+galaxy0` (31) and `tooldistillator_summarize/1.0.4+galaxy0` (11) — produce tabular outputs but are reporting tools; out of scope.

### 1f. Notable absences

Searched `--include="*.yml"` for these; **zero hits in the corpus**:

- `csvtk/*` — none. Rich CSV/TSV swiss-army wrapper exists in toolshed but no IWC workflow uses it.
- `datamash_transpose/*`, `datamash_reverse/*` — none. Datamash's transpose/reverse subcommands are not surfaced through any IWC workflow; transpose is done either via `table_compute` (rare) or implicit in the wide-pivot `collection_column_join` idiom (§5).
- No dedicated CSV format converter (no `tab_to_csv` / `csv_to_tab`); when conversion is needed it goes through awk.
- No bedtools-as-tabular intersect/sort outside of genuine BED contexts (excluded by scope anyway).

## 2. Operation inventory

Each operation, ranked by visible IWC frequency, with 2-3 file:line examples each.

### 2a. Filter rows (very common; ~80+ instances)

- Core `Filter1` with Python-expression over `cN` columns: `sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:545` (`cond: c4=='PASS' or c4=='.'`, `header_lines: "1"`).
- `Filter1` driven by a runtime-generated rule string fed from another step: `epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:320-336` (`cond: { __class__: ConnectedValue }` from `generate filter rule/out1`).
- Regex/grep — split between core `Grep1` and `tp_grep_tool` (see §3 for the redundancy). Core: `comparative_genomics/hyphy/capheine-core-and-compare.gxwf.yml:687` (`pattern: ^>`).
- SQL filter with side-effect of column projection: `query_tabular` at `amplicon/amplicon-mgnify/mapseq-to-ampvis2/mapseq-to-ampvis2.gxwf.yml:33`.
- Filter via awk pattern: pervasive — see §2g and the `code:` greps in §5.

### 2b. Column projection / cut (very common; ~127 `Cut1` + N `query_tabular`)

- `Cut1` with comma-separated `cN` list: `sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:782` (`columnList: c4,c6,c7,c13,...,c20`, `delimiter: T`). `Cut1` is *also* used to **reorder** columns by listing them out of order (note `c20` last after `c26,c24,c25` in that example).
- `query_tabular` for column projection + computed columns in one shot: `amplicon/amplicon-mgnify/mapseq-to-ampvis2/mapseq-to-ampvis2.gxwf.yml:57-64`.
- `filter_tabular` for projection without SQL: `amplicon/amplicon-mgnify/mgnify-amplicon-taxonomic-summary-tables/mgnify-amplicon-summary-tables.gxwf.yml:203`.

### 2c. Computed column / per-row arithmetic (~93 `column_maker` + many awk)

- `Add_a_column1/2.1` with multiple expressions in one step (insert *and* replace): `sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:316-329` (`AFcaller` at insert pos 8, `AF = round((c18 + c19) / c6, 6)` at replace pos 7).
- String-concatenation new column: same file lines 462-472 (`c5 + '>' + c6` named `change`, `c3 + ':' + c19` named `change_with_pos`).
- Per-row arithmetic via awk: see §2g.

### 2d. Sort (~25 core `sort1`, ~8 `tp_sort_header_tool`)

- Core `sort1` first occurrence: `VGP-assembly-v2/Purge-duplicates-one-haplotype-VGP6b/Purging-duplicates-one-haplotype-VGP6b.gxwf.yml:559` (inside subworkflow).
- Header-preserving sort: `tp_sort_header_tool/9.3+galaxy1` at `sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:923` and `:950` — used immediately before downstream joins.

### 2e. Group / aggregate (~73 `datamash_ops`, ~19 `Grouping1`)

- Datamash with multi-column `grouping:` plus several `op_name`s in one step: `sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:333-370` (10-col grouping, 7 collapse columns) and `:562-596` (single-col group, 5 ops: `countunique × 3`, `min`, `max`, `collapse`).
- `Grouping1` (older Galaxy tool): `microbiome/pathogen-identification/.../Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation.gxwf.yml:324` (`groupcol: "6"`, `operations: [{optype: length, opcol: "6"}]`) and `:1087` (`optype: cat`, i.e. concatenate group members).

### 2f. Join (~5 `tp_easyjoin_tool` instances visible at top-level, ~2 `tp_multijoin_tool`)

- Two-file join on key columns: `sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:601-627` (`column1: "20"`, `column2: "1"`, `empty_string_filler: "0"`, `header: true`, `jointype: " "` — note the *single space* string for default outer join, not `--outer`). Five easyjoin steps in this one workflow alone (lines 601, 722, 752, 799, 1059).
- Multi-file join: `microbiome/pathogen-identification/pathogen-detection-pathogfair-samples-aggregation-and-visualisation/Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation.gxwf.yml:796` (`tp_multijoin_tool/9.3+galaxy1`).

### 2g. awk (free-form) (~195 step instances)

Effectively the swiss-army knife. Several recurring sub-shapes:

- **Header injection** (constant prefix): `microbiome/mags-building/MAGs-generation.gxwf.yml:1090-1096` —
  ```
  BEGIN {OFS="\t"; print "genome\tcompleteness\tcontamination"}
  NR > 1 {
      if ($1 !~ /\.fasta$/)
          $1 = $1 ".fasta"
      print $1, $2, $3
  }
  ```
  Same one-liner shape at `VGP-assembly-v2/Purge-duplicates-one-haplotype-VGP6b/Purging-duplicates-one-haplotype-VGP6b.gxwf.yml:855` (`'BEGIN{print "Metric\tAlternate"}; {print}; '`) and `:1631` (`Metric\tPrimary`).
- **BED triple synthesis from a 3-column input**: `amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:222` and `:268` —
  `'BEGIN {OFS="\t"} {print $1, $2 - 1, $3, "forward", "1", "+"}'`
  vs `:245`/`:291` `"reverse", "1", "-"`. Replicated verbatim inside the `mgnify-amplicon-pipeline-v5-complete.gxwf.yml:2101,2124,2147,2170` subworkflow embeddings.
- **Long-format taxonomy splitter**: `amplicon/amplicon-mgnify/mapseq-to-ampvis2/mapseq-to-ampvis2.gxwf.yml:101-135` — `split($3, taxonomy, ";")` then dispatch by `^sk__`/`^k__`/`^p__`/`^c__`/`^o__`/`^f__`/`^g__`/`^s__` prefix into the 8 taxonomic-rank columns. Re-implemented (similar but not identical) at `amplicon/amplicon-mgnify/mgnify-amplicon-taxonomic-summary-tables/mgnify-amplicon-summary-tables.gxwf.yml:241,281,336` and `mgnify-amplicon-pipeline-v5-complete.gxwf.yml:5697,5737,5792,6130,6170`.
- **FASTQ id sanitization** (technically in scope as a row-text op): `amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-complete/mgnify-amplicon-pipeline-v5-complete.gxwf.yml:407` — `NR % 4 == 1 { gsub(/[ \/]/, "-", $0) } { print }`.
- **Inline relabel** (replace whole record with a counter): `microbiome/binning-evaluation/MAGs-binning-evaluation.gxwf.yml:433` — `'{gsub( $0 ,"sample_" (NR-1)); print}'`.

### 2h. String/regex replace at the line/column level (~66 `tp_find_and_replace`, ~39 `tp_replace_in_line`, ~11 `tp_replace_in_column`)

- `tp_find_and_replace` with **multiple sequenced patterns in one step**: `sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:389-407` (compound regex reflow + a `(GroupBy|collapse)\(([^)]+)\)` → `$2` strip). Demonstrates the convention `skip_first_line: true` for the first pass and `false` for the second.
- `tp_replace_in_column` with `column_replace: "16"`, `delimiter: tab`, `pass_comments: "#"`, `skip_lines: "1"`, `unknowns_strategy: skip`: `sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:281-289`.

### 2i. Concatenate / row-bind (~15 `tp_cat`, ~4 `cat1`, ~44 `collapse_dataset`)

- `tp_cat` for two-file concat: `sars-cov-2-variant-calling/sars-cov-2-pe-illumina-artic-ivar-analysis/pe-wgs-ivar-analysis.gxwf.yml:627`.
- `collapse_dataset` for collection→tabular concat with header dedup: `sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:414` (`one_header: true`, `add_name: true`, `place_name: same_multiple`). This is the dominant idiom — 44 steps; cf. only 15 `tp_cat` and 4 `cat1`.

### 2j. Dedupe (~6 `tp_sorted_uniq`, ~3 `tp_uniq_tool`)

- `tp_sorted_uniq` first hit: `comparative_genomics/hyphy/capheine-core-and-compare.gxwf.yml:773` and `:1293` (in the workflow's `unique_tools` block).
- `tp_uniq_tool`: `VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:2476`.

### 2k. Header strip / take first N (~21 `Remove beginning1`, ~4 `tp_head_tool`)

- `Remove beginning1`: `microbiome/pathogen-identification/.../Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation.gxwf.yml:186` and `:200` (used twice in succession).
- `tp_head_tool`: `microbiome/pathogen-identification/allele-based-pathogen-identification/Allele-based-Pathogen-Identification.gxwf.yml:495,633`.

### 2l. Pivot / transpose

**Sparse — and the corpus shape is itself a finding.** No `datamash_transpose` invocations anywhere. `table_compute` does column reductions but is not used as a transpose. The dominant **wide-pivot** idiom is `collection_column_join`: take a *collection* of two-column (id, value) tables and outer-join them on the id column to produce one row-per-id, one-column-per-element. Examples at `amplicon/amplicon-mgnify/mapseq-to-ampvis2/mapseq-to-ampvis2.gxwf.yml:202`, `microbiome/pathogen-identification/nanopore-pre-processing/Nanopore-Pre-Processing.gxwf.yml:823`, `microbiome/mags-building/MAGs-generation.gxwf.yml:1483,1544,1656`, `microbiome/mag-genome-annotation-parallel/MAG-Genome-Annotation-Parallel.gxwf.yml:811`. The collection element identifier is the new column header (`old_col_in_header: true`).

**Long-pivot** (wide → long) is done with awk; e.g. `amplicon/amplicon-mgnify/mapseq-to-ampvis2/mapseq-to-ampvis2.gxwf.yml:101-135` reshapes a `;`-delimited taxonomy column to 8 parallel columns — itself wide-from-long via awk dispatch, reverse direction.

### 2m. Format conversion (tabular flavors)

Almost none seen. `biom_convert` (24 step occurrences across some amplicon workflows) is the only dedicated converter, and it converts between BIOM and TSV — adjacent to scope. Otherwise, conversions between TSV/CSV/BED-like flavors are done with awk + `Cut1` ad hoc; **no pure converter pattern exists**.

### 2n. Count / summarize (~72 `wc_gnu`)

`wc_gnu` is overwhelmingly used to feed `param_value_from_file` (line-count → integer parameter). E.g. `epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:301-313` (`include_header: false`, `options: [lines]`).

### 2o. Sample / random subset

Not visible at the tabular layer in any sampled file; sampling happens upstream at FASTQ level (`seqtk_sample`), not on tabular outputs.

### 2p. Side-by-side bind / paste

`Paste1` (7 instances): `genome_annotation/functional-annotation/functional-annotation-of-sequences/Functional_annotation_of_sequences.gxwf.yml:733` and `microbiome/pathogen-identification/allele-based-pathogen-identification/Allele-based-Pathogen-Identification.gxwf.yml:611`.

## 3. Cross-tab (tool × operation; redundancy hotspots)

| Operation | Tools that cover it (corpus-observed) | Recommendation lean |
|---|---|---|
| Filter rows (column expression) | `Filter1`, `query_tabular`, `filter_tabular`, awk | `Filter1` for one-shot; `query_tabular` only when SQL semantics needed |
| Filter rows (regex) | `Grep1` (47), `tp_grep_tool` (43), awk | **Real redundancy** — 47 vs 43 split with no semantic distinction visible |
| Cut/project columns | `Cut1` (127), `query_tabular`, `filter_tabular`, `Paste1`+`Cut1` chains | `Cut1` dominates; use `query_tabular` for project+compute fused |
| Computed column | `Add_a_column1` (93), awk, `query_tabular` | `Add_a_column1` if the expression is short; awk if the row needs a multi-line decision tree (see §2g taxonomy splitter) |
| Sort | `sort1`, `tp_sort_header_tool` | `tp_sort_header_tool` whenever the input has a header — `sort1`'s header handling is implicit |
| Group/aggregate | `datamash_ops` (73), `Grouping1` (19), `query_tabular` | `datamash_ops` is the canonical choice; `Grouping1` survives in older microbiome workflows |
| Join on key | `tp_easyjoin_tool`, `tp_multijoin_tool`, `query_tabular` (SQL `JOIN`), `collection_column_join` (collection-shape) | `tp_easyjoin_tool` for two-file 1:1; `collection_column_join` for the collection→wide-table case |
| Header injection | awk `BEGIN`-block, `tp_text_file_with_recurring_lines`+`tp_cat` | awk is far more frequent (see §5 idiom #1) |
| Header strip | `Remove beginning1`, awk `NR > 1`, `tp_head_tool` | `Remove beginning1` is purpose-built and dominant |
| Concatenate (row-bind) | `tp_cat`, `cat1`, `collapse_dataset` (collection→single) | `collapse_dataset` for collections; `tp_cat` for plain two-file |
| Dedupe | `tp_sorted_uniq`, `tp_uniq_tool`, `datamash_ops` collapse + count | `tp_sorted_uniq` for line-level; `datamash_ops` for key-aware dedupe |
| Replace text | `tp_find_and_replace` (66), `tp_replace_in_line` (39), `tp_replace_in_column` (11), `tp_sed_tool` (16), awk | `tp_replace_in_column` when the substitution is per-column (preserves other columns); `tp_find_and_replace` for whole-line; the rest are all redundant flavors of "regex replace" |
| Wide pivot | `collection_column_join`, awk | `collection_column_join` for the collection-to-table case (only viable use); no tool for wide↔long generic |
| Transpose | `table_compute` (rare) | No good IWC-attested option; gap |

**Tool-anchored deep-dive candidates** (one tool covers many operations, complex parameterization):

- **awk** (`tp_awk_tool`, 195 steps across all versions) — by far the highest-leverage page. Header injection, BED synthesis, column reshape, regex filter, taxonomy splitting all condense to awk one-liners or short blocks. The `code: |-` field carries a Bash-like single-quoted string OR a multiline awk program; both shapes are present (compare `mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:222` quoted-string form vs `mapseq-to-ampvis2.gxwf.yml:101` multiline `|-` form).
- **datamash_ops** (73 steps) — the only group/aggregate path that scales beyond toy `Grouping1`. The `grouping:` field is a comma-separated string, `operations:` is a list of `{op_name, op_column}` pairs, both `header_in`/`header_out` are independent toggles, and `need_sort:` matters for correctness. Worth a dedicated page.
- **column_maker / Add_a_column1** (93 steps) — Python expressions over `cN`, plus the `error_handling` boilerplate, plus the `add_column.mode: I/R/""` (insert/replace/append) mini-DSL. Worth a page; reviewers will reach for it constantly.
- **query_tabular** (16 steps) — niche but powerful (SQL window functions, multi-table JOINs). Worth a page so users don't reach for awk when SQL is genuinely cleaner.
- **collection_column_join** (32 steps) — *the* wide-pivot idiom, and unobvious unless you already know about it. Worth a page.

## 4. Candidate operation-pattern boundaries

Proposed operation pages, each scoped tightly. Where a candidate is weak, I say so.

1. **`tabular-filter-by-column-value`** — `Filter1` with `cond: cN == 'X' or cN > Y`. Cite `sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:545`, `epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:320`, `sars-cov-2-variant-calling/sars-cov-2-consensus-from-variation/consensus-from-variation.gxwf.yml:276`. Tools: `Filter1`. *Why:* highest-frequency single operation; the `header_lines:` parameter is an easy-to-miss correctness lever; the `cond:` mini-language is non-obvious (Python with `cN` columns). **Keep.**

2. **`tabular-filter-by-regex` (or `tabular-grep`)** — Cover both `Grep1` and `tp_grep_tool` and resolve the redundancy. Cite `comparative_genomics/hyphy/capheine-core-and-compare.gxwf.yml:687`. **Keep, but the page must take a position** on which to recommend (see open question Q1).

3. **`tabular-cut-and-reorder-columns`** — `Cut1` with `columnList: cN,cM,...`, including the use of out-of-order lists for column reordering. Cite `sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:782` (reorder), `:830`, `:878`. Note `delimiter: T` constant. **Keep.**

4. **`tabular-compute-new-column`** — `column_maker/Add_a_column1` with the `error_handling` boilerplate and `add_column.mode: I/R/""` DSL. Cite `sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:316-329`, `:462-472`, `consensus-from-variation.gxwf.yml:344`. **Keep — this is one of the most foot-gun-prone tools in IWC due to silent column-type coercion when `auto_col_types: false`.**

5. **`tabular-group-and-aggregate-with-datamash`** — `datamash_ops` with multi-column `grouping:`, sequenced `operations:`. Cite `sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:333-373` (collapse-by-many), `:562-596` (count/min/max in one step), `:632-657` (single-op countunique). **Keep — high-density idiom page.**

6. **`tabular-join-on-key`** — `tp_easyjoin_tool` with `column1`/`column2`, `empty_string_filler`, `jointype` (note the leading-space convention for outer). Cite `variation-reporting.gxwf.yml:601`, `:722`, `:1059`. Mention `tp_multijoin_tool` for >2 inputs and `query_tabular` for SQL JOIN. **Keep.**

7. **`awk-in-galaxy`** (deep tool-anchored page) — `tp_awk_tool` quoted vs multiline `code:` shapes, `BEGIN {OFS="\t"}` rituals, `NR > 1` header skip, `gsub`, `split`. Cite §2g and §5 examples. **Keep — must be a deep page; see open question Q2 about depth.**

8. **`collection-to-wide-table-with-collection_column_join`** — the wide-pivot idiom. Cite `mapseq-to-ampvis2.gxwf.yml:202`, `mags-building/MAGs-generation.gxwf.yml:1483,1544,1656`, `mag-genome-annotation-parallel/MAG-Genome-Annotation-Parallel.gxwf.yml:811`. **Keep — non-obvious without a worked example.**

9. **`collection-to-single-tabular-with-collapse_dataset`** — sibling to the above for the row-bind direction. Cite `variation-reporting.gxwf.yml:414`, `mapseq-to-ampvis2.gxwf.yml:178`. The `add_name`/`one_header`/`place_name` triad is the foot-gun. **Keep.**

10. **`tabular-sql-with-query_tabular`** — Cite `mapseq-to-ampvis2.gxwf.yml:33` (window function), `mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:137`. The `tables[].input_opts.linefilters` and `tbl_opts.column_names_from_first_line` boilerplate is non-trivial. **Keep — this page exists to *narrow* when query_tabular is the right reach (SQL windows, JOINs), not to evangelize it.**

**Drop / merge candidates** (don't deserve their own page):

- `tabular-sort` — `sort1` and `tp_sort_header_tool` are simple enough to roll into a one-line note inside other pages. Possible exception: a one-paragraph stub disambiguating the two.
- `tabular-dedupe` — same; `tp_sorted_uniq` and `tp_uniq_tool` are thin wrappers, low pitfall density.
- `tabular-row-bind` — collapse into the `collapse_dataset` page; standalone `tp_cat` doesn't merit a page.
- `tabular-format-convert` — corpus is too sparse. Document as a gap, not a page (see §6 Q5).
- `tabular-pivot-wide-to-long` — no concrete IWC pattern; corpus does this case-by-case in awk. Don't write a page until there's signal.
- `sed-in-galaxy` — `tp_sed_tool` (16) is dwarfed by `tp_find_and_replace` (66) and awk (195). Cover sed as a one-section note inside the awk page rather than a sibling page.
- `tabular-header-strip` — `Remove beginning1` is one-parameter (`num_lines`); too thin for a standalone.

## 5. Surprising or recurring idioms

1. **The `BEGIN {OFS="\t"; print "header\there\there"} { print rows }` ritual.** Constant across families: `microbiome/mags-building/MAGs-generation.gxwf.yml:1090`, `VGP-assembly-v2/Purge-duplicates-one-haplotype-VGP6b/Purging-duplicates-one-haplotype-VGP6b.gxwf.yml:855`, `:1631` (`Metric\tPrimary` vs `Metric\tAlternate` — same workflow, two haplotypes, identical rite). Authors reach for awk to attach a header rather than concatenating a constant header file with `tp_cat` — `tp_text_file_with_recurring_lines` exists for the latter but is rarely used (12 step instances corpus-wide vs awk's 195).

2. **Datamash → Find&Replace round-trip to emulate "collapse with delimiter X".** `sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:333-373` collapses 7 columns; `:375-407` then runs `tp_find_and_replace` with a 7-group regex `\t([^\t,]+),[^\t]+\t...` to keep only the first comma-delimited member of each collapsed cell. This is "argmax in datamash" implemented as "collapse-then-regex-trim-to-first" because datamash doesn't have a "first" op accessible through this UI. Pattern page should warn this is the pattern, and that getting the regex group count right is the primary failure mode.

3. **The same workflow uses `Filter1` AND `query_tabular` for distinct cases.** `sars-cov-2-variation-reporting/variation-reporting.gxwf.yml` uses `Filter1` (line 545) for the simple `c4=='PASS'` case but reaches for datamash, easyjoin, find&replace chains for the fan-out/fan-in. There is a real implicit decision boundary: `Filter1` for one-shot row filters; switch tools when the operation needs sort-aware or join-aware semantics.

4. **`collection_column_join` as the only attested wide-pivot.** Six workflows use it, all with the same shape: a collection of `(id, value)` tabulars (one per sample/element) joined on column 1 with `fill_char: "0"`. `microbiome/mags-building/MAGs-generation.gxwf.yml:1483,1544,1656` does this *three times* in one workflow for three different metric families. There's no `pivot_table`-style tool in the corpus; this collection-shape join is the workflow author's substitute, and only works because the upstream produces one (id, value) file per element.

5. **`collapse_dataset` with `add_name: true, place_name: same_multiple, one_header: true` is the canonical "merge a per-sample collection into a single annotated tabular".** `sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:414`, `microbiome/pathogen-identification/.../Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation.gxwf.yml:553` (with `collection_column_join`), `microbiome/host-contamination-removal/...`. Without the `one_header: true` you get duplicated header rows; without `add_name: true` you lose the per-row sample identity. Both bugs are silent.

6. **Version pin sprawl in the awk tool is the leading cause of "same idiom shows up four times".** `tp_awk_tool` exists in the corpus at `9.3+galaxy1` (82 steps), `9.5+galaxy0` (30), `9.5+galaxy2` (13), `9.5+galaxy3` (60+27 in two clusters). Same parameter shape across all of them. Reviewer-facing pattern: pick the highest pin currently in any live workflow and discourage downgrading; do not block PRs for older pins on cleanup-pass grounds.

## 6. Open questions

- **Q1.** `Grep1` (47) vs `tp_grep_tool` (43) — semantic difference real? Both take `pattern`, `invert`, `keep_header`. Suggest the regex page recommend one and demote the other; need your call which.
- **Q2.** `awk-in-galaxy` page depth: one page covering all 195 invocations, or split into 4 sub-pages (`awk-header-injection`, `awk-bed-synthesis`, `awk-taxonomy-split`, `awk-relabel`)? Lean: one page with idiom sections; split only if frontmatter cross-linking gets noisy.
- **Q3.** Should `Add_a_column1` page warn against `auto_col_types: false`? Many corpus uses set it true, some false (`variation-reporting.gxwf.yml:454`); silent string-vs-numeric coercion is a real bug source. Need your call on prescriptiveness.
- **Q4.** Is `query_tabular` deep-dive in scope for this hierarchy or its own thing? It overlaps Galaxy's broader "compute over tabular" story (R, Python, csvtk-shaped). Lean: keep it in this hierarchy as the SQL operation.
- **Q5.** Tabular format conversion is genuinely sparse (no `tab_to_csv`, no `csv_to_tab` ops; `biom_convert` is the only thing close). Write a one-paragraph "gap note" page or skip entirely?
- **Q6.** Older tool IDs (`Grouping1`, `cat1`, `addValue/1.0.1`, `Remove beginning1`, `Paste1`, `sort1`) — do pages mention them as legacy or only the modern equivalent? Lean: mention with a "newer alternative" pointer; corpus still uses them so doc-blindness is wrong.
- **Q7.** Out-of-scope in this survey but adjacent: `multiqc` and `tooldistillator_summarize` produce tabular outputs that downstream tabular tools then chew on. Worth a "tabular sources" cross-reference page or skip?
- **Q8.** Should the wide-pivot page be `collection-to-wide-table-with-collection_column_join` (tool-anchored) or `tabular-pivot-collection-to-wide` (operation-anchored with the tool as recommendation)? Lean: operation-anchored title, tool-anchored content.

## 7. Decisions (2026-04-30)

Resolved via `AskUserQuestion` after this survey landed. Pinned here so the next subagent inherits them without re-litigation.

- **Naming axis (Q8 + general).** Operation-anchored page names. Tool-anchored content is fine inside an operation-named page. Even the awk-split sub-pages get operation names (`tabular-prepend-header`, `tabular-synthesize-bed-from-3col`, `tabular-split-taxonomy-string`, `tabular-relabel-by-row-counter`); awk is the implementation, not the title.
- **awk page depth (Q2).** Split into 4-5 operation-named sub-pages per the bullet above. No single `awk-in-galaxy` umbrella page; cross-link the awk-as-recipe sub-pages from a §Recipes line in any operation page that uses awk.
- **Grep1 vs tp_grep_tool (Q1).** Recommend `tp_grep_tool`. Demote `Grep1` to a "legacy alternative" footnote. Consistency with the rest of the `tp_*` family wins over slight corpus-frequency edge of `Grep1`.
- **Format-conversion gap (Q5).** Skip. Corpus-first principle: no exemplar = no page. The §2m gap note in this survey stands as the only record.
- **`auto_col_types` (Q3).** The `tabular-compute-new-column` page prescribes a **strict structured rule**:
  - **Always** set `fail_on_non_existent_columns: true` (51/51 corpus instances).
  - `non_computable.action: --fail-on-non-computable` is the dominant choice (49/51); the two `--skip-non-computable` exceptions (`consensus-from-variation.gxwf.yml:364`, `:402`) are intentional, for BED-coordinate arithmetic where some rows are legitimately non-numeric.
  - **`auto_col_types`** is per-expression-kind:
    | Expression kind | `auto_col_types` |
    |---|---|
    | Arithmetic on raw `cN` (`(c18+c19)/c6`, `round(...)`) | `true` |
    | Pure string concat (`c5 + '>' + c6`) | `false` |
    | Arithmetic with explicit casts (`int(cN)`, `float(cN)`) | `false` |
    | Mixed | split into two `expressions:` entries with different settings |
  - Corpus distribution: 48 `true` / 3 `false`. Cite `variation-reporting.gxwf.yml:307-329` (true, raw-`cN` arithmetic), `:438-475` (false, string concat), and `consensus-from-variation.gxwf.yml:343-378` (false, explicit-cast arithmetic) as the canonical triple.
  - Note on YAML shape: `expressions:` is nested under `tool_state.ops.expressions` (with `header_lines_select: yes|no` as sibling). `error_handling` is a top-level sibling of `ops`, not nested inside it. The pattern page must show this shape; flat `expressions:` does not roundtrip.
- **Legacy tool IDs (Q6).** Pages name the modern tool primarily; include a short "Legacy alternative" footnote pointing to the old ID (`Grouping1`, `cat1`, `addValue/1.0.1`, `Remove beginning1`, `Paste1`, `sort1`). Reading old IWC workflows must remain possible.
- **`query_tabular` (Q4).** Leaf in this tabular hierarchy as `tabular-sql-query`. Scope narrowly to "when SQL is the right reach" — window functions, multi-table JOINs, project+compute fused. Cross-link from filter / join / compute leaves; do not evangelize.
- **Tabular-source cross-ref (Q7).** Deferred. If a Mold (e.g. `summarize-galaxy-tool`) later needs to point to multiqc/tooldistillator-as-tabular-source context, write the page then.
