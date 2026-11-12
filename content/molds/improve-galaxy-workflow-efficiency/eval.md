# improve-galaxy-workflow-efficiency eval

Abstract oracle for the efficiency change-set. Fixture-bound cases live in `scenarios.md`.

## Property: every proposed edit traces to a documented lever

- check: llm-judged
- assertion: each change-set entry names the row or rule of a referenced note
  that justifies it, and the edit does what that row says. An entry that rests
  on the agent's own sense of what is slow, a version bump, or tidying is a
  failure.

## Property: no matching step is silently skipped

- check: deterministic
- assertion: every step whose `tool_id` matches a substitution-table row
  appears either as a `replace-tool` entry or in the summary's list of kept
  steps with a named opt-out, and has exactly one ledger decision. A matching
  step absent from both is a failure.

## Property: a replacement is pinned by exact identity

- check: deterministic
- assertion: every `replace-tool` entry names the replacement's exact `tool_id`
  from the table, with no version or changeset. An entry naming the replacement
  by free text, or by a different owner's wrapper, is a failure.

## Property: an opt-out the summary shows keeps the original

- check: llm-judged
- assertion: when the summary shows a row's opt-out condition for a step, in an
  input format, a setting, a downstream consumer, or a test assertion, the step
  is kept and the opt-out is named. Swapping despite a visible opt-out is a
  failure. An unsettled condition is named in the entry's intent and on the
  ledger, never presented as checked.

## Property: entries are anchored and consumable unchanged

- check: llm-judged
- assertion: each entry anchors to a step label present in the
  [[summary-galaxy-workflow]] and uses the entry format of
  [[interview-to-galaxy-workflow-changeset]], so [[apply-galaxy-workflow-changeset]]
  and [[changeset-to-galaxy-test-plan]] can consume it without reinterpretation.

## Property: affected test assertions are named

- check: llm-judged
- assertion: when the summary carries a test assertion on a swapped step's
  output that the row's test guidance says the replacement breaks, the entry's
  acceptance names it. A swap whose broken assertion first surfaces as a test
  failure is a failure of this Mold.

## Property: a workflow with nothing to change yields an empty change-set

- check: deterministic
- assertion: when no step matches a lever, the change-set has no entries, its
  summary names the levers consulted, and the workflow is not edited.
