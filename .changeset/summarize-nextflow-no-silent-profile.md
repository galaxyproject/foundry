---
"@galaxy-foundry/gxwf-foundry": patch
"@galaxy-foundry/summarize-nextflow": patch
---

Drop the silent `--profile test` default from `foundry summarize-nextflow`, and read the `profile = "…"` form that the nf-core template uses in `nf-test.config`. Without `--profile`, each test candidate keeps the profiles its nf-test files declare, and profile-scoped `withName` selectors (`publish_dir_matches`, `resolved_args`) are resolved without the `test` profile unless one is passed.
