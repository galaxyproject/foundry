---
mold: advance-galaxy-draft-step
date: 2026-09-16
intent: Reuse wrapper pins and summaries across steps in the same draft.
decision: eval-add
---

The `auris-scf1` run reported repeated wrapper resolution in feedback entry
`advance-draft-mold-reresolves-a-wrapper-already-pinned-in-the-draft`
([#549](https://github.com/galaxyproject/foundry/issues/549)). At iteration 20,
the draft had 27 tool steps using 12 distinct tools. The operator maintained
a 23 KB `iteration-brief.md` to pass resolved identities between iterations.
Reported first-use/repeat timings were 5.0/2.3 minutes for `Cut1` and
7.0/3.9 minutes for `__FILTER_FROM_FILE__`.

Step 2 now reuses a concrete sibling's `tool_id` and `tool_version` before
trying discovery or version lookup. Step 3 reuses the cached summary for
that pair. A routing eval checks both behaviors.

This change overlaps step 2 edits in #557 (tool cache) and #558 (stock-version
probe); rebase and regenerate casts after those merge.
