---
type: pattern
pattern_kind: operation
evidence: corpus-and-verified
title: "Tabular: prepend header"
tags:
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-09-30
revision: 3
summary: "Add a fixed first line with tp_awk_tool, choosing whether to keep or replace the input's first row and whether to rewrite its fields."
related_notes:
  - "[[iwc-tabular-operations-survey]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
related_patterns:
  - "[[tabular-compute-new-column]]"
  - "[[tabular-concatenate-collection-to-table]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
verification_paths:
  - verification/workflows/tabular-prepend-header/prepend-header.gxwf-test.yml
iwc_exemplars:
  - workflow: microbiome/mags-building/MAGs-generation
    why: "Uses multiline awk to prepend genome/completeness/contamination, skip the old first row, and normalize genome suffixes."
    confidence: high
  - workflow: VGP-assembly-v2/Purge-duplicates-one-haplotype-VGP6b/Purging-duplicates-one-haplotype-VGP6b
    why: "Shows one-line awk header injection for alternate and primary metrics."
    confidence: high
  - workflow: VGP-assembly-v2/Scaffolding-HiC-VGP8/Scaffolding-HiC-VGP8
    why: "Shows one-line awk header injection for contig metrics and notes."
    confidence: high
---

# Tabular: prepend header

Connect a text or tabular dataset to `tp_awk_tool` when a downstream step needs a fixed first line. An awk `BEGIN` action prints that line before any input row. Choose the row action according to the input: print every row when it has no header, or use `NR > 1` when the new line replaces an existing first-row header. The tool's `infile` input receives the dataset, `code` holds the awk program, and the cited workflows leave `variables` empty.

## Add a header to headerless rows

The [VGP purge-duplicates workflow](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/VGP-assembly-v2/Purge-duplicates-one-haplotype-VGP6b/Purging-duplicates-one-haplotype-VGP6b.ga) uses a one-line program to label metric rows. A gxformat2 step's relevant state is:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_awk_tool/9.5+galaxy3
tool_state:
  code: 'BEGIN {print "Metric\tAlternate"} {print}'
  infile: { __class__: ConnectedValue }
  variables: []
```

With input `N50<TAB>4200`, the output is `Metric<TAB>Alternate` followed by the unchanged input row. In awk, `\t` in the double-quoted string becomes a tab. `{print}` prints the original line without rebuilding its fields, so its existing separators remain intact. Connect the step's `infile` port to the upstream dataset and declare the awk output in the complete workflow.

## Replace a header and normalize rows

The [MAGs generation workflow](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/microbiome/mags-building/MAGs-generation.ga) replaces the incoming header and adds `.fasta` to genome names that lack that suffix:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_awk_tool/9.5+galaxy2
tool_state:
  code: |-
    BEGIN {OFS="\t"; print "genome\tcompleteness\tcontamination"}
    NR > 1 {
        if ($1 !~ /\.fasta$/)
            $1 = $1 ".fasta"
        print $1, $2, $3
    }
  infile: { __class__: ConnectedValue }
  variables: []
```

For an input headed `bin<TAB>complete<TAB>contam` with a data row `bin_1<TAB>95<TAB>2`, the output is `genome<TAB>completeness<TAB>contamination` and `bin_1.fasta<TAB>95<TAB>2`. `NR > 1` suppresses the old first line. `OFS="\t"` makes the rebuilt data rows tab-separated when `print` receives three fields. The [awk wrapper](https://github.com/bgruening/galaxytools/blob/da30fe3911619a10dc5f6b8840214e0011e1833d/tools/text_processing/text_processing/awk.xml) passes `FS` and `OFS` as tabs. Check that the input is tab-separated, especially if a field contains spaces or an empty column.

## Check the input and result

- If the input is already headed, plain `{print}` leaves that old header as the first data row. Use `NR > 1` only when the first physical line should be discarded. On a headerless input, it would discard data.
- The new header is emitted even when the input has no rows. Decide whether that header-only result is useful to downstream tools.
- `print $1, $2, $3` writes only those three parsed fields. Use `{print}` when columns and original separators must pass through unchanged.
- Verify the output's first two lines, tab separators, field count, and datatype expected by the next tool. The wrapper copies the input datatype and metadata to the output, so set or convert the datatype if the next tool expects a different one.

The IWC survey records pins `9.3+galaxy1`, `9.5+galaxy0`, `9.5+galaxy2`, and `9.5+galaxy3` for `tp_awk_tool`. These snippets reproduce observed program shapes, not a promise that every pin is interchangeable. Keep the version and Tool Shed repository metadata consistent with the workflow you are editing, then validate the complete workflow. The examples above are step excerpts, not standalone gxformat2 workflows.

For header removal without a replacement, use a first-line removal operation. For stacking a collection while retaining only one header, use [[tabular-concatenate-collection-to-table]]. A separate constant-text dataset followed by `tp_cat` can also prefix text when that dataset is already part of the workflow design, but the cited header-injection steps use awk.

## Evidence and related patterns

The [[iwc-tabular-operations-survey]] records the MAGs awk program and identifies the VGP header-injection steps. See [[tabular-compute-new-column]] when rows need a computed field, and [[tabular-filter-by-regex]] when the operation is line filtering. The checked-in test under `verification/workflows/tabular-prepend-header/` compares both complete outputs against expected tab-separated files.
