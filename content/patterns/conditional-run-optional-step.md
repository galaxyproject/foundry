---
type: pattern
pattern_kind: operation
evidence: corpus-and-verified
title: "Conditional: run optional step"
aliases:
  - "boolean-gated optional step"
  - "Galaxy when gate"
  - "optional branch with when"
tags:
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-05-03
revision: 4
ai_generated: true
summary: "Use a workflow boolean connected as inputs.when to skip an optional Galaxy step or branch."
related_notes:
  - "[[iwc-conditionals-survey]]"
  - "[[iwc-parameter-derivation-survey]]"
related_patterns:
  - "[[conditional-route-between-alternative-outputs]]"
  - "[[conditional-gate-on-nonempty-result]]"
  - "[[conditional-transform-or-pass-through]]"
  - "[[collection-cleanup-after-mapover-failure]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
verification_paths:
  - verification/workflows/conditional-run-optional-step/run-optional-step.gxwf-test.yml
iwc_exemplars:
  - workflow: genome_annotation/annotation-braker3/Genome_annotation_with_braker3
    steps:
      - label: "Gate BUSCO on predicted protein sequences"
      - label: "Gate genome BUSCO from the same user boolean"
    why: "Shows repeated optional assessment branches controlled by one workflow boolean."
    confidence: high
  - workflow: transcriptomics/rnaseq-pe/rnaseq-pe
    steps:
      - label: "Gate optional StringTie FPKM branch"
      - label: "Gate optional Cufflinks FPKM branch"
    why: "Shows peer optional quantification branches gated by workflow choices."
    confidence: high
  - workflow: VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation
    steps:
      - label: "Gate multi-step suffixing branch"
    why: "Shows a multi-step optional branch where downstream fallback belongs to a separate transform-or-pass-through pattern."
    confidence: high
---

# Conditional: run optional step

## Tool

Use Galaxy workflow `when:` gating. Expose a boolean workflow input, connect it to each optional step as an input named `when`, and set:

```yaml
when: $(inputs.when)
```

This is a workflow-control shape, not a tool-specific recipe. The gated tool can be BUSCO, StringTie, Cufflinks, text-processing, or any other ordinary Galaxy step.

## When to reach for it

Use this when a user-facing boolean decides whether an optional analysis, report, export, or small branch runs.

Use it for optional side branches whose outputs are only meaningful when the branch runs. If downstream always needs one replacement value, add a `pick_value` merge instead; use [[conditional-route-between-alternative-outputs]] or [[conditional-transform-or-pass-through]].

Do not use this for collection cleanup after map-over failures. If the problem is empty or failed collection elements, use [[collection-cleanup-after-mapover-failure]].

Do not use this for data-derived emptiness checks unless you first compute a boolean from the data. That is [[conditional-gate-on-nonempty-result]], not this direct user-boolean gate.

## Parameters

- Workflow input: boolean, named for the user decision, e.g. `Include BUSCO`, `Compute StringTie FPKM`, or `Do you want to add suffixes to the scaffold names?`.
- Step input: connect that boolean to an input port with `id: when`.
- Step gate: set `when: $(inputs.when)` on every step that belongs to the optional branch.

For a multi-step optional branch, repeat the same boolean connection and `when:` expression on each gated step. Do not rely on one upstream gated step to implicitly suppress every downstream consumer; make the branch boundary explicit.

The `when` source does not have to be a raw workflow boolean. If the workflow-facing input is an enum, integer, text value, or inverted boolean, normalize it first with `map_param_value` and connect `output_param_boolean` as `id: when`.

If multiple mapped booleans select among peer alternatives and downstream needs one merged output, use [[conditional-route-between-alternative-outputs]] instead.

## Idiomatic Shapes

Single optional tool step:

```yaml
- id: Optional report
  tool_id: toolshed.example/report_tool/report_tool/1.0
  in:
    - id: input
      source: Main analysis/output
    - id: when
      source: Run optional report?
  out:
    - id: report
  when: $(inputs.when)
```

Multi-step optional branch, same user boolean on each optional step:

```yaml
- id: Compose optional expression
  tool_id: toolshed.g2.bx.psu.edu/repos/iuc/compose_text_param/compose_text_param/0.1.1
  in:
    - id: components_1|param_type|component_value
      source: Optional suffix
    - id: when
      source: Add suffixes?
  out:
    - id: out1
  when: $(inputs.when)

- id: Apply optional suffix
  tool_id: toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_replace_in_line/9.5+galaxy3
  in:
    - id: infile
      source: Input FASTA
    - id: replacements_0|replace_pattern
      source: Compose optional expression/out1
    - id: when
      source: Add suffixes?
  out:
    - id: outfile
  when: $(inputs.when)
```

The second shape is conceptual, derived from the VGP Hi-C suffixing branch. The corpus workflow then uses `pick_value` to choose suffixed output or original input, which is outside this page's operation boundary.

## Pitfalls

- Forgetting the `when` input connection. The observed IWC shape connects a boolean into `id: when` and uses `when: $(inputs.when)`.
- Gating only the first step of a branch. If later optional steps should also disappear, put `when:` on those steps too.
- Consuming a missing optional output unconditionally. If downstream requires a value regardless of the boolean, add an explicit merge/fallback with `pick_value`.
- Confusing user choice with data-derived choice. Empty/non-empty result checks need a separate boolean-producing shim before `when:`.
- Duplicating normalization logic inside optional tools. If the gate depends on a derived boolean, compute it once and connect that boolean as `id: when`.
- Leading with `__FILTER_NULL__` as conditional cleanup. The survey found zero `__FILTER_NULL__` hits in the IWC corpus; keep it as catalog knowledge, not the corpus-backed authoring path.

## See Also

- [[iwc-conditionals-survey]] — Candidate A decision and boundaries with route/non-empty candidates.
- [[iwc-parameter-derivation-survey]] — parameter survey boundary for mapped booleans.
- [[galaxy-conditionals-patterns]] — conditionals MOC.
- [[conditional-route-between-alternative-outputs]] — mutually exclusive branches merged by `pick_value`.
- [[conditional-gate-on-nonempty-result]] — booleans computed from dataset or collection emptiness.
- [[collection-cleanup-after-mapover-failure]] — cleanup for empty or failed mapped datasets.
