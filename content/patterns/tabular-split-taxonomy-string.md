---
type: pattern
pattern_kind: operation
evidence: corpus-and-verified
title: "Tabular: split taxonomy string"
tags:
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-10-01
revision: 3
summary: "Expand a prefixed taxonomy lineage into fixed rank columns with tp_awk_tool, preserving row identity and handling absent ranks."
related_notes:
  - "[[iwc-tabular-operations-survey]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
related_patterns:
  - "[[tabular-prepend-header]]"
  - "[[tabular-compute-new-column]]"
  - "[[tabular-cut-and-reorder-columns]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
verification_paths:
  - verification/workflows/tabular-split-taxonomy-string/split-taxonomy.gxwf-test.yml
iwc_exemplars:
  - workflow: amplicon/amplicon-mgnify/mapseq-to-ampvis2/mapseq-to-ampvis2
    why: "Splits a taxonomy field by semicolon, dispatches sk__ through s__ prefixes into eight rank columns, and adds an OTU_ identifier."
    confidence: high
  - workflow: amplicon/amplicon-mgnify/mgnify-amplicon-taxonomic-summary-tables/mgnify-amplicon-summary-tables
    why: "Shows fixed-depth rank splitting, rank cleanup, unassigned filling, and abundance-column preservation."
    confidence: high
  - workflow: amplicon/amplicon-mgnify/taxonomic-rank-abundance-summary-table/taxonomic-rank-abundance-summary-table
    why: "Shows rank-depth variants from superkingdom through species."
    confidence: high
---

# Tabular: split taxonomy string

Expand one semicolon-delimited lineage field into rank columns when the lineage tokens carry prefixes such as `sk__`, `p__`, and `s__`. The MAPseq-to-ampvis2 IWC workflow reads column 3, emits an `OTU_` identifier from column 1, then writes superkingdom through species in a fixed order. Each input data row becomes one output row. A missing rank becomes an empty field, so downstream tools can rely on the same column positions.

Use prefix dispatch when ranks can be missing or appear in a different order. Splitting directly into positions is suitable only when the upstream format guarantees a fixed rank order and depth. A positional split cannot tell whether the second token is a kingdom or a phylum after one rank is omitted.

## Input and output contract

The recipe below expects a tab-separated input with **two non-data lines**, an identifier in column 1, and the lineage in column 3. It drops both non-data lines. Its output has a header followed by nine tab-separated fields per data row: `OTU`, `Superkingdom`, `Kingdom`, `Phylum`, `Class`, `Order`, `Family`, `Genus`, and `Species`. It discards other input columns, including abundance. If abundance must survive, include its source field in the output header and `print` statement.

Connect the input dataset to `infile`, put the awk program in `code`, leave `variables: []` when no values are injected, and publish `outfile`. The IWC step pins `toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_awk_tool/9.5+galaxy0` at Tool Shed changeset `3dc70b59608c`. Its header is added by a later awk step. This compact variant prints the header in the same step:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_awk_tool/9.5+galaxy0
tool_state:
  infile: { __class__: ConnectedValue }
  variables: []
  code: |-
    BEGIN {
      FS = OFS = "\t"
      print "OTU", "Superkingdom", "Kingdom", "Phylum", "Class", "Order", "Family", "Genus", "Species"
    }
    NR > 2 {
      otu_id = "OTU_" $1
      superkingdom = kingdom = phylum = tax_class = order = family = genus = species = ""
      n = split($3, taxonomy, ";")
      for (i = 1; i <= n; i++) {
        token = taxonomy[i]
        if (token ~ /^sk__/) superkingdom = token
        else if (token ~ /^k__/) kingdom = token
        else if (token ~ /^p__/) phylum = token
        else if (token ~ /^c__/) tax_class = token
        else if (token ~ /^o__/) order = token
        else if (token ~ /^f__/) family = token
        else if (token ~ /^g__/) genus = token
        else if (token ~ /^s__/) species = token
      }
      print otu_id, superkingdom, kingdom, phylum, tax_class, order, family, genus, species
    }
```

The tool wrapper passes tab field separators to awk and writes `outfile` with the input's datatype and metadata. The explicit `FS = OFS = "\t"` makes the program's parsing and output separators clear. The IWC program instead joins its output fields with literal tab strings. The wrapper's `variables` repeat is optional, and this recipe does not use it.

## Adapt and check the result

- **Headers:** `NR` counts physical input lines. Change `NR > 2` to `NR > 1` for one header line, or remove the condition for headerless data. A wrong offset silently drops a data row or treats a header as taxonomy.
- **Prefixes and blanks:** The program retains tokens such as `p__Firmicutes` and leaves missing ranks empty. If the consumer expects bare names or a marker such as `unassigned`, transform those values explicitly and test the resulting contract. Prefixes must start at the beginning of each token. Trim whitespace first if the source inserts spaces after semicolons.
- **Column shape:** `print` uses `OFS` between all nine fields, including empty interior or trailing ranks. Check the first data row, the field count, and the expected datatype before connecting a downstream tool. A duplicate rank prefix in one lineage is overwritten by the last matching token.

The checked-in test named in `verification_paths` compares complete output bytes for reordered ranks and absent ranks. The pinned IWC workflow establishes the source idiom, while the local test checks this one-step variant. See [[tabular-prepend-header]] if header construction must remain a separate step, and [[tabular-cut-and-reorder-columns]] for later projection.
