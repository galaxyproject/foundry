---
description: Review a Foundry pattern (or research / Mold) note for clarity and correctness against the corpus and tool source.
argument-hint: "<path-to-note.md>"
---

# Review a Foundry note

Review the note at `$1` and return a structured report. Do **not** edit files — the orchestrator applies fixes.

## Load context first (in order)

1. **`content/meta/glossary.md`** — pinned vocabulary (Mold, Pipeline, Pattern, Cast, axis, …). Misreading these terms breaks the review.
2. **`CLAUDE.md`** — authoring rules (`additionalProperties: false`, registered tags, wiki-link conventions, "don't weaken the schema").
3. **`docs/ARCHITECTURE.md`** §3 (note types), §5 (frontmatter contract), §6 (validation pipeline). Skim the rest only if needed.
4. **`packages/note-schema/src/note-schema.ts`** + **`meta_tags.yml`** — frontmatter and tag enums.
5. **`common_paths.yml.sample`** — the citation prefix vocabulary. Logical names (`$IWC`, `$IWC_FORMAT2`, `$GALAXY`, `$TOOLS_IUC`, `$PLANEMO`, `$GXFORMAT2`) map to filesystem paths and (when set) GitHub repos. Resolve every `$NAME/...` citation in the note via this file before checking it.
6. **The note's `related_notes` and survey/research companions** — pinned decisions live in `## Decisions` sections (e.g. `iwc-tabular-operations-survey.md` §7). Treat those as binding unless the review surfaces a reason they're wrong; if so, flag for both the note *and* the source decision record.

## Verify against authoritative sources

For pattern pages and Molds documenting a tool:

- **Tool wrapper XML** — when the note documents a Galaxy tool, `Read` the wrapper. Galaxy core tools live under `$GALAXY/tools/<category>/<name>.xml`; toolshed tools live in their owner repo (`$TOOLS_IUC/tools/<name>/<name>.xml` for IUC-maintained, `$GALAXY` itself for some `devteam` legacy stems). Verify: param names, enum values, default values, hidden/conditional structure, indexing, error handling. Promote any "corpus-inferred" claim to "tool-source verified" or revise it.
- **Corpus citations** — for every `$NAME/path:line` citation, `Read` the cited line range in the local checkout (`common_paths.yml.sample` resolves the prefix to a filesystem path). Confirm the cited shape matches the note's claim. Flag drift, off-by-one ranges, and silent paraphrases.
- **Distribution claims** — when the note asserts a count ("51/51 instances", "dominant idiom"), spot-check via `grep` over the cited corpus root. Counts decay; verify them.

For research notes:

- Verify each cited file:line in the source corpus. Same standard as patterns — research is the audit trail and earns its weight by being checkable.

## Assess

1. **Correctness vs tool source** — anything the wrapper contradicts is a fix-before-merge.
2. **Correctness vs corpus** — citations resolve, ranges are tight, paraphrases are faithful.
3. **Schema / tag conformance** — frontmatter validates against the `@galaxy-foundry/note-schema` contract, all tags appear in `meta_tags.yml`. Note: per-type members are `.strict()`, so unknown frontmatter fields are blockers.
4. **Survey decision conformance** — `## Decisions` sections in companion research notes are binding. Drift between page and decision record is a flag on both.
5. **Form quality for casting** — pattern pages get LLM-condensed into cast skills; reference content should be "do this," not "what we considered." Pitfalls concrete; wiki-links meaningful.

## Reporting format

1. **Verdict** — one short sentence.
2. **Findings** — bulleted list, each with: severity (`blocker` / `fix-before-merge` / `nit`), location (section or quote), what's wrong, suggested correction. Ground each finding in a cited source (XML line, corpus line, schema field, decision record).
3. **Cross-check log** — one line per citation: `path:line — verified | mismatch (details)`. Plus any sampled distribution checks for count claims.
4. **Decision-record drift** — if the review surfaces a problem in a pinned decision (e.g. survey §7), say which doc + section + what to revise.
5. **What would have made this review more useful** — concrete asks (additional context, missing reference, sibling note that would calibrate house style). The orchestrator uses this to refine the next review's framing.

Keep the report under ~700 words; longer is welcome only when the note is genuinely rule-dense.
