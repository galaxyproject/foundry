---
type: pattern
pattern_kind: operation
evidence: corpus-and-verified
title: "Parameter: compose runtime text parameter"
aliases:
  - "compose_text_param"
  - "dynamic text parameter"
  - "connected text expression"
tags:
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-05-03
revision: 3
ai_generated: true
summary: "Use compose_text_param to build connected text expressions from constants plus runtime scalar values."
related_notes:
  - "[[iwc-parameter-derivation-survey]]"
related_patterns:
  - "[[derive-parameter-from-file]]"
  - "[[map-workflow-enum-to-tool-parameter]]"
  - "[[tabular-filter-by-column-value]]"
  - "[[tabular-cut-and-reorder-columns]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
verification_paths:
  - verification/workflows/compose-runtime-text-parameter/compose-runtime-text.gxwf-test.yml
iwc_exemplars:
  - workflow: epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun
    why: "Composes a Filter1 predicate from a literal comparison and a workflow integer input."
    confidence: high
  - workflow: data-fetching/sra-manifest-to-concatenated-fastqs/sra-manifest-to-concatenated-fastqs
    why: "Composes dynamic Cut1 column lists from connected column identifiers."
    confidence: high
  - workflow: computational-chemistry/gromacs-dctmd/gromacs-dctmd
    why: "Composes GROMACS config lines from float and integer parameters for add_line_to_file."
    confidence: high
  - workflow: virology/pox-virus-amplicon/pox-virus-half-genome
    why: "Composes genomic range and pool suffix strings for downstream regions and read-group parameters."
    confidence: high
---

# Parameter: compose runtime text parameter

## Tool

Use `toolshed.g2.bx.psu.edu/repos/iuc/compose_text_param/compose_text_param/0.1.1` when a downstream tool parameter must be a runtime-built text string rather than a fixed literal.

The tool concatenates ordered components into `out1`, which then connects into text-like downstream parameters such as `cond`, `columnList`, `regions`, `text_input`, or read-group IDs.

## When to reach for it

Use this when constants and runtime values must become one exact string: `c4 >= <threshold>`, `cN,cM`, genomic ranges, read-group IDs, or config lines.

Use it before tools whose target parameter is text but whose value depends on workflow inputs or upstream scalar parameter steps.

Do not use this for enum-to-flag mapping; use [[map-workflow-enum-to-tool-parameter]].

Do not use this for tabular string computation that should remain a dataset column; use [[tabular-compute-new-column]] or a tabular text-processing pattern.

## Operation Boundary

This pattern covers composing a text parameter at workflow runtime from ordered literal and connected scalar pieces.

It does not cover reading scalar values from files, mapping enum values to dialects, row-wise tabular string computation, or custom wrapper authoring.

## Parameters

- `components`: ordered repeat; order is the output string order.
- `components[].param_type.select_param_type`: observed values include `text`, `integer`, and `float`.
- Literal text components carry `component_value` as the exact string to insert.
- Runtime components carry `component_value: { __class__: ConnectedValue }` and have a matching `in:` connection such as `components_1|param_type|component_value`.
- Output `out1`: connect to the downstream text parameter.

Preserve spaces, commas, prefixes, and comparison operators exactly in literal chunks. The composer does not understand downstream syntax.

## Idiomatic Shapes

Filter predicate:

```text
"c4 >= " + integer threshold -> Filter1.cond
```

Dynamic column list:

```text
"c" + integer + ",c" + integer -> Cut1.columnList
```

Config line:

```text
"pull_coord1_rate = " + float -> add_line_to_file.text_input
```

Region or read-group string:

```text
runtime start/end text + literal separators or pool suffix -> downstream text parameter
```

These snippets are conceptual; use the gxformat2 exemplars for exact serialized shapes.

## Pitfalls

- Component order is semantic. Reordering components without matching connections changes the generated string.
- Literal whitespace matters. Leading and trailing spaces in config-line chunks are meaningful.
- There is no downstream syntax validation. `compose_text_param` can build an invalid `Filter1.cond`, invalid `Cut1.columnList`, or invalid genomic range.
- Connected text is not a dataset. Connect `out1` to a tool parameter, not a dataset input.
- Do not replace [[map-workflow-enum-to-tool-parameter]]. If the operation is mapping `stranded` to a flag or snippet, map first; compose only when the final task is concatenation.
- Do not confuse row-wise string construction with runtime parameter composition. If each input row needs a computed string, use tabular tools.

## See Also

- [[iwc-parameter-derivation-survey]] — Candidate E decision record.
- [[derive-parameter-from-file]] — when runtime scalar values start as one-value datasets.
- [[map-workflow-enum-to-tool-parameter]] — when a workflow-facing enum must become a downstream dialect.
- [[tabular-filter-by-column-value]] — common downstream consumer via `Filter1.cond`.
- [[tabular-cut-and-reorder-columns]] — common downstream consumer via `Cut1.columnList`.
