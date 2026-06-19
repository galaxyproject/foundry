# UC5 / per-object IHC morphometry — control vs drug-treated — interview input

> Pulled-down GitHub issue used as the **effective result of the INTERVIEW → GALAXY interview**
> (the live interview mechanics are harness-owned and precede pipeline phase 1).
> Source: galaxy-brain issue #28 (captured verbatim from the issue body).
> No paired reference target: this case is **spec-only** — there is no vendored `.ga` golden to
> reproduce. Judge the run against the `expect:` block in `scenarios.md` (an agent checks the
> produced workflow against the issue's load-bearing intent at the end of the journey).

---

## Plain-language science (why this is interesting)

A heart attack kills tissue; immune cells (macrophages/microglia) flood the damaged "infarct zone" to clean up. A marker protein, **CD11b**, sits on those immune cells, and an IHC stain makes CD11b show up as brown deposits — more brown = more immune infiltration. The shipped data compares an **untreated (vehicle/DMSO)** group against a group given an anti-inflammatory drug candidate (**4-oxo-RA**). The scientific question: *does the drug reduce immune-cell infiltration?*

The tools: **color deconvolution** un-mixes the brown CD11b signal from the blue counterstain; **Otsu thresholding** decides which pixels are truly stained, producing a black-and-white mask. The thin version stops here and reports **one "% stained area" number per image** — a t-test on 6 numbers.

The richer move: label each **connected stained region as a separate object** (one immune-cell cluster = one object), then measure each object's **size (area), shape (eccentricity, solidity, perimeter), and staining intensity**. Now each image yields dozens-to-hundreds of objects, each with ~8 numbers — a *distribution*, not a single percent. This can reveal that the drug doesn't just reduce total staining but shifts the *character* of the infiltrate (fewer large dense clusters, rounder vs more ramified cells) — a biologically richer claim. It's the imaging analogue of the move single-cell genomics made: stop reporting one bulk number, report the distribution of individual objects and how its shape changes between conditions.

## Purpose

Add an imaging vignette to the Galaxy Notebooks paper that is domain-novel (the existing three are bacterial AMR, differential ATAC-seq, differential ChIP) and analytically substantial. Instead of mapping a single "% stained area" over 6 images and t-testing it, we treat each stained region as an individual object, extract per-object morphology + intensity features, and compare the distributions between an untreated and a drug-treated cohort — producing a multi-figure notebook that embeds real on-graph segmentation-mask images alongside per-object tables, distribution plots, and a per-sample feature heatmap, then extracts to a reusable collection-map-over workflow via provenance.

## Objective (MVP + stretch)

**MVP**
- Reuse the real IWC `histological-staining-area-quantification` tool chain (color deconvolution → channel split → Otsu threshold) on the shipped 6-ROI CD11b IHC cohort (3 vehicle control, 3 4-oxo-RA treated), run as a collection map-over.
- Insert `ip_binary_to_labelimage` to turn each thresholded mask into a connected-components label map (one stained region = one object), then run `ip_2d_feature_extraction` with an expanded feature set → a per-object table per sample (area, area_filled, eccentricity, solidity, perimeter, axis lengths, mean/max intensity), instead of one merged ROI per image.
- Embed, every artifact a genuine on-graph output: per-sample mask/label overlay image, per-sample per-object feature tables, control-vs-treatment distribution plots (object area / eccentricity / intensity), and the retained % area summary.
- Extract the pipeline by walking the provenance graph; report Table 1 metrics (steps, map-over steps, exposed outputs, dangling, report warnings, science-identical re-run).

**Stretch**
- A per-sample × feature heatmap across all 6 samples (cohort view; on-graph plot tool) showing whether the 3 treated replicates separate from the 3 controls across multiple features at once.
- A true tissue-microarray (TMA) cohort variant (dearray → per-core quantification → ranked cores → cohort heatmap) — *requires sourcing additional multi-core public TMA data; the shipped TMA exemplar dearrays to a single core* (verification task).

## Why this is a useful demo deviation

- **New domain + new figure type.** First imaging vignette; first to embed real on-graph mask/label images (segmentation results), directly exercising the manuscript's "a reference embeds an artifact that can be inspected, not a picture of one" argument in a visually obvious way.
- **Object-level substance.** Moves from one number per image to per-object distributions across a cohort — the imaging analogue of the single-cell move, far richer than a 6-point t-test.
- **Clean map-over + extraction.** The whole analysis is a collection map-over over a 6-element list — the extraction-friendly shape the paper rewards (mirrors Vignette 1's map-over story), and adds embedded mask images the ATAC/ChIP vignettes don't exercise.

## Existing analysis anchors (real tool IDs / paths)

Anchor: `iwc/workflows/imaging/histological-staining-area-quantification/histological-staining-area-quantification.ga`
- `imgteam/color_deconvolution/ip_color_deconvolution/0.9+galaxy0` (`rgb2hed`)
- `imgteam/split_image/ip_split_image/2.3.5+galaxy0`
- `imgteam/2d_auto_threshold/ip_threshold/0.25.2+galaxy0` (Otsu)
- `imgteam/2d_feature_extraction/ip_2d_feature_extraction/0.25.2+galaxy1` (current config: `mode=with-intensities`, `features=[label, mean_intensity, area, area_filled]` — to be expanded)

Object lever, borrowed from `iwc/workflows/imaging/fluorescence-nuclei-segmentation-and-counting/`:
- `imgteam/binary2labelimage/ip_binary_to_labelimage/0.5+galaxy0` (connected components)
- `imgteam/count_objects/ip_count_objects/0.0.5-2`
- `imgteam/overlay_images/ip_overlay_images/0.0.4+galaxy4` (numbered-object overlay image); `colorize_labels` available for a colored label image.

Feature menu confirmed in the `2d_feature_extraction` tool XML: `area, area_convex, area_filled, axis_major_length, axis_minor_length, centroid, eccentricity, equivalent_diameter_area, extent, orientation, perimeter, solidity` + (with intensities) `mean/min/max_intensity`, one row per label.

Plot/heatmap tools: confirm exact on-graph IDs on the target server (the ChIP vignette used `ggplot2_heatmap2`; need a box/violin plotter for object distributions) — see tasks.

## Public data candidates (real shipped data)

From `histological-staining-area-quantification-tests.yml` (one `list` collection, 6 elements, 600×600 px ROIs, `total_area=360000`):
- `control_1` — `https://zenodo.org/records/20271100/files/Vehicle-66-rechts_10x_IZ-1.tif`
- `control_2` — `https://zenodo.org/records/20271100/files/Vehicle-66-rechts_10x_IZ-2.tif`
- `control_3` — `https://zenodo.org/records/20271100/files/Vehicle-66-links_10x_IZ-2.tif`
- `treatment_1` — `https://zenodo.org/records/20157596/files/Treatment1-11-links_10x_IZ-1.tif`
- `treatment_2` — `https://zenodo.org/records/20157596/files/Treatment1-11-links_10x_IZ-2.tif`
- `treatment_3` — `https://zenodo.org/records/20157596/files/Treatment1-11-rechts_10x_IZ-1.tif`

CD11b IHC ROIs, cardiac infarct zone; control = Vehicle/DMSO (Zenodo 20271100), treatment = 4-oxo-RA (Zenodo 20157596; 20158418 is a border-zone companion record). Stretch TMA: shipped exemplar dearrays to a single core — not a cohort; a multi-core TMA dataset must be sourced.

## Notebook workflow plan (numbered, on-graph, map-over)

Input: one `list` collection `IHC ROIs` (identifiers `control_1..3`, `treatment_1..3`).

1. Color deconvolution (`ip_color_deconvolution`) map-over → HED image per sample.
2. Split channels (`ip_split_image`) → DAB/CD11b channel per sample.
3. Otsu threshold (`ip_threshold`) map-over → binary stain mask per sample (on-graph image, embeddable).
4. Connected-components label (`ip_binary_to_labelimage`) map-over → label map per sample (one object per stained region) — replaces the single-merged-ROI step.
5. Per-object feature extraction (`ip_2d_feature_extraction`, `with-intensities`, intensity = deconvolved DAB channel, expanded `features`) map-over → per-object table per sample.
6. Count objects (`ip_count_objects`) map-over → objects-per-sample.
7. Labeled overlay / colorized label image (`ip_overlay_images` / `colorize_labels`) map-over → embeddable segmentation image per sample.
8. Concatenate per-object tables with a sample/condition tag (`column_maker` to add `sample_id`/`condition`, collapse) → one tidy long table (object × features × condition), on-graph.
9. Distribution plots (on-graph plot tool): box/violin of object area, eccentricity, mean_intensity by condition.
10. Per-sample summary (`collapse_dataset` + `column_maker`): retained % area and median object features per sample.
11. (Stretch) Per-sample × feature heatmap (`ggplot2_heatmap2` or equivalent) → cohort view.

Then `workflow_extraction_summary` (expect 0 warnings) → extract workflow.

## Expected paper/demo artifacts

- Multi-figure notebook: per-sample segmentation-mask images, per-sample per-object feature tables, control-vs-treatment distribution plots, % area summary table, (stretch) cohort heatmap — each an on-graph tool output.
- Extracted collection-map-over workflow (`.ga`) re-running to identical numbers; a Table 1 row.
- SI recipe (S4-style).

## Scope and risks

- **Threshold/labeling sensitivity:** Otsu on diffuse CD11b staining may over-merge touching regions into few large objects (CD11b clusters aren't as discrete as nuclei). Object counts/shapes are real but parameter-sensitive — disclose, and treat % area as the robust anchor. NEEDS A REAL TEST RUN (the central empirical risk).
- **Intensity-image pairing:** `with-intensities` needs the intensity image single-channel and frame-matched to the label map — feed the deconvolved DAB channel (step 2), not the RGB original.
- **n is small (3 v 3):** distributions are per-object (hundreds of points) but biological replication is 3 per arm; claims illustrative, not powered. Same honesty posture as Vignette 1/3.
- **Plot/heatmap tool availability:** confirm exact on-graph IDs on the target server.
- **Stretch TMA needs data:** shipped TMA test data is a single core.

## Tasks

- [ ] Run `ip_binary_to_labelimage` on the Otsu mask for the real CD11b ROIs; confirm a multi-object label map (counts plausible, not 1). THIS IS THE GO/NO-GO CHECK for the object-level framing.
- [ ] Verify `ip_2d_feature_extraction` accepts the deconvolved DAB channel as `with-intensities` intensity image paired with the label map (validators pass).
- [ ] Decide whether to keep particle-size filtering (`imagej2_analyze_particles_binary`) or replace fully with `binary2labelimage`.
- [ ] Identify/pin exact tool IDs/versions for the object-distribution plot (box/violin) and per-sample feature heatmap.
- [ ] Confirm the 6 Zenodo ROI URLs resolve; element identifiers carry through to a `condition` column.
- [ ] Build the notebook as a collection map-over; embed each on-graph artifact (masks, per-object tables, distribution plots, % area summary).
- [ ] Run `workflow_extraction_summary` (expect 0 warnings); extract; record Table 1 metrics; re-run for science-identical check.
- [ ] Draft SI recipe S4 mirroring S1–S3.
- [ ] If stretch TMA pursued, source a real multi-core public TMA dataset (shipped exemplar is single-core).
- [ ] Confirm "4-oxo-RA" is the intended treatment label before encoding it in the notebook narrative.
