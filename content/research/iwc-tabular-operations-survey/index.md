---
type: research
tags:
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-09-28
revision: 3
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
summary: "Corpus survey of tabular tools and operations across IWC workflows. Evidence for the operation pattern hierarchy on row/column data manipulation."
---

# IWC tabular operations survey

The pinned IWC corpus uses a mix of Galaxy-bundled row/column tools, Tool Shed text-processing wrappers, and collection-to-table bridges. The operation inventory below records those choices and the recipes behind [[galaxy-tabular-patterns]]. Tool frequency describes this snapshot. It does not establish that an alternative is unsuitable for a particular workflow.

## Evidence and counting method

The snapshot is IWC commit `deafc4876f2c778aaf075e48bd8e95f3604ccc92`, recorded in `workflow-fixtures/fixtures.yaml`. It contains 120 native `.ga` workflows across 20 domain directories. Counts were refreshed on 2026-09-28 by parsing native JSON, visiting every `steps` entry, and recursively visiting embedded `subworkflow.steps`. Each actual tool step contributes once. Embedded copies of a subworkflow count in each containing workflow, so these are occurrences, not unique authored definitions or runtime jobs.

The original survey counted generated `unique_tools` summaries as steps. The counts here exclude those summaries and combine version pins only where the table explicitly says so. A tool can implement several operations, so the tool counts are not a count of distinct tabular tasks.

Local citations use `$IWC_FORMAT2`, the cleaned gxformat2 materialization of that snapshot. These paths and line numbers support inspection of parameters. Pinned native sources are linked in §8. Collection operations and reporting tools are listed separately because their presence around a table transformation does not make them row/column operations.

## 1. Tool inventory

### 1a. Galaxy-bundled tools

These IDs are unqualified in the native workflows. `addValue` is a Tool Shed tool and belongs in §1c.

| Steps | Tool ID | Operation |
|---|---|---|
| 91 | `Cut1` | Select and reorder columns |
| 27 | `Filter1` | Filter rows with a column expression |
| 21 | `Grep1` | Filter lines by regex |
| 19 | `Remove beginning1` | Remove initial lines |
| 15 | `Grouping1` | Group and aggregate |
| 13 | `sort1` | Sort rows |
| 6 | `cat1` | Concatenate files |
| 4 | `Paste1` | Paste files side by side |

Representative states:

- `Cut1`: `columnList: c4,c6,c7,c13,c14,c15,c16,c17,c18,c19,c21,c22,c23,c26,c24,c25,c20`, `delimiter: T` in `$IWC_FORMAT2/sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:782`.
- `Filter1`: `cond: c4=='PASS' or c4=='.'`, `header_lines: "1"` in the same workflow at line 545.
- `Grep1`: `pattern: ^>`, `invert: ""`, `keep_header: false` in `$IWC_FORMAT2/comparative_genomics/hyphy/capheine-core-and-compare.gxwf.yml:687`.
- `Grouping1`: `groupcol: "6"`, `operations: [{optype: length, opcol: "6"}]` in `$IWC_FORMAT2/microbiome/pathogen-identification/pathogen-detection-pathogfair-samples-aggregation-and-visualisation/Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation.gxwf.yml:324`.
- `Remove beginning1`: two successive steps in that PathoGFAIR workflow at lines 186 and 200.
- `Paste1`: two inputs with `delimiter: T` in `$IWC_FORMAT2/genome_annotation/functional-annotation/functional-annotation-of-sequences/Functional_annotation_of_sequences.gxwf.yml:733`.

### 1b. bgruening text-processing tools

The table combines versions of each tool stem. Except for `tp_split_on_column`, these are from `bgruening/text_processing`.

