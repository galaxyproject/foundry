# repair-galaxy-draft-topology scenarios

Concrete cases for `repair-galaxy-draft-topology`, exercised against the abstract
properties in `eval.md`. Each case binds a blocked-draft shape and states what it
should yield; the oracle applies to whatever the case produces. No fixtures are
materialized under `examples/` yet — each case describes the draft and ledger
pair to build.

## Case: blocked step with a reachable producer

- fixture: a draft with a step whose declared output needs evidence no wired input
  carries, plus an `open-requirements-ledger` carrying the matching `open`
  blocking entry. The missing evidence has an obvious producer (a computed column,
  a collection reshape) in reach.
- expect: the blocking entry ends `resolved` with a note naming the producer
  added; the open-blocker count drops by one; the inserted step carries
  `TODO[tool_id]` and `_plan_*` and no Tool Shed owner/repo/revision.

## Case: repair inside an otherwise realized draft

- fixture: a draft where one region is blocked but the rest is already realized —
  concrete tool steps, settled workflow interface — with the ledger naming only
  the blocked region.
- expect: the diff is confined to the blocked region and the edges joining it to
  its neighbours. Realized `tool_id` / `tool_version` values, workflow inputs and
  outputs, and unrelated edges are byte-identical.

## Case: no producer in reach

- fixture: a blocking entry whose missing evidence has no producer available — for
  example SCCmec cassette evidence with no typing tool in the corpus.
- expect: the declared output is narrowed to what its inputs support, or the entry
  is left `open` with a surrender note for the terminal path to write out as a
  labelled gap. No new step is inserted whose own inputs cannot supply its output.

## Case: repaired draft re-enters the per-step loop

- fixture: the output of any of the cases above, fed back to
  [[advance-galaxy-draft-step]].
- expect: the draft validates against [[galaxy-workflow-draft]], and the picker
  reports `draft: true` naming an inserted step — the loop resumes without the
  template Mold re-running over the whole workflow.
