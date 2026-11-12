---
"@galaxy-foundry/summarize-nextflow": patch
---

Record `ext.when` gates from `withName:` / `withLabel:` config selectors as `workflow.conditionals[]` entries, so process skip switches such as nf-core/bamtofastq's `--no_read_QC` and `--no_stats` reach the summary.
