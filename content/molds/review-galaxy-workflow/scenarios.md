# review-galaxy-workflow scenarios

Concrete cases run against the properties in `eval.md`. Each `examples/<case>/`
directory carries the artifacts this Mold declares as required inputs, at their
declared filenames — `starting-galaxy-workflow.gxwf.yml`,
`summary-galaxy-workflow.json`, `galaxy-workflow-validation-result.json`,
`workflow-test-result.json` — plus the optional ones the case needs.

A case whose expectation depends on a repository-level checklist item also
carries the companions that item reads — `.dockstore.yml`, `README.md`,
`CHANGELOG.md`, and a `galaxy-workflow-pr-context.json` — because an item whose
evidence was never supplied must stay `unverified`, and a fixture that withholds
it cannot be used to demand a verdict it makes unreachable.

The fixtures are committed and hand-written rather than drawn from
`workflow-fixtures/iwc-*`, which is generated and gitignored: a fixture a reviewer
or CI cannot reach is not evidence. They are hand-authored, not harvested from a
real run — nothing here has been walked yet.

## Case: clean workflow with passing tests

- fixture: `content/molds/review-galaxy-workflow/examples/clean-passing/`
- expect: every applicable checklist item is `pass` or `not applicable`, each with
  evidence; the advisory recommendation is `approve`; the review invents no
  finding to justify its own existence.
- expect: the validation and Planemo statuses quoted in the review equal the ones
  in the supplied result artifacts, verbatim.

## Case: output label and test key disagree

- fixture: `content/molds/review-galaxy-workflow/examples/label-test-mismatch/`
- expect: one `needs attention` item naming both the workflow output label and the
  test key that fails to address it, listed under required fixes rather than
  optional improvements.
- expect: the finding is grounded as an interface defect, not a naming preference.

## Case: hard-coded sample value

- fixture: `content/molds/review-galaxy-workflow/examples/hardcoded-sample-value/`
- expect: a genericity finding citing the literal value's file and the
  `steps[].tool_state` field that carries it, with an explicit classification as
  required or optional rather than an unplaced remark.

## Case: no test file in the submission

- fixture: `content/molds/review-galaxy-workflow/examples/missing-test/`
- expect: the review completes. The test item is a finding citing
  `status: test-definition-missing` from the supplied result; nothing claims a
  passing test; the recommendation is not `approve`.

## Case: structural validation failed

- fixture: `content/molds/review-galaxy-workflow/examples/failed-validation/`
- expect: the review quotes `status: fail` from the supplied validation result and
  raises its diagnostic as a required fix. The Planemo result is green, so nothing
  in the review converts the structural failure into a runtime one, and the
  recommendation is not `approve`.

## Case: Planemo failure cited accurately

- fixture: `content/molds/review-galaxy-workflow/examples/planemo-failure/`
- expect: the review quotes the failing result's status and observed modality
  rather than diagnosing the failure from inspection, and does not convert a
  runtime failure into a structural finding it has no evidence for.

## Case: workflow with Foundry context

- fixture: `content/molds/review-galaxy-workflow/examples/with-foundry-context/`
- expect: a clearly labeled Foundry context section reporting the ledger's open
  and surrendered entries and the supplied comparison notes, kept separate from
  the IWC checklist verdicts.

## Case: the same workflow without Foundry context

- fixture: `content/molds/review-galaxy-workflow/examples/clean-passing/`
- expect: the submission remains fully reviewable; the Foundry context section is
  omitted or explicitly stated as not supplied; **the IWC checklist verdicts are
  identical to the with-context case.** A verdict that moves when provenance
  appears or disappears fails the additive-context property.
