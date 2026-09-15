---
"@galaxy-foundry/summarize-nextflow": minor
---

Classify Nextflow profiles by role. `profiles[]` items are now objects
(`name`, `kinds[]`, `source_path`, `includes[]`, `signals[]`) instead of bare
name strings — a breaking change to that field, summary schema rev 12.

`kinds[]` is classified from the profile body with its `includeConfig` chain
resolved, so consumers no longer re-apply a `startsWith("test")` heuristic that
mislabels mode-switch profiles named `test` and misses test profiles named
anything else. It is an array because profiles genuinely combine roles — 25 of
371 corpus profiles select a container engine and an executor in one block.
`test`, `container`, `executor`, and `dev` accumulate; `mode` and `resources`
are fallbacks assigned only when none of those matched, with the suppressed
evidence kept in `signals[]`.

Profile enumeration was fixed in the same change: brace-depth tracking (nested
`params { }` / `process { }` blocks were emitted as profile names), root
`includeConfig` following, and a bounded scan for launch-time `-c` configs. 11
of 26 corpus pipelines previously reported a wrong profile list.
