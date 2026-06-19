# UC6 / cell-type-resolved pseudobulk differential expression (COVID-19) — interview input

> Pulled-down GitHub issue used as the **effective result of the INTERVIEW → GALAXY interview**
> (the live interview mechanics are harness-owned and precede pipeline phase 1).
> Source: galaxy-brain issue #29 (captured verbatim from the issue body).
> No paired reference target: this case is **spec-only** — there is no vendored `.ga` golden to
> reproduce. Judge the run against the `expect:` block in `scenarios.md` (an agent checks the
> produced workflow against the issue's load-bearing intent at the end of the journey).

---

## Plain-language science (why this is interesting)

A single-cell RNA-seq experiment measures gene expression in thousands of individual cells from several people (here: some healthy "normal", some "COVID-19"). Each cell carries two labels: which **person** it came from (`individual`) and what **cell type** it is (B cell, CD4 T cell, monocyte, …).

**Pseudobulk** = sum the raw counts of all cells of one type within one person into a single profile ("all B cells from patient 7" → one B-cell sample). This bridges single-cell data to trusted bulk statistics (edgeR), with **people as the real replicates** — the correct unit for a disease comparison (thousands of correlated cells from one person are not independent replicates).

**Why per-cell-type DE matters:** the interesting question is rarely "is gene X up in disease overall" — it's "**which cell types are actually mounting the response, and do they respond the same way?**" In COVID you'd expect monocytes and some T-cell subsets to be transcriptionally inflamed while B cells barely move. Pooling all cell types (what the shipped workflow does) averages these together and can hide a strong cell-type-specific signal. Running DE separately per cell type asks the sharp question, then you can rank cell types by responsiveness and split genes into a **shared core** (e.g. interferon-stimulated genes lighting up everywhere) vs **cell-type-specific** sets. That decomposition is the scientific payoff and is invisible from a single pooled contrast.

## Purpose

Demonstrate a Galaxy Notebook that goes beyond a single bulk contrast: take an annotated single-cell dataset, aggregate it into pseudobulk profiles, and ask which cell types actually respond to disease and which genes are a shared response vs cell-type-specific. Every embedded figure/table is a genuine on-graph Galaxy tool output; the reusable workflow is extracted from the history provenance graph.

## Objective (MVP + stretch)

- **MVP (no recomposition needed):** Reproduce the shipped IWC pseudobulk→edgeR analysis as an on-graph narrative — pseudobulk aggregation (decoupler), the pooled `normal` vs `COVID_19` edgeR contrast, ranked DEG table, and volcano — but present it single-cell-natively: show the pseudobulk QC plot, explain people-as-replicates, display DEG table + volcano as on-graph artifacts. Novel vs the bulk-DESeq2 vignette (adds the pseudobulk aggregation axis) and vs clustering (ends in statistics).
- **Stretch (the substantial deviation — requires recomposition):** Fan the analysis out per cell type — subset the pseudobulk count matrix by `cell_type`, map edgeR over the per-cell-type subsets as a collection, and synthesize a cross-cell-type comparison: a responder-ranking table (significant genes per cell type) and a shared-vs-cell-type-specific gene summary — all from on-graph collection operations.

## Why this is a useful demo deviation

- **vs the existing bulk DESeq2 vignette** (count matrix → ranked table → one volcano, supervised two-condition contrast): adds the pseudobulk aggregation of single cells into per-(cell type × person) samples (a single-cell-specific transform that is itself an on-graph teaching artifact) and, in the stretch, a per-cell-type fan-out producing a collection of contrasts plus a cross-cell-type synthesis. Exercises Galaxy Notebooks' collection-map-over story, not a single plot.
- **vs a plain scanpy clustering tutorial** (cluster → UMAP → marker dotplot): clustering only names populations; here we use those names to quantify disease response per cell type. The narrative ends in cross-cell-type statistics, not a UMAP.

## Existing analysis anchors (real tool ids / paths)

Primary: `iwc/workflows/scRNAseq/pseudobulk-worflow-decoupler-edger/pseudo-bulk_edgeR.ga`
- `ebi-gxa/decoupler_pseudobulk/decoupler_pseudobulk/1.4.0+galaxy8` (pseudobulk; outputs `count_matrix`, `samples_metadata`, `genes_metadata`, `plot_output` PNG, `filter_by_expr_plot` PNG)
- `iuc/edger/edger/3.36.0+galaxy5` (DE; outputs `outTables`, `outReport` HTML)
- `iuc/volcanoplot/volcanoplot/0.0.6`
- supporting: `iuc/column_remove_by_header/1.0`, `bgruening/text_processing/{tp_replace_in_line,tp_replace_in_column,tp_awk_tool}/9.3+galaxy1`, `bgruening/split_file_to_collection/0.5.2`, `iuc/collection_element_identifiers/0.0.2`, `param_value_from_file`.

Upstream annotation reference (optional chapter): `iwc/workflows/scRNAseq/scanpy-clustering/...Scanpy.ga` — `iuc/scanpy_*` 1.10.2+galaxy*, `iuc/anndata_*` 0.10.9+galaxy0; produces louvain clusters + manual cell-type annotation (the kind of `cell_type` label the pseudobulk step consumes).

velocyto was evaluated and rejected as anchor: its IWC workflow outputs only a `.loom` of spliced/unspliced counts (no plotting tool, no scVelo) — no on-graph figures to embed.

## Public data candidates (real shipped data + actual labels)

- **Primary:** `Source AnnData file.h5ad` — `https://zenodo.org/records/13929549/files/Source%20AnnData%20file.h5ad` (from `pseudo-bulk_edgeR-tests.yml`). obs columns: `cell_type` (groupby), `individual` (sample key / replicate), `disease` (factor, values `normal` and `COVID_19`), `gene_symbol` (var), raw `counts` layer. Test confirms a real DEG table (`edgeR_normal-COVID_19`, ~1430 lines). *Verify exact set of `cell_type` values and per-cell-type sample counts before finalizing the stretch.*
- **Optional upstream illustration:** scanpy clustering PBMC3k 10X (`barcodes.tsv`/`genes.tsv`/`matrix.mtx`, `https://zenodo.org/record/3581213/files/...`), annotated to CD4+ T, CD14+, B, CD8+ T, FCGR3A+, NK, Dendritic, Megakaryocytes — use only to show where cell-type labels come from.

## Notebook workflow plan (numbered, on-graph)

1. Load the annotated `h5ad`; show obs structure (cell_type / individual / disease) — narrative + small on-graph inspection table.
2. Decoupler pseudobulk (groupby `cell_type`, sample_key `individual`, layer `counts`, factor `disease`): embed the on-graph pseudobulk QC plot and the filter-by-expression plot; show `count_matrix` head.
3. MVP contrast: sanitation chain → edgeR `~ 0 + disease`, contrast `normal-COVID_19`; embed the on-graph DEG table and volcano.
4. Stretch fan-out: split the pseudobulk `count_matrix` columns by `cell_type` into a collection (on-graph column/split ops) → map edgeR over the per-cell-type subsets → per-cell-type DEG tables + volcanoes as a collection.
5. Cross-cell-type synthesis: from the per-cell-type DEG tables, build (a) a responder-ranking table (count of FDR-significant genes per cell type) and (b) a shared-vs-specific summary via on-graph set/column ops. Embed both.
6. Extract the reusable workflow by walking the provenance graph backward from the synthesis outputs.

## Expected paper/demo artifacts

- Pseudobulk QC + filter plots (genuine decoupler PNGs).
- MVP: one DEG table + one volcano (pooled contrast).
- Stretch: a collection of per-cell-type volcanoes + DEG tables.
- A responder-ranking table and a shared-vs-cell-type-specific gene summary (on-graph).
- The extracted reusable workflow `.ga`.

## Scope and risks (honest)

- **Recomposition required for the headline (stretch).** The shipped workflow runs ONE pooled `~ 0 + disease` contrast across all cell types (single `count_matrix` → single edgeR run; the split step splits by disease-contrast, of which there's only one). Per-cell-type DE needs new on-graph steps to subset the pseudobulk matrix by cell type and map edgeR over the subsets. The MVP avoids this and is still novel. (This is structurally the same "irreducible → split it" arc as the manuscript's Vignette 3.)
- **Per-cell-type statistical power.** Some cell types may have too few individuals for stable edgeR fits; the responder ranking must carry sample-count caveats. Verify per-cell-type sample counts in the test h5ad.
- **Matrix-subsetting mechanics.** Splitting a wide pseudobulk matrix by cell-type column-group on-graph needs validation (confirm decoupler's column naming encodes `cell_type` parseably).
- **Version/data.** Pin tool versions; confirm the Zenodo h5ad downloads and that `disease` has only the two expected levels.

## Tasks

- [ ] Download `Source AnnData file.h5ad`; enumerate exact `cell_type` values and per-(cell_type × disease) `individual` counts.
- [ ] Run the shipped pseudobulk→edgeR workflow as-is; confirm on-graph outputs (pseudobulk plot, DEG table, volcano) render embeddably.
- [ ] Build the MVP notebook around the pooled contrast (single-cell framing, people-as-replicates).
- [ ] Prototype the stretch: on-graph subset of `count_matrix` by `cell_type` → collection → map edgeR over subsets.
- [ ] Build cross-cell-type synthesis (responder-ranking; shared-vs-specific via on-graph set/column ops).
- [ ] Verify per-cell-type sample sizes are adequate; document low-power caveats.
- [ ] Extract reusable workflow from provenance graph; validate round-trip.
- [ ] (Optional) Add an upstream "where annotations come from" chapter referencing the scanpy clustering workflow.
- [ ] Confirm all displayed artifacts are genuine on-graph tool outputs (no pasted figures).
