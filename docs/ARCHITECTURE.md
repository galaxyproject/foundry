# Architecture

Galaxy Workflow Foundry architecture, anchored on the **physical file layout** of the foundry repo. Working premise: organize the data well — typed frontmatter, registered tags, wiki-linked references, generated indexes — and the skills, validation, and rendering fall out naturally.

## 1. Component map

External:
- **IWC corpus** — the canonical Galaxy workflow corpus at `https://github.com/galaxyproject/iwc`. Pattern pages cite IWC workflows by URL (optionally pinned to commit SHA per citation). Not mirrored into the Foundry; not a build-time dependency. `workflow-fixtures/` lives as a top-level directory inside the Foundry checkout — a generated-corpus workspace for authoring/survey evidence, outside `content/`, with gitignored outputs (`pipelines/`, `cwl/`, `iwc-src/`, `iwc-cleaned/`, `iwc-format2/`, `iwc-skeletons/`). Not part of the content model; not a runtime/cast dependency. See `CORPUS_INGESTION.md`.
- **gxwf** — design-time CLI; called by Molds (and by validation tooling) for schema validation, tool search/discovery, conversion. TS and Python implementations with a shared interface. Lives in its own repo(s).
- **Planemo** — runtime CLI; executes Galaxy and CWL workflows. Used by `run-workflow-test` and `debug-*-workflow-output` Molds at generated-skill runtime, not by the Foundry directly.

Foundry-internal (in the `foundry/` repo):
- **Pattern pages** — Foundry reference content (collection manipulation, tabular, conditional, custom-tool authoring, …). Hand-authored. Wiki-linked from Molds. **IWC is referenced by URL in pattern bodies**, not mirrored — see `CORPUS_INGESTION.md`.
- **Source-pattern pages** — source-to-target mapping reference under `content/source-patterns/`, currently focused on Nextflow-to-Galaxy translation patterns.
- **CLI manual pages** — per-command/subcommand reference content for the CLIs Molds wrap (`gxwf`, `planemo`, …). Hand-authored or seeded from `--help` then humanized. Wiki-linked from action Molds (e.g., `advance-galaxy-draft-step` → `cli/gxwf/draft-validate`). Cast to JSON sidecars, not inlined as prose.
- **Research / reference notes** — background syntheses (e.g., Nextflow testing, CWL conformance) that aren't actions and aren't Galaxy patterns.
- **Molds** — directory-per-Mold (`molds/<name>/`), with `index.md` source artifact, `eval.md` evaluation plan, optional companions. Authored as **typed reference manifests** (frontmatter declares typed references to patterns, manpages, schemas, prompts, examples) with a procedural body skeleton.
- **Prompts** — wrapper notes under `content/prompts/` that add Foundry metadata and usage framing around raw prompt sidecars. Molds reference the wrapper via `kind: prompt`; casting copies the raw `upstream.prompt` verbatim.
- **Schemas (Mold IO)** — JSON Schema Draft 07 files declaring Mold input/output shapes. Each has a `type: schema` content note under `content/schemas/<name>.md`; the JSON itself lives with its producer (`@galaxy-foundry/summarize-nextflow` for `summary-nextflow` and the nf-core meta schemas) or in `@galaxy-foundry/foundry` (orphan schemas with no in-repo TS producer: `summary-cwl`, `galaxy-tool-discovery`, `galaxy-tool-summary`, `tests-format`). The `tests-format` JSON is synced from upstream `@galaxy-tool-util/schema`. Mold frontmatter cites schemas via `[[wiki-link]]` to the note; the note declares `package` + `package_export` (cast imports the runtime export and serializes it) and `validator_bin` + `validator_subcommand` (skills validate via `foundry validate-<name>`). See `SCHEMA_PACKAGES.md`.
- **Frontmatter schema** — the zod contract in `@galaxy-foundry/note-schema` (`buildNoteSchema`), the single source of truth shared by the validator and the Astro site. Distinct from the Mold IO schemas under `content/schemas/`.
- **Tag registry** — `meta_tags.yml`, controlled vocabulary injected into the note-schema factory at build time.
- **Cast skills** — produced by casting from Molds. Per-target output layout under `casts/<target>/<name>/`.
- **Tooling** — TypeScript build/authoring commands ship as `@galaxy-foundry/build-cli` (`foundry-build`). Root `scripts/` files provide repo-local wrappers, vendored-upstream sync, smoke checks, and one-time maintenance utilities. No Python in the toolchain.
- **Slash commands** — `.claude/commands/*.md`, checked into the repo, codify the agent workflows.
- **Static site** — Astro renderer over the foundry's content collections, deployed to GitHub Pages.

Consumers (external):
- **Harnesses** — orchestration that consumes generated skills or other cast artifacts. What a *sophisticated* harness is — stateful, resumable, approval-gated, Archon-style — is an open research question (§15); those live in their own repos and the Foundry produces the artifacts they load. The only in-repo harnesses today are **stop-gaps**: a pipeline assembled into a trivial linear `pipeline-<slug>` skill that runs its phase casts in order. Trivial exercises of the pipeline spine, enough to test-drive the casts end-to-end — not the production harness surface.
- **Web applications** — consume `web`-target casts.

## 2. Concepts and vocabulary

Authoritative term definitions live in `content/meta/glossary.md`; this section is the architectural picture.

