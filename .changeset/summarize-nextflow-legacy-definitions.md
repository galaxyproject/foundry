---
"@galaxy-foundry/summarize-nextflow": patch
---

Read parameter groups from legacy draft-07 `definitions` as well as `$defs` in
`nextflow_schema.json`. Older nf-core pipelines such as `nf-core/nanoseq` previously
produced an empty `params[]` and no schema-backed `sample_sheets[]`.
