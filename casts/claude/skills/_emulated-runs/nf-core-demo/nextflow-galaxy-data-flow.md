# Galaxy Data-Flow Brief

## Source

- Inputs: `summary-nextflow.json` plus `nextflow-galaxy-interface.md` from this emulated run.
- Processes: `FASTQC`, `SEQTK_TRIM`, `MULTIQC`.
- Source condition: `!params.skip_trim` affects `SEQTK_TRIM`.

## Abstract DAG

| Node | Source evidence | Galaxy draft role | Notes |
|---|---|---|---|
| `input_samples` | sample sheet to `ch_samplesheet` | workflow input collection | `sample_sheet:paired_or_unpaired`; maps rows to sample datasets. |
| `fastqc_raw` | `ch_samplesheet -> FASTQC` | map-over FastQC step | Emits HTML and ZIP per sample. |
| `trim_reads` | `ch_samplesheet -> SEQTK_TRIM`, guarded by `!skip_trim` | conditional map-over trim step | Branch behavior needs gxformat2 `when` or fixed design decision. |
| `multiqc_gather` | `FASTQC.out.zip -> MULTIQC` via `collect`/`mix` | reduction/gather placeholder | Needs materialized list of reports and version files. |
| `multiqc_report` | `MULTIQC.out.report` | final report output | Primary public workflow output. |

## Collection Strategy

- Treat samples as a Galaxy sample-sheet collection so row metadata survives invocation.
- Map FastQC and SeqTK over sample elements.
- Represent `collect`/`mix` before MultiQC as a gather/reduction TODO until exact Galaxy collection operation is chosen.
- Preserve `skip_trim` as a workflow boolean if branch parity matters; otherwise fix the branch and remove the input.

## Placeholder Transformations

| Placeholder | Reason | Later owner |
|---|---|---|
| `TODO_BUILD_MULTIQC_INPUT_LIST` | Nextflow `collect`/`mix` aggregates FastQC ZIPs, workflow summary, methods text, and versions. | template/data-flow, then concrete collection step |
| `TODO_CONDITIONAL_TRIM_BRANCH` | `SEQTK_TRIM` is guarded by `!params.skip_trim`; downstream use of trimmed reads is not represented clearly in summary edges. | template/data-flow |
| `TODO_VERSIONS_YAML` | Nextflow topic-based versions aggregation has no direct Galaxy equivalent in this skeleton. | template or test-plan |

## Unresolved Tool Needs

- FastQC wrapper for `FASTQC`.
- SeqTK trim wrapper for `SEQTK_TRIM` if the trim branch is preserved.
- MultiQC wrapper for `MULTIQC`.
- Collection/list building or report-gather operation before MultiQC.

## Testability Notes

- Use `multiqc_report` as the first smoke-test output.
- Use `fastqc_zip` as a stable checkpoint if per-sample output assertions are needed.
- The source nf-test snapshot ignores pipeline-info report files; Galaxy tests should avoid asserting volatile runtime reports.

## Confidence

- High: process ordering and primary report output.
- Medium: conditional trim representation and collection gather before MultiQC.
- Low: exact versions aggregation equivalent.

## Open Questions

- Does Galaxy skeleton need both raw FastQC and trimmed-read outputs exposed?
- Should versions aggregation be modeled in the skeleton or deferred to final implementation?
