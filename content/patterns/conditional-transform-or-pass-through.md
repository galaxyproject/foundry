---
type: pattern
pattern_kind: operation
evidence: corpus-observed
title: "Conditional: transform or pass through"
aliases:
  - "optional transform with fallback"
  - "when-gated transform then pick_value"
  - "transform or keep original"
tags:
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-05-03
revision: 2
ai_generated: true
summary: "Gate an optional transform, then use pick_value to pass transformed data when present or original data otherwise."
related_notes:
  - "[[iwc-conditionals-survey]]"
related_patterns:
  - "[[conditional-route-between-alternative-outputs]]"
  - "[[conditional-run-optional-step]]"
  - "[[conditional-gate-on-nonempty-result]]"
  - "[[collection-cleanup-after-mapover-failure]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
iwc_exemplars:
  - workflow: VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation
    why: "Runs optional haplotype suffixing only when requested, then pick_value selects suffixed or original haplotype output."
    confidence: high
  - workflow: VGP-assembly-v2/Assembly-decontamination-VGP9/Assembly-decontamination-VGP9
    why: "Uses a mapped boolean to gate adaptor filtering/masking/report rewrite, then falls back to the original report when masking does not run."
    confidence: high
---

# Conditional: transform or pass through

## Tool

Use a Galaxy `when:` gate on the optional transform branch, then use `pick_value` to collapse the optional transformed output and the original input/output back to one downstream value.

The observed shape is:

1. Derive or expose a boolean.
2. Connect that boolean as the gated step's `id: when` input.
3. Set `when: $(inputs.when)` on every step in the optional transform branch.
4. Feed the transformed output and original value into `pick_value`.
5. Connect downstream steps only to the selected value.

## When to reach for it

Use this when a workflow should optionally alter a dataset, collection, or report while preserving one stable downstream input slot.

This is not general mode routing. The pass-through side is not a peer algorithm; it is the same data before the optional cleanup, relabel, or rewrite. Reach for this when the user story is "apply the cleanup if requested or needed, otherwise keep the original."

Use [[conditional-route-between-alternative-outputs]] instead when the branches are mutually exclusive peer routes: import mode A vs mode B, annotation mode 1 vs 2 vs 3, co-assembly vs individual assembly. In that route pattern, each branch independently produces a candidate output. Here, one branch is a transform of the other branch's source.

Use [[conditional-run-optional-step]] when the optional branch has side outputs only and no downstream replacement value is needed.

Do not use this as collection failure cleanup. If mapped elements are empty or failed, use [[collection-cleanup-after-mapover-failure]] with `__FILTER_EMPTY_DATASETS__` or `__FILTER_FAILED_DATASETS__`.

## Operation Boundary

`conditional-transform-or-pass-through` is the "same value, optionally modified" pattern.

Keep it separate from route-with-`pick_value` for now because authors need to distinguish:

- Transform/pass-through: original value is valid downstream input; transformed value replaces it only when the branch runs.
- Route between alternatives: each branch is a different source, mode, or algorithm; there may be no privileged original.
- Optional side branch: downstream does not need a merged replacement value.
- Filter null outputs: not corpus-backed in IWC; `__FILTER_NULL__` has zero observed hits in the conditionals survey.

If merged later, this should become a named subsection of [[conditional-route-between-alternative-outputs]], not disappear; the authoring decision is common enough to teach explicitly.

## Parameters

- `when` input on every optional transform step: connected from a workflow boolean, `map_param_value`, or another boolean-producing step.
- `when: $(inputs.when)` on each gated transform step.
- `pick_value` input order: put the transformed output before the original fallback so the transformed value wins when present.
- Original fallback: connect the unmodified value, or an upstream report/output equivalent, into the later `pick_value` candidate slot.

The exact transform tool is operation-specific. IWC examples use text replacement, line replacement, masking, concatenation, and suffixing tools; the pattern is the conditional merge shape, not those tools.

## Idiomatic Shape

Conceptual gxformat2 shape:

```yaml
- label: Optional transform
  tool_id: <transform-tool>
  in:
    - id: input
      source: original_input
    - id: when
      source: transform_boolean
  when: $(inputs.when)

- label: Use transformed value if present, otherwise original
  tool_id: pick_value
  in:
    - id: style_cond|pick_from
      source: Optional transform/output
    - id: style_cond|pick_from
      source: original_input
```

Read this as preserving a downstream contract: later steps consume one value regardless of whether the optional transform ran.

## Pitfalls

- Put the transformed output before the original fallback in `pick_value`; otherwise the original may win even when the transform ran.
- Gate every step in a multi-step transform branch. A downstream transform step without the same `when` may run with missing inputs.
- Do not duplicate the whole downstream workflow after the optional transform. Merge once with `pick_value`, then continue with one path.
- Do not model pass-through as a fake transform step. The unmodified value should be connected directly as the fallback candidate.
- Do not cite `__FILTER_NULL__` as the IWC idiom for this. The survey found zero `__FILTER_NULL__` hits.

## See Also

- [[iwc-conditionals-survey]] — Candidate D and boundary against Candidate B.
- [[galaxy-conditionals-patterns]] — conditionals MOC.
- [[conditional-route-between-alternative-outputs]] — sibling route-with-`pick_value` pattern for peer alternatives.
- [[conditional-run-optional-step]] — primitive `when:` branch without downstream merge.
- [[conditional-gate-on-nonempty-result]] — data-derived gate for downstream reporting/export.
- [[collection-cleanup-after-mapover-failure]] — collection-state cleanup, not a `when` + pass-through recipe.
