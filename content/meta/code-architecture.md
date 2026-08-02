---
type: meta
title: "Code Architecture"
record_kind: infrastructure
order: 4
tags:
  - meta
status: reviewed
created: 2026-08-02
revised: 2026-08-02
revision: 1
summary: "Implementation components, dependency direction, entry points, and contracts across the Foundry codebase."
---

This record answers one question: **how is the implementation divided, and which direction may dependencies flow?** It does not define note kinds, document the build lifecycle, or enumerate the repository tree; those belong to [[content-model]], [[build-and-validation]], and [[repository-layout]].

## Component stack

```text
                    site (Astro)
                         │
                 build-cli (authoring)
                    │          │
                    ▼          ▼
             note-schema     foundry CLI
                    │          │
                    ▼          ▼
       shared substrate     summarize-nextflow

shared substrate = kind-schema, kind-manifest, tag-registry,
reference-contract, wiki-links, and license-policy packages
```

The arrows point toward dependencies. The site and build CLI are composition layers: they join instance contracts, shared substrate packages, and runtime packages into user-facing behavior. Lower layers do not import either application.

## Components and ownership

### `@galaxy-foundry/note-schema`

The instance's content-contract package. It owns:

- the base frontmatter envelope;
- one definition directory per note kind;
- collection paths and note shapes;
- instance composition of tag, reference, and license registries;
- the generated kind manifest contract.

It builds on the shared `@galaxy-foundry/*` substrate packages. The package exports the same assembled schemas and collection table to both the validator and the site, preventing a second frontmatter encoding.

### `@galaxy-foundry/build-cli`

The authoring and build application exposed as `foundry-build`. It owns repository-wide operations:

- static content validation and cross-note checks;
- dashboard, index, README-stat, and kind-manifest generation;
- Mold casting and cast verification;
- Pipeline assembly;
- repository-wide registries and file walking.

Root files under `scripts/` are thin compatibility wrappers, sync commands, or one-time maintenance utilities. New reusable authoring behavior belongs in `build-cli`, not in another root script.

### `@galaxy-foundry/foundry`

The runtime-facing CLI and schema bundle. It owns validation commands for structured Mold artifacts and exports schemas whose producer is not another in-repository package. It is distinct from `foundry-build`: the build CLI operates on the Foundry repository; the runtime CLI travels with or supports cast workflows.

### `@galaxy-foundry/summarize-nextflow`

A domain runtime package that summarizes Nextflow source and owns the schemas produced by that operation. Producer-owned schemas remain with their producer; `@galaxy-foundry/foundry` holds the orphan schemas with no independent in-repository producer.

### Metadata packages

`@galaxy-foundry/planemo-cli-meta` and `@galaxy-foundry/planemo-test-report-schema` are generated, version-pinned views of Planemo interfaces. Normal validation consumes the checked-in artifacts without requiring Planemo to be installed.

### Astro site

`site/` is the human reading application. It imports the note schemas and collection table rather than reconstructing them. Its local code owns presentation concerns: note registries, backlinks, remark transforms, specialized bodies, routes, and styling. It may read cast metadata for presentation, but it does not produce casts.

## Shared implementation seams

- **Kinds:** `@galaxy-foundry/kind-schema` defines the generic kind contract; this instance supplies concrete kinds and context through `note-schema`.
- **Kind manifests:** `@galaxy-foundry/kind-manifest` derives and reads the portable description of those concrete kinds.
- **Tags:** `@galaxy-foundry/tag-registry` owns the registry format; `meta_tags.yml` owns this instance's vocabulary.
- **References:** `@galaxy-foundry/reference-contract` owns shared reference behavior; `reference_contract.yml` owns instance reference kinds and permitted combinations.
- **Wiki links:** `@galaxy-foundry/wiki-links` owns parsing, slugging, resolution, and tree traversal; the site and validator supply the instance link map.
- **Licenses:** `@galaxy-foundry/license-policy` answers general redistribution questions; instance validation owns coherence rules for its notes.

Composition happens at narrow adapters such as the schema context, registries, and site link-map builder. Application code imports the shared package directly when no instance-specific composition is required.

## External tool boundary

gxwf and Planemo are not implementation layers in this repository. Molds describe when to use them, CLI notes document exact commands, and generated skills invoke them. Repository validation may inspect their vendored metadata, but tool execution remains a design-time or cast-runtime concern.

## Cross-component contracts

1. The note-schema package is the only frontmatter authority.
2. The collection table drives validator walking, Astro loading, wiki-link reachability, and kind manifests.
3. The build CLI may depend on runtime/schema packages; runtime packages do not depend on repository authoring code.
4. The site consumes schemas and content but never becomes a second source of content truth.
5. Producer packages own their structured output schemas.
6. Shared substrate packages own reusable formats and mechanisms, while the instance owns domain vocabulary and policy.
7. Generated metadata packages are refreshed through explicit sync commands and protected by drift checks.

## Code orientation

| Concern | Primary location |
|---|---|
| note definitions and collections | `packages/note-schema/src/types/` |
| authoring CLI commands | `packages/build-cli/src/commands/` |
| repository validation | `packages/build-cli/src/commands/validate.ts` |
| casting | `packages/build-cli/src/commands/cast-mold.ts` |
| pipeline assembly | `packages/build-cli/src/commands/assemble-pipeline.ts` |
| runtime artifact validation | `packages/foundry/src/` |
| Nextflow summarization | `packages/summarize-nextflow/src/` |
| site collection wiring | `site/src/content.config.ts` |
| site registries and link maps | `site/src/lib/` |
| specialized rendering | `site/src/components/` and `site/src/pages/` |

Implementation changes should update this record when they add a component, reverse a dependency, move an ownership boundary, or change a cross-component contract.