- **Note** — a single `.md` file with frontmatter under the foundry's content root. Identity = filename stem, used as the wiki-link target.
- **Type** — the single note-kind discriminator (`type:` in frontmatter): `mold | pattern | source-pattern | cli-tool | cli-command | pipeline | research | schema | prompt`. The `buildNoteSchema` discriminated union and the whole site (`data.type`) key off it; note-kind is never re-encoded as a tag. Within a type, further shape comes from typed fields (Molds use `axis`, `source`, `target`, `tool`), not a subtype.
- **Tag** — controlled label declared in `meta_tags.yml`, reserved for **cross-cutting facets only** (never note-kind). Every tag is declared by a facet — `source`, `target`, `tool`, `cli`, `topic`, `prompt`, `meta` — which is what makes it valid; the slash in `source/paper` is naming convention, not a rule. Further subject-area facets bloom as content lands — see §4.
- **Mold** — `content/molds/<slug>/index.md`. Directory-based note: `index.md` is the only top-level frontmatter-bearing file; the companions its kind declares (`eval.md`, `scenarios.md`, `refinement.md`, `refinements/`, `examples/`, `casting.md`, `cast-skill-verification.md`, `changes.md`, `README.md`) ride along verbatim. Files under `refinements/` are the one carve-out: each refinement-journal entry carries small structured frontmatter. Content shape: typed reference manifest in frontmatter + procedural body skeleton.
- **Pattern** — single `.md` under `content/patterns/`. Reference content. IWC citations live in the body as URLs; see `CORPUS_INGESTION.md`. Wiki-linked from Molds.
- **Source-pattern** — single `.md` under `content/source-patterns/<source>/`. Reference content mapping source-system structures to target-system constructs, with `source_pattern_kind`, `source`, `target`, and `implemented_by_patterns` frontmatter.
- **CLI tool** — single `.md` at `content/cli/<tool>/index.md` (e.g., `content/cli/gxwf/index.md`, `content/cli/planemo/index.md`). Tool-level install metadata (`origin`, `package`, `package_version`, `invoke`, `invoke_fallback`, `availability_check`, `docs_url`) aggregating install instructions for every CLI command note under the same tool. Wiki-linked from Molds; aggregated into the cast bundle's Required Tools section.
- **CLI command** — single `.md` under `content/cli/<tool>/<cmd>.md` (e.g., `content/cli/gxwf/tool-search.md`, `content/cli/gxwf/validate.md`). Reference content describing one CLI command/subcommand: synopsis, args, flags, examples, exit codes, output shape, error patterns, gotchas. Wiki-linked from Molds. Cast to a JSON sidecar (not inlined as prose) by casting's `cli-command`-kind dispatch.
- **Pipeline** — directory note under `content/pipelines/<slug>/` (`index.md` is the only frontmatter-bearing file; optional `eval.md` / `scenarios.md` siblings carry the pipeline-level oracle and end-to-end journeys). Ordered sequence of phases that compose into a harness journey (e.g., `nextflow-to-galaxy/`, `paper-to-galaxy/`). **Dual purpose**: (a) build artifact — names the Molds a harness will orchestrate; (b) navigation primitive — renders as a "subway map" / journey index over the KB. Each phase is a `mold` reference, a `[loop]`-flagged Mold, or a `[branch]`-flagged routing step (not a Mold; harness-level orchestration — binary branches with fallthrough, or N-step fallback chains). Other inline harness annotations (e.g., `[gate]` for an approval / scope-confirmation checkpoint) will be coined when they first surface as inline phases; the set is open and not pre-enumerated. Pipelines are *not* cast; they are referenced content. Machine-checked: every phase resolves to a Mold (or is explicitly a non-Mold annotation like `[branch]`). A Mold need not belong to any pipeline — standalone and indirectly-invoked Molds are first-class.
- **Schema** — single `.md` under `content/schemas/`. Renderable reference note for a JSON Schema package/export or vendored schema artifact.
- **Prompt** — directory note under `content/prompts/<area>/<slug>/`: `index.md` is the wrapper, `upstream.prompt` beside it is the raw text. The wrapper is human-facing and linkable; the raw sidecar is what casting packages. The sidecar's name is fixed by the kind rather than declared per note, so there is no path to resolve and none to get wrong.
- **Cast** / **Casting** / **Cast skill** / **Cast target** — per `content/meta/glossary.md`. The cast directory tree (`casts/<target>/<name>/`) is generated from Molds, committed to the repo, and skipped by the validator.
- **Wiki link** — Obsidian-flavored `[[Target]]`. First-class in both frontmatter (typed fields like `parent_pattern`, `related_patterns`, `related_notes`) and body prose (resolved by a remark plugin in the site).
- **Log** — `content/log.md`, append-only journal of foundry operations (`cast`, `lint`, `query`). Excluded from validator and site collection.

The Foundry's content types each aggregate references — Molds aggregate patterns/CLI/schemas/examples, Pipelines aggregate Molds in order, Patterns aggregate IWC URLs and link out to companion Molds. Each is a focused MOC; no separate "navigation hub note" type is needed.

- **Slash command** — repo-checked-in agent workflow under `.claude/commands/` (e.g., `/draft-mold`, `/draft-pattern`, `/cast`).

The content root is `content/` — the Astro idiom, and accurate to a new contributor since the Foundry isn't an Obsidian vault by intent.

## 3. Note types

Source of truth: the `buildNoteSchema` discriminated union in `@galaxy-foundry/note-schema` (per-type `.strict()` members + cross-field `superRefine`s). `type` is the sole note-kind discriminator; the `Facet tag(s)` column lists only the cross-cutting facets a note of that kind typically carries (never a note-kind tag).

| `type` | Required-extra | Facet tag(s) | Directory |
|---|---|---|---|
| `mold` | `name`, `axis` | `source/*`, `target/*`, `tool/*` per axis | `content/molds/<slug>/index.md` only |
| `pattern` | `title`, `pattern_kind`, `evidence` | `target/*`, `topic/*` | `content/patterns/` |
| `source-pattern` | `title`, `source`, `target`, `source_pattern_kind`, `implemented_by_patterns` | `source/*`, `target/*` | `content/source-patterns/<source>/` |
| `cli-tool` | `tool`, `origin`, `package`, `invoke` | `cli/<tool>` | `content/cli/<tool>/index.md` |
| `cli-command` | `tool`, `command` | `cli/<tool>` | `content/cli/<tool>/` |
| `pipeline` | `title`, `phases` | optional `source/*`, `target/*` | `content/pipelines/<slug>/index.md` only |
| `research` | (base only) | `source/*`, `target/*`, or `meta` | `content/research/` |
| `schema` | `name`, `title` | `target/*`, `source/*`, or `meta` | `content/schemas/` |
| `prompt` | `title` | optional `prompt/*` | `content/prompts/<area>/<slug>/index.md` only |

`mold`, `pipeline`, and `prompt` have a **directory-placement contract** enforced by the validator's `findMdFiles` (sibling files in `content/molds/<slug>/`, `content/pipelines/<slug>/`, and `content/prompts/<area>/<slug>/` are skipped — only `index.md` is validated). They are the three directory-note types; `docs/` holds long-form design docs.

`cli-command` notes are *not* directory-based — each command is a flat single file. The two-level `content/cli/<tool>/<cmd>.md` directory structure is for organization, not directory-note semantics.

`research` is a flat kind (no subtype): it covers self-design notes plus background syntheses (e.g., the existing `COMPONENT_NEXTFLOW_WORKFLOW_TESTING` content lands as a `research` note).

## 4. Tag system

`meta_tags.yml` groups the entire allowed tag vocabulary into **facets** — each declaring a `label`, a `description`, and its `values` (tag → one-line gloss). Tags are cross-cutting facets only; note-kind is the `type:` discriminator, never a tag.

```yaml
version: 1
facets:
  meta:
    label: Meta
    description: Foundry-meta notes — the Foundry's own tooling, or an external harness it evaluates.
    values:
      meta: "Foundry-meta note — about the Foundry's own tooling, casting system, or an external harness/tool it evaluates"
  target:
    label: Target
    description: What system a Mold produces for.
    values:
      target/galaxy: "Mold targets Galaxy"
```

Three rules carry the weight:

- **Membership is declared, not parsed.** A tag is valid because its facet lists it under `values`, never because its text starts with a facet name — `target/not-a-real-thing` is as invalid as `nonsense`. The slash is therefore a naming convention, and a bare key like `meta` is an ordinary member rather than a special "flat flag" case. The browse pages group by the *declaring* facet, which is what makes an "other" bucket impossible rather than merely empty.
- **Every facet is closed.** Each tag is listed with a gloss, and there is no open/free-form/prefix-wildcard family. A tag is registered and documented, or it does not validate — so this file is the complete, permanent catalog of what the corpus can carry, and `/tags` always has something to render beside every entry.
- **`tags` is `minItems: 1`.** Every note carries at least one tag, always a facet. There is no note-kind tag and no type↔tag coherence check.

