---
type: research
tags:
  - target/galaxy
status: draft
created: 2026-06-12
revised: 2026-06-12
revision: 1
ai_generated: true
related_notes:
  - "[[iwc-comments-survey]]"
  - "[[gxformat2-schema]]"
  - "[[freeform-summary-to-galaxy-template]]"
  - "[[nextflow-summary-to-galaxy-template]]"
  - "[[cwl-summary-to-galaxy-template]]"
summary: "How to annotate a gxformat2 workflow with editor comments: one titled frame per analysis stage, populate contains_steps, color decorative."
---

# Galaxy workflow comments

Use this note when authoring or translating a Galaxy gxformat2 workflow and
deciding how to annotate it with editor comments — the top-level `comments:`
array the workflow editor renders as on-canvas frames and notes. Comments carry
no execution semantics; they document and visually organize the workflow. This
is presentation guidance, not a `content/patterns/` operation. Corpus evidence
behind every rule here lives in [[iwc-comments-survey]].

Comments are optional — roughly one in five IWC workflows use them. Add them when
the workflow has enough steps that a reader benefits from a stage map; skip them
on short linear workflows.

## 1. Box each analysis stage in a titled frame

The core move. Once topology is settled, partition the step set into `type:
frame` comments — one frame per logical stage of the analysis — and give each a
`title:` and a `contains_steps:` list of the step labels it groups:

```yaml
comments:
  - type: frame
    position: [687.5, 395.8]
    size: [498.9, 345.5]
    color: green
    title: Genome quality evaluation
    contains_steps:
      - run BUSCO
      - summarize BUSCO
```

`position` and `size` are editor-canvas geometry (floats); set them so the frame
encloses its steps, or copy them from the nearest IWC exemplar you are adapting.

## 2. Title by stage, not by tool

A frame title names the analysis phase, never the tool that implements it —
`Annotation with Braker3`, `Final MF assignment`, `Transcripts assembly`, not
`braker3` or `stringtie`. Three title flavors, all valid:

- **Stage frames** — one per narrative step of the analysis (the common case).
- **I/O region frames** — `Inputs`, `Data input`, `Visualization` bracket the
  workflow's entry and exit regions.
- **Parameter-derivation frames** — box the fiddly utility clusters that compute
  a parameter (`Map Strandedness parameter`, `Downsample input BAM to get the
  same number of reads`). This is the highest-value annotation: the frame is
  often the only place the intent of a non-obvious helper cluster is written
  down. Always frame these.

Titles are human prose — spaces, mixed case, and punctuation are fine.

## 3. Populate `contains_steps`

Prefer explicit `contains_steps:` (a list of step labels) over relying on canvas
geometry alone. Both render identically, but a geometry-only frame loses the
machine-readable step→frame mapping — a consumer can only recover membership by
intersecting rectangles. List every step the frame covers.

## 4. Color is decorative — do not encode meaning

Pick any editor color: `green`, `yellow`, `turquoise`, `red`, `blue`, `pink`,
`lime`, `orange`, `black`, or `none` (an unfilled outline). Color carries **no
semantic convention** — do not use it to signal input vs output vs compute, and
do not infer role from a frame's color when reading a workflow. When forking a
workflow, keep each frame's color stable so the lineage stays visually
recognizable.

## 5. Free-floating notes: `markdown` and `text`

For a labeled region without a box, use a `type: markdown` comment (a `text:`
field holding a markdown body) or `type: text` (a `text:` field plus
`text_size:`). Keep these short — they are mostly one-to-three-word region
headers (`Input files`, `Alpha diversity`). The one place a longer `markdown`
note earns its keep is **workflow-level adaptation guidance** — e.g. "to retarget
this nanopore workflow for Illumina, replace Minimap2 with Bowtie2." Reach for
prose only when a stage title cannot carry the instruction.

## 6. Comments are reusable scaffold

Frames travel with workflow forks and templates: when deriving a workflow from an
IWC exemplar, carry its frame set and adjust titles rather than starting bare.
Embedded subworkflows can carry their own `comments:` array, so annotate at the
scope the reader navigates.

## 7. Schema and validation

`comments:` is a schema-legal top-level workflow field (and a subworkflow field);
emitted frames pass `gxwf` draft validation. Field shapes:

| `type:` | Fields |
|---|---|
| `frame` | `position`, `size`, `color`, `title`, `contains_steps` (recommended) |
| `markdown` | `position`, `size`, `color`, `text` |
| `text` | `position`, `size`, `color`, `text`, `text_size` |

## Cross-references

- Corpus evidence and distribution: [[iwc-comments-survey]].
- gxformat2 field schema: [[gxformat2-schema]].
