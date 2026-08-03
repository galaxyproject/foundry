---
type: meta
title: "Mold Spec"
record_kind: foundation
order: 4
tags:
  - meta
status: reviewed
created: 2026-05-02
revised: 2026-08-02
revision: 13
summary: "The Mold authoring contract: source layout, which files may sit beside index.md, and who enforces it."
---

This document is the source-layout contract for Mold authoring. The shared zod schema in `@galaxy-foundry/note-schema` (`buildNoteSchema`) is the frontmatter contract, and the reference contract remains the controlled vocabulary for typed references — `kinds` at `reference_contract.yml`, the other four vocabularies from `@galaxy-foundry/reference-contract`.

## Source Layout

A Mold source unit is a directory under `content/molds/<slug>/`.

Which files may sit beside `index.md`, which of them are expected, and which casting may carry into
an artifact are **declared by the kind**, in
`packages/note-schema/src/types/mold/schema.ts`. The validator checks a Mold directory against that
declaration, so it is the enforced answer rather than a description of one.

- `index.md` — required, and the only frontmatter-bearing Mold source file. Owns the Mold contract
  and the operational `references:` manifest.
- `eval.md`, `scenarios.md` — expected of every Mold; their absence is a warning today.
- `refinement.md`, `refinements/`, `changes.md`, `casting.md`, `cast-skill-verification.md`,
  `examples/`, `README.md` — optional.

What each one is FOR is below. Whether it is required, and whether casting packages it, is in the
declaration and only there.

There is no `usage.md`. Illustration belongs in the Mold body or in `examples/`; a file by that
name beside a Mold is undeclared, and undeclared is an error.

Markdown files at the top level of a Mold directory must not contain frontmatter, except `index.md`. Files under `refinements/` are exempt from this rule because each refinement journal entry carries small structured frontmatter (see Refinement Journal). If a supporting note needs frontmatter beyond that, move it to the appropriate content collection and reference it from the Mold.

### `index.md` body discipline

The body of `index.md` is procedural content the cast skill renders into generated `SKILL.md`. **Do not put author-facing meta-content in the body** — it leaks into runtime artifacts. If a generated skill needs better instructions, improve the Mold body or referenced notes, then re-cast. In particular:

- Revision history / changelog → `changes.md`.
- "Reference dispatch (for casting)" or similar redundant restatements of the `references:` manifest → delete; the metadata is the contract. Runtime guidance about when to consult a packaged reference is allowed when it adds operational judgment beyond the manifest.
- Open authoring questions about scope or future references → `casting.md` (cast-time) or the Mold's eval/notes, not the body.

## Index Contract

`index.md` owns the Mold page and the casting manifest.

It must declare:

- `type: mold`
- `name`
- `axis`
- `source`, `target`, or `tool` when required by the selected axis
- `references:` entries for operational dependencies

Legacy top-level fields such as `patterns`, `cli_commands`, `prompts`, and `examples` remain supported during migration. New operational dependencies should use `references:`.

## Typed Reference Manifest

`references:` is the operational dependency manifest. Each entry is object-shaped:

```yaml
references:
  - kind: schema
    ref: "[[summary-nextflow]]"
    used_at: both
    load: upfront
    mode: verbatim
    evidence: cast-validated
    purpose: "Validate emitted summary JSON."
```

Required fields:

- `kind` selects the resolver and casting behavior (`pattern`, `cli-tool`, `cli-command`, `schema`, `prompt`, `example`, `research`).
- `ref` is a wiki link for note-backed references. Current schema references use the `content/schemas/<name>.md` schema note as the wiki-link target.
- `used_at` records whether the reference is used at cast time, runtime, or both.
- `load` is `upfront` or `on-demand`; `on-demand` references require `trigger`.
- `mode` declares the transformation (`verbatim`, `sidecar`). Omit it and the reference takes the
  `default_mode` its kind declares in `reference_contract.yml`.
- `evidence` tracks confidence: `hypothesis`, `corpus-observed`, or `cast-validated`.

Conditional fields:

- `verification` is required when `evidence: hypothesis`.
- `trigger` is required when `load: on-demand`.
- `purpose` is strongly recommended for generated-skill instructions and reviewer context.

