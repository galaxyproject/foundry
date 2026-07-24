---
type: pattern
pattern_kind: operation
evidence: corpus-observed
title: "Tabular: relabel by row counter"
aliases:
  - "sample_N relabel"
  - "inline relabel"
tags:
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-05-03
revision: 2
ai_generated: true
summary: "Use tp_awk_tool to replace each row or label with deterministic sample_N values from awk NR."
related_notes:
  - "[[iwc-tabular-operations-survey]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
related_patterns:
  - "[[tabular-prepend-header]]"
  - "[[tabular-compute-new-column]]"
  - "[[tabular-concatenate-collection-to-table]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
iwc_exemplars:
  - workflow: microbiome/binning-evaluation/MAGs-binning-evaluation
    why: "Uses tp_awk_tool to replace each row with zero-based sample_N labels derived from NR."
    confidence: high
---

# Tabular: relabel by row counter

## Tool

`toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_awk_tool`. This is the operation-named awk recipe for replacing row content with deterministic labels derived from `NR`.

## When to reach for it

Use this when a workflow needs synthetic row labels like `sample_0`, `sample_1`, ... or `sample_1`, `sample_2`, ... based only on input row order.

Do not use this for simple computed columns; use [[tabular-compute-new-column]]. Do not use this when labels should come from collection element identifiers; use collection-aware provenance such as [[tabular-concatenate-collection-to-table]].

## Parameters

- `code`: awk program. A one-line quoted string is enough for this operation.
- `infile`: connected input.
- `variables`: usually `[]` in awk examples.

The corpus exemplar uses `toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_awk_tool/9.5+galaxy3`.

## Idiomatic shapes

Corpus-observed `sample_0` first row:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_awk_tool/9.5+galaxy3
tool_state:
  code: '{gsub( $0 ,"sample_" (NR-1)); print}'
  infile: { __class__: ConnectedValue }
  variables: []
```

Anchored by the MAGs binning evaluation IWC exemplar.

Clearer equivalent for new whole-row replacement:

```yaml
tool_state:
  code: '{print "sample_" (NR-1)}'
  infile: { __class__: ConnectedValue }
  variables: []
```

One-based labels:

```yaml
tool_state:
  code: '{print "sample_" NR}'
  infile: { __class__: ConnectedValue }
  variables: []
```

Keep a header and relabel only data rows:

```yaml
tool_state:
  code: 'NR==1 {print; next} {print "sample_" (NR-1)}'
  infile: { __class__: ConnectedValue }
  variables: []
```

## Pitfalls

- **Zero-based vs one-based labels.** Corpus emits `sample_0` first because it uses `NR-1`. Use `NR` for `sample_1`.
- **Headers shift counters.** Decide whether the first line is preserved, dropped, or counted before picking `NR` vs `NR-1`.
- **Avoid `gsub($0, ...)` for new work.** It works in the exemplar, but treats the current row as a regex pattern. `print "sample_" ...` is clearer when replacing the whole row.
- **Whole-row replacement destroys original columns.** Only use when downstream wants labels only.
- **Row order becomes semantic.** Any upstream sort or filter changes assigned sample numbers.
- **No collection provenance.** If labels should come from element identifiers, do not synthesize them from row order.

## See also

- [[iwc-tabular-operations-survey]] — §2g and §7 awk split decision.
- [[tabular-prepend-header]] — header-preserving variants.
- [[tabular-compute-new-column]] — preserve rows while adding/replacing columns.
- [[tabular-concatenate-collection-to-table]] — preserve collection element identity instead of synthesizing row labels.
