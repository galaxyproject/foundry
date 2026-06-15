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

Each case also names an **aspirational target**: a `.ga` workflow extracted from
a hand-built Galaxy history. These targets are **not human-validated** and are
*not* a hard oracle. They are a compare-and-contrast reference: the run may match
the target, may exceed it (a cleaner or more complete realization), or may not
reach its shape at all. Divergence is the signal worth inspecting, not an
automatic failure. Judge the run against the issue's load-bearing scientific
intent first; treat the `.ga` as one plausible answer to hold the run beside.

These targets are also **known-incomplete, by design-of-the-moment**. Each was
built by a paper-focused agent optimizing for in-notebook figures and clean
notebook→workflow extraction, so each drops workflow-level deliverables its issue
calls for (catalogued per case below, with handoffs to close the gaps in the
`examples/UC1_NEXT_STEPS.md` / `examples/UC3_NEXT_STEPS.md` notes beside the
`.ga`). They aren't good enough yet; we will get there. So don't treat target
parity as the bar — a run that fills the catalogued gaps is *better* than the
current target.

## Case: MRSA mobile-AMR context across isolates

- fixture: `examples/UC1_MRSA_issue.md` as the interview result (captured from
  galaxy-brain issue #12). It names a 3–4 isolate complete-assembly FASTA
  collection ("MRSA isolate assemblies"), `staramr` for ARG/plasmid/MLST calls,
  ISEScan and IntegronFinder for mobile elements, table→interval/GFF3 reshaping,
  ARG mobile-context classification (plasmid / IS-adjacent / integron-associated
  / SCCmec candidate), and per-isolate summary tables plus an ARG heatmap.
- aspirational target (unvalidated): `examples/UC1_MRSA_extracted.ga` — a 14-step
  realization: collection input → `staramr` + `Integron Finder` + `ISEScan` →
  `Text reformatting` (awk) reshaping → `bedtools SortBED` ×2 →
  `bedtools ClosestBed` (ARG↔mobile-element distance, standing in for the
  mobile-context classification) → `Collapse Collection` → `heatmap2` ×2.
- expect: the journey produces a gxformat2 workflow that validates and
  round-trips, with the isolate-assembly collection as the primary input, the
  AMR call (`staramr`) and at least one mobile-element caller (ISEScan /
  IntegronFinder) preserved as steps, and the mobile-context question carried
  through as a real step or an explicit design decision rather than silently
  dropped; a per-isolate ARG summary/heatmap surfaces as an output.
- compare-and-contrast against the target: does the run reach the
  closest-feature distance idiom the `.ga` uses for mobile context, or solve it
  another way? Note tools the run invents or drops versus the target.
- known limitation of the target (bonus points to beat it): the issue calls for
  `Bakta` whole-genome annotation and a JBrowse locus view, but the hand-built
  history that produced `UC1_MRSA_extracted.ga` **never reached those stages** —
  Bakta was deliberately excluded as "non-extractable enrichment" and JBrowse was
  left as a TODO. Both tools are already installed on the reference server. So a
  run that pulls `Bakta` and/or a JBrowse locus view in (and validates) is
  exceeding even the manual attempt, not scope creep — credit it as a stretch
  goal met. Closing this gap on the manual build is the work in
  `examples/UC1_NEXT_STEPS.md`.

## Case: differential ATAC-seq accessibility

- fixture: `examples/UC3_ATAC_issue.md` as the interview result (captured from
  galaxy-brain issue #14). The count-matrix MVP path it describes: import a
  per-sample count collection plus a `sample_metadata.tsv`, run `DESeq2` with
  factor `condition`, filter significant peaks (`padj < 0.05`,
  `abs(log2FoldChange) >= 1`), and draw a volcano plot — with optional union-peak
  / `featureCounts` and deepTools branches held out of the MVP.
- aspirational target (unvalidated): `examples/UC3_ATAC_extracted.ga` — a 5-step
  realization of exactly that MVP: `ATAC sample metadata` input +
  `ATAC counts` collection input → `DESeq2` → `Text reformatting` (awk filter)
  → `Volcano Plot`.
- expect: the journey produces a gxformat2 workflow that validates and
  round-trips, with the counts collection and sample metadata as inputs, `DESeq2`
  keyed on the `condition` factor, the significance filter applied with the
  issue's thresholds (or those thresholds surfaced as a parameter/decision), and
  a volcano plot as an output. The MVP scope (count-matrix in, no raw-read
  preprocessing) is honored, not silently widened back to full FASTQ→peak
  processing.
- compare-and-contrast against the target: the `.ga` is a tight 5-step MVP — does
  the run land near that, or pull in the optional union-peak / `featureCounts`
  and deepTools-QC branches the issue flags as out-of-MVP? Treat extra QC/PCA
  steps as a deliberate enrichment to weigh, not an automatic win; flag any
  thresholds or the `condition` factor that get lost between briefs.
- known limitation of the target (bonus points to beat it): the target's only
  intermediate step (`Text reformatting`) is an **NA-row strip**, not the
  significance filter the issue asks for (step 7) — the significance thresholds
  (`padj < 0.05`, `|log2FoldChange| >= 1`) are applied only *inside* the Volcano
  Plot's coloring, so the workflow **emits no filtered or ranked
  differentially-accessible-peaks table** and no top-gained/lost ranking (issue
  steps 7 + 9). The actual differential call is trapped in a PDF rather than
  output as data. A run that materializes the filtered/ranked significant-peaks
  table as a workflow output is *better* than the target. Closing this gap on the
  manual build is the work in `examples/UC3_NEXT_STEPS.md`.
