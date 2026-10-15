---
type: pattern
pattern_kind: operation
evidence: corpus-and-verified
title: "Tabular: concatenate collection to table"
aliases:
  - "collection-to-single-tabular-with-collapse_dataset"
  - "collapse_dataset collection to tabular"
  - "collection-to-tabular bridge"
tags:
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-09-30
revision: 3
summary: "Stack compatible tabular collection elements into one dataset, with one header and a sample column when needed."
related_notes:
  - "[[iwc-tabular-operations-survey]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
related_patterns:
  - "[[tabular-pivot-collection-to-wide]]"
  - "[[tabular-cut-and-reorder-columns]]"
  - "[[tabular-group-and-aggregate-with-datamash]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
verification_paths:
  - verification/workflows/tabular-concatenate-collection-to-table/concatenate-collection.gxwf-test.yml
iwc_exemplars:
  - workflow: sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting
    why: "Stacks per-element tables, keeps one header, and repeats each element identifier in a Sample column."
    confidence: high
  - workflow: amplicon/amplicon-mgnify/mapseq-to-ampvis2/mapseq-to-ampvis2
    why: "Stacks a collection without adding element names or removing first lines."
    confidence: high
  - workflow: virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping
    why: "Uses both per-row element names and block labels in separate collection concatenations."
    confidence: high
  - workflow: microbiome/pathogen-identification/pathogen-detection-pathogfair-samples-aggregation-and-visualisation/Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation
    why: "Stacks tabular results with one header and no added name, alongside other collection concatenations."
    confidence: high
---

# Tabular: concatenate collection to table

Connect a list collection of compatible tabular datasets to `collapse_dataset` when a downstream step needs one table containing their rows. Decide whether the output needs a column identifying the source element and whether each input has a header. The tool appends elements in collection order. It does not join rows by a key or put each element in a separate column. For the latter shape, use [[tabular-pivot-collection-to-wide]].

## Build a table with sample names

The checked-in example under `verification/workflows/tabular-concatenate-collection-to-table/` has two collection elements named `alpha` and `beta`, each with the same two-column header:

~~~text
alpha:             beta:
feature  count     feature  count
x        2         x        5
y        3
~~~

Connect the collection to `input_list` and use these step settings. The collection connection belongs in the workflow's `in:` entry for `input_list`.

~~~yaml
tool_id: toolshed.g2.bx.psu.edu/repos/nml/collapse_collections/collapse_dataset/5.1.0
tool_state:
  input_list: { __class__: ConnectedValue }
  filename:
    add_name: true
    place_name: same_multiple
  one_header: true
~~~

The output is one table:

~~~text
Sample  feature  count
alpha   x        2
alpha   y        3
beta    x        5
~~~

Spaces in these displays align columns. The actual separator is a tab, and the workflow test compares the full output with the committed expected file. `same_multiple` prefixes every data row with its collection element identifier. With `one_header: true`, the tool copies the first element's first line once, prefixes it with `Sample` when names are enabled, and skips the first line of **every** element before writing data rows. The [variation-reporting workflow](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.ga) uses this combination before further table processing.

## Choose header and name handling

| Input and desired output | Settings | Effect |
|---|---|---|
| Headered tables, one output header, row provenance | `one_header: true`, `add_name: true`, `place_name: same_multiple` | One `Sample` column plus one copy of the first header |
| Headered tables with identity already in their rows | `one_header: true`, `add_name: false` | One copy of the first header, no extra column |
| Headerless tables, no new provenance column | `one_header: false`, `add_name: false` | All lines copied in collection order |
| Headerless tables, row provenance | `one_header: false`, `add_name: true`, `place_name: same_multiple` | Element identifier prefixed to every line, with no generated header |

The verification workflow also checks the third shape with headerless `alpha` and `beta` elements, producing exactly `a\t1` and `b\t2` as two rows. The [MAPseq-to-ampvis2 workflow](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/amplicon/amplicon-mgnify/mapseq-to-ampvis2/mapseq-to-ampvis2.ga) uses the third shape. The [influenza consensus and subtyping workflow](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping.ga) uses the fourth shape in some branches and `same_once` in another. The [PathoGFAIR workflow](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/microbiome/pathogen-identification/pathogen-detection-pathogfair-samples-aggregation-and-visualisation/Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation.ga) also keeps one header without adding element names for one of its tabular outputs.

`same_once` writes the element identifier before only the first retained line of each element. `above` writes it on a separate line. Those modes mark blocks, so their output is not the rectangular table shown above. Choose them only when the next tool expects that layout. The [pinned wrapper](https://github.com/phac-nml/galaxy_tools/blob/b9a9397b9aa3c5b3ff8325386c5920da964abdbd/tools/collapse_collection/merge.xml) defines all three modes.

## Check the result before using it

- Confirm every input has the same columns in the same order. `one_header` discards later headers without comparing them, so mismatched columns can pass through under the first element's labels.
- Enable `one_header` only when every element has a header. With headerless inputs it removes a real first data row from each element. With `one_header: false`, any existing input headers remain among the output rows.
- If downstream grouping or filtering needs the source sample, check that each output row has the expected element identifier. `add_name: false` is appropriate when that identity is already in the data or unnecessary.
- Check the output column count and a row from each element. A name column shifts subsequent one-based column positions, and block-label modes do not produce the same table shape.

For two ordinary file inputs rather than a collection, `tp_cat` or `cat1` may fit the workflow. For grouping rows already in one table, use [[tabular-group-and-aggregate-with-datamash]]. See [[iwc-tabular-operations-survey]] for the wider tool inventory and [[tabular-cut-and-reorder-columns]] for downstream column selection.
