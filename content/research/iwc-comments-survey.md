---
type: research
tags:
  - research/component
  - target/galaxy
status: draft
created: 2026-06-12
revised: 2026-06-12
revision: 1
ai_generated: true
related_notes:
  - "[[galaxy-workflow-comments]]"
  - "[[galaxy-native-workflow-schema]]"
  - "[[gxformat2-schema]]"
  - "[[iwc-parameter-derivation-survey]]"
summary: "How IWC uses the gxformat2 `comments:` array: titled stage frames dominate, color is decorative, frames travel with template forks. An authoring convention."
---

# IWC corpus survey: workflow editor `comments`

Scope: the gxformat2 top-level `comments:` array — the Galaxy workflow editor's
on-canvas annotation layer (titled colored frames, markdown notes, text notes).
**Out of scope** (per scoping): the step/workflow `annotation:` documentation
field, and tool-parameter noise that merely contains the word "comment"
(`tool_state.comment`, `pass_comments`, `no_file_comments`, `comment_char`).

This is an **authoring-metadata / convention** surface, not an operation family.
Comments do not move data; they document and visually organize a workflow.
The `docs/PATTERNS.md` operation/recipe lens mostly does not apply — see
§7 for the no-pattern-candidate call.

## 1. The comment object

A comment item is one of three `type:` shapes, all sharing `position` and `size`
(editor canvas geometry) plus `color`:

| `type:` | Distinguishing fields | Role |
|---|---|---|
| `frame` | `title:`, optional `contains_steps:` | A titled, colored box grouping a region of steps |
| `markdown` | `text:` (markdown body) | A free-floating note |
| `text` | `text:`, `text_size:` | A free-floating plain label |

Distribution across the corpus: **102 frame, 9 markdown, 1 text** — 112 items in
**25 of 120** workflows (~21% uptake). Frames are ~91% of all comment items; the
feature is, in practice, "titled step-grouping boxes." Example block:
`$IWC_FORMAT2/epigenetics/consensus-peaks/consensus-peaks-chip-pe.gxwf.yml:772`.

Comments are the workflow tail: where present, the `comments:` key sits at the
end of the file after `steps:`. They carry no execution semantics — purely
editor-canvas presentation.

## 2. Frames as pipeline-stage labels (dominant idiom)

The overwhelming use of a frame is to name an analysis *stage* and box the steps
that implement it. Titles read as phase names, not tool names:

- `$IWC_FORMAT2/genome_annotation/annotation-maker/Genome_annotation_with_maker_short.gxwf.yml:630`
  — `Inputs`, `Genome quality evaluation`, `Annotation with Maker`,
  `Evaluation - Predicted proteins from annotation`, `Annotation statistics`,
  `Improving gene naming`, `Visualization`.
- `$IWC_FORMAT2/metabolomics/mfassignr/mfassignr.gxwf.yml:361` — `Noise estimation`,
  `Identify isotope masses`, `Assign MF with CHO`, `Recalibrate mass lists`,
  `Final MF assignment`.

Three recurring title flavors:

1. **Stage frames** — `Annotation with Braker3`, `Transcripts assembly with
   StringTie`, `Final MF assignment`. The common case: one frame per logical step
   of the analysis narrative.
2. **I/O region frames** — `Inputs`, `Data input`, `Visualization`,
   `AMR Count table`. Bracket the workflow's entry and exit regions.
3. **Parameter-derivation frames** — frames that box the fiddly utility clusters
   the [[iwc-parameter-derivation-survey]] catalogs, documenting *why* a knot of
   helper steps exists: `Map Strandedness parameter`
   (`$IWC_FORMAT2/transcriptomics/rnaseq-pe/rnaseq-pe.gxwf.yml:2045`),
   `Downsample input BAM to get the same number of reads`
   (`$IWC_FORMAT2/epigenetics/consensus-peaks/consensus-peaks-chip-pe.gxwf.yml:772`).
   This is the highest-value annotation use: the frame is the only place the
   intent of a non-obvious step cluster is written down.

