---
type: pattern
pattern_kind: recipe
evidence: corpus-observed
title: "Reshape, relabel, and remap by collection axis"
aliases:
  - "reshape relabel remap by axis"
  - "collection axis remap lifecycle"
  - "fan-out axis correction before map-over"
tags:
  - target/galaxy
  - topic/galaxy-transform
  - topic/collection-transform
status: draft
created: 2026-05-04
revised: 2026-05-04
revision: 1
ai_generated: true
summary: "Use Apply Rules and deterministic relabeling when domain fan-out creates the wrong map-over axis."
related_notes:
  - "[[iwc-map-over-lifecycle-survey]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
related_patterns:
  - "[[collection-swap-nesting-with-apply-rules]]"
  - "[[collection-split-identifier-via-rules]]"
  - "[[relabel-via-rules-and-find-replace]]"
  - "[[regex-relabel-via-tabular]]"
  - "[[collection-flatten-after-fanout]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
  - "[[nextflow-summary-to-galaxy-data-flow]]"
  - "[[cwl-summary-to-galaxy-data-flow]]"
iwc_exemplars:
  - workflow: virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping
    why: "Uses Apply Rules, identifier extraction, find-and-replace, relabeling, and another Apply Rules pass before mapped consensus."
    confidence: high
---

# Reshape, relabel, and remap by collection axis

Use this recipe when an upstream domain fan-out produces the right datasets but nests or labels them along the wrong axis for the next mapped tool.

This is a high-density recipe with narrow corpus evidence. Keep it grounded in explicit identifier transformations and review it carefully before applying it to unrelated tuple/grouping structures.

The reusable move is not relabeling alone; it is correcting which collection level Galaxy will map over after domain fan-out, while preserving a visible identifier derivation path.

## Recipe

1. Identify the downstream tool input that will be mapped and the collection level it should iterate over.
2. Compare that expected axis with the current nested collection shape and labels.
3. Use Apply Rules to expose, swap, or restore the axis that should become the mapped collection level.
4. Extract identifiers from the collection level whose labels must drive downstream mapping.
5. Rewrite labels deterministically when domain names contain extra suffixes, prefixes, or compound keys.
6. Relabel the collection from the derived label file.
7. Reshape again if relabeling fixed names but left the wrong collection type or nesting order.
8. Connect the corrected collection to the downstream mapped tool and verify element labels/order.

## Reach For This When

- A tool fans out by region, segment, sample, replicate, or other domain axis, but the next tool needs a different axis.
- Collection element identifiers encode multiple fields that must become separate nested axes or cleaner labels.
- A Nextflow `groupTuple()` or `transpose()` idiom has been reviewed as a real domain grouping axis, not arbitrary tuple reshaping, and Galaxy needs concrete collection axes for the equivalent map-over.

## Operation Handoffs

- Use [[collection-swap-nesting-with-apply-rules]] when the main problem is `list:list` axis order.
- Use [[collection-split-identifier-via-rules]] when one identifier string contains multiple axis labels.
- Use [[relabel-via-rules-and-find-replace]] or [[regex-relabel-via-tabular]] when labels need deterministic cleanup.
- Use [[collection-flatten-after-fanout]] when the outer fan-out axis no longer matters.

## Pitfalls

- Do not treat arbitrary Nextflow tuple grouping as automatically representable in Galaxy collections.
- Do not relabel without preserving a visible derivation path; hidden label magic breaks review and tests.
- Do not generalize from a single dense workflow to all domain fan-out cases without a second exemplar or manual review.

## See Also

- [[iwc-map-over-lifecycle-survey]] — Shape C evidence and review caveat.
- [[nextflow-operators-to-galaxy-collection-recipes]] — source-operator pressure points.
