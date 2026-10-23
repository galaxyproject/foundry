---
type: pattern
pattern_kind: recipe
evidence: corpus-and-verified
title: "Conditional: gate on non-empty result"
aliases:
  - "gate on nonempty result"
  - "skip reporting on empty output"
  - "data-derived when gate"
tags:
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-10-23
revision: 4
summary: "Derive a boolean from a collection's element count or a dataset's text, then use when to skip report or export steps on empty results."
related_notes:
  - "[[iwc-conditionals-survey]]"
  - "[[iwc-parameter-derivation-survey]]"
related_patterns:
  - "[[conditional-run-optional-step]]"
  - "[[conditional-route-between-alternative-outputs]]"
  - "[[conditional-transform-or-pass-through]]"
  - "[[collection-cleanup-after-mapover-failure]]"
  - "[[cleanup-sync-and-publish-nonempty-results]]"
  - "[[derive-parameter-from-file]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
verification_paths:
  - verification/workflows/conditional-gate-on-nonempty-result/gate-on-nonempty.gxwf-test.yml
iwc_exemplars:
  - workflow: amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction
    steps:
      - id: 36
      - id: 40
      - id: 41
      - id: 43
      - id: 42
        label: "Krona SSU SILVA"
      - id: 45
        label: "HDF5 SSU SILVA"
      - id: 46
        label: "JSON SSU SILVA"
    why: "Steps 36, 40, 41, and 43 are unlabeled copies of an embedded subworkflow named 'Map empty/not empty collection to boolean'. Each counts the elements of one Filter Empty output and gates the steps that read it: 36 counts step 28 for Krona SSU SILVA, 41 counts step 35 for HDF5 and JSON SSU SILVA, and 40 and 43 do the same for the LSU Krona and BIOM steps 44, 47, and 48."
    confidence: high
  - workflow: VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation
    steps:
      - id: 53
        label: "Test if Q telomere track is empty"
      - id: 54
        label: "Test if P telomere track is empty"
      - id: 57
        label: "False if Q telomere track is empty"
      - id: 58
        label: "False if P telomere track is empty"
      - id: 62
        label: "Add P telomere track - Multimapping"
      - id: 63
        label: "Add P telomere track"
      - id: 68
        label: "Add Q telomere track - Multimapping"
      - id: 69
        label: "Add Q telomere track"
    why: "Steps 53 and 54 read each telomere BED as text, and steps 57 and 58 map empty text to false. The booleans gate the pretext_graph steps that add each track (62, 63, 68, 69), and pick_value steps 65, 66, 71, and 72 fall back to the map without that track."
    confidence: high
  - workflow: VGP-assembly-v2/Assembly-decontamination-VGP9/Assembly-decontamination-VGP9
    steps:
      - id: 9
    why: "Step 9 is an unlabeled embedded subworkflow named 'Modify action report'. It counts the adaptor report's lines with wc_gnu, keeps the count with Show tail1, reads it as an integer, and maps 1, a header-only report, to False. The boolean gates the masking steps, and pick_value falls back to the original report."
    confidence: high
---

# Conditional: gate on non-empty result

A Galaxy step with `when: $(inputs.when)` runs only when its `when` input is the boolean `true`. A dataset or collection cannot fill that input directly, so a workflow that should skip report or export steps on an empty result first derives a boolean from the data. The IWC workflows cited here use three shims. One counts a collection's elements, one reads a dataset as text and maps the empty string to `false`, and one maps a dataset's line count to a boolean. Connect the resulting boolean to every step that should not run on empty input.

This recipe skips whole steps. To drop empty or failed elements from a collection, use [[collection-cleanup-after-mapover-failure]]. When a user chooses whether a branch runs, connect their boolean directly, as [[conditional-run-optional-step]] shows.

## Choose the shim

| Input | Shim | Gate is `false` when | Corpus example |
|---|---|---|---|
| A `list` collection | `collection_element_identifiers` → `wc_gnu` → `column_maker` → `param_value_from_file` (boolean) | The list has no elements | MGnify amplicon rRNA prediction |
| A dataset | `param_value_from_file` (text) → `map_param_value` | The dataset is zero bytes or holds only whitespace | VGP Hi-C contact map |
| A table with a header line | `wc_gnu` → `Show tail1` → `param_value_from_file` (integer) → `map_param_value` | The table has only its header line | VGP assembly decontamination |

