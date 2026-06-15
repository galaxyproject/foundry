# UC1 / MRSA mobile-AMR context — interview input

> Pulled-down GitHub issue used as the **effective result of the INTERVIEW → GALAXY interview**
> (the live interview mechanics are harness-owned and precede pipeline phase 1).
> Source: galaxy-brain issue #12 (captured).
> Paired aspirational target: `UC1_MRSA_extracted.ga` (extracted from a Galaxy history; **not human-validated**).

---

## Purpose

Develop a Galaxy Notebooks paper/demo vignette using existing Galaxy Training Network material as scaffolding, but with a new analysis shape: comparative mobile-AMR interpretation across related MRSA isolates. This is for the `galaxy-brain` Galaxy Notebooks work, not a proposal to add new GTN training material by default.

## Objective

Show how a Galaxy Notebook can move from existing one-isolate AMR/annotation workflows to a focused comparative question: which resistance genes appear in mobile genomic contexts such as plasmids, insertion sequences, integrons, or isolate-specific loci?

## Why this is a useful demo deviation

The existing training material already covers KUN1163/DRR187559 assembly-derived annotation and AMR detection. The notebook should reuse those available tools and data patterns, but add a more paper-worthy story: compare 3-4 related MRSA isolates and summarize how ARG content and mobile context differ.

This is small enough to avoid new Galaxy plumbing, but significant enough to demonstrate the notebook as an interpretive layer over Galaxy histories rather than a direct tutorial rewrite.

## Existing analysis anchors

- Bacterial annotation tutorial: https://training.galaxyproject.org/training-material/topics/genome-annotation/tutorials/bacterial-genome-annotation/tutorial.html
- AMR gene detection tutorial: https://training.galaxyproject.org/training-material/topics/genome-annotation/tutorials/amr-gene-detection/tutorial.html
- MRSA assembly provenance: https://training.galaxyproject.org/training-material/topics/assembly/tutorials/mrsa-illumina/tutorial.html
- Relevant existing tools/patterns: Bakta, staramr, PlasmidFinder, IntegronFinder, ISEScan, table-to-GFF3 conversion, and JBrowse visualization.

## Public data candidates

- Existing GTN Zenodo data: https://doi.org/10.5281/zenodo.10572227
- Assembly Zenodo data: https://doi.org/10.5281/zenodo.10669812
- Same source paper: Hikichi et al. 2019, DOI `10.1128/mra.01212-19`
- Comparative source candidate: BioProject `PRJDB8599`, with complete genome/plasmid accessions from eight MRSA isolates.
- Candidate subset to verify: KUN1163 `AP020324` + `AP020325`; KUH140013 `AP020311` + `AP020312`; KUH140046 `AP020313` + `AP020314`; KUH180129 `AP020322` + `AP020323`.

Fallback: create a small Zenodo bundle with combined chromosome+plasmid FASTA per selected isolate plus metadata TSV if direct INSDC FASTA import is unstable.

## Notebook workflow plan

1. Import 3-4 complete isolate FASTA files, one combined assembly per isolate.
2. Build a Galaxy dataset collection named `MRSA isolate assemblies`.
3. Run `staramr` over the collection and collect `summary.tsv`, `detailed_summary.tsv`, `resfinder.tsv`, `plasmidfinder.tsv`, and `mlst.tsv`.
4. Run Bakta on selected isolates, or on a representative subset if runtime is too high.
5. Run ISEScan and IntegronFinder on selected assemblies.
6. Convert AMR, plasmid, IS, and integron outputs into interval tables or GFF3 using existing GTN table-processing patterns.
7. Classify ARG context as plasmid-located, IS-adjacent, integron-associated, SCCmec-region candidate, or unclassified.
8. Build a JBrowse view for one representative mobile-AMR locus and one contrasting isolate.
9. Export summary TSVs and notebook-ready figures.

## Expected paper/demo artifacts

- Metadata table: strain, year, source, symptom, chromosome accession, plasmid accession(s), genome size.
- AMR presence/absence matrix from `staramr`.
- Plasmid replicon/mobile element matrix.
- Mobile-context table: isolate, ARG, phenotype, accession, coordinate, replicon/context, nearest IS/integron/plasmid marker, distance.
- Heatmap of ARGs by isolate.
- Dot plot or heatmap of plasmid/mobile element calls by isolate.
- Stacked bar of ARG counts by context category.
- One or two locus diagrams or JBrowse screenshots.

## Scope and risks

- Keep the first version to 3-4 isolates; all eight isolates are stretch scope.
- Do not re-teach read QC, assembly, or raw-read mapping except as provenance.
- Treat AMR calls as database-version-dependent and pin expected output snapshots where possible.
- Avoid clinical interpretation beyond published phenotype comparison.
- Avoid adding broad pangenomics unless it is needed for one targeted context question.

## Tasks

- [ ] Confirm selected isolate accessions and direct FASTA download URLs.
- [ ] Confirm strain-to-plasmid accession mapping from Hikichi Table 1 / INSDC records.
- [ ] Run `staramr` on selected isolates and snapshot expected outputs.
- [ ] Run Bakta, ISEScan, and IntegronFinder on the selected subset; benchmark runtime.
- [ ] Define mobile-context classification rules for ARGs.
- [ ] Build notebook summary tables and figures.
- [ ] Create stable demo data inputs, using direct public URLs or a Zenodo snapshot.
- [ ] Draft the Galaxy Notebook narrative and connect it to the manuscript framing.
- [ ] Decide whether any outputs should be mirrored into `vault/papers/galaxy-notebooks/` as figures/tables.
- [ ] Review database drift, runtime, and scope before using this as a paper example.
