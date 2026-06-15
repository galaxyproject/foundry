# UC3 / Differential ATAC-seq accessibility — interview input

> Pulled-down GitHub issue used as the **effective result of the INTERVIEW → GALAXY interview**
> (the live interview mechanics are harness-owned and precede pipeline phase 1).
> Source: galaxy-brain issue #14 (captured).
> Paired aspirational target: `UC3_ATAC_extracted.ga` (extracted from a Galaxy history; **not human-validated**).

---

## Purpose

Develop a Galaxy Notebooks paper/demo vignette for bulk differential ATAC-seq accessibility. This should use existing Galaxy Training Network ATAC analysis as scaffolding, but the issue belongs to `galaxy-brain` because the deliverable is a paper/demo notebook, not a direct training-material change.

## Objective

Show the conceptual jump from "call peaks in one ATAC-seq sample" to "count reads/fragments over a shared peak universe and test accessibility differences across biological replicates."

## Why this is a useful demo deviation

The existing ATAC-seq tutorial is single-sample GM12878-focused. It covers QC, trimming, Bowtie2 mapping, filtering, duplicate removal, insert-size QC, MACS2 peak calling, TSS/CTCF heatmaps, and pyGenomeTracks visualization. A differential-accessibility notebook can reuse the same tool ecosystem while adding a more paper-worthy analysis story: replicate-aware peak counts, DESeq2-style testing, volcano plots, and interpretation of condition-specific regulatory regions.

## Existing analysis anchors

- Existing ATAC-seq tutorial: https://training.galaxyproject.org/training-material/topics/epigenetics/tutorials/atac-seq/tutorial.html
- Reuse current patterns for data import, ATAC QC context, BAM filtering, duplicate handling, insert-size QC, MACS2 peak calling, deepTools heatmaps, and pyGenomeTracks visualization.
- The existing tutorial already notes that a fuller workflow can be compatible with replicates; this notebook fills that gap without re-teaching every preprocessing step.

## Public data candidates

Preferred MVP direction: use small prepared files from a public ENCODE-derived two-condition replicate dataset rather than full raw FASTQ/BAM processing.

Candidate datasets to evaluate:

- ENCODE NK-cell ATAC-seq stimulation contrast with duplicate accessions cited in community training material: untreated `ENCFF398QLV`, `ENCFF363HBZ`; cytokine-stimulated `ENCFF045OAB`, `ENCFF828ZPN`.
- ENCODE GM12878 vs K562 ATAC-seq as a continuity-friendly cell-type contrast, since the existing tutorial already uses GM12878 context: GM12878 `ENCSR637XSC`; K562 `ENCSR868FGK`.

Fallback: publish a tiny Zenodo bundle containing `union_peaks.bed`, a featureCounts-style count matrix, `sample_metadata.tsv`, optional bigWigs/narrowPeaks, and selected peak annotations. This still teaches real differential accessibility while keeping runtime workshop-feasible.

## Notebook workflow plan

1. Import prepared small datasets: count matrix or per-sample count files, `sample_metadata.tsv`, `union_peaks.bed`, and optional bigWigs/narrowPeaks.
2. Explain the peak universe: merged/union reproducible peaks across conditions.
3. Optional BAM-subset branch: create the union peak universe with concatenate/sort/merge interval tools, then convert intervals to SAF-like annotation.
4. Optional BAM-subset branch: count fragments over union peaks with `featureCounts`.
5. Run replicate QC using DESeq2 PCA/sample-distance outputs, or `multiBamSummary` plus `plotCorrelation` if BAMs are included.
6. Run `DESeq2` with factor `condition`.
7. Filter significant peaks, e.g. `padj < 0.05` and `abs(log2FoldChange) >= 1`.
8. Create a volcano plot using the Galaxy Volcano Plot tool.
9. Sort top condition-gained and condition-lost peaks.
10. Visualize selected differential regions with deepTools heatmaps and optional pyGenomeTracks.

## Expected paper/demo artifacts

- `sample_metadata.tsv`: sample, condition, replicate, accession, source.
- `union_peaks.bed`: shared peak universe with stable peak IDs.
- Peak count matrix or featureCounts-style per-sample count tables.
- DESeq2 result table with peak ID, base mean, log2 fold change, p-value, adjusted p-value.
- Normalized and VST-normalized count outputs.
- PCA plot and sample-distance heatmap.
- Volcano plot of differential accessibility.
- Table of top gained and top lost accessible regions.
- Heatmap/profile over top differential peaks.
- One genome-track figure showing a gained/lost peak near an interpretable gene or regulatory locus.

## Scope and risks

- Do not make learners or reviewers download full ENCODE BAM/FASTQ files for the MVP.
- Do not introduce new Galaxy wrappers or unsupported ATAC-specific differential tools.
- Avoid claiming peak presence/absence overlap alone is statistical differential accessibility.
- Require at least two replicates per condition; state that two is minimal and three is preferable.
- Keep peak-to-gene annotation light and optional, since regulatory target assignment is not trivial.
- Keep the first version to one chromosome, selected loci, or a precomputed count matrix.
- Link back to the existing ATAC analysis instead of re-teaching single-sample preprocessing.

## Tasks

- [ ] Choose primary dataset: ENCODE NK stimulation or GM12878 vs K562.
- [ ] Generate or locate a small chr14/chr22 processed BAM/count/peak bundle.
- [ ] Deposit the final demo bundle on Zenodo or otherwise use stable public URLs.
- [ ] Draft notebook framing with differential-accessibility questions/objectives/key points.
- [ ] Add a "relationship to existing ATAC-seq tutorial" section in the notebook narrative.
- [ ] Add import, metadata, DESeq2, filtering, volcano, and visualization steps.
- [ ] Add expected-output screenshots/figures.
- [ ] Validate runtime on a standard Galaxy instance.
- [ ] Keep optional raw/processed-BAM work separate from the count-matrix MVP.
- [ ] Decide which tables/figures should feed directly into the Galaxy Notebooks manuscript.
