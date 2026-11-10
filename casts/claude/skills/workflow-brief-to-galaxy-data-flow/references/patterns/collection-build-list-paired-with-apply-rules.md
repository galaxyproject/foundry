---
type: pattern
pattern_kind: operation
evidence: corpus-and-verified
title: "Collection: build list paired with Apply Rules"
aliases:
  - "Apply Rules build list:paired"
  - "promote paired identifier with Apply Rules"
tags:
  - target/galaxy
  - topic/galaxy-transform
  - topic/collection-transform
status: draft
created: 2026-05-02
revised: 2026-10-14
revision: 3
summary: "Use Apply Rules to map a sample column and a read-direction column into a list:paired collection, from flat identifiers or an existing paired level."
related_notes:
  - "[[iwc-transformations-survey]]"
  - "[[galaxy-apply-rules-dsl]]"
  - "[[galaxy-paired-or-unpaired-collections]]"
related_patterns:
  - "[[collection-swap-nesting-with-apply-rules]]"
  - "[[collection-split-identifier-via-rules]]"
  - "[[sync-collections-by-identifier]]"
  - "[[harmonize-by-sortlist-from-identifiers]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
verification_paths:
  - verification/workflows/collection-build-list-paired-with-apply-rules/build-list-paired.gxwf-test.yml
iwc_exemplars:
  - workflow: amplicon/dada2/dada2_paired
    steps:
      - label: "Sort samples"
    why: "Rebuilds a list:paired input in sample order. It adds identifier0 and identifier1 as columns, sorts by sample, and maps identifier1 back to paired_identifier so the paired level survives."
    confidence: high
  - workflow: data-fetching/parallel-accession-download/parallel-accession-download
    steps:
      - label: "flatten paired output"
    why: "Drops the outer split-file level from mapped-over fasterq-dump output. Maps identifier1 to list_identifiers and the existing forward/reverse identifier2 to paired_identifier, turning list:list:paired into list:paired."
    confidence: high
  - workflow: data-fetching/sra-manifest-to-concatenated-fastqs/sra-manifest-to-concatenated-fastqs
    steps:
      - id: 12
    why: "Extracts the sample name from relabeled <accession>___<sample> identifiers with an add_column_regex rule, then groups runs under samples as list:list:paired while keeping identifier2 as the paired role, so the next step concatenates reads per sample and strand."
    confidence: high
  - workflow: microbiome/mags-building/MAGs-generation
    steps:
      - id: 19
    why: "Wraps each sample of a list:paired input in its own one-element list by mapping identifier0 twice as list_identifiers and identifier1 as paired_identifier, so metaSPAdes maps over samples and receives a list:paired per job."
    confidence: medium
---

# Collection: build list paired with Apply Rules

`__APPLY_RULES__` produces a `list:paired` collection when its rule table has one column for the sample and one for the read direction. Map the sample column with `list_identifiers` and the direction column with `paired_identifier`. Galaxy groups rows by those values and normalizes the direction to `forward` or `reverse`. The direction column comes either from an existing `forward`/`reverse` level, which is what the IWC exemplars do, or from a regex over flat identifiers such as `sampleA_R1`.

## Pair flat read identifiers

For a flat `list` whose identifiers end in `_R1` or `_R2`, one regex rule supplies both columns:

```yaml
tool_id: __APPLY_RULES__
tool_state:
  input: { __class__: ConnectedValue }
  rules:
    rules:
      - type: add_column_metadata
        value: identifier0
      - type: add_column_regex
        target_column: 0
        expression: '^(.+)_(R[12])$'
        group_count: 2
    mapping:
      - type: list_identifiers
        columns: [1]
      - type: paired_identifier
        columns: [2]
```

`rules` is one parameter holding two lists. Its inner `rules:` builds the table and its `mapping:` turns columns into collection levels, with each mapping entry naming `columns`. Column 0 is the original identifier. The regex appends the sample as column 1 and `R1` or `R2` as column 2. The output collection type follows from the mapping: one `list_identifiers` column plus `paired_identifier` gives `list:paired`.

The checked-in test under `verification/workflows/collection-build-list-paired-with-apply-rules/` runs this step on `sampleB_R2, sampleA_R1, sampleB_R1, sampleA_R2` and asserts each sample's `forward` and `reverse` file. Rows do not need to be adjacent or sorted. The builder places each dataset at its mapped identifier path, and a `paired` collection always lists `forward` before `reverse`. A `sort` rule only changes the order of samples in the output list.

No IWC workflow derives the read direction from flat identifiers this way. The form is documented in [[galaxy-apply-rules-dsl]] and checked by the verified workflow.

## Keep an existing paired level while regrouping