The reference contract owns labels, descriptions, and allowed values: `reference_contract.yml` for `kind`, and `@galaxy-foundry/reference-contract` for `used_at`, `load`, `mode` and `evidence`, which are the same in every Foundry. The inherited `mode` vocabulary also offers `condense`, which this Foundry declines — its caster is deterministic end to end, so a Mold declaring `mode: condense` is rejected by validate. Casting consumes the manifest by kind; see [[casting]] for output layout and provenance.

## Eval, Scenario, Usage, Refinement: what goes where

Three sibling files cover the maintainer-facing surface of a Mold. Keep them separate; they decay differently and serve different audiences. The reasoning behind the split lives in `content/meta/eval-philosophy.md`.

- **`eval.md`** — the **abstract oracle**. Fixture-independent property checks: *how* you judge any output. Like a checker that asserts "a sort returns the same elements in nondecreasing order" — never the case "`sort([3,1,2]) == [1,2,3]`". No fixture paths, no magic values. **If you can't state it as a property that holds across inputs, it isn't eval.**
- **`scenarios.md`** — the **concrete cases**. A fixture/input binding plus its expected values or assertions ("`sort([3,1,2]) == [1,2,3]`"; "CalliNGS-NF → 11 processes"). All fixture-specific concreteness lives here; the `eval.md` oracle is applied to whatever a scenario produces. This is the home for the case-shaped content agents used to misfile into `eval.md`.
- **`refinement.md`** — open design questions about the Mold. "Is field X pulling weight?" "Does reference Y change the cast output?" "Should this Mold split?" Free-form notes; the `/refine-mold` skill writes journal entries under `refinements/` that may resolve or accumulate against this file.

The three are not interchangeable. Misfiling is the main failure mode: agents tend to write concrete, fixture-bound cases into `eval.md`, where they belong in `scenarios.md`. Two tests: does the entry name a specific fixture or magic value? → `scenarios.md`, not `eval.md`. Does the entry have a pass/fail edge at all? → if not, it is refinement, not eval.

## Eval Contract

`eval.md` is the **abstract oracle**: it describes *how* maintainers judge any cast artifact from the Mold, independent of which input it ran on. It is not runtime reference content, and it names no fixtures or magic values — those live in `scenarios.md`.

Each eval file should include at least one property section:

```markdown
## Property: short-name

- check: deterministic | llm-judged
- assertion: observable property every conforming output must satisfy
```

Use `deterministic` for properties that can be checked mechanically (e.g. "emitted JSON validates against the schema"), and `llm-judged` for qualitative review criteria. A property must hold across inputs; if you can only phrase it against one fixture's expected value, it is a scenario, not eval.

### What belongs in eval.md

Eval properties earn their place by being **general** and **failure-shaped**. A few principles, learned the hard way:

- **Prefer property checks over prescriptive solutions.** "secondaryFiles surface as an open question or composite-dataset note" is a property; "secondaryFiles must use Galaxy composite datatypes" is a mandate that locks in one answer. Eval should catch silent loss, not pre-decide the fix.
- **Hallucination guardrails are first-class.** Cases that name a known fabrication source — invented Tool Shed IDs, dropped `pickValue` markers, evaporated `ExpressionTool` steps, fabricated step IDs — are some of the highest-value evals. Frame as "X must appear, or be flagged; it must not silently vanish."
- **Don't over-constrain handoff fidelity.** "Every input from the upstream brief appears" is brittle: drafting legitimately adds and simplifies. Prefer "must not silently contradict a high-confidence upstream decision" — same intent, leaves room for honest drafting.
- **For draft/stub Molds, state the validation philosophy explicitly.** A scaffold Mold may want its emitted artifact to either (a) validate clean with TODO sections skipped, or (b) deliberately fail validation/lint on TODO stubs because clean output suggests fabricated values. Same deterministic check, opposite expectation — decide per-Mold and write it down in the case.
- **Handoff cases close the chain.** One case per Mold that asks "can the next Mold downstream consume this without re-deriving the source?" catches dropped context that property checks miss.

### What doesn't belong

- **Re-statements of the procedural body.** If `index.md` already says "produce X", an eval property "produce X" adds nothing. Eval should target failure modes the body alone won't prevent — usually hallucination, omission, or silent contradiction.
- **Fixtures and concrete expected values.** A named fixture path, a magic count ("11 processes"), a pinned-output diff — these are scenarios. Put them in `scenarios.md`; `eval.md` only states the property the scenario's output must satisfy.

