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
  - pattern
  - target/galaxy
  - topic/galaxy-transform
status: draft
created: 2026-05-02
revised: 2026-05-02
revision: 1
ai_generated: true
summary: "Use this MOC to choose corpus-grounded Galaxy when and pick_value conditional patterns."
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

This is the runtime-facing map for Galaxy conditional workflow choices. Use it before loading raw survey notes. The survey remains evidence backing; the operation and recipe pages are the actionable references.

## Direct Gates

- [[conditional-run-optional-step]] — expose or derive a boolean, connect it as `inputs.when`, and use `when: $(inputs.when)` to skip optional steps.
- [[conditional-gate-on-nonempty-result]] — compute a boolean from empty/non-empty dataset or collection state before gating downstream reporting/export. The MGnify recipe is corpus-backed but clunky pending verified-pattern workflow work.

## Routes and Fallbacks

- [[conditional-route-between-alternative-outputs]] — run one of several `when`-gated alternatives, then merge possible outputs with `pick_value`.
- [[conditional-transform-or-pass-through]] — optionally transform a value, then use `pick_value` to choose transformed output or original fallback.

## Not Conditionals

- [[collection-cleanup-after-mapover-failure]] — use collection filters when empty or failed mapped elements should be dropped or replaced. This is collection-state cleanup, not a `when` gate.
- `__FILTER_NULL__` — catalog capability for null outputs after conditional steps, but no IWC-backed pattern candidate in the conditionals survey. Zero uptake is not itself an anti-pattern call.

## See Also

- [[iwc-conditionals-survey]] — conditionals survey and evidence trail.
- [[galaxy-collection-patterns]] — companion MOC for collection transforms and cleanup.
