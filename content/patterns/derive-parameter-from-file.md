---
type: pattern
pattern_kind: operation
evidence: corpus-and-verified
title: "Parameter: derive from file"
aliases:
  - "file-to-parameter bridge"
  - "read scalar parameter from file"
  - "count-to-parameter"
  - "derive-count-parameter-from-file-or-collection"
tags:
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-05-03
revision: 3
ai_generated: true
summary: "Read a one-value dataset with param_value_from_file, including count recipes that feed typed parameters."
related_notes:
  - "[[iwc-parameter-derivation-survey]]"
  - "[[iwc-conditionals-survey]]"
related_patterns:
  - "[[conditional-gate-on-nonempty-result]]"
  - "[[tabular-compute-new-column]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
verification_paths:
  - verification/workflows/derive-parameter-from-file/derive-integer-from-file.gxwf-test.yml
iwc_exemplars:
  - workflow: VGP-assembly-v2/kmer-profiling-hifi-VGP1/kmer-profiling-hifi-VGP1
    why: "Reads homozygous read coverage as a float and estimated genome size as an integer parameter."
    confidence: high
  - workflow: epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun
    why: "Converts table-derived minima and replicate counts through text and integer parameter ports before downstream subsampling."
    confidence: high
  - workflow: virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping
    why: "Turns line counts into integer parameters used as collection duplication counts."
    confidence: high
  - workflow: amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction
    why: "Counts collection identifiers, converts the count to a boolean, then reads it through boolean_param."
    confidence: high
---

# Parameter: derive from file

## Tool

Use `param_value_from_file` when an upstream dataset contains exactly one scalar value that must become a connected Galaxy runtime parameter.

The corpus-backed shape is:

```text
dataset -> param_value_from_file -> downstream tool parameter
```

`param_type` selects the typed output port: `integer_param`, `float_param`, `text_param`, or `boolean_param`. In the observed scalar-read examples, `remove_newlines: true` is the normal setting.

## When to reach for it

Use this when a workflow computes or receives a small file containing one value, and a downstream tool needs that value as a typed parameter rather than as a dataset input.

Good fits include computed genome sizes, coverage estimates, minimum counts, repeat counts, line counts, file-derived text, and boolean shims.

Do not use this for ordinary tabular transformations whose output remains a dataset; use tabular patterns such as [[tabular-compute-new-column]].

Do not use this for dynamic expression strings built directly from parameters; use [[compose-runtime-text-parameter]].

Do not center non-empty gating here. If the user story is "skip downstream work when empty," use [[conditional-gate-on-nonempty-result]].

## Operation Boundary

This pattern covers file-to-parameter bridging:

- input fact: a dataset contains one scalar value, or an upstream count recipe produces one scalar value;
- output action: expose that scalar as a Galaxy typed runtime parameter port;
- bridge mechanism: `param_value_from_file`.

It covers file-to-integer, file-to-float, file-to-text, file-to-boolean, count-to-integer, and collection-size-to-boolean when explaining the bridge.

It does not cover enum mapping, runtime text composition, branch topology after a boolean exists, general column computation, or collection cleanup.

## Parameters

- `input1`: connected scalar dataset.
- `param_type`: set to `integer`, `float`, `text`, or `boolean`; downstream steps must connect the matching typed output port.
- `remove_newlines`: set `true` for one-value files unless the downstream text parameter explicitly needs line breaks.

Changing `param_type` changes which output port is meaningful. A generated workflow must connect `integer_param` to integer inputs, `float_param` to float inputs, and so on.

## Count, Then Parameterize

Use `wc_gnu` with `options: [lines]` when a line count must drive a downstream integer parameter. For collections, first expose element identifiers with `collection_element_identifiers`, then count those identifier rows.

The reusable operation is still "produce a scalar file, then parameterize it":

```text
dataset -> wc_gnu(options: [lines]) -> param_value_from_file(param_type: integer)
```

For collection non-empty booleans, the corpus adds a tabular boolean step:

```text
collection -> collection_element_identifiers -> wc_gnu -> column_maker(c1 != 0) -> param_value_from_file(param_type: boolean)
```

That final shape belongs operationally to [[conditional-gate-on-nonempty-result]] when it feeds `when`.

## Tabular Scalar Round Trip

Some workflows compute one value in tabular-land, then escape back to parameter-land. Consensus peaks uses `table_compute` to get a minimum value, then reads that value back with `param_value_from_file`. MGnify uses `column_maker` only to turn a count into `c1 != 0` before reading the result as a boolean.

Keep the tabular mechanics on the tabular page. This page owns the escape hatch from one-value dataset to typed parameter.

## Idiomatic Shapes

Conceptual scalar read:

```yaml
tool_id: param_value_from_file
in:
  - id: input1
    source: upstream_scalar_file
out:
  - id: integer_param
tool_state:
  input1:
    __class__: ConnectedValue
  param_type: integer
  remove_newlines: true
```

Conceptual count-to-integer:

```text
dataset -> wc_gnu(options: [lines]) -> param_value_from_file(param_type: integer)
```

Conceptual collection non-empty boolean:

```text
collection -> collection_element_identifiers -> wc_gnu -> column_maker(c1 != 0) -> param_value_from_file(param_type: boolean)
```

## Pitfalls

- Do not connect the dataset output when the downstream tool expects a typed parameter port.
- Do not connect the wrong typed output port after changing `param_type`.
- Do not leave newlines in one-value scalar files unless downstream text syntax requires them.
- Do not treat `wc_gnu` output as numeric until `param_value_from_file` converts it.
- Do not bury the operation under `wc_gnu`; counts are just one upstream scalar-producing recipe.
- Do not duplicate [[conditional-gate-on-nonempty-result]]. If the user story is "skip when empty," the conditional page owns the recommendation.
- Do not present MGnify's four-step boolean shim as best. It is corpus-backed but clunky and pending verified-pattern issue #84.

## See Also

- [[iwc-parameter-derivation-survey]] — Candidate A/B decision record.
- [[conditional-gate-on-nonempty-result]] — when a derived boolean feeds `when`.
- [[tabular-compute-new-column]] — when the main operation is tabular computation, not file-to-parameter bridging.
- [[compose-runtime-text-parameter]] — when the goal is to build a text parameter from runtime pieces.
