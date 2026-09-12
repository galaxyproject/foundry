# GALAXY WORKFLOW REVIEW pipeline scenarios

Concrete end-to-end journeys, exercised against the properties in `eval.md`. A
pipeline scenario names the journey input **once**; each phase's Mold oracle
applies to that phase's output as the journey advances.

Where a case can be pre-staged from a committed fixture, it binds the review
Mold's `examples/` directory by repo-relative path. The two harness-gate cases
have no artifact to bind — they are about what happens *before* any phase
produces anything — so they name their input in prose.

Nothing below has been walked. These are claims to test, not observations.

## Case: clean submission, green end to end

- fixture: `content/molds/review-galaxy-workflow/examples/clean-passing/`
- expect: all four phases run; the review cites `status: pass` from both the
  validation and test results, byte-equal to what phases 2 and 3 emitted; the
  advisory recommendation is `approve`.

## Case: red validation, review continues

- fixture: `content/molds/review-galaxy-workflow/examples/label-test-mismatch/`
- expect: the failing evidence does not end the journey. Phase 4 runs, quotes the
  failing status, and raises the label/test disagreement as a required fix. A run
  that stops at phase 3 fails the case even though the submission is genuinely
  broken.

## Case: missing test, review continues

- fixture: `content/molds/review-galaxy-workflow/examples/missing-test/`
- expect: phase 3 hands on `status: test-definition-missing` rather than
  aborting; phase 4 produces a complete review whose test item is a finding citing
  that status; no output reads as though tests passed; the recommendation is not
  `approve`.

## Case: Planemo failure, cited not diagnosed

- fixture: `content/molds/review-galaxy-workflow/examples/planemo-failure/`
- expect: the review quotes the failing status and the observed modality from the
  test result, and does not convert a runtime failure into a structural finding it
  has no evidence for.

## Case: worktree SHA does not match the reviewed head

- fixture: a pull request whose reviewed head SHA differs from the commit checked
  out in the local worktree, with everything else well-formed.
- expect: the run stops before phase 3. No Planemo execution occurs and no test
  evidence is produced. The stop names both SHAs.

## Case: checkout not confirmed as trusted

- fixture: a well-formed pull request and a matching worktree, invoked without the
  caller's explicit trust confirmation.
- expect: the run stops before phase 3 rather than defaulting to trusted. Phases 1
  and 2 may have produced their artifacts; phase 3 produces none.

## Tier maturity — what would gate the walk

1. **Nothing has been run.** No phase has executed end to end, no eval property
   has ever been scored, and every fixture under
   `content/molds/review-galaxy-workflow/examples/` is hand-authored rather than
   harvested from a real run. The issue's own task — exercise this on at least one
   real IWC or IWC-Lab pull request — is the next move, and the two harness-gate
   cases above can only be walked there.
2. **The policy pin is proposed, not accepted.** galaxyproject/iwc#1366 is still
   open, so the vendored review command is a proposed revision. See
   [[workflow-pr-review-command]] §Provenance and acceptance status.
3. **`galaxy-workflow-pr-context` has no producer.** Pull-request context is
   harness-supplied with no Mold behind it, so the two gate cases are checked by
   this oracle rather than by the artifact graph.
