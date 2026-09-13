# GALAXY WORKFLOW MATURATION pipeline scenarios

The fixtures are the ones [[mature-galaxy-workflow-for-iwc]] already ships, cited
by repo-relative path. Fixture ownership stays with the Mold; nothing is copied
into this directory.

They are checklist-shaped skeletons rather than runnable workflows: empty
`steps`, empty `outputs`, and test jobs pointing at test data that does not exist.
That is the right shape for judging a checklist pass, and it is enough for phase 3
— `gxwf validate` passes on all five. It is not enough for phase 4. No case below
claims a green Planemo run, and none can be walked through phase 4 until test data
is authored.

## Case: missing publication metadata, no companion test

- fixture: `content/molds/mature-galaxy-workflow-for-iwc/examples/workflow-only/starting-galaxy-workflow.gxwf.yml`
- expect: no `galaxy-workflow-test` is fabricated to give phase 4 something to
  run. Phase 3 validates the matured workflow; phase 4 reports "no test supplied"
  and the journey does not render that as a pass.

## Case: human-readable interface, test keys follow

- fixture: `content/molds/mature-galaxy-workflow-for-iwc/examples/label-cleanup/`
- expect: every key phase 2 renames is addressed by the same key in the test
  phase 4 runs; an orphaned key surfacing as a phase-4 error is attributed to
  phase 2, not reported as a test failure.
- expect: phase 3 validates the matured workflow. Phase 4 executes the updated
  test and its outcome is reported with its evidence; this fixture ships no test
  data, so a walk must supply it.

## Case: safe generalization of a hard-coded sample path

- fixture: `content/molds/mature-galaxy-workflow-for-iwc/examples/safe-generalization/`
- expect: the workflow input phase 2 introduces in place of the literal path is
  addressed by the test phase 4 runs, supplying the same path — the same
  cross-phase survival as the label case, on an added input rather than a rename.
- expect: phase 3 validates; phase 4's outcome is reported with its evidence.

## Case: red phases are attributed, not smoothed over

- fixture: `content/molds/mature-galaxy-workflow-for-iwc/examples/safe-generalization/`
- expect: an observation case, not an injected fault — this fixture is
  synchronized and the journey is specified to keep it that way. *If* phase 3 or
  phase 4 comes back red on it, expect the validation and Planemo evidence to be
  returned intact, the phase-2 edit that touched the failing surface to be named,
  and no assertion to be removed or loosened to recover. A clean run satisfies the
  case vacuously; a red run that hides the evidence fails it.

## Case: ambiguous reference strategy is escalated, not guessed

- fixture: `content/molds/mature-galaxy-workflow-for-iwc/examples/ambiguous-reference/starting-galaxy-workflow.gxwf.yml`
- expect: the portability decision phase 2 leaves open is still reported as open
  after phases 3 and 4 — a clean validation is not reported as having resolved
  it. This fixture ships no test, so phase 4 reports the absence rather than a
  pass.

## Case: documentation and packaging on an already-mature workflow

- fixture: `content/molds/mature-galaxy-workflow-for-iwc/examples/already-mature/`
- expect: this is the case that carries the green-test half of the journey —
  supplied metadata is written **and** phase 4 executes a real test rather than
  reporting an absence, which the test-less `workflow-only/` case cannot show.
  Reaching a *green* phase 4 additionally requires test data this fixture does
  not ship.

## Tier maturity — what would gate the walk

Nothing here has been walked. This is a composition and its oracle, not a proven
journey; every expectation above is a claim to be tested, not an observation.
Four specific gaps:

1. **The fixtures cannot reach phase 4.** They are checklist skeletons with empty
   `steps` and `outputs` and no test data, so nothing executes even where a test
   file is present. Authoring runnable test data — or pointing a case at a real
   IWC workflow — is the precondition for any end-to-end walk.
2. **Phases 3 and 4 are outside the artifact graph.** Neither
   [[validate-galaxy-workflow]] nor [[run-workflow-test]] declares
   `input_artifacts`, so nothing machine-checkable binds them to phase 2's output.
   The binding lives in `harness_notes` and in `eval.md` property 2. Sibling
   galaxyproject/foundry#491 adds an *output* to [[validate-galaxy-workflow]], so
   it narrows the evidence gap but does not close this one.
3. **Two fixture gaps, both Mold-side.** No fixture forces a genuine regression —
   the red case above is an observation rather than an injected fault, pending a
   `regression/` example. And no fixture supplies an existing `.dockstore.yml`, so
   the "repair supplied Dockstore metadata" path is exercised on emission only.
4. **No `.ga` entry is bound.** All five committed fixtures are `.gxwf.yml`, so the
   normalization property is judged on a caller-supplied `.ga` rather than walked.

The near-term move is a phase-1-to-phase-3 walk of the `already-mature` case — the
one with the most complete input — to see whether the checklist pass produces a
clean report and a workflow that still validates. Phase 4 waits on gap 1.
