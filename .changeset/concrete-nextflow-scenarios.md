---
"@galaxy-foundry/summarize-nextflow": patch
---

Skip process and workflow extraction for explicitly declared DSL1 pipelines while emitting a schema-valid summary with a DSL1 warning.

Ignore comments while enumerating nf-test blocks, preventing quoted comment text from hiding tests. Report container directives with no resolved package mapping instead of silently losing their evidence.
