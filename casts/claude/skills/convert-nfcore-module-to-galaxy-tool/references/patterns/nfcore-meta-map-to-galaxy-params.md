---
type: pattern
pattern_kind: operation
evidence: hypothesis
title: "nf-core meta-map → Galaxy params"
tags:
  - pattern
  - target/galaxy
status: draft
created: 2026-05-10
revised: 2026-05-10
revision: 2
ai_generated: true
summary: "Promote nf-core meta-map keys to Galaxy <param>s only when they drive script behavior; drop identity-only keys; pull naming from $input.element_identifier."
related_molds:
  - "[[convert-nfcore-module-to-galaxy-tool]]"
related_patterns:
  - "[[nfcore-channel-input-to-galaxy-collection]]"
sources:
  - "https://github.com/nf-core/modules/tree/9b261a459473bc8e2d830bfc626f480c0733f4fe"
---

# nf-core meta-map → Galaxy params

The nf-core `meta` map travels with the data channel as `tuple val(meta), path(...)`. Galaxy has no metadata-channel equivalent — datasets carry only their own `element_identifier`, `name`, and format. The convert Mold's job is to triage every meta key the script body reads.

Cited modules pinned to `nf-core/modules@9b261a459473bc8e2d830bfc626f480c0733f4fe`.

## Triage rule

Walk the module's `script:` body for `meta.<key>` references. For each key, classify:

| Class | Diagnostic | Galaxy mapping |
|---|---|---|
| **Identity** | only used in output filenames (`${meta.id}.bam`) | **drop** — use `$input.element_identifier` in `<command>` |
| **Behavior-driving** | gates branches in the script body | `<conditional>` (boolean) or `<param type="select">` (multi-mode) |
| **Mode/strategy** | substituted into a flag value (`--lib_type ${meta.strandedness}`) | `<param type="select">` with explicit options |
| **Pass-through tag** | written into output metadata or filenames but doesn't change behavior | optional `<param type="text">`, default `${input.element_identifier}` |

When in doubt, prefer **dropping** over surfacing. Galaxy users don't expect to fill in metadata that the platform already tracks per-dataset.

## Cited cases

### Identity only → drop

`modules/nf-core/samtools/index/main.nf`:

```nextflow
process SAMTOOLS_INDEX {
    tag "${meta.id}"
    ...
    input:
    tuple val(meta), path(input)
    ...
    script:
    """
    samtools index -@ ${task.cpus} ${args} ${input}
    """
}
```

`meta.id` appears only in the `tag` directive (Nextflow log line) — never in the script. Drop entirely; Galaxy's history-item identity is the dataset's `element_identifier`. The convert Mold's `<command>` does not need to reference `meta.id` at all.

### Behavior-driving (boolean) → `<conditional>`

`modules/nf-core/fastp/main.nf`:

```nextflow
script:
def args = task.ext.args ?: ''
...
if ( task.ext.args?.contains('--interleaved_in') ) {
    """ ...fastp --stdout --in1 ... """          // interleaved (single-input shape)
} else if (meta.single_end) {
    """ ...fastp --in1 ... """                   // single-end
} else {
    """ ...fastp --in1 ... --in2 ... """         // paired
}
```

`meta.single_end` gates a hard branch — the command line is materially different. The first branch (interleaved) is `task.ext.args`-driven, not meta-driven, and collapses into the single-input shape (see `[[nfcore-task-ext-args-to-galaxy-additional-options]]`). Galaxy mapping for the meta gate: a `<conditional name="single_paired">` whose selector drives both the `<inputs>` shape (per `[[nfcore-channel-input-to-galaxy-collection]]` — two arms `single` + `paired_collection`) and the `<command>` branching:

```xml
<command><![CDATA[
fastp
#if $single_paired.single_paired_selector == "single"
    --in1 '$single_paired.in1'
#else
    --in1 '$single_paired.in1' --in2 '$single_paired.in2'
#end if
]]></command>
```

Same key, two collaborating mappings: input shape and command shape. The convert Mold should treat the `<conditional>` as a single unit gated by the meta key, not two independent translations.

### Behavior-driving (multi-arm) → `<param type="select">`

`modules/nf-core/cat/fastq/main.nf` reads `meta.single_end` to switch between cat-one-stream and cat-two-streams. Same shape as fastp; `<conditional>` over the same selector.

### Pass-through tag → optional text param

When a module writes `meta.id` into a non-output-name place (e.g., a header field of a derived file), the convert Mold can either:

1. Default to `$input.element_identifier` in `<command>` and **not** surface the param. (Preferred — Galaxy users already named the dataset.)
2. Surface as `<param name="sample_id" type="text" optional="true" label="Sample ID (defaults to dataset name)">`, defaulting to `$input.element_identifier`.

Option 1 is right unless the upstream tool genuinely supports two distinct identifiers for one input (rare).

## Pitfalls

- **Don't surface `meta.id` as a required user input.** This is the most common over-translation. Galaxy already has identifier semantics; doubling them up confuses users and breaks collection-aware idioms.
- **Don't expand a meta-map's full key set.** Pipelines extend the `meta` map with arbitrary keys (`meta.run`, `meta.lane`, `meta.barcode`); only the keys the *module's own* script body reads matter at conversion time.
- **Behavior-driving keys must surface.** Hiding `meta.single_end` inside the wrapper (e.g., always emitting the paired branch) silently breaks single-end runs. The conditional is non-negotiable when the script branches on it.
- **`meta.strandedness` is rare in modules; it usually surfaces as a separate `val` input.** Don't auto-emit a strandedness `<param>` based on key name; check the script body actually reads it.

## See also

- `[[nfcore-channel-input-to-galaxy-collection]]` — sibling pattern: meta-driven input shape decisions.
- `[[convert-nfcore-module-to-galaxy-tool]]` — Mold that consumes this pattern.
