---
type: meta
title: "Content Model"
record_kind: infrastructure
order: 5
tags:
  - meta
status: reviewed
created: 2026-08-02
revised: 2026-08-03
revision: 3
summary: "How Foundry notes, kinds, metadata, tags, links, references, and companions represent knowledge."
---

This record owns the representation of knowledge under `content/`. It answers **what is a Foundry note and how do notes relate?** Package dependencies belong to [[code-architecture]], processing flows to [[build-and-validation]], and physical placement to [[repository-layout]].

## Notes, kinds, and identity

A **Note** is a Markdown source file whose frontmatter declares exactly one `type`. That type selects a **Kind** definition: the metadata contract, file-or-directory shape, and permitted companions.

The kinds fall into four groups. **`meta`** is the design record — the one kind whose subject is the Foundry itself rather than Galaxy workflow construction. **`mold` and `pipeline`** are what acts: an abstract action, and an ordered journey of actions. **`pattern`, `source-pattern`, `cli-tool`, `cli-command`, `schema`, and `prompt`** are the reference content a Mold cites, each carried into a bundle its own way. **`research`** is background synthesis holding its own vendored sources.

`packages/note-schema/src/types/<kind>/` holds each kind's schema, its `kind.md` rationale, and a minimal `example.md`; `kinds.generated.json` beside them is the enumeration a consumer reads, derived from those definitions rather than restated. [[repository-layout]] owns where each kind's notes sit under `content/`.

Kind is never inferred from a tag, and every kind is its own literal rather than a member of one broad kind carrying a discriminating enum field. The literal is what makes the collection and the declared kind agree, or fail: a shared enum makes every field legal on every member, and would let a `cli-command` note sit at `content/cli/<tool>/index.md` — where a `cli-tool` belongs — and still validate. Paths route files into collections; the note's literal `type` must agree with the collection's declared kind.

Identity is the note's path within its collection, slugified — `gxwf-validate` for `content/cli/gxwf/validate.md`, `summarize-nextflow` for a Mold that sits at the root of its own. A link's target is slugified and matched against that. Around it the instance registers aliases, which fill an address only if no note already holds it outright: the note's **basename**, which is how nearly every link in `content/` is written and the only address this corpus had for most of its life; and a `tool command` pair, because a Mold author writes `[[gxwf validate]]` rather than the slug. The walk, the precedence and the lookup come from `@galaxy-foundry/content-reader` and `@galaxy-foundry/wiki-links`; which aliases exist is ours.

Precedence is why the qualified form is the primary. Two notes can share a basename — a Mold and a CLI page both called `summarize-nextflow` do — and under basename-only addressing which one `[[summarize-nextflow]]` reached depended on which collection was walked last. It now reaches the note whose identity that *is*, and the other keeps `foundry-summarize-nextflow`.

## Frontmatter envelope

Every note carries the base lifecycle envelope:

- `type`, selecting the kind;
- at least one registered `tags` value;
- `status`: `draft | reviewed | revised | stale | archived`;
- `created`, `revised`, and integer `revision`;
- a 20–160 character `summary`.

Each kind adds only fields meaningful to that kind. Definitions are strict: an unknown key is an error rather than silently accumulated metadata. The zod definitions in `@galaxy-foundry/note-schema` are the single authority used by validation, the site, and kind-manifest generation.

Strictness is not only tidiness. An undeclared key is also an unvalidated key, and YAML will silently coerce it: a version pin left unquoted arrives as a float, where `1.20` and `1.2` are the same YAML number and two different pins. Declaring a field is what puts a type on it — the `id` on a Pattern's IWC exemplar step is a declared union of string-or-integer in `packages/note-schema/src/types/pattern/schema.ts`, because a Galaxy step id is sometimes `3` and sometimes `fastqc`, and declaring it makes that ambiguity a decision rather than a discovery.

Mold IO schemas are a different contract. They validate artifacts passed between Molds; they do not validate note frontmatter. Their human-facing schema notes live under `content/schemas/`, while the JSON schema implementation stays with its producer package or the runtime `foundry` package. See [[schema-packages]].

## Tags and facets

`meta_tags.yml` is a closed controlled vocabulary. A tag is valid because a declared facet lists it, not because its text resembles a prefix. Facets are cross-cutting browse axes—currently including source, target, tool, CLI, topic, prompt, and Foundry-meta concerns. Note kind remains the `type` discriminator and is never duplicated as a tag.

The registry has two corpus-level drift rules: a note may not use an undeclared tag, and a declared instance tag or facet may not remain unused. Shared inherited vocabularies are not treated as instance-authored dead vocabulary.

## Links

Body prose and selected frontmatter fields use Obsidian-style `[[Target]]` links. The validator and renderer share one parser and resolver. Resolution is exact after normalization — there is no prefix fallback, so an unresolved link fails validation or renders visibly unresolved rather than landing on an arbitrary near-match. Code spans are excluded because a backticked `[[Target]]` names the syntax rather than creating a link.

That exclusion cuts both ways, and the second edge is the sharp one: `validateBodyWikiLinks` strips code spans *before* it scans, so a backticked link is not merely unrendered — it is unchecked. It can name a note that never existed and neither the site nor the validator will say so. Wrap a wiki link in backticks only when the literal token is the subject: a template slot, a frontmatter field shape, or a shell construct like `[[:space:]]` that is not a wiki link at all.

