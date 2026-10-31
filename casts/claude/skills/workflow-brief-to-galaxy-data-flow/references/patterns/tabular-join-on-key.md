---
type: pattern
pattern_kind: operation
evidence: corpus-observed
title: "Tabular: join on key"
tags:
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-09-28
revision: 3
summary: "Join tabular files by key with explicit matched-row, missing-value, header, and duplicate-key policies."
related_notes:
  - "[[iwc-tabular-operations-survey]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
related_patterns:
  - "[[tabular-group-and-aggregate-with-datamash]]"
  - "[[tabular-sql-query]]"
  - "[[tabular-pivot-collection-to-wide]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
iwc_exemplars:
  - workflow: sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting
    why: "Shows repeated tp_easyjoin_tool inner joins with headered inputs and a zero filler."
    confidence: high
  - workflow: VGP-assembly-v2/Scaffolding-HiC-VGP8/Scaffolding-HiC-VGP8
    why: "Shows a newer tp_easyjoin_tool pin joining key 1 to key 1 with dot fill."
    confidence: high
  - workflow: microbiome/metagenomic-genes-catalogue/metagenomic-genes-catalogue
    why: "Shows a headerless easyjoin labeled Join Prodigal to AMR."
    confidence: high
  - workflow: microbiome/pathogen-identification/pathogen-detection-pathogfair-samples-aggregation-and-visualisation/Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation
    why: "Shows tp_multijoin_tool for many same-shaped key/value files."
    confidence: high
  - workflow: proteomics/clinicalmp/clinicalmp-verification/clinicalmp-verification
    why: "Shows query_tabular used for a two-table SQL inner join."
    confidence: high
  - workflow: proteomics/clinicalmp/clinicalmp-discovery/iwc-clinicalmp-discovery-workflow
    why: "Shows SQL anti-join with load filters and indexes."
    confidence: high
---

# Tabular: join on key

A key join aligns rows from tabular datasets by matching identifier columns. `tp_easyjoin_tool` joins two files and exposes separate modes for matched and unmatched rows. `tp_multijoin_tool` aligns selected value columns from many files. [[tabular-sql-query]] covers named-table joins, compound predicates, projections, and SQL anti-joins.

Choose the output's rows before choosing a fill value. The easyjoin default, `jointype: " "`, is an **inner join**. It retains keys present in both inputs. Setting a filler to `"0"` does not make unmatched rows appear.

For a collection of per-element key/value tables becoming one wide table, see [[tabular-pivot-collection-to-wide]]. Side-by-side paste without a key, row concatenation, and grouping are different operations. [[tabular-group-and-aggregate-with-datamash]] covers aggregation before or after a join.

## Two-file joins with easyjoin

The tool ID is `toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_easyjoin_tool`, followed by a version pin. In the pinned IWC snapshot, it occurs 12 times across five workflows. All 12 steps select the literal-space inner mode. These observations describe the exemplars, not the full wrapper interface.

| Parameter | Meaning and default |
|---|---|
| `infile1`, `infile2` | Required connected tabular inputs |
| `column1`, `column2` | One-based key columns in the corresponding inputs. The examples serialize them as strings such as `"1"` and `"20"` |
| `jointype` | Output-row selection. Defaults to the literal single space `" "`, meaning matched rows only |
| `header` | Whether the first line of each input is a header. Defaults to `false` |
| `ignore_case` | Match keys without case distinctions. Defaults to `false` |
| `empty_string_filler` | Replacement for missing output fields. Defaults to `"0"`. The exemplars also use `"."` |

