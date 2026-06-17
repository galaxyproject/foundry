---
mold: advance-galaxy-draft-step
date: 2026-06-17
intent: Fresh /test-pipeline re-run of interview-to-galaxy on the UC1 MRSA mobile-AMR case; drive the per-step loop's discover/resolve half against the live Tool Shed.
decision: open-question
---

## What worked

- The loop oracles behaved exactly to spec on a real 15-step draft:
  `draft-next-step` deterministically picked `integron_finder` (stable across
  re-runs, `work` listed the step's TODO sentinels + `_plan_*`);
  `draft-validate --concrete` → `draft valid` + `Concrete: OK` with the one
  Resolved step's tool_state validated and the 14 drafty steps excluded from the
  concrete projection; `draft-extract` returned the maximal concrete prefix
  (staramr only, dependents dropped).
- The discover/resolve half resolved the named domain tools against the live
  Tool Shed to real pinnable changesets: `iuc/isescan/isescan` @ `81539b9ae80a`
  (1.7.3+galaxy0, newest) and `iuc/integron_finder/integron_finder` @
  `5429646e486d` (2.0.5+galaxy1, newest).

## Gap that surfaced — discover query normalization

`gxwf tool-search integron_finder` (the verbatim **tool-id token**, which is what
the template wrote into the step's `_plan_context` candidate —
"candidate iuc/integron_finder") returns **`No hits for query: integron_finder`**.
Only the **human-name** variants score: `integron finder` (34.60),
`integronfinder` (15.97), `integron` (51.33). ISEScan happened to score on its
bare token (`isescan` → 27.78) so it masked the issue.

Concretely: a discover-shed-tool invocation that feeds the raw `_plan_context`
candidate string (`integron_finder`, an underscored tool-id token) straight into
`tool-search` would conclude "no acceptable shed candidate" and fall through to
`author-galaxy-tool-wrapper` — authoring a wrapper for a tool that **already
exists** in `iuc`. That's a false-negative discovery, the expensive wrong branch.

## Open question

Where should query normalization live, and what should it do?

- The loop's step 2 ("Resolve a wrapper… run discover-shed-tool against the
  step's `_plan_*` context") implies the query is derived from `_plan_context`.
  If templates write tool-id-shaped candidates (`iuc/integron_finder`), discovery
  needs to **variant-expand**: strip owner prefix, split on `_`/`-`, try the
  human name, not just the literal token.
- Alternatively the template Mold should record the **human tool name** in
  `_plan_context` (e.g. "Integron Finder") alongside or instead of the tool-id
  guess, since the id token is exactly what a fresh search should not assume.
- Either way the eval property "no acceptable shed candidate falls through to
  authoring" has a hidden precondition — that the *query* was a fair search.
  A single-token search that misses an existing tool is a discovery bug
  masquerading as a legitimate fallthrough. Worth an eval note or a
  discover-shed-tool refinement on query construction.

Not changing schema or references here — flagging the query-construction contract
between template `_plan_context`, the loop's discover step, and discover-shed-tool.
