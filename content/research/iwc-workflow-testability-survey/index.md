---
type: research
tags:
  - target/galaxy
status: draft
created: 2026-05-03
revised: 2026-05-03
revision: 2
ai_generated: true
related_notes:
  - "[[galaxy-workflow-testability-design]]"
summary: "IWC evidence survey for Galaxy workflow structures that make workflow tests meaningful."
---

# IWC workflow testability survey

Source corpus: 120 cleaned `gxformat2` workflows under `$IWC_FORMAT2/`, 120 skeletons under `$IWC_SKELETONS/`, and 115 sibling `*-tests.yml` files under `$IWC/workflows/` as materialized in `workflow-fixtures/iwc-src/workflows/`. This survey supports [[galaxy-workflow-testability-design]]; it is an evidence hub, not a pattern-page proposal.

## 1. Scope

Topic type: **workflow-shape concern**. The question is not "which assertion should a test use?" That is covered by [[planemo-asserts-idioms]]. The question is "how should a Galaxy workflow be structured so useful tests can be written later?"

Evidence strategy, adapted from the `/iwc-survey` command:

- **Skeleton scan first.** Use `$IWC_SKELETONS/` to catalog workflow outputs, labels, subworkflow boundaries, and collection-producing recipes without paying full parameter-read cost.
- **Sibling-test scan second.** Use `*-tests.yml` files to identify which workflow outputs are actually asserted, which collection element identifiers matter, and which assertion families imply deterministic or stochastic behavior.
- **Selective full workflow reads.** Read full `$IWC_FORMAT2` only for examples where output promotion, labels, or collection topology need line-level confirmation.
- **Out of scope.** Do not re-survey the assertion vocabulary itself, fixture-hosting conventions, checksum/negative-test absences, or shortcut-vs-smell calls already pinned in [[iwc-test-data-conventions]], [[planemo-asserts-idioms]], and [[iwc-shortcuts-anti-patterns]].

## 2. Corpus counts

The first full pass matched top-level workflow `outputs:` against sibling test `outputs:` keys.

| Measure | Count | Interpretation |
|---|---:|---|
| Cleaned format2 workflows | 120 | Survey denominator for workflow structure. |
| Workflows with sibling tests found by path convention | 114 | Six workflows lacked a matching sibling test file in this materialized corpus. |
| Total workflow-level outputs in those 114 workflows | 1,305 | IWC workflows expose many labeled outputs, including checkpoint/report outputs. |
| Distinct asserted output labels across sibling tests | 617 | Tests assert a selective subset of exposed workflow outputs. |
| Workflows where every asserted test output matched a workflow output label exactly | 114 / 114 | Output labels are the test API; no positional or unlabeled assertion route was observed. |
| Test files with `element_tests:` | 59 / 115 | Collection-shaped output testing is common. |
| `element_tests:` blocks | 227 | Stable collection element identifiers are central to testability. |
| Test files with inline `attributes: {collection_type: ...}` | 2 / 115 | Explicit collection-type assertions exist but are much rarer than element-keyed assertions; four inline occurrences appear across those files. |

Highest asserted-output examples:

| Workflow | Workflow outputs | Asserted outputs | Why it matters |
|---|---:|---:|---|
| `$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-complete/mgnify-amplicon-pipeline-v5-complete.gxwf.yml` | 83 | 38 | Large workflow exposing many domain outputs; tests select report, table, FASTA, HDF5/JSON, and collection checkpoints. |
| `$IWC_FORMAT2/scRNAseq/scanpy-clustering/Preprocessing-and-Clustering-of-single-cell-RNA-seq-data-with-Scanpy.gxwf.yml` | 21 | 21 | Every exposed output is asserted, including many mid-pipeline plots and AnnData checkpoints. |
| `$IWC_FORMAT2/VGP-assembly-v2/Scaffolding-HiC-VGP8/Scaffolding-HiC-VGP8.gxwf.yml` | 48 | 16 | Workflow exposes many report/checkpoint outputs, while tests assert a diagnostic subset. |
| `$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml` | 13 | 13 | Smaller report-heavy workflow where all outputs are test-facing. |

Assertion-family counts from sibling tests:

| Assertion family | Files | Line hits | Workflow-design implication |
|---|---:|---:|---|
| `has_text` | 78 | 597 | Text/report checkpoints are broadly assertable with stable tokens. |
| `has_size` | 57 | 201 | Binary/report/plot checkpoints often use size bands. |
| `has_n_lines` | 40 | 146 | Line-count checkpoints are common for tabular/text outputs. |
| `has_line` | 23 | 69 | Deterministic table rows make stronger checkpoints than final reports. |
| `has_text_matching` | 17 | 56 | Regex checkpoints cover numeric drift while preserving content checks. |
| `compare: sim_size` | 9 | 26 | Stochastic or binary outputs may only support magnitude checks. |
| `compare: diff` | 5 | 10 | Strict exact comparison is rare and format-specific. |
| `has_image_width` / `has_image_height` | 1 | 15 each | Image checkpoints are mostly smoke-tested by size/dimensions in this corpus. |

