# GALAXY WORKFLOW MATURATION pipeline scenarios

Concrete end-to-end journeys for the maturation pipeline, exercised against the
properties in `eval.md`. A pipeline scenario names the journey input **once**;
each phase's Mold oracle applies to that phase's output as the journey advances.

The fixtures are the ones [[mature-galaxy-workflow-for-iwc]] already ships, cited
by repo-relative path. They are committed, so a reviewer and CI can both reach
them — unlike `workflow-fixtures/`, which is generated and gitignored. Fixture
ownership stays with the Mold; nothing is copied into this directory.

They are also checklist-shaped skeletons rather than runnable workflows: empty
`steps`, empty `outputs`, and test jobs pointing at test data that does not exist.
That is the right shape for judging a checklist pass, and it is enough for phase 3
— `gxwf validate` passes on all five. It is not enough for phase 4. No case below
claims a green Planemo run, and none can be walked through phase 4 until test data
is authored.

## Case: missing publication metadata, no companion test

- fixture: `content/molds/mature-galaxy-workflow-for-iwc/examples/workflow-only/starting-galaxy-workflow.gxwf.yml`
- expect: with no companion test, summary, or context supplied, the journey still
  completes, and every creator, license, and release value becomes
  `needs-user-input` with a ledger entry rather than an invented one. When the
  caller does supply `iwc-publication-context`, those values are written to the
  workflow and agree with the emitted README, CHANGELOG, and `.dockstore.yml`.
- expect: the tutorial-specific label and "sample A" wording are replaced with
  descriptions usable on lab data, and the workflow label becomes human-readable.
- expect: no `galaxy-workflow-test` is fabricated. Phase 3 validates the matured
  workflow; phase 4 reports "no test supplied" and the journey does not render
  that as a pass.

## Case: human-readable interface, test keys follow

- fixture: `content/molds/mature-galaxy-workflow-for-iwc/examples/label-cleanup/`
- expect: the machine-shaped labels — `short_read_qc`, `raw_reads`,
  `multiqc_html_report` — become human-readable in the workflow and in the
  supplied test **together**, with the test's original assertion unchanged.
- expect: phase 3 validates the matured workflow. Phase 4 executes the updated
  test and its outcome is reported with its evidence; this fixture ships no test
  data, so a walk must supply it.

## Case: safe generalization of a hard-coded sample path

- fixture: `content/molds/mature-galaxy-workflow-for-iwc/examples/safe-generalization/`
- expect: the literal `/data/sample-A.fastq` in `tool_state` becomes an ordinary
  workflow input, the updated test supplies the same path, and tool identity and
  the remaining `tool_state` are unchanged.
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
- expect: the built-in reference setting (`reference_source_selector: cached`,
  `ref_file: hg38`) is left unchanged; the report records a `needs-user-input`
  item naming the portability decision required.
- expect: phase 3 validates the matured workflow and its evidence is retained.
  This fixture ships no test, so phase 4 reports the absence rather than a pass.

## Case: documentation and packaging on an already-mature workflow

- fixture: `content/molds/mature-galaxy-workflow-for-iwc/examples/already-mature/`
- expect: little or no workflow diff; the supplied README and CHANGELOG are
  preserved except where consistency demands a change; the emitted `.dockstore.yml`
  addresses the emitted workflow and test; the report is complete, with `pass`
  items citing their evidence.
- expect: this is also the case that carries the green-test half of the
  missing-metadata scenario — supplied metadata is written **and** phase 4
  executes a real test rather than reporting an absence, which the test-less
  `workflow-only/` case cannot show. Reaching a *green* phase 4 additionally
  requires test data this fixture does not ship.

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
