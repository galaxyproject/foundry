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
- **Prompts** — wrapper notes under `content/prompts/` that add Foundry metadata and usage framing around raw prompt sidecars. Molds reference the wrapper via `kind: prompt`; casting copies the raw `prompt_file` verbatim.
- **Schemas (Mold IO)** — JSON Schema Draft 07 files declaring Mold input/output shapes. Each has a `type: schema` content note under `content/schemas/<name>.md`; the JSON itself lives with its producer (`@galaxy-foundry/summarize-nextflow` for `summary-nextflow` and the nf-core meta schemas) or in `@galaxy-foundry/foundry` (orphan schemas with no in-repo TS producer: `summary-cwl`, `galaxy-tool-discovery`, `galaxy-tool-summary`, `tests-format`). The `tests-format` JSON is synced from upstream `@galaxy-tool-util/schema`. Mold frontmatter cites schemas via `[[wiki-link]]` to the note; the note declares `package` + `package_export` (cast imports the runtime export and serializes it) and `validator_bin` + `validator_subcommand` (skills validate via `foundry validate-<name>`). See `SCHEMA_PACKAGES.md`.
- **Frontmatter schema** — `meta_schema.yml`, JSON Schema Draft 07 in YAML, contract for content notes. Distinct from the Mold IO schemas under `content/schemas/`.
- **Tag registry** — `meta_tags.yml`, controlled vocabulary injected into the schema at validate time.
- **Cast skills** — produced by casting from Molds. Per-target output layout under `casts/<target>/<name>/`.
- **Tooling** — TypeScript build/authoring commands ship as `@galaxy-foundry/build-cli` (`foundry-build`). Root `scripts/` files provide repo-local wrappers, vendored-upstream sync, smoke checks, and one-time maintenance utilities. No Python in the toolchain.
- **Slash commands** — `.claude/commands/*.md`, checked into the repo, codify the agent workflows.
- **Static site** — Astro renderer over the foundry's content collections, deployed to GitHub Pages.

Consumers (external):
- **Harnesses** — hand-authored orchestration that consumes generated skills or other cast artifacts. Live in their own repos. The Foundry produces the artifacts they load.
- **Web applications** — consume `web`-target casts.

## 2. Concepts and vocabulary

Authoritative term definitions live in `content/glossary.md`; this section is the architectural picture.

