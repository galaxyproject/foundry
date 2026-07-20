# Galaxy interface brief — biowardrobe_chipseq_se

Source: `biowardrobe_chipseq_se.cwl` (GA4GH challenge entry, Barski-Lab).
Provenance: summary-cwl @ `summary-cwl.json` (cwlVersion v1.0, 11 steps, 12 tools, 1 nested workflow).
Confidence: medium-high — single fastq input, no scatter, no `when:`/`pickValue`, single-end only.

## Workflow inputs (Galaxy-facing)

| Galaxy label | Galaxy shape | CWL source | Notes |
| --- | --- | --- | --- |
| `fastq_file` | dataset (datatype `fastqsanger` from EDAM 1930) | `fastq_file` (File) | Required. SE reads. |
| `bowtie_indices` | (review) Directory | `indices_folder` (Directory) | **Open question.** Galaxy has no first-class Directory input. Options: (a) ship indices as a Galaxy `bowtie_base_index` data-table reference (preferred per IWC ChIP-seq convention); (b) expose as a `data_collection` of index files + a `prefix` parameter; (c) require pre-built `.bowtie_indices` composite datatype. Recommend (a). |
| `control_bam` | optional dataset (datatype `bam`) | `control_file` (File?) | Optional control for MACS2. Map to a Galaxy optional `data` input. |
| `annotation_file` | dataset (datatype `tabular`) | `annotation_file` (File, EDAM 3475) | Tab-separated annotation used by `iaintersect`. |
| `chrom_length` | dataset (datatype `len`) | `chrom_length` (File, EDAM 2330) | Chromosome sizes for `bedGraphToBigWig`. |
| `genome_size` | parameter (text, restricted) | `genome_size` (string) | Help: `hs, mm, ce, dm, or a number e.g. 2.7e9`. |
| `broad_peak` | parameter (boolean) | `broad_peak` (boolean) | MACS2 broad-peak toggle. |
| `exp_fragment_size` | parameter (integer, default 150) | `exp_fragment_size` (int?) | |
| `force_fragment_size` | parameter (boolean, default false) | `force_fragment_size` (boolean?) | |
| `clip_3p_end` | parameter (integer, default 0) | `clip_3p_end` (int?) | |
| `clip_5p_end` | parameter (integer, default 0) | `clip_5p_end` (int?) | |
| `remove_duplicates` | parameter (boolean, default false) | `remove_duplicates` (boolean?) | Drives `samtools rmdup`. |
| `threads` | parameter (integer, default 2) | `threads` (int?) | Per-step parallelism. Usually a runtime/admin concern in Galaxy — consider hiding. |

## Workflow outputs (Galaxy-facing)

Promote the following as **public** workflow outputs (downstream-consumable):

- `bigwig` — BigWig signal (EDAM 3006) → datatype `bigwig`.
- `bambai_pair` — sorted, deduplicated BAM+BAI → Galaxy `bam` (BAI auto-attached via composite or sibling collection).
- `macs2_narrow_peaks` / `macs2_broad_peaks` / `macs2_gapped_peak` / `macs2_peak_summits` — peak files. Optional; exposed because they are downstream-consumable.
- `iaintersect_result` — annotated peaks table (`tabular`).
- `atdp_result` — average tag density table (`tabular`).
- `fastx_statistics` — FASTQ QC stats (`tabular`).

Promote the following as **checkpoint** outputs (review-only, not downstream-consumed):

- `bowtie_log`, `samtools_rmdup_log`, `macs2_log`, `macs2_fragment_stat`, `atdp_log`, `iaintersect_log`, `get_stat_log`, `macs2_moder_r`, `macs2_called_peaks`.

## Open questions

1. **Directory → Galaxy.** `indices_folder` is the highest-friction mapping. The IWC ChIP-seq exemplars use a `bowtie2_indices` cached reference data table; this workflow is bowtie1. Confirm a `bowtie_indices` data table exists (or accept index tarball as a composite type).
2. **Optional File output flowing into a non-null sink.** `macs2_callpeak/peak_xls_file` is `(null|File)` but feeds `get_stat/peak_xls_file: File`. cwltool flagged this. Galaxy translation must either gate the `get_stat` step on `broad_peak=false`/MACS2 success, or accept that `get_stat` only runs when peaks are present. Surface as conditional-step decision in the data-flow brief.
3. **Nested workflow `#bam-bedgraph-bigwig.cwl`.** Three-step subworkflow (bedtools genomecov → sort → bedGraphToBigWig). Recommend inlining as three Galaxy steps rather than authoring a Galaxy sub-workflow — Galaxy sub-workflows exist but are an unnecessary boundary for this fixture.
4. **`threads` parameter exposure.** CWL exposes thread count as a workflow input. Galaxy convention buries this in tool configuration. Recommend dropping from the public interface.
5. **Datatype for `chrom_length`.** Listed as EDAM 2330 (plain text) but Galaxy has `len` and `tabular` candidates; `len` is the bedGraphToBigWig-canonical type.

## Confidence

Medium-high. The workflow is small (one main + one trivial subworkflow), single-end, no expression-driven control flow, no scatter, and inputs map cleanly except for the Directory case. Datatype choices need IWC ChIP-seq cross-check (step 4).
