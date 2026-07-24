---
description: Refine a Foundry Mold — load context, investigate the user's intent, write a refinement journal entry.
argument-hint: "<mold-slug> [free-form intent...]"
---

# Refine a Mold

Refine Mold `$1` against the user's intent. The intent is whatever follows `$1` in the invocation — a free-form sentence describing what's being investigated. Examples:

- `/refine-mold summarize-nextflow run on nf-core/sarek and look at the output schema`
- `/refine-mold summarize-nextflow is the params field useful?`
- `/refine-mold author-galaxy-tool-wrapper run without the custom-tool pattern reference and see if quality drops`
- `/refine-mold summarize-paper how should the methods-extraction research note improve, what was missing?`

You decide what kind of investigation the intent calls for. There is no fixed mode dispatch — read the intent, propose an approach, confirm with the user briefly if it's non-obvious, then do the work and write a durable journal entry.

## 0. Orient — base context, always read

Read these before doing anything else. They are cheap and the skill won't make sense without them.

1. `content/meta/glossary.md` — pinned vocabulary (Mold, Cast, reference kind, evaluation plan, refinement journal, …). Misreading these breaks the refinement.
2. `docs/MOLD_SPEC.md` — Mold source layout. Pay attention to **Eval, Usage, Refinement: what goes where** and the **Refinement Contract**. The journal entry shape is contractual.
3. The Mold itself — `content/molds/$1/`:
   - `index.md` (full body and frontmatter)
   - `eval.md`, `usage.md`, `refinement.md` (any that exist)
   - `casting.md` (if present — Mold-owned guidance read by casting; often explains why the cast looks the way it does)
   - `cast-skill-verification.md` (if present — post-cast review checklist; relevant when the intent touches cast quality)
   - prior entries under `refinements/` if any (don't repeat work; supersede if you do)

## 1. Confirm the intent

Restate the user's intent in one or two sentences. This catches dyslexic typos and ambiguous targets early. If the intent is genuinely ambiguous (e.g., "field x" but two fields are plausible), ask one short question. Otherwise proceed.

## 1a. Load intent-conditional context

Now that you know what's actually being investigated, pull the rest. Load only what the intent needs:

- **References from the manifest.** Open the patterns / schemas / CLI manual pages / research notes / prompts / examples the intent touches. Skim the rest. For an intent like "is field X useful," that's usually the IO schema and one or two consumers; don't burn context on every reference.
- **`docs/COMPILATION_PIPELINE.md`** — read when the intent involves re-casting, suppressing a reference, or reasoning about per-kind dispatch.
- **The current cast bundle** — `casts/<target>/$1/` (typically `casts/claude/$1/`). Read `_provenance.json` first for what was packaged; open individual artifacts on demand. Required when the intent involves running the cast or comparing output shape.
- **Sibling Molds** — only if the intent involves overlap, scope, or split questions.

Underloading is a real failure mode but so is over-loading before you know what you need. Pick consciously.

## 2. Investigate

Whatever the intent calls for. Some shapes that come up often (none required, none exhaustive):

- Re-cast the Mold (or use the existing cast) and run the resulting skill on a fixture. Inspect outputs.
- Read the schema with the suspected field's role in mind; trace which references rely on it; check whether eval cases exercise it.
- Diff the cast bundle against a hypothetical bundle missing reference Y (read-the-references-and-imagine, or actually re-cast with the reference suppressed).
- Compare against a sibling Mold — does this Mold overlap with another?
- Read the cited research note and look for gaps that the Mold's body or schema implicitly assumes.

Use whatever tools fit: `Read`, `Bash` (for grep / `make fixtures-*` / running the cast), `Agent` for parallel research if the question spans multiple references. Do **not** apply changes to the Mold, its references, or its schema — recommend, don't act. The exception: writing the refinement journal entry itself (see step 3).

## 3. Write the refinement journal entry

Before declaring done, write a journal entry at:

```
content/molds/$1/refinements/<YYYY-MM-DD>-<short-slug>.md
```

`<short-slug>` should be three to six kebab-case words capturing the investigation (e.g. `ablate-params-field`, `process-discovery-on-sarek`, `methods-extraction-gap-check`). Use today's date.

Frontmatter is contractual:

```yaml
---
mold: $1
date: <YYYY-MM-DD>
intent: <verbatim user intent or one-line summary>
decision: keep | schema-change | reference-change | eval-add | open-question | other
---
```

Body is freeform. Suggested structure (use what the run actually produced; skip what doesn't apply):

```markdown
## What I did
<short paragraph — what was loaded, what was run, what was inspected>

## What I observed
<freeform — concrete observations, surprises, redundancies, gaps>

## Recommendations
<bullets — proposed changes to the Mold, its references, its schema, its eval, or the research notes it consults. "None — observations only" is a valid bullet.>

## Open questions
<bullets — anything that surfaced but couldn't be resolved>
```

The `decision` enum is the only controlled vocabulary. Pick the closest match:

- `keep` — investigation concluded the Mold is fine as-is for this question.
- `schema-change` — recommend a change to the Mold's IO schema (add/remove/reshape a field).
- `reference-change` — recommend adding, removing, or re-tuning a reference in the manifest.
- `eval-add` — surfaced a regression-worthy assertion; recommend adding to `eval.md`.
- `open-question` — needs more thought, more data, or a follow-up run.
- `other` — none of the above.

Save the file before reporting back. The journal entry is the durable artifact; if the session ends, the entry persists.

## 4. Report back

Tell the user:

- Path to the journal entry you wrote.
- The `decision` you picked and one sentence of rationale.
- Top recommendations as bullets, if any.
- Any unresolved questions (concise, no grammar).

Do not edit the Mold, its references, schema files, `eval.md`, or any other Foundry content. The journal entry is the only file you write. Follow-up actions on its recommendations are a separate user-driven step.
