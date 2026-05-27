# Galaxy interface brief — hubmap salmon-rnaseq

Source: `pipeline.cwl` (HuBMAP `salmon-rnaseq`, single-cell + spatial scRNA-seq via Salmon/Alevin).
Provenance: summary-cwl @ `summary-cwl.json` (cwlVersion v1.2, 7 main steps, 1 nested workflow `salmon-quantification.cwl` with 9 inner steps, 12 CommandLineTools).
Confidence: medium-low. Multiple `Directory[]`/`Directory` inputs, a scattered FastQC step, optional `null|File` outputs from conditional analysis branches (scVelo / SquidPy), and a heavy nested subworkflow combine to make this harder than the ga4gh ChIP-seq fixture.

## Workflow inputs (Galaxy-facing)

| Galaxy label | Galaxy shape | CWL source | Notes |
| --- | --- | --- | --- |
| `fastq_inputs` | (review) `list:list` collection (outer = "directory", inner = paired/unpaired fastqs) **or** `data_collection` of paired fastqsanger | `fastq_dir` (Directory[]) | **Open question.** CWL passes per-sample directories; Galaxy has no Directory type. Two honest options: (a) one nested collection where the outer list mirrors the CWL Directory[] and inner items are the FASTQ files; (b) require one `paired_collection` per sample and run the workflow scatter at invocation time. Recommend (a) so FastQC's CWL-side `scatter: [fastq_dir]` translates to Galaxy `map_over`. |
| `image_directory` | optional `data_collection` (datatype `tiff`) | `img_dir` (Directory?) | Visium-only. Map to an optional Galaxy collection of TIFFs; gate downstream `squidpy_analysis` step on its presence. |
| `metadata_directory` | optional `data_collection` (datatype `tabular` / `txt`) | `metadata_dir` (Directory?) | Visium-only, includes the gpr slide file. Same gating as `image_directory`. |
| `assay` | parameter (text, restricted select) | `assay` (string) | Open question: enumerate allowed values (`10x_v2`, `10x_v3`, `visium`, `slideseq` …) from the upstream `salmon-quantification.cwl` branches. |
| `threads` | parameter (integer, default 1) | `threads` (int) | CWL exposes it at workflow level; Galaxy convention buries per-tool thread count. Recommend hiding from public interface unless tools need a shared knob. |
| `expected_cell_count` | parameter (integer, optional) | `expected_cell_count` (int?) | Used by Alevin. Leave optional. |
| `keep_all_barcodes` | parameter (boolean, optional) | `keep_all_barcodes` (boolean?) | Alevin flag. |
| `organism` | parameter (text select, default `human`) | `organism` (string?, default `human`) | Switches reference data branch inside `salmon-quantification.cwl` (salmon vs salmon-mouse). Should drive a Galaxy `select` parameter that maps to the appropriate cached reference data table. |

## Workflow outputs (Galaxy-facing)

Promote as **public** workflow outputs:

- `count_matrix_h5ad` — annotated AnnData (`h5` / `h5ad`). Primary downstream-consumable.
- `filtered_data_h5ad` — filtered/clustered AnnData (`h5ad`).
- `salmon_output` — **review** — CWL `Directory`. Map to a Galaxy `data_collection` of the underlying Alevin artifacts (or a tarball composite). Open question.
- `genome_build_json` — JSON (`json`).
- `scanpy_qc_results` / `qc_report` — QC results (`tabular` / `json`).
- `fastqc_dir` — **review** — CWL `Directory[]`. Map to a `list` collection of zipped FastQC bundles (mirror Galaxy IUC `fastqc` wrapper output shape).
- `umap_plot`, `umap_density_plot`, `dispersion_plot`, `marker_gene_plot_t_test`, `marker_gene_plot_logreg`, `deepscence_plot`, `deepscence_continuous_plot`, `deepscence_binary_plot` — plot images (`png`).

Promote as **optional** public outputs (`null | File`; gate on assay/img branch):

- `raw_count_matrix` (Alevin H5AD with intronic columns as separate columns)
- `scvelo_annotated_h5ad`, `scvelo_embedding_grid_plot` (RNA velocity branch)
- `squidpy_annotated_h5ad`, `neighborhood_enrichment_plot`, `co_occurrence_plot`, `interaction_matrix_plot`, `centrality_scores_plot`, `ripley_plot`, `squidpy_spatial_plot`, `spatial_plot` (spatial branch — Visium / Slide-seq)

Promote as **checkpoint** outputs (review-only): none in this fixture. (Logs and intermediate count matrices are not exposed by the CWL workflow.)

## Open questions

1. **Directory[] → Galaxy collection shape.** Single biggest mapping decision. `fastq_dir: Directory[]` plus per-step `scatter: [fastq_dir]` strongly suggests a `list` collection where each element represents one sample/directory. But Alevin needs the FASTQ files themselves, not a directory handle. Two viable paths:
   - Outer `list` collection of inner `paired` collections of `fastqsanger` (Galaxy-native).
   - Pre-flatten in a wrapper: one `paired_collection` of `fastqsanger`, plus a sidecar `sample_name` text-list parameter.
   Recommend resolving with the data-flow brief.
2. **Optional Directory inputs.** `img_dir` and `metadata_dir` should be Galaxy optional collections; downstream Visium-only steps need explicit `when:` conditioning in gxformat2.
3. **`salmon_output` Directory output.** CWL outputs the entire Alevin output directory. Galaxy options: (a) extract canonical files (alevin H5AD, `quants_mat.gz`, `cmd_info.json`, `aux_info`) as a typed collection; (b) tarball composite. Recommend (a) with a `salmon_output` `list` collection.
4. **`fastqc_dir: Directory[]`.** Map to `list` collection of zipped FastQC reports; align with IUC `fastqc` wrapper output naming (`fastqc_html`, `fastqc_text`).
5. **`assay` allowed values.** Inspect `salmon-quantification.cwl` branches to enumerate. Without this the Galaxy interface is a freetext field that silently breaks at runtime.
6. **`organism` → reference data.** `organism=human|mouse` switches between `salmon.cwl` and `salmon-mouse.cwl` inside the nested workflow. In Galaxy this should select between cached Salmon indices (data table) rather than re-downloading per run.
7. **Nested workflow flattening.** `salmon-quantification.cwl` is 9 inner steps (`adjust-barcodes`, `trim-reads`, `salmon` / `salmon-mouse`, `alevin-to-anndata`, `annotate-cells`, `map_hugo_symbols`, …). Flatten into the main workflow or author a Galaxy sub-workflow? Recommend flattening: Galaxy sub-workflows introduce a UI boundary that's only worth it if the inner workflow is reused elsewhere (here it's only called from `pipeline.cwl`).
8. **`scatter` on fastqc.** Translation depends on (1). If fastq_dir is a `list` collection, Galaxy `map_over` handles it for free; if pre-flattened, the scatter is gone.
9. **No tests discoverable.** No CWL job file at repo root. Cannot author a Galaxy workflow test without sample inputs; flag for the test-plan Mold downstream.

## Confidence

Medium-low. Compared with the ga4gh ChIP-seq fixture this workflow has roughly the same step count but much higher translation pressure: three Directory-type inputs, one Directory output, a `Directory[]` output, a deep nested workflow, and an assay-driven branching pattern that the CWL surface barely exposes. The downstream data-flow brief should resolve the collection-shape question (1) before the template Mold runs.
