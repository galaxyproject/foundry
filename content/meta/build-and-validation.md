---
type: meta
title: "Build and Validation"
record_kind: infrastructure
order: 6
tags:
  - meta
status: reviewed
created: 2026-08-02
revised: 2026-08-02
revision: 1
summary: "How authored Foundry source is checked, generated, cast, assembled, rendered, and kept current."
---

This record owns the transformations from authored source to checked or generated output. It answers **what runs, in what order, and what proves the result is current?** Component ownership belongs to [[code-architecture]] and file placement to [[repository-layout]].

## Authoring loop

```text
edit source
   │
   ▼
static validation ──failure──► repair source or contract
   │
   ├──► regenerate indexes and manifests ──drift check
   ├──► cast a Mold ──cast verification and provenance
   ├──► assemble a Pipeline ──assembly drift check
   └──► build the Astro site ──collection schema + route rendering
```

Authors change source notes, registries, schema implementations, or code. Generated files are refreshed through their owning command rather than edited directly.

## Static validation

`npm run validate` invokes `foundry-build validate --root .`. Validation proceeds in layers:

1. discover notes through the shared collection table;
2. parse frontmatter and validate the note against its kind's strict zod schema;
3. check dates, paths, note shapes, and companion contracts;
4. load tag and reference registries and enforce membership and coherence;
5. build the shared wiki-link map and resolve frontmatter and body links;
6. run kind-specific checks for Molds, Patterns, Pipelines, schemas, CLI notes, prompts, research notes, and artifacts;
7. run cross-note checks such as bidirectional relationships, typed-reference compatibility, pipeline phase resolution, and artifact producer/consumer ordering;
8. run `validateUnroutedContent`, which errors on markdown under `content/` that no collection claims, no directory note owns, and `NOT_NOTES` does not declare.

Step 8 is what closes the walk. Steps 1–7 check the files the routing table found; step 8 checks that the table found everything there was to find. [[content-model]] owns the three-way accounting it enforces.

Errors block. Warnings identify advisory quality concerns. Casting refuses to proceed from a Mold that fails static validation.

## Generated navigation and manifests

The authoring CLI generates several committed projections:

- `content/Dashboard.md` from configured dashboard sections;
- `content/Index.md` from the current note inventory;
- the README corpus statistics block;
- `packages/note-schema/src/types/kinds.generated.json` from assembled kind definitions.

Each generator has a `--check` command (`check:dashboard`, `check:index`, `check:readme`, `check:kinds`) that regenerates in memory and fails on byte drift. The authored notes and kind definitions remain authoritative.

## Casting

`foundry-build cast` reads one Mold, validates it, resolves its typed references, dispatches each reference according to the reference contract, and writes a target-specific bundle under `casts/<target>/`. A cast includes provenance recording the Mold hash, resolved reference hashes, target/model information where applicable, and timestamp.

Casting treats source and output as separate lifecycles:

- Molds and referenced notes are durable authored source.
- `SKILL.md`, copied references, sidecars, `_provenance.json`, and verification reports are generated outputs.
- Evaluation and refinement companions remain Foundry-maintainer material unless their declared disposition says otherwise.

[[casting]] and [[cast-walkthrough]] own the semantic details.

## Pipeline assembly

`foundry-build assemble-pipeline` projects a Pipeline's phase spine into a lightweight `pipeline-<slug>` harness skill. It resolves phase Molds, expands supported branch routing, records `_assembly.json`, and prepares a per-run working-directory contract. The output is a test-drive convenience, not the production harness architecture described in [[harness-pipelines]].

`make check-assemble-pipelines` is the drift gate for committed assemblies.

## Site build

The Astro application loads every note collection from the shared collection table and applies the same assembled schemas as repository validation. It builds:

- type-specific browse and detail routes;
- the design-record reading surface;
- tags, backlinks, wiki links, and raw text endpoints;
- specialized renderers for Molds, Patterns, Pipelines, schemas, research, and CLI references;
- cast and usage surfaces derived from committed artifacts.

The raw endpoints follow one rule: **every note is served, and so is every file beside one** — companions, `refinements/` entries, `examples/` fixtures, vendored sidecars. Nothing adjacent to a note is withheld, because the repository is public and an unserved file is hidden from an agent reading the site and from nobody else. The path carries the whole filename rather than a stem, which is what lets a `.yml` or `.prompt` sidecar have a URL at all.

`npm run site:build` performs the production static build. GitHub Pages deployment consumes that output; the site is never an authoring source.

## Vendored and fixture maintenance

Vendored upstream artifacts have explicit sync commands and checked provenance. `npm run check:vendored` detects upstream-artifact drift. Planemo CLI metadata and its test-report schema are refreshed with `make sync-planemo*` targets and checked without requiring Planemo during ordinary validation.

`workflow-fixtures/` is a generated research workspace. Fixture declarations are authored; cloned or converted pipelines, IWC trees, and skeletons are materialized on demand and remain gitignored. These outputs support surveys and tests but never become content implicitly.

## CI gates

Pull requests and `main` run proportional checks across:

- content validation and drift generators;
- root and package Vitest suites;
- TypeScript and Astro type checking;
- package builds, formatting, and linting;
- cast, assembly, vendored-artifact, and CLI-reference drift checks;
- the static site build;
- verification workflows where their fixtures apply.

The architectural rule is simple: every committed projection must have a reproducible producer and a check mode, while every non-deterministic cast must carry provenance sufficient to identify its inputs.

## Tracked tooling follow-up

Root authoring commands currently run TypeScript through `tsx`. A possible migration to
precompiled bins is tracked in [issue #201](https://github.com/galaxyproject/foundry/issues/201);
until that contract changes, the root scripts remain supported entry points rather than an
accidental development-only path.
