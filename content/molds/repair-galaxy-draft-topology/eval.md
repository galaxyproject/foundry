# repair-galaxy-draft-topology eval

The **abstract oracle** for `repair-galaxy-draft-topology`: properties any repair
must satisfy, independent of which blocked draft it ran on. The draft shapes that
stress them, and what each is expected to yield, live in `scenarios.md`; the
oracle here applies to whatever a scenario produces.

## Property: every addressed blocking entry is closed or surrendered

- check: deterministic
- assertion: each blocking entry the repair claims to address ends `resolved` with
  a note on how (producer added, sub-path added, output narrowed) or `surrendered`
  with a note on why. No entry is left `open` while the Mold reports the region
  repaired, and the ledger's open-blocker count strictly decreases. Catches the
  spin-or-fabricate failure the escalation exists to prevent.

## Property: inserted steps are draft-tier, not fabricated

- check: deterministic
- assertion: every step the repair adds carries wrapper-tier `TODO` for `tool_id`
  and ports plus `_plan_*` intent. No added step names a concrete `tool_id`,
  `tool_version`, or Tool Shed repository — wrapper resolution belongs to the
  downstream discover-or-author → implement machinery. A fabricated concrete tool
  id is a fail.

## Property: the repair stays local

- check: llm-judged
- assertion: the repair touches only the blocked region. Already-realized steps,
  the workflow interface, and unrelated edges are not silently re-settled or
  contradicted. Adding and rewiring inside the blocked region is expected;
  rewriting the surrounding workflow is not.

## Property: no convergence-defeating producer

- check: llm-judged
- assertion: every inserted producer's own output is computable from what feeds
  it. Where the missing evidence has no producer in reach, the Mold narrows the
  declared output to what its inputs honestly support or surrenders the entry with
  a note — it does not insert a producer that grows the DAG without reducing the
  open-blocker count.

## Property: the re-wired draft stays loop-consumable

- check: deterministic
- assertion: the emitted draft validates against [[galaxy-workflow-draft]] and
  stays inside the draft superset the per-step loop expects, so the loop resumes
  on it without re-running the template Mold over the whole workflow.
