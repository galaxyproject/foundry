# GALAXY WORKFLOW MATURATION pipeline scenarios

Concrete end-to-end journeys for the maturation pipeline, exercised against the
properties in `eval.md`. A pipeline scenario names the journey input **once**;
each phase's Mold oracle applies to that phase's output as the journey advances.

The fixtures are the ones [[mature-galaxy-workflow-for-iwc]] already ships, cited
by repo-relative path. They are committed, so a reviewer and CI can both reach
them — unlike `workflow-fixtures/`, which is generated and gitignored. Fixture
ownership stays with the Mold; nothing is copied into this directory.

## Case: missing publication metadata, no companion test

- fixture: `content/molds/mature-galaxy-workflow-for-iwc/examples/workflow-only/starting-galaxy-workflow.gxwf.yml`
- expect: with no companion test, summary, or context supplied, the journey still
  completes. Creator, license, and release values supplied as
  `iwc-publication-context` are written to the workflow and agree with the emitted
  README, CHANGELOG, and `.dockstore.yml`; values with no supplied evidence become
  `needs-user-input` with ledger entries rather than invented ones.
- expect: no `galaxy-workflow-test` is fabricated. Phase 3 validates the matured
  workflow; phase 4 reports "no test supplied" and the journey does not render
  that as a pass.

## Case: human-readable interface, test keys follow

- fixture: `content/molds/mature-galaxy-workflow-for-iwc/examples/label-cleanup/`
- expect: the machine-shaped input and output labels become human-readable in the
  workflow and in the supplied test **together**; phase 3 validates; phase 4 runs
  the updated test green with its original assertion intact.

## Case: safe generalization of a hard-coded sample path

- fixture: `content/molds/mature-galaxy-workflow-for-iwc/examples/safe-generalization/`
- expect: the literal sample path becomes an ordinary workflow input, the updated
  test supplies the same path, tool identity and the remaining `tool_state` are
  unchanged, and phase 4 stays green.

## Case: red phases are attributed, not smoothed over

- fixture: `content/molds/mature-galaxy-workflow-for-iwc/examples/safe-generalization/`
- expect: an observation case, not an injected fault — this fixture is
  synchronized and the journey is specified to keep it that way. *If* phase 3 or
  phase 4 comes back red on it, expect the validation and Planemo evidence to be
  returned intact, the phase-2 edit that touched the failing surface to be named,
  and no assertion to be removed or loosened to recover. A green run satisfies the
  case vacuously; a red run that hides the evidence fails it.

## Case: ambiguous reference strategy is escalated, not guessed

- fixture: `content/molds/mature-galaxy-workflow-for-iwc/examples/ambiguous-reference/starting-galaxy-workflow.gxwf.yml`
- expect: the built-in reference setting is left unchanged; the report records a
  `needs-user-input` item naming the portability decision required; phases 3 and 4
  still run and their evidence is retained.

## Case: documentation and packaging on an already-mature workflow

- fixture: `content/molds/mature-galaxy-workflow-for-iwc/examples/already-mature/`
- expect: little or no workflow diff; the supplied README and CHANGELOG are
  preserved except where consistency demands a change; the emitted `.dockstore.yml`
  addresses the emitted workflow and test; the report is complete, with `pass`
  items citing their evidence.
- expect: this case also carries the green-test half of the missing-metadata
  scenario — supplied metadata is written **and** phase 4 comes back green, which
  the test-less `workflow-only/` case cannot show.

## Tier maturity — what would gate the walk

Nothing here has been walked. This is a composition and its oracle, not a proven
journey; every expectation above is a claim to be tested, not an observation.
Three specific gaps:

1. **Phases 3 and 4 are outside the artifact graph.** Neither
   [[validate-galaxy-workflow]] nor [[run-workflow-test]] declares
   `input_artifacts`, so nothing machine-checkable binds them to phase 2's output.
   The binding lives in `harness_notes` and in `eval.md` property 2. Sibling
   galaxyproject/foundry#491 adds an *output* to [[validate-galaxy-workflow]], so
   it narrows the evidence gap but does not close this one.
2. **Two fixture gaps, both Mold-side.** No fixture forces a genuine regression —
   the red case above is an observation rather than an injected fault, pending a
   `regression/` example. And no fixture supplies an existing `.dockstore.yml`, so
   the "repair supplied Dockstore metadata" path is exercised on emission only.
3. **No `.ga` entry is bound.** All five committed fixtures are `.gxwf.yml`, so the
   normalization property is judged on a caller-supplied `.ga` rather than walked.

The near-term move is a first walk of the `already-mature` case — the one with the
most complete input — to see whether the checklist pass produces a clean report and
a green retest before harder fixtures are authored.
