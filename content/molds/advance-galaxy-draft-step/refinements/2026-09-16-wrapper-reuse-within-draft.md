---
mold: advance-galaxy-draft-step
date: 2026-09-16
intent: Add the missing already-resolved-in-this-draft case to Sequence step 2, backed by the `auris-scf1` run profiling.
decision: eval-add
---

## What I did

Read the `advance-draft-mold-reresolves-a-wrapper-already-pinned-in-the-draft`
feedback-ledger entry raised by a real run (`auris-scf1`, phase 6 of
`pipeline-paper-to-galaxy`). At iteration 20 that run's draft carried 27 tool
steps over only 12 distinct tools (`Filter1` x7, `compose_text_param` x5,
`Cut1` x3, `__FILTER_FROM_FILE__` x3, `deseq2` x2), and Sequence step 2 had no
case for a wrapper another step of the same draft had already resolved. The
run worked around it by hand: a 23 KB scratch `iteration-brief.md` with a
"Settled step conventions" section the operator told every iteration subagent
to adopt from, rather than re-derive. A hand-maintained scratch file outside
the artifact is not reproducible by a fresh harness.

Added a third case to Sequence step 2, placed first because it is the
cheapest test: if another step of the same draft is already concrete on the
matching `tool_id`, adopt its `tool_id`/`tool_version` and skip discovery
(Tool Shed search or bare-id cache/version lookup) entirely. Noted in step 3
that the cached tool summary is reused rather than re-produced in that case.
Stated explicitly that this is the intended move, not a tolerated shortcut,
and that it is safe because the pin lives in the draft artifact itself, so a
fresh harness with no shared context reaches the same answer by re-reading
the draft.

## What I observed

Paired timing from the same run's profiling makes the cost concrete: a
repeat-wrapper iteration ran at roughly half the wall clock of the first use
of the same wrapper (`Cut1` 5.0 min first use vs. 2.3 min sibling;
`__FILTER_FROM_FILE__` 7.0 min first use vs. 3.9 min repeat). With 12 distinct
tools across 27 steps in that single draft, the missing case was the common
path, not an edge case.

## Recommendations

Added an eval property (bucket: routing) asserting that a step whose `tool_id`
already resolved on a sibling step reuses that identity and summary rather
than re-discovering or re-summarizing. Kept it property-shaped and
fixture-independent per `content/meta/eval-philosophy.md` — no fixture name or
magic count, just the observable behavior any conforming run must satisfy.

## Open questions

Two sibling branches touch the same Sequence step 2 in this batch:
`fix/advance-step-declare-tool-cache` (adds tool-cache references and cache
population) and `fix/advance-step-stock-version-probe` (rewrites the
built-in/stock branch). All three will need rebasing against each other
before merge.