| Steps | Tool stem | Operation |
|---|---|---|
| 127 | `tp_awk_tool` | Awk recipes |
| 54 | `tp_find_and_replace` | Sequenced find/replace patterns |
| 25 | `tp_replace_in_line` | Replace text within lines |
| 18 | `tp_grep_tool` | Regex line filter |
| 16 | `tp_cat` | Concatenate files |
| 15 | `tp_replace_in_column` | Replace values in a selected column |
| 13 | `tp_text_file_with_recurring_lines` | Generate constant/template lines |
| 12 | `tp_easyjoin_tool` | Two-file key join |
| 11 | `tp_sed_tool` | Sed recipes |
| 8 | `tp_cut_tool` | Cut fields or characters |
| 6 | `tp_sort_header_tool` | Sort with header handling |
| 6 | `tp_sorted_uniq` | Sort and deduplicate lines |
| 3 | `tp_tail_tool` | Take final lines |
| 2 | `tp_head_tool` | Take initial lines |
| 2 | `tp_uniq_tool` | Deduplicate adjacent lines |
| 1 | `tp_multijoin_tool` | Join many files |
| 1 | `tp_split_on_column` | Split a table into a collection by column |

An example full ID is `toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_awk_tool/9.5+galaxy3`. Awk pins account for 45 steps at `9.3+galaxy1`, 43 at `9.5+galaxy3`, 30 at `9.5+galaxy0`, and 9 at `9.5+galaxy2`. The separate split wrapper is `toolshed.g2.bx.psu.edu/repos/bgruening/split_file_on_column/tp_split_on_column/0.6`.

Useful inspection points:

- `tp_find_and_replace`: `$IWC_FORMAT2/sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:389-407`, with multiple regex patterns and different `skip_first_line` settings.
- `tp_replace_in_line`: `$IWC_FORMAT2/sars-cov-2-variant-calling/sars-cov-2-pe-illumina-artic-variant-calling/pe-artic-variation.gxwf.yml:973`.
- `tp_text_file_with_recurring_lines`: `$IWC_FORMAT2/comparative_genomics/hyphy/capheine-core-and-compare.gxwf.yml:663`.
- `tp_sed_tool`: `$IWC_FORMAT2/sars-cov-2-variant-calling/sars-cov-2-pe-illumina-artic-ivar-analysis/pe-wgs-ivar-analysis.gxwf.yml:155`.
- `tp_replace_in_column`: the variation-reporting workflow at lines 281–289, with `column_replace: "16"`, `delimiter: tab`, `pass_comments: "#"`, `skip_lines: "1"`, and `unknowns_strategy: skip`.
- `tp_sorted_uniq`: the capheine workflow at line 773. Its trailing tool summary is not another invocation.
- `tp_uniq_tool`: `$IWC_FORMAT2/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:2476`, inside an embedded subworkflow.
- `tp_head_tool`: `$IWC_FORMAT2/microbiome/pathogen-identification/allele-based-pathogen-identification/Allele-based-Pathogen-Identification.gxwf.yml:495` and `:633`.
- `tp_multijoin_tool`: the PathoGFAIR workflow at line 796.
- `tp_split_on_column`: the same workflow at line 369.

### 1c. devteam column tools

| Steps, all versions | Tool stem | Operation |
|---|---|---|
| 55 | `column_maker/Add_a_column1` | Compute columns with Python expressions |
| 31 | `add_value/addValue` | Add a constant column |

`Add_a_column1` has 49 steps at `2.1`, 2 at `2.0`, and 4 at `1.6`. The 51 steps at versions 2.0/2.1 carry structured `error_handling`. The four 1.6 steps do not use that shape. `addValue` occurs at version `1.0.1` under `toolshed.g2.bx.psu.edu/repos/devteam/add_value/addValue/1.0.1`.

The variation-reporting workflow at lines 294–328 has two expressions in one step: insert `c7` at position 8 as `AFcaller`, then replace position 7 with `round((c18 + c19) / c6, 6)` as `AF`. It sets `auto_col_types: true`, `fail_on_non_existent_columns: true`, and `non_computable.action: --fail-on-non-computable`. Those flags apply to the whole step, not separately to each expression.

### 1d. iuc / nml tabular tools

| Steps, all versions | Tool stem | Observed role |
|---|---|---|
| 41 | `nml/collapse_collections/collapse_dataset` | Stack a collection's files into one dataset |
| 30 | `iuc/datamash_ops/datamash_ops` | Grouped and whole-file aggregation |
| 22 | `iuc/collection_column_join/collection_column_join` | Align a collection's tables by identifier |
| 16 | `iuc/biom_convert/biom_convert` | BIOM/tabular conversion |
| 12 | `iuc/query_tabular/query_tabular` | SQL over loaded tables |
| 8 | `iuc/filter_tabular/filter_tabular` | Line filters and table projection |
| 4 | `iuc/table_compute/table_compute` | Matrix/vector computation |

