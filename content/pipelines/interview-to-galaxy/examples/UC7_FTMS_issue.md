# UC7 / FT-MS van Krevelen chemical-space characterization — interview input

> Pulled-down GitHub issue used as the **effective result of the INTERVIEW → GALAXY interview**
> (the live interview mechanics are harness-owned and precede pipeline phase 1).
> Source: galaxy-brain issue #30 (captured verbatim from the issue body).
> No paired reference target: this case is **spec-only** — there is no vendored `.ga` golden to
> reproduce. Judge the run against the `expect:` block in `scenarios.md` (an agent checks the
> produced workflow against the issue's load-bearing intent at the end of the journey).

---

## Plain-language science (why this is interesting)

Ultrahigh-resolution mass spectrometry (FT-ICR or Orbitrap) measures the mass of each molecule so precisely that you can deduce its exact **molecular formula** — how many carbons, hydrogens, oxygens, nitrogens, sulfurs — from the mass alone. A single complex environmental sample (dissolved organic matter from water, soil, or sediment) can contain **thousands of distinct formulas**.

The signature way to look at that chemistry is the **van Krevelen diagram**: each assigned formula is a point plotted by its **O/C ratio (x-axis)** against its **H/C ratio (y-axis)**. Where a point lands tells you its compound class — lipids (low O/C, high H/C), carbohydrates (high O/C, high H/C), lignins/aromatics and tannins (lower H/C, mid O/C), proteins, etc. So one plot is a **fingerprint of the sample's entire chemical space**.

Before the formulas can be trusted, the mass axis must be **recalibrated** — tiny systematic mass errors are corrected against a series of confident reference peaks, which is what tightens part-per-million accuracy enough to make assignment unambiguous. The error-vs-m/z plot literally shows that ppm error shrinking after recalibration. The workflow's job is exactly this sequence: estimate noise, separate isotope peaks, make a first formula pass, pick recalibrant series, recalibrate, re-assign with heteroatoms, and draw the diagnostic plots.

## Purpose

Add a **metabolomics / mass-spectrometry** vignette to the Galaxy Notebooks paper that is novel on **both** axes the genomics-only corpus lacks: a new **modality** (FT-MS) and a new **analytical shape** (descriptive chemical-space *characterization* of a single sample, rather than a two-condition differential). Every displayed figure/table is a genuine on-graph Galaxy tool output, so the linear assignment+recalibration pipeline extracts to a reusable single-sample workflow via the history provenance graph. This belongs in `galaxy-brain` because the deliverable is a paper/demo notebook, not a change to an IWC workflow.

## Objective (MVP + stretch)

**MVP:** Run the IWC `mfassignr` workflow on its shipped single high-resolution mass list to produce, all on-graph: noise estimate, isotope-filtered peaks, recalibrated mass series, final molecular-formula tables (Unambig / Ambig / None), and the diagnostic plot collection — then build a notebook whose money shot is the embedded **van Krevelen diagram**, narrated as "what chemical families make up this sample," with the recalibration error-m/z plot as the QC story.

**Stretch:** A small on-graph **chemical-class composition summary** derived from the assigned formulas (e.g. counts/fractions of formulas falling in lipid / carbohydrate / lignin / aromatic regions of van Krevelen space, or by heteroatom class CHO vs CHON vs CHOS) as a ranked table or bar chart — turning the qualitative van Krevelen picture into a quantitative on-graph table. (Confirm an on-graph tool can compute the class binning, or it becomes a documented limitation.)

## Why this is a useful demo deviation

- **Shape-novel, not just modality-novel.** The three existing vignettes are all *differential comparisons* (AMR across isolates, ATAC between lineages, ChIP between lineages). This one is *characterization* — "describe the chemistry of this sample" — a notebook shape the paper hasn't shown, demonstrating that history-attached notebooks serve descriptive analysis, not only A-vs-B contrasts.
- **The genomics-impossible figure.** The van Krevelen diagram has no analogue in sequencing; it's the figure that earns metabolomics a slot on more than data-modality grounds (this is the explicit reason for choosing the mfassignr anchor over a GC-MS differential, whose PCA+heatmap+volcano shape duplicates the ATAC vignette).
- **Clean linear extraction.** The pipeline is a multi-step on-graph chain (noise → isotope filter → assign → recalibrate → re-assign → plot); walking the provenance graph backward from the van Krevelen plot recovers the whole assignment+recalibration workflow — an extraction story that needs no map-over, complementing the collection-heavy vignettes.

## Existing analysis anchors (real tool ids / paths)

Anchor workflow: `iwc/workflows/metabolomics/mfassignr/mfassignr.ga` (RECETOX/MUNI; MIT). Tools (all `recetox/mfassignr_*`, `1.1.2+galaxy*`):
- `mfassignr_kmdnoise/mfassignr_kmdnoise/1.1.2+galaxy0` — Kendrick-mass-defect noise estimation
- `mfassignr_histnoise/mfassignr_histnoise/1.1.2+galaxy0` — histogram-based noise estimation
- `mfassignr_isofiltr/mfassignr_isofiltr/1.1.2+galaxy1` — isotope filtering (monoisotopic vs isotopologue peaks)
- `mfassignr_mfassignCHO/mfassignr_mfassignCHO/1.1.2+galaxy1` — first-pass CHO-only formula assignment (for recalibration)
- `mfassignr_recallist/mfassignr_recallist/1.1.2+galaxy0` — candidate recalibrant series
- `mfassignr_findRecalSeries/mfassignr_findRecalSeries/1.1.2+galaxy1` — choose optimal recalibrant series
- `mfassignr_recal/mfassignr_recal/1.1.2+galaxy0` — mass recalibration (emits `recal_series`, `final_series`, `MZplot`)
- `mfassignr_mfassign/mfassignr_mfassign/1.1.2+galaxy1` — final formula assignment with heteroatoms (emits `Unambig`/`Ambig`/`None` tables + per-element `plots` collections containing VK, MSgroups, errorMZ, msassign)
- `mfassignr_snplot/mfassignr_snplot/1.1.2+galaxy1` — signal-to-noise diagnostic (`SNplot`)

IWC repo: `galaxyproject/iwc`, `workflows/metabolomics/mfassignr/`.

## Public data candidates (real shipped data)

From `mfassignr-tests.yml`:
- Input: single `Feature table` — `https://zenodo.org/records/13768009/files/mfassignr_input.txt` (tabular; SHA-1 `3df0ba47…`), a high-resolution mass list (mass, intensity[, RT]). **One sample** — descriptive, not comparative.
- Shipped expected outputs confirm the embeddable artifacts: `SNplot.png` (~58K), `MZplot.png` (~85K), `recal_series.tabular`, `final_series.tabular`, `Unambig.tabular`, `Ambig.tabular`, `None.tabular`, and per-element `plots` collections (CHO and full-element) each containing `VK` (van Krevelen, ~0.9 MB), `MSgroups`, `errorMZ`, `msassign`.

## Notebook workflow plan (numbered, on-graph)

1. Upload the high-resolution mass list (`mfassignr_input.txt`, Zenodo 13768009); show a head of the input as an on-graph table.
2. Noise estimation — `mfassignr_kmdnoise` (and/or `mfassignr_histnoise`) → noise threshold; embed the **SN plot** (`mfassignr_snplot`) as the first QC figure.
3. Isotope filtering — `mfassignr_isofiltr` → monoisotopic peak list.
4. First-pass assignment — `mfassignr_mfassignCHO` → CHO formulas used as recalibration anchors.
5. Recalibrant selection — `mfassignr_recallist` → `mfassignr_findRecalSeries` → chosen recalibrant series.
6. Recalibration — `mfassignr_recal` → `recal_series`, `final_series`, and the **error-m/z plot** (`MZplot`); embed the error-m/z plot and narrate the ppm-accuracy improvement.
7. Final assignment — `mfassignr_mfassign` → `Unambig` / `Ambig` / `None` formula tables and the per-element `plots` collection (VK, MSgroups, errorMZ, msassign).
8. Embed the **van Krevelen diagram** (the `VK` element) as the money shot, with the `Unambig` formula table beside it; narrate the chemical-family interpretation.
9. (Stretch) Compute an on-graph chemical-class composition summary from the `Unambig` table (van-Krevelen-region or heteroatom-class binning) → ranked table / bar chart.
10. Walk the provenance graph backward from the van Krevelen plot to extract the reusable assignment+recalibration workflow.

## Expected paper/demo artifacts

- **Van Krevelen diagram** (on-graph `VK` plot) — the headline, genomics-impossible figure.
- Error-m/z recalibration plot (`MZplot`) showing ppm-accuracy improvement; SN plot.
- `Unambig` molecular-formula table (and `Ambig`/`None` for honesty about assignment confidence).
- MSgroups / msassign diagnostic plots.
- (Stretch) chemical-class composition summary table/bar.
- The extracted single-sample assignment+recalibration workflow (`.ga`) + a Table 1 row (linear chain; no map-over).

## Scope and risks

- **Single sample, descriptive.** No biological comparison; the contribution is characterization + a distinctive figure + a non-differential notebook shape. Frame as such — do not imply a condition contrast.
- **Assignment ambiguity is real.** High-resolution MS can fit multiple formulas to one mass within tolerance; the `Ambig`/`None` tables exist for this. The notebook must show ambiguity honestly, not just the clean `Unambig` set.
- **Audience/literacy.** Van Krevelen and Kendrick-mass-defect literacy is high in environmental/petroleomics MS but low in genomics; the narrative must explain the axes and regions.
- **Stretch class-binning tool.** The chemical-class composition summary needs an on-graph tool (column arithmetic on O/C, H/C from the formula table); confirm one exists or document it as a limitation rather than pasting an off-graph computation.
- **Provenance/pinning.** Pin all `recetox/mfassignr_*` `1.1.2+galaxy*` versions and the Zenodo record (13768009); confirm the test passes on the target server. Element-collection structure (CHO vs full-element `plots`) must render in the notebook directive.

## Tasks

- [ ] Confirm the Zenodo input (`mfassignr_input.txt`, 13768009) resolves and the workflow runs end-to-end on the target server.
- [ ] Run the chain; verify the on-graph `VK`, `MZplot`, `SNplot`, and `Unambig`/`Ambig`/`None` outputs render embeddably (esp. the per-element `plots` collection directive).
- [ ] Build the notebook with the van Krevelen diagram as the money shot + the `Unambig` table + the error-m/z QC narrative.
- [ ] Decide noise method (KMDNoise vs HistNoise) and document the choice and its effect.
- [ ] Stretch: identify an on-graph tool to bin formulas into chemical classes (van-Krevelen region or heteroatom class) → composition table/bar; else document as a limitation.
- [ ] Show assignment ambiguity honestly (Ambig/None), not only Unambig.
- [ ] Walk the provenance graph backward from the VK plot; extract the reusable workflow; record Table 1 metrics (linear chain).
- [ ] Pin all `recetox/mfassignr_*` 1.1.2 tool versions + the Zenodo record.
- [ ] Write the plain-language axis/region explanation so non-MS readers can read the van Krevelen figure.
- [ ] Draft SI recipe; connect the notebook to manuscript claims about on-graph auditability, descriptive (non-differential) notebook shape, and backward workflow extraction.
