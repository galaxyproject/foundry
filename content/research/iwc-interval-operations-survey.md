---
type: research
subtype: component
tags:
  - research/component
  - target/galaxy
status: draft
created: 2026-06-10
revised: 2026-06-10
revision: 1
ai_generated: true
related_notes:
  - "[[iwc-tabular-operations-survey]]"
  - "[[iwc-transformations-survey]]"
  - "[[iwc-shortcuts-anti-patterns]]"
  - "[[galaxy-tabular-patterns]]"
  - "[[galaxy-collection-patterns]]"
  - "[[tabular-synthesize-bed-from-3col]]"
  - "[[galaxy-interval-patterns]]"
  - "[[interval-overlap-filter]]"
  - "[[interval-coverage]]"
  - "[[interval-merge-overlapping]]"
  - "[[interval-window-flank]]"
  - "[[interval-consensus-by-multi-intersect]]"
  - "[[interval-mask-by-set-algebra]]"
  - "[[interval-windowed-coverage]]"
summary: "IWC corpus survey of coordinate-aware genomic interval operations; sizing and candidate boundaries for a galaxy-interval-patterns MOC, with hold-if-thin gate."
---

# IWC genomic interval operations survey

Backs #268 — a candidate `galaxy-interval-patterns` MOC, third sibling to [[galaxy-collection-patterns]] and [[galaxy-tabular-patterns]]. Scope is **coordinate-aware feature algebra** (operations that understand `chrom/start/end/strand`), not the domain tools that produce or consume intervals. The issue framed this explicitly as a **hold-if-thin gate**: the survey's first job is to size the corpus honestly and say plainly whether interval algebra is rich enough to graduate a MOC.

Source corpus: `$IWC_FORMAT2/` — 120 `.gxwf.yml` files. Citations are `$IWC_FORMAT2/path:line`. Distinct-step counts below exclude the trailing `unique_tools:` manifest block (which double-counts) and note where subworkflow embedding inflates a raw grep.

## TL;DR — the sizing finding

**Interval algebra is real but moderate, and narrower than its two siblings.** It clusters in two domains — epigenetics peak-consensus (bedtools) and SARS-CoV-2 consensus/masking (the legacy "Operate on Genomic Intervals" `gops_*` family) — plus scattered coverage-track generation. The highest-value units are **multi-step recipes**, not single operations; individually the operations are thin (`slop` and `subtract` appear once each).

Two findings sharpen the gate:

1. **The operation that motivated #268 — `closest` / proximity (the bedtools-`closest` "nearest feature + distance" move) — has zero *interval-algebra* uptake.** A grep for `closest` hits exactly one workflow, and it is an output *label* ("successful VAPOR runs - closest references", `$IWC_FORMAT2/virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping.gxwf.yml:30`), not a tool. There is no `bedtools_closestbed`, no legacy "fetch closest non-overlapping feature", and no `windowbed` anywhere in the corpus. Proximity *as a task* (nearest TSS/gene + distance) is also entirely absent from IWC — no peak annotators (ChIPseeker/HOMER/GREAT/UROPA), no `computeMatrix`. Per corpus-first, proximity gets a **gap note, not a pattern page**. The hole that prompted the issue cannot be filled from IWC. The natural tool — `bedtools_closestbed` (`-d` for distance) — exists in the same `iuc/bedtools` suite the corpus already uses nine subcommands from, so this is a *corpus* gap, not a Galaxy-capability gap: with no recurring exemplar there is no common pattern to capture, and an implementing agent reaches for the tool directly. (The GTN `computeMatrix` idiom noted in §GTN cross-reference is a narrower, ChIP/ATAC-specific proximity, not a general substitute.)
2. **Several catalog operations are also absent:** `complement`, `makewindows`, `map`, `window` (`-w` neighborhood join), `annotate`, and bedtools `jaccard` — zero each. (An earlier loose grep matched "jaccard" 11×; all are QIIME2 beta-diversity distance matrices — `$IWC_FORMAT2/amplicon/qiime2/qiime2-III-VI-downsteam/QIIME2-VI-diversity-metrics-and-estimations.gxwf.yml:126` — not the bedtools interval-similarity tool. Struck.)

