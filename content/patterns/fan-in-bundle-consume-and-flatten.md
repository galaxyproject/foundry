---
type: pattern
pattern_kind: recipe
evidence: corpus-observed
title: "Fan-in bundle, consume, and flatten"
aliases:
  - "fan-in bundle then flatten"
  - "build list for collection consumer"
  - "mid-workflow collection fan-in lifecycle"
tags:
  - target/galaxy
  - topic/galaxy-transform
  - topic/collection-transform
status: draft
created: 2026-05-04
revised: 2026-05-04
revision: 1
ai_generated: true
summary: "Bundle parallel outputs into a collection consumer, then flatten nested results for pooled downstream processing."
related_notes:
  - "[[iwc-map-over-lifecycle-survey]]"
  - "[[iwc-conditionals-survey]]"
related_patterns:
  - "[[collection-build-named-bundle]]"
  - "[[collection-flatten-after-fanout]]"
  - "[[tabular-concatenate-collection-to-table]]"
  - "[[tabular-pivot-collection-to-wide]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
  - "[[nextflow-summary-to-galaxy-data-flow]]"
  - "[[cwl-summary-to-galaxy-data-flow]]"
iwc_exemplars:
  - workflow: microbiome/mags-building/MAGs-generation
    why: "Builds a collection from multiple binner outputs for binette, then flattens nested bins for pooled downstream processing."
    confidence: high
---

# Fan-in bundle, consume, and flatten

Use this recipe when several parallel outputs should become one named collection for a downstream collection-aware tool, then nested results must be flattened before optional pooled aggregation.

This contrasts with [[manifest-to-mapped-collection-lifecycle]]: collection construction happens mid-workflow as fan-in, not just at the workflow boundary.

## Recipe

1. Identify parallel outputs that represent comparable alternatives, bins, reports, or method results.
2. Build a named collection bundle from those individual outputs.
3. Feed the bundle into the downstream tool that expects a collection input.
4. Flatten nested collection output if the downstream tool emits one subcollection per input element.
5. Aggregate tabular/report outputs when the final consumer needs one file rather than a collection.

## Reach For This When

- Multiple tools produce equivalent artifacts and a later tool compares, refines, or pools them.
- A workflow bundles related outputs because a later collection-aware tool consumes them, not merely for publication.
- A downstream collection consumer emits nested outputs that need pooled processing.

## Operation Handoffs

- Use [[collection-build-named-bundle]] to assemble individual datasets or outputs into a `list`.
- Use [[collection-flatten-after-fanout]] when the consumer returns nested collections and the outer axis no longer matters.
- Use [[tabular-concatenate-collection-to-table]] or [[tabular-pivot-collection-to-wide]] when flattened tabular outputs should become one report table.

Bundle-only publication is related but narrower; use [[collection-build-named-bundle]] when there is no downstream collection consumer.

## Pitfalls

- Do not use collection bundling when the real operation is file-content concatenation.
- Do not use positional identifiers for bundles that will become test-facing outputs.
- Do not flatten away an axis that still encodes method, sample, or replicate identity needed downstream.

## See Also

- [[iwc-map-over-lifecycle-survey]] — Shape E evidence.
- [[manifest-to-mapped-collection-lifecycle]] — boundary collection construction in the opposite direction.
