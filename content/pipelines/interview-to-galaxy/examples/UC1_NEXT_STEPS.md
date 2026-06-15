# UC1 Next Steps — bring Bakta annotation + JBrowse locus view into the workflow

**Issue:** `UC1_MRSA_issue.md` (originally galaxy-brain issue #12).
**For:** the agent that built the clean UC1 history. Handoff to push the
MRSA mobile-AMR analysis from "great paper figures" to "complete *workflow*."

## Why this handoff

You optimized UC1 for the Galaxy Notebooks paper: a clean collection map-over
that extracts to a flawless 14-step, sample-agnostic workflow with two on-graph
heatmaps. That goal was met. For that goal, Bakta was deliberately left out as
"non-extractable enrichment" and JBrowse was parked as a TODO.

But the **issue's plan (steps 4 and 8) names both**, and at the *workflow*
level they are load-bearing, not decoration:

- **Bakta** = the gene-context layer. Right now the ARGs are located (plasmid vs
  chromosome) and given a nearest-IS distance, but nothing annotates the genomic
  *neighborhood* — what genes flank the mobile-AMR locus. That's the structural
  confirmation the issue asks for.
- **JBrowse** = the auditable locus view. The headline (`aac(6')-aph(2'')` is
  IS6-adjacent on the KUN1163/KUH140046 plasmids but IS256-adjacent on the
  KUH180129 chromosome) is currently only legible as matrix cells. A JBrowse
  locus is the issue's intended way to *show* it.

Both tools are already installed on the reference server (`iuc/bakta`,
`iuc/jbrowse`). Bakta needs its light DB set up first; the known gotchas are
db-light layout, the amrfinder-db move, `.loc` registration, and serial
execution on Apple Silicon (to avoid OOM).

## Step A — Bakta whole-genome annotation (mapped over the collection)

- Tool: `toolshed.g2.bx.psu.edu/repos/iuc/bakta/bakta` (Bakta light DB v5.1).
- Input: the existing `MRSA isolate assemblies` `list` collection (the same input
  staramr/ISEScan/Integron Finder map over).
- Run **mapped** over all 4 isolates if runtime allows; on Apple Silicon run
  **serially** (one isolate at a time) to avoid OOM, or narrow to the two
  headline isolates (KUN1163, KUH180129).
- Output to expose: the Bakta **GFF3** annotation collection (and optionally the
  GBK/summary). This is the new annotation deliverable.
- Decide the wiring:
  - **Minimum:** expose Bakta GFF3 as a workflow output (enrichment; doesn't feed
    downstream). Lowest risk, still closes the issue's "annotate" task.
  - **Better:** feed the Bakta GFF3 as a track into Step B (JBrowse) so the locus
    view shows annotated CDS features around the ARG/IS, and/or `bedtools closest`
    the ARG BED against Bakta CDS features to attach a nearest-gene column to the
    context table.
- Extraction check: Bakta is a normal mapped tool — confirm it seeds and extracts
  with zero dangling like the rest of the spine. If it genuinely can't extract
  cleanly (it should), keep it as a parallel enrichment branch rather than
  dropping it.

## Step B — JBrowse locus view for the headline mobile-AMR region

- Tool: `toolshed.g2.bx.psu.edu/repos/iuc/jbrowse/jbrowse`.
- Issue step 8: "one representative mobile-AMR locus and one contrasting isolate."
  Use the headline contrast — **KUN1163** (plasmid, IS6-adjacent
  `aac(6')-aph(2'')`) vs **KUH180129** (chromosome, IS256-adjacent same gene).
- Reference: the per-isolate assembly FASTA (pull the relevant element from the
  `MRSA isolate assemblies` collection).
- Tracks — **reuse intermediate outputs already in the workflow**, so JBrowse is a
  connected step, not a fresh upload:
  - ARG sorted BED (the staramr→BED→SortBED output) → ARG features.
  - IS sorted BED (the ISEScan→BED→SortBED output) → IS features.
  - the `bedtools closest` output → the ARG↔IS pairing.
  - optionally the Bakta GFF3 from Step A → gene context.
- Output to expose: the JBrowse HTML per isolate (or one combined), centered on
  the `aac(6')-aph(2'')` locus.

## Verification (what "done" looks like)

| Check | Expected |
|---|---|
| Workflow step count | grows from 14 → ~16+ (Bakta + JBrowse, plus any closest/annotate glue) |
| Bakta output | GFF3 annotation collection exposed as a workflow output |
| JBrowse output | HTML locus view(s) exposed; `aac(6')-aph(2'')` visible beside its IS in both KUN1163 (plasmid/IS6) and KUH180129 (chr/IS256) |
| Re-extraction | new outputs exposed, **zero dangling** input_connections, report rewritten clean (hold the re-extraction to the same clean standard) |
| Science unchanged | the existing 14-step headline still reproduces byte-identically (don't perturb the staramr/ISEScan/closest spine; `remove_short_is=true` still required) |

## Scope / risks

- Bakta DB + Apple-Silicon serial execution is the main cost — budget for it;
  it's a one-time DB setup.
- Decide map-over-all-4 vs. two-isolate subset for Bakta/JBrowse before building;
  the headline only needs KUN1163 + KUH180129.
- Don't regress the clean extractable core to add these — prefer wiring them as
  additional connected steps/branches that also extract, following the
  "reference real outputs, don't re-upload" rule.