The `collapse_dataset` count includes 40 steps at 5.1.0 and one at 4.2. Datamash pins are 1.1.0, 1.8+galaxy0, and 1.9+galaxy0. `query_tabular` has 11 steps at 3.3.2 and one at 3.3.0. `filter_tabular` has seven at 3.3.1 and one at 3.3.0. `table_compute` uses 1.2.4+galaxy1/2.

Representative states appear in the operation inventory below. `filter_tabular` is not the SQL tool: its projection and line filters can prepare a table without a SQL query.

### 1e. Adjacent operations

- `wc_gnu`: 35 steps, including the line-count-to-parameter example in §2n.
- Collection modules: `__APPLY_RULES__` 17, `__FLATTEN__` 10, `__RELABEL_FROM_FILE__` 22, `__FILTER_FROM_FILE__` 13, `__FILTER_EMPTY_DATASETS__` 44, `__EXTRACT_DATASET__` 44, and `__MERGE_COLLECTION__` 6. See [[galaxy-collection-patterns]] for their collection contracts.
- Parameter and metadata tools: `compose_text_param` 81, `pick_value` 67, `param_value_from_file` 97, `map_param_value` 56, and `collection_element_identifiers` 53. See [[iwc-parameter-derivation-survey]] for their boundaries.
- Reporting tools such as `multiqc` and `tooldistillator_summarize` can produce tables, but this inventory does not classify their report generation as a table transformation.

### 1f. Absence in this snapshot

No actual tool IDs in the snapshot identify csvtk, `datamash_transpose`, `datamash_reverse`, `tab_to_csv`, or `csv_to_tab`. This does not establish that these tools are unavailable or unsuitable. It limits the exemplars this survey can provide. Collection-column joins are not general transposes, and the taxonomy expansion in §2g is not a wide-to-long pivot.

## 2. Operation inventory

The sixteen categories describe operations seen or sought in the corpus. Tool totals are exact occurrence counts. Operation totals are not supplied because an awk or SQL step can perform several operations at once.

### 2a. Filter rows

- `Filter1` (27 steps) evaluates column expressions. Variation reporting uses `c4=='PASS' or c4=='.'` with one header line at `$IWC_FORMAT2/sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:545`.
- A runtime-generated predicate connects to `cond` in `$IWC_FORMAT2/epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:320-336`.
- `Grep1` (21) and `tp_grep_tool` (18) filter whole lines. They have different parameter contracts and header capabilities. See §7 for the consistency preference and its qualification.
- Awk patterns and SQL `WHERE` clauses can filter while performing other operations. A `SELECT` projection alone is not evidence of row filtering.

### 2b. Column projection / cut

`Cut1` (91 steps) selects columns in the supplied order. The variation-reporting example at line 782 places `c20` after `c26,c24,c25`, so selection also reorders columns. `query_tabular` can project and compute together. `filter_tabular` performs projection without SQL in `$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-taxonomic-summary-tables/mgnify-amplicon-summary-tables.gxwf.yml:203`.

The MAPseq-to-ampvis2 SQL step computes relative abundance alongside projection (`$IWC_FORMAT2/amplicon/amplicon-mgnify/mapseq-to-ampvis2/mapseq-to-ampvis2.gxwf.yml:57-64`):

```sql
SELECT c1, c2, c3, c3 * 100 / SUM(c3) OVER() AS relative_abundance FROM t1;
```

Its input-load filters skip `#`-prefixed lines before table import. This combines a computed column with a whole-table window aggregate, which gives SQL a specific role beyond a column cut.

### 2c. Computed column / per-row arithmetic

`Add_a_column1` (55 steps across versions) supports successive insert, replace, and append expressions. Variation reporting inserts `AFcaller` and replaces `AF` at lines 316–329. The same workflow appends `change` from `c5 + '>' + c6` and `change_with_pos` from `c3 + ':' + c19` at lines 462–472. The former step enables numeric typing, while the latter keeps strings. Awk also computes row values when a recipe needs branching or string splitting.

