---
"@galaxy-foundry/gxwf-foundry": minor
---

Add `foundry check-scope-records <ledger.yml> [summary.json]`. It checks a ledger's source-scope decision and scope drops, and resolves their citations against a Nextflow summary.

Add `foundry nextflow-parity`. It joins a nextflow-to-galaxy run's summary, ledger, draft snapshot, final workflow and `gxwf diff --json` into source-parity rows and findings.

Shape errors from the ledger readers are `InputShapeError`.
