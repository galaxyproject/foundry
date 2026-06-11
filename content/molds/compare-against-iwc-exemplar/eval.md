# compare-against-iwc-exemplar eval

## Case: nf-core rnaseq nearest exemplar

- check: deterministic + llm-judged
- fixture: Galaxy interface + data-flow design briefs derived from nf-core/rnaseq.
- expectation: selects `transcriptomics/rnaseq-pe` (or sibling RNA-seq IWC workflow) at high confidence, citing the IWC URL plus alignment on domain, paired-FASTQ topology, align/count/report tool families, and MultiQC aggregation.

## Case: nf-core viralrecon nearest exemplar

- check: deterministic + llm-judged
- fixture: Galaxy interface + data-flow design briefs derived from nf-core/viralrecon.
- expectation: selects an IWC SARS-CoV-2 variation-reporting exemplar at medium confidence, naming the shared variation-analysis structure and the workflow-scope mismatch.

## Case: nf-core mag nearest exemplar

- check: deterministic + llm-judged
- fixture: Galaxy interface + data-flow design briefs derived from nf-core/mag.
- expectation: selects an IWC microbiome MAG-generation exemplar at high confidence and calls out collection, binning, annotation, and report-assembly differences.

## Case: no acceptable exemplar

- check: deterministic + llm-judged
- fixture: Galaxy interface + data-flow design briefs whose domain, tool families, topology, or output intent has no close IWC match.
- expectation: returns "no nearest exemplar" instead of forcing a nearest, lists the top weak candidates with rationale, and refuses high confidence on tool-overlap-only matches (`MultiQC`, `fastp`, `awk`, `datamash`). Emits no gxformat2 view — no `iwc-exemplar.gxwf.yml` sibling and no inline excerpt in the notes.

## Case: nearest exemplar gxformat2 view surfaced

- check: deterministic + llm-judged
- fixture: a run that selects a High- or Medium-confidence nearest exemplar (e.g. the nf-core rnaseq case).
- expectation: writes a cleaned gxformat2 `iwc-exemplar.gxwf.yml` sibling for the nearest exemplar's relevant subgraph (via `convert --to format2 --compact`), and inlines a bounded (~10–40 line) excerpt of that subgraph under a labeled section in `iwc-comparison-notes.md`, citing the abstract IWC workflow ID and the step labels covered. The excerpt is the relevant subgraph, not the whole workflow.

## Case: IWC clone reuse

- check: deterministic
- fixture: second invocation against the same IWC `<url>` after a prior run populated `~/.foundry/iwc`.
- expectation: pulls and merges into the existing clone instead of re-cloning, and proceeds without network errors when offline if the local clone is current.
