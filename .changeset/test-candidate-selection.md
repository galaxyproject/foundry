---
"@galaxy-foundry/summarize-nextflow": minor
---

Unify Nextflow test candidate selection. `test_candidates[]` gathers
whole-pipeline nf-test cases together with profile and pipeline-default
fallbacks, and `test_selection` records either one selected candidate or an
explicit scope choice. Whole-pipeline cases rank above profile-level evidence
because they preserve per-test parameter overrides.

The former singular `test_fixtures` and the top-level `nf_tests[]` are removed —
a breaking change to both fields — and the CLI no longer silently defaults
`--profile` to `test`; it is an explicit override for candidate resolution.
