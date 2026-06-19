---
mold: find-test-data
date: 2026-06-19
intent: INTERVIEW→GALAXY pipeline test-drive on the differential ATAC-seq accessibility scenario (galaxy-brain #14 / UC3)
decision: eval-add
---

## What happened

On the first emulation pass this Mold marked **both** workflow inputs
(`ATAC counts`, `sample metadata`) `resolved: false` and fell through the
`test-data-resolution` chain to the `user-supplied` sentinel — and the
downstream `implement-galaxy-workflow-test` then staged **invented placeholder
paths** (`test-data/counts/sampleA_rep1.tabular`, …). That is a double failure:
a fabricated-data smell, and a *missed real resolution*. Real public data
matching the data-flow shape was deducible:

- **Corces 2016 ATAC count matrix — GEO `GSE74912`**
  (`GSE74912_ATACseq_All_Counts.txt.gz`, 590,650 peaks × 132 samples, hg19),
  a real URL (verified HTTP 200). This is the canonical public ATAC **count
  matrix** and the source the published SI recipe uses.
- The ENCODE accessions the issue named (ENCFF…/ENCSR…) are raw signal / peak
  files — they do **not** match the peak×sample count-matrix input shape, so
  "the issue's named candidates don't resolve" is *not* the same as "no data
  exists." The Mold stopped at the former.
- The GTN epigenetics/atac-seq tutorial (Zenodo 3862793) is single-sample chr22
  raw-read preprocessing — confirms the upstream tier, supplies no count matrix.

## Gaps surfaced

1. **Never emit invented placeholder paths.** When resolution genuinely fails,
   the entry must stay `resolved:false` with a reason and the branch must route
   to `user-supplied` honestly — but the *implement* step must not then fabricate
   paths. (This run's invented `sampleA/sampleB` paths are the thing the
   no-fabricated-references property is meant to forbid; it held for the refs
   file but the fabrication leaked into the tests file instead.)
2. **Shape-mismatch ≠ no-data.** When the source names candidate datasets that
   are the *wrong shape* for the required input, the Mold should keep searching
   public sources for the right-shape artifact (here: a GEO/array-express count
   matrix), not give up. A canonical public count matrix that matches the
   data-flow shape outranks a same-domain raw-signal accession that doesn't.
3. **"Small" = a documented subset of a real source, not a fabricated bundle.**
   The issue's "keep to one chromosome / selected loci" is satisfied by a
   row-subset (by peak-id chromosome prefix) + column-split of the real matrix —
   a data-import-boundary prep — not by inventing a tiny stand-in. Record the
   real source + the reproducible prep, and leave design parameters (factor,
   reference level, thresholds, top-N) to the design Molds.

## Proposed eval-add

- A property: *no fabricated paths anywhere downstream* — extend the
  no-fabricated-references guard so the staged test (`implement-galaxy-workflow-test`)
  cannot introduce invented input paths for inputs this Mold left unresolved;
  unresolved inputs stay unresolved through to the test, flagged, never
  papered over with placeholder paths.
- A property: *shape-driven public search* — when a source's named candidate
  datasets don't match the required input shape, the run records that mismatch
  *and* whether a shape-matching public source exists, rather than terminating
  at "named candidates don't fit."

## Open questions

- Should `find-test-data` carry a small registry of canonical public matrices /
  reference datasets per domain (GEO/ENCODE/ArrayExpress) so "the right-shape
  public source" is reachable without re-deriving it each run?
- Where does the subset+split prep belong — a note on the refs, or a real
  data-prep Mold/step — so a future CI run can regenerate the small fixture from
  GSE74912 deterministically?
