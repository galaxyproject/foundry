# Mold Spec

This document is the source-layout contract for Mold authoring. `meta_schema.yml` remains the frontmatter schema, and `reference_contract.yml` remains the controlled vocabulary for typed references.

## Source Layout

A Mold source unit is a directory under `content/molds/<slug>/`.

Required files:

- `index.md` — the only frontmatter-bearing Mold source file. Owns the Mold contract and the operational `references:` manifest.

Strongly recommended (warning-only for now):

- `eval.md` — Foundry-maintainer evaluation plan. Pass/fail or judge-able assertions about cast output. Never packaged into cast artifacts.

Optional files:

- `usage.md` — narrative examples / representative invocations of the Mold. Author-facing illustration, not assertion. Never packaged into cast artifacts in v1; may later be cast as `examples/` content.
- `refinement.md` — open design questions about the Mold itself: schema fields under suspicion, references whose value isn't clear, scope edges. Free-form. Never packaged into cast artifacts.
- `refinements/` — append-only journal of refinement runs (one file per run, see Refinement Journal). Never packaged.
- `casting.md` — Mold-owned guidance read by casting itself (skill assembly notes, condensation prompts). Not packaged into the generated skill runtime unless explicitly incorporated by the cast.
- `cast-skill-verification.md` — Mold-owned dynamic-review checklist for a generated skill. Used after casting by reviewers or verification agents; not packaged into runtime artifacts.
- `changes.md` — Mold-owned revision history / changelog. Use this for content that documents how the Mold has evolved across casts. Never packaged into cast artifacts.
- `examples/` — local examples or small fixtures referenced by `index.md` or `eval.md`.

Markdown files at the top level of a Mold directory must not contain frontmatter, except `index.md`. Files under `refinements/` are exempt from this rule because each refinement journal entry carries small structured frontmatter (see Refinement Journal). If a supporting note needs frontmatter beyond that, move it to the appropriate content collection and reference it from the Mold.

### `index.md` body discipline

The body of `index.md` is procedural content the cast skill renders into generated `SKILL.md`. **Do not put author-facing meta-content in the body** — it leaks into runtime artifacts. If a generated skill needs better instructions, improve the Mold body or referenced notes, then re-cast. In particular:

- Revision history / changelog → `changes.md`.
- "Reference dispatch (for casting)" or similar redundant restatements of the `references:` manifest → delete; the metadata is the contract. Runtime guidance about when to consult a packaged reference is allowed when it adds operational judgment beyond the manifest.
- Open authoring questions about scope or future references → `casting.md` (cast-time) or the Mold's eval/notes, not the body.

### File roles at a glance

| File                          | Audience                          | Packaged into cast?            |
| ----------------------------- | --------------------------------- | ------------------------------ |
| `index.md`                    | Mold contract + casting manifest  | Body rendered into generated skills |
| `eval.md`                     | Foundry maintainers               | Never                          |
| `usage.md`                    | Mold authors / readers            | Never (v1)                     |
| `refinement.md`               | Mold authors / `/refine-mold`     | Never                          |
| `refinements/`                | `/refine-mold` journal            | Never                          |
| `casting.md`                  | Cast skill / casting LLM          | Read at cast time              |
| `cast-skill-verification.md`  | Post-cast reviewer / agent        | Never                          |
| `changes.md`                  | Mold authors / reviewers          | Never                          |
| `examples/`                   | `index.md`, `eval.md`             | Only if referenced explicitly  |

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

- `kind` selects the resolver and casting behavior (`pattern`, `cli-command`, `schema`, `prompt`, `example`, `research`).
- `ref` is a wiki link for note-backed references. Current schema references use the `content/schemas/<name>.md` schema note as the wiki-link target.
- `used_at` records whether the reference is used at cast time, runtime, or both.
- `load` is `upfront` or `on-demand`; `on-demand` references require `trigger`.
- `mode` declares the transformation (`verbatim`, `condense`, `sidecar`).
- `evidence` tracks confidence: `hypothesis`, `corpus-observed`, or `cast-validated`.

Conditional fields:

- `verification` is required when `evidence: hypothesis`.
- `trigger` is required when `load: on-demand`.
- `purpose` is strongly recommended for generated-skill instructions and reviewer context.

`reference_contract.yml` owns labels, descriptions, and allowed values. Casting consumes the manifest by kind; see `COMPILATION_PIPELINE.md` for output layout and provenance.

## Eval, Usage, Refinement: what goes where

Three sibling files cover the maintainer-facing surface of a Mold. Keep them separate; they decay differently and serve different audiences.

- **`eval.md`** — assertions. A case is runnable: a fixture plus something that could fail. **If you can't sketch what failure looks like, it isn't eval.** Belongs in `usage.md` or `refinement.md` instead.
- **`usage.md`** — illustration. Representative invocations and example inputs/outputs, with no assertion attached. The "here's what running this Mold tends to look like" file. Optional; create only when narrative examples accumulate.
- **`refinement.md`** — open design questions about the Mold. "Is field X pulling weight?" "Does reference Y change the cast output?" "Should this Mold split?" Free-form notes; the `/refine-mold` skill writes journal entries under `refinements/` that may resolve or accumulate against this file.

The three are not interchangeable. Misfiling is the main failure mode: agents tend to write usage-shaped content as eval cases. When in doubt, ask whether the entry has a pass/fail edge — if not, it isn't eval.

## Eval Contract

`eval.md` describes how maintainers judge a cast artifact from the Mold. It is not runtime reference content.

Each eval file should include at least one case section:

```markdown
## Case: short-name

- check: deterministic
- fixture: path or corpus citation
- expectation: observable pass/fail condition
```

Use `deterministic` for checks that can be run mechanically, and `llm-judged` for qualitative review criteria.

## Usage Contract

`usage.md` is freeform markdown. No required structure. Suggested rhythm: one H2 per representative scenario, a short prose description, and a code block or transcript excerpt showing the invocation and a representative excerpt of output. No `expectation:` lines — that vocabulary is reserved for `eval.md`.

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
- `eval.md` declares at least one evaluation case (warning-only).
- eval cases identify deterministic vs LLM-judged checks.
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