Each shim means something different by empty. The collection shim counts elements and never opens their datasets, so a list whose only element is a zero-byte dataset opens the gate. When empty should mean no data, run `__FILTER_EMPTY_DATASETS__` first and count its output, as MGnify does. [[collection-cleanup-after-mapover-failure]] covers that filter, and [[cleanup-sync-and-publish-nonempty-results]] puts the cleanup and the gate in one sequence. The text shim trims whitespace before it compares, so a dataset holding only a newline closes the gate. Filter Empty treats that same file as data and keeps it. The line-count shim handles a tool that writes a header even when it finds nothing, which Filter Empty and the text shim both count as content.

The verified workflow exercises the first two shims. The line-count shim is described from the corpus only.

## Gate on a collection's element count

These four steps, from the verified workflow, turn the `results` list into the boolean `has_elements/boolean_param`:

```yaml
- id: identifiers
  label: identifiers
  tool_id: toolshed.g2.bx.psu.edu/repos/iuc/collection_element_identifiers/collection_element_identifiers/0.0.3
  tool_version: 0.0.3
  tool_shed_repository:
    changeset_revision: 3e27acfa4830
    name: collection_element_identifiers
    owner: iuc
    tool_shed: toolshed.g2.bx.psu.edu
  in:
    - id: input_collection
      source: results
  out:
    - id: output
  tool_state:
    input_collection:
      __class__: ConnectedValue
- id: count_identifiers
  label: count_identifiers
  tool_id: wc_gnu
  tool_version: 1.0.0
  in:
    - id: input1
      source: identifiers/output
  out:
    - id: out_file1
  tool_state:
    include_header: false
    input1:
      __class__: ConnectedValue
    options:
      - lines
- id: count_to_boolean_table
  label: count_to_boolean_table
  tool_id: toolshed.g2.bx.psu.edu/repos/devteam/column_maker/Add_a_column1/2.1
  tool_version: "2.1"
  tool_shed_repository:
    changeset_revision: aff5135563c6
    name: column_maker
    owner: devteam
    tool_shed: toolshed.g2.bx.psu.edu
  in:
    - id: input
      source: count_identifiers/out_file1
  out:
    - id: out_file1
  tool_state:
    avoid_scientific_notation: false
    error_handling:
      auto_col_types: true
      fail_on_non_existent_columns: true
      non_computable:
        action: --fail-on-non-computable
    input:
      __class__: ConnectedValue
    ops:
      header_lines_select: "no"
      expressions:
        - cond: c1 != 0
          add_column:
            mode: R
            pos: "1"
- id: has_elements
  label: has_elements
  tool_id: param_value_from_file
  tool_version: 0.1.0
  in:
    - id: input1
      source: count_to_boolean_table/out_file1
  out:
    - id: boolean_param
  tool_state:
    input1:
      __class__: ConnectedValue
    param_type: boolean
    remove_newlines: true
```

`collection_element_identifiers` writes one line per element, and `wc_gnu` counts those lines. Set `include_header: false`, because the tool's default writes a `#lines` header that `column_maker` would then have to skip. `column_maker` replaces column 1 (`mode: R`, `pos: "1"`) with the result of `c1 != 0`, so the file reads `True` or `False`. For an empty list, the verified workflow's `count_to_boolean_table` output is exactly `False` followed by a newline. `param_value_from_file` with `param_type: boolean` reads `true`, `false`, `yes`, `no`, `1`, and `0` in any case. For any other value its expression returns the string `NOT A BOOLEAN VALUE` instead of a boolean output. Connect its `boolean_param` output, not the dataset.

MGnify uses the same four tools, with `collection_element_identifiers` 0.0.2, packaged as an embedded subworkflow. The verified workflow pins the current 0.0.3 release.

## Gate on a dataset's text

These two steps turn the `table` dataset into `table_has_content/output_param_boolean`:

```yaml
- id: table_text
  label: table_text
  tool_id: param_value_from_file
  tool_version: 0.1.0
  in:
    - id: input1
      source: table
  out:
    - id: text_param
  tool_state:
    input1:
      __class__: ConnectedValue
    param_type: text
    remove_newlines: true
- id: table_has_content
  label: table_has_content
  tool_id: toolshed.g2.bx.psu.edu/repos/iuc/map_param_value/map_param_value/0.2.0
  tool_version: 0.2.0
  tool_shed_repository:
    changeset_revision: 022a635f2283
    name: map_param_value
    owner: iuc
    tool_shed: toolshed.g2.bx.psu.edu
  in:
    - id: input_param_type|input_param
      source: table_text/text_param
  out:
    - id: output_param_boolean
  tool_state:
    input_param_type:
      type: text
      input_param:
        __class__: ConnectedValue
      mappings:
        - from: ""
          to: "false"
    output_param_type: boolean
    unmapped:
      on_unmapped: default
      default_value: "true"
```

