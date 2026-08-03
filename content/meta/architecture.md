---
type: meta
title: "Architecture Map"
record_kind: foundation
order: 2
tags:
  - meta
status: reviewed
created: 2026-04-30
revised: 2026-08-02
revision: 46
summary: "A short map of the Foundry's major parts, boundaries, and focused architecture records."
---

The Galaxy Workflow Foundry is a knowledge base with two compilation paths: one renders authored knowledge for people, and the other casts selected knowledge into portable artifacts for agents. This page is the map of that system.

## System map

```text
external evidence and tools
  IWC, source pipelines, gxwf, Planemo
                 │
                 ▼
authored Foundry source
  content/ + registries + schemas + fixtures
          │                         │
          ▼                         ▼
  validate and index          cast and assemble
          │                         │
          ▼                         ▼
   Astro reading site        portable cast artifacts
```

The source of truth is the authored material under `content/` plus the registries and schema implementations that define its contracts. The site and casts are projections of that source, not alternative authoring surfaces.

## Focused architecture records

- [[code-architecture]] — packages, applications, dependency direction, entry points, and implementation contracts.
- [[content-model]] — note kinds, frontmatter, tags, wiki links, references, companions, and content identity.
- [[build-and-validation]] — validation, casting, generation, site builds, CI, and maintenance flows.
- [[repository-layout]] — the physical tree, ownership boundaries, and authored-versus-generated placement.

These records explain how the system is implemented. The Foundry's domain design remains in the records that own it: [[guiding-principles]], [[molds]], [[mold-spec]], [[casting]], [[eval-philosophy]], [[corpus]], and [[harness-pipelines]]. The glossary remains authoritative when terminology differs.

## Major boundaries

- **Knowledge versus implementation.** The [[content-model]] describes Molds, Patterns, Pipelines, CLI references, schemas, research notes, and how they relate. The [[code-architecture]] explains how TypeScript packages and the Astro application validate, transform, and render that knowledge.
- **Authored versus generated.** Authors edit source notes, registries, package schemas, and code. They regenerate dashboards, indexes, kind manifests, cast bundles, and assembled pipeline skills. [[build-and-validation]] owns those flows and their drift gates.
- **Foundry versus external systems.** IWC and source-pipeline fixtures provide evidence; gxwf and Planemo perform design-time or runtime work. They are referenced or invoked, not absorbed into the content model. [[corpus]] owns the corpus boundary.
- **Foundry versus harness.** As described in [[harness-pipelines]], the Foundry represents journeys as Pipelines and can assemble a lightweight test-drive harness, while stateful production orchestration remains a consumer concern.
- **Logical ownership versus physical placement.** A file's directory follows its role and lifecycle. [[repository-layout]] is the authority on where authored, generated, vendored, and temporary material belongs.

## Architectural invariants

- `content/` is the knowledge source; casts and the site are derived views.
- Frontmatter has one zod authority shared by validation and rendering.
- Tags, reference kinds, and note kinds are declared vocabularies.
- Generated artifacts have deterministic regeneration or an explicit provenance record.
- Runtime-specific packaging belongs to casting; Molds remain durable, target-neutral source.
- External corpora are cited or materialized as fixtures, never silently copied into the knowledge base.

An architectural change should update the focused record that owns the changed contract. Update this map only when a top-level component, boundary, or reading route changes.
