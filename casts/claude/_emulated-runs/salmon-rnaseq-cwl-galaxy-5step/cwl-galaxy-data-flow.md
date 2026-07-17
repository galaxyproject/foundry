# Galaxy data-flow brief — hubmap salmon-rnaseq

Source: `summary-cwl.json` + `cwl-galaxy-interface.md`, with one inspection of `steps/salmon-quantification.cwl` raw because the summary lost nested-workflow `when:` / `pickValue` markers (see refinement).
Confidence: medium for topology and collection shape, low for the conditional `human|mouse` branch in the nested salmon-quantification subworkflow.

## Abstract topology

Main DAG (7 steps, 1 of which is a nested workflow):

```
fastq_dir ─┬─► fastqc[scatter:fastq_dir]                                      ► fastqc_dir
           └─► salmon_quantification (subworkflow)
                  ├─► count_matrix_h5ad ─► deepscence ─► h5ad_with_ds ─┬─► scanpy_analysis ─┬─► filtered_data_h5ad ─┬─► squidpy_analysis (if img_dir)
                  │                                                    │                    │                       └─► compute_qc_results
                  │                                                    └─► scvelo_analysis ─► annotated_h5ad_file
                  ├─► salmon_output (Directory) ─► compute_qc_results
                  ├─► raw_count_matrix (File?)
                  └─► genome_build_json

img_dir, metadata_dir (optional) ─► salmon_quantification + squidpy_analysis
assay, threads, organism ─► (broadcast scalar)
```

Nested `salmon_quantification.cwl` (6 inner steps):

```
fastq_dir ─► adjust_barcodes ─► trim_reads ─┬─► salmon          (when organism == 'human')
                                            └─► salmon-mouse    (when organism == 'mouse')
                                                  ↓                   ↓
                                                  pickValue: first_non_null
                                                  → alevin_to_anndata → annotate_cells (with img_dir, metadata_dir, fastq_dir, adjust_barcodes.metadata_json)
```

Edge count, main workflow: ~25 from `summary-cwl.graph.edges`. The nested workflow adds ~14 more inner edges plus two `when:` predicates and one `pickValue` merge.

## Galaxy collection semantics

CWL uses `Directory[]` for per-sample fastq input and scatters `fastqc` over it.

- **`fastq_dir: Directory[]` → Galaxy `list` of (paired or list) collections.** Per [[galaxy-collection-semantics]] and the IWC scRNA-seq exemplars, the outer Galaxy list element represents one sample; the inner element is either a `paired` collection (10x_v3 etc.) or a `list` of FASTQ datasets (Slide-seq / Visium). Two viable shapes:
  - (a) `list:paired` outer×inner — simplest when assay implies paired reads (most 10x assays).
  - (b) `list:list` outer×inner — required when the assay produces N-way fastq sets (e.g. 10x_v3 produces R1/R2/I1; Slide-seq does not match strict paired).
  Recommend (b) `list:list` because it accommodates every assay branch without further wrapping.
