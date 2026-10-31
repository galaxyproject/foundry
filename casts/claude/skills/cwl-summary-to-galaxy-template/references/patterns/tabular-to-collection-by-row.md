---
type: pattern
pattern_kind: operation
evidence: corpus-and-verified
title: "Tabular: split into collection by key"
aliases:
  - "tabular to collection by row"
  - "collection from tabular rows"
  - "split_file_to_collection by column"
  - "row fan-out collection"
tags:
  - target/galaxy
  - topic/galaxy-transform
  - topic/collection-transform
  - topic/tabular-transform
status: draft
created: 2026-05-02
revised: 2026-10-07
revision: 4
summary: "Split a tabular file into a list collection by column value, grouping rows that share an identifier."
related_notes:
  - "[[iwc-transformations-survey]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
related_patterns:
  - "[[tabular-concatenate-collection-to-table]]"
  - "[[sync-collections-by-identifier]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
verification_paths:
  - verification/workflows/tabular-to-collection-by-row/split-by-key.gxwf-test.yml
iwc_exemplars:
  - workflow: data-fetching/sra-manifest-to-concatenated-fastqs/sra-manifest-to-concatenated-fastqs
    why: "Splits one-column SRA accessions so fasterq_dump can run once per accession."
    confidence: high
  - workflow: sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting
    why: "Splits a combined variation-reporting table into collection elements using its first column."
    confidence: high
---

# Tabular: split into collection by key

Use `split_file_to_collection` in **tabular → by column** mode when a table must become a list collection for a mapped Galaxy tool. The selected column supplies the element identifiers. Rows with the same resulting identifier go into the **same** dataset, so a one-row-per-element result requires unique identifiers after any regex replacement.

The [SRA manifest workflow](https://github.com/galaxyproject/iwc/blob/b80bc92780089b54773f558c224a27b38baa8a06/workflows/data-fetching/sra-manifest-to-concatenated-fastqs/sra-manifest-to-concatenated-fastqs.ga) cuts its input to an accession column, splits it into a collection, then connects that collection to `fasterq_dump` for map-over. The [variation-reporting workflow](https://github.com/galaxyproject/iwc/blob/b80bc92780089b54773f558c224a27b38baa8a06/workflows/sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.ga) uses the same tabular column mode on a combined results table. Both pin `split_file_to_collection/0.5.2`.

## Choose the grouping key and header

For a table with one header line, the following input produces two collection elements:

```text
sample  value
alpha   2
beta    5
alpha   3
```

The display uses spaces for alignment. The input file is tab-separated. With `id_col: "1"`, `top: "1"`, and the unchanged identifier regex, element `alpha` contains the header and both `alpha` rows. Element `beta` contains the header and its one row. The [verification workflow](../../verification/workflows/tabular-to-collection-by-row/split-by-key.gxwf.yml) checks the element IDs and complete files. Its Galaxy/Planemo test passed on `release_25.1`. The behavior was also checked by running the [upstream splitter script](https://github.com/bgruening/galaxytools/blob/a8748ebc4c16adfee9f2ec18f7ab352aa238e305/tools/text_processing/split_file_to_collection/split_file_to_collection.py) on the example.

This is the relevant Galaxy-exported tool state from the SRA workflow, with unrelated fields omitted. The input connection targets `split_parms|input`, and the tabular collection output is `list_output_tab`.

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/bgruening/split_file_to_collection/split_file_to_collection/0.5.2
tool_state:
  split_parms:
    select_ftype: tabular
    input: { __class__: ConnectedValue }
    top: "1"
    split_by:
      select_split_by: col
      id_col: "1"
      match_regex: (.*)
      sub_regex: \1
```

`id_col` is one-based. `top` copies that many leading lines into every element and excludes them from grouping. Set it to `0` for a headerless table. `match_regex` and `sub_regex` transform the selected column value into the element identifier. The [wrapper's column-splitting test](https://github.com/bgruening/galaxytools/blob/a8748ebc4c16adfee9f2ec18f7ab352aa238e305/tools/text_processing/split_file_to_collection/split_file_to_collection.xml) exercises both header copying and identifier replacement. The cited wrapper checkout declares version 0.5.3, while the IWC workflows above pin 0.5.2.

## Check the collection before map-over

- Confirm the chosen column identifies the intended work unit. Repeated values combine rows into one element. If the next tool expects one accession or sample per invocation, check that each key is unique after regex replacement.
- Inspect the resulting identifiers. Replacing different values with the same name combines their rows, which can silently change the mapped job count.
- Check whether the downstream tool expects a header in every element. The splitter copies `top` lines without interpreting them, and `top: "0"` leaves no copied header.
- Check a representative element's contents, not only the number of elements. The split preserves whole input rows, including the identifier column.

For a table already represented as a collection, continue with collection operations. To combine compatible collection elements into one table, use [[tabular-concatenate-collection-to-table]]. For the prepare → map → reshape sequence, see [[manifest-to-mapped-collection-lifecycle]].