So the recommendation this survey *enables* (the decision belongs to `/iwc-survey-act`, not here): a MOC is defensible but should lead with **recipes** and stay small; do not pad it with speculative operation pages for absent operations.

## 1. What exists — operation inventory

Distinct interval-algebra steps, by operation. Counts are evidence, not the headline.

### Overlap / intersect — the strongest single operation (5 distinct workflows)

- `bedtools_intersectbed` (iuc) — keep/annotate features by overlap with a second feature set.
  - `$IWC_FORMAT2/epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:629` ("get merged peaks overlapping at least x replicates") — `overlap_mode: [-wa, -wb]`, `reduce_or_iterate_selector: iterate`. Same step in the two sibling workflows: `.../consensus-peaks-chip-pe.gxwf.yml:581`, `.../consensus-peaks-chip-sr.gxwf.yml:579`.
  - `$IWC_FORMAT2/sars-cov-2-variant-calling/sars-cov-2-ont-artic-variant-calling/ont-artic-variation.gxwf.yml:648` ("Adjusted variant calls within primer binding sites") — intersect variants against a primer-binding-site BED, `overlap_mode: [-wa]` (report A only), `once: "true"`.
- `bedtools_multiintersectbed` (iuc) — N-way overlap across a *collection* of feature sets at once.
  - `$IWC_FORMAT2/epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:219` ("compute multi intersect") — `tag_select: tag`, input is a collection of per-replicate narrowPeak files, `cluster: false`, `filler: "0"`. Siblings: `.../consensus-peaks-chip-pe.gxwf.yml:195`, `.../consensus-peaks-chip-sr.gxwf.yml:194`.
- `vcfvcfintersect` (devteam) — VCF-native intersection, stays in VCF space rather than converting to BED.
  - `$IWC_FORMAT2/sars-cov-2-variant-calling/sars-cov-2-pe-illumina-artic-variant-calling/pe-artic-variation.gxwf.yml:891` — `isect_union: -i`, `invert: true` (keep variants *absent* from the second VCF), requires a reference FASTA.

### Coverage / quantification — two distinct sub-operations sharing a name

- `bedtools_genomecoveragebed` (iuc) — whole-genome coverage as a bedgraph. Two purposes in the corpus:
  - **Mask input**: `$IWC_FORMAT2/sars-cov-2-variant-calling/sars-cov-2-consensus-from-variation/consensus-from-variation.gxwf.yml:160` ("Depth of coverage") — `report_select: bg`, `zero_regions: true`, `split: true`; feeds a depth-threshold filter (below).
  - **Scaled coverage track**: `$IWC_FORMAT2/transcriptomics/rnaseq-pe/rnaseq-pe.gxwf.yml:614` ("Scaled Coverage both strands combined") — `report_select: bg`, a connected `scale` parameter (1/million-reads normalization). Same in `$IWC_FORMAT2/transcriptomics/rnaseq-sr/rnaseq-sr.gxwf.yml:582`.
- `bedtools_coveragebed` (iuc) — count/measure reads falling **in given regions** (region-restricted, not genome-wide).
  - `$IWC_FORMAT2/epigenetics/atacseq/atacseq.gxwf.yml:733` ("Compute coverage on summits +/-500kb") — inputA = merged windows, inputB = deduplicated-reads BAM, `reduce_or_iterate_selector: iterate`, `hist: false`, `mean: false`.

### Merge overlapping features (~3 workflows)

