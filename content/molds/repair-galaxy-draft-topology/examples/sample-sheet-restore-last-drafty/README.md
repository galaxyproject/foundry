# sample-sheet-restore-last-drafty

A real draft and ledger: the inputs of one `advance-galaxy-draft-step` call in the `nf2g-demo-loop-repair-2026-10-20` run, trial 001, phase 7, iteration 7. `restore_trimmed_sample_sheet_metadata` is the last drafty step, so a repair that removes it leaves `draft: false`. That run's call returned without extracting.

One edit to the draft: `fields:` is removed from `input_reads`, because `gxwf draft-validate` 1.15.0 rejects it on a `sample_sheet:paired_or_unpaired` input. The ledger is unchanged, so it still holds the same run's earlier drop of `explode_and_label_input_reads`, which rested on a missing cache pin. A later run implemented that step.

The `nf2g-demo` runs share one seed, so this pair and `fastqc-zip-no-port` aren't independent.