### 2d. Sort

`sort1` occurs 13 times and `tp_sort_header_tool` six times. Header-aware sorts precede joins at variation-reporting lines 923 and 950. A `sort1` example is `$IWC_FORMAT2/VGP-assembly-v2/Purge-duplicates-one-haplotype-VGP6b/Purging-duplicates-one-haplotype-VGP6b.gxwf.yml:559`. Match numeric/text comparison and header handling to the input instead of inferring them from the tool name.

### 2e. Group / aggregate

`datamash_ops` occurs 30 times and `Grouping1` 15 times.

- Variation reporting groups by columns 1–10 and collapses columns 11–17 at lines 333–373.
- Its step at lines 562–596 groups by column 3 and performs five operations: three `countunique` operations, `min`, and `max`.
- `Grouping1` uses `optype: length` at PathoGFAIR line 324 and `optype: cat` at line 1087.

Datamash's `grouping` is a comma-separated string and `operations` is a list of `{op_name, op_column}` entries. `header_in` and `header_out` are independent. `need_sort` controls sorting before grouped aggregation, so disabling it requires an upstream guarantee that equal keys are grouped. Whole-file reductions use empty grouping.

### 2f. Join on key

`tp_easyjoin_tool` occurs 12 times across five workflows. Four of those steps are in variation reporting, at lines 601, 722, 752, and 799. The first connects key column 20 to column 1 and sets `header: true`, `empty_string_filler: "0"`, and `jointype: " "`.

The literal space selects the matched-both-files mode, an inner join. It does not select an outer join. The wrapper exposes different options for unpaired rows. Preserve the literal enum value when copying this exemplar and choose the join mode deliberately. See the pinned wrapper in §8.

`tp_multijoin_tool` occurs once, in PathoGFAIR at line 796. It aligns many same-shaped key/value inputs. SQL joins are another option when named tables, compound conditions, or anti-joins are needed.

### 2g. Awk recipes

`tp_awk_tool` occurs 127 times. Four reusable recipes have operation-named pages, while other uses remain workflow-specific.

**Header injection and row cleanup**, from `$IWC_FORMAT2/microbiome/mags-building/MAGs-generation.gxwf.yml:1090-1096`:

```awk
BEGIN {OFS="\t"; print "genome\tcompleteness\tcontamination"}
NR > 1 {
    if ($1 !~ /\.fasta$/)
        $1 = $1 ".fasta"
    print $1, $2, $3
}
```

The `NR > 1` guard replaces an existing header instead of retaining it. VGP QC prepends fixed metric headers at `$IWC_FORMAT2/VGP-assembly-v2/Purge-duplicates-one-haplotype-VGP6b/Purging-duplicates-one-haplotype-VGP6b.gxwf.yml:855` and `:1631`.

**BED synthesis**, from `$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:222`:

```awk
'BEGIN {OFS="\t"} {print $1, $2 - 1, $3, "forward", "1", "+"}'
```

The reverse-strand version uses `"reverse", "1", "-"`. These steps also appear in the complete MGnify workflow's embedded subworkflow at lines 2101, 2124, 2147, and 2170. The subtraction assumes the input start needs conversion to zero-based BED coordinates.

**Taxonomy-string expansion**, from `$IWC_FORMAT2/amplicon/amplicon-mgnify/mapseq-to-ampvis2/mapseq-to-ampvis2.gxwf.yml:101-135`: `split($3, taxonomy, ";")` dispatches `sk__`, `k__`, `p__`, `c__`, `o__`, `f__`, `g__`, and `s__` tokens into eight rank columns. It expands one field into columns without creating extra rows. Related, non-identical programs occur in the taxonomic summary workflow at lines 241, 281, and 336.

**Row-counter labels**, from `$IWC_FORMAT2/microbiome/binning-evaluation/MAGs-binning-evaluation.gxwf.yml:433`:

```awk
'{gsub( $0 ,"sample_" (NR-1)); print}'
```

