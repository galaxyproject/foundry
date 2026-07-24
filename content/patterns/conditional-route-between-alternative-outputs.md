---
type: pattern
pattern_kind: operation
evidence: corpus-observed
title: "Conditional: route between alternative outputs"
aliases:
  - "when-gated alternatives with pick_value"
  - "conditional route with pick_value"
  - "one-of-N Galaxy route"
tags:
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-05-03
revision: 3
ai_generated: true
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

- connect every possible branch output to `pick_value`;
- order candidates so the intended selected value appears first among present outputs;
- connect all downstream consumers to the `pick_value` output.

If authoring inverse or mode booleans, use a small mapper step such as `map_param_value` rather than duplicating branch logic inside downstream tools.

For mapped route booleans, use `map_param_value` as a graph-visible normalization step before the gated alternatives.

Binary inverse route: map the direct user boolean to its opposite for the second branch, then gate one branch from the original boolean and the other from `map_param_value/output_param_boolean`.

One-of-N route: create one `map_param_value` step per mode. Each mapper turns one selected enum/text value into `true` and uses `unmapped.default_value: false`; each branch consumes its own boolean as `inputs.when`.

## Idiomatic Shapes

Binary route, conceptual shape:

```yaml
- label: Import legacy 10x matrix
  tool_id: anndata_import
  in:
    - id: when
      source: use_legacy_10x_boolean
  when: $(inputs.when)

- label: Import 10x v3 matrix
  tool_id: anndata_import
  in:
    - id: when
      source: use_v3_10x_boolean
  when: $(inputs.when)

- label: Pick imported AnnData
  tool_id: pick_value
  in:
    - source: Import legacy 10x matrix/anndata
    - source: Import 10x v3 matrix/anndata
```

One-of-N route, conceptual shape:

```yaml
- label: Run mode A
  in:
    - id: when
      source: mode_a_boolean
  when: $(inputs.when)

- label: Run mode B
  in:
    - id: when
      source: mode_b_boolean
  when: $(inputs.when)

- label: Run mode C
  in:
    - id: when
      source: mode_c_boolean
  when: $(inputs.when)

- label: Pick routed output
  tool_id: pick_value
  in:
    - source: Run mode A/output
    - source: Run mode B/output
    - source: Run mode C/output
```

These snippets are conceptual. Use the cited gxformat2 exemplars for exact serialized shapes.

## Pitfalls

- Forgetting the merge. A gated branch output may be absent. Downstream steps should consume `pick_value`, not one branch directly.
- Non-exclusive booleans. If two branches can run at once, `pick_value` chooses by input order. That may hide an upstream routing bug.
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
