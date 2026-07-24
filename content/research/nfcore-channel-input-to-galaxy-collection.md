---
type: research
title: "nf-core channel input → Galaxy data / collection"
tags:
  - research/design-problem
  - source/nextflow
  - target/galaxy
status: draft
created: 2026-05-10
revised: 2026-06-10
revision: 3
ai_generated: true
summary: "Map an nf-core process's tuple(meta, path) input channel to a Galaxy <param type=\"data\"> or paired/list collection input."
related_molds:
  - "[[convert-nfcore-module-to-galaxy-tool]]"
related_notes:
  - "[[nfcore-meta-map-to-galaxy-params]]"
  - "[[galaxy-discover-datasets]]"
sources:
  - "https://github.com/nf-core/modules/tree/9b261a459473bc8e2d830bfc626f480c0733f4fe"
  - "https://github.com/galaxyproject/tools-iuc"
---

# nf-core channel input → Galaxy data / collection

Cited modules pinned to `nf-core/modules@9b261a459473bc8e2d830bfc626f480c0733f4fe`.

## Triage table

| nf-core input shape | meta-driven branching? | Galaxy mapping |
|---|---|---|
| `tuple val(meta), path(input)` (single artifact) | no | one `<param type="data">` |
| `tuple val(meta), path(input), path(secondary)` | no | two `<param type="data">` (one per role) |
| `tuple val(meta), path(reads)` with `meta.single_end` driving the script | yes | `<conditional>` switching `<param type="data">` (single) ↔ `<param type="data_collection" collection_type="paired">` (paired) |
| `tuple val(meta), path(reads, stageAs: "input*/*")` (multi-list) | yes (single/paired branching) | `<conditional>` switching `<param type="data" multiple="true">` ↔ `<param type="data_collection" collection_type="list:paired">` |
| `tuple val(meta), path("*.bam")` glob | no | `<param type="data_collection" collection_type="list">` |

The `meta` map itself is **never** an input — see `[[nfcore-meta-map-to-galaxy-params]]`. Its keys may *gate* a `<conditional>`, but the map data does not flow as a Galaxy param.

## Cited cases

### Single artifact, no meta branching → single `<param type="data">`

`modules/nf-core/samtools/index/main.nf`:

```nextflow
input:
tuple val(meta), path(input)

output:
tuple val(meta), path("*.{bai,csi,crai}"), emit: index
```

Galaxy mapping:

```xml
<inputs>
  <param name="input" type="data" format="bam,cram" label="BAM / CRAM to index"/>
</inputs>
<outputs>
  <data name="index" format_source="input">
    <discover_datasets pattern="__name_and_ext__" directory="."/>
  </data>
</outputs>
```

`samtools/index`'s upstream behavior already reads file-extension cues to pick the index format; the convert Mold should not surface `index_format` as a Galaxy param when the upstream tool can derive it. Surface it only if `task.ext.args` exposes it as a knob.

### Two artifacts, role-split → two `<param type="data">`

`modules/nf-core/seqkit/grep/main.nf`:

```nextflow
input:
tuple val(meta), path(sequence)
path pattern
```

`sequence` is the FASTQ/FASTA to filter; `pattern` is a separate file of names. Galaxy:

```xml
<param name="sequence" type="data" format="fasta,fastq,fasta.gz,fastq.gz" label="Sequences to filter"/>
<param name="pattern"  type="data" format="txt" optional="true" label="Pattern file (one ID per line)"/>
```

Two roles → two params. A `<repeat>` would only fit if the module accepted N pattern files; here it's exactly one.

### Paired/single branching driven by `meta.single_end` → `<conditional>`

`modules/nf-core/fastp/main.nf`:

```nextflow
input:
tuple val(meta), path(reads), path(adapter_fasta)
val   discard_trimmed_pass
val   save_trimmed_fail
val   save_merged

script:
def args = task.ext.args ?: ''
...
if ( task.ext.args?.contains('--interleaved_in') ) {
    """ ...fastp --stdout --in1 ... """          // interleaved-FASTQ mode
} else if (meta.single_end) {
    """ ...fastp --in1 ... """                   // single-end
} else {
    """ ...fastp --in1 ... --in2 ... """         // paired-end
}
```

