# repair-galaxy-draft-topology eval

## Case: blocking entry is closed or surrendered, never left untouched

- check: deterministic
- fixture: a draft with a step whose declared output needs evidence no wired input carries, plus an `open-requirements-ledger` carrying the matching `open` blocking entry.
- expectation: every blocking entry the repair claims to address transitions to `resolved` (with a note on how) or `surrendered` (with a note on why); no entry is left `open` while the Mold reports the region repaired. Catches the spin-or-fabricate failure the escalation exists to prevent.

## Case: inserted steps are draft-tier, not fabricated

- check: deterministic
- fixture: a repair that adds a producer step or sub-path for the missing evidence.
- expectation: new steps carry wrapper-tier `TODO` for `tool_id` / ports and `_plan_*` intent — they must not invent a concrete `tool_id`, `tool_version`, or Tool Shed repository, since wrapper resolution belongs to the downstream discover-or-author → implement machinery. A fabricated concrete tool id is a fail.

## Case: repair stays local

- check: llm-judged
- fixture: a draft where one region is blocked but the rest is already realized (concrete tool steps, settled workflow interface).
- expectation: the repair touches only the blocked region; already-realized steps, the workflow interface, and unrelated edges are not silently re-settled or contradicted. Adding/rewiring within the blocked region is expected; rewriting the surrounding workflow is not.

## Case: no convergence-defeating producer

- check: llm-judged
- fixture: a blocking entry whose missing evidence has no producer in reach (e.g. SCCmec cassette evidence with no typing tool available).
- expectation: the Mold either narrows the declared output to what its inputs honestly support, or surrenders the entry with a note — it must not insert a producer whose own output is itself uncomputable from what feeds it, which would grow the DAG without reducing the open-blocker count.
