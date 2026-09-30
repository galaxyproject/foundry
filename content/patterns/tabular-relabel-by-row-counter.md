---
type: pattern
pattern_kind: operation
evidence: corpus-and-verified
title: "Tabular: relabel by row counter"
aliases:
  - "sample_N relabel"
  - "inline relabel"
tags:
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-09-30
revision: 3
summary: "Use tp_awk_tool and awk NR to replace each input line with a row-order label, with explicit header and numbering choices."
related_notes:
  - "[[iwc-tabular-operations-survey]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
related_patterns:
  - "[[tabular-prepend-header]]"
  - "[[tabular-compute-new-column]]"
  - "[[tabular-concatenate-collection-to-table]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
verification_paths:
  - verification/workflows/tabular-relabel-by-row-counter/relabel-by-row-counter.gxwf-test.yml
iwc_exemplars:
  - workflow: microbiome/binning-evaluation/MAGs-binning-evaluation
    why: "Uses tp_awk_tool with gsub and NR-1 to derive zero-based sample_N labels from row order."
    confidence: high
---

# Tabular: relabel by row counter

Replace each input line with `sample_0`, `sample_1`, and so on when downstream needs labels determined solely by row order. `tp_awk_tool` runs an awk program over the connected dataset. Awk's `NR` counts input records starting at one, so subtract one for a zero-based first label. This operation produces a one-column dataset and discards the original row contents.

Use [[tabular-compute-new-column]] if original columns must survive. If labels must reflect collection element identifiers, use collection-aware provenance such as [[tabular-concatenate-collection-to-table]]. Sorting, filtering, or inserting lines upstream changes these row-order labels.

## Whole-row recipe

Connect the input dataset to `infile` and publish the tool's `outfile`. Set `code` to an awk program and leave `variables: []` when no extra awk variables are needed. The IWC exemplar pins `toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_awk_tool/9.5+galaxy3`.

For a headerless input, the direct zero-based program is:

```yaml
tool_state:
  code: '{print "sample_" (NR-1)}'
  infile: { __class__: ConnectedValue }
  variables: []
```

With three input lines it writes `sample_0`, `sample_1`, and `sample_2`, one per line. Use `NR` without subtraction for `sample_1` as the first label. Blank lines also count as records and receive labels. Remove them upstream if they should not count.

The MAGs binning evaluation IWC workflow uses this observed program:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_awk_tool/9.5+galaxy3
tool_state:
  code: '{gsub( $0 ,"sample_" (NR-1)); print}'
  infile: { __class__: ConnectedValue }
  variables: []
```

That program calls `gsub` with the current row as a regular expression, then prints the resulting row. It is evidence of the row-counter idiom, but it is not a general whole-row replacement: regex characters in the input can change what matches, and a row may fail to match itself as a pattern. Use direct `print` for new whole-row steps.

## Headered input

For a one-column input, preserve the first line as a header and give the first data row `sample_0`:

```yaml
tool_state:
  code: 'NR==1 {print; next} {print "sample_" (NR-2)}'
  infile: { __class__: ConnectedValue }
  variables: []
```

For a headered file, `NR==2` is the first data row. Using `NR-1` in this branch would start it at `sample_1`. On a multi-column input, preserving the original header would put several header fields above one-column labels. Replace the header with a single field, such as `NR==1 {print "sample"; next}`, if the output must be a consistent one-column table. If the original columns must remain, use [[tabular-compute-new-column]].

## Verification

The local workflow fixture in `verification_paths` compares zero-based, one-based, and header-preserving output against explicit expected files. It checks the direct-print programs, not the IWC `gsub` program. The IWC example and tool pin are recorded in [[iwc-tabular-operations-survey]] §2g. A successful workflow run should match the expected labels and row count, including the handling of its input header.

## See also

- [[iwc-tabular-operations-survey]] — §2g and §7 awk split decision.
- [[tabular-prepend-header]] — header-preserving variants.
- [[tabular-compute-new-column]] — preserve rows while adding/replacing columns.
- [[tabular-concatenate-collection-to-table]] — preserve collection element identity instead of synthesizing row labels.
