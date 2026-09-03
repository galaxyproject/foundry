---
type: meta
title: "Repository Layout"
record_kind: infrastructure
order: 7
tags:
  - meta
status: reviewed
created: 2026-08-02
revised: 2026-08-28
revision: 3
summary: "Where authored source, implementation code, generated artifacts, fixtures, and site files belong."
---

This record owns physical placement. It answers **where should a file live, and who owns its lifecycle?** It does not define note semantics, implementation dependencies, or processing order; see [[content-model]], [[code-architecture]], and [[build-and-validation]].

## Top-level map

```text
foundry/
├── content/             authored knowledge and generated navigation
├── packages/            reusable and application TypeScript packages
├── site/                Astro reading application
├── casts/               generated, committed target artifacts
├── verification/        executable verification fixtures and reports
├── workflow-fixtures/   generated research-corpus workspace
├── scripts/             thin wrappers, sync tasks, and maintenance tools
├── tests/               repository-level contract tests
├── .claude/             repository-local authoring commands
├── .github/workflows/   CI and deployment
├── meta_tags.yml        instance tag vocabulary
├── reference_contract.yml
├── runtime_artifacts.yml
└── vendored_upstreams.yml
```

## `content/`: knowledge source

```text
content/
├── meta/             Foundry design records; glossary is the declared non-note
├── molds/            directory-shaped action notes and companions
├── pipelines/        directory-shaped journey notes and companions
├── patterns/         Galaxy construction references
├── source-patterns/  source-to-target mapping references
├── cli/              tool index notes and command manual pages
├── schemas/          human-facing Mold IO schema notes
├── prompts/          prompt wrappers with raw prompt companions
├── research/         background notes with owned source companions
├── Dashboard.md      generated browse surface
└── Index.md          generated flat catalog
```

The content root follows the Astro idiom and tells a contributor that these files are publishable knowledge. A directory under `content/` does not define its own semantics: the collection table and kind definition declare whether files are notes, what kind they carry, and whether companions are allowed.

`content/schemas/` contains renderable references, not the JSON schema source of truth. Producer packages and `packages/gxwf-foundry` own executable schema assets.

## `packages/`: implementation ownership

- `note-schema/` — instance note kinds, collections, and schema composition.
- `build-cli/` — repository authoring, validation, generation, casting, and assembly.
- `foundry/` — runtime CLI and orphan Mold IO schemas.
- `summarize-nextflow/` — Nextflow summarization plus producer-owned schemas.
- `planemo-cli-meta/` and `planemo-test-report-schema/` — pinned generated Planemo interfaces.

Every package owns its source, tests, build configuration, and publish metadata. Code shared between root authoring operations belongs in `build-cli`; code shared by runtime consumers belongs in an appropriate runtime package.

## `site/`: presentation only

`site/src/content.config.ts` wires the shared collections into Astro. `site/src/lib/` contains presentation adapters and registries, `site/src/components/` contains specialized renderers, and `site/src/pages/` owns routes. Site-local code may adapt shared contracts for rendering but must not redefine them.

The shell those routes render inside — document skeleton, header, footer — is installed rather than local: it comes from `@galaxy-foundry/site-kit`, and `site/src/layouts/Base.astro` composes it with the identity in `site/src/lib/site-identity.ts`. The palette stays here, as custom properties in `site/src/styles/global.css` that the kit names and does not ship.

The generated `site/dist/` output is deployment material and is not committed source.

## Generated and external workspaces

- `casts/` is generated and committed so consumers can install or inspect artifacts without rerunning casting. Edit the Mold, caster, or reference source and regenerate.
- `verification/` contains small committed fixtures and expected reports used to prove runtime behavior.
- `workflow-fixtures/` materializes external Nextflow, CWL, and IWC corpora for research. Generated clones and conversions are gitignored; fixture declarations and materialization scripts are authored.
- `LICENSES/` contains license texts required by vendored or redistributed material.

Generated output never moves under `content/` merely to make it render. The site can read a generated tree through a dedicated registry or route without turning that artifact into a note.

## Root configuration

Root registries are repository-wide contracts rather than notes:

- `meta_tags.yml` declares instance tag facets and values;
- `reference_contract.yml` declares typed-reference vocabulary and permitted use;
- `runtime_artifacts.yml` declares artifacts initialized by explicit harness or skill runtime modes;
- `vendored_upstreams.yml` records synchronized external artifacts;
- `dashboard_sections.json` configures generated navigation;
- `package.json`, `pnpm-workspace.yaml`, and `tsconfig.json` coordinate the workspace.

## Placement rules

1. Put human-authored knowledge under `content/` and give it a declared kind unless it is an explicit non-note.
2. Put reusable code in the package that owns its lifecycle; keep root scripts thin.
3. Put presentation-only logic in `site/`, never in the content contract.
4. Put generated target artifacts outside `content/` and give them a producer plus drift or provenance mechanism.
5. Put external corpora in reproducible fixture workspaces rather than copying them into notes.
6. Add a new top-level directory only when its lifecycle cannot be expressed by an existing owner.

Update this record when a top-level owner appears, a file class changes lifecycle, or a placement rule changes—not for ordinary additions inside an established directory.