Links are one-directional and backlinks are derived. The site computes incoming references from the same link fields, so a relationship shows on both notes while being written once. A note is never asked to list what points at it.

## Typed references

A wiki link expresses knowledge navigation. A Mold **Reference** adds compilation behavior: its `kind`, `load`, `used_at`, `modes`, and `evidence` fields tell casting how the target participates. Patterns, prompts, schemas and examples are copied verbatim, CLI commands are serialized as sidecars, and evaluation companions are omitted. [[mold-spec]] owns the authoring contract and [[casting]] owns dispatch semantics.

## Directory notes and companions

Directory-shaped kinds own a directory whose `index.md` is the only frontmatter-bearing note. Files beside it are **Companions**, not independent notes. Each kind declares allowed companion names or patterns, whether each is required or recommended, and whether it ships in casts.

Examples include Mold `eval.md`, `scenarios.md`, `refinement.md`, `refinements/`, and `examples/`; Pipeline `eval.md` and `scenarios.md`; Prompt `upstream.prompt`; and Research vendored source files. Undeclared siblings are rejected unless the kind explicitly allows additional companions.

Flat organization alone does not make a directory note. CLI command pages are individual notes grouped two levels deep; each command file still has its own frontmatter and identity.

## Payload mechanisms

Several notes are render-wrappers: the `.md` is human-facing, but the consumable payload is a separate structured file that casting must land in the bundle. Four mechanisms carry such a payload. They share one shape — something names the file, the validator confirms it is there, the caster copies it — and differ in where the payload lives and what casting does with it.

| Mechanism | Payload source | Casting behavior | Declared by |
|---|---|---|---|
| `package_export` | npm runtime export | imported and serialized, schema-validated | note frontmatter (`schema`) |
| `companions` | sibling file(s) | copied verbatim, hash parity | note frontmatter, admitted only where the kind declares `additionalCompanions: allow` (`research`) |
| `license_file` | `LICENSES/<file>` | copied verbatim for redistribution | note frontmatter (any vendoring note) |
| kind companion | fixed sibling at a fixed name | copied verbatim | the kind (e.g. Prompt `upstream.prompt`) |

`package_export` and `companions` are one concept split by payload location; they stay separate fields because import-and-stringify with schema validation and verbatim-bytes-with-hash-parity are genuinely different behaviors. `companions` attaches to the **note**, not to the consuming Mold, so a note many Molds reference declares its siblings once.

The kind-declared form is the cheapest and the default: wherever a kind admits a fixed set of payloads at fixed names, the kind says so and the validator asks whether the file is *there* rather than whether a declared path resolves. A per-note field in that position could only restate the kind's own layout. `companions:` frontmatter is correspondingly narrowing — it survives for `research`, whose notes have nowhere else to declare anything, and the kind is still what admits it: casting reads `additionalCompanions` before it reads the note. **Before adding a fifth mechanism, check whether one of these four already fits.**

## Pipeline phases

A Pipeline's `phases:` is an ordered array in which each item is exactly one phase:

```yaml
phases:
  - mold: "[[summarize-nextflow]]"          # Mold-shaped phase
  - mold: "[[implement-galaxy-tool-step]]"
    loop: true                              # runs per workflow step
  - branch: discover-or-author              # routing, not a Mold
    branches:
      - "[[discover-shed-tool]]"
      - fallthrough: "[[author-galaxy-tool-wrapper]]"
  - branch: test-data-resolution
    chain:
      - "[[paper-to-test-data]]"
      - "[[find-test-data]]"
      - user-supplied                       # terminal fallback
```

`branch` values come from a closed vocabulary of named routing patterns. Wiki links inside a `branch` block resolve through the same validator pass as Mold-shaped phases. The phase-kind set is open: a new inline kind such as `gate` is coined when a real pipeline needs it, and unrelated behaviors do not share an umbrella. [[harness-pipelines]] owns what the phases mean to a harness.

## Aggregation model

The corpus is a graph of focused maps rather than a single hierarchy:

- Molds aggregate typed references to patterns, commands, schemas, prompts, and examples.
- Pipelines aggregate Molds and routing annotations into journeys.
- Patterns aggregate corpus evidence and link to related actions.
- Meta records aggregate the Foundry's own design decisions.

No separate navigation-hub kind is required. Generated dashboard and index pages project this graph for browsing; they are not additional sources of truth.

## Deliberate non-notes

`content/meta/glossary.md` shares the design-record directory but is deliberately excluded from the `meta` collection. It has its own renderer and term anchors. `content/log.md` is an append-only operations record excluded from normal note validation and collections. Sharing a directory is a filing decision, not a type declaration.

Not being claimed by a collection is not the same as being accounted for: a file nobody meant to add is equally unclaimed. Every non-note is therefore *declared*, in `NOT_NOTES` beside `COLLECTIONS`, with the reason it is not a note. Markdown under `content/` must be one of exactly three things:

| accounted for by | who answers for it |
|---|---|
| a collection claims it | the routing table |
| a directory note owns the directory it sits in | that kind's companion declaration |
| `NOT_NOTES` declares it | the allowance table |

`validateUnroutedContent` errors on anything else, which is what keeps the residue empty by construction rather than by having been looked at recently. The rule is markdown-only: every collection pattern selects `.md`, so fixtures and vendored sources under `content/` are data, governed by the companion declaration of whichever note owns their directory.

Change this record when a kind, base metadata rule, tag rule, link contract, reference relationship, or companion model changes.
