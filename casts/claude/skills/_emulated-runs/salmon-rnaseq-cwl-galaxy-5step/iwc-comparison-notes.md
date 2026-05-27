# IWC exemplar comparison — hubmap salmon-rnaseq

Source briefs: `cwl-galaxy-interface.md`, `cwl-galaxy-data-flow.md`.
Inputs to comparison: 7-step main workflow with one nested salmon-quantification subworkflow; primary tool families = Salmon/Alevin, Scanpy, scVelo, SquidPy, DeepScence; primary output families = anndata (`h5ad`), FastQC reports, plots.

## Nearest exemplar(s)

Searched `~/projects/repositories/workflow-fixtures/iwc-format2/scRNAseq/`. Five workflows live there:

| IWC workflow | Why considered |
| --- | --- |
| `scRNAseq/fastq-to-matrix-10x/scrna-seq-fastq-to-matrix-10x-v3.gxwf.yml` | Same intent for **front-half** of the pipeline (FASTQ → count matrix). Uses STARsolo + DropletUtils, not Salmon. |
| `scRNAseq/fastq-to-matrix-10x/scrna-seq-fastq-to-matrix-10x-cellplex.gxwf.yml` | Same front-half intent; cellplex variant — closer in input topology to multi-fastq directories. |
| `scRNAseq/scanpy-clustering/Preprocessing-and-Clustering-of-single-cell-RNA-seq-data-with-Scanpy.gxwf.yml` | Closest match to the **back-half** of the pipeline (h5ad → QC plots → UMAP → clustering → marker genes). |
| `scRNAseq/velocyto/Velocyto-on10X-from-bundled.gxwf.yml` | Closest match for the **scVelo branch** — velocity from 10x, but uses Velocyto not scVelo. |
| `scRNAseq/baredsc/*` | Bayesian dropout-aware single-cell — adjacent but not on this path. |

**No single exemplar covers the whole salmon-rnaseq pipeline.** This is fundamentally a *concatenation* of three IWC-shaped subworkflows: fastq-to-matrix, scanpy-clustering, velocyto-style velocity, plus a HuBMAP-specific QC/spatial tail.

## Confidence

**Medium for the back-half, low for the front-half, none for the spatial (SquidPy/DeepScence) branch.**

- Back-half overlap with `Preprocessing-and-Clustering-of-...-Scanpy.gxwf.yml` is high at the *intent* level (h5ad → QC → cluster → marker genes → UMAPs) but the IWC workflow uses fine-grained IUC `scanpy_*` tools per step, while the HuBMAP CWL packages all of that into one `scanpy-analysis.cwl` CommandLineTool. Translation choice: either author one wrapper that mirrors `scanpy-analysis.cwl` or decompose into ~12 IUC scanpy steps following the IWC exemplar.
- Front-half: IWC uses STARsolo/DropletUtils, not Salmon-Alevin. There is **no IWC Salmon-Alevin scRNA-seq exemplar** in the local mirror. A `salmon_quant` / `salmon-alevin` IUC tool likely exists for bulk RNA-seq (not checked) but no IWC workflow wires it for single-cell.
- Spatial branch (`squidpy_analysis`) has no IWC exemplar — `imaging/` and `scRNAseq/` directories don't include SquidPy workflows.
- DeepScence has no IWC exemplar — domain-novel.

## Structural diff (proposed Galaxy design vs nearest exemplars)

### Input topology

- Proposed: `list:list` of FASTQs per sample (CWL `Directory[]`).
- IWC 10x-v3 exemplar: `list:paired` of FASTQs per sample (R1 + R2 pair per sample).
- **Diff.** The 10x-v3 IWC convention is `list:paired`, not `list:list`. For the salmon-rnaseq pipeline targeting 10x assays, prefer `list:paired` and accept that exotic non-paired assays (Slide-seq, Visium spatial) need a different shape. Update the data-flow brief recommendation from `list:list` to `list:paired`, with `list:list` as the fallback for non-paired assays.
- Both exemplar workflows also expose a reference-genome `select` input (`reference genome` text restrictOnConnections, plus a cached `gtf` data table). The HuBMAP CWL has `organism: human|mouse` instead. Convention diff: use a single `genome` text select wired into the salmon-alevin tool via a `map_param_value` step, the same pattern the `scanpy-clustering` exemplar uses for CellRanger version mapping.

### Tool families

- IWC 10x-v3: STARsolo, DropletUtils, MultiQC, collection-element-identifiers, tp_replace_in_line, RELABEL_FROM_FILE, MERGE_COLLECTION, APPLY_RULES.
- Proposed for salmon-rnaseq: Salmon-Alevin, alevin-to-anndata, DeepScence, Scanpy (or scanpy-analysis monolith), scVelo, SquidPy, FastQC, optional MultiQC.
- **Diff.** Only `fastqc`/`multiqc` overlap. Front-half is a Salmon path with no IWC exemplar; the comparison cannot use IWC tool selection guidance here.

### DAG motifs