This is the observed regex-based whole-record replacement. A fresh counter recipe can assign `$0` directly so arbitrary input text is not interpreted as a regex. Row order is the identity source in either case.

The complete MGnify workflow also sanitizes FASTQ IDs at line 407 with `NR % 4 == 1 { gsub(/[ \/]/, "-", $0) } { print }`. That is adjacent text processing, not a tabular row recipe. Awk `code` values appear both as single-quoted command fragments and multiline programs. Check the wrapper's quoting contract before translating between them.

### 2h. String / regex replacement

`tp_find_and_replace` occurs 54 times, `tp_replace_in_line` 25 times, and `tp_replace_in_column` 15 times. Their overlap does not make their contracts interchangeable.

Variation reporting runs sequenced patterns at lines 389–407, including cleanup of collapsed values and `(GroupBy|collapse)\(([^)]+)\)` → `$2` header cleanup. The first pattern skips the header, while the second includes it. Its column-specific replacement at lines 281–289 selects column 16 and separately handles comments, skipped lines, and unknown values. Choose by the intended replacement scope.

### 2i. Concatenate / row-bind

`collapse_dataset` has 41 steps, `tp_cat` 16, and `cat1` six. `tp_cat` concatenates ordinary files at `$IWC_FORMAT2/sars-cov-2-variant-calling/sars-cov-2-pe-illumina-artic-ivar-analysis/pe-wgs-ivar-analysis.gxwf.yml:627`.

Variation reporting stacks a collection at line 414 with `filename: {add_name: true, place_name: same_multiple}` and `one_header: true`. The element name is repeated on data rows as provenance. In this headered mode the first header is prefixed with `Sample`. MAPseq-to-ampvis2 at line 178 instead disables both names and header handling. These settings follow input shape and downstream needs, not a universal boilerplate tuple.

### 2j. Deduplicate

`tp_sorted_uniq` occurs six times and `tp_uniq_tool` twice. The capheine workflow uses the former at line 773. VGP Hi-C uses the latter inside an embedded subworkflow at line 2476. Sorting plus uniqueness and adjacent-line uniqueness are different operations. Aggregating by a key with datamash is different again from removing identical whole lines.

### 2k. Remove initial lines / take first N

`Remove beginning1` occurs 19 times and `tp_head_tool` twice. PathoGFAIR removes initial lines at lines 186 and 200. Allele-based pathogen identification takes initial rows at lines 495 and 633. Removing a known header and limiting a file's row count need different choices.

### 2l. Collection-to-wide alignment / transpose

`collection_column_join` occurs 22 times across 12 workflows. It aligns identifiers from a collection's tables into a wider output. The two-column `(id, value)` input is the reusable wide-table idiom, but the wrapper can carry multiple non-key columns from each file. It is not a generic transpose or wide-to-long pivot.

MAPseq-to-ampvis2 at line 202 sets `identifier_column: "1"`, `fill_char: "0"`, `has_header: "0"`, and `old_col_in_header: true`. MAGs generation at lines 1483, 1544, and 1656 uses `fill_char: .`, `has_header: "1"`, and `old_col_in_header: false`. With `old_col_in_header: true`, output headers include the element name plus the original column header or column number. With false, they use the element name. Zero fill and original-header suffixes are not common to every exemplar.

No `datamash_transpose` step was found. The four `table_compute` steps do not establish a generic transpose pattern. Taxonomy expansion is a separate field-to-columns operation (§2g).

### 2m. Format conversion

`biom_convert` occurs 16 times across three workflows and converts between BIOM and tabular representations, adjacent to this survey's row/column scope. Awk and column cuts also assemble particular tabular layouts. No dedicated TSV↔CSV converter exemplar was found in this snapshot, so this survey does not derive a general converter pattern from it.

### 2n. Count / summarize

`wc_gnu` occurs 35 times. One use counts filtered rows for a typed downstream parameter: `$IWC_FORMAT2/epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:301-313` sets `include_header: false` and `options: [lines]`. The corpus also uses counts for reports and other intermediate results. A `wc_gnu` occurrence alone does not establish a count-to-parameter chain.

### 2o. Sample / random subset