## 3. Findings

### 3a. Workflow labels are the test API

Every asserted output key in the 114 matched workflow/test pairs resolved to a top-level workflow output label. The direct coupling is visible in Scanpy: the workflow exposes outputs like `Initial Anndata General Info`, `UMAP of louvain`, `Ranked genes with Wilcoxon test`, and `Dotplot of top genes on clusters` at `$IWC_FORMAT2/scRNAseq/scanpy-clustering/Preprocessing-and-Clustering-of-single-cell-RNA-seq-data-with-Scanpy.gxwf.yml:105-147`; the test file keys assertions by those labels at `$IWC/workflows/scRNAseq/scanpy-clustering/Preprocessing-and-Clustering-of-single-cell-RNA-seq-data-with-Scanpy-tests.yml:27-205`.

VGP scaffolding shows the same with punctuation-heavy labels: workflow outputs include `Hi-C duplication stats on scaffolds: Raw`, `Hi-C duplication stats on scaffolds: MultiQc`, and `Merged Alignment stats` at `$IWC_FORMAT2/VGP-assembly-v2/Scaffolding-HiC-VGP8/Scaffolding-HiC-VGP8.gxwf.yml:170-196`; tests assert those exact labels at `$IWC/workflows/VGP-assembly-v2/Scaffolding-HiC-VGP8/Scaffolding-HiC-VGP8-tests.yml:218-245`.

Design implication: input/output labels are stable interface names. Renaming is a test-breaking API change.

### 3b. IWC promotes checkpoint outputs so tests can see them

Workflow tests can assert only workflow-level outputs, so IWC workflows expose intermediate summaries, plots, and diagnostics as top-level outputs.

Scanpy exposes a dense ladder of checkpoints: initial AnnData summaries, intermediate plots, ranked-gene tables, final AnnData, cluster-count tables, and final plots (`$IWC_FORMAT2/scRNAseq/scanpy-clustering/Preprocessing-and-Clustering-of-single-cell-RNA-seq-data-with-Scanpy.gxwf.yml:105-147`). The sibling test asserts every one of the 21 workflow outputs, mixing HDF5 key probes, text probes, image dimensions, and line checks (`$IWC/workflows/scRNAseq/scanpy-clustering/Preprocessing-and-Clustering-of-single-cell-RNA-seq-data-with-Scanpy-tests.yml:27-205`).

RNA-seq paired-end exposes mapped reads, stranded/unstranded coverage, abundance estimates, expression tables, counts tables, and MultiQC reports (`$IWC_FORMAT2/transcriptomics/rnaseq-pe/rnaseq-pe.gxwf.yml:90-112`). The sibling test asserts coverage sizes, mapped-read sizes, expression regexes, and a deterministic counts row (`$IWC/workflows/transcriptomics/rnaseq-pe/rnaseq-pe-tests.yml:48-97`).

Design implication: promote the strongest useful checkpoint, not only the final human-facing report. The cost is output-list clutter; IWC tolerates that when it buys testability.

### 3c. Collection-shaped outputs need stable element identifiers

The 10x CellPlex workflow exposes collection-shaped outputs such as `Seurat input for gene expression (filtered)`, `CITE-seq-Count report`, and `Seurat input for CMO (UMI)` (`$IWC_FORMAT2/scRNAseq/fastq-to-matrix-10x/scrna-seq-fastq-to-matrix-10x-cellplex.gxwf.yml:73-91`). The test asserts collection shape with `attributes: {collection_type: ...}` and drills into element identifiers such as `subsample`, `matrix`, `barcodes`, and `genes` (`$IWC/workflows/scRNAseq/fastq-to-matrix-10x/scrna-seq-fastq-to-matrix-10x-cellplex-tests.yml:82-128`).

HyPhy shows identifier stability in a different form: the workflow emits `meme_output`, `prime_output`, `busted_output`, and `fel_output` collection outputs (`$IWC_FORMAT2/comparative_genomics/hyphy/hyphy-core.gxwf.yml:26-38`), and tests key element checks by generated gene identifiers such as `NC_001477.1|capsid_protein_C|95-394_DENV1` (`$IWC/workflows/comparative_genomics/hyphy/hyphy-core-tests.yml:31-71`).

Design implication: generated workflows need deterministic collection element identifiers before test authoring begins. Otherwise `element_tests:` cannot target outputs cleanly.

