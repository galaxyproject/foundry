# compare-against-iwc-exemplar scenarios

Concrete cases for `compare-against-iwc-exemplar`, exercised against the abstract
properties in `eval.md`. Each case binds the upstream Galaxy interface and
data-flow design briefs (the fixture) and states the expected exemplar,
confidence, and cited alignments; the `eval.md` oracle is applied to whatever the
case produces.

## Case: nf-core rnaseq nearest exemplar

- fixture: Galaxy interface + data-flow design briefs derived from nf-core/rnaseq.
- expect: selects `transcriptomics/rnaseq-pe` (or sibling RNA-seq IWC workflow) at
  High confidence, citing the IWC URL plus alignment on domain, paired-FASTQ
  topology, align/count/report tool families, and MultiQC aggregation.

## Case: nf-core viralrecon nearest exemplar

- fixture: Galaxy interface + data-flow design briefs derived from nf-core/viralrecon.
- expect: selects an IWC SARS-CoV-2 variation-reporting exemplar at Medium
  confidence, naming the shared variation-analysis structure and the
  workflow-scope mismatch.

## Case: nf-core mag nearest exemplar

- fixture: Galaxy interface + data-flow design briefs derived from nf-core/mag.
- expect: selects an IWC microbiome MAG-generation exemplar at High confidence and
  calls out collection, binning, annotation, and report-assembly differences.

## Case: no acceptable exemplar

- fixture: Galaxy interface + data-flow design briefs whose domain, tool families,
  topology, or output intent has no close IWC match.
- expect: returns "no nearest exemplar" instead of forcing a nearest, lists the
  top weak candidates with rationale, and refuses High confidence on
  tool-overlap-only matches (`MultiQC`, `fastp`, `awk`, `datamash`). Emits no
  gxformat2 view — no `iwc-exemplar.gxwf.yml` sibling and no inline excerpt in the
  notes.

## Case: nearest exemplar gxformat2 view surfaced

- fixture: a run that selects a High- or Medium-confidence nearest exemplar (e.g.
  the nf-core rnaseq case).
- expect: writes a cleaned gxformat2 `iwc-exemplar.gxwf.yml` sibling for the
  nearest exemplar's relevant subgraph (via `convert --to format2 --compact`), and
  inlines a bounded (~10–40 line) excerpt of that subgraph under a labeled section
  in `iwc-comparison-notes.md`, citing the abstract IWC workflow ID and the step
  labels covered. The excerpt is the relevant subgraph, not the whole workflow.

## Case: IWC clone reuse

- fixture: second invocation against the same IWC `<url>` after a prior run
  populated `~/.foundry/iwc`.
- expect: pulls and merges into the existing clone instead of re-cloning, and
  proceeds without network errors when offline if the local clone is current.
