---
mold: discover-shed-tool
date: 2026-06-17
intent: Close the discover-query false-negative surfaced by the UC1 MRSA interview-to-galaxy test-pipeline re-run.
decision: eval-add
---

## Finding

During a `/test-pipeline interview-to-galaxy` run, the per-step loop's deferred
`integron_finder` step carried a `_plan_context` candidate of `iuc/integron_finder`.
`gxwf tool-search integron_finder` (the verbatim tool-id token) returns
**`No hits`**, while `integron finder` (34.60), `integronfinder` (15.97), and
`integron` (51.33) all score and resolve to the real `iuc/integron_finder`
wrapper (changeset `5429646e486d`, 2.0.5+galaxy1). ISEScan masked the class of
bug because its bare token (`isescan`) happens to score.

A discover-shed-tool run that fed the raw underscored/owner-prefixed token into
`tool-search` would therefore emit `miss` and trigger the `discover-or-author`
fall-through to author a wrapper for a tool that **already exists** — the
expensive wrong branch, and a false `miss` that passes every static check.

## Change applied

- **Procedure §1 (Search):** added a "normalize a tool-id-shaped need before
  searching" step — strip `owner/` prefix, split `_`/`-` into words, try the
  human name and the bare significant word; a `miss` is only honest after the
  variants are tried.
- **Caveats:** strengthened the "try alternate phrasings" bullet with the
  concrete id-token-vs-human-name failure mode.
- **eval.md:** added property *"a miss survives query-variant normalization"* —
  a `miss` that an obvious name-variant would have turned into a hit is a failure.
- Re-cast the Claude bundle (verify clean, no drift).

## Open

- The deeper contract question is whether the **template** Mold should write a
  human-readable tool name into `_plan_context` (not only an id-token guess), so
  the discover step gets a fair query by construction. Tracked in the sibling
  refinement on [[advance-galaxy-draft-step]] (the loop that constructs the
  discover query from `_plan_context`). This entry fixes the discovery side;
  the upstream-hint side stays open.