- `bedtools_mergebed` (iuc): `$IWC_FORMAT2/epigenetics/atacseq/atacseq.gxwf.yml:672` ("Merge summits +/-500kb") — `distance: "0"`, `c_and_o_argument_repeat: []`; `$IWC_FORMAT2/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:3512`.
- `gops_merge_1` (devteam, "Operate on Genomic Intervals"): `$IWC_FORMAT2/sars-cov-2-variant-calling/sars-cov-2-consensus-from-variation/consensus-from-variation.gxwf.yml:445` ("Combined low-coverage regions and filter-failed sites") — `returntype: true`.

### Set algebra — concat / subtract (legacy `gops_*` only)

- `gops_concat_1` (devteam) — concatenate interval sets. `$IWC_FORMAT2/sars-cov-2-variant-calling/sars-cov-2-consensus-from-variation/consensus-from-variation.gxwf.yml:420` (`sameformat: false`); `$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:299` ("SSU BED", combining per-feature-type rRNA prediction BEDs, `sameformat: true`). The mgnify raw grep count (17) is inflated — the same rRNA-prediction subworkflow is embedded several times inside `mgnify-amplicon-pipeline-v5-complete.gxwf.yml` (`:2178`, `:2205`, `:2261`, …); distinct authoring contexts are ~2.
- `gops_subtract_1` (devteam) — interval difference. Single occurrence: `$IWC_FORMAT2/sars-cov-2-variant-calling/sars-cov-2-consensus-from-variation/consensus-from-variation.gxwf.yml:467` ("Masking regions") — `min: "1"`, `returntype: -p`.

### Window / flank (slop) — single occurrence

- `bedtools_slopbed` (iuc): `$IWC_FORMAT2/epigenetics/atacseq/atacseq.gxwf.yml:547` ("get summits +/-500kb") — `addition: {addition_select: b, b: "500"}` (extend 500 bp both sides), `genome_file_opts: loc`. **Label-drift gotcha:** the step is labelled "+/-500kb" and renamed "1kb around each summit", but `b: "500"` is 500 **bp** (a 1 kb total window). Loose labels are common; trust the parameter, not the label.

### Absent — catalog capabilities with zero corpus uptake

`closest`/proximity, `complement`, `makewindows`, `map` (interval→value mapping), `window` (`-w` neighborhood join), `annotate`, `jaccard`. Per corpus-first these are documented gaps, **not** candidate patterns. None is anti-pattern evidence — just no exemplar.

## 2. Redundancy / decision-points

Where the corpus shows more than one tool competing for the same job — the boundaries the MOC must adjudicate.

1. **Modern `bedtools_*` (iuc) vs legacy `gops_*` "Operate on Genomic Intervals" (devteam).** The corpus splits cleanly by domain, not by capability: epigenetics (`atacseq`, `consensus-peaks`) and VGP reach for `bedtools_*`; the SARS-CoV-2 `consensus-from-variation` masking pipeline uses `gops_concat` + `gops_merge` + `gops_subtract`. This mirrors the `Grep1`-vs-`tp_grep_tool` redundancy the tabular survey resolved (see [[iwc-tabular-operations-survey]] §7 / `docs/PATTERNS.md` "Legacy tools as footnotes"). **Caveat against a clean 1:1 mapping:** `bedtools` has `mergebed` (matches `gops_merge`) but the corpus has no `bedtools_subtractbed`, and `gops_concat` is barely interval-aware (it is closer to plain concatenation than to set union). So a "recommend bedtools, footnote gops" rule is directionally right for `merge`, but `subtract`/`concat` need their own call. → Q1.
2. **VCF-native vs BED-native intersection.** Intersecting variants with regions is done two ways: convert variants to a BED-shaped feature set and use `bedtools_intersectbed` (`ont-artic-variation.gxwf.yml:648`), or stay in VCF space with `vcfvcfintersect` (`pe-artic-variation.gxwf.yml:891`). The decision turns on whether downstream needs VCF semantics (INFO/FORMAT preserved) or just coordinates. → Q2.
3. **"Coverage" is two operations.** `genomecoveragebed` (genome-wide bedgraph, for masking input or a normalized track) and `coveragebed` (reads-in-given-regions count) share a name and a tool family but answer different questions. A single "coverage" pattern page would have to hold both modes explicitly. → Q4.