### 3d. Assertion strength feeds back into checkpoint choice

Scanpy plot outputs are mostly smoke-tested with `has_size`, `has_image_width`, and `has_image_height` tolerances (`$IWC/workflows/scRNAseq/scanpy-clustering/Preprocessing-and-Clustering-of-single-cell-RNA-seq-data-with-Scanpy-tests.yml:33-205`). The same workflow also exposes stronger non-image checkpoints such as AnnData HDF5 keys and `Number of cells per cluster` line checks (`$IWC/workflows/scRNAseq/scanpy-clustering/Preprocessing-and-Clustering-of-single-cell-RNA-seq-data-with-Scanpy-tests.yml:159-195`).

RNA-seq paired-end pairs coarse size checks for BAM/bigWig-like outputs with stronger regex/line checks for expression/count tables (`$IWC/workflows/transcriptomics/rnaseq-pe/rnaseq-pe-tests.yml:48-97`). MGnify complete uses MultiQC token checks, exact file/location comparisons, collection element checks, and table-shape assertions in the same test file (`$IWC/workflows/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-complete/mgnify-amplicon-pipeline-v5-complete-tests.yml:15-120`).

Design implication: if final outputs are stochastic, binary, image-only, or report-heavy, expose an adjacent table/text/HDF5 checkpoint that can carry a stronger assertion.

### 3e. Fixture shape constrains workflow inputs

Tests supply job inputs by workflow input label. The 10x CellPlex test uses labels like `fastq PE collection GEX`, `reference genome`, `gtf`, `cellranger_barcodes_3M-february-2018.txt`, `fastq PE collection CMO`, `sample name and CMO sequence collection`, and `Number of expected cells` (`$IWC/workflows/scRNAseq/fastq-to-matrix-10x/scrna-seq-fastq-to-matrix-10x-cellplex-tests.yml:2-75`); the workflow declares matching inputs and types, including data, string, boolean, int, and collection inputs (`$IWC_FORMAT2/scRNAseq/fastq-to-matrix-10x/scrna-seq-fastq-to-matrix-10x-cellplex.gxwf.yml:4-72`).

HyPhy's input collection identifiers contain pipes and accession-like labels (`$IWC/workflows/comparative_genomics/hyphy/hyphy-core-tests.yml:7-30`), while the workflow only declares the collection type (`$IWC_FORMAT2/comparative_genomics/hyphy/hyphy-core.gxwf.yml:14-25`). The test contract therefore lives partly in workflow input shape and partly in fixture element identifiers.

Design implication: workflow input labels and collection types should be designed with fixture authoring in mind, not treated as a test-file afterthought.

## 4. Distribution plan

No formal `content/patterns/*.md` pages are recommended from this issue right now. These findings are cross-cutting workflow-testability guidance, not operation-anchored Galaxy construction patterns as defined in `docs/PATTERNS.md`.

| Finding | Permanent home | Integration action |
|---|---|---|
| Labels as test API | [[galaxy-workflow-testability-design]], with shortcut warning retained in [[iwc-shortcuts-anti-patterns]] | New durable note owns design guidance; anti-pattern note keeps accepted/smell wording. |
| Promote checkpoint outputs | [[galaxy-workflow-testability-design]] | New durable note owns the workflow-authoring rule and evidence. |
| Stable collection output identifiers | [[galaxy-workflow-testability-design]], cross-linked from [[iwc-test-data-conventions]] | Design note owns output-side stability; test-data note keeps YAML shapes. |
| Assertion strength affects checkpoint choice | [[galaxy-workflow-testability-design]], cross-linked from [[planemo-asserts-idioms]] | Assertion note keeps assertion families; design note explains upstream checkpoint selection. |
| Fixture shape constrains workflow inputs | [[iwc-test-data-conventions]] plus [[galaxy-workflow-testability-design]] | Test-data note owns input fixture YAML; design note owns workflow interface implications. |
| Planemo missing-output ambiguity | [[planemo-workflow-test-architecture]] | Architecture note should mention label drift and omitted workflow outputs as likely causes. |
| Mold auto-load behavior | [[implement-galaxy-workflow-test]] frontmatter `references` | Add design note as on-demand research reference; avoid expanding Mold body. |

## 5. Open questions

1. Should [[galaxy-workflow-testability-design]] be loaded only by [[implement-galaxy-workflow-test]], or also by upstream workflow-construction Molds that choose outputs before tests exist?
2. Should the survey stay as a draft evidence hub, or become `stale` after the durable note absorbs the guidance?
3. Should we add a separate workflow-authoring research note later for user-facing output curation, or is testability-specific output clutter enough for this note?
