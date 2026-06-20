# INTERVIEW → GALAXY pipeline scenarios

Concrete end-to-end journeys for the INTERVIEW → GALAXY pipeline. A pipeline
scenario names the journey input **once**; each member Mold's `eval.md` applies
to its step's output as the journey advances (it does not re-list the per-Mold
scenarios).

All fixtures for these cases are vendored under `examples/` beside this file, so
the cases are self-contained — no GitHub fetch or external checkout is required
to drive a run. Each `examples/*_issue.md` carries a provenance header noting the
galaxy-brain issue it was captured from, but the captured text is the binding
fixture.

The live interview is harness-owned and precedes phase 1
([[interview-to-freeform-summary]]). For these cases the interview result is
**supplied as a saved issue body** — a real, already-elaborated demo brief that
stands in for a normalized interview transcript — so the journey can be driven
from a fixed input.

Cases come in two tiers. **Reference-target cases** (UC1, UC3) name a `.ga`
workflow extracted from a hand-built Galaxy history. These targets reproduce —
each re-runs to its golden numbers (UC1 byte-identical, UC3 identical, both
published in the Galaxy Notebooks supporting information) — but they are still a
**compare-and-contrast reference, not a hard oracle**. The run may match the
target, may exceed it (a cleaner or more complete realization), or may not reach
its shape at all. Divergence is the signal worth inspecting, not an automatic
failure. Judge the run against the issue's load-bearing scientific intent first;
treat the `.ga` as one plausible — well-realized — answer to hold the run beside.

Each target carries the full workflow-level deliverables its issue calls for:
UC1 integrates Bakta whole-genome annotation and a per-isolate JBrowse locus
view; UC3 materializes the filtered + ranked differential-peaks tables as real
outputs. So target parity is a meaningful bar — a run that reaches the target's
shape has covered the issue, and one that exceeds it (a tool the target skips, a
tighter realization) is better still.

**Spec-only cases** (UC4–UC7, captured from galaxy-brain issues #27–#30) carry
**no reference target** — no hand-built `.ga`, no golden numbers. They exist to
exercise the pipeline on domains and analytical shapes the reference-target pair
doesn't cover (molecular selection, bioimage morphometry, single-cell pseudobulk,
FT-MS characterization), where building a golden by hand would be costly and
where there is nothing pre-built to compare against. For these the **oracle is
the `expect:` block alone**: at the end of the journey an agent judges the
produced gxformat2 workflow against the issue's load-bearing intent (does it
validate and round-trip, are the load-bearing inputs/tools/outputs present, is
the MVP-vs-stretch scope honored without silently widening or collapsing). Each
spec-only case still cites the real IWC anchor workflow(s) the issue grounds in,
so the [[compare-against-iwc-exemplar]] phase has corpus to lean on even though
no target is vendored here.

## Case: MRSA mobile-AMR context across isolates