## 3. Recurring idioms

### Single-tool parameter idioms (with citations)

- **`bedtools_intersectbed` always maps over a collection** via `reduce_or_iterate_selector: iterate` (`consensus-peaks-atac-cutandrun.gxwf.yml:660`, `ont-artic-variation.gxwf.yml:675`). `reduce` is never used in the corpus. `overlap_mode` is the real lever: `[-wa, -wb]` to report both sides (`:657`), `[-wa]` to report only the A feature (`ont-artic-variation.gxwf.yml:673`).
- **`genomecoveragebed` for a track** pins `report_select: bg` with a connected `scale` parameter; **for masking** it adds `zero_regions: true` so zero-depth spans become explicit rows the downstream filter can catch (`consensus-from-variation.gxwf.yml:181-185`).
- **`bedtools_slopbed`** needs a genome file (`genome_file_opts_selector: loc`) to clamp extensions at chromosome ends — coordinate-awareness the tabular equivalent ([[tabular-synthesize-bed-from-3col]]) cannot provide.

### Multi-step recipes (the high-value units)

These are invisible to grep and are where interval algebra actually earns a MOC.

1. **Consensus regions by multi-intersect-then-threshold** — `multiintersect` across a collection of per-replicate peak sets → `Filter1` on the replicate-count column → `intersect` the merged-sample peaks back against the thresholded consensus regions. Three sibling workflows, identical shape: `consensus-peaks-atac-cutandrun.gxwf.yml:219`→`:318` (filter)→`:629`; `consensus-peaks-chip-pe.gxwf.yml:195`→…→`:581`; `consensus-peaks-chip-sr.gxwf.yml:194`→…→`:579`. The replicate-count threshold is itself computed (`table_compute` min + `wc_gnu`, `consensus-peaks-atac-cutandrun.gxwf.yml:264-316`).
2. **Build a masking BED by interval set algebra** — `genomecoverage` (bedgraph) → `Filter1 c4 < threshold` ("Low-coverage regions", `consensus-from-variation.gxwf.yml:275`) → build variant-site BEDs via coordinate arithmetic (below) → `gops_concat` (`:420`) → `gops_merge` (`:445`) → `gops_subtract` (`:467`). Net: `mask = (low-coverage ∪ filter-failed-sites) − called-variant-sites`. This is the flagship interval-algebra recipe and the nearest corpus analogue to the kind of region computation #268 wanted — but it is set algebra, not proximity.
3. **Windowed coverage around features** — `slop` (fixed ±N bp window around summits) → `merge` (collapse overlapping windows) → `coverage` (reads per window): `atacseq.gxwf.yml:547`→`:672`→`:733`.

## 4. Candidate pattern boundaries

Operation-anchored names per `docs/PATTERNS.md`. Because the operations are thin and the recipes carry the value, the keep-set leans recipe-heavy — the inverse of the tabular survey.

**Recipes (keep — highest value):**

- **`recipe: interval-consensus-by-multi-intersect`** — the §3 recipe #1. Evidence: three sibling workflows. **Keep.** This is the single most reusable interval construct in the corpus.
- **`recipe: interval-mask-by-set-algebra`** — the §3 recipe #2 (concat → merge → subtract to compute a region mask). Evidence: `consensus-from-variation`. Single workflow, but it is the canonical "compute regions from regions" move and exercises three set operations at once. **Keep, flag single-source.**
- **`recipe: windowed-coverage-around-features`** — the §3 recipe #3 (slop → merge → coverage). Evidence: `atacseq`. Single workflow. **Keep-or-merge** — could fold into a coverage operation page as its worked example. → Q5.

