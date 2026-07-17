# Galaxy data-flow brief — biowardrobe_chipseq_se

Source: `summary-cwl.json` + `cwl-galaxy-interface.md`.
Confidence: high for topology, medium for Directory + conditional-output mapping.

## Abstract topology

Linear ChIP-seq pipeline, single-end, with one trivial 3-step nested workflow inlined and one conditional step:

```
fastq_file → extract_fastq → bowtie_aligner → samtools_sort_index → samtools_rmdup → samtools_sort_index_after_rmdup → bam_to_bigwig.{bam_to_bedgraph → sort_bedgraph → sorted_bedgraph_to_bigwig} → bigwig
                                              ↘ macs2_callpeak (+ optional control_bam) → island_intersect → iaintersect_result
                                                                  ↘ average_tag_density → atdp_result
                                                                  ↘ get_stat
                          ↘ fastx_quality_stats → fastx_statistics
```

Edge count (workflow + nested): ~30 from `summary-cwl.graph.edges`. No scatter, no `linkMerge`, no `pickValue`. One `null`-flowing edge to a non-null sink.

## Galaxy collection semantics

None required. All step inputs are scalars (single `File`, scalar parameters). No CWL arrays, records, or scatter in this workflow.

- **`indices_folder` (Directory).** Not a collection — treat as a single reference-data dataset. Recommended Galaxy translation: cached `bowtie_indices` data table (see interface brief, open question #1). If that's not viable, request a composite `bowtie_index` datatype. Do **not** translate to a collection of files.
- **`control_bam` (optional File).** Galaxy optional `data` input. The downstream `macs2_callpeak` step needs a connect-or-don't connection; Galaxy supports optional dataset inputs natively in gxformat2.

## Conditional/expression pressure

1. `macs2_callpeak/peak_xls_file` is `(null|File)` but is wired to `get_stat/peak_xls_file: File`. cwltool flagged this in validation. **Galaxy translation decision:** mark `get_stat` as a step whose input may be empty. gxformat2 does not have CWL `when:`. Options:
   - (a) accept that `get_stat` produces an empty/failed dataset when no peaks are called; downstream output `get_stat_log` is already typed `File?` in CWL, so this is consistent.
   - (b) make the `get_stat` step contingent on `broad_peak`/`narrow_peak` selection. Galaxy lacks native step skipping; would require splitting the workflow into broad/narrow sibling workflows. Out of scope for this fixture — defer.
   - Recommend (a). Surface as an `eval`-time test case (run with and without producing peaks).
2. The CWL workflow has `InlineJavascriptRequirement` at the top level. Spot-checks of step inputs show only literal sources and a couple of `default` integers — no expression-driven control flow at the workflow boundary. **No translation pressure at the gxformat2 level**; expressions inside individual CommandLineTools become wrapper-level concerns.
3. The nested `#bam-bedgraph-bigwig.cwl` subworkflow uses `StepInputExpressionRequirement` for value derivations inside its three steps. Translate the subworkflow as three sibling Galaxy steps; the value-derivation pressure surfaces as per-step wrapper concerns (output naming, format), not workflow wiring.

## Placeholder transformations

| Edge | CWL marker | Galaxy translation |
| --- | --- | --- |
| `bowtie_aligner/output` → `samtools_sort_index/sort_input` | direct | direct dataset connection |
| `samtools_sort_index/bam_bai_pair` → `samtools_rmdup/bam_file` | direct | direct (Galaxy carries BAI as composite) |
| `samtools_rmdup/rmdup_output` → `samtools_sort_index_after_rmdup/sort_input` | direct | direct |
| `samtools_sort_index_after_rmdup/bam_bai_pair` → `bam_to_bigwig/bam_file` | direct (was nested-workflow input) | inline as three steps; direct connection |
| `macs2_callpeak/peak_xls_file (null\|File)` → `get_stat/peak_xls_file (File)` | type-narrowing | accept and let Galaxy fail the step on empty input; document in tests |
| 14 scalar parameter inputs → corresponding step parameter inputs | direct | direct |

## Unresolved Galaxy tool needs

Twelve CommandLineTools to map to Galaxy tools (Tool Shed lookups owned by the discover-or-author branch downstream):

- `bowtie-alignreads.cwl` (bowtie v1.2.0) — bowtie1 ChIP-seq alignment.
- `samtools-sort-index.cwl` (samtools v1.4) — used twice (before + after rmdup).
- `samtools-rmdup.cwl` (samtools v1.4).
- `bedtools-genomecov.cwl` (bedtools v2.26.0).
- `linux-sort.cwl` (`sort`) — coreutils, likely Tool Shed `text_processing` family.
- `ucsc-bedgraphtobigwig.cwl` (UCSC userApps v358) — well-known wrapper exists.
- `macs2-callpeak-biowardrobe-only.cwl` (custom MACS2 wrapper) — **likely needs author-galaxy-tool-wrapper**; the upstream `python run.py macs2 callpeak` invocation is biowardrobe-specific.
- `iaintersect.cwl` (biowardrobe iaintersect) — **biowardrobe-specific**; expect to author.
- `atdp.cwl` (biowardrobe atdp average tag density) — **biowardrobe-specific**; expect to author.
- `extract-fastq.cwl` — likely a thin extract/concat shim; consider replacing with `Concatenate datasets` or skipping if input is already FASTQ.
- `fastx-quality-stats.cwl` (fastx_toolkit v0.0.14) — Tool Shed wrapper exists.
- `python-get-stat-chipseq.cwl` — biowardrobe stat-collector; **expect to author**.

Counting: 6 likely Tool Shed hits, 5 likely-author, 1 ambiguous (`extract-fastq`).

## Confidence

High for topology and direct edges. Medium for:

- Directory→Galaxy mapping (interface concern, but it ripples here).
- Conditional `get_stat` step (no Galaxy native `when:`).
- Whether biowardrobe-flavored MACS2/atdp/iaintersect tools have IUC equivalents (deferred to discover-shed-tool).

## Open questions

1. Inline the nested workflow as three steps vs author a Galaxy sub-workflow? Recommend inline.
2. Drop `extract_fastq` step entirely if Galaxy datasets are always pre-extracted?
3. How to handle the null→File edge: accept downstream failure vs sibling-workflow split?
4. Are biowardrobe-* tools available in Tool Shed under different names? Discover phase will answer.
