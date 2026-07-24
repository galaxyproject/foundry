---
type: pattern
pattern_kind: operation
evidence: corpus-observed
title: "Tabular: split taxonomy string"
tags:
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-05-03
revision: 2
ai_generated: true
summary: "Use tp_awk_tool to split semicolon-delimited taxonomy strings into explicit rank columns with missing-rank handling."
related_notes:
  - "[[iwc-tabular-operations-survey]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
related_patterns:
  - "[[tabular-prepend-header]]"
  - "[[tabular-compute-new-column]]"
  - "[[tabular-cut-and-reorder-columns]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
iwc_exemplars:
  - workflow: amplicon/amplicon-mgnify/mapseq-to-ampvis2/mapseq-to-ampvis2
    why: "Shows canonical eight-rank prefix dispatch from taxonomy strings into explicit rank columns."
    confidence: high
  - workflow: amplicon/amplicon-mgnify/mgnify-amplicon-taxonomic-summary-tables/mgnify-amplicon-summary-tables
    why: "Shows fixed-depth rank splitting, rank cleanup, unassigned filling, and abundance-column preservation."
    confidence: high
  - workflow: amplicon/amplicon-mgnify/taxonomic-rank-abundance-summary-table/taxonomic-rank-abundance-summary-table
    why: "Shows rank-depth variants from superkingdom through species."
    confidence: high
---

# Tabular: split taxonomy string

## Tool

`toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_awk_tool`. This page covers the taxonomy-lineage awk recipe from [[iwc-tabular-operations-survey]] §2g and §7.

## When to reach for it

Use this when a tabular column contains semicolon-delimited taxonomic lineage and downstream tools need explicit rank columns such as superkingdom, kingdom, phylum, class, order, family, genus, and species.

Do not use this as a generic pivot or transpose; see [[tabular-pivot-collection-to-wide]] for the collection-wide pivot pattern. Use [[tabular-compute-new-column]] for simple one-expression columns and [[tabular-cut-and-reorder-columns]] for post-split projection.

## Parameters

- `code`: awk program. Corpus examples use multiline code for `split`, prefix dispatch, and missing-rank handling.
- `infile`: connected tabular input.
- `variables`: usually `[]` in awk examples.

Set `FS = OFS = "\t"` when reading and writing tabular rows.

## Idiomatic shapes

Prefix-dispatch split, robust to missing or reordered ranks:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_awk_tool/9.5+galaxy0
tool_state:
  code: |-
    BEGIN { FS = OFS = "\t" }
    NR > 2 {
      otu_id = "OTU_" $1
      superkingdom = kingdom = phylum = tax_class = order = family = genus = species = ""

      split($3, taxonomy, ";")

      for (i in taxonomy) {
        if (taxonomy[i] ~ /^sk__/) superkingdom = taxonomy[i]
        else if (taxonomy[i] ~ /^k__/) kingdom = taxonomy[i]
        else if (taxonomy[i] ~ /^p__/) phylum = taxonomy[i]
        else if (taxonomy[i] ~ /^c__/) tax_class = taxonomy[i]
        else if (taxonomy[i] ~ /^o__/) order = taxonomy[i]
        else if (taxonomy[i] ~ /^f__/) family = taxonomy[i]
        else if (taxonomy[i] ~ /^g__/) genus = taxonomy[i]
        else if (taxonomy[i] ~ /^s__/) species = taxonomy[i]
      }

      print otu_id, superkingdom, kingdom, phylum, tax_class, order, family, genus, species
    }
  infile: { __class__: ConnectedValue }
  variables: []
```

Anchored by the MAPseq-to-ampvis2 IWC exemplar.

Fixed-depth split when upstream guarantees positional ranks:

```awk
BEGIN { FS = OFS = "\t" }
NR > 1 {
  split($1, taxa_parts, ";")
  superkingdom = (taxa_parts[1] != "" ? taxa_parts[1] : "unassigned")
  kingdom = (taxa_parts[2] != "" ? taxa_parts[2] : "unassigned")
  phylum = (taxa_parts[3] != "" ? taxa_parts[3] : "unassigned")
  print superkingdom, kingdom, phylum
}
```

## Pitfalls

- **Set `FS = OFS = "\t"`.** Without it, `print a, b, c` emits spaces.
- **Header skipping is source-specific.** MAPseq examples use `NR > 2`; other table-reshaping examples use `NR > 1`.
- **Choose prefix behavior deliberately.** Decide whether downstream wants values like `p__Firmicutes` or stripped names like `Firmicutes`.
- **Handle missing ranks explicitly.** Corpus examples use empty strings or `unassigned` depending on downstream contract.
- **`for (i in array)` order is undefined.** It is fine for prefix dispatch, not for positional rank emission.
- **Avoid `class` as a new example variable.** Corpus-style awk may use it, but `tax_class` avoids confusing readers.

## See also

- [[iwc-tabular-operations-survey]] — §2g, §2l, and §7 awk split decision.
- [[tabular-prepend-header]] — header manipulation before/after awk transforms.
- [[tabular-cut-and-reorder-columns]] — projection after rank expansion.
- [[tabular-pivot-collection-to-wide]] — collection-to-wide pivot, not taxonomy parsing.