**Operations (keep the ones with ≥2 distinct workflows; the rest become recipe ingredients, not standalone pages):**

- **`interval-overlap-filter`** (intersect / multi-intersect) — `bedtools_intersectbed` + `bedtools_multiintersectbed`, with the `iterate` + `overlap_mode` idioms and the vcf-native alternative as a footnote. Evidence: 5 workflows. **Keep — the one solid standalone operation page.**
- **`interval-coverage`** — `genomecoveragebed` (track / mask input) + `coveragebed` (reads-in-regions), two modes. Evidence: 4 workflows. **Keep**, but the page must split the two modes (Q4).
- **`interval-merge-overlapping`** — `bedtools_mergebed` / `gops_merge`. Evidence: 3 workflows. **Keep** (also a set-algebra-recipe ingredient).
- **`interval-window-flank`** (slop) — single occurrence; the label-drift gotcha is the only real teaching content. **Drop as standalone; document inside the windowed-coverage recipe.**
- **`interval-set-subtract` / `interval-concat`** — single / inflated occurrences, legacy `gops_*` only. **Drop as standalone; document inside the mask-by-set-algebra recipe**, which is where they actually appear.

**Gaps (document, no page):** `closest`/proximity, `complement`, `makewindows`, `map`, `window`, `annotate`, `jaccard` — §1 "Absent".

## 5. Bridges (cross-shape seams the MOC should cross-link)

- **interval ↔ collection.** Every `bedtools_intersectbed`/`coveragebed` step uses `reduce_or_iterate_selector: iterate` to map over a per-sample collection (`consensus-peaks-atac-cutandrun.gxwf.yml:660`). The interval MOC's `## Bridges` should point at [[galaxy-collection-patterns]] for the map-over mechanics.
- **interval ↔ tabular.** Two directions observed: (a) coordinate *construction* — `column_maker` builds BED start/end from VCF POS with indel-length arithmetic `int(c2) - (len(c3) == 1)` / `int(c2) + ((len(c3) - 1) or 1)` then `change_datatype: bed` (`consensus-from-variation.gxwf.yml:367-377`), a coordinate-aware cousin of [[tabular-synthesize-bed-from-3col]]; (b) coordinate *filtering* — `Filter1 c4 < N` on a bedgraph treats the interval file as a plain table (`consensus-from-variation.gxwf.yml:275`). The line #268 drew (tabular = opaque columns; interval = coordinate-aware) is exactly this seam. Cross-link [[galaxy-tabular-patterns]].
- **interval ↔ alignment / sequence (scope edge — out of scope here).** `bedtools_getfastabed` (16), `bedtools_maskfastabed` (5), and `bedtools_bamtobed` (8) consume intervals but produce **sequence** or convert **format**, not interval-algebra output. They belong to a prospective `galaxy-sequence-patterns` MOC (a healthy corpus cluster — `fasta_formatter` 20, `fasta_to_tabular`/`tab2fasta` 13/11, `fasta_merge_files_and_filter_unique_sequences` 14, `fasta_compute_length` 7, …), tracked as the #268 follow-up. Documented here only to fix the boundary; no candidate patterns.

## GTN cross-reference (training corpus, not IWC)

Non-corpus signal, kept separate from the IWC claims above. These citations are into the **GTN training-material repo** (`galaxyproject/training-material`), **not** the IWC corpus — they do not satisfy corpus-first and graduate no pattern page. They are recorded because they informed two decisions: promoting `slop` to its own page, and characterising which gaps are merely IWC-absent vs absent-everywhere. Distinct-tutorial counts (raw reference counts collapse to few tutorials):

