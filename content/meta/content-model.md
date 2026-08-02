---
type: meta
title: "Content Model"
record_kind: infrastructure
order: 5
tags:
  - meta
status: reviewed
created: 2026-08-02
revised: 2026-08-02
revision: 1
summary: "How Foundry notes, kinds, metadata, tags, links, references, and companions represent knowledge."
---

This record owns the representation of knowledge under `content/`. It answers **what is a Foundry note and how do notes relate?** Package dependencies belong to [[code-architecture]], processing flows to [[build-and-validation]], and physical placement to [[repository-layout]].

## Notes, kinds, and identity

A **Note** is a Markdown source file whose frontmatter declares exactly one `type`. That type selects a **Kind** definition: the metadata contract, file-or-directory shape, and permitted companions. Identity is the note's content-relative slug, with kind-specific aliases added only by the shared resolver.

The current kinds are:

| Kind | Purpose | Shape and location |
|---|---|---|
| `meta` | design record about the Foundry | flat file under `content/meta/` |
| `mold` | abstract action compiled into cast artifacts | `content/molds/<slug>/index.md` plus declared companions |
| `pattern` | reusable Galaxy construction reference | flat file under `content/patterns/` |
| `source-pattern` | source-to-target mapping reference | flat file under `content/source-patterns/<source>/` |
| `cli-tool` | installation and invocation metadata for one CLI | `content/cli/<tool>/index.md` |
| `cli-command` | one command or subcommand manual page | `content/cli/<tool>/<command>.md` |
| `pipeline` | ordered journey of Mold and routing phases | `content/pipelines/<slug>/index.md` plus declared companions |
| `research` | background synthesis with owned source companions | `content/research/<slug>/index.md` |
| `schema` | renderable reference to a Mold IO schema | flat file under `content/schemas/` |
| `prompt` | human framing plus a raw prompt sidecar | `content/prompts/<area>/<slug>/index.md` |

Kind is never inferred from a tag. Paths route files into collections; the note's literal `type` must agree with the collection's declared kind.

## Frontmatter contract

Every note carries the base lifecycle envelope:

- `type`, selecting the kind;
- at least one registered `tags` value;
- `status`: `draft | reviewed | revised | stale | archived`;
- `created`, `revised`, and integer `revision`;
- a 20–160 character `summary`.

Each kind adds only fields meaningful to that kind. Definitions are strict: an unknown key is an error rather than silently accumulated metadata. The zod definitions in `@galaxy-foundry/note-schema` are the single authority used by validation, the site, and kind-manifest generation.

Mold IO schemas are a different contract. They validate artifacts passed between Molds; they do not validate note frontmatter. Their human-facing schema notes live under `content/schemas/`, while the JSON schema implementation stays with its producer package or the runtime `foundry` package. See [[schema-packages]].

## Tags and facets

`meta_tags.yml` is a closed controlled vocabulary. A tag is valid because a declared facet lists it, not because its text resembles a prefix. Facets are cross-cutting browse axes—currently including source, target, tool, CLI, topic, prompt, and Foundry-meta concerns. Note kind remains the `type` discriminator and is never duplicated as a tag.

The registry has two corpus-level drift rules: a note may not use an undeclared tag, and a declared instance tag or facet may not remain unused. Shared inherited vocabularies are not treated as instance-authored dead vocabulary.

## Links and typed references

Body prose and selected frontmatter fields use Obsidian-style `[[Target]]` links. The validator and renderer share one parser and resolver. Resolution is exact after normalization; unresolved links fail validation or render visibly unresolved. Code spans are excluded because a backticked `[[Target]]` names the syntax rather than creating a link.

A wiki link expresses knowledge navigation. A Mold **Reference** adds compilation behavior: its `kind`, `load`, `used_at`, `modes`, and `evidence` fields tell casting how the target participates. Patterns may be condensed, prompts inlined, schemas and examples copied, CLI commands serialized as sidecars, and evaluation companions omitted. [[mold-spec]] owns the authoring contract and [[casting]] owns dispatch semantics.

## Directory notes and companions

Directory-shaped kinds own a directory whose `index.md` is the only frontmatter-bearing note. Files beside it are **Companions**, not independent notes. Each kind declares allowed companion names or patterns, whether each is required or recommended, and whether it ships in casts.

Examples include Mold `eval.md`, `scenarios.md`, `refinement.md`, `refinements/`, and `examples/`; Pipeline `eval.md` and `scenarios.md`; Prompt `upstream.prompt`; and Research vendored source files. Undeclared siblings are rejected unless the kind explicitly allows additional companions.

Flat organization alone does not make a directory note. CLI command pages are individual notes grouped two levels deep; each command file still has its own frontmatter and identity.

## Aggregation model

The corpus is a graph of focused maps rather than a single hierarchy:

- Molds aggregate typed references to patterns, commands, schemas, prompts, and examples.
- Pipelines aggregate Molds and routing annotations into journeys.
- Patterns aggregate corpus evidence and link to related actions.
- Meta records aggregate the Foundry's own design decisions.

No separate navigation-hub kind is required. Generated dashboard and index pages project this graph for browsing; they are not additional sources of truth.

## Deliberate non-notes

`content/meta/glossary.md` shares the design-record directory but is deliberately excluded from the `meta` collection. It has its own renderer and term anchors. `content/log.md` is an append-only operations record excluded from normal note validation and collections. Sharing a directory is a filing decision, not a type declaration.

Change this record when a kind, base metadata rule, tag rule, link contract, reference relationship, or companion model changes.