- fixture: `examples/UC1_MRSA_issue.md` as the interview result (captured from
  galaxy-brain issue #12). It names a 3–4 isolate complete-assembly FASTA
  collection ("MRSA isolate assemblies"), `staramr` for ARG/plasmid/MLST calls,
  ISEScan and IntegronFinder for mobile elements, table→interval/GFF3 reshaping,
  ARG mobile-context classification (plasmid / IS-adjacent / integron-associated
  / SCCmec candidate), `Bakta` whole-genome annotation, per-isolate summary
  tables plus an ARG heatmap, and a JBrowse locus view.
- reference target: `examples/UC1_MRSA_Bakta_JBrowse_faithful.ga` — a 35-step
  faithful realization: collection input → `staramr` + `Integron Finder` +
  `ISEScan` + `Bakta` (all mapped) → `Text reformatting` (awk) + `tbl2gff3`
  reshaping → `bedtools SortBED` ×2 → `bedtools ClosestBed` (ARG↔mobile-element
  distance, standing in for the mobile-context classification) →
  `Collapse Collection` → `heatmap2` ×2 → per-isolate `JBrowse` locus view. The
  six `__BUILD_LIST__` nests are what make each mapped multiple-input connection
  (staramr, the two closest joins, the three JBrowse tracks) round-trip as a
  map rather than silently reducing; the workflow re-runs byte-identical to the
  validated golden.
- expect: the journey produces a gxformat2 workflow that validates and
  round-trips, with the isolate-assembly collection as the primary input, the
  AMR call (`staramr`) and at least one mobile-element caller (ISEScan /
  IntegronFinder) preserved as steps, and the mobile-context question carried
  through as a real step or an explicit design decision rather than silently
  dropped; a per-isolate ARG summary/heatmap surfaces as an output.
- compare-and-contrast against the target: does the run reach the
  closest-feature distance idiom the `.ga` uses for mobile context, or solve it
  another way? Does it pull `Bakta` gene-context annotation and a JBrowse locus
  view in like the target does, or stop at the AMR / mobile-element core? Note
  tools the run invents or drops versus the target. A run that stops at the core
  still satisfies the issue's load-bearing intent; reaching Bakta + JBrowse is
  full target parity.

## Case: differential ATAC-seq accessibility

- fixture: `examples/UC3_ATAC_issue.md` as the interview result (captured from
  galaxy-brain issue #14). The count-matrix MVP path it describes: import a
  per-sample count collection plus a `sample_metadata.tsv`, run `DESeq2` with
  factor `condition`, filter significant peaks (`padj < 0.05`,
  `abs(log2FoldChange) >= 1`), rank top condition-gained / condition-lost peaks,
  and draw a volcano plot — with optional union-peak / `featureCounts` and
  deepTools branches held out of the MVP.
- reference target: `examples/UC3_ATAC_extracted_figures.ga` — a 13-step
  realization (published as Galaxy Notebooks SI Workflow S5):
  `ATAC sample metadata` input + `ATAC counts` collection input → `DESeq2` →
  `Text reformatting` (awk NA-filter) → { `Volcano Plot` ∥ significance filter
  (`Text reformatting`, `padj < 0.05` & `|log2FC| >= 1`) → `Sort` →
  `Select first` / `Select last` = top-gained / top-lost ranked tables }, with
  each PDF figure (DESeq2 PCA, volcano) rasterized to PNG by an in-graph
  `Convert image format` → `Extract dataset` pair so the figures extract as real
  on-graph outputs. 6 workflow outputs.
- expect: the journey produces a gxformat2 workflow that validates and
  round-trips, with the counts collection and sample metadata as inputs, `DESeq2`
  keyed on the `condition` factor, the significance filter applied with the
  issue's thresholds (or those thresholds surfaced as a parameter/decision) and
  **materialized as a filtered/ranked differential-peaks table output** rather
  than left only inside the volcano's coloring, and a volcano plot as an output.
  The MVP scope (count-matrix in, no raw-read preprocessing) is honored, not
  silently widened back to full FASTQ→peak processing.
- compare-and-contrast against the target: the `.ga` branches the significance
  filter and ranking off the NA-stripped table in parallel with the volcano —
  does the run materialize the filtered/ranked significant-peaks table as a
  workflow output the way the target does, or trap the differential call inside
  the volcano PDF (a run that only reaches the 5-step DESeq2→filter→volcano spine
  is *behind* the target)? Does it pull in the optional union-peak /
  `featureCounts` and deepTools-QC branches the issue flags as out-of-MVP? Treat
  extra QC/PCA steps as a deliberate enrichment to weigh, not an automatic win;
  flag any thresholds or the `condition` factor that get lost between briefs.

## Case: HyPhy molecular-selection landscape across Dengue CDS genes

- fixture: `examples/UC4_HYPHY_issue.md` as the interview result (captured from
  galaxy-brain issue #27). It describes a per-gene episodic-diversifying-vs-
  purifying selection panel over the two Dengue (DENV1) CDS genes in the IWC
  HyPhy test data: MEME / FEL / BUSTED / PRIME (genetic code `Universal`) run as
  a **collection map-over** across a codon-alignment collection, then collapsed
  by `DRHIP` into a `combined_summary` + `combined_sites` selection-landscape
  table. The stretch is the Compare arc: label the three recent 2023 isolates as
  foreground (`hyphy_annotate`), run RELAX (intensification/relaxation) and
  Contrast-FEL, and collapse to `combined_comparison_summary` /
  `combined_comparison_site`.
- reference target: none — spec-only. IWC anchors the issue cites:
  `comparative_genomics/hyphy/hyphy-core`, `hyphy-preprocessing`,
  `hyphy-compare`, `capheine-core-and-compare` (the DRHIP orchestrator). No
  hand-built `.ga` golden is vendored.
- expect: the journey produces a gxformat2 workflow that validates and
  round-trips, with a codon-alignment **collection** as the primary input (the
  precomputed `codon_alignments/` + `iqtree_trees/` import shortcut is an
  acceptable MVP entry), at least the Core selection methods (MEME/FEL/BUSTED/
  PRIME) preserved and applied **as a map-over** rather than collapsed to a
  single-gene run, genetic code carried as `Universal`, and a `DRHIP`-style
  combined cross-gene summary table surfaced as a real workflow output rather
  than leaving per-gene JSON blobs as the terminal artifact. If the run reaches
  the stretch, the 2023-foreground RELAX/CFEL contrast appears as explicit
  labeled steps, not a silent merge.
- spec check (end of journey): with no target to diff against, an agent judges
  the workflow against the issue's load-bearing intent — collection map-over
  preserved (not silently reduced to one gene), JSON→table collapse present, the
  small-panel honesty (two genes, three foreground isolates) reflected as a
  scope note rather than overclaimed, and MVP (Core) vs stretch (Compare) scope
  kept legible. Flag any HyPhy method, the `Universal` code, or the DRHIP
  collapse that gets dropped between briefs.

## Case: per-object IHC morphometry — control vs drug-treated

- fixture: `examples/UC5_IHC_issue.md` as the interview result (captured from
  galaxy-brain issue #28). It describes a bioimage cohort analysis over the IWC
  `histological-staining-area-quantification` chain (color deconvolution → split
  channel → Otsu threshold) on a 6-element CD11b IHC ROI collection (3 vehicle
  control, 3 4-oxo-RA treated), run as a **collection map-over**, then pushed
  past one "% stained area" number per image: `ip_binary_to_labelimage`
  (connected components) → `ip_2d_feature_extraction` (`with-intensities`,
  expanded feature set) yields a **per-object** table per sample (area,
  eccentricity, solidity, perimeter, intensity), feeding control-vs-treatment
  distribution plots and a retained-% area summary. Stretch: a per-sample ×
  feature cohort heatmap.
- reference target: none — spec-only. IWC anchors the issue cites:
  `imaging/histological-staining-area-quantification` (base chain) and
  `imaging/fluorescence-nuclei-segmentation-and-counting` (the
  `binary2labelimage` / `count_objects` / overlay object lever). No hand-built
  `.ga` golden is vendored.
- expect: the journey produces a gxformat2 workflow that validates and
  round-trips, with a single `list` collection of the 6 IHC ROIs keyed by
  condition (`control_1..3`, `treatment_1..3`) as input, the deconvolution →
  channel-split → Otsu chain preserved **as a map-over**, the object-level lever
  present (a connected-components label step plus per-object feature extraction)
  rather than stopping at one merged %-area number per image, and a per-object
  feature table plus a control-vs-treatment distribution comparison surfaced as
  real outputs. The intensity image fed to feature extraction is the deconvolved
  DAB channel, not the RGB original.
- spec check (end of journey): an agent judges against the issue's load-bearing
  intent — that the run reaches per-object morphometry (the issue's whole point)
  and not just the thin %-area t-test, that the map-over shape over the 6-element
  collection is intact, and that element identifiers carry a `condition` tag
  through to the distribution comparison. The 3-vs-3 replication and Otsu
  over-merge sensitivity should read as honest caveats, not silently dropped.

## Case: cell-type-resolved pseudobulk differential expression (COVID-19)

- fixture: `examples/UC6_PSEUDOBULK_issue.md` as the interview result (captured
  from galaxy-brain issue #29). It describes a single-cell→pseudobulk DE
  analysis over the IWC `pseudo-bulk_edgeR` workflow: decoupler pseudobulk
  aggregation (groupby `cell_type`, sample key `individual`, layer `counts`,
  factor `disease`) of an annotated `h5ad`, then a pooled `normal` vs `COVID_19`
  edgeR contrast → ranked DEG table + volcano, framed single-cell-natively
  (people-as-replicates). Stretch (the substantial deviation, needs
  recomposition): fan the analysis out **per cell type** — subset the pseudobulk
  count matrix by `cell_type`, map edgeR over the per-cell-type subsets as a
  collection, and synthesize a responder-ranking + shared-vs-cell-type-specific
  gene summary.
- reference target: none — spec-only. IWC anchors the issue cites:
  `scRNAseq/pseudobulk-worflow-decoupler-edger/pseudo-bulk_edgeR` (primary) and
  `scRNAseq/scanpy-clustering` (optional upstream annotation chapter). No
  hand-built `.ga` golden is vendored.
- expect: the journey produces a gxformat2 workflow that validates and
  round-trips, with the annotated `h5ad` as input, the **pseudobulk aggregation**
  step present (groupby `cell_type` / sample key `individual` / factor
  `disease`), an edgeR contrast keyed on `normal-COVID_19`, and a DEG table plus
  volcano as outputs. The MVP (one pooled contrast) is a complete answer; if the
  run reaches the stretch, the per-cell-type fan-out appears as a real on-graph
  subset → map-edgeR-over-collection → cross-cell-type synthesis, not a hand-
  waved loop.
- spec check (end of journey): an agent judges against the issue's load-bearing
  intent — the pseudobulk axis (the single-cell-specific transform) is present
  and not collapsed to a plain bulk DESeq2 contrast, the `disease` factor keeps
  its two expected levels, and any stretch fan-out honors per-cell-type
  statistical-power caveats rather than overclaiming on thin cell types. Flag if
  the headline silently degrades from "which cell types respond" back to a single
  pooled verdict.

## Case: FT-MS van Krevelen chemical-space characterization

- fixture: `examples/UC7_FTMS_issue.md` as the interview result (captured from
  galaxy-brain issue #30). It describes a metabolomics / FT-MS vignette over the
  IWC `mfassignr` workflow on a single high-resolution mass list — a
  **descriptive, single-sample characterization**, not a two-condition
  differential. The linear on-graph chain: noise estimation (`kmdnoise` /
  `histnoise`) → isotope filter (`isofiltr`) → first-pass CHO assignment
  (`mfassignCHO`) → recalibrant selection (`recallist` → `findRecalSeries`) →
  recalibration (`recal`, emitting the error-m/z `MZplot`) → final
  heteroatom-aware assignment (`mfassign`, emitting `Unambig`/`Ambig`/`None`
  tables and the per-element `plots` collection). The money-shot output is the
  **van Krevelen diagram** (`VK`); the error-m/z plot is the QC story. Stretch:
  an on-graph chemical-class composition summary binned from the `Unambig`
  table.
- reference target: none — spec-only. IWC anchor the issue cites:
  `metabolomics/mfassignr/mfassignr`. No hand-built `.ga` golden is vendored.
- expect: the journey produces a gxformat2 workflow that validates and
  round-trips, with the single feature-table mass list as input, the
  noise→isotope-filter→assign→recalibrate→re-assign chain preserved as a **linear
  pipeline (no map-over)**, the van Krevelen (`VK`) plot surfaced as a real
  workflow output, and the molecular-formula tables (at least `Unambig`,
  ideally `Ambig`/`None` for assignment-confidence honesty) exposed. The shape
  stays **descriptive** — the run must not invent a condition contrast or a
  differential framing the single sample can't support.
- spec check (end of journey): an agent judges against the issue's load-bearing
  intent — descriptive (non-differential) shape preserved, the recalibration QC
  step present (not skipped as decoration), the van Krevelen plot reached as the
  headline artifact, and assignment ambiguity represented honestly rather than
  collapsing to only the clean `Unambig` set. This case is the corpus's check
  that the pipeline handles a single-sample characterization, not only A-vs-B
  contrasts.
