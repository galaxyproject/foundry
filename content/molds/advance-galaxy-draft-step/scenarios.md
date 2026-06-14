# advance-galaxy-draft-step scenarios

Concrete cases for `advance-galaxy-draft-step`, exercised against the abstract
properties in `eval.md`. Each case binds a fixture and states its expected
values; the `eval.md` oracle is applied to whatever the case produces. Fixtures
live under `examples/`; the MVP fixture is `brew3r-1step-degraded/` — the IWC
`transcriptomics/brew3r/BREW3R` workflow with its `merge assembled transcripts`
(StringTie merge) step hand-degraded to draft form, plus `expected.gxwf.yml` as
the round-trip oracle. See that directory's `README.md`.

## Case: draft-next-step picks the degraded step

- fixture: `examples/brew3r-1step-degraded/draft.gxwf.yml`
- command: `gxwf draft-next-step draft.gxwf.yml`
- expect: `draft: true`; `step` equals `["merge assembled transcripts"]` (the
  only drafty step); `work` lists the `TODO[tool_id]` and
  `TODO[out.TODO_merged_gtf]` sentinels followed by the four `_plan_*` fields.

## Case: terminal draft: false on the concrete oracle

- fixture: `examples/brew3r-1step-degraded/expected.gxwf.yml`
- command: `gxwf draft-next-step expected.gxwf.yml`
- expect: output is exactly `{ "draft": false }` — no `step`, no `work`. The
  oracle is `class: GalaxyWorkflow`, so the picker must report the loop done.

## Case: degraded draft validates clean before implementation

- fixture: `examples/brew3r-1step-degraded/draft.gxwf.yml`
- command: `gxwf draft-validate draft.gxwf.yml --concrete`
- expect: exit 0 — `draft valid`, and `Concrete: OK` over the concrete subset
  (the steps that don't depend on the drafty `merge assembled transcripts`
  step).

## Case: extract yields the maximal concrete prefix

- fixture: `examples/brew3r-1step-degraded/draft.gxwf.yml`
- command: `gxwf draft-extract draft.gxwf.yml`
- expect: result is `class: GalaxyWorkflow` with all `_plan_*` stripped; it omits
  both `merge assembled transcripts` (drafty) **and** `BREW3R.r` (its
  dependent), and `outputs` is empty (the `extended_gtf` output sourced from the
  dropped `BREW3R.r`).

## Case: single iteration advances exactly one of several drafty steps

- fixture: a draft with **two or more** drafty tool steps and a fully concrete
  topology. (The current `brew3r-1step-degraded` fixture has a single drafty
  step, so it proves advance-then-terminate but not one-of-several; a
  multi-drafty-step fixture is still TODO.)
- expect: one invocation of the cast skill advances the `draft-next-step` pick —
  resolves a wrapper, implements that one step, runs `draft-validate`
  `--concrete` — and leaves every other drafty step untouched.

## Case: implemented step leaves no TODO sentinel behind

- fixture: `examples/brew3r-1step-degraded/draft.gxwf.yml`
- expect: after the cast skill implements `merge assembled transcripts`, the
  mutated draft contains **no** `TODO` / `TODO_*` token — `tool_id` is concrete,
  the output port is renamed from `TODO_merged_gtf` to the wrapper's real name,
  and `BREW3R.r`'s `gtf_to_overlap` source is repointed to that real name (no
  dangling `TODO_` reference). `grep -c TODO` on the result is 0. A fabricated
  `tool_id` or an invented output port that doesn't match the resolved wrapper's
  summary is a failure.

## Case: round-trip equivalence to the oracle

- fixture: `examples/brew3r-1step-degraded/` (`draft.gxwf.yml` → orchestrator →
  `gxwf draft-extract`; oracle `expected.gxwf.yml`)
- expect: the extracted, class-promoted result is structurally equivalent to
  `expected.gxwf.yml` modulo the deltas listed in the fixture README's
  *Round-trip property* (tool_version / changeset drift, defensible `tool_state`
  values, `hide` / `rename` UI choices, and the `unique_tools:` export block).
  The implemented wrapper should be the IUC `stringtie_merge` suite tool; a
  structurally different merge tool is acceptable only if it satisfies the step's
  `_plan_*` contract.