When the input already has a `forward`/`reverse` level, Apply Rules rebuilds the collection from columns, so that level survives only if it is mapped again with `paired_identifier`. Mapping every identifier column to `list_identifiers` turns the pair into another list level keyed `forward` and `reverse`. Every IWC workflow that maps `paired_identifier` uses this form:

| Input | Mapping | Output | Exemplar |
|---|---|---|---|
| `list:paired` | `list_identifiers: [0]`, `paired_identifier: [1]`, after `sort` on column 0 | `list:paired` in sample order | `amplicon/dada2/dada2_paired` |
| `list:list:paired` | `list_identifiers: [1]`, `paired_identifier: [2]` | `list:paired` without the outer level | `data-fetching/parallel-accession-download/parallel-accession-download` |
| `list:list:paired` with `<accession>___<sample>` outer identifiers | `list_identifiers: [3, 1]`, `paired_identifier: [2]`, where column 3 is the regex-extracted sample | `list:list:paired` grouped by sample | `data-fetching/sra-manifest-to-concatenated-fastqs/sra-manifest-to-concatenated-fastqs` |
| `list:paired` | `list_identifiers: [0, 2]`, `paired_identifier: [1]`, where column 2 repeats identifier0 | `list:list:paired` with one sample per outer element | `microbiome/mags-building/MAGs-generation` |

For example, the second row drops the outer level:

```yaml
rules:
  rules:
    - type: add_column_metadata
      value: identifier0
    - type: add_column_metadata
      value: identifier1
    - type: add_column_metadata
      value: identifier2
  mapping:
    - type: list_identifiers
      columns: [1]
    - type: paired_identifier
      columns: [2]
```

Dropping a level is safe only when the remaining identifier path stays unique. Two rows with the same final path overwrite each other rather than failing.

## Accepted read-direction values

Galaxy lowercases the `paired_identifier` cell and accepts these values:

| Cell value, any case | Becomes |
|---|---|
| `f`, `1`, `r1`, `forward` | `forward` |
| `r`, `2`, `r2`, `reverse` | `reverse` |

Any other value fails the job with `Unknown indicator of paired status encountered`. Capture the whole direction token. `R1` means forward, while a regex that captures only `R` yields reverse for both mates. Values such as `fwd`, `rev`, `_1`, or `read1` need a cleanup rule first.

Normalization applies only to the `paired_identifier` column. A second `list_identifiers` column keeps `R1` and `R2` as literal list keys and produces `list:list`, which is the shape [[collection-split-identifier-via-rules]] builds on purpose.

For a mix of paired and single-end samples, map the direction with `paired_or_unpaired_identifier` instead. It also accepts `u` and `unpaired`, and produces `list:paired_or_unpaired`. [[galaxy-paired-or-unpaired-collections]] describes the type.

## Choose Apply Rules or zip

`__ZIP_COLLECTION__` takes two datasets, `input_forward` and `input_reverse`, and returns one `paired` collection. Mapped over two sibling lists it produces `list:paired`. Galaxy matches the two lists by position, not by element identifier, so they must have the same length and the same sample order. [[harmonize-by-sortlist-from-identifiers]] reorders one list to match the other, and [[sync-collections-by-identifier]] removes unmatched elements.

Choose zip when forward and reverse reads already exist as separate, aligned collections. Choose Apply Rules when one collection already carries both the sample and the direction in its identifiers or nesting. In IWC, two workflows use zip and five map `paired_identifier` with Apply Rules. One of the five embeds another as a subworkflow.

## Check the paired output

- **A sample with one mate.** Galaxy's builder does not check that both directions exist. In current source, a sample with only `R1` becomes a `paired` element holding only `forward`. Filter or validate inputs upstream when a missing mate is possible. Under `paired_or_unpaired_identifier`, the source instead relabels a lone `forward` as `unpaired`.
- **`u` under `paired_identifier`.** In current source, `u` and `unpaired` normalize to `unpaired`, which a `paired` collection does not keep, so that dataset disappears from the output. Use `paired_or_unpaired_identifier` for single-end reads.
- **Duplicate direction values.** If two rows for one sample both normalize to `forward`, such as reads from two lanes whose identifiers reduce to the same sample, the later row replaces the earlier one without an error.
- **Column numbers after regex rules.** Each `add_column_regex` appends columns at the end of the table. Recount before writing the mapping, especially after `remove_columns`.
- **Unmatched identifiers.** A regex that does not match fails the job. With `allow_unmatched: true` the direction cell is empty instead, which then fails pairing.

Check the result by contents as well as structure. A correct `list:paired` element count can hide swapped mates or crossed samples.

## See also

- [[galaxy-apply-rules-dsl]]—rule and mapping reference, including `paired_identifier`.
- [[iwc-transformations-survey]]—Apply Rules Shape C and the zip comparison.
- [[collection-split-identifier-via-rules]]—split one identifier into two list levels.
- [[collection-swap-nesting-with-apply-rules]]—swap existing list levels.