## 3. Membership frames vs geometry-only frames

A frame may declare `contains_steps:` (an explicit list of step labels it groups)
or omit it and rely on canvas geometry (the frame visually overlays whatever
steps fall inside its `position`/`size` rectangle).

- **Membership is the norm:** 91 of 102 frames carry `contains_steps:`.
- **Geometry-only is one workflow's habit:**
  `$IWC_FORMAT2/microbiome/mags-building/MAGs-generation.gxwf.yml:1766` has all
  **10** of its frames with no `contains_steps:` (+1 stray in
  `$IWC_FORMAT2/genome_annotation/annotation-braker3/Genome_annotation_with_braker3.gxwf.yml:406`).
  These render identically in the editor but lose the machine-readable
  step→frame mapping.

Implication for any consumer reading frames structurally: `contains_steps:` is
usually present but not guaranteed; a geometry-only frame's membership is only
recoverable by intersecting canvas rectangles.

## 4. Free-floating notes (markdown / text)

The 9 markdown + 1 text items are nearly all **short region labels** used like a
frame title without the box — a header floated over a span of the canvas:

- `$IWC_FORMAT2/amplicon/qiime2/qiime2-III-VI-downsteam/QIIME2-VI-diversity-metrics-and-estimations.gxwf.yml:597`
  — `Input files`, `Alpha diversity`, `Beta diversity`, `Diversity metrics`.
- `$IWC_FORMAT2/amplicon/amplicon-mgnify/mapseq-to-ampvis2/mapseq-to-ampvis2.gxwf.yml:395`
  — `tax_table`, `OTU_table`.

The single exception, and the only comment in the corpus carrying real prose, is
an **adaptation note** telling a reader how to retarget the workflow:

> In this workflow, we recommend nanopore samples since we are using some tools
> that are specified for nanopore… In order to switch to illumina please remove
> the nanoplot step, replace porechop and fastp with cutadapt or trimmomatic, and
> finally replace Minimap2 with Bowtie2.

`$IWC_FORMAT2/microbiome/pathogen-identification/nanopore-pre-processing/Nanopore-Pre-Processing.gxwf.yml:1013`
(multi-line `text: |-`). This is the one place a comment does documentation work
that a stage-title cannot. It is an outlier, not a convention.

## 5. Frames travel with template forks

Comments are part of the reusable workflow scaffold, not one-off canvas doodling.
Two lineages show the same frames copied across forked workflows:

- **genome-annotation family** shares a fixed skeleton across forks: `Inputs`,
  `Genome quality evaluation`, `Evaluation - Predicted proteins from annotation`,
  `Annotation with <tool>`, `Visualization` — present in
  `annotation-maker`, `annotation-helixer`, `annotation-braker3`
  (`$IWC_FORMAT2/genome_annotation/annotation-helixer/Galaxy-Workflow-annotation_helixer.gxwf.yml:536`).
- **consensus-peaks family** carries the same three frames — `Get the average
  coverage`, `Downsample input BAM to get the same number of reads`, `Get a BED
  with intersection of at least x rep` — across all three of `chip-pe`, `chip-sr`,
  `atac-cutandrun` (only the array ordering and one frame's color differ —
  `Downsample input BAM…` is `none` in the chip forks, `blue` in atac).

### Subworkflow-scope comments (edge)

Comments are not strictly top-level. Embedded subworkflows carry their own
`comments:` arrays:
`$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-complete/mgnify-amplicon-pipeline-v5-complete.gxwf.yml:5853`
has four nested `comments:` keys (6-space indent) inside `run:` subworkflow
blocks. A scan keyed only on column-0 `comments:` misses these.

## 6. Color and title conventions