## Scenario Contract

`scenarios.md` holds the **concrete test cases** the `eval.md` oracle is applied against. Where `eval.md` is the abstract checker, `scenarios.md` is the table of `(input, expected)` pairs — the sorting analogy: `eval.md` asserts "a sort returns the same elements in nondecreasing order"; `scenarios.md` carries "`sort([3,1,2]) == [1,2,3]`".

Each scenario file should include at least one case section:

```markdown
## Case: short-name

- fixture: path or corpus citation
- expect: expected values / assertions for this fixture (free text is fine)
```

Guidance:

- **All fixture-specific concreteness lives here.** Fixture paths, magic counts, pinned-output diffs, "this exact input should yield that exact field" — everything `eval.md` is forbidden from naming.
- **Cases describe inputs abstractly, then bind a fixture.** "A summary with `sample_sheets[]` populated → `nf-core/sarek`" reads as a behavior-stressing shape plus a concrete binding, so the same case can later rebind to a different fixture.
- **`expect:` may be free text.** Mechanizable expectations are welcome (a count, a `validate-*` exit code), but a prose assertion a reviewer checks by eye is a valid scenario too.
- **The oracle applies to every scenario by default.** A run pairs a scenario's output with the full `eval.md` property set; a scenario adds its fixture-bound `expect:` on top and may mark a property `N/A`. Scenarios do not re-list the eval properties.
- **Drive runs with `/test-drive`.** It binds a scenario, runs the cast artifact, applies `eval.md`, and harvests refinements.

## Refinement Contract

`refinement.md` is freeform markdown. No required structure. Use it to park design questions, hunches, ablation candidates, and unresolved scope debates about the Mold itself. The `/refine-mold` skill reads this file as part of its context-loading pass and may add or resolve entries based on a refinement run.

### Refinement Journal

`refinements/<YYYY-MM-DD>-<slug>.md` is the durable record of one refinement run. Append-only — supersede with new entries rather than editing old ones.

Frontmatter (small, controlled vocabulary):

```yaml
---
mold: <mold-slug>
date: YYYY-MM-DD
intent: <one-line summary of what was being investigated>
decision: keep | schema-change | reference-change | eval-add | open-question | other
---
```

Body is freeform. Suggested headers: `## What I did`, `## What I observed`, `## Recommendations`, `## Open questions`. None are required; use what the run actually produced.

The `decision` field is the only controlled vocabulary; it exists so a future digest can roll up open questions across all Molds. Pick the closest match — `other` is fine when nothing fits.

## Validator Checklist

The validator should expose the same facts a UI Mold-health panel needs:

- Mold directory exists.
- `index.md` exists.
- only `index.md` has Mold frontmatter.
- frontmatter validates.
- axis/source/target/tool fields are coherent.
- `references:` entries resolve by kind.
- `load: on-demand` refs have triggers.
- `evidence: hypothesis` refs have verification.
- CLI command refs resolve to `type: cli-command` notes.
- CLI command notes include install, synopsis, output, exit-code, example, and gotcha/failure guidance.
- `eval.md` exists (warning-only).
- `eval.md` declares at least one `## Property:` section (warning-only).
- `eval.md` uses no `## Case:` sections — concrete cases belong in `scenarios.md` (warning-only).
- eval properties identify deterministic vs LLM-judged checks.
- `scenarios.md` exists (warning-only).
- `scenarios.md` cases bind a fixture (warning-only).
- Mold directory contains only allowlisted files / subdirectories (warning on unknown entries; catches typos and stray notes).
- `refinements/*.md` entries carry `mold`, `date`, `intent`, `decision` frontmatter (warning-only).
- referenced example files exist.
- pipelines reference real Molds.
- Molds unused by any pipeline are warned unless intentionally exempt.

The site surfaces this contract in two places: each Mold page has a Mold health panel, and the Mold inventory table has a compact health column plus eval-plan coverage count.

## Later Work

- Richer `io:` object model for named inputs/outputs.
- Full cast execution/eval harness.
- Runtime Mold-to-Mold dependency graph.
