# IWC Comparison Notes

## Candidate Ranking

No corpus search was performed in this emulation. The generated skill contract lacks a concrete IWC index path, fixture availability check, and ranking input format. Based on the brief alone, likely useful exemplar classes would be QC/reporting workflows with FASTQ collection inputs, FastQC, optional trimming, and MultiQC report aggregation.

## Nearest Exemplar

No nearest exemplar selected.

Confidence: low, because this run did not materialize or inspect IWC fixtures.

## Structural Matches

- The proposed Galaxy design follows common IWC shape: dataset/collection inputs, per-sample mapped QC, then report aggregation.
- Stable public outputs and checkpoint labels align with IWC testability guidance.

## Structural Differences

- Nextflow sample-sheet metadata maps naturally to Galaxy sample-sheet collections, but the exact IWC exemplar shape was not checked.
- Nextflow `mix`/`collect` report aggregation needs a Galaxy-specific collection/list assembly step or direct MultiQC multi-input strategy.
- The conditional `skip_trim` branch may be over-flexible compared with many IWC workflows, which often choose a fixed workflow path.

## Routed Findings

| Finding | Owner | Guidance |
|---|---|---|
| No actual IWC candidate was ranked | compare skill / harness | Add fixture/index contract before treating exemplar comparison as corpus evidence. |
| MultiQC gather is underspecified | template/data-flow | Keep placeholder step in skeleton with TODO context. |
| Conditional trim branch may complicate first Galaxy draft | template/data-flow | Ask user whether to preserve branch parity or fix a default. |
| Workflow tests should avoid volatile runtime reports | test-plan | Assert `multiqc_report` and selected stable checkpoint outputs. |

## Confidence

- Low overall because this is a structural dry run, not a corpus-backed comparison.

## Open Questions

- What is the local or remote IWC index the generated skill should search?
- Should compare return `No nearest exemplar` as structured data so template can consume it predictably?