- **`Directory[]` → `list` element mapping.** Each `Directory` element of the outer CWL array becomes one element of the outer Galaxy list. Inside each element, the wrapper-side trim/salmon CLI must accept "treat all inputs under this list element as one sample". This implies the Galaxy wrappers for `trim-reads`, `salmon`, and `adjust-barcodes` consume `data_collection list` inputs, not single files. Likely needs author-galaxy-tool-wrapper.
- **`fastqc` scatter.** With (b) above, the Galaxy `fastqc` IUC tool maps over the outer list automatically (one FastQC report per inner list of FASTQs) — but FastQC operates on a single file, not on a collection of files for one sample. Realistically, fastqc must `map_over` the *flattened* fastq stream and then a downstream `collect` step regroups by sample if the brief wants `fastqc_dir: Directory[]` preserved. This is one piece of explicit collection wiring.
- **`img_dir` / `metadata_dir` (Directory?).** Map to optional Galaxy collections (`list`).
- **`salmon_output: Directory` workflow output.** Either expose as a `list` collection of canonical Alevin files or as a Galaxy composite datatype. Open question (interface brief #3).

## Conditional/expression pressure

1. **`when:` inside `salmon-quantification.cwl` — `organism == 'human'` vs `'mouse'`.** Galaxy has no native CWL-style `when:`. Translation options per [[cwl-when-pickvalue-to-galaxy-branching]]:
   - (a) **sibling workflows.** Two Galaxy workflows: `salmon-rnaseq-human.gxwf.yml` and `salmon-rnaseq-mouse.gxwf.yml`. Simplest, cleanest, but doubles maintenance.
   - (b) **paired_or_unpaired-style branching at the salmon tool level.** Build a single Galaxy `salmon-alevin` wrapper that accepts an `organism` enum and selects the cached index internally. Recommend (b) — this is the IWC convention (salmon-alevin tool selects index via data table).
   - (c) **pick_value workflow module (galaxy#22222).** Could wire `salmon-human` and `salmon-mouse` as two steps and `pick_value: first_non_null` the outputs. Adds complexity without payoff here because the discriminator is a single text input the salmon tool can read directly.
   Recommend (b). Surface in template Mold as a single `salmon-alevin` step with an `organism` parameter; drop the `when:`-driven duplication.
2. **`pickValue: first_non_null` on `salmon-quantification.cwl/salmon_output`** (and inner `alevin_to_anndata/alevin_dir`). If (b) above is taken, both pickValue uses collapse to a single non-conditional edge: salmon-alevin always produces exactly one output. The pickValue is a CWL artifact of the `when:`-split branches; it does not need to survive translation.
3. **`InlineJavascriptRequirement` is declared** at multiple levels. Spot-check shows no expressions at the workflow boundary — only inside tool wrappers (e.g. parameter derivations). No translation pressure at gxformat2 level; surfaces as wrapper-level concerns.
4. **No `valueFrom` at the workflow step boundary.** All `steps[].in[].value_from` are null in the summary.

## Placeholder transformations

| Edge / shape | CWL marker | Galaxy translation |
| --- | --- | --- |
| `fastq_dir (Directory[])` → `fastqc[scatter:fastq_dir]` | scatter dotproduct | `list:list` input; `fastqc` map_over over flattened inner list; `Apply Rules` to regroup by sample if needed |
| `fastq_dir` → `salmon_quantification.adjust_barcodes` | direct (Directory[]) | direct connection (`list:list` collection in, wrapper consumes per-sample) |
| `salmon_quantification.count_matrix_h5ad` → `deepscence.h5ad_file` | direct | direct |
| `deepscence.h5ad_with_ds` → `scanpy_analysis`, `scvelo_analysis`, `compute_qc_results` | one-to-many | direct fan-out (Galaxy supports multiple sinks reading one output) |
| `scanpy_analysis.filtered_data_h5ad` → `squidpy_analysis`, `compute_qc_results` | one-to-many | direct fan-out |
| `img_dir (Directory?)` → `salmon_quantification`, `squidpy_analysis` | optional Directory | optional Galaxy `data_collection` input; `squidpy_analysis` step gated on presence (gxformat2 optional connection) |
| `salmon_output (Directory)` workflow output | pickValue collapsed in nested workflow | typed collection or composite at output |
| `salmon vs salmon-mouse when: organism` (nested) | `when:` + pickValue | collapse into single `salmon-alevin` wrapper with `organism` parameter |
| 8 scalar parameter inputs → step inputs | direct | direct |

## Unresolved Galaxy tool needs

13 unique CommandLineTools observed (main + nested):

- `fastqc.cwl` — IUC `fastqc` likely covers it.
- `compute-qc-metrics.cwl` — HuBMAP-flavored QC; **likely author**.
- `deepscence.cwl` — DeepScence (senescence scoring); **likely author** (no IUC wrapper expected).
- `scanpy-analysis.cwl` — IUC `scanpy` tools exist but as discrete steps, not a monolithic per-assay analysis; **likely re-decompose or author**.
- `scvelo-analysis.cwl` — **likely author**; no canonical IUC scVelo single-step.
- `squidpy-analysis.cwl` — **likely author**; no canonical IUC squidpy single-step.
- `adjust-barcodes.cwl`, `trim-reads.cwl`, `salmon.cwl`, `salmon-mouse.cwl`, `alevin-to-anndata.cwl`, `annotate-cells.cwl`, `map_hugo_symbols.cwl` (referenced but unused in main pipeline) — HuBMAP-flavored Salmon-Alevin pipeline steps; **likely author** with the caveat that an IUC `salmon-alevin` wrapper exists and the right move is probably to collapse `salmon` + `salmon-mouse` + `alevin-to-anndata` + `annotate-cells` into the IUC `salmon-alevin` invocation rather than reimplement.

Estimate: 1 likely Tool Shed hit (`fastqc`), ~5 likely-author HuBMAP wrappers if we collapse the salmon pipeline to IUC `salmon-alevin`, more if we don't.

## Confidence

- High for main-workflow topology.
- Medium for `Directory[] → list:list` collection shape.
- Medium-low for the `when:` / `pickValue` branch handling — translation strategy is clear but depends on the discover-shed-tool step finding a single salmon-alevin wrapper.
- Low confidence that any HuBMAP-specific QC / annotation / DeepScence / scVelo / SquidPy step has an IUC equivalent.

## Open questions

1. Collapse the `salmon` + `salmon-mouse` `when:` branches into one Galaxy `salmon-alevin` invocation with an `organism` parameter? Recommend yes.
2. Flatten `salmon-quantification.cwl` into the main Galaxy workflow vs author a Galaxy sub-workflow? Recommend flatten.
3. Galaxy collection shape for `fastq_dir: Directory[]` — `list:list` (recommended) or `list:paired`?
4. `salmon_output: Directory` workflow output → composite datatype or `list` collection?
5. `fastqc_dir: Directory[]` output → preserve outer grouping via Apply Rules, or accept flattened FastQC report list?
6. Are the HuBMAP-flavored steps (DeepScence, SquidPy single-step, scVelo single-step, compute-qc-metrics, annotate-cells) candidates for IUC submission, or should each become a workflow-local custom wrapper?

## Note on summary-cwl coverage (refinement)

The extractor I used (and the analogous one from the ga4gh run) only walks the *main* workflow's `steps[]`. Nested workflows are emitted as `tools[]` entries with a coarse `_NestedWorkflow` hint listing inner-step IDs but **without** the inner `in:`/`out:` wiring, `when:` predicates, or `pickValue` merges. I had to read `steps/salmon-quantification.cwl` directly to surface the `when: $(inputs.organism == 'human')` branching that drives the biggest translation decision in this pipeline. This is a refinement candidate for `summarize-cwl` and `cwl-summary-to-galaxy-data-flow`.