- **Note** — a single `.md` file with frontmatter under the foundry's content root. Identity = filename stem, used as the wiki-link target.
- **Type** — top-level kind of note (`type:` in frontmatter): `mold | pattern | source-pattern | cli-command | pipeline | research | schema | prompt`.
- **Subtype** — second-level discriminator. Used for `research` (`component | design-problem | design-spec`). Molds use `axis`, `source`, `target`, and `tool` instead of `subtype`.
- **Tag** — controlled hierarchical label declared in `meta_tags.yml`. Two roles: classify the note's kind (note-type tags like `mold`, `pattern`, `research/component`) and classify subject area (e.g., `iwc/<category>` for IWC domain coverage; further subject-area families bloom as content lands — see §4).
- **Mold** — `content/molds/<slug>/index.md`. Directory-based note: `index.md` is the only top-level frontmatter-bearing file; siblings (`eval.md`, `usage.md`, `refinement.md`, `refinements/`, `examples/`, optional `casting.md` / `cast-skill-verification.md` / `changes.md`) ride along verbatim. Files under `refinements/` are the one carve-out: each refinement-journal entry carries small structured frontmatter. Content shape: typed reference manifest in frontmatter + procedural body skeleton.
- **Pattern** — single `.md` under `content/patterns/`. Reference content. IWC citations live in the body as URLs; see `CORPUS_INGESTION.md`. Wiki-linked from Molds.
- **Source-pattern** — single `.md` under `content/source-patterns/<source>/`. Reference content mapping source-system structures to target-system constructs, with `source_pattern_kind`, `source`, `target`, and `implemented_by_patterns` frontmatter.
- **CLI command** — single `.md` under `content/cli/<tool>/<cmd>.md` (e.g., `content/cli/gxwf/tool-search.md`, `content/cli/gxwf/validate.md`). Reference content describing one CLI command/subcommand: synopsis, args, flags, examples, exit codes, output shape, error patterns, gotchas. Wiki-linked from Molds. Cast to a JSON sidecar (not inlined as prose) by casting's `cli-command`-kind dispatch.
- **Pipeline** — single `.md` under `content/pipelines/`. Ordered sequence of phases that compose into a harness journey (e.g., `nextflow-to-galaxy.md`, `paper-to-galaxy.md`). **Dual purpose**: (a) build artifact — names the Molds a harness will orchestrate; (b) navigation primitive — renders as a "subway map" / journey index over the KB. Each phase is a `mold` reference, a `[loop]`-flagged Mold, or a `[branch]`-flagged routing step (not a Mold; harness-level orchestration — binary branches with fallthrough, or N-step fallback chains). Other inline harness annotations (e.g., `[gate]` for an approval / scope-confirmation checkpoint) will be coined when they first surface as inline phases; the set is open and not pre-enumerated. Pipelines are *not* cast; they are referenced content. The Mold inventory invariant — "Molds = union of pipeline phases" — is machine-checked: every phase resolves to a Mold (or is explicitly a non-Mold annotation like `[branch]`), and Molds with no pipeline membership stand out.
- **Schema** — single `.md` under `content/schemas/`. Renderable reference note for a JSON Schema package/export or vendored schema artifact.
- **Prompt** — single `.md` wrapper under `content/prompts/`, plus a sibling raw `prompt_file` sidecar. The wrapper is human-facing and linkable; the raw sidecar is what casting packages.
- **Cast** / **Casting** / **Cast skill** / **Cast target** — per `content/glossary.md`. The cast directory tree (`casts/<target>/<name>/`) is generated from Molds, committed to the repo, and skipped by the validator.
- **Wiki link** — Obsidian-flavored `[[Target]]`. First-class in both frontmatter (typed fields like `parent_pattern`, `related_patterns`, `related_notes`) and body prose (resolved by a remark plugin in the site).
- **Log** — `content/log.md`, append-only journal of foundry operations (`cast`, `lint`, `query`). Excluded from validator and site collection.

The Foundry's content types each aggregate references — Molds aggregate patterns/CLI/schemas/examples, Pipelines aggregate Molds in order, Patterns aggregate IWC URLs and link out to companion Molds. Each is a focused MOC; no separate "navigation hub note" type is needed.

- **Slash command** — repo-checked-in agent workflow under `.claude/commands/` (e.g., `/draft-mold`, `/draft-pattern`, `/cast`).

The content root is `content/` — the Astro idiom, and accurate to a new contributor since the Foundry isn't an Obsidian vault by intent.

## 3. Note types and subtypes

Source of truth: `meta_schema.yml` `type.enum` and the `allOf/if/then` block; `meta_tags.yml` for the matching tag.

| `type` | `subtype` | Required-extra | Tag(s) | Directory |
|---|---|---|---|---|
| `mold` | — | `name`, `axis` | `mold` | `content/molds/<slug>/index.md` only |
| `pattern` | — | `title`, `pattern_kind`, `evidence` | `pattern` (+ optional `iwc/*`) | `content/patterns/` |
| `source-pattern` | — | `title`, `source`, `target`, `source_pattern_kind`, `implemented_by_patterns` | `source-pattern` (+ source/target tags) | `content/source-patterns/<source>/` |
| `cli-command` | — | `tool`, `command` | `cli-command` (+ `cli/<tool>`) | `content/cli/<tool>/` |
| `pipeline` | — | `title`, `phases` | `pipeline` (+ optional `source/*`, `target/*`) | `content/pipelines/` |
| `research` | `component` | (base + `subtype`) | `research/component` | `content/research/` |
| `research` | `design-problem` | (base + `subtype`) | `research/design-problem` | `content/research/` |
| `research` | `design-spec` | (base + `subtype`) | `research/design-spec` | `content/research/` |
| `schema` | — | `name`, `title` | `schema` | `content/schemas/` |
| `prompt` | — | `title`, `prompt_file` | `prompt` (+ optional `prompt/*`) | `content/prompts/` |

