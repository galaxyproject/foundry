---
type: pattern
pattern_kind: operation
evidence: corpus-and-verified
title: "Collection: regex relabel via tabular"
aliases:
  - "collection regex relabel via tabular"
  - "tp_find_and_replace to RELABEL_FROM_FILE"
  - "collection relabel from identifier table"
tags:
  - target/galaxy
  - topic/galaxy-transform
  - topic/collection-transform
status: draft
created: 2026-05-02
revised: 2026-10-21
revision: 3
summary: "Build an old-to-new identifier table with a tp_find_and_replace regex, then apply it by name with RELABEL_FROM_FILE in tabular mode."
related_notes:
  - "[[iwc-transformations-survey]]"
  - "[[galaxy-collection-tools]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
related_patterns:
  - "[[relabel-via-rules-and-find-replace]]"
  - "[[sync-collections-by-identifier]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
verification_paths:
  - verification/workflows/regex-relabel-via-tabular/regex-relabel-via-tabular.gxwf-test.yml
iwc_exemplars:
  - workflow: virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping
    steps:
      - id: 35
      - id: 36
      - id: 37
      - id: 38
    why: "Extracts the outer identifiers of a list:list as tabular, turns each into an old<TAB>new row with one regex, and relabels the outer level in tabular mode."
    confidence: high
  - workflow: data-fetching/sra-manifest-to-concatenated-fastqs/sra-manifest-to-concatenated-fastqs
    steps:
      - id: 6
      - id: 10
      - id: 11
    why: "Builds the table from a two-column manifest rather than from identifiers, sanitizes the new-name column, and applies one table to both the paired and single-end fasterq_dump collections."
    confidence: high
  - workflow: microbiome/metagenomic-raw-reads-amr-analysis/metagenomic-raw-reads-amr-analysis
    steps:
      - id: 11
      - id: 19
    why: "The positional baseline without a regex: input-collection identifiers relabel a flattened downstream collection in txt mode."
    confidence: low
---

# Collection: regex relabel via tabular

Rename collection elements by deriving each new identifier from the old one with a regex. Extract the identifiers, rewrite each line into an `old<TAB>new` row with `tp_find_and_replace`, and apply the table with `__RELABEL_FROM_FILE__` in `how_select: tabular` mode. The tool looks each element up by name, so the table relabels the right element even when the target collection is in a different order, or is a different collection that shares the identifiers.

The chain has three steps:

1. `collection_element_identifiers` writes one identifier per line, with `change_datatype: tabular`.
2. `tp_find_and_replace` keeps each identifier as column 1 and appends the new label as column 2.
3. `__RELABEL_FROM_FILE__` with `how_select: tabular` renames the target collection's elements from that table.

## When to reach for it

Use this when the collection structure is already right and only the element identifiers need a string transformation, such as stripping a file extension or a tool-added prefix, or appending a sample name.

In IWC the two uses are cleaning generated names and relabeling several sibling collections from one table. The influenza workflow strips a prefix from the outer identifiers of a `list:list`. The SRA workflow relabels both its paired and single-end `fasterq_dump` outputs from one manifest-derived table, and each relabel step uses only the rows whose accession it holds.

Choose a neighbor when the job is different:

- [[relabel-via-rules-and-find-replace]] when the identifiers to change are on an inner level of a nested collection.
- [[sync-collections-by-identifier]] when the new labels are a plain list in collection order, or when a sibling must keep or drop elements to match.
- [[harmonize-by-sortlist-from-identifiers]] when element order must match.
- [[relabel-fasta-headers-via-tabular]] when the labels to change are FASTA headers inside each dataset, not collection identifiers.

## Build the mapping table

`collection_element_identifiers` lists the top-level identifiers in collection order, one per line, with no header. Its wrapper declares a `txt` output, while the relabel tool's tabular modes accept only `tabular` labels, and Galaxy has no txt-to-tabular converter. Set `change_datatype: tabular` on the identifiers step, as the influenza workflow does. `tp_find_and_replace` takes its output datatype from its input, so the table it writes is `tabular` too.

These steps from the verified workflow keep the whole identifier as `$1` and the stem as `$2`:

```yaml
- id: read_identifiers
  tool_id: toolshed.g2.bx.psu.edu/repos/iuc/collection_element_identifiers/collection_element_identifiers/0.0.3
  in:
    - id: input_collection
      source: reads
  out:
    - id: output
      change_datatype: tabular
  tool_state:
    input_collection:
      __class__: ConnectedValue
- id: build_mapping
  tool_id: toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_find_and_replace/9.5+galaxy3
  in:
    - id: infile
      source: read_identifiers/output
  out:
    - id: outfile
  tool_state:
    infile:
      __class__: ConnectedValue
    find_and_replace:
      - find_pattern: '^((.+)\.fastq)$'
        replace_pattern: '$1\t$2'
        is_regex: true
        global: false
        caseinsensitive: false
        wholewords: false
        skip_first_line: false
        searchwhere:
          searchwhere_select: line
```

