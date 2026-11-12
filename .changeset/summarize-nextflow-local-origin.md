---
"@galaxy-foundry/summarize-nextflow": patch
---

Fall back to `manifest.homePage` for `source.url` when the git origin is a local path, so pipelines cloned by Nextflow (origin is a local bare repo) summarize with or without `--pin` instead of failing schema validation.
