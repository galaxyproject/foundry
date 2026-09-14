---
type: pattern
pattern_kind: operation
evidence: corpus-and-verified
title: "Conditional: route between alternative outputs"
aliases:
  - "when-gated alternatives with pick_value"
  - "conditional route with pick_value"
  - "one-of-N Galaxy route"
tags:
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-09-14
revision: 4
summary: "Use when-gated alternatives plus pick_value to merge binary or one-of-N routes into one downstream value."
related_notes:
  - "[[iwc-conditionals-survey]]"
  - "[[iwc-parameter-derivation-survey]]"
related_patterns:
  - "[[conditional-run-optional-step]]"
  - "[[conditional-transform-or-pass-through]]"
  - "[[conditional-gate-on-nonempty-result]]"
  - "[[collection-cleanup-after-mapover-failure]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
verification_paths:
  - verification/workflows/conditional-route-between-alternative-outputs/route-between-alternatives.gxwf-test.yml
iwc_exemplars:
  - workflow: scRNAseq/scanpy-clustering/Preprocessing-and-Clustering-of-single-cell-RNA-seq-data-with-Scanpy
    why: "Shows a binary 10x import route with legacy and v3 AnnData branches merged by pick_value."
    confidence: high
  - workflow: genome_annotation/functional-annotation/functional-annotation-of-sequences/Functional_annotation_of_sequences
    why: "Shows one enum input mapped into mode booleans, fan-out across eggNOG modes, then pick_value merge."
    confidence: high
  - workflow: microbiome/mags-building/MAGs-generation
    why: "Routes among individual, co-assembly, and custom assembly alternatives, including an embedded subworkflow branch."
    confidence: high
---

# Conditional: route between alternative outputs

## Tool

Use Galaxy `when:` gates on each alternative-producing step, then use `pick_value` to collapse the possible outputs into one downstream value.

`pick_value` here is `toolshed.g2.bx.psu.edu/repos/iuc/pick_value/pick_value/0.2.0` — 63 corpus steps, all of them the toolshed tool rather than the Galaxy built-in.

This is a graph-visible route pattern: each alternative stays as its own Galaxy step or subworkflow, and `pick_value` is the merge point. It is not a wrapper-internal conditional hidden inside one tool state.

## When to reach for it

Use this when a workflow must run exactly one branch from two or more alternative data-prep or analysis modes, but downstream steps should consume a single logical input.

Good fits include binary input-format routes, one-of-N analysis modes where each mode produces the same kind of downstream artifact, and embedded subworkflow alternatives that rejoin the main workflow.

Do not use this for a simple optional side branch whose outputs are terminal or independent; use [[conditional-run-optional-step]] for that.

Do not use this for cleanup after mapped tools produce empty or failed elements; use [[collection-cleanup-after-mapover-failure]].

Do not use this for "transform if requested, otherwise pass original through" unless the route is truly between peer alternatives. That shape is close, but its operation boundary is fallback-to-original rather than mode routing; use [[conditional-transform-or-pass-through]].

## Operation Boundary

This pattern is:

```text
route condition(s) -> when-gated alternative steps -> pick_value merge -> one downstream value
```

The reusable operation is the merge, not just the `when:` field. Every alternative may disappear at runtime, so the downstream step should connect to the `pick_value` output, not directly to any branch output.

For binary routes, one branch often uses the user boolean directly and the other uses a mapped inverse boolean. For one-of-N routes, derive one boolean per mode, gate each mode, then order the candidate outputs in `pick_value`.

## Parameters

On each alternative step:

- connect a boolean input with `id: when`;
- set `when: $(inputs.when)`;
- keep each alternative's output type and semantic role compatible with the merge.

On the merge step:

- connect every possible branch output into the `pick_from` repeat, through `style_cond|type_cond|pick_from_N|value`;
- set `style_cond.type_cond.param_type` to the kind being merged and read the matching output — `data_param`, `text_param`, `integer_param`, `float_param`, `boolean_param`. Corpus: 49 `data`, 10 `integer`, 3 `boolean`, 1 `float`;
- set `style_cond.pick_style` deliberately;
- connect all downstream consumers to the `pick_value` output.