- **`slop`** — `topics/transcriptomics/tutorials/clipseq/tutorial.md:478` (`SlopBed` → `Extract Genomic DNA`): extend crosslink sites to a window before fetching sequence. Same "extend to a neighborhood" shape as the IWC `atacseq` use — a genuine **independent second example**, the basis for the `interval-window-flank` page.
- **`complement`** — one tutorial, `topics/assembly/tutorials/ecoli_comparison/tutorial.md:965` (`ComplementBed`, to find unaligned/unique regions). Zero IWC. A *first* example in the wrong corpus, not a second — elevates complement from silent gap to "GTN-attested, IWC-absent," not to a page.
- **coordinate-aware `sort`** — three tutorials (`topics/assembly/tutorials/ecoli_comparison`, `topics/epigenetics/tutorials/formation_of_super-structures_on_xi/tutorial.md:639`, `topics/single-cell/tutorials/scatac-preprocessing-tenx/tutorial.md:256`) use `bedtools_sortbed`. IWC sorts intervals with tabular `sort1` instead — a real interval↔tabular seam. Not in the IWC gap list above because IWC does the operation, just not coordinate-aware; recorded here as a GTN-surfaced candidate. Zero IWC `bedtools_sortbed`.
- **`closest`/proximity** — **no interval-algebra form in GTN** (no `bedtools_closestbed`, no fetch-closest, no `windowbed`). But proximity *as a task* **is** present in GTN, only ever as a **domain step**: `deeptools computeMatrix` in **reference-point** mode (signal aggregated relative to nearest TSS) is taught across ~6 epigenetics tutorials (`topics/epigenetics/tutorials/{atac-seq,cut_and_run,tal1-binding-site-identification,estrogen-receptor-binding-site-identification,formation_of_super-structures_on_xi,methylation-seq}`). That is proximity-*adjacent* (reference-point signal, not "nearest feature + distance") and a domain/visualization tool — out of scope per #268. (Apparent ChIPseeker/UROPA usage was a grep artifact: `uropa` matched "Europa" URLs; `chipseeker` appears only in an admin tool-install snippet, not an analysis tutorial.) Net: `bedtools_closestbed` is the natural interval-algebra tool for nearest-feature-plus-distance and exists in-suite, but has zero uptake in either corpus — so no pattern page (corpus-first), a *corpus* gap rather than a capability gap. The GTN `computeMatrix` idiom is a **different**, narrower proximity (signal aligned at TSS), not a general substitute for it.

## 6. Open questions

1. **Q1 — `bedtools_*` vs `gops_*` recommendation.** Adopt the tabular "modern tool leads, legacy footnoted" rule (recommend `bedtools_mergebed`, footnote `gops_merge`)? It applies cleanly to `merge`, but `gops_subtract` has no corpus `bedtools_subtractbed` and `gops_concat` is barely interval-aware. Per-operation call needed; evidence in §2.1.
2. **Q2 — VCF-native vs BED-native intersect.** Which does the overlap page lead with, and does `vcfvcfintersect` get a "stay in VCF space when INFO/FORMAT must survive" sidebar? Evidence: §2.2.
3. **Q3 — does the MOC graduate now, or hold?** The gate. Real but moderate corpus, recipe-led, with the motivating operation (`closest`) absent and several catalog operations absent. Graduate a small recipe-led MOC, or hold until a second proximity/complement exemplar appears? This is the decision `/iwc-survey-act` owns; the survey's job was to surface that the corpus is moderate-not-rich and proximity is empty. Evidence: TL;DR + §4.
4. **Q4 — coverage page shape.** One `interval-coverage` page with two explicit modes (genome-wide track vs reads-in-regions), or two pages? Evidence: §2.3.
5. **Q5 — recipe vs operation granularity.** Because operations are thin and recipes carry the value, should `slop`/`subtract`/`concat` exist only as ingredients documented inside the three recipe pages, with just three standalone operation pages (`overlap-filter`, `coverage`, `merge`)? Lean: yes. Evidence: §4.
6. **Q6 — naming of the MOC topic tag.** Issue specifies `topic/interval-transform` and title "Galaxy: genomic interval patterns". Confirm before the MOC and tag are authored (the tag must be registered in `meta_tags.yml` first).
