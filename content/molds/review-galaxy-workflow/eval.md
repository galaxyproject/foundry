# review-galaxy-workflow eval

Abstract oracle for one review. Fixture-independent: every property below states
something that could fail for any submission, and the concrete cases live in
`scenarios.md`.

Most checks here are `llm-judged` on purpose. A `deterministic` check is one that
is actually run by a mechanical oracle — emulating one is not a weaker pass, it is
no evaluation at all — and the review is Markdown with no schema, so only file
presence and closed-set string membership have a real oracle to run.

## Property: evidence is cited, never asserted

- check: llm-judged
- assertion: every claim the review makes about structural validity or test
  outcome traces to the supplied `galaxy-workflow-validation-result` or
  `workflow-test-result`. The review never states a pass those artifacts do not
  state, and never presents a conclusion drawn from reading the workflow as
  though it were a run result.

## Property: unavailable evidence stays unverified

- check: llm-judged
- assertion: a checklist item the supplied evidence cannot answer is marked
  `unverified` and is never promoted to `pass` or quietly reclassified as
  `not applicable`. Silence about an unanswerable item is the failure mode this
  guards — the item must appear.

## Property: missing or failed tests are findings, not blockers

- check: llm-judged
- assertion: a `test-definition-missing`, `not-run`, or failing
  `workflow-test-result` yields a complete review carrying an honest finding —
  never an abort, and never an output that reads as though tests passed.

## Property: no checklist item disappears

- check: llm-judged
- assertion: every applicable item of the bundled review command is present in the
  output carrying exactly one status from the closed set, with its evidence. An
  item that is hard to judge must surface as `unverified`; an item absent from the
  review is a failure even when the submission would have passed it.

## Property: the reviewed descriptor is named, and is the right one

- check: llm-judged
- assertion: the review states which repository profile it applied and which file
  it reviewed as the primary descriptor. Under IWC that is the native descriptor;
  under IWC-Lab it is the one the submission's Dockstore metadata names, which may
  be gxformat2. Reviewing a companion or secondary file while presenting it as the
  primary descriptor is a failure, and so is leaving the profile unstated when the
  metadata was absent.

## Property: Foundry context is additive

- check: llm-judged
- assertion: the review's IWC verdicts are unchanged by the presence or absence of
  Foundry provenance artifacts. Absence never becomes an IWC finding, and presence
  never relaxes an IWC finding.

## Property: no re-derivation

- check: llm-judged
- assertion: the review does not re-extract facts the supplied summary already
  carries, and does not rerun structural validation, Planemo, or the IWC-exemplar
  comparison. Reaching past a declared input is a failure even when the re-derived
  answer agrees.

## Property: prompt provenance is reported and not overreached

- check: llm-judged
- assertion: the review names the pinned upstream prompt resource and the
  provenance record it was cast from, and makes no claim that upstream policy has
  moved past that pin. A correctly pinned cast is never described as stale.

## Property: the verdict is separated and singular

- check: deterministic
- assertion: required fixes, optional improvements, and unavailable evidence
  appear as distinct sections, and exactly one advisory recommendation from
  `approve` / `request changes` / `needs discussion` is present. Two
  recommendations, none, or a value outside the set is a failure. Collapsing
  required and optional into one list is a failure even when every finding is
  individually correct.

## Property: read-only

- check: deterministic
- assertion: the run emits `galaxy-workflow-review.md` and no other artifact, and
  performs no GitHub mutation, workflow edit, test edit, or approval. A review
  that *claims* to have approved, commented, or merged fails this property even if
  nothing actually happened.