`mold` has a **directory-placement contract** enforced by the validator's `findMdFiles` (sibling `.md` files in `content/molds/<slug>/` are skipped). Mold is the only directory-note type; `docs/` holds long-form design docs.

`cli-command` notes are *not* directory-based — each command is a flat single file. The two-level `content/cli/<tool>/<cmd>.md` directory structure is for organization, not directory-note semantics.

The `research` subtypes (`component`, `design-problem`, `design-spec`) cover self-design notes plus background syntheses (e.g., the existing `COMPONENT_NEXTFLOW_WORKFLOW_TESTING` content lands as a `research/component` note).

## 4. Tag system

`meta_tags.yml` is a flat YAML dict whose **keys** are the entire allowed tag vocabulary; each value is `{ description: "..." }`. Hierarchy is purely textual (slash-delimited). Examples:

```yaml
mold:
  description: "Mold note (source artifact for casting)"
pattern:
  description: "Pattern reference page (Galaxy workflow construction patterns)"
iwc/variant-calling:
  description: "Variant-calling workflows (DNA-seq, somatic, germline)"
iwc/rna-seq:
  description: "RNA-seq quantification, splicing, differential expression"
```

Validation injects the registry keys into the schema at runtime (`scripts/lib/schema.ts:loadTags` / `loadSchema`), so `meta_schema.yml`'s tag enum stays empty on disk. Vocabulary changes touch one file; the schema stays static. The separation is load-bearing.

Tag families:
- **Note-type tags** (`mold`, `pattern`, `source-pattern`, `cli-command`, `pipeline`, `research/*`, `schema`, `prompt`) — every note carries exactly one. Coherence-checked.
- **Prompt tags** (`prompt/*`) — classify reusable upstream or Foundry-authored prompt families, e.g. `prompt/galaxy-internal` for prompts sourced from Galaxy's internal agent prompt library.
- **`iwc/*` (IWC domain coverage)** — not used as an aggregation surface. Pattern work relies on corpus citations in bodies.
- **`cli/*` (CLI affiliation)** — every `cli-command` note carries `cli/<tool>` (e.g., `cli/gxwf`, `cli/planemo`). Drives per-tool browse pages and action-Mold reference surfaces.
- **Source/target/tool axis tags** (`source/paper`, `source/nextflow`, `source/cwl`, `target/galaxy`, `target/cwl`, `tool/gxwf`, `tool/planemo`) — complement typed Mold and source-pattern fields and drive browse surfaces.

**Subject-area tags beyond `iwc/*` are demand-driven.** A general Galaxy code/feature taxonomy (collections, tools, conditionals, ...) is not committed up front. Tag families bloom as patterns surface real cross-cutting needs.

Coherence check (`TYPE_TAG_MAP` + `validate_tag_coherence`) emits a *warning* (not error) when a note's `(type, subtype)` doesn't carry its expected note-type tag. Hierarchy-aware: `research/component` satisfies `research`.

## 5. Frontmatter schema

`meta_schema.yml` is JSON Schema Draft 07 written in YAML.

**Base required (everywhere)**: `type`, `tags`, `status`, `created`, `revised`, `revision`, `ai_generated`, `summary`.

- `status` enum: `draft | reviewed | revised | stale | archived`. Drives badge rendering and `archived` filtering throughout the site.
- `summary`: `string`, `minLength: 20`, `maxLength: 160` — forced compression. Powers `Index.md`, dashboard tooltips, and link previews.
- `revision`: `integer >= 1`; bumped by hand on every edit.
- `created` / `revised`: ISO date strings (advisory `format: date`; real validation in a separate date pass).
- `tags`: array, `minItems: 1`, items enum injected at runtime.
- `ai_generated`: boolean.

**Conditional fields** declared at top level (must be, due to `additionalProperties: false`) and gated by `allOf/if/then`:

```yaml
- if: { properties: { type: { const: mold } }, required: [type] }
  then: { required: [name, axis] }
- if: { properties: { type: { const: pattern } }, required: [type] }
  then: { required: [title, pattern_kind, evidence] }
- if: { properties: { type: { const: source-pattern } }, required: [type] }
  then: { required: [title, source, target, source_pattern_kind, implemented_by_patterns] }
- if: { properties: { type: { const: cli-command } }, required: [type] }
  then: { required: [tool, command] }
- if: { properties: { type: { const: pipeline } }, required: [type] }
  then: { required: [title, phases] }
- if: { properties: { type: { const: schema } }, required: [type] }
  then: { required: [name, title] }
- if: { properties: { type: { const: prompt } }, required: [type] }
  then: { required: [title, prompt_file] }
```

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

**Mold = typed reference manifest.** A Mold's frontmatter declares operational dependencies through `references:` plus explicit IO schema fields. `MOLD_SPEC.md` owns the authoring contract, and `reference_contract.yml` owns the vocabulary for kind, usage timing, load behavior, transform mode, and evidence labels. Producer-owned `output_artifacts[].schema` links resolve to `type: schema` notes; consumers inherit schema contracts through shared artifact `id`s. The validator resolves each kind with its own check; casting dispatches per kind — see `COMPILATION_PIPELINE.md`.

**Wiki-link frontmatter fields** (regex `^\[\[.+\]\]$`):
- `parent_pattern` (single, optional).
- `related_notes` (array).
- `related_patterns` (array).
- `related_molds` (array; discouraged for operational dependencies; factor shared content into patterns, CLI manual pages, schemas, prompts, examples, or research notes).

Pattern notes can declare `iwc_exemplars` metadata with abstract IWC workflow IDs. Polished prose cites IWC workflows by URL or abstract ID rather than generated fixture paths (see `CORPUS_INGESTION.md`).

**Strict mode**: `additionalProperties: false`. Every conditional field declared at top level.

## 6. Validation pipeline

`foundry-build validate` is the validator entry point. `scripts/validate.ts` is a root-level wrapper around the package CLI. Dependencies: **Ajv** (JSON Schema Draft 07), **gray-matter** (frontmatter parse), **js-yaml** (load schema + tag registry).

Layered validation (`validateData` orchestrates):
1. **`preprocessFrontmatter`** — normalize parsed dates (gray-matter / js-yaml may produce `Date` objects) to ISO strings before schema check.
2. **`validateSchema`** — Ajv compiled against the schema with tag enum injected at load time.
3. **`validateDates`** — second pass on `created` / `revised` via strict ISO parse.
4. **`validateWikiLinks`** — regex-checks the inner text of `[[...]]` for whitespace-only payloads.
5. **`validateTagCoherence`** — *warning* when `(type, subtype)` doesn't carry its expected tag.
6. **`validateBidirectionalRelatedNotes`** (cross-file) — builds slug→file map; warns on asymmetric `related_notes` links.
7. **`validateMoldRefs`** — every Mold's typed references resolve, per kind:
   - `related_patterns` and `related_molds` resolve to notes of the expected type.
   - `references[].kind` dispatches to note-type checks for `pattern`, `cli-command`, `research`, and `schema`; schema refs must target `type: schema` notes with `package` and `package_export`.
   - `example` refs are repo paths under `content/`.
   Failures error. The per-kind dispatch here is the static-validation analog of casting's per-kind dispatch.
8. **`validateSourcePatternRefs`** — every `source-pattern` note's `implemented_by_patterns` links resolve to `type: pattern` notes.
9. **`validatePipelinePhases`** — every `pipeline` note's `phases` items resolve:
   - `mold`-shaped phases — wiki link resolves to a `type: mold` note.
   - `branch`-shaped phases — `branch` value is a known routing pattern; embedded wiki links (in `branches`, `chain`, etc.) resolve to `type: mold` notes.
   - Other phase kinds (e.g., `gate`) — validated per the kind's own shape when introduced.
   Failures error. **Inventory coverage warning** — emits *warning* listing Molds that have zero pipeline membership across all `pipeline` notes (candidate dead Molds, or pipeline gaps).
