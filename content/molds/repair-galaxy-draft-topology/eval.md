# repair-galaxy-draft-topology eval

## Property: every addressed entry is closed or left open with a note

- check: deterministic
- assertion: each blocking entry the repair addresses ends `resolved`, with a note
  naming the change-set kinds applied, or stays `open` with a note saying why.
  The Mold never sets `surrendered`, because that status belongs to the terminal.
  The open blocking-entry count falls across the repair unless the repair reports
  that none of the entries could be closed.

## Property: added steps are draft-tier or copied

- check: deterministic
- assertion: every step the repair adds carries wrapper-tier `TODO` for `tool_id`
  and ports plus `_plan_*` intent. A concrete `tool_id` on an added step appears
  only when it is copied, with its `state`, from a realized step in the same
  draft. A fabricated concrete tool id is a fail.

## Property: the repair stays local

- check: llm-judged
- assertion: the workflow interface and realized steps change only where a named
  entry requires it. Unrelated edges, labels, `doc` and `state` are not re-settled
  or tidied.

## Property: a narrowing is recorded

- check: llm-judged
- assertion: a removed public input or output, or cut source work, has a
  `kind: dropped` entry from this repair, with `units` and a `because` that quotes
  a primary artifact. A `because` that only names the blocking entry, rests on a
  tool version missing from a local cache, or needs an uncited claim for the
  removal to follow, fails.

## Property: a removal needs standing

- check: llm-judged
- assertion: no step is removed when a consumer truly needs its output, when the
  step is realized, or when the removal doesn't follow from what the repair can
  quote. The entry stays `open` with a note saying what's unproven, and no
  `kind: dropped` entry is appended for it.

## Property: a removal leaves nothing dead or stale

- check: llm-judged
- assertion: after a removal, no workflow input or step exists only to feed the
  removed step, and an input read only by a `${label}` in an `out:` `rename` stays.
  No `doc`, `_plan_*` or comment frame mentions its id or label, no `doc` promises
  what it supplied, and a `rename` or `change_datatype` it carried for its consumers
  has moved to the step that inherits them.

## Property: no claim about an unresolved step in doc

- check: llm-judged
- assertion: no `doc` states what a step with no resolved wrapper produces or
  guarantees beyond its plan. Such a claim sits in a ledger entry with `step:` set.

## Property: no convergence-defeating producer

- check: llm-judged
- assertion: every inserted producer's own output is computable from what feeds
  it, and no new producer answers an entry against a step an earlier repair
  inserted. Where nothing can close an entry, the Mold removes the step with a
  recorded drop or leaves the entry `open` with a note, and doesn't grow the DAG.

## Property: the edited draft stays loop-consumable

- check: deterministic
- assertion: `gxwf draft-validate` exits 0 on the emitted draft, with
  `--concrete --strict-state` when the repair edited a realized step, so the loop
  resumes on it without re-running the template Mold over the whole workflow.
