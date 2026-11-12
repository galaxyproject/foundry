# GALAXY WORKFLOW EFFICIENCY pipeline scenarios

Phase-2 cases live in [[improve-galaxy-workflow-efficiency]]'s own `scenarios.md`.
The journeys below follow those cases through the rest of the pipeline. None has
been walked yet.

## Case: RNA-seq QC end to end

- fixture: `workflow-fixtures/iwc-format2/transcriptomics/rnaseq-pe/rnaseq-pe.gxwf.yml` (IWC `transcriptomics/rnaseq-pe/rnaseq-pe`) with its IWC tests.
- expect: after approval, the final workflow runs `iuc/falco` at
  `FastQC check read qualities`, still feeds `text_file` into the MultiQC step
  `Combined Quality Report`, and passes the carried-forward IWC tests, none of
  which assert on FastQC output. Every other step is byte-identical to the
  baseline.

## Case: every matching step kept

- fixture: `workflow-fixtures/iwc-format2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-quality-control-single-end/mgnify-amplicon-pipeline-v5-quality-control-single-end.gxwf.yml`.
- expect: phase 2 keeps all four FastQC steps because of the `Filename`
  rewrite, the change-set has no entries, and the run ends after phase 2 with no
  modified workflow.