The identifiers `alpha.fastq`, `beta.fastq`, and `gamma.fastq` become this table:

```text
alpha.fastq	alpha
beta.fastq	beta
gamma.fastq	gamma
```

The patterns go inside the `find_and_replace` repeat, which applies each entry in turn to the output of the one before. The wrapper passes both patterns to a Perl `s/find/replace/` substitution, so captures are `$1`, `$2`, and `$&`, and `\t` in the replacement writes a tab. Single-quote the replacement in gxformat2 so YAML passes `\t` through as two characters. A `/` in either pattern would end the substitution early. Leave `skip_first_line: false`, because the identifier list has no header and skipping the first line drops a real row.

When the new name comes from a manifest instead of the old identifier, the table can start as two columns. The SRA workflow cuts the accession and sample columns from its manifest. A first find/replace entry changes characters that are invalid in identifiers to `-` in the sample column, and a second entry, `(.+)\t(.+)` → `$1\t$1___$2`, makes each new label keep its accession.

## Apply the table

```yaml
- id: relabel_reports
  tool_id: __RELABEL_FROM_FILE__
  in:
    - id: input
      source: reports
    - id: how|labels
      source: build_mapping/outfile
  out:
    - id: output
  tool_state:
    input:
      __class__: ConnectedValue
    how:
      how_select: tabular
      labels:
        __class__: ConnectedValue
      strict: false
```

In `tabular` mode, every row must have exactly two tab-separated columns: the current identifier, then the new one. Use `tabular_extended` with `from` and `to` column numbers when the table has more columns. The tool walks the target collection in its own order and looks up each identifier in the table:

| Situation | `strict: false` | `strict: true` |
|---|---|---|
| Element has a row | Renamed | Renamed |
| Element has no row | Keeps its original identifier | Job fails: `Failed to find original identifier` |
| Row has no element | Ignored | Counts toward the row total, which must equal the element count |
| Two rows name the same element | The later row wins | The later row wins |

The output keeps the input collection's element order and collection type. Only top-level identifiers change. Nested structure, such as the `forward` and `reverse` members of a `list:paired`, is copied unchanged.

Use `strict: false` when one table serves several collections or covers only some elements, as in the SRA workflow. Use `strict: true` when the table should describe exactly this collection, so a missing row stops the run instead of leaving an old name in place.

## Check the result

The verified workflow applies the table above to a sibling collection ordered `gamma.fastq`, `delta.fastq`, `alpha.fastq`. The output is `gamma`, `delta.fastq`, `alpha` in that order, and each element holds its original dataset. `delta.fastq` has no row and keeps its name. The `beta.fastq` row has no element and has no effect.

The job fails, rather than producing a partial collection, when a new label breaks the identifier rules. New labels are trimmed of surrounding whitespace and must match `^[\w\- \.,]+$`: letters, digits, underscore, hyphen, space, dot, and comma. A label outside that set fails with `Invalid new collection identifier`, and two elements mapped to the same label fail with `appears twice in resulting collection`.

## Pitfalls

- A one-column list of rewritten identifiers leaves the relabel tool no old identifier to look up. That shape works only in `txt` mode, which renames by position. See [[sync-collections-by-identifier]] for that mode and its risks.
- Without `change_datatype: tabular` on the identifiers step, the table stays `txt` and does not fit the tabular modes' `labels` input.
- A regex that does not match a line leaves that line as one column, and a one-column row fails tabular mode. Anchor the pattern so that it matches every identifier you expect, or make the suffix optional.
- Keep the rewrite narrow enough that distinct elements keep distinct names. A collision fails the job instead of merging elements.
- Sanitize labels derived from free text, such as manifest sample names, before relabeling. The SRA workflow's first find/replace entry does this.
- Relabeling does not reorder or filter. Use [[harmonize-by-sortlist-from-identifiers]] for order and [[sync-collections-by-identifier]] for membership.

## See also

- [[galaxy-collection-tools]] — `__RELABEL_FROM_FILE__` parameter contract and validation rules.
- [[iwc-transformations-survey]] — Recipe G and its boundary with Recipe B.
- [[relabel-via-rules-and-find-replace]] — relabeling an inner level of a nested collection.
- [[sync-collections-by-identifier]] — positional `txt` relabeling and membership filtering.
