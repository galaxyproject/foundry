# fastqc-zip-no-port

A real draft and ledger: the inputs and output of one `advance-galaxy-draft-step` call in the `nf2g-demo-rerun-7-10-2026-10-21` run, trial 001, phase 7, iteration 4. The resolved FastQC wrapper has no ZIP output, and `fastqc_zip_archives` is public.

- `galaxy-workflow-draft.gxwf.yml` and `open-requirements.ledger.yml` are that iteration's inputs.
- `repaired.gxwf.yml` is that iteration's output.

One edit to each draft: `fields:` is removed from `input_reads`, because `gxwf draft-validate` 1.15.0 rejects it on a `sample_sheet:paired_or_unpaired` input. Without the edit, both drafts exit 1. The ledger is unchanged.

The `nf2g-demo` runs share one seed, so this pair and `sample-sheet-restore-last-drafty` aren't independent.
