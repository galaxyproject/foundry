---
type: pattern
title: Collection inputs map over their elements
pattern_kind: operation
evidence: corpus-observed
tags:
  - target/galaxy
status: reviewed
created: 2026-07-26
revised: 2026-07-26
revision: 2
ai_generated: true
summary: A tool given a collection where it declares a single dataset runs once per element, implicitly.
iwc_exemplars:
  - workflow: rnaseq-pe
    why: The trimming step receives a paired collection and maps without an explicit map-over step.
    confidence: high
---

# Collection inputs map over their elements

The claim is `corpus-observed` and names the workflow it was observed in, so the grading can be
checked rather than taken on trust.
