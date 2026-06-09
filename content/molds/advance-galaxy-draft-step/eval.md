# advance-galaxy-draft-step eval

Fixtures live under `examples/`. The MVP fixture is `brew3r-1step-degraded/` — the IWC `transcriptomics/brew3r/BREW3R` workflow with its `merge assembled transcripts` (StringTie merge) step hand-degraded to draft form, plus `expected.gxwf.yml` as the round-trip oracle. See that directory's `README.md`.

## Case: draft-next-step picks the degraded step (deterministic)

- check: deterministic
- fixture: `examples/brew3r-1step-degraded/draft.gxwf.yml`
- command: `gxwf draft-next-step draft.gxwf.yml`
- expectation: `draft: true`; `step` equals `["merge assembled transcripts"]` (the only drafty step); `work` lists the `TODO[tool_id]` and `TODO[out.TODO_merged_gtf]` sentinels followed by the four `_plan_*` fields. Fails if a different step is picked, if the pick is non-deterministic across runs, or if `work` drops the sentinels/plan.

## Case: terminal draft: false on the concrete oracle (deterministic)

- check: deterministic
- fixture: `examples/brew3r-1step-degraded/expected.gxwf.yml`
- command: `gxwf draft-next-step expected.gxwf.yml`
- expectation: output is exactly `{ "draft": false }` — no `step`, no `work`. The oracle is `class: GalaxyWorkflow`, so the picker must report the loop done. Guards against the orchestrator looping forever on an already-concrete workflow.

## Case: degraded draft validates clean before implementation (deterministic)

- check: deterministic
- fixture: `examples/brew3r-1step-degraded/draft.gxwf.yml`
- command: `gxwf draft-validate draft.gxwf.yml --concrete`
- expectation: exit 0 — `draft valid`, and `Concrete: OK` over the concrete subset (the steps that don't depend on the drafty one). Validation philosophy: a well-formed draft with `TODO_*`/`_plan_*` still pending must pass; the drafty step is excluded from the concrete projection, not treated as malformed. Fails if pending sentinels make `draft-validate` error.

## Case: extract yields the maximal concrete prefix, not the whole workflow (deterministic)

- check: deterministic
- fixture: `examples/brew3r-1step-degraded/draft.gxwf.yml`
- command: `gxwf draft-extract draft.gxwf.yml`
- expectation: result is `class: GalaxyWorkflow` with all `_plan_*` stripped; it omits both `merge assembled transcripts` (drafty) **and** `BREW3R.r` (its dependent), and `outputs` is empty (the `extended_gtf` output sourced from the dropped `BREW3R.r`). Documents that pre-implementation extract is a prefix, not the round-trip oracle — equivalence to `expected.gxwf.yml` only holds after the step is implemented.

## Case: single iteration advances exactly one step

- check: llm-judged
- fixture: a draft with **two or more** drafty tool steps and a fully concrete topology. (The current `brew3r-1step-degraded` fixture has a single drafty step, so it proves advance-then-terminate but not one-of-several; a multi-drafty-step fixture is still TODO.)
- expectation: one invocation of the cast skill advances the [[draft-next-step]] pick — resolves a wrapper, implements that one step, runs [[draft-validate]] `--concrete` — and leaves every other drafty step untouched.

## Case: implemented step leaves no TODO sentinel behind (deterministic + llm-judged)

- check: deterministic + llm-judged
- fixture: `examples/brew3r-1step-degraded/draft.gxwf.yml`
- expectation: after the cast skill implements `merge assembled transcripts`, the mutated draft contains **no** `TODO`/`TODO_*` token — `tool_id` is concrete, the output port is renamed from `TODO_merged_gtf` to the wrapper's real name, and `BREW3R.r`'s `gtf_to_overlap` source is repointed to that real name (no dangling `TODO_` reference). Hallucination guardrail: a fabricated `tool_id` or an invented output port that doesn't match the resolved wrapper's summary is a failure, not a pass. Mechanically: `grep -c TODO` on the result is 0.

## Case: round-trip equivalence to the oracle

- check: llm-judged
- fixture: `examples/brew3r-1step-degraded/` (`draft.gxwf.yml` → orchestrator → `gxwf draft-extract`; oracle `expected.gxwf.yml`)
- expectation: the extracted, class-promoted result is structurally equivalent to `expected.gxwf.yml` modulo the deltas listed in the fixture README's *Round-trip property* (tool_version/changeset drift, defensible `tool_state` values, `hide`/`rename` UI choices, and the `unique_tools:` export block). The implemented wrapper should be the IUC `stringtie_merge` suite tool; a structurally different merge tool is acceptable only if it satisfies the step's `_plan_*` contract.

## Case: loop terminates on draft: false

- check: llm-judged
- fixture: gxformat2 draft with every step already concrete (no `TODO_*`, no `_plan_*`).
- expectation: the cast skill detects `draft: false` from [[draft-next-step]] and returns without invoking discover-or-author, summarize, or implement.

## Case: discover-or-author fallthrough

- check: llm-judged
- fixture: draft step whose `_plan_*` describes behavior that has no acceptable Tool Shed candidate.
- expectation: [[discover-shed-tool]] returns no match; the skill falls through to [[author-galaxy-tool-wrapper]] rather than guessing a wrapper.

## Case: --concrete failure routes to the right surface

- check: llm-judged
- fixture: draft + tool summary that causes [[draft-validate]] `--concrete` to fail with a wrapper-choice mismatch (datatype, collection shape, or missing parameter).
- expectation: the skill classifies the failure per the failure-routing rules in `index.md` and re-enters wrapper resolution, not step implementation.