No tabular random-subset exemplar was identified by this survey. Sequence-level sampling is outside the row/column scope. This leaves the category without a recipe here, rather than making tabular sampling an invalid choice.

### 2p. Side-by-side paste

`Paste1` occurs four times. Functional annotation at line 733 and allele-based pathogen identification at line 611 paste files side by side. This aligns rows by position, not by an identifier key. Upstream row order and row counts therefore need to match the intended pairing.

## 3. Tool choice by operation

| Operation | Corpus paths | Choice or qualification |
|---|---|---|
| Column predicate | `Filter1`, awk, SQL `WHERE` | `Filter1` for a short column expression, SQL when the query also needs SQL operations |
| Whole-line regex | `Grep1`, `tp_grep_tool`, awk | Prefer `tp_grep_tool` for family consistency, retain `Grep1` when its independent header handling fits |
| Select/reorder columns | `Cut1`, `filter_tabular`, `query_tabular` | `Cut1` for projection alone, SQL for projection combined with computation/query semantics |
| Compute column | `Add_a_column1`, awk, `query_tabular` | Match expression complexity and typing to the tool |
| Sort | `sort1`, `tp_sort_header_tool` | Verify comparison mode and header handling |
| Group/aggregate | `datamash_ops`, `Grouping1`, `query_tabular` | Datamash is the hierarchy's primary aggregate tool, SQL remains valid when the query fits |
| Join by key | `tp_easyjoin_tool`, `tp_multijoin_tool`, SQL | Choose the required match/unpaired-row behavior, uniform-file shape, or SQL predicate |
| Prepend header | Awk, generated text plus concatenation | Account for an existing header and datatype |
| Remove header | `Remove beginning1`, awk `NR > 1` | Remove only the known header lines |
| Stack rows | `tp_cat`, `cat1`, `collapse_dataset` | Collection bridge when inputs are a collection, ordinary concatenation otherwise |
| Deduplicate | `tp_sorted_uniq`, `tp_uniq_tool` | Distinguish whole-line, adjacent-line, and key-group semantics |
| Replace text | Column/line replace wrappers, sed, awk | Choose replacement scope and regex flavor explicitly |
| Collection to wide table | `collection_column_join` | Check keys, non-key columns, missing cells, and header naming |
| Transpose / wide-to-long | No general exemplar identified | No pattern derived from this snapshot |

## 4. Established pattern coverage

The operation hierarchy now exists under [[galaxy-tabular-patterns]]. The earlier candidate list is resolved into these pages:

- [[tabular-filter-by-column-value]], [[tabular-filter-by-regex]], and [[tabular-cut-and-reorder-columns]] cover single-table filtering and projection.
- [[tabular-compute-new-column]] covers expression nesting, append/insert/replace, strict failure handling, and typing. The correction in §7 applies to its mixed-expression guidance.
- [[tabular-group-and-aggregate-with-datamash]] covers key grouping, sorting requirements, headers, and aggregate sequences.
- [[tabular-join-on-key]] covers ordinary key joins and SQL alternatives. The literal-space easyjoin mode is inner, as described in §2f.
- [[tabular-sql-query]] is the SQL leaf for windows, joins, anti-joins, and combined query operations.
- [[tabular-pivot-collection-to-wide]] and [[tabular-concatenate-collection-to-table]] distinguish collection elements becoming columns from their rows being stacked.
- [[tabular-prepend-header]], [[tabular-synthesize-bed-from-3col]], [[tabular-split-taxonomy-string]], and [[tabular-relabel-by-row-counter]] split awk recipes by operation.
- [[tabular-to-collection-by-row]] covers the reverse bridge from table rows or keys into collection elements.

Sort, line deduplication, initial-line removal, and ordinary file concatenation remain supporting operations here. The current hierarchy has no general transpose, wide-to-long, or TSV↔CSV page derived from this survey. A suitable exemplar can justify adding one later. Sed is recorded as an option where its transformations fit, without a dedicated page in this hierarchy.

## 5. Recurring recipes and failure modes