10. **Artifact graph and layout checks** — producer/consumer artifact IDs, producer-owned `output_artifacts[].schema` links, schema vendoring metadata, schema `validator_bin` package bins, Mold source layout, CLI command docs, pattern evidence, body wiki links, and Mold stub bodies.

`findMdFiles` skip rules:

```ts
const SKIP_DIRS = new Set([".obsidian", "casts"]);
const SKIP_FILES = new Set(["Dashboard.md", "Index.md", "log.md", "glossary.md"]);
const DIR_NOTE_TYPES = new Set(["molds"]);
```

Hidden directories skipped. Casts directory (`casts/`) is **always skipped** — it's generated content, validated by casting tooling separately.

**One slug-resolver.** Because everything is TS, the wiki-link slug + resolver lives in **one shared module** (`scripts/lib/wiki-links.ts`) imported by both the validator and the Astro site (`site/src/lib/wiki-links.ts` re-exports from it, or the site imports directly via path alias). No parallel implementations, no drift risk.

`tests/validate.test.ts` (Vitest) loads the *real* `meta_schema.yml` and `meta_tags.yml` and exercises `validateData` (unit) and `validateFile` (integration with `tmp` directories).

## 7. Wiki links

**Frontmatter wiki-link fields**: `parent_pattern`, `related_notes`, `related_patterns`, `related_molds`. All regex `^\[\[.+\]\]$`.

**Format**: `[[Target Name]]`. Pipe-aliasing supported in body (`[[Target|display]]`) by the remark plugin; not in frontmatter.

**Resolution algorithm.** Single shared module (`scripts/lib/wiki-links.ts`); validator, site page renderer, and the remark transformer all import the same `slugify` and `resolveWikiLink`.

```
slug = lower(name) → "  -  " → "-" → spaces → "-" → strip [^a-z0-9-] → collapse dashes
```

Lookup: **exact match on a basename-keyed map first, then prefix-match fallback**. Directory-based notes (`molds/<slug>/index.md`) are keyed by their parent directory name. Lets `[[implement-galaxy-tool-step]]` resolve to `content/molds/implement-galaxy-tool-step/index.md`.

Prefix-match candidates are sorted **shortest-first, then alphabetically** — `[[foo-b]]` resolves to `foo-bar` rather than `foo-bar-baz`, which is what an author typing a partial stub almost always means. Deterministic across runs.

**Backlinks** computed only from typed frontmatter fields (bounded, fast, author-controlled). Each note page renders an "Incoming References" section grouped by field. Body wiki links are rendered inline but do not contribute backlink edges.

**Bidirectional warning**: validator emits `related_notes: missing backlink to [[X]]`. Asymmetric and informational only.

## 8. Generated artifacts

All generated files live under `content/` and are committed to git; CI runs `--check` drift gates before deploy.

**`Dashboard.md`** — Obsidian Dataview tables, one per section. **`site/src/pages/index.astro`** — same sections rendered as HTML tables.

`dashboard_sections.json` is the single source of truth:

```json
[
  { "label": "Pipelines", "tag": "pipeline" },
  { "label": "Molds", "tag": "mold" },
  { "label": "Patterns", "tag": "pattern" },
  { "label": "CLI Commands", "tag": "cli-command" },
  { "label": "Component Research", "tag": "research/component" },
  { "label": "Design Problems", "tag": "research/design-problem" },
  { "label": "Design Specs", "tag": "research/design-spec" }
]
```

Pipelines lead the dashboard because they are the **primary task surface** of the Foundry: a contributor or agent landing cold should first see the journeys ("convert a Nextflow workflow to Galaxy"), then drill into Molds / Patterns / CLI as the reference layer beneath. Type-based sections are preserved as the reference surface; pipelines are the journey surface. See §11 for how this propagates to the Astro routes.

`foundry-build generate-dashboard` emits Dataview blocks; the Astro page imports the same JSON. Both filter `status !== 'archived'`, sort `revised DESC`.

**`Index.md`** — flat prose catalog grouped by `type`/`subtype`, alphabetized within each group:

```
- [[slug]] — {summary} *(stale)*
```

