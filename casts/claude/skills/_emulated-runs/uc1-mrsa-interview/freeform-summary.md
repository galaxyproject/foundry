# freeform-summary: MRSA mobile-AMR context across isolates

> Artifact id: `freeform-summary`. Produced by `interview-to-freeform-summary`
> from the supplied interview result (UC1_MRSA_issue.md, captured from
> galaxy-brain issue #12). Source evidence with explicit uncertainty — not a
> fully specified workflow.

## Workflow intent

Build a comparative mobile-AMR analysis across 3–4 related MRSA isolates: for
each isolate, call antimicrobial-resistance genes (ARGs) and mobile genetic
elements, then determine **which resistance genes sit in mobile genomic
contexts** — plasmid-located, insertion-sequence (IS)-adjacent,
integron-associated, SCCmec-region candidate, or unclassified — and summarize
how ARG content and mobile context differ between isolates.

The user frames this as an interpretive comparison over already-assembled
genomes, deliberately *not* a from-reads pipeline.

## Methods / algorithms (in the order the user describes them)

1. Import 3–4 complete isolate assemblies (one combined chromosome+plasmid FASTA
   per isolate).
2. Assemble them into a Galaxy dataset collection named `MRSA isolate assemblies`.
3. Run ARG / plasmid / MLST calling over the collection (`staramr`), collecting
   `summary.tsv`, `detailed_summary.tsv`, `resfinder.tsv`, `plasmidfinder.tsv`,
   `mlst.tsv`.
4. Run whole-genome annotation (`Bakta`) on the isolates, or a representative
   subset if runtime is prohibitive.
5. Run mobile-element callers — `ISEScan` (insertion sequences) and
   `IntegronFinder` (integrons) — on the assemblies.
6. Reshape the AMR, plasmid, IS, and integron outputs into interval tables or
   GFF3 (the user points at "existing GTN table-processing patterns" without
   naming the specific tool).
7. Classify each ARG's context as plasmid-located, IS-adjacent,
   integron-associated, SCCmec-region candidate, or unclassified.
8. Build a JBrowse view for one representative mobile-AMR locus plus one
   contrasting isolate.
9. Export summary TSVs and notebook-ready figures.

## Tools

- **`staramr`** — ARG detection + plasmid replicon (PlasmidFinder) + MLST in one
  call. Named explicitly; load-bearing.
- **`Bakta`** — whole-genome annotation. Named; flagged as optionally subsetted
  for runtime.
- **`ISEScan`** — insertion-sequence detection. Named.
- **`IntegronFinder`** — integron detection. Named.
- **`PlasmidFinder`** — replicon typing; listed among anchor tools, but in
  practice subsumed by `staramr`'s plasmidfinder.tsv output.
- **table-to-GFF3 / interval reshaping** — operation named, *tool not specified*
  ("existing GTN table-processing patterns"). Resolve downstream.
- **JBrowse** — genome-browser locus visualization. Named.
- ARG context **classification** — described as a rule set the user has not yet
  defined (see open questions); no tool named.

## Inputs

- 3–4 **complete isolate assemblies**, one combined chromosome+plasmid FASTA per
  isolate. Per-isolate granularity → a Galaxy dataset **collection** (list of
  FASTA), named `MRSA isolate assemblies`.
- A **metadata TSV**: strain, year, source, symptom, chromosome accession,
  plasmid accession(s), genome size. (Listed as an expected artifact and a
  fallback input; the user treats it as a sidecar table.)

## Outputs

Expected paper/demo artifacts the user calls out:

- `staramr` outputs: `summary.tsv`, `detailed_summary.tsv`, `resfinder.tsv`,
  `plasmidfinder.tsv`, `mlst.tsv`.
- Metadata table (strain/year/source/symptom/accessions/genome size).
- AMR presence/absence matrix across isolates.
- Plasmid replicon / mobile-element matrix across isolates.
- Mobile-context table: isolate, ARG, phenotype, accession, coordinate,
  replicon/context, nearest IS/integron/plasmid marker, **distance**.
- ARG-by-isolate **heatmap**.
- Plasmid/mobile-element-by-isolate dot plot or heatmap.
- Stacked bar of ARG counts by context category.
- One or two locus diagrams / JBrowse screenshots.

Outputs that matter most for review/testing: the per-isolate ARG summary
(staramr) and the ARG heatmap (these are the comparison's payload); the
mobile-context table is the novel deliverable.

## Parameters

- Isolate count fixed at **3–4** (eight is stretch scope).
- No explicit numeric thresholds given for ARG calling or classification.
- AMR calls are **database-version-dependent**; user wants expected-output
  snapshots pinned where possible.
- "nearest IS/integron/plasmid marker, distance" implies a nearest-feature /
  distance computation, but the user does not specify a method or a distance
  cutoff.

## Data availability

- GTN Zenodo data: https://doi.org/10.5281/zenodo.10572227
- Assembly Zenodo data: https://doi.org/10.5281/zenodo.10669812
- Source paper: Hikichi et al. 2019, DOI `10.1128/mra.01212-19`.
- Comparative source: BioProject `PRJDB8599` (eight MRSA isolates, complete
  genome/plasmid accessions).
- Candidate isolate subset (accessions to verify): KUN1163 `AP020324`+`AP020325`;
  KUH140013 `AP020311`+`AP020312`; KUH140046 `AP020313`+`AP020314`; KUH180129
  `AP020322`+`AP020323`.
- Fallback: a small Zenodo bundle with combined chromosome+plasmid FASTA per
  isolate plus a metadata TSV, if direct INSDC FASTA import is unstable.

Real public data exists, but the exact accession set and download URLs are not
yet confirmed (see open questions).

## Constraints

- First version limited to 3–4 isolates.
- Do **not** re-teach read QC, assembly, or raw-read mapping — provenance only.
- Treat AMR calls as DB-version-dependent; pin output snapshots.
- Avoid broad pangenomics unless required for one targeted context question.
- Avoid clinical interpretation beyond published phenotype comparison.

## Confidence and open questions

High-confidence (interview-supported):
- The four named tools (`staramr`, `Bakta`, `ISEScan`, `IntegronFinder`) and the
  collection-of-assemblies input shape.
- The comparative intent and the mobile-context classification *categories*.
- The headline outputs (ARG heatmap, mobile-context table, per-isolate summaries).

Open questions (carried forward, not invented):
- Exact isolate accessions and stable FASTA download URLs (user lists candidates
  "to verify").
- Strain→plasmid accession mapping (from Hikichi Table 1 / INSDC).
- **Mobile-context classification rules** — the user has *not* defined them; the
  distance method and any cutoff for "IS-adjacent" / "integron-associated" are
  unspecified. Do not fabricate thresholds.
- Which specific Galaxy tool implements the table→interval/GFF3 reshaping.
- Whether `Bakta` runs on all isolates or a representative subset (runtime).
- Whether JBrowse is in-scope for the workflow proper or a downstream notebook
  figure step.
- Whether the metadata TSV is a workflow input or hand-curated sidecar.
