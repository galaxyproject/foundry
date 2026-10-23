---
type: pattern
pattern_kind: operation
evidence: corpus-and-verified
title: "Conditional: transform or pass through"
aliases:
  - "optional transform with fallback"
  - "when-gated transform then pick_value"
  - "transform or keep original"
tags:
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-10-21
revision: 3
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
verification_paths:
  - verification/workflows/conditional-transform-or-pass-through/transform-or-pass-through.gxwf-test.yml
iwc_exemplars:
  - workflow: VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation
    why: "Runs optional haplotype suffixing only when requested, then pick_value selects suffixed or original haplotype output."
    confidence: high
  - workflow: VGP-assembly-v2/Assembly-decontamination-VGP9/Assembly-decontamination-VGP9
    why: "Derives a boolean from the adaptor report's line count, gates the masking rewrite with it, then falls back to the original report when masking does not run."
    confidence: high
---

# Conditional: transform or pass through

## Tool

Gate the optional transform with Galaxy `when:`, then merge the transform's output and the untransformed value with `toolshed.g2.bx.psu.edu/repos/iuc/pick_value/pick_value/0.2.0` at `pick_style: first`. Downstream steps connect to the `pick_value` output and get the transformed value when the transform ran, or the original when it was skipped.

The shape is:

1. Derive or expose a boolean.
2. Connect that boolean to each step of the optional transform as an input with `id: when`.
3. Set `when: $(inputs.when)` on each of those steps.
4. Connect the transform's output to `pick_from_0` and the original value to `pick_from_1`.
5. Connect downstream steps only to the `pick_value` output.

The fallback works because a skipped step still produces outputs. Galaxy makes each one a hidden `expression.json` dataset containing `null`, and `pick_value` reads that dataset as a null candidate. With `first`, it passes over the null and returns the original.

## When to reach for it

Use this when a workflow should optionally alter a dataset, collection, or report while keeping one downstream input slot. The untransformed value must be a valid downstream input on its own. The transform cleans, relabels, or rewrites it when the user asks for that or the data needs it.

Use [[conditional-route-between-alternative-outputs]] instead when the branches are peer routes, such as import mode A or B, one of several annotation modes, or co-assembly versus individual assembly. There each branch produces its own candidate and no original is privileged. Here one candidate is a transform of the other, so both are present whenever the transform runs.

Use [[conditional-run-optional-step]] when the optional branch has only side outputs and nothing downstream needs a replacement value.

Use [[conditional-gate-on-nonempty-result]] to compute a boolean from whether a result is empty. That boolean can then drive this pattern, as the decontamination exemplar does with a line count.

Do not use this to clean up after a mapped tool leaves empty or failed elements. That is [[collection-cleanup-after-mapover-failure]], with `__FILTER_EMPTY_DATASETS__` or `__FILTER_FAILED_DATASETS__`.

## Parameters

On each step of the optional transform:

- An input with `id: when`, connected from a workflow boolean, `map_param_value/output_param_boolean`, or another boolean-producing step.
- `when: $(inputs.when)`.

On the `pick_value` merge step:

- `style_cond.pick_style: first`.
- `style_cond.type_cond.param_type` set to the kind being merged, with the matching output read downstream (`data_param` for datasets).
- The transformed output connected to `style_cond|type_cond|pick_from_0|value` and the original to `style_cond|type_cond|pick_from_1|value`.
- One `pick_from` entry in `tool_state` for each connection. Without them the tool sees zero candidates and writes the text `null`, as the route pattern's verified workflow shows.

The style must be `first`. The original is always non-null, so whenever the transform runs `pick_value` sees two non-null candidates, and `only` fails the job. `first_or_error` and `first_or_default` behave like `first` here, because their fallback cases need every candidate to be null. The expression in the `pick_value` 0.2.0 wrapper defines all four styles.

The transform tool depends on the operation. The IWC exemplars use `compose_text_param`, `tp_replace_in_line`, `Filter1`, and `tp_cat`. What this pattern contributes is the gate and the ordered merge.

Galaxy `release_26.1` also has a built-in `pick_value` workflow module with its own modes. The corpus and this page use the Tool Shed tool.

## Idiomatic Shape

From the verified workflow, which adds a suffix to FASTA headers on request:

```yaml
- id: add_suffix_step
  tool_id: toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_replace_in_line/9.5+galaxy3
  in:
    - id: infile
      source: original
    - id: when
      source: add_suffix
  out:
    - id: outfile
  tool_state:
    infile: { __class__: ConnectedValue }
    replacements:
      - find_pattern: ">.+$"
        replace_pattern: "&.H1"
        sed_options: ""
  when: $(inputs.when)

- id: transformed_or_original
  tool_id: toolshed.g2.bx.psu.edu/repos/iuc/pick_value/pick_value/0.2.0
  in:
    - id: style_cond|type_cond|pick_from_0|value
      source: add_suffix_step/outfile
    - id: style_cond|type_cond|pick_from_1|value
      source: original
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

With `add_suffix: true` the output is the suffixed FASTA. With `add_suffix: false` it is the input file, byte for byte.

In the VGP Hi-C manual-curation workflow, the embedded subworkflow `Add suffix to 2 haplotypes` has this shape twice, once per haplotype. Gated `compose_text_param` steps build each suffix expression, gated `tp_replace_in_line` steps apply it, and two `pick_value` steps at `first` list each suffixed haplotype before `Hap1` or `Hap2`. In Assembly decontamination, the `Modify action report` subworkflow counts the lines of `Adaptor Action report` with `wc_gnu`, reads the count with `param_value_from_file`, and maps it with `map_param_value` (`1` to false, anything else to true). That boolean gates the `Filter1` selections, the `ACTION_TRIM` to `FIX` replacement, and the `tp_cat` that rebuilds the report. A final `pick_value` lists the rebuilt report before the original.

## Pitfalls

- Original listed first. `first` returns the earliest non-null candidate, and the original is never null. With the original in slot 0, the merge returns it even when the transform ran. The verified workflow's `original_first` step shows this.
- `pick_style: only`. It fails the job every time the transform runs, because two candidates are non-null.
- Gating only the first step of a multi-step transform. Each tool step evaluates only its own `when:`. A skip does not spread to steps that consume the skipped output. Galaxy hands an ungated consumer the null placeholder in place of real data. Gate every step that belongs to the transform. Decontamination leaves one step inside its branch ungated, a single-input `pick_value`, which accepts a null input.
- Consuming the transform's output directly. Downstream steps should read the merge, because the transform may have been skipped.
- Duplicating the downstream workflow for each case. Merge once with `pick_value` and continue on one path.
- Wrapping the pass-through in a no-op transform step. Connect the original value directly as the fallback candidate.
- Reaching for `__FILTER_NULL__`. The conditionals survey found no uses of it in IWC. That absence does not make it wrong, but it leaves no exemplar to follow.

## See Also

- [[iwc-conditionals-survey]] — corpus evidence for the transform-then-fallback idiom and its boundary with peer routes.
- [[galaxy-conditionals-patterns]] — conditionals map of content.
- [[conditional-route-between-alternative-outputs]] — `pick_value` across peer alternatives, `pick_style` behavior, and missing `pick_from` entries.
- [[conditional-run-optional-step]] — `when:` gating with no downstream merge.
- [[conditional-gate-on-nonempty-result]] — booleans computed from empty or non-empty results.
- [[collection-cleanup-after-mapover-failure]] — collection-state cleanup, not a `when` plus fallback recipe.
