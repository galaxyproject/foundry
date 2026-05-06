---
description: Review a Foundry Mold and the research/pattern notes its manifest pulls in for runtime fitness.
argument-hint: "<mold-slug>"
---

# Review a Foundry Mold

Review the Mold at `content/molds/$1/` and return a structured report. Do **not** edit files — the orchestrator applies fixes.

This skill complements `/review-pattern` (which reviews a single note in isolation). The Mold review centers on the *graph* the manifest pulls in: each on-demand reference is a runtime artifact whose body must earn its tokens.

## Run the validator first

Before reading anything, run `npm run validate` and capture its output. Do **not** halt on errors or warnings — surface them in the final report's Cross-check log so the orchestrator sees what the deterministic gate flagged. The validator at `packages/build-cli/src/commands/validate.ts` already enforces:

- Frontmatter schema + tag registration.
- Wiki-link resolution and target-type matching for `patterns`, `cli_commands`, `related_patterns`, `related_molds`.
- `references[].kind` → target `type` matching (`pattern`, `cli-command`, `prompt`, `research`, `schema`, `example`).
- `evidence: hypothesis` requires `verification`.
- `load: on-demand` requires `trigger` (warning).
- Schema refs require `package` + `package_export` on the target note.
- Bidirectional `related_notes` backlinks.

Run it once and trust it. Do **not** re-derive these checks by hand — spend tokens on judgment.

## Load context first (in order)

1. **`content/glossary.md`** — pinned vocabulary. Misreading "Mold," "Cast," "reference kind" breaks the review.
2. **`CLAUDE.md`** / **`AGENTS.md`** — authoring rules.
3. **`docs/MOLD_SPEC.md`** — Mold source layout and the eval/usage/refinement contract; reference-kind taxonomy; `load`/`mode`/`used_at` semantics.
4. **`docs/COMPILATION_PIPELINE.md`** — what Cast does with each reference kind; `mode: verbatim` vs LLM-condensed.
5. **`meta_schema.yml`** — only the Mold-specific shapes (`references[]` schema). Skim, don't memorize.
6. **`common_paths.yml.sample`** — citation-prefix vocabulary for resolving inline `$NAME/...` corpus references.
7. **The Mold itself** — `content/molds/$1/`:
   - `index.md` (frontmatter + body)
   - `eval.md`, `usage.md`, `casting.md`, `cast-skill-verification.md`, `refinement.md` if present
   - prior entries under `refinements/`
8. **The cast bundle if present** — `casts/claude/$1/_provenance.json` first; individual artifacts on demand.
9. **Each referenced note** — open every `references[].ref` target. The whole point of this skill is auditing them in their loading context.

## Judgment-required checks

### Manifest semantics (not just structure)

- **`mode` fits content.** `verbatim` on a long note that the consuming LLM doesn't need verbatim is waste. `condensed` on a JSON Schema is wrong.
- **`load` fits trigger frequency.** `upfront` for a reference that fires in a narrow case is bloat. `on-demand` for something needed every run is friction.
- **`evidence` is honest.** `corpus-observed` without citations in the referenced note is overclaiming. Demote to `corpus-inferred` or `hypothesis` (and require `verification`).
- **`purpose` and `trigger` are distinct.** Purpose = what the reference contributes; trigger = when to load it. Triggers that restate purpose ("when this is needed") are dead.
- **`evidence: hypothesis` + `load: upfront` + `mode: verbatim` is fix-before-merge.** Unverified content shipped as upfront context anchors the cast skill on potentially-wrong claims. Either demote to `on-demand` (loaded only under trigger) or verify the note and downgrade `evidence`.
- **Trigger overlap across on-demand refs.** When two or more triggers fire on overlapping conditions ("When implementing concrete steps for…" appearing twice with different filters), the cast loads a clump of notes simultaneously and the body has to disambiguate. Flag for trigger-rewrite or reference consolidation.

