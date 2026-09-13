# GALAXY WORKFLOW REVIEW pipeline scenarios

Where a case can be pre-staged from a committed fixture, it binds the review
Mold's `examples/` directory by repo-relative path. The two harness-gate cases
have no artifact to bind — they are about what happens *before* any phase
produces anything — so they name their input in prose.

Nothing below has been walked. These are claims to test, not observations.

## Case: clean submission, green end to end

- fixture: `content/molds/review-galaxy-workflow/examples/clean-passing/`
- expect: all four phases execute in order, and the statuses phase 4 quotes are
  byte-equal to the ones phases 2 and 3 emitted **in this run**. The Mold's own
  case is judged against supplied artifacts; this one is judged against produced
  ones, which is the whole of the difference.

## Case: red validation, review continues

- fixture: `content/molds/review-galaxy-workflow/examples/failed-validation/`
- expect: phase 2 emits `status: fail` and phase 3 still runs. A journey that
  stops at phase 2 fails the case, and so does one where phase 4 works from
  anything other than the result phase 2 actually emitted.

## Case: red test evidence, review continues

- fixture: `content/molds/review-galaxy-workflow/examples/label-test-mismatch/`
- expect: phase 2 is green, so the red is phase 3's alone — and it does not end
  the journey either. A run that stops at phase 3 fails the case even though the
  submission is genuinely broken.

## Case: missing test, review continues

- fixture: `content/molds/review-galaxy-workflow/examples/missing-test/`
- expect: phase 3 hands on `status: test-definition-missing` rather than aborting,
  and phase 4 runs on it. The absence crosses the phase boundary as a result
  artifact; a journey that ends at phase 3 because nothing ran fails the case.

## Case: Planemo failure, modality survives the handoff

- fixture: `content/molds/review-galaxy-workflow/examples/planemo-failure/`
- expect: the `failure_modality` phase 4 cites is the one phase 3 emitted, not one
  re-derived by inspecting the workflow. Phase 3's classification is the only
  runtime evidence in the journey, so a review that regenerates it is unsourced
  even when it lands on the same answer.

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
