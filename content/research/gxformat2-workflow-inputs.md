---
type: research
title: "gxformat2 workflow inputs"
tags:
  - target/galaxy
status: draft
created: 2026-05-05
revised: 2026-05-06
revision: 2
ai_generated: true
related_notes:
  - "[[gxformat2-schema]]"
  - "[[galaxy-collection-semantics]]"
  - "[[galaxy-datatypes-conf]]"
  - "[[galaxy-workflow-testability-design]]"
  - "[[nextflow-params-to-galaxy-inputs]]"
  - "[[nextflow-path-glob-to-galaxy-datatype]]"
sources:
  - "https://github.com/galaxyproject/gxformat2/blob/main/schema/v19_09/workflow.yml"
  - "https://github.com/galaxyproject/gxformat2/blob/main/schema/v19_09/Process.yml"
  - "https://github.com/galaxyproject/gxformat2/blob/main/gxformat2/normalized/_conversion.py"
  - "https://github.com/galaxyproject/gxformat2/blob/main/gxformat2/normalized/_format2.py"
  - "https://github.com/galaxyproject/gxformat2/blob/main/gxformat2/schema/gxformat2.py"
  - "https://github.com/galaxyproject/gxformat2/blob/main/gxformat2/lint.py"
  - "https://github.com/galaxyproject/galaxy/blob/dev/lib/galaxy/workflow/modules.py"
  - "https://github.com/galaxyproject/galaxy/blob/dev/lib/galaxy/workflow/workflow_parameter_input_definitions.py"
summary: "Conceptual model, current aliases, and schema gaps for gxformat2 workflow inputs."
---

# gxformat2 workflow inputs

Use this note when translating or authoring the top-level `inputs:` section of a gxformat2 workflow. [[gxformat2-schema]] gives the closed vocabulary, but not the authoring posture: which aliases are current, which fields drive Galaxy runtime behavior, and which schema gaps should be annotated upstream.

## Conceptual model

A gxformat2 workflow input is a top-level workflow interface item. Galaxy imports it as one of three native input step families:

| gxformat2 type | Native Galaxy step | Meaning | Authoring guidance |
|---|---|---|---|
| `data`, `File` | `data_input` | One Galaxy dataset input. | Prefer `data`. Treat `File` as CWL-friendly alias accepted for compatibility. |
| `collection` | `data_collection_input` | One Galaxy dataset collection input. | Pair with `collection_type`; if absent, Galaxy defaults to `list`. |
| `string`, `int`, `float`, `boolean` | `parameter_input` | Scalar workflow parameter exposed at invocation. | Prefer current gxformat2 spellings: `string`, `int`, `float`, `boolean`. |
| `[<scalar-type>]` | `parameter_input` with `multiple: true` in native state | Multiple primitive values. | Supported by conversion code for simple arrays. |

The current conversion code makes the alias split explicit. Native Galaxy stores parameter inputs as `text` and `integer`, but gxformat2 normalized export converts them to `string` and `int`. Import accepts both spellings and converts `string -> text`, `int -> integer` for native state.

## Current vs compatibility aliases

Author new gxformat2 with the current normalized export vocabulary:

| Use in new gxformat2 | Also accepted | Evidence |
|---|---|---|
| `data` | `File`, `data_input` | SALAD documents `File` as a `data` alias; normalization maps `File` and `data_input` to `data`. |
| `collection` | `data_collection`, `data_collection_input` | Native input steps are not gxformat2 steps; SALAD says native input step types should be represented under `inputs`; normalization maps native aliases to `collection`. |
| `string` | `text` | SALAD says `text` aliases `string` because Galaxy tools use `text`; export emits `string`. |
| `int` | `integer` | SALAD says `integer` aliases `int` because Galaxy tools use `integer`; export emits `int`. |
| `float` | `double` in parts of primitive vocabulary | Galaxy native workflow parameter inputs expose `float`. `double` is treated as numeric by gxformat2 lint default validation, but should not be presented as preferred authoring vocabulary. |
| `boolean` | none meaningful | Native and gxformat2 agree. |

The generated structural JSON Schema includes `null`, `long`, `double`, `integer`, `text`, and `File` because it flattens primitive/SALAD vocabulary. That enum is permissive vocabulary, not a current-authoring recommendation.

## Cross-cut fields

### `optional` and `default`

`optional` controls whether Galaxy requires the workflow input at invocation. It defaults to `false` in SALAD and in native modules. `default` is inherited from the CWL-ish `InputParameter` base and is applied when the input object is missing or `null`.

Runtime behavior differs by input family:

- Dataset and collection inputs read `default` only when no invocation value is supplied; the default is converted through `raw_to_galaxy`.
- Parameter inputs read `default` when no invocation value is supplied; non-dict defaults are wrapped as `{value: <default>}` before extracting the value.
- The Galaxy parameter-input editor carries a backwards-compatibility conditional around defaults, but the code comment says defaults can now be set for optional and required parameters.

IWC Corpus Shape:

| Shape | Count |
|---|---:|
| required, no default | 520 |
| required, default | 67 |
| optional, default | 84 |
| optional, no default | 46 |

Guidance: do not infer `optional: true` merely because `default` exists. IWC has required parameters with defaults, especially thresholds and numeric settings. Use `optional: true` when omission is semantically acceptable; use `default` when Galaxy should supply a value if the user omits or nulls the input.

### `format`

`format` is optional and applies to dataset and collection inputs. Galaxy uses it as datatype-extension filtering for valid datasets. It is good hygiene and should be encouraged when the author is confident about the datatype extension, but it is better to omit `format` than to encode a weak guess. Valid extension vocabulary should cite [[galaxy-datatypes-conf]].

### `collection_type`

`collection_type` applies to `type: collection`. SALAD documents default `list` and colon-separated nested types. [[galaxy-collection-semantics]] is the broader authority for valid Galaxy collection shapes.

### `restrictions`, `suggestions`, and `restrictOnConnections`

These fields are current Galaxy behavior but are not declared in the SALAD input records or the generated JSON Schema.

`restrictions` is a static closed option list for text inputs. Galaxy turns a text parameter with restrictions into a select input at runtime.

`suggestions` is a static open suggestion list for text inputs. Galaxy passes suggestions as options without switching the parameter type to select.

`restrictOnConnections` asks Galaxy to derive a text input's valid choices from connected tool/subworkflow select options at runtime.

Option item shape is either a scalar value or an object with `value` and optional `label`; Galaxy converts both into runtime options and serializes colon-delimited editor state back into the source shape.

### Input tags

Native Galaxy data and collection input modules expose a `tag` field used as a runtime input filter. The generated gxformat2 conversion currently does not copy `tag` from native input steps into top-level gxformat2 inputs.

Corpus status: native cleaned IWC workflows have `tag` present on 266 data/collection input step states, but every value is empty string or null. No non-empty workflow-input tag filter was observed. Generated gxformat2 workflows still contain many unrelated tool-state `tag` and output `tags` fields, so searches for `tag:` in whole files are not evidence for top-level input tags.

Guidance: treat input `tag` as real native Galaxy behavior but not yet gxformat2 interface vocabulary. If gxformat2 should preserve it, add it deliberately to the SALAD data/collection input records and conversion key lists.

## Open questions

- Should `long` and `double` get explicit native mappings (`long -> integer`, `double -> float`) or remain permissive primitive vocabulary outside the preferred gxformat2 authoring set?
- Should `tag` be added to gxformat2 inputs now, or deferred until a non-empty corpus example or user need appears?
