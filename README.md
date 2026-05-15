# Galaxy Workflow Foundry

Knowledge base + casting pipeline for building Galaxy workflows with `gxwf`.

An LLM can read a paper or a Nextflow pipeline and propose a Galaxy workflow — and fail the same boring, detectable ways every time: hallucinated tool IDs, dropped `+galaxyN` revisions, fabricated parameter names, `gxformat2` the parser rejects on line one. Hand-authored "convert a workflow" skills paper over these with prose caveats that don't compose and rot on the next regression. The Foundry's bet: **a knowledge base becomes useful when its structure makes it executable, and a skill becomes trustworthy when its source stays inspectable.**

Site: <https://jmchilton.github.io/foundry/>

## Goal

Convert workflows authored in other systems — papers describing computational analyses, Nextflow pipelines, CWL workflows — into validated Galaxy workflows in the `gxformat2` format. The Foundry decomposes that conversion into atomic, schema-validated steps that an LLM agent can execute reliably, grounded in `gxwf`'s static validation of `gxformat2` and tool steps.

## Why

Hand-authored, monolithic conversion skills are brittle, hard to test, and don't compose. The Foundry takes a different shape:

- **Principled.** The Foundry keeps upstream systems authoritative, records provenance for derived artifacts, uses deterministic tooling for deterministic checks, and keeps source knowledge portable across agent runtimes. See `docs/GUIDING_PRINCIPLES.md`.
- **Decomposed.** Each conversion step is its own Mold — a typed reference manifest that casts into a self-contained skill artifact. The full conversion is an ordered Pipeline of Molds.
- **Schema-driven.** `gxwf` validates every authored step inline. The validation loop catches failure modes deterministically — UUID validity, tool-ID and `+galaxyN` revision suffixes, `input_connections` parameter-name mismatches, conditional-selector branches in `tool_state` — rather than relying on enumerated prose caveats.
- **Corpus-grounded.** Patterns and Molds are derived from observed structure in the IWC workflow corpus, not invented top-down. Every reference is traceable back to one or more curated, working `gxformat2` exemplars; the same exemplars double as evaluation material for cast skills.
- **Agent-friendly.** Cast skills are condensed, isolated, and frozen against the Foundry version they were cast from. No runtime dependency on the Foundry, no chasing wiki-links from inside a skill. Casting is the integration boundary.

## What's here

- **Pipelines** (`content/pipelines/`) — ordered Mold sequences composing into an end-to-end conversion (`paper-to-galaxy`, `nextflow-to-galaxy`, `cwl-to-galaxy`, `paper-to-cwl`, `nextflow-to-cwl`). Build artifact and primary navigation surface.
- **Molds** (`content/molds/`) — abstract templates describing a workflow-construction action. Each Mold is a typed reference manifest: it declares the patterns, CLI manual pages, schemas, prompts, and examples it depends on, and casts into one or more skill artifacts.
- **Patterns** (`content/patterns/`) — Galaxy workflow construction reference (collection manipulation, tabular manipulation, conditional handling, custom-tool authoring). Wiki-linked from action Molds; pulled into cast skills via casting's pattern-kind dispatch.
- **CLI manual pages** (`content/cli/<tool>/`) — one note per command or subcommand for `gxwf` and `planemo`. Cast to JSON sidecars by action Molds that reference exact commands.
- **Schemas** (`content/schemas/`) — `<name>.md` schema notes only; the JSON Schema itself lives in its TypeScript package at `packages/<name>-schema/src/<name>.schema.json` (Foundry-authored) or is synced there from an upstream npm package (vendored). The note's frontmatter declares `package` + `package_export`. `site/src/lib/schema-registry.ts` imports each schema directly from the package; Mold frontmatter cites schemas via `[[wiki-link]]` and cast imports the named runtime export at build time, serializing it verbatim into cast bundles.
- **Casts** (`casts/<target>/<name>/`) — generated artifacts, one per (Mold, target) pair. Frozen, condensed, no links back.

## Authoring

Two flows feed the Foundry:

- **Slash commands** (`.claude/commands/`) — agent-driven scaffold-prompt-validate. Primary.
- **Hand edits** + `npm run validate` — small fixes.

Casting produces skill artifacts: `npm run cast -- --mold=<slug> --target=<target>`.

Frontmatter is contract-enforced by `meta_schema.yml`; every note carries a registered tag from `meta_tags.yml`. Validate before commit.

## Tooling

```sh
npm run validate          # schema + cross-file checks
npm run test              # vitest suite
npm run typecheck         # tsc --noEmit
npm run dashboard         # generate content/Dashboard.md
npm run index             # generate content/Index.md
npm run cast              # cast a Mold (see above)
npm run site:dev          # Astro dev server
```

`--check` variants on the generators detect drift; CI runs them before deploy.

## Design docs

Long-form design narrative under `docs/`:

- `GUIDING_PRINCIPLES.md` — why the Foundry prioritizes upstream authority, provenance, deterministic tooling, portability, actionable knowledge, and corpus grounding.
- `ARCHITECTURE.md` — directory layout, types, validation pipeline, site rendering.
- `HARNESS_PIPELINES.md` — pipeline narrative behind `content/pipelines/`.
- `MOLDS.md` — Mold inventory rationale and bucketing axes.
- `COMPILATION_PIPELINE.md` — casting design.
- `CORPUS_INGESTION.md` — IWC grounding; URL-not-mirror principle.
- `SCHEMA_PACKAGES.md` — standard package shape for Foundry-authored JSON Schemas and CLI validators.
- `COMPARISONS.md` — positioning vs wikis/skill bundles plus a dated KB-to-skill landscape snapshot.

## Status

Skeleton plus scaffolding. The spine is in place: content types, validator, pipeline lifting, Mold inventory stubs. Real Mold authoring, pattern pages, CLI manual pages, casting tooling, and the Astro site are all forward work.