Three branches: interleaved (driven by `task.ext.args` introspection — see `[[nfcore-task-ext-args-to-galaxy-additional-options]]`), single-end (driven by `meta.single_end == true`), paired (default). The first two are *meta- and args-driven* convergence onto a single-input shape; the third is the genuine paired shape.

`tools-iuc/tools/fastp/fastp.xml` (revision pinned by viewing master) shows the canonical Galaxy translation as a **two-arm** conditional:

```xml
<conditional name="single_paired">
  <param name="single_paired_selector" type="select" label="Single-end or paired reads">
    <option value="single" selected="true">Single-end</option>
    <option value="paired_collection">Paired Collection</option>
  </param>
  <when value="single">
    <param name="in1" type="data" format="fastqsanger,fastqsanger.gz"/>
    ...
  </when>
  <when value="paired_collection">
    <param name="paired_input" type="data_collection" collection_type="paired"
           format="fastqsanger,fastqsanger.gz"/>
    ...
  </when>
</conditional>
```

Two reasons IUC chose `paired_collection` over a literal `paired` (in1 + in2 separate datasets) arm:

1. **Galaxy collection idiom.** Paired-end data in Galaxy lives in `paired` collections; pairing them into a collection at upload time is the recommended workflow shape (and the only shape that survives downstream collection-aware tools cleanly).
2. **Single source of truth for the pair.** Two separate `data` params lets a user pair non-matching files; a paired collection enforces the pair structure at the dataset level.

The convert Mold's posture should match IUC: emit `single` + `paired_collection` only. The interleaved-FASTQ path collapses into the `single` arm — `task.ext.args` carrying `--interleaved_in` is a usage choice the user makes via the additional-options bag (see `[[nfcore-task-ext-args-to-galaxy-additional-options]]`), not a third `<conditional>` arm.

### Multi-list (cat/fastq style) → `<conditional>` over multi-data + list:paired

`modules/nf-core/cat/fastq/main.nf` consumes `tuple val(meta), path(reads, stageAs: "input*/*")` — N reads per sample, single-end *or* paired. The Galaxy mapping mirrors the fastp shape with `multiple="true"` on the single arm and `collection_type="list:paired"` on the paired arm.

## Pitfalls

- **Don't promote `meta.id` to a Galaxy input.** Galaxy datasets carry their own identifier (`$input.element_identifier`); `meta.id` belongs in the wrapper script, not in `<inputs>`. See `[[nfcore-meta-map-to-galaxy-params]]`.
- **Glob inputs (`path('*.bam')`) ≠ `multiple="true"`.** They map to a `<param type="data_collection" collection_type="list">`, because Galaxy's collection abstraction is the right idiom for "N files of the same shape with stable identifiers." `multiple="true"` discards element identifiers.
- **`stageAs:` directives carry information.** `path(reads, stageAs: "input*/*")` tells Nextflow to stage each read under a numbered subdirectory; the convert Mold should preserve this in `<command>` via `&& mkdir input1 input2 && ln -sf` style staging, not flatten to a single dir.
- **Optional artifacts are `optional="true"`, not a separate `<conditional>` arm.** `tuple val(meta), path(adapter_fasta)` where `adapter_fasta` may be empty maps to `<param ... optional="true">`, not a paired/no-paired conditional.

## See also

- `[[nfcore-meta-map-to-galaxy-params]]` — sibling: how to handle the `meta` map keys that travel with the data path.
- `[[galaxy-discover-datasets]]` — reference for the `<discover_datasets>` element used in the glob-input mapping.
- `[[convert-nfcore-module-to-galaxy-tool]]` — Mold that consumes this note.
- `tools-iuc/tools/fastp/fastp.xml` — canonical IUC paired/single conditional shape.
