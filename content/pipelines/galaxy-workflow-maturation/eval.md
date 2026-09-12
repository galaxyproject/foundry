# GALAXY WORKFLOW MATURATION pipeline eval

Pipeline-level oracle for the maturation journey. This judges the **end-to-end**
and **cross-phase** properties no single Mold owns; each member Mold's own
`eval.md` still applies to its phase's output (composition). In particular, the
checklist's own completeness, evidence-boundedness, and downstream-boundary
claims belong to `content/molds/mature-galaxy-workflow-for-iwc/eval.md` and are
not restated here. What this file does own of that territory is the cross-phase
half: whether an edit made at phase 2 survives to phase 4 intact. Properties are
abstract — concrete journeys live in `scenarios.md`.

## Property: starting-format normalization is lossless

- check: deterministic
- assertion: when the journey is entered with a native `.ga` workflow, the
  gxformat2 produced by [[summarize-galaxy-workflow]] carries the same steps,
  connections, workflow inputs, workflow outputs, and tool parameter values as
  the source; nothing is dropped or silently defaulted. Every subsequent
  checklist status, diff, and report citation is stated against that normalized
  baseline rather than the `.ga` original, so an edit attributed to the checklist
  is never an artifact of conversion. No committed fixture is `.ga` today, so this
  property is judged on a caller-supplied `.ga` entry rather than bound to a case.

## Property: the matured workflow is actually validated and actually run

- check: deterministic
- assertion: when a workflow test exists — supplied by the caller or emitted by
  phase 2 — phase 3 runs terminal validation on the **phase-2 output** (not the
  entry workflow) and phase 4 executes that test file, and the journey reports
  both outcomes. Skipping either while a test exists is a failed journey, not a
  quiet pass. When no test was supplied, phase 4 reports the absence; an absent
  test is never rendered as a passing test.

## Property: label edits survive the phase boundary

- check: deterministic
- assertion: every workflow input, promoted output, or `workflow_outputs` label
  phase 2 renamed is addressed by the same key in the test file phase 4 runs. An
  orphaned key that first surfaces as a phase-4 error is a phase-2 failure, not a
  test failure — the journey must attribute it that way.

## Property: red evidence is retained and attributed across phases

- check: deterministic + llm-judged
- assertion: when phase 3 or phase 4 comes back red, the journey still returns the
  validation diagnostics and Planemo evidence, and names the phase-2 checklist
  changes most likely responsible. Evidence discarded, summarized away, or
  replaced by a clean-looking report is a failure regardless of what the report
  says.

## Property: no assertion is weakened to reach green

- check: llm-judged
- assertion: the test file phase 4 ran differs from the one supplied to phase 2
  only by the key renames property 3 requires. No assertion is removed or
  loosened on the way across that boundary, and no expected output is
  manufactured. A red phase 4 stays red.

## Property: regression against a prior baseline is named

- check: deterministic
- assertion: when the caller supplied a prior green `workflow-test-result`, a red
  phase-4 result is reported as a regression against it — not as a first
  observation — and the report identifies which surface changed. When no prior
  result was supplied, the phase-4 outcome is stated as the new baseline rather
  than compared to nothing.