- IWC 10x-v3 motif: `STARsolo → DropletUtils → reorganize/relabel → outputs`. Heavy use of `__RELABEL_FROM_FILE__`, `__MERGE_COLLECTION__`, `__APPLY_RULES__` to reshape STARsolo output into Seurat/Read10X-compatible layout.
- IWC scanpy-clustering motif: long linear chain of `anndata_import → scanpy_normalize → scanpy_filter_cells → scanpy_filter_genes → ... → scanpy_cluster → scanpy_plot_umap → scanpy_run_rank_genes_groups`. Conditional plumbing via `pick_value` and `map_param_value` for CellRanger v2 vs v3.
- Proposed salmon-rnaseq motif: `salmon-alevin → annotate → deepscence → scanpy_analysis (monolith) → scvelo / squidpy / compute-qc`.
- **Diff.** The IWC scanpy-clustering exemplar uses `pick_value` (IUC tool) to merge CellRanger-version branches. **The HuBMAP CWL uses `pickValue: first_non_null` on `salmon` vs `salmon-mouse` `when:` branches** — this is the same shape and translates cleanly to IUC `pick_value` (or to a single salmon-alevin call with an `organism` parameter, which the data-flow brief recommends). The IWC pattern endorses the second option.

### Outputs / report shape

- IWC scanpy-clustering exposes 20+ promoted plot outputs. Proposed salmon-rnaseq exposes ~25 outputs including conditional `null|File` (scVelo/SquidPy branches).
- **Diff.** No structural concern — IWC accepts large output surfaces. Optional outputs from gated steps are common in IWC (cf. the `pick_value`-mediated branches in scanpy-clustering).

### Test fixture shape

- IWC norms: every workflow ships a `*-tests.yml` sibling with concrete dataset fixtures and assertion blocks.
- Proposed salmon-rnaseq: **no CWL job file at repo root.** No fixture inputs to draft a Galaxy `*-tests.yml` from. Template Mold should leave the test plan as an open question rather than invent a fixture.

### Anti-patterns / shortcuts to avoid

- Do not promote logs as public outputs (none proposed; good).
- Do not bake `threads` into the workflow interface as a public parameter (proposed brief already flags hiding it; aligned with IWC).
- Avoid building monolithic per-language wrappers (scanpy-analysis.cwl, scvelo-analysis.cwl, squidpy-analysis.cwl). IWC convention is fine-grained IUC steps. Either accept a HuBMAP-flavored monolith wrapper (faster ship, lower review value) or decompose (slower, higher IWC alignment). Recommend decomposing the scanpy branch into IUC steps following `Preprocessing-and-Clustering-of-...-Scanpy.gxwf.yml`; accept monolith wrappers for scVelo and SquidPy because no IWC decomposition exists.

## Guidance for the template Mold

1. Set workflow input shape to `list:paired` for the FASTQ collection (default for 10x v3 assays). Mention `list:list` as a fallback in a comment-only TODO.
2. Use a single `salmon-alevin` step with `organism` parameter instead of two `salmon` / `salmon-mouse` Galaxy steps with `pick_value`. (Equivalent to data-flow open question #1 recommendation.)
3. For the scanpy branch, draft *either*:
   - a single `scanpy-analysis` author-wrapper step (placeholder tool_id), or
   - a fine-grained chain following `Preprocessing-and-Clustering-of-...-Scanpy.gxwf.yml`. Recommend the second when downstream `implement-galaxy-tool-step` work happens; for the template skeleton, the first is acceptable as a black box.
4. For scVelo and SquidPy, draft single author-wrapper steps with placeholder tool_ids.
5. Promote outputs match the data-flow brief; do not invent additional outputs to match IWC scanpy-clustering's 20+ surface.
6. Leave the `*-tests.yml` test plan empty (no fixtures); flag for downstream `cwl-test-to-galaxy-test-plan` / `paper-to-test-data`.
7. The IWC `Preprocessing-and-Clustering-of-...-Scanpy.gxwf.yml` provides a concrete `pick_value` usage example; **the template should mirror that idiom only if option (b) collapse-to-single-salmon-alevin is rejected.**

## Open questions

1. Is there an IWC Salmon-Alevin scRNA-seq workflow elsewhere (outside the local mirror)? Worth a one-off check before authoring all-new Salmon-Alevin Galaxy plumbing.
2. Should the spatial branch (Visium / Slide-seq) be split into a sibling Galaxy workflow rather than gated optional steps inside one workflow? The conditional surface area is large (8 optional outputs + an optional image_dir input) and IWC has no precedent.

## Confidence

Medium-low overall. The back-half scanpy branch has a useful exemplar; the front-half Salmon-Alevin path is unprecedented in the local IWC mirror; the spatial / senescence branches are domain-novel. Template authoring should treat IWC alignment as advisory only for back-half steps.

## Refinement candidate

`compare-against-iwc-exemplar`'s `eval.md` cases are all nf-core-flavored. **No CWL-flavored eval cases exist** (same gap noted in the ga4gh run). This run cannot be scored against the existing eval; the gap should be addressed in `content/molds/compare-against-iwc-exemplar/eval.md`.