`pick_style` decides what happens when the number of non-null inputs is not one:

| `pick_style` | Not exactly one non-null | Corpus |
|---|---|---|
| `first` | Takes the earliest non-null by `pick_from` order. Returns null if all are null. | 48 |
| `first_or_default` | As `first`, but substitutes `type_cond.default_value` when all are null. | 8 |
| `first_or_error` | As `first`, but fails the job when all are null. | 0 |
| `only` | Fails the job unless exactly one input is non-null. | 7 |

Ordering candidates only settles the outcome under `first`. If exactly one branch is supposed to run, say so with `only` and let a routing bug surface as a failure.

If authoring inverse or mode booleans, use a small mapper step such as `map_param_value` rather than duplicating branch logic inside downstream tools.

For mapped route booleans, use `map_param_value` as a graph-visible normalization step before the gated alternatives.

Binary inverse route: map the direct user boolean to its opposite for the second branch, then gate one branch from the original boolean and the other from `map_param_value/output_param_boolean`.

One-of-N route: create one `map_param_value` step per mode. Each mapper turns one selected enum/text value into `true` and uses `unmapped.default_value: false`; each branch consumes its own boolean as `inputs.when`.

## Idiomatic Shapes

Binary route. Two gated peers and the merge, in gxformat2:

```yaml
- id: branch_left
  tool_id: cat1
  in:
    - id: input1
      source: left_source
    - id: when
      source: use_left
  when: $(inputs.when)

- id: branch_right
  tool_id: cat1
  in:
    - id: input1
      source: right_source
    - id: when
      source: use_right
  when: $(inputs.when)

- id: route
  tool_id: toolshed.g2.bx.psu.edu/repos/iuc/pick_value/pick_value/0.2.0
  in:
    - id: style_cond|type_cond|pick_from_0|value
      source: branch_left/out_file1
    - id: style_cond|type_cond|pick_from_1|value
      source: branch_right/out_file1
  out:
    - id: data_param
  tool_state:
    style_cond:
      pick_style: first
      type_cond:
        param_type: data
        pick_from:
          - value: { __class__: ConnectedValue }
          - value: { __class__: ConnectedValue }
```

One-of-N route: same merge step with one `pick_from` slot per mode, one `map_param_value` mapper per mode producing that mode's boolean, and `pick_style: only` when the modes are meant to be exclusive.

## Pitfalls

- Forgetting the merge. A gated branch output may be absent. Downstream steps should consume `pick_value`, not one branch directly.
- Non-exclusive booleans. Under `pick_style: first` two live branches resolve to the earlier `pick_from` slot, silently. `only` turns that into a job failure.
- Mismatched output semantics. `pick_value` can merge present values, but it does not make incompatible outputs equivalent. Branches should produce the same logical artifact.
- Hiding the route in one wrapper. IWC evidence favors graph-visible `when` branches plus merge for these route operations.
- Duplicating enum comparisons inside every downstream tool. Normalize once with `map_param_value`, then connect the resulting boolean to `id: when`.
- Confusing route merge with collection cleanup. `__FILTER_EMPTY_DATASETS__` and `__FILTER_FAILED_DATASETS__` clean mapped collection elements; they are not the observed IWC mechanism for one-of-N conditional routing.

## See Also

- [[iwc-conditionals-survey]] — Candidate B evidence and conditionals boundary decisions.
- [[iwc-parameter-derivation-survey]] — boundary between conditional boolean mapping and tool-parameter mapping.
- [[galaxy-conditionals-patterns]] — conditionals MOC.
- [[conditional-run-optional-step]] — direct boolean gate with no required merge.
- [[conditional-gate-on-nonempty-result]] — derive boolean from empty/non-empty result, then gate reporting/export.
- [[conditional-transform-or-pass-through]] — optional transform then fallback to original.
- [[collection-cleanup-after-mapover-failure]] — collection-state cleanup, not route selection.
