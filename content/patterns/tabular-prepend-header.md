---
type: pattern
pattern_kind: operation
evidence: corpus-observed
title: "Tabular: prepend header"
tags:
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-05-03
revision: 2
ai_generated: true
summary: "Use tp_awk_tool to prepend a constant header line, optionally skipping or reformatting an existing first row."
related_notes:
  - "[[iwc-tabular-operations-survey]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
related_patterns:
  - "[[tabular-compute-new-column]]"
  - "[[tabular-concatenate-collection-to-table]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
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

## Tool

`toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_awk_tool`. The survey split awk into operation-named recipe pages; this page covers the recurring `BEGIN { print "header" }` idiom, not awk in general.

`tp_text_file_with_recurring_lines` plus concatenation can build constant prefixes, but IWC reaches for awk more often for this header-prepend operation.

## When to reach for it

Use this when a tabular or text-like output needs a fixed first line inside the workflow. Common shapes include prepending a header and passing rows unchanged, prepending a header while skipping an old first row, and prepending a header while normalizing a few fields.

Do not use this for header stripping alone; that is usually `Remove beginning1`. Do not use it for collection header dedupe; use [[tabular-concatenate-collection-to-table]] with `one_header: true`.

## Parameters

- `code`: awk program. Corpus uses both quoted one-liners and multiline `|-` blocks.
- `infile`: connected input.
- `variables`: usually `[]` in the cited examples.

Version pins vary (`9.3+galaxy1`, `9.5+galaxy0`, `9.5+galaxy2`, `9.5+galaxy3`) with stable parameter shape. Prefer the newest/current pin already used in the workflow; do not change pins solely for cleanup.

## Idiomatic shapes

Prepend a simple header, pass rows unchanged:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_awk_tool/9.3+galaxy1
tool_state:
  code: 'BEGIN{print "Metric\tAlternate"}; {print}; '
  infile: { __class__: ConnectedValue }
  variables: []
```

Anchored by the VGP purge-duplicates IWC exemplar.

Prepend a header, skip the old first row, and normalize rows:

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

Anchored by the MAGs generation IWC exemplar.

## Pitfalls

- **Duplicate headers.** If input already has a header, use `NR > 1`; plain `{print}` preserves the old header under the new one.
- **Set `OFS` when printing fields.** `print $1, $2, $3` uses `OFS`; without `BEGIN {OFS="\t"}`, awk emits spaces.
- **Quoted and multiline `code` both occur.** Use one-line quoted strings only for simple pass-through. Use multiline `|-` for `NR > 1`, conditionals, or field rewriting.
- **Do not name this awk.** The page is operation-named per the survey decision. Sibling awk recipes get their own operation pages.
- **Header injection is not collection header dedupe.** Collection-wide header dedupe belongs to [[tabular-concatenate-collection-to-table]].

## Legacy alternative

`tp_text_file_with_recurring_lines` plus `tp_cat` can prepend constant text, but it is not the lead recommendation for this corpus pattern. Use it only when a separate reusable text file is already part of the workflow design.

## See also

- [[iwc-tabular-operations-survey]] — §2g, §5, and §7 awk split decision.
- [[tabular-concatenate-collection-to-table]] — collection header dedupe via `one_header`.
- [[tabular-compute-new-column]] — simple per-row expressions without awk.
- [[tabular-filter-by-regex]] — line-level regex filtering without header injection.