- **Color is decorative, not semantic.** Corpus-wide color counts (green 22,
  yellow 18, turquoise 15, red 11, blue 10, pink 9, none 9, lime 8, orange 7,
  black 3) carry no consistent meaning. Within one workflow, colors vary freely:
  rnaseq-pe uses lime/`Map Strandedness parameter`, red/`Coverage Files`,
  yellow/`Additional quantification` — no input/output/compute code.
- **…but color is stable within a fork lineage.** The `Inputs` frame is yellow in
  all four genome-annotation forks. Color travels with the copied frame; it is a
  per-template aesthetic choice, not a corpus-wide legend. A consumer must not
  infer frame role from color.
- **`color: none`** (9 items) is a valid, used choice — an outlined frame with no
  fill.
- **Titles are human prose with spaces and mixed case** — `Get a BED with
  intersection of at least x rep`. Same label-style freedom the test corpus shows
  for output labels (see [[iwc-shortcuts-anti-patterns]] §6); no naming convention
  is enforced.

## 7. Candidate conventions (keep / drop / merge)

There is **no operation-anchored or recipe-anchored pattern candidate here.** A
comment frame is not a workflow-construction operation — it produces no data, has
no tool, and `docs/PATTERNS.md`'s operation/recipe taxonomy does not fit it.
Forcing an operation name would be miscategorization. The corpus uptake is real
(25 workflows), so this is *not* a zero-uptake gap either — it is a genuine
authoring convention that lives outside the pattern surface.

What the corpus does support, if the Foundry wants to act on it, is **authoring
guidance**, shaped like [[iwc-shortcuts-anti-patterns]] or a testability-design
note rather than a `content/patterns/` page:

- **Candidate (convention, keep):** "Box each analysis stage in a titled frame."
  Evidence: §2, the genome-annotation and mfassignr stage skeletons. This is the
  single clearest convention — a frame per narrative stage, titled by stage not
  tool, with `contains_steps:` populated.
- **Candidate (convention, merge into the above):** "Frame parameter-derivation
  clusters to document intent" (§2.3). Not separate guidance — it is the
  stage-framing convention applied to utility knots, which is exactly where it
  earns the most.
- **Drop:** color guidance. §6 shows color is decorative and fork-local; there is
  nothing to prescribe. Telling authors to color-code by role would invent a
  convention the corpus does not have.
- **Drop:** markdown/text notes as a distinct recommendation. §4 shows they are
  mostly degenerate frames (a label without a box); the one prose note is an
  outlier. No convention to extract.

### Disposition

The actionable conventions here were distilled into [[galaxy-workflow-comments]]
— a concrete how-to-use note. That note is what the three Galaxy-targeting
template Molds reference ([[freeform-summary-to-galaxy-template]],
[[nextflow-summary-to-galaxy-template]], [[cwl-summary-to-galaxy-template]]) so
the template stage can optionally group the settled step set into titled stage
frames. This survey is the corpus-evidence trail behind that guidance. No
`content/patterns/` page; no GitHub issue.

## 8. Open questions

1. ~~**Does the Foundry want annotation guidance at all?**~~ **Resolved:** yes —
   the three Galaxy template Molds now carry an optional "group steps into titled
   stage frames" beat referencing [[galaxy-workflow-comments]]. `comments:` is
   schema-legal at the draft workflow level, so emitted frames pass
   `draft-validate`.
2. ~~**If guidance is wanted, where does it live?**~~ **Resolved:** in the
   distilled how-to-use note [[galaxy-workflow-comments]], referenced from the
   template Molds — not a `content/patterns/` page.
3. **Should `contains_steps:` be required guidance?** §3 shows 91/102 frames use
   it and one workflow (MAGs) drops it entirely. Is "always populate
   `contains_steps:`" a call worth making, given geometry-only frames render the
   same but lose machine-readable grouping? Needs a user prescriptive decision.
4. **Subworkflow-scope comments (§5):** worth surfacing to consumers that comments
   recur inside `run:` blocks, or an ignorable edge? Affects only tooling that
   parses comments structurally.
