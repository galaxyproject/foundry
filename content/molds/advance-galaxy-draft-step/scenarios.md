# advance-galaxy-draft-step scenarios

Fixtures live under `examples/`; the MVP fixture is `brew3r-1step-degraded/` —
the IWC `transcriptomics/brew3r/BREW3R` workflow with its
`merge assembled transcripts`
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
  *Round-trip property* (tool_version / changeset drift, defensible `state`
  values, `hide` / `rename` UI choices, and the `unique_tools:` export block).
  The implemented wrapper should be the IUC `stringtie_merge` suite tool; a
  structurally different merge tool is acceptable only if it satisfies the step's
  `_plan_*` contract.

## Case: an empty offline cache fails strict state validation

- fixture: `examples/brew3r-1step-degraded/draft.gxwf.yml`; an empty cache directory.
- command: `gxwf draft-validate draft.gxwf.yml --concrete --strict-state --json --offline --cache-dir <empty-dir>`
- expect: exit 1; `concrete.strict_state_errors` names skipped tool-state checks
  and `concrete.ok` is false. Draft structure and topology checks still pass.
  Without `--strict-state`, the same offline command exits 0 despite the skips.

## Case: entry on the picked step that holds only misses

- fixture: `../repair-galaxy-draft-topology/examples/sample-sheet-restore-last-drafty/galaxy-workflow-draft.gxwf.yml`
  and `open-requirements.ledger.yml` beside it.
- expect: the entry's Tool Shed misses and cache miss don't skip steps 2-4. Starting
  from `open_history: [0]` with 2 open blocking entries, a repair that leaves 1 gives
  `[0, 1]` and doesn't trip the gate. If the call ends with no drafty step, by an
  authored wrapper or a cited removal, `galaxy-workflow.gxwf.yml` is written in the
  same call (`class: GalaxyWorkflow`, no `_plan_*`). `nf-core-demo-fastqc-zip-output-unavailable`,
  on realized `fastqc_per_read`, goes to repair before that extract.

## Case: entry that records the wrapper as confirmed absent

- fixture: `../repair-galaxy-draft-topology/examples/dupradar-wrapper-absent/galaxy-workflow-draft.gxwf.yml`
  and `open-requirements.ledger.yml` beside it.
- expect: the call that picks `M19_dupradar`, once `M18_markdup` is realized, goes
  straight to [[repair-galaxy-draft-topology]] with no new search.

## Case: a realized step's source arguments all have a record

- fixture: a draft whose picked step translates nf-core/bamtofastq's
  `COLLATE_FASTQ_MAP` and carries `_plan_state.resolved_args` for `args`,
  `args2`, and `prefix` from `conf/modules.config`.
- expect: before [[draft-validate]] runs, the ledger covers each of `args`'s
  `-f` and `-r` (both set only when `params.samtools_collate_fast`),
  `args2`'s `-N`, and the `prefix` exactly once, in records naming the step in
  `source_arg`. A call that implements the step without them goes back to
  implementation.

## Case: the first call snapshots the draft, the first extract the workflow

- fixture: `examples/brew3r-1step-degraded/draft.gxwf.yml`, with no snapshot
  files beside it.
- expect: the call that implements `merge assembled transcripts` first writes
  `galaxy-workflow-draft.snapshot.gxwf.yml` byte-identical to `draft.gxwf.yml`,
  with all four of that step's `_plan_*` fields. That call leaves no drafty step,
  so it extracts, and `galaxy-workflow.extracted.gxwf.yml` is byte-identical to
  the `galaxy-workflow.gxwf.yml` it writes. A second extract over an edited
  workflow leaves both snapshots unchanged.