1. **Header generation with awk.** `BEGIN {OFS="\t"; print "header\there\there"}` creates a fixed first row. The MAGs example also skips the old header and cleans filenames. VGP uses fixed `Metric\tPrimary` and `Metric\tAlternate` headers for separate haplotypes. Generating a header file and concatenating is another observed path, but the corpus-wide awk count does not measure how often this specific recipe is chosen.

2. **Datamash collapse followed by regex cleanup.** Variation reporting collapses seven columns at lines 333–373, then uses a seven-group regex at lines 375–407 to retain the first comma-delimited member of each collapsed cell. This is first-member extraction after aggregation, not intrinsically an argmax. Its meaning depends on upstream order. The regex group count and comma handling must match the data.

3. **Simple row predicates and richer transformations coexist.** Variation reporting uses `Filter1` for status rows, then other tools for aggregation, replacement, and joins. Tool choice follows the operation. A SQL workflow need not route every simple filter through SQL.

4. **Collection alignment depends on table shape.** The three MAG metric joins use headered inputs and dot fill. MAPseq abundance uses headerless inputs and zero fill. These are different missing-value and header contracts. Empty-file filtering is useful when upstream can produce empties, but not every join needs it.

5. **Collection stacking can preserve sample identity.** `add_name: true` with `place_name: same_multiple` records the element name on each row. `one_header: true` copies the first file's initial line, then removes the initial line from every file before stacking the remaining rows. It does not compare header text or validate matching headers. All inputs need headers for this mode. On headerless inputs it drops data rows. Turning names off is valid when downstream does not need row provenance.

6. **Version pins are part of the recipe.** The four awk pins account for 127 actual steps. A newer pin is not proof of interchangeable parameters or behavior. Preserve a working pin when reviewing an inherited workflow and verify the target wrapper before changing it. The constant-column `addValue` tool is separate from `Add_a_column1`, despite overlapping display names.

## 6. Scope boundaries

Coordinate-aware BED operations belong in [[galaxy-interval-patterns]], and sequence-record operations in [[galaxy-sequence-patterns]]. The BED-synthesis recipe remains here because it constructs columns and performs an explicit coordinate conversion. The FASTQ-ID sanitization example records an adjacent awk use without redefining FASTQ as a table.

Reporting tools are potential table sources. This survey does not establish a separate tabular-source pattern for them. Likewise, absence of a tool family in this pinned corpus is an evidence boundary, not a recommendation against the tool.

## 7. Decision record and corrected constraints

The original 2026-04-30 review settled the hierarchy's naming and scope. Those decisions remain:

- **Operation names.** Name pages after the operation, even when the implementation is tool-specific. The four awk recipes remain separate operation pages rather than one large awk manual.
- **Regex-filter preference.** Prefer `tp_grep_tool` for consistency with the text-processing family. `Grep1` remains a valid inherited tool and a fit for its independent header-preservation option. They are not duplicate parameter contracts: `Grep1` uses `pattern` and may expose `keep_header`, while `tp_grep_tool` uses `url_paste`, regex-flavor/context options, and no independent header toggle in the surveyed shapes.
- **SQL scope.** Keep [[tabular-sql-query]] in the tabular hierarchy for SQL-shaped operations. Windows, joins, anti-joins, and combined projection/computation justify it. Simpler wrappers remain easier to inspect for isolated operations.
- **Format-conversion scope.** Do not create a generic converter pattern without an exemplar. The absence finding stays here and is scoped to this snapshot.
- **Inherited tools.** Keep recognizable older IDs such as `Grouping1`, `cat1`, `addValue`, `Remove beginning1`, `Paste1`, and `sort1` in the evidence trail. A family-consistency preference does not establish that these tools are scientifically wrong.

### Strict failure handling and expression typing

All 51 `Add_a_column1` steps with structured `error_handling` set `fail_on_non_existent_columns: true`. Forty-nine use `--fail-on-non-computable`, and two use `--skip-non-computable` in consensus-from-variation's coordinate arithmetic. The same 51 steps split into 48 `auto_col_types: true` and three false. These are counts for the structured 2.0/2.1 states, not all 55 occurrences across versions.

The authoring rule keeps missing-column failure enabled and uses failure on non-computable values unless skipping rows is part of the intended behavior. Choose typing by the expressions in the step:

