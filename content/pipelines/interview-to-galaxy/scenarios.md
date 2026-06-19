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

Each case also names a **reference target**: a `.ga` workflow extracted from a
hand-built Galaxy history. These targets reproduce — each re-runs to its golden
numbers (UC1 byte-identical, UC3 identical, both published in the Galaxy
Notebooks supporting information) — but they are still a **compare-and-contrast
reference, not a hard oracle**. The run may match the target, may exceed it (a
cleaner or more complete realization), or may not reach its shape at all.
Divergence is the signal worth inspecting, not an automatic failure. Judge the
run against the issue's load-bearing scientific intent first; treat the `.ga` as
one plausible — well-realized — answer to hold the run beside.

Each target now carries the full workflow-level deliverables its issue calls for:
UC1 integrates Bakta whole-genome annotation and a per-isolate JBrowse locus
view; UC3 materializes the filtered + ranked differential-peaks tables as real
outputs. So target parity is a meaningful bar — a run that reaches the target's
shape has covered the issue, and one that exceeds it (a tool the target skips, a
tighter realization) is better still.

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
