# Brief projection evaluation

## Property: explicit blockers stop projection

- check: deterministic
- assertion: The static readiness command rejects malformed inputs and reports content in either Blockers section. A blocked run produces no derived design input.

## Property: the brief is unchanged input

- check: deterministic
- assertion: The brief has identical bytes before and after the run, including on failure.

## Property: source evidence cannot widen selected scope

- check: llm-judged
- assertion: The derived summary carries approved scientific intent and provenance, excludes unselected source work, and preserves uncertainty without inventing Galaxy design choices.

## Property: workflow-run knowledge is classified and recommendations are separate from acceptance

- check: llm-judged
- assertion: Evidence is recorded as discoveries, authorized choices as decisions, missing actionable needs as obligations, and changes to expert intent as proposed brief-change recommendations in open-requirements.ledger.yml. The projection does not use it as a progress journal, edit the brief, or treat a recommendation as expert approval.