The [`9.3+galaxy1` wrapper](https://github.com/bgruening/galaxytools/blob/288f8bef36ccf645454d44bb45a677d46d424c13/tools/text_processing/text_processing/easyjoin.xml) exposes these exact `jointype` values:

| Value | Rows emitted |
|---|---|
| `" "` | Matches between both files, an inner join |
| `"-v 1"` | Unmatched rows from the first file only |
| `"-v 2"` | Unmatched rows from the second file only |
| `"-a 1"` | Matches plus unmatched rows from the first file, a left outer join |
| `"-a 2"` | Matches plus unmatched rows from the second file, a right outer join |
| `"-a 1 -a 2"` | Matches and unmatched rows from both files, a full outer join |
| `"-v 1 -v 2"` | Unmatched rows from both files, excluding matches |

Do not replace the literal space with an empty string or an invented `--outer` value. The selected mode determines whether unmatched rows are emitted. The filler determines their missing cells when they are emitted. The [easyjoin implementation](https://github.com/bgruening/galaxytools/blob/288f8bef36ccf645454d44bb45a677d46d424c13/tools/text_processing/text_processing/easyjoin) delegates output formatting to GNU `join`. The output places the key first, followed by non-key fields from the first and second files. The wrapper uses automatic field layout rather than a user-selected projection.

### Headered inner join

The SARS-CoV-2 variation reporting workflow joins column 20 of its first table to column 1 of its second table. It has four easyjoin steps, each using the inner mode.

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_easyjoin_tool/9.3+galaxy1
tool_state:
  column1: "20"
  column2: "1"
  empty_string_filler: "0"
  header: true
  ignore_case: false
  infile1: { __class__: ConnectedValue }
  infile2: { __class__: ConnectedValue }
  jointype: " "
```

The VGP Hi-C scaffolding exemplar uses `9.5+galaxy3`, key column 1 in both inputs, headers, and dot fill. The metagenomic genes catalogue's **Join Prodigal to AMR** step uses `9.5+galaxy2`, column 1 in both inputs, and `header: false`. Choose header handling from the actual tables, not from their workflow domain.

## Many-file joins with multijoin

`toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_multijoin_tool` carries selected value columns from a first file and the remaining files into a common key-aligned output. The pinned corpus has one occurrence, in PathoGFAIR sample aggregation.

- `first_file` supplies the first tabular input and `files` supplies the remaining inputs.
- `key_column` is an integer identifying the one-based shared key column. Its default is 1.
- `value_columns` selects the one-based value columns to carry from each file. Multiple columns serialize as a comma-separated value such as `"2,3"`.
- `filler` supplies missing cells and defaults to `"0"`.
- `input_header` and `output_header` independently control input and output headers. Both default to `false`.
- `ignore_dups` defaults to `false`, causing repeated keys within one file to fail. With `true`, the last row for that key replaces earlier rows from that file. It does not aggregate duplicates.

The [pinned multijoin implementation](https://github.com/bgruening/galaxytools/blob/288f8bef36ccf645454d44bb45a677d46d424c13/tools/text_processing/text_processing/multijoin) retains the union of keys from all inputs and sorts them lexicographically. The output has a key column, then the selected value columns for each input in file order. Absent file/key combinations receive the filler. This differs from easyjoin's default inner mode.

When `output_header: true`, the key column is named `key`. Each value column gets a sanitized input-file label plus its input header name, or `V` plus its column number when `input_header: false`. Do not assume those labels are stable biological sample names. A row with too few key or selected value columns causes an error.

The PathoGFAIR step joins two-column, headerless key/value files and requests an output header:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_multijoin_tool/9.3+galaxy1
tool_state:
  first_file: { __class__: ConnectedValue }
  files: { __class__: ConnectedValue }
  key_column: "1"
  value_columns: "2"
  filler: "0"
  input_header: false
  output_header: true
  ignore_dups: false
```

Use this shape when the same selected key and value positions have the same meaning in every file. Heterogeneous layouts need preprocessing or an explicit SQL query.

## SQL joins

The clinical metaproteomics verification exemplar names its inputs `pep` and `prot`, then projects a peptide/protein inner join:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/iuc/query_tabular/query_tabular/3.3.2
tool_state:
  query_result:
    header: "yes"
    header_prefix: ""
  sqlquery: |-
    SELECT pep.mpep, prot.prot
    FROM pep
    INNER JOIN prot ON pep.mpep=prot.pep
  tables:
    - table: { __class__: ConnectedValue }
      tbl_opts:
        table_name: pep
        col_names: mpep
    - table: { __class__: ConnectedValue }
      tbl_opts:
        table_name: prot
        col_names: pep,prot
```

Quote `"yes"` because this is a select value, not a YAML boolean. The discovery exemplar uses a `NOT IN` query to exclude peptide-spectrum-match rows associated with proteins in a reference table. Its load filters skip headers, prepend line numbers, and normalize protein lists before the query. Its indexes support those lookups. See [[tabular-sql-query]] for the broader table-loading and query contract.

All three snippets are partial step excerpts. They show tool pins and relevant state, but omit upstream `in` connections and workflow outputs. Supply those connections when constructing a workflow.

## Correctness checks and pitfalls

- **Check key multiplicity.** A matching key is not necessarily unique. The underlying [GNU `join` contract](https://www.gnu.org/software/coreutils/manual/html_node/join-invocation.html) emits every matching pair for repeated keys, so two rows on each side can become four output rows. Aggregate or deduplicate only if that matches the scientific result.
- **Do not depend on input row order.** Easyjoin sorts its inputs by key internally. With headers enabled, it keeps the first line separate from that sort. Multijoin sorts its output keys lexicographically. Add a downstream sort if the result requires a particular order.
- **Match header handling to both inputs.** Treating a data row as a header removes it from ordinary key matching. Treating a header as data can emit a spurious row or lose the intended output header.
- **Choose missing-value semantics.** `"0"` is appropriate only when a missing measurement means zero. `"."` is a missing-value marker only if downstream tools recognize it. Neither setting changes which keys the join retains.
- **Check key representation.** Case-sensitive matching is the default. Differences in case, whitespace, identifier prefixes, or formatting can create unexpected unmatched rows. Normalize only when the identifiers remain equivalent.
- **Use the correct parameter vocabulary.** Easyjoin uses one-based column selectors, not expression names such as `c1`. Multijoin uses a shared `key_column` and `value_columns`. SQL uses table and column names.
- **Check more than output size.** For stable fixtures, assert representative matched rows, required unmatched rows for the chosen mode, fill values, header content, and duplicate-key cardinality. A nonempty table alone can hide an incorrect join mode.

## Existing workflows and alternatives

Older core join tools can be valid when their row-selection, key, and output behavior fits the workflow. Inspect those contracts before replacing an inherited step. This corpus supports easyjoin as the common two-file exemplar and multijoin as the many-file exemplar. It does not establish that another implementation is wrong.

Easyjoin itself supports one-sided unmatched-row modes, so an anti-join does not automatically require SQL. Choose [[tabular-sql-query]] when richer predicates, named-column projection, or a combined query make the intended operation clearer.

## Evidence and related patterns

The corpus observations above use IWC commit `deafc4876f2c778aaf075e48bd8e95f3604ccc92`:

- [SARS-CoV-2 variation reporting](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.ga) demonstrates the headered column-20-to-column-1 excerpt.
- [VGP Hi-C scaffolding](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/VGP-assembly-v2/Scaffolding-HiC-VGP8/Scaffolding-HiC-VGP8.ga) uses dot fill.
- [Metagenomic genes catalogue](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/microbiome/metagenomic-genes-catalogue/metagenomic-genes-catalogue.ga) supplies the headerless join.
- [PathoGFAIR sample aggregation](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/microbiome/pathogen-identification/pathogen-detection-pathogfair-samples-aggregation-and-visualisation/Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation.ga) supplies the multijoin excerpt.
- [Clinical metaproteomics verification](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/proteomics/clinicalmp/clinicalmp-verification/clinicalmp-verification.ga) supplies the SQL inner join.
- [Clinical metaproteomics discovery](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/proteomics/clinicalmp/clinicalmp-discovery/iwc-clinicalmp-discovery-workflow.ga) supplies the SQL exclusion query.

Direct checks of the pinned multijoin script confirmed its full key union, lexicographic ordering, header generation, fill values, default duplicate-key failure, last-row retention with `ignore_dups`, and short-row failure. These checks ran the Perl script with local fixtures. They did not execute easyjoin or run Galaxy workflows. The wrapper contracts and inspected IWC states provide the other evidence described above.

See [[iwc-tabular-operations-survey]] for counts and broader operation coverage, [[tabular-group-and-aggregate-with-datamash]] for grouped summaries, and [[tabular-pivot-collection-to-wide]] for collection-shaped wide tables.
