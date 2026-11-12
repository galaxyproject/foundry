---
"@galaxy-foundry/summarize-nextflow": minor
---

Rank `resolved_args` per call. Each entry gains an `id`, and `processes[].effective_args` names the entry that takes effect for each call and `key` by Nextflow selector priority, with `tie: true` for same-rank conflicts the summary can't settle.