`foundry-build generate-index` walks `findMdFiles` (reusing the validator's skip logic), groups by type, emits the file. Directory-note slugs use the parent directory name.

**Drift detection**: `--check` flag on every generator reads the file and string-compares with re-generation; exit 1 on mismatch. Wired into `npm run check:dashboard` and `check:index`.

## 9. Authoring flow

Two authoring entry points:
- **Slash commands** (the agent flow) — primary.
- **Hand-written** + `npm run validate` — for small edits.

The Foundry is not an Obsidian vault by intent; agent-driven authoring through slash commands handles scaffold-prompt-stamp-validate without an interactive plugin in the loop.

Foundry slash commands:
- **`/draft-mold`** — scaffold a new Mold (`molds/<slug>/index.md` + `eval.md`) from a name and axis; cross-ref pass against existing patterns.
- **`/draft-pattern`** — scaffold a pattern page; convention (not enforced) that the page cite at least one IWC workflow URL in `## Exemplars` (corpus-first principle).
- **`/cast`** — wraps `foundry-build cast`; classify Mold → resolve refs → call casting LLM → write `casts/<target>/<name>/` → record `_provenance.json` → append to `log.md`.

There is no IWC ingestion command. IWC is referenced by URL in pattern bodies (see `CORPUS_INGESTION.md`); no ingest-iwc script exists. Background research lands as hand-authored `research/component` notes.

The keystone agent shape — *classify → fetch → dedup → draft → cross-ref → write → validate → log → regenerate* — is realized in `/cast`.

## 10. Directory-based note types

One type uses the directory-note pattern: **Mold**.

**Mold** (`content/molds/<slug>/`):
```
content/molds/implement-galaxy-tool-step/
  index.md           ← only file with frontmatter (the "mold.md" of casting)
  eval.md            ← evaluation plan; never packaged into the cast
  examples/          ← optional walk-throughs
  casting.md         ← optional per-target / casting guidance
```

`eval.md` co-locates evaluation with the Mold (improves discoverability and ownership) without bleeding it into cast artifacts. Casting reads `index.md` and refs; never reads `eval.md`.

`docs/` holds long-form Foundry-meta design narrative; the validator's directory-note rule applies only to Mold.

Validator distinction:
```ts
const DIR_NOTE_TYPES = new Set(["molds"]);
if (parts.some(p => DIR_NOTE_TYPES.has(p)) && path.basename !== "index.md") continue;
```

Astro content collection:
- `content` — typed, explicit globs for `cli/**/*.md`, `molds/**/index.md`, `patterns/**/*.md`, `source-patterns/**/*.md`, `pipelines/**/*.md`, `research/**/*.md`, and `schemas/**/*.md`, with generated dashboard/index/log/glossary files excluded.

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
- `pipelines/index.astro` — pipeline index; individual pipeline notes render through `[...slug].astro` with `PipelineBody.astro`.
- `molds/index.astro`, `patterns/index.astro`, `source-patterns/nextflow/index.astro` — type and source-pattern browse pages.
- `artifacts/index.astro`, `artifacts/[id].astro`, `usage/index.astro`, `usage/claude/[skill].astro` — cast artifact and usage surfaces.
- `design/index.astro`, `design/[slug].astro`, `story/index.astro`, `external.astro`, `log.astro`, `glossary.astro` — supporting public pages.
- `tags/index.astro` — bucketed tag browser (note-type / `iwc/*` / other). New subject-area buckets get added as tag families bloom.
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
- `cast -- --mold=<slug> --target=<target>` — one-shot cast.
- `site:dev` / `site:build` / `site:preview` — Astro lifecycle.

Stack:
- **`tsx`** to run TS scripts directly (no compile step in dev); `tsc --noEmit` for typecheck in CI.
- **Ajv** for schema validation, **gray-matter** for frontmatter parse, **js-yaml** for YAML loads.
- **Vitest** for tests.
- **pnpm workspace packages** for published runtime and build tooling; root `package.json` keeps authoring shortcuts. Astro imports shared wiki-link behavior through `site/src/lib/wiki-links.ts`, which re-exports the shared resolver.

## 13. Cross-cutting concerns

**Validation.** Two layers:
- *Static* — `foundry-build validate` checks frontmatter against schema, wiki link integrity, tag coherence, bidirectional `related_notes`, source-pattern links, pipeline phases, artifact contracts, schema vendoring, CLI docs, pattern evidence, body wiki links, and Mold source layout.
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
├── meta_schema.yml                       # JSON Schema Draft 07 in YAML
├── meta_tags.yml                         # tag registry (incl. iwc/*)
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
│   ├── pipelines/
│   │   ├── paper-to-galaxy.md
│   │   ├── interview-to-workflow.md
│   │   ├── nextflow-to-galaxy.md
│   │   ├── cwl-to-galaxy.md
│   │   ├── paper-to-cwl.md
│   │   └── nextflow-to-cwl.md
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
│       ├── wiki-links.ts                 # slug + resolver (shared with site)
│       └── walk.ts                       # findMdFiles + skip rules
├── tests/
│   └── validate.test.ts                  # Vitest
├── site/                                 # Astro renderer
│   ├── src/
│   │   ├── content.config.ts             # Astro content collection schema
│   │   ├── lib/
│   │   │   ├── wiki-links.ts             # shared resolver export
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
- **`content/molds/<slug>/index.md` as directory note** — one validator rule (`DIR_NOTE_TYPES`) covers it.
- **`content/schemas/` separate from `meta_schema.yml`** — `meta_schema.yml` is the frontmatter contract for content notes; `content/schemas/` is the **Mold IO schema library** (per-source summary outputs *and* every other structured input/output a Mold declares). Different audiences, different lifecycle. Schemas live as content notes (renderable via `SchemaBody.astro`) so they show up in the dashboard, in the Index, and in tag/backlink browses; the actual JSON Schema lives in the schema's TypeScript package at `packages/<name>-schema/src/<name>.schema.json` (Foundry-authored: hand-edited there; vendored: synced from an upstream package). The note's frontmatter declares `package` + `package_export`; `site/src/lib/schema-registry.ts` imports each schema directly from its package, and casting imports the named runtime export and serializes it into cast bundles. Molds reference schemas via wiki-link frontmatter fields (`output_artifacts[].schema` on the producer side, `references[].ref` for `kind: schema`).
- **`content/cli/<tool>/<cmd>.md` flat per tool** — CLI manual pages are organized two-deep for browsing, but each command is a single flat file; not directory-note semantics.
- **`casts/` outside `content/`** — casts are not foundry notes. They have their own provenance shape and target-specific layouts; collapsing them into `content/` would muddy the validator and the site.
- **`docs/` for Foundry-meta** — long-form design docs (architecture, MOLD_SPEC) live here, not as content notes.
- **No `content/exemplars/` directory** — IWC is referenced by URL in pattern bodies, not mirrored. See `CORPUS_INGESTION.md`.
- **No top-level `harnesses/`** — harnesses are downstream consumers, in their own repos. `content/pipelines/` is the Foundry's representation of the journey shape; harnesses (in their own repos) are the executable orchestration that consumes a pipeline + the cast Molds.
- **`content/pipelines/` as primary IA** — pipelines are the journey surface (subway maps over the KB) and the source of truth for "what Molds compose into a buildable harness." Mold inventory invariant ("Molds = union of pipeline phases") is machine-checked in `validatePipelinePhases`.
- **Single `package.json`, single `tsconfig.json`** — tooling and site share a dep tree. The wiki-link module under `scripts/lib/` is imported by both sides via path alias.

## 15. Tracked Follow-Up

- **Composed pipelines (`PAPER -> CWL -> GALAXY`).** Track representation for composed paths in [issue #200](https://github.com/jmchilton/foundry/issues/200). The Mold inventory already supports the paths; the unresolved question is whether composed journeys get distinct `content/pipelines/*.md` notes or remain harness-level runtime compositions.

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
- **Compiled scripts vs `tsx`.** Track precompiled-bin migration in [issue #201](https://github.com/jmchilton/foundry/issues/201). Current root scripts use `tsx`.

Process:
- Companion relationships between patterns and action Molds stay implicit through wiki links unless a real machine-checking need appears.