| Expression kind | Typing choice |
|---|---|
| Arithmetic on numeric bare `cN`, such as `(c18+c19)/c6` | `auto_col_types: true`, with appropriate input metadata |
| String concatenation, such as `c5 + '>' + c6` | `auto_col_types: false` |
| Explicit-cast arithmetic, such as `int(c2) - 1` | `auto_col_types: false`, with the expression supplying conversion |
| Expressions requiring different typing policies | Separate tool steps, or one consistent string policy with explicit numeric casts |

`auto_col_types` is a step-level setting under `tool_state.error_handling`. With true, the wrapper supplies Galaxy's input column-type metadata for conversion. It does not infer types from what an expression demands. With false, input column values are strings until the expression explicitly converts them. Splitting a mixed calculation into multiple `ops.expressions` entries does **not** give the entries separate settings. All expressions share the chosen input-column typing policy. Columns calculated by an earlier expression retain their result types for later expressions. The older mixed-expression decision is corrected on this point because the wrapper emits one `--column-types` policy for the step.

Keep `expressions` under `tool_state.ops`, next to `header_lines_select`. `error_handling` is a top-level sibling of `ops`. Expressions execute in order, so inserted or replaced columns change the positions referenced by later expressions. The canonical arithmetic, string-concatenation, and explicit-cast examples remain variation-reporting lines 307–329, lines 438–475, and consensus-from-variation lines 343–378 respectively.

## 8. Pinned sources

Native IWC sources for the main recipes, all at the surveyed commit:

- [SARS-CoV-2 variation reporting](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.ga): computation, grouping, regex cleanup, joins, and collection stacking.
- [Consensus from variation](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/sars-cov-2-variant-calling/sars-cov-2-consensus-from-variation/consensus-from-variation.ga): explicit numeric casts and skip-on-non-computable arithmetic.
- [MAPseq to ampvis2](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/amplicon/amplicon-mgnify/mapseq-to-ampvis2/mapseq-to-ampvis2.ga): SQL relative abundance, taxonomy expansion, collection stacking, and collection alignment.
- [MGnify rRNA prediction](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.ga): BED synthesis and computation before parameter extraction.
- [MAGs generation](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/microbiome/mags-building/MAGs-generation.ga): header cleanup and three headered metric joins with dot fill.
- [PathoGFAIR sample aggregation](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/microbiome/pathogen-identification/pathogen-detection-pathogfair-samples-aggregation-and-visualisation/Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation.ga): grouping, multi-file joins, column splitting, and collection stacking.

Wrapper sources are pinned separately from the IWC snapshot. They establish the contracts used for the corrections below, without implying that every version in the inventory is interchangeable.

- [Galaxy sort wrapper](https://github.com/galaxyproject/galaxy/blob/a63da1dfd1960360f4aa2fddc6a75396954d750a/tools/filters/sorter.xml): explicit `header_lines` handling for `sort1`.
- [Easyjoin wrapper](https://github.com/bgruening/galaxytools/blob/a8748ebc4c16adfee9f2ec18f7ab352aa238e305/tools/text_processing/text_processing/easyjoin.xml): literal-space matched-both mode and options for unpaired rows.
- [Column maker wrapper](https://github.com/galaxyproject/tools-iuc/blob/b9b16be49cbe9777b5d1cec3d22a279cfe3e74a7/tools/column_maker/column_maker.xml): shared typing policy, nested expressions, and error handling.
- [Collection stacking wrapper](https://github.com/phac-nml/galaxy_tools/blob/b9a9397b9aa3c5b3ff8325386c5920da964abdbd/tools/collapse_collection/merge.xml): first-line removal and row provenance at version 5.1.0.
- [Collection column join wrapper](https://github.com/galaxyproject/tools-iuc/blob/b9b16be49cbe9777b5d1cec3d22a279cfe3e74a7/tools/collection_column_join/collection_column_join.xml): non-key columns, full alignment, header suffixes, and missing-cell fill.

This refresh verifies source structure, counts, and selected wrapper contracts. It does not rerun these workflows or replace the behavior checks linked from individual pattern pages.