`buildNoteSchema` takes the registry (`loadTagRegistry` from `@galaxy-foundry/note-schema`) and asks it for membership, so there is no static tag enum to maintain. Vocabulary changes touch one file; the schema code stays static. The separation is load-bearing.

The facets today: `meta` (Foundry-meta notes), `prompt` (reusable prompt families), `cli` (CLI affiliation — every `cli-tool`/`cli-command` note carries one, driving per-tool browse pages), `source` / `target` (what a Mold consumes and produces for), `tool` (which CLI surface a Mold wraps — distinct from `cli`, which says what a note is *about*), and `topic` (Foundry-authored pattern/MOC subject maps).

`tests/registry-drift.test.ts` checks the converse of what the schema checks: the schema rejects a note carrying an unregistered tag, and the drift test rejects a registered tag carried by zero notes, or a facet with no members in use. It is a corpus-level test rather than a `validateDirectory` check because that runs against arbitrary directories — including fixtures where nearly every registered tag is legitimately unused.

The registry **format** is shared across Foundry instances (spec: [galaxyproject/foundry-pattern](https://github.com/galaxyproject/foundry-pattern), `content/pattern/standing-up-a-foundry.instructions.txt`), so a format change is a cross-repo change. The facet **vocabulary** above is ours; the Statistical Genomics Foundry's is `family`/`role`/`domain`/`topic`, and only `topic` collides by name — ours groups pattern maps, theirs sits beneath a `domain`.

**Subject-area tags are demand-driven.** A general Galaxy code/feature taxonomy (collections, tools, conditionals, ...) is not committed up front. Tag families bloom as patterns surface real cross-cutting needs — and each one arrives as registered keys with glosses, never as an open family declared in advance. An `iwc/*` family (IWC corpus categories, seeded from the clone's directory layout) was declared this way and carried zero notes: patterns cite IWC by URL in the body instead (`CORPUS_INGESTION.md`), so it was dropped rather than filled in.

Every note still carries at least one tag (`tags` is `minItems: 1`), but that tag is always a facet — there is no note-kind tag and no type↔tag coherence check.

## 5. Frontmatter schema

The frontmatter contract is the zod schema built by `buildNoteSchema` in `@galaxy-foundry/note-schema`.

**One directory per note kind**, under `packages/note-schema/src/types/`. Each holds `schema.ts` (that kind's contract), `kind.md` (what the kind is for, and why each required field is required), and `example.md` (a minimal valid note, which `test/kind-directories.test.ts` parses against that kind's own schema — so the documentation stays executable). `types/context.ts` holds the base envelope and the field primitives shared by more than one kind; `types/index.ts` is the one enumeration of the kinds, and a drift test asserts it matches the directory listing both ways. `note-schema.ts` is the assembler and nothing else: it composes those definitions into the discriminated union and defines no fields of its own. To add or change a field, edit that kind's `schema.ts`. `types/kinds.generated.json` is the machine-readable form of this section, derived from the zod shapes (§8).

**Base required (everywhere)**: `type`, `tags`, `status`, `created`, `revised`, `revision`, `ai_generated`, `summary`.

- `status` enum: `draft | reviewed | revised | stale | archived`. Drives badge rendering and `archived` filtering throughout the site.
- `summary`: `string`, `minLength: 20`, `maxLength: 160` — forced compression. Powers `Index.md`, dashboard tooltips, and link previews.
- `revision`: `integer >= 1`; bumped by hand on every edit.
- `created` / `revised`: ISO date strings (`z.coerce.date()` in the schema; the validator adds a separate `YYYY-MM-DD` format pass).
- `tags`: array, `minItems: 1`, items checked for membership in `meta_tags.yml`.
- `ai_generated`: boolean.

**Per-type required fields** are expressed as a zod `discriminatedUnion("type", …)`: each note type is its own `.strict()` member that declares exactly the fields it requires. Cross-field rules that a single member can't express (a `source-specific` mold requires `source`; an external-upstream `schema` note requires `license`) live in a `superRefine` on the union.

| `type` | required beyond the base |
|---|---|
| `mold` | `name`, `axis` (+ `source`/`target`/`tool` per axis) |
| `pattern` | `title`, `pattern_kind`, `evidence` |
| `source-pattern` | `title`, `source`, `target`, `source_pattern_kind`, `implemented_by_patterns` |
| `cli-tool` | `tool`, `origin`, `package`, `invoke` |
| `cli-command` | `tool`, `command` |
| `pipeline` | `title`, `phases` |
| `schema` | `name`, `title` |
| `prompt` | `title` |

**Foundry-specific field types**:
- `axis`: enum `[source-specific, target-specific, tool-specific, generic]` (Mold).
- `source`: enum `[paper, nextflow, cwl, snakemake, interview, freeform]` (Mold, when `axis` includes source-specific; source-pattern source).
- `target`: enum `[galaxy, cwl, web, generic]` (Mold or cast-related; when applicable).
- `tool`: enum `[gxwf, planemo, ...]` (Mold when tool-specific; required on `cli-command`).
- `command`: string (required on `cli-command`; may be dotted for subcommands, e.g., `tool-search` or `workflow.test`).
- `phases`: array (required on `pipeline`). Each item is one phase. Current shape:

  ```yaml
  phases:
    - mold: "[[summarize-nextflow]]"          # Mold-shaped phase
    - mold: "[[implement-galaxy-tool-step]]"
      loop: true                              # [loop] — runs per workflow step
    - branch: discover-or-author              # [branch] — routing, not a Mold
      branches:
        - "[[discover-shed-tool]]"
        - fallthrough: "[[author-galaxy-tool-wrapper]]"
    - branch: test-data-resolution
      chain:
        - "[[paper-to-test-data]]"
        - "[[find-test-data]]"
        - user-supplied                       # terminal fallback
  ```

  Each phase is exactly one of: a `mold` Mold-reference (optionally `loop: true`), or a `branch` orchestration step with a named pattern (`discover-or-author`, `test-data-resolution`, …) and its own shape. Wiki links inside `branch` blocks are resolved by the same validator pass as Mold-shaped phases.

  Other inline phase kinds — e.g., `gate` for an approval / scope-confirmation checkpoint — are coined when they first appear inline. The phase-kind set is **open**; we don't pre-enumerate. `branch` and `gate` are unrelated behaviors and don't share an umbrella.

**Mold = typed reference manifest.** A Mold's frontmatter declares operational dependencies through `references:` plus explicit IO schema fields. `MOLD_SPEC.md` owns the authoring contract. `reference_contract.yml` owns the vocabulary for kind — the one part that varies by domain — while usage timing, load behavior, transform mode, and evidence labels describe the compilation machinery and are inherited from `@galaxy-foundry/reference-contract`. Producer-owned `output_artifacts[].schema` links resolve to `type: schema` notes; consumers inherit schema contracts through shared artifact `id`s. The validator resolves each kind with its own check; casting dispatches per kind — see `COMPILATION_PIPELINE.md`.

**Wiki-link frontmatter fields** (regex `^\[\[.+\]\]$`):
- `parent_pattern` (single, optional).
- `related_notes` (array).
- `related_patterns` (array).
- `related_molds` (array; discouraged for operational dependencies; factor shared content into patterns, CLI manual pages, schemas, prompts, examples, or research notes).

Pattern notes can declare `iwc_exemplars` metadata with abstract IWC workflow IDs. Polished prose cites IWC workflows by URL or abstract ID rather than generated fixture paths (see `CORPUS_INGESTION.md`).

**Strict mode**: `additionalProperties: false`. Every conditional field declared at top level.

## 6. Validation pipeline

`foundry-build validate` is the validator entry point. `scripts/validate.ts` is a root-level wrapper around the package CLI. Dependencies: **`@galaxy-foundry/note-schema`** (the shared zod frontmatter contract + registry loaders), **gray-matter** (frontmatter parse), **js-yaml** (load the tag registry).

Layered validation (`validateData` orchestrates):
1. **`preprocessFrontmatter`** — normalize parsed dates (gray-matter / js-yaml may produce `Date` objects) to ISO strings before schema check.
2. **`validateSchema`** — Ajv compiled against the schema with tag enum injected at load time.
3. **`validateDates`** — second pass on `created` / `revised` via strict ISO parse.
4. **`validateWikiLinks`** — regex-checks the inner text of `[[...]]` for whitespace-only payloads.
5. **`validateBidirectionalRelatedNotes`** (cross-file) — builds slug→file map; warns on asymmetric `related_notes` links.
6. **`validateMoldRefs`** — every Mold's typed references resolve, per kind:
   - `related_patterns` and `related_molds` resolve to notes of the expected type.
   - `references[].kind` dispatches to note-type checks for `pattern`, `cli-command`, `research`, and `schema`; schema refs must target `type: schema` notes with `package` and `package_export`.
   - `example` refs are repo paths under `content/`.
   Failures error. The per-kind dispatch here is the static-validation analog of casting's per-kind dispatch.
7. **`validateSourcePatternRefs`** — every `source-pattern` note's `implemented_by_patterns` links resolve to `type: pattern` notes.
8. **`validatePipelinePhases`** — every `pipeline` note's `phases` items resolve:
   - `mold`-shaped phases — wiki link resolves to a `type: mold` note.
   - `branch`-shaped phases — `branch` value is a known routing pattern; embedded wiki links (in `branches`, `chain`, etc.) resolve to `type: mold` notes.
   - Other phase kinds (e.g., `gate`) — validated per the kind's own shape when introduced.
   Failures error. Pipeline membership is not required of a Mold — standalone and indirectly-invoked Molds are first-class, so no coverage warning is emitted.
9. **Artifact graph and layout checks** — producer/consumer artifact IDs, producer-owned `output_artifacts[].schema` links, schema vendoring metadata, schema `validator_bin` package bins, Mold source layout, CLI command docs, pattern evidence, body wiki links, and Mold stub bodies.

`findMdFiles` does not decide which files are notes. It walks `content/` and routes what it finds through `COLLECTIONS`:

```ts
if (entry.startsWith(".")) continue;                        // .obsidian and friends
if (!collectionOf(`${CONTENT_DIR}/${rel}`)) continue;       // the table decides
```

Everything the old skip rules named falls out of the table rather than being restated: `Dashboard.md` / `Index.md` / `log.md` sit at the content root and `glossary.md` in `content/meta/`, and no collection's base reaches either; `molds` and `pipelines` glob `**/index.md`, which is directory-note semantics stated as a pattern; `casts/` is outside `content/` entirely. Dotfiles are the one exclusion left in code, because `.obsidian/` holds markdown that is editor state and no glob would tell it apart from a note.

**One shared module, no drift.** Because everything is TS, anything both the validator and the Astro site depend on lives in **one shared module** imported by both. The wiki-link slug + resolver now lives one level further out, in `@galaxy-foundry/wiki-links`, shared across Foundry instances; `packages/build-cli/src/lib/wiki-links.ts` and `site/src/lib/wiki-links.ts` are thin adapters over it that add this instance's map and return shapes. The **frontmatter schema and reference contract** likewise live in `@galaxy-foundry/note-schema` — `buildNoteSchema` and the registry loaders — which both the validator and `site/src/content.config.ts` build from. No parallel implementations, no drift risk.

The **license → redistribution-policy table** goes one step further: it is shared across Foundry *instances*, not just across our own consumers, so it ships in `@galaxy-foundry/license-policy` rather than sitting at our repo root. `bundledPolicy()` reads the copy inside that dependency; changing a row is a version bump there, not an edit here. What stays ours is *coherence* — whether a given note is consistent with its licence (`validateSchemaVendoring`) — because that rule genuinely differs between instances.

`tests/validate.test.ts` (Vitest) builds the *real* shared schema (from `meta_tags.yml` + `reference_contract.yml` + the packaged reference-contract and license tables) and exercises `validateData` (unit) and `validateDirectory` (integration with `tmp` directories).

## 7. Wiki links

**Frontmatter wiki-link fields**: `parent_pattern`, `related_notes`, `related_patterns`, `related_molds`. All shape-checked against `WIKI_LINK_RE` from the package — the zod schemas in `@galaxy-foundry/note-schema` import it rather than restating the pattern, as do the two site components that ask whether a string is link-shaped.

**Format**: `[[Target Name]]`. Pipe-aliasing supported in body (`[[Target|display]]`) by the remark plugin; not in frontmatter.

**A backtick means the syntax, not a link.** Wiki links inside `inlineCode`, a fenced block, or raw HTML are left exactly as written — that is how this document names the token, and how a note names a slot it cannot link (`[[summary-<source>]]` in `content/research/gxy-sketches-alignment.md`). Only text is rewritten.

The rule cuts both ways, and the second edge is sharp: **`validateBodyWikiLinks` strips code spans before it scans**, so a backticked link is not merely unrendered — it is unchecked. It can name a note that never existed and nothing will say so. The corpus had accumulated 63 real citations written that way, invisible on both surfaces at once; they were unwrapped in one sweep. What stays deliberately wrapped is exactly the literal cases: the placeholder above, the field shapes the glossary and the schema notes quote (`mold: [[...]]`), the three "deep-link a `$def` via `[[note#Anchor]]`" illustrations, and two shell commands where `[[:space:]]` is a POSIX character class and not a wiki link at all.

**Resolution algorithm.** The grammar and the lookup rule ship in `@galaxy-foundry/wiki-links`, shared with the sibling Foundry and the pattern site. The validator, the caster, the site page renderer and the remark transformer all resolve through it, so they cannot answer differently. What stays ours is the MAP — which notes exist and what each is addressable by.

```
slug = lower(name) → "  -  " → "-" → spaces → "-" → strip [^a-z0-9-] → collapse dashes
```

Lookup: **exact match on a basename-keyed map. Nothing else.** Directory-based notes (`molds/<slug>/index.md`) are keyed by their parent directory name. Lets `[[implement-galaxy-tool-step]]` resolve to `content/molds/implement-galaxy-tool-step/index.md`.

There is **no prefix-match fallback**. There used to be, sorted shortest-first, on the theory that it completed a stub an author had half-typed. Resolving all 3,108 corpus links both ways showed it changed the answer for exactly one: `[[...]]` in `content/meta/glossary.md`, which slugifies to the empty string and therefore prefix-matched all 264 map keys, landing on whichever came first. It never once completed a real stub, so an unresolved link now stays visibly unresolved — bold in the body, a validator warning in `--check`.

**Backlinks** computed only from typed frontmatter fields (bounded, fast, author-controlled). Each note page renders an "Incoming References" section grouped by field. Body wiki links are rendered inline but do not contribute backlink edges.

**Bidirectional warning**: validator emits `related_notes: missing backlink to [[X]]`. Asymmetric and informational only.

## 8. Generated artifacts

Generated files are committed to git and CI runs `--check` drift gates before deploy. Most live under `content/`; the one exception is `packages/note-schema/src/types/kinds.generated.json`, which sits beside the schemas it is derived from because its consumer is another repository (the pattern site's cross-instance kind catalog), not this site.

**`Dashboard.md`** — Obsidian Dataview tables, one per section. **`site/src/pages/index.astro`** — same sections rendered as HTML tables.

`dashboard_sections.json` is the single source of truth (each section keys on a note `type`):

```json
[
  { "label": "Pipelines", "type": "pipeline" },
  { "label": "Molds", "type": "mold" },
  { "label": "Patterns", "type": "pattern" },
  { "label": "Source Patterns", "type": "source-pattern" },
  { "label": "CLI Commands", "type": "cli-command" },
  { "label": "Schemas", "type": "schema" },
  { "label": "Research", "type": "research" }
]
```

Pipelines lead the dashboard because they are the **primary task surface** of the Foundry: a contributor or agent landing cold should first see the journeys ("convert a Nextflow workflow to Galaxy"), then drill into Molds / Patterns / CLI as the reference layer beneath. Type-based sections are preserved as the reference surface; pipelines are the journey surface. See §11 for how this propagates to the Astro routes.

`foundry-build generate-dashboard` emits Dataview blocks; the Astro page imports the same JSON. Both filter `status !== 'archived'`, sort `revised DESC`.

**`Index.md`** — flat prose catalog grouped by `type`, alphabetized within each group:

```
- [[slug]] — {summary} *(stale)*
```

`foundry-build generate-index` walks `findMdFiles` (reusing the validator's skip logic), groups by type, emits the file. Directory-note slugs use the parent directory name.

**`kinds.generated.json`** — the machine-readable manifest of the note kinds: for each kind its `layer` (`substrate` or `instance`), summary, and required-metadata list, with the field list **derived from that kind's zod shape** rather than written by hand. `foundry-build generate-kinds` emits it from `packages/note-schema/src/types/`; nothing in this repo reads it (see §5). The field is `layer` rather than `origin` because `origin` is already a frontmatter field on `cli-tool`.

**Drift detection**: `--check` flag on every generator reads the file and string-compares with re-generation; exit 1 on mismatch. Wired into `npm run check:dashboard`, `check:index`, and `check:kinds`.

**Cast-bundle payloads — how a note's non-`.md` payload reaches a bundle.** Casts live under `casts/` (§14), not `content/`. Several notes are render-wrappers: the `.md` is human-facing, but the consumable payload is a separate structured file that casting must copy into the bundle. Three frontmatter mechanisms carry such a payload, sharing one shape (frontmatter names the file → validator confirms it exists → caster lands it in the bundle) but differing in payload source and casting behavior:

| Field | Payload source | Casting behavior | Note type |
|---|---|---|---|
| `package_export` | npm runtime export | imported + serialized (schema-validated) | `schema` |
| `companions` | sibling file(s) | copied verbatim (hash-parity) | `research` / `pattern` |
| `license_file` | `LICENSES/<file>` | copied verbatim (redistribution) | any vendoring note |

`package_export` and `companions` are the same *concept* — wrapper note + vendored structured payload — split only by where the payload lives (npm package vs. checked-in sibling). They stay separate fields because the casting behaviors genuinely differ: import-and-stringify with schema validation vs. verbatim bytes with hash parity. `companions` attaches to the **note**, not the consuming Mold, so a note referenced by many Molds declares its siblings once and every consumer inherits them; the caster desugars each into a synthetic verbatim ref through the normal copy/provenance path.

A fourth payload reaches a bundle without any frontmatter at all: a `prompt` note's `upstream.prompt`, which the **kind** declares as a companion. The validator therefore asks whether the file is *there* rather than whether a declared path resolves. That is the cheaper arrangement wherever a kind admits a fixed set of payloads at fixed names — a per-note field in that position could only ever restate the kind's own layout. Prefer it, and reach for a frontmatter mechanism only when the count or the naming genuinely varies per note. Before adding another payload mechanism, check whether one of these already fits.

`companions:` frontmatter is on the way out for exactly that reason: it exists because nothing at the kind level used to know what sat beside a note, and now every kind says so. It survives only for `research`, whose notes are still flat files with nowhere to declare anything, and it goes when they become directories.

### Layout — what sits beside a note

Every kind declares `shape` (`file` or `directory`) and `companions` — the non-note files a note may carry. The validator checks each directory note against its kind's declaration: a missing `required` companion is an error, a missing `recommended` one a warning, and an **undeclared** file beside a note is an error, because a file the kind does not name is indistinguishable from a misnamed one.

That declaration replaced four disagreeing answers to the same question: two hardcoded allowlists in `validate.ts` (`MOLD_TOP_FILES`, `PIPELINE_TOP_FILES`), a bare `UPSTREAM_PROMPT_FILE` constant for `prompt`, and nothing at all for `cli-tool`. The allowlists could not say a file was *required*; the constant could not say a file was *forbidden*; none of them was reachable from the kind it described, and `docs/MOLD_SPEC.md` carried a fifth copy as prose that had already drifted from the cast target's forbidden-files list.

Whether an entry is a **note** comes from the collection table, never from its extension. `content/cli/<tool>/` is why: `index.md` is a `cli-tool` and every sibling `.md` is a `cli-command`, so that kind has a directory full of markdown and no companions at all.

## 9. Authoring flow

Two authoring entry points:
- **Slash commands** (the agent flow) — primary.
- **Hand-written** + `npm run validate` — for small edits.

The Foundry is not an Obsidian vault by intent; agent-driven authoring through slash commands handles scaffold-prompt-stamp-validate without an interactive plugin in the loop.

Foundry slash commands:
- **`/draft-mold`** — scaffold a new Mold (`molds/<slug>/index.md` + `eval.md`) from a name and axis; cross-ref pass against existing patterns.
- **`/draft-pattern`** — scaffold a pattern page; convention (not enforced) that the page cite at least one IWC workflow URL in `## Exemplars` (corpus-first principle).
- **`/cast`** — wraps `foundry-build cast`; classify Mold → resolve refs → call casting LLM → write `casts/<target>/<name>/` → record `_provenance.json` → append to `log.md`.

There is no IWC ingestion command. IWC is referenced by URL in pattern bodies (see `CORPUS_INGESTION.md`); no ingest-iwc script exists. Background research lands as hand-authored `research` notes.

The keystone agent shape — *classify → fetch → dedup → draft → cross-ref → write → validate → log → regenerate* — is realized in `/cast`.

## 10. Directory-based note types

Two types use the directory-note pattern: **Mold** and **Pipeline**.

**Mold** (`content/molds/<slug>/`):
```
content/molds/summarize-nextflow/
  index.md           ← only file with frontmatter (the "mold.md" of casting)
  eval.md            ← abstract oracle (property checks); never packaged into the cast
  scenarios.md       ← concrete cases (fixtures + expected values); never packaged
  examples/          ← optional walk-throughs
  casting.md         ← optional per-target / casting guidance
```

**Pipeline** (`content/pipelines/<slug>/`):
```
content/pipelines/nextflow-to-galaxy/
  index.md           ← only file with frontmatter (phases spine + journey body)
  eval.md            ← pipeline-level oracle (end-to-end / cross-step properties)
  scenarios.md       ← whole-journey cases
```

`eval.md` / `scenarios.md` co-locate evaluation with the note (improves discoverability and ownership) without bleeding into cast artifacts or the assembled harness. Casting reads `index.md` and refs; never reads `eval.md` / `scenarios.md`.

`docs/` holds long-form Foundry-meta design narrative; the validator's directory-note rule applies to Mold and Pipeline.

Directory-note semantics are a glob in the shared table, not a rule of their own:
```ts
molds:     { base: "content/molds",     pattern: ["**/index.md"], kind: "mold" },
pipelines: { base: "content/pipelines", pattern: ["**/index.md"], kind: "pipeline" },
```

Astro content collections: one per entry in `COLLECTIONS`, each loading its own base and glob and parsing against its own kind's schema. The validator's walk routes from the same table, so what the site publishes and what the validator checks are the same set by construction — see §6.

Routes:
- `[...slug].astro` renders content notes, including Mold `index.md` directory notes, through type-specific body components.
- `raw/[...slug].md.ts` serves raw note text endpoints.

Casts directory (`casts/<target>/<name>/`) is **not** a content collection — it's generated, language-target-shaped, and treated as a standalone artifact, not a Foundry note.

## 11. Site / Astro layer

Stack: Astro static + Tailwind CSS v4 (`@tailwindcss/vite`) + `@tailwindcss/typography`.

Routes:
- `index.astro` — public landing page.
- `dashboard/index.astro` — dashboard driven by `dashboard_sections.json`. Pipeline section leads (journey surface); type sections follow (reference surface).
- `index/index.astro` — full catalog page (mirrors `Index.md`).
- `[...slug].astro` — note detail with metadata `<dl>`, wiki-link panels, body via `<Content />` (rendered through `remarkWikiLinks`), backlink panel, Pagefind annotations. For `type: mold` notes, an "Appears in pipelines" panel rolls up every `pipeline` note that references this Mold in its `phases` (computed from `validatePipelinePhases` reverse index).
- `pipelines/index.astro` — pipeline index; individual pipeline notes render through `[...slug].astro` with `PipelineBody.astro`. `PipelineBody` also surfaces a per-pipeline "Run this" panel from the harness `_assembly.json`. The index appends the shared `RunPipelines.astro` (text variant) below the catalog table.
- `pipelines/[slug]/harness.astro` — per-pipeline stop-gap harness detail: `_assembly.json` phase-resolution table + raw harness `SKILL.md` + `StopGapBanner`.
- `components/RunPipelines.astro` — shared "Run a pipeline" surface (how-to-run steps + `StopGapBanner` + runnable harness-card grid). Mounted full on `/usage/#run-pipelines` and text-only on the pipelines index. Single source for the run story.
- `molds/index.astro`, `patterns/index.astro`, `source-patterns/nextflow/index.astro` — type and source-pattern browse pages.
- `artifacts/index.astro`, `artifacts/[id].astro`, `usage/index.astro`, `usage/claude/[skill].astro` — cast artifact and usage surfaces. The `/usage/` Mold-cast grid excludes `pipeline-*` harness casts (`isHarnessSlug` in `lib/casts.ts`); harnesses render as a dedicated "Run a pipeline" section (`RunPipelines.astro`) above the cast grid, sourced from each pipeline's `_assembly.json`.
- `design/index.astro`, `design/[slug].astro`, `story/index.astro`, `external.astro`, `log.astro`, `glossary.astro` — supporting public pages.
- `tags/index.astro` — bucketed facet browser (source / target / topic / tool·cli / other). New subject-area buckets get added as tag families bloom. Per-type browse lives on the `molds`/`patterns`/`pipelines` index pages and the Dashboard/Index catalogs.
- `tags/[...tag].astro` — per-tag filter.
- `raw/[...slug].md.ts` — raw text endpoints (`Content-Type: text/plain`). Trivially makes the foundry agent-consumable.

Theme: CSS custom properties under `@theme { ... }` with `@custom-variant dark` and a `.dark { ... }` override block. Status badges (`.badge-draft`, …) and `.tag` chips first-class. `.dangling` styles unresolved wiki links muted+italic.

Deployment: two-job GitHub Pages workflow on push to `main` (`withastro/action@v3` + `actions/deploy-pages@v4`). The separate `packages.yml` workflow runs content validation, package/site typechecks, repo tests, package tests, formatting, linting, cast drift checks, and site build on pull requests and pushes to `main`.

## 12. Ingestion and maintenance

One ingestion spine — Mold casting. There is no IWC ingestion (see `CORPUS_INGESTION.md`).

**Mold casting** (`foundry-build cast`, driven by `/cast`). Covered in `COMPILATION_PIPELINE.md`. Reads from `content/molds/`, `content/patterns/`, `content/schemas/`; writes only to `casts/<target>/<name>/`.

**`content/log.md`** — append-only, excluded from validator and Astro collections, Obsidian-visible. Reserved entry types: `cast`, `lint`, and `query`. Format:

```markdown
## 2026-04-29 cast — implement-galaxy-tool-step (claude)
- **mold**: [[implement-galaxy-tool-step]]
- **target**: claude
- **model**: claude-opus-4-7
- **prompt-version**: v3
- **resolved-refs**: 4 patterns
```

**`package.json` scripts**:
- `validate` — schema + cross-file checks (errors block; warnings advisory).
- `test` — Vitest suite.
- `dashboard` / `check:dashboard` — Obsidian dashboard.
- `index` / `check:index` — flat catalog.
- `kinds` / `check:kinds` — the note-kind manifest (§8). Requires `packages-build` first: the command imports the built `@galaxy-foundry/note-schema`.
- `cast -- --mold=<slug> --target=<target>` — one-shot cast.
- `site:dev` / `site:build` / `site:preview` — Astro lifecycle.

Stack:
- **`tsx`** to run TS scripts directly (no compile step in dev); `tsc --noEmit` for typecheck in CI.
- **zod** for the frontmatter contract (`@galaxy-foundry/note-schema`); **Ajv** for Mold IO schema validation and cast verification; **gray-matter** for frontmatter parse, **js-yaml** for YAML loads.
- **Vitest** for tests.
- **pnpm workspace packages** for published runtime and build tooling; root `package.json` keeps authoring shortcuts. Astro imports shared wiki-link behavior through `site/src/lib/wiki-links.ts`, which builds this instance's link map over the resolver in `@galaxy-foundry/wiki-links`.

## 13. Cross-cutting concerns

**Validation.** Two layers:
- *Static* — `foundry-build validate` checks frontmatter against schema, wiki link integrity, bidirectional `related_notes`, source-pattern links, pipeline phases, artifact contracts, schema vendoring, CLI docs, pattern evidence, body wiki links, and Mold source layout.
- *Casting-time* — `foundry-build cast` refuses to cast a Mold that fails static validation, and validates resolved refs conform to their schemas.

**Versioning.** No semver on Molds, no semver on casts. Identity = name + content hash. Re-casting is the migration path. See `COMPILATION_PIPELINE.md`.

**Provenance.** Every derived artifact records what produced it:
- Cast skills: `_provenance.json` per cast (Mold hash, model, prompt version, resolved-ref hashes, timestamp). Detail in `COMPILATION_PIPELINE.md`.
- Generated indexes: rebuilt from current content state; drift detected by `--check`.

IWC-cited URLs in pattern bodies are *not* tracked as provenance — they are author-controlled citations. Pinning to a commit SHA is at the author's discretion per citation.

**Status lifecycle.** Status enum (`draft | reviewed | revised | stale | archived`) on every note. Archived notes filtered everywhere a list appears. First-class, not a tag convention.

## 14. Physical file layout

Current repository layout.

```
foundry/
├── AGENTS.md
├── README.md
├── CLAUDE.md
├── Makefile
├── meta_tags.yml                         # tag registry (closed; every key glossed)
├── reference_contract.yml                # Mold reference-kind contract
├── vendored_upstreams.yml                # synced upstream artifact registry
├── dashboard_sections.json               # single source for Obsidian + Astro dashboards
├── docs/
│   ├── ARCHITECTURE.md
│   ├── GUIDING_PRINCIPLES.md
│   ├── MOLD_SPEC.md
│   ├── HARNESS_PIPELINES.md
│   ├── MOLDS.md
│   ├── PATTERNS.md
│   ├── COMPILATION_PIPELINE.md
│   ├── CORPUS_INGESTION.md
│   └── SCHEMA_PACKAGES.md
├── content/
│   ├── Dashboard.md                      # generated; --check
│   ├── Index.md                          # generated; --check
│   ├── log.md                            # append-only operations journal
│   ├── glossary.md                       # hand-curated terminology; skipped by validator
│   ├── schemas/                          # Mold IO schemas (the schema library)
│   │   ├── tests-format.md               # vendored from @galaxy-tool-util/schema
│   │   ├── summary-nextflow.md           # Foundry-authored schema note
│   │   ├── galaxy-tool-discovery.md
│   │   ├── galaxy-tool-summary.md
│   │   ├── parsed-tool.md
│   │   ├── nextflow-parameters-meta.md
│   │   └── …                             # one .md note per Mold IO schema
│   ├── molds/
│   │   ├── implement-galaxy-tool-step/
│   │   │   ├── index.md                  # frontmatter + body (the "mold.md")
│   │   │   ├── eval.md                   # not packaged into cast
│   │   │   └── examples/
│   │   ├── summarize-paper/
│   │   ├── interview-to-freeform-summary/
│   │   ├── discover-shed-tool/
│   │   ├── advance-galaxy-draft-step/
│   │   ├── validate-galaxy-workflow/
│   │   └── …
│   ├── patterns/
│   │   ├── galaxy-collection-patterns.md       # body cites IWC URLs
│   │   ├── galaxy-tabular-patterns.md
│   │   ├── galaxy-conditionals-patterns.md
│   │   ├── collection-build-named-bundle.md
│   │   └── …
│   ├── cli/
│   │   ├── gxwf/
│   │   │   ├── tool-search.md            # one file per command/subcommand
│   │   │   ├── tool-versions.md
│   │   │   ├── tool-revisions.md
│   │   │   ├── validate.md
│   │   │   ├── validate-tests.md
│   │   │   ├── convert.md
│   │   │   └── …
│   │   └── planemo/
│   │       └── .gitkeep
│   ├── pipelines/                      # directory notes (index.md + optional eval.md/scenarios.md)
│   │   ├── nextflow-to-galaxy/
│   │   │   ├── index.md                # phases spine + journey body
│   │   │   ├── eval.md                 # pipeline-level oracle
│   │   │   └── scenarios.md            # whole-journey cases
│   │   ├── paper-to-galaxy/
│   │   ├── interview-to-galaxy/
│   │   ├── cwl-to-galaxy/
│   │   ├── paper-to-cwl/
│   │   └── nextflow-to-cwl/
│   ├── source-patterns/
│   │   └── …
│   └── research/
│       ├── component-nextflow-testing.md           # background syntheses
│       ├── gxformat2-schema.md
│       └── …
├── casts/                                # generated; committed; skipped by validator
│   ├── claude/
│   │   ├── _target.yml                   # prompt template, model, output schema
│   │   ├── implement-galaxy-tool-step/
│   │   │   ├── SKILL.md
│   │   │   ├── references/
│   │   │   └── _provenance.json
│   │   └── …
│   ├── web/
│   └── generic/
├── packages/                             # pnpm workspace packages
│   ├── build-cli/                        # foundry-build CLI (repo-internal authoring)
│   ├── summarize-nextflow/               # nf-core summarizer + summary-nextflow schema + nf-core meta schemas
│   └── foundry/                          # foundry CLI: validate-* subcommands + summarize-nextflow wrapper + orphan schemas
├── scripts/
│   ├── validate.ts                       # wrapper for foundry-build validate
│   ├── generate-dashboard.ts             # wrapper for foundry-build generate-dashboard
│   ├── generate-index.ts                 # wrapper for foundry-build generate-index
│   ├── cast-mold.ts                      # wrapper for foundry-build cast
│   ├── cast-skill-verify.ts              # cast verification helper
│   ├── sync-vendored-upstreams.ts        # vendored schema/source sync
│   ├── smoke-packages.mjs                # tarball install + bin smoke for publishable packages
│   ├── one-time/                         # retained maintenance scripts
│   └── lib/
│       ├── schema.ts                     # load + tag-enum injection
│       ├── frontmatter.ts                # gray-matter wrapper + date normalization
│       ├── wiki-links.ts                 # adapter over @galaxy-foundry/wiki-links
│       └── walk.ts                       # findMdFiles; routes through COLLECTIONS
├── tests/
│   └── validate.test.ts                  # Vitest
├── site/                                 # Astro renderer
│   ├── src/
│   │   ├── content.config.ts             # one Astro collection per COLLECTIONS entry
│   │   ├── lib/
│   │   │   ├── wiki-links.ts             # link map + backlinks over the shared resolver
│   │   │   ├── remark-wiki-links.ts
│   │   │   └── schema-registry.ts
│   │   ├── pages/
│   │   ├── components/
│   │   ├── layouts/
│   │   └── styles/global.css
│   └── astro.config.mjs
├── .claude/
│   └── commands/
│       ├── draft-mold.md
│       ├── draft-pattern.md
│       └── cast.md
├── .github/workflows/
│   ├── deploy.yml                        # Astro → GitHub Pages
│   ├── packages.yml                      # package build/test/typecheck/lint
│   └── verification-workflows.yml        # verification workflow checks
├── verification/
│   └── …                                 # verification fixtures and reports
├── workflow-fixtures/                    # generated research corpus workspace
├── package.json                          # one dep tree for tooling + site
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── tsconfig.json                         # path alias for scripts/lib/* shared with site
└── vitest.config.ts
```

Key decisions reflected in the layout:
- **`content/` content root** — Astro idiom. Reads accurately to a new contributor; the Foundry isn't an Obsidian vault by intent.
- **`content/molds/<slug>/index.md` and `content/pipelines/<slug>/index.md` as directory notes** — one validator rule (`DIR_NOTE_TYPES`) covers both; `eval.md` / `scenarios.md` siblings ride along.
- **`content/schemas/` separate from the frontmatter contract** — the frontmatter contract (`@galaxy-foundry/note-schema`) governs content-note frontmatter; `content/schemas/` is the **Mold IO schema library** (per-source summary outputs *and* every other structured input/output a Mold declares). Different audiences, different lifecycle. Schemas live as content notes (renderable via `SchemaBody.astro`) so they show up in the dashboard, in the Index, and in tag/backlink browses; the actual JSON Schema lives in the schema's TypeScript package at `packages/<name>-schema/src/<name>.schema.json` (Foundry-authored: hand-edited there; vendored: synced from an upstream package). The note's frontmatter declares `package` + `package_export`; `site/src/lib/schema-registry.ts` imports each schema directly from its package, and casting imports the named runtime export and serializes it into cast bundles. Molds reference schemas via wiki-link frontmatter fields (`output_artifacts[].schema` on the producer side, `references[].ref` for `kind: schema`).
- **`content/cli/<tool>/<cmd>.md` flat per tool** — CLI manual pages are organized two-deep for browsing, but each command is a single flat file; not directory-note semantics.
- **`casts/` outside `content/`** — casts are not foundry notes. They have their own provenance shape and target-specific layouts; collapsing them into `content/` would muddy the validator and the site.
- **`docs/` for Foundry-meta** — long-form design docs (architecture, MOLD_SPEC) live here, not as content notes.
- **No `content/exemplars/` directory** — IWC is referenced by URL in pattern bodies, not mirrored. See `CORPUS_INGESTION.md`.
- **No top-level `harnesses/`** — the Foundry doesn't host the production harness surface; sophisticated, stateful orchestration is an open research question (§15) that belongs in downstream repos consuming a pipeline + the cast Molds. `content/pipelines/` is the Foundry's representation of the journey shape. The one in-repo exception is a deliberate **stop-gap**: `/assemble-pipeline` compiles a pipeline into a trivial linear harness skill (`pipeline-<slug>` under `casts/claude/skills/`, namespaced by prefix) that runs its phase casts in order for end-to-end test-drives. A trivial exercise of the pipeline spine — not a commitment to in-repo orchestration, and not a `harnesses/` directory.
- **`content/pipelines/` as primary IA** — pipelines are the journey surface (subway maps over the KB) and the source of truth for "what Molds compose into a buildable harness." `validatePipelinePhases` machine-checks that every phase resolves to a real Mold; it does not require Molds to belong to a pipeline.
- **Single `package.json`, single `tsconfig.json`** — tooling and site share a dep tree. The wiki-link module under `scripts/lib/` is imported by both sides via path alias.

## 15. Tracked Follow-Up

- **Harness execution strategy (open research question).** How a pipeline becomes an executable harness spans a spectrum. The current floor is a **stop-gap**: `/assemble-pipeline` compiles a pipeline into a trivial linear `pipeline-<slug>` skill that runs its phase casts in order, defers loop endstate detection to the looped Mold's own oracle (`advance-galaxy-draft-step` → `gxwf draft-next-step`), expands `[branch]` routing inline, and sets up a per-run working directory (foundry#282). The ceiling is heavyweight stateful orchestration — resumption, approval gates, autonomy posture, cross-step rework, routing the harness owns rather than the looped/branching Molds. Unresolved: where sophisticated harnesses live (downstream repos vs. a Foundry-blessed format), how much routing the harness owns vs. the Molds own, and whether the stop-gap assembler graduates into something durable or stays a test-drive convenience. See `docs/HARNESS_PIPELINES.md`.
- **Composed pipelines (`PAPER -> CWL -> GALAXY`).** Track representation for composed paths in [issue #200](https://github.com/galaxyproject/foundry/issues/200). The Mold inventory already supports the paths; the unresolved question is whether composed journeys get distinct `content/pipelines/<slug>/` notes or remain harness-level runtime compositions.

## 16. Resolved Contracts

Pipelines:
- **Phase shape.** Pipeline phases are object-per-phase frontmatter arrays. This is machine-checkable and renders deterministically.
- **Named `branch` routing patterns.** Routing patterns are a closed schema vocabulary. `discover-or-author` and `test-data-resolution` are the current values.
- **Other inline phase kinds.** `[gate]` is coined when a real pipeline needs an inline approval / scope-confirmation checkpoint. The phase-kind set remains open; `branch` and `gate` are unrelated behaviors.
- **Pipeline rendering.** Current pipeline pages are the supported public rendering. No separate rendering gate blocks the architecture.

Schema:
- `MOLD_SPEC.md` owns the typed-reference manifest and Mold authoring rules.
- Producer Molds attach schema contracts to `output_artifacts[].schema`; consumer `input_artifacts[]` inherit by shared artifact `id`.
- CLI command pages are reference content, and action Molds reference exact commands.

Tooling:
- **Compiled scripts vs `tsx`.** Track precompiled-bin migration in [issue #201](https://github.com/galaxyproject/foundry/issues/201). Current root scripts use `tsx`.

Process:
- Companion relationships between patterns and action Molds stay implicit through wiki links unless a real machine-checking need appears.
