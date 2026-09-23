---
type: pattern
pattern_kind: moc
evidence: corpus-observed
title: "Galaxy: conditionals patterns"
aliases:
  - "Galaxy conditional pattern MOC"
  - "Galaxy when patterns"
  - "conditional workflow patterns"
tags:
  - target/galaxy
  - topic/galaxy-transform
status: draft
created: 2026-05-02
revised: 2026-09-23
revision: 2
summary: "Choose a Galaxy when gate, routed output, fallback, or collection cleanup by what must change downstream."
related_notes:
  - "[[iwc-conditionals-survey]]"
related_patterns:
  - "[[conditional-run-optional-step]]"
  - "[[conditional-route-between-alternative-outputs]]"
  - "[[conditional-gate-on-nonempty-result]]"
  - "[[conditional-transform-or-pass-through]]"
  - "[[collection-cleanup-after-mapover-failure]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
  - "[[nextflow-summary-to-galaxy-data-flow]]"
  - "[[cwl-summary-to-galaxy-data-flow]]"
  - "[[nextflow-summary-to-galaxy-template]]"
  - "[[cwl-summary-to-galaxy-template]]"
  - "[[freeform-summary-to-galaxy-template]]"
  - "[[compare-against-iwc-exemplar]]"
---

# Galaxy: conditionals patterns

Choose by what should happen when the condition is false: skip a step, select one value for a continuing path, or remove unusable collection members. The linked pages give the construction details. The [[iwc-conditionals-survey]] records the IWC evidence behind them.

Galaxy steps in the observed patterns receive a boolean through an input named `when` and declare `when: $(inputs.when)`. If later steps require an output from a skipped branch, give them an explicit merge or fallback. A `when` gate alone does not provide that value.

## Skip work without replacing its output

- **User choice or another available boolean:** [[conditional-run-optional-step]] gates an optional step or branch whose output need not feed an unconditional downstream step. Gate every step that belongs to the optional branch.
- **Upstream result may be empty:** [[conditional-gate-on-nonempty-result]] derives a boolean from dataset content or collection emptiness, then gates reporting, visualization, or export. The MGnify collection-to-boolean chain is corpus-backed and verified against Galaxy `release_25.1`, but takes four shim steps. Use its known-good shape until a shorter one is verified.

## Continue with one value

- **Peer alternatives:** [[conditional-route-between-alternative-outputs]] gates the possible modes and merges their compatible outputs with `pick_value`. If exactly one mode must produce a value, choose merge behavior that detects zero or multiple live outputs rather than silently taking the first.
- **Optional change to an existing value:** [[conditional-transform-or-pass-through]] gates the transform and uses `pick_value` to prefer its output when present, with the original value as the fallback. This preserves one downstream input without duplicating the rest of the workflow.

## Clean a collection instead

[[collection-cleanup-after-mapover-failure]] drops or replaces empty or failed elements after map-over. It changes collection membership or contents, while a `when` gate skips a whole step. If dropping elements affects alignment with a sibling collection, see [[galaxy-collection-patterns]] for the next choice.

`__FILTER_NULL__` can filter null outputs after conditional steps, but the conditionals survey found no IWC use from which to establish a pattern. That absence alone does not make the capability an anti-pattern.

## See Also

- [[iwc-conditionals-survey]] — conditionals survey and evidence trail.
- [[galaxy-collection-patterns]] — collection transforms and cleanup after map-over.