### Referenced-note runtime fitness

For each on-demand reference, open the target note and check:

- **Trigger / body duplication.** The note must not re-state the manifest's load condition in its own body (it's loaded *because* the trigger fired — the consumer doesn't need to re-read it). If a note has a "Mold loading guidance" or "When to use this" section that mirrors the manifest, flag for removal.
- **Author-meta in runtime body.** Sections addressing the Foundry author ("Do not turn this into a pattern page," "Keep the Mold body thin") are noise at runtime. The note is loaded into the consuming LLM's context, not read by humans deciding how to organize the corpus. Flag for removal; if the author-meta encodes a real corpus-organization decision, push it to frontmatter (`subtype`, `type`) or a meta-note instead of the runtime body.
- **Reverse-dependency naming.** Research / pattern notes that name the consuming Mold in their body create a cycle. The manifest is one-way: Mold → note. Flag.
- **Body duplication across references.** Two referenced notes saying the same thing in the same load slice is token waste. Suggest consolidation.

### Mold body thinness

`index.md`'s body should not restate content that lives verbatim in an on-demand reference. If a section of `index.md` paraphrases what the cast will load anyway, flag for deletion in favor of relying on the load.

### Author-meta sections in the runtime body

The Mold body is loaded into the cast skill's context — it must address the runtime LLM, not the Foundry author. Heuristic section-title triggers (case-insensitive): `Reference dispatch`, `Tooling to wire in`, `Open questions`, `Pending`, `TODO`, `do not lose`, `Note to authors`, `Author note`. Sections matching these patterns, or sections whose first sentence explains what the manifest fields mean, are nearly always meta-commentary that belongs in `refinement.md` or a `refinements/` entry. Flag them and recommend the destination file.

Same heuristic applies recursively to each on-demand referenced note's body.

### Body-vs-`related_notes` drift

Every wiki-link target in `index.md`'s body should generally appear in the frontmatter `related_notes` (or in `references[].ref`, `output_artifacts[].schema`, `cli_commands`, etc.). Body wiki-links that resolve to no manifest entry are a sign the manifest is stale. Flag mismatches.

### Eval coverage of triggers

Every declared `trigger` should have at least one `eval.md` case that exercises it (otherwise the trigger is unverified). Flag triggers with no eval case. This is judgment, not grep — eval cases describe scenarios, not literal trigger strings.

### Cast-bundle drift (if `casts/claude/$1/` exists)

Compare `_provenance.json` against the current manifest:

- References declared now but missing from the bundle → cast is stale.
- References in the bundle but no longer in the manifest → bundle has dead weight.

This is partly mechanical, but interpretation (does the drift matter? is it intentional pre-recast?) is judgment.

### Inline citation verification

For any `$NAME/path:line` citations in `index.md`, `eval.md`, `usage.md`, `casting.md`: resolve via `common_paths.yml.sample` and `Read` the cited range. Same standard as `/review-pattern`. Skip if there are no inline citations (Mold bodies often don't carry them — citations live in referenced research notes).

## Reporting format

1. **Verdict** — one short sentence.
2. **Findings** — bulleted list, each with: severity (`blocker` / `fix-before-merge` / `nit`), location (file + section or quote), what's wrong, suggested correction. Group by Mold body / manifest / per-reference.
3. **Manifest audit table** — one row per `references[]` entry: `ref | kind | load | mode | issues` (one-line summary; "ok" if clean).
4. **Cross-check log** — one line per inline citation verified: `path:line — verified | mismatch (details)`. Plus the `npm run validate` summary line (`Files: N  Errors: E  Warnings: W`) and any errors/warnings that touch this Mold or its referenced notes.
5. **What would have made this review more useful** — concrete asks (additional context, missing reference, sibling Mold that would calibrate house style).

Keep the report under ~700 words; longer is welcome only when the Mold is genuinely rule-dense or many references need attention.
