---
type: pattern
pattern_kind: operation
evidence: corpus-and-verified
title: "Tabular: pivot collection to wide"
aliases:
  - "collection-to-wide-table-with-collection_column_join"
tags:
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-09-30
revision: 3
summary: "Join a collection of keyed tabular datasets into a wide table, choosing missing-cell fill and output headers to fit the data."
related_notes:
  - "[[iwc-tabular-operations-survey]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
related_patterns:
  - "[[tabular-join-on-key]]"
  - "[[tabular-concatenate-collection-to-table]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
verification_paths:
  - verification/workflows/tabular-pivot-collection-to-wide/pivot-collection.gxwf-test.yml
iwc_exemplars:
  - workflow: amplicon/amplicon-mgnify/mapseq-to-ampvis2/mapseq-to-ampvis2
    why: "Pivots a headerless id/value collection to a wide table with zero fill and element identity in headers."
    confidence: high
  - workflow: microbiome/mags-building/MAGs-generation
    why: "Shows repeated metric pivots over headered inputs with missing values represented as dots."
    confidence: high
  - workflow: microbiome/mag-genome-annotation-parallel/MAG-Genome-Annotation-Parallel
    why: "Merges Bakta output through collection_column_join with headered input and element identity in headers."
    confidence: high
  - workflow: microbiome/pathogen-identification/pathogen-detection-pathogfair-samples-aggregation-and-visualisation/Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation
    why: "Shows defensive empty-dataset filtering upstream of collection_column_join."
    confidence: high
---

# Tabular: pivot collection to wide

Connect a collection of keyed tabular datasets to `collection_column_join` when each element should contribute columns to one table. For two-column `(identifier, value)` elements, the result has one key column and one value column per element. The tool aligns keys across elements and fills cells where an element has no row for a key. Make the key unique within each input if the result must have one row per identifier.

## Build a wide table

The checked-in example under `verification/workflows/tabular-pivot-collection-to-wide/` has `alpha` and `beta` as elements of one dataset collection. Their tabular datasets have no header:

```text
alpha         beta
K1    2        K2    5
K3    4        K3    7
```

Connect the collection to `input_tabular` and use this `collection_column_join` state:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/iuc/collection_column_join/collection_column_join/0.0.3
tool_state:
  input_tabular: { __class__: ConnectedValue }
  identifier_column: "1"
  has_header: "0"
  old_col_in_header: true
  fill_char: "0"
  include_outputs: null
```

The expected `tabular_output`, shown with spacing for readability, is:

```text
#KEY  alpha_2  beta_2
K1    2        0
K2    0        5
K3    4        7
```

Here `0` means an absent key contributes a zero count. If an absent key means *unknown* rather than zero, choose a missing-value marker such as `.` instead. The file is tab-separated, and the Galaxy test compares its full contents with the committed expected file. The generated header uses `#KEY` for headerless inputs. With `old_col_in_header: true`, each value header combines the collection element identifier and the original column number, such as `alpha_2`. The [MAPseq-to-ampvis2 workflow](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/amplicon/amplicon-mgnify/mapseq-to-ampvis2/mapseq-to-ampvis2.ga) uses this headerless, zero-filled configuration.

## Match the input and output contract

The [Column join wrapper](https://github.com/galaxyproject/tools-iuc/blob/b9b16be49cbe9777b5d1cec3d22a279cfe3e74a7/tools/collection_column_join/collection_column_join.xml) accepts multiple tabular inputs, including a dataset collection, and emits one `tabular_output`. Set its options from the actual files:

| Setting | Effect |
|---|---|
| `identifier_column` | One-based key column used in every element. For `(id, value)` inputs, use `"1"`. |
| `has_header` | Number of header lines in each input, serialized as a string in these workflow states. Use `"0"` for the example above or `"1"` for a single header row. This is a count, not a true/false toggle. |
| `old_col_in_header` | With `true`, combine each element identifier with the source non-key column header or number. With `false`, use the element identifier alone. Both settings retain element identity in output headers. |
| `fill_char` | Text placed in cells when an element lacks a key. Choose it for the scientific meaning of absence. |
| `include_outputs` | Leave unset or `null` unless a generated shell script is useful for inspection. |

The two-column input is the simplest case. The wrapper also carries **all** non-key columns from each element into the output. For headered `key`/`score` inputs, use `has_header: "1"` and inspect the resulting column names. With `old_col_in_header: false` and elements `alpha` and `beta`, the output header is `key`, `alpha`, `beta`. The [MAGs generation workflow](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/microbiome/mags-building/MAGs-generation.ga) repeatedly joins headered per-bin metric tables with `fill_char: "."` and `old_col_in_header: false`. Its output headers use element identifiers without the original column names.

## Check the result before using it

- **Check keys, values, and missing cells.** Confirm that a key present in both elements aligns on one row and that a key present in only one element receives the chosen fill in the other column. A row-count or output-exists check alone will miss swapped values or scientifically wrong fills.
- **Check key uniqueness and consistency.** Each input should use the same key meaning and formatting. Duplicate keys within an element do not represent a single value per key and can multiply rows during a join. Normalize keys or aggregate duplicates upstream when needed.
- **Check headers and column positions.** The tool creates an output header even for headerless inputs. Setting `has_header: "1"` on headerless data removes a real data row. Setting `"0"` on headered data treats the header as a key. With multiple non-key columns per element, `old_col_in_header: false` repeats that element's name across its output columns, so use `true` when distinct labels matter downstream.
- **Handle empty elements by need.** When an upstream filter can produce empty per-element tables, verify what the join emits for that case and remove the empty elements first if the output must contain only populated sample columns. The [PathoGFAIR aggregation workflow](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/microbiome/pathogen-identification/pathogen-detection-pathogfair-samples-aggregation-and-visualisation/Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation.ga) filters empty datasets upstream. Other IWC joins do not, so that guard depends on the input and desired output.

For two ordinary tables, [[tabular-join-on-key]] covers a direct key join. To stack collection rows into one long table, use [[tabular-concatenate-collection-to-table]]. The broader IWC evidence is in [[iwc-tabular-operations-survey]].