With `remove_newlines: true`, `param_value_from_file` trims leading and trailing whitespace, so a zero-byte or whitespace-only dataset becomes the empty string. The tool reads at most the first 64,000 bytes, which does not affect an emptiness check. `map_param_value` comes from the IUC tool shed, not from Galaxy itself. The mapping turns `""` into `false`, and `on_unmapped: default` with `default_value: "true"` turns every other value into `true`. Set the `unmapped` block explicitly, as VGP does. The tool's first `on_unmapped` option, `input`, passes the text through and converts it to a boolean, so a dataset containing just `false` or `False` would close the gate.

## Gate on a line count

VGP assembly decontamination checks whether its adaptor report has any rows below the header. Its step 9 subworkflow runs `wc_gnu` with `options: [lines]` and the default header, keeps the last line, which is the count, with `Show tail1`, and reads it with `param_value_from_file` as an integer. `map_param_value` then maps the integer `1` to `False` and, through `on_unmapped: default`, every other count to `True`. The check assumes the report always has exactly one header line. A zero-byte report counts as 0 lines and opens the gate.

## Connect the boolean to each gated step

```yaml
- id: report_identifiers
  label: report_identifiers
  tool_id: cat1
  tool_version: 1.0.0
  in:
    - id: input1
      source: identifiers/output
    - id: when
      source: has_elements/boolean_param
  out:
    - id: out_file1
  tool_state:
    input1:
      __class__: ConnectedValue
  when: $(inputs.when)
```

Add an input with `id: when` whose source is the boolean output, then set `when: $(inputs.when)`. For a step that should run only on empty input, use `when: $(!inputs.when)`. The verified workflow uses that form for its `note_no_elements` and `count_table_lines` steps.

Give every step that should be skipped its own `when` input. Each step evaluates only its own `when`, and a skip does not spread downstream. An ungated consumer receives the skipped step's null placeholder in place of data, as [[conditional-transform-or-pass-through]] explains. MGnify carries a gate on each Krona and BIOM step. When a downstream step needs a value either way, merge the gated output with a fallback through `pick_value`, as VGP Hi-C does for each telomere track.

Count the collection the gated step reads. MGnify has four copies of the counting subworkflow because it gates four different Filter Empty outputs. Step 36 counts step 28, which Krona SSU SILVA reads, and step 41 counts step 35, which the two SSU BIOM conversions read.

## Pitfalls

- **Connecting the collection to `when`.** Galaxy maps the gated step over the collection, so each job sees one element, not the list. Use a shim.
- **Counting before cleanup.** A zero-byte element counts as an element. Filter Empty first when empty data should close the gate.
- **Leaving `unmapped` at its default in the text shim.** The `input` option lets literal `false` text close the gate. Set `on_unmapped: default` with `default_value: "true"`.
- **Changing the `column_maker` output.** `param_value_from_file` produces a boolean only from true/false, yes/no, or 1/0. An expression that writes a count or a label breaks the boolean read.
- **Gating only the first step.** Later consumers receive null placeholders. Gate each one, or merge with `pick_value`.

## Verification

`verification/workflows/conditional-gate-on-nonempty-result/` builds both shims and gates two steps on each boolean, one on `$(inputs.when)` and one on `$(!inputs.when)`. A `pick_value` step with `pick_style: only` reads each pair of gated outputs and errors unless exactly one of them ran. Three cases pass under Planemo against Galaxy `release_26.1`:

1. A one-element list and a one-line table open both gates.
2. An empty list and a zero-byte table close both gates. The negated collection step outputs exactly `False` and a newline.
3. A list whose only element is a zero-byte dataset opens the collection gate. A table holding only a newline closes the text gate.

Planemo does not report a workflow output whose boolean is `false`, so the cases check the negated steps' outputs instead of the `false` booleans.

The fixture README records two shorter routes that failed. Connecting the collection straight to `when` with `$(inputs.when.length > 0)` mapped the step over the elements. An embedded CWL `ExpressionTool` fails gxformat2 schema validation.

## See also

- [[derive-parameter-from-file]] — the `param_value_from_file` bridge for integer, float, and text values.
- [[collection-cleanup-after-mapover-failure]] — Filter Empty and Filter Failed, which clean a collection before it is counted.
- [[cleanup-sync-and-publish-nonempty-results]] — cleanup, sibling sync, and this gate as one recipe.
- [[conditional-transform-or-pass-through]] — gate a step and fall back to the untransformed value.
- [[conditional-run-optional-step]] — `when` on a user-supplied boolean.
- [[iwc-conditionals-survey]] — Candidate C, the corpus evidence for this recipe.
- [[iwc-parameter-derivation-survey]] — the parameter-derivation survey that merged the boolean mechanics into this page.
- [[galaxy-conditionals-patterns]] — the conditional operation map.
