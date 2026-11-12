---
"@galaxy-foundry/gxwf-foundry": minor
---

Add `foundry check-scope-records <ledger.yml> [summary.json]`, which checks a ledger's source-scope decision and scope drops and resolves their citations against a Nextflow summary, and `foundry nextflow-parity`, which joins a nextflow-to-galaxy run's summary, ledger, draft snapshot, final workflow and `gxwf diff --json` into source-parity rows and findings. `StepRemovalInputError` is now `InputShapeError`, shared by the ledger readers.
