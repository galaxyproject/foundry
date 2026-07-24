---
type: research
title: "Alignment: gxy-sketches ↔ Galaxy Workflow Foundry"
tags:
  - meta
status: draft
created: 2026-04-30
revised: 2026-05-05
revision: 1
ai_generated: true
related_molds:
  - "[[summarize-nextflow]]"
  - "[[summarize-cwl]]"
  - "[[summarize-paper]]"
related_notes:
  - "[[summary-nextflow]]"
summary: "Where the Foundry's per-source summary Molds align with gxy-sketches on field names and source/test-fixture vocabulary, and where they intentionally do not."
---

# Alignment: gxy-sketches ↔ Galaxy Workflow Foundry

Project-infrastructure research for an adjacent workflow-sketch project. This note records where
the Foundry's per-source summary Molds ([[summarize-paper]], [[summarize-nextflow]], [[summarize-cwl]]) and
a possible future `summarize-galaxy-workflow` should align with `gxy-sketches`, so the two projects
stay legible to each other without becoming dependent.

**gxy-sketches is not a Foundry project.** It is owned by another contributor (boss). The Foundry does not consume it at runtime, casting time, or build time. "Alignment" here means: shared field names, shared mental model for test manifests, and a documented mapping for vocabularies — nothing more invasive.

## What gxy-sketches is

Repo: `/Users/jxc755/projects/repositories/gxy-sketches` (no public URL recorded here).

- Python project. `typer` CLI: `gxy-sketches ingest|generate|validate|list`.
- Unit: a **sketch directory** under `sketches/<domain>/<slug>/` containing `SKETCH.md` (YAML frontmatter + markdown body), optional `test_data/`, optional `expected_output/`.
- Sources (v1): **nf-core** (Nextflow) and **Galaxy IWC** (gxformat2 `.ga` + planemo `*-tests.yml`). Snakemake / WDL deferred to v2.
- Pipeline: `ingest` clones a source repo into `workflows_cache/`, builds a `WorkflowRecord` with an attached `TestManifest`; `generate` calls Claude (prompt-cached system prompt) and writes one `SKETCH.md` per workflow; `validate` lints the corpus.
- Consumer: `gxy3` (chat-driven bioinformatics desktop app) loads `sketches/**/*.md` the way Claude Code loads skills. The sketch teaches the agent **when** to pick this analysis class and the high-level recipe — it is a *routing / decision aid*, not a constructor.
- Sketch body shape (fixed, enforced by prompt): `# Title` → `## When to use this sketch` → `## Do not use when` → `## Analysis outline` → `## Key parameters` → `## Test data` → `## Reference workflow`.

Pydantic types worth knowing (`src/gxy_sketches/schema.py`):

- `WorkflowRecord` — ingestor output: `ecosystem`, `slug`, `display_name`, `source_url`, `version`, `license`, harvested `files: list[WorkflowFile]`, `test_manifest: TestManifest | None`, `tool_versions`.
- `TestManifest` — `inputs: list[TestDataRef]`, `outputs: list[ExpectedOutputRef]`, `output_source_map`.
- `TestDataRef` — `role`, `path` (under `test_data/`), `url`, `sha1`, `filetype`, `description`. Either `path` or `url` required.
- `ExpectedOutputRef` — `role`, `path` (under `expected_output/`), `url`, `kind`, `description`, `assertions: list[str]`. Needs at least one of path/url/assertions.
- `ToolSpec` — `name`, `version`. Bare-string back-compat in input.
- `SketchFrontmatter` — strict (`extra="forbid"`); fields: `name` (kebab, 3-80), `description` (30-600), `domain` (enum), `organism_class`, `input_data`, `source: SketchSource`, `tools: list[ToolSpec]`, `tags`, `test_data`, `expected_output`.
- `SketchSource` — `ecosystem`, `workflow`, `url`, `version`, `license`, `slug`.

`domain` enum (from `prompts.py`): `variant-calling | assembly | rna-seq | single-cell | metagenomics | epigenomics | proteomics | phylogenetics | long-read | amplicon | structural-variants | qc | annotation | other`.

## Why it is adjacent, not the same target

| | gxy-sketches | Foundry |
|---|---|---|
| Question answered | "Which analysis class do I pick for this user request?" | "How do I build this Galaxy/CWL workflow from this source?" |
| Consumer | gxy3 agent at routing time | Harnesses doing source→target translation, validation, debug |
| Per-workflow unit | One `SKETCH.md` (frontmatter + decision-aid prose) | `summarize-<source>` Mold output (structured JSON per `[[summary-<source>]]`, schema in `packages/summary-<source>-schema/src/`) |
| Source coverage | nf-core, IWC (v1) | paper, nextflow, cwl. **No IWC ingest** — IWC cited by URL in pattern bodies (see `CORPUS_INGESTION.md`) |
| Output shape | Markdown + YAML frontmatter | JSON Schema-validated structured data |
| Test fixtures | Bundled into the sketch dir, capped at 5 MB total | Referenced as data; no bundling, no size cap |
| Generation | One-shot LLM call per workflow, prompt-cached system prompt | Per-Mold cast, per-kind dispatch over typed references |

## Alignment moves

These are additive recommendations, not shared runtime contracts.

### 1. Test-fixture field-name parity

The Foundry's `summary-nextflow.schema.json` and `summary-cwl.schema.json` will need a **test-fixture sub-block**. Adopt `TestDataRef` / `ExpectedOutputRef` field names verbatim:

- `inputs[]` items: `role`, `path`, `url`, `sha1`, `filetype`, `description`.
- `outputs[]` items: `role`, `path`, `url`, `kind`, `description`, `assertions[]`.
- `path` / `url` semantics: either / or / both, same rules as gxy-sketches.

Rationale: a Foundry summary becomes structurally consumable by anyone using gxy-sketches' `TestManifest` shape and vice versa. No code dependency; just naming convergence. Cheap to do; hard to retrofit.

**Drop**: gxy-sketches' constraint that `path` *must* be under `test_data/` — that is a sketch-bundle invariant (the validator enforces it because the sketch directory bundles fixtures). The Foundry's summary describes a workflow's test fixtures as data; bundling is out of scope. Also drop the 5 MB cap thinking — it is a sketch-bundle invariant, irrelevant to summary schemas.

### 2. Tool-spec parity

`summarize-galaxy-tool` and `summarize-nextflow` / `summarize-cwl` all need to enumerate tools with versions. Match `ToolSpec(name, version)`. Same field names.

### 3. Source-record parity

When the Foundry's `summarize-paper` / `summarize-nextflow` / `summarize-cwl` (and a future `summarize-galaxy-workflow`, see §5) emit a "this is where I came from" block, mirror `SketchSource` field names: `ecosystem`, `workflow`, `url`, `version`, `license`, `slug`.

The Foundry's `ecosystem` vocabulary should be a superset: gxy-sketches has `nf-core | iwc | snakemake-workflows | wdl`. The Foundry's source axis is currently `paper | nextflow | cwl`; if the Foundry adds an IWC summarizer (§5), use `iwc` not a new term.

### 4. Domain ↔ `iwc/*` vocabulary mapping

gxy-sketches' fixed `domain` enum overlaps heavily with Foundry's `iwc/*` tag family (`iwc/variant-calling`, `iwc/rna-seq`, …). They will not be identical — gxy-sketches' `domain` is a single value chosen by the LLM; the Foundry's `iwc/*` is a multi-tag classification seeded from IWC directory layout (see `CORPUS_INGESTION.md`). Document the mapping in `meta_tags.yml` descriptions for `iwc/*` keys; do not force a merge.

### 5. Inventory gap surfaced by alignment: `summarize-galaxy-workflow` — **CLOSED**

**Resolved (2026-07): [[summarize-galaxy-workflow]] now exists**, added with the `UPDATE-INTERVIEW → GALAXY` edit pipeline. It reads an existing Galaxy workflow (converting `.ga` → gxformat2 first if needed), emits a schema-backed [[summary-galaxy-workflow]], and the source axis now includes `galaxy`. It serves the edit pipeline and `compare-against-iwc-exemplar` as anticipated below. The original gap analysis is retained for context.

gxy-sketches treats IWC (gxformat2 `.ga` files + planemo `*-tests.yml`) as a first-class source. The Foundry had **no** `summarize-galaxy-workflow` Mold — its source axis was paper/nextflow/cwl only. Worth adding to the inventory:

- It would serve `compare-against-iwc-exemplar` directly (the structural diff Mold needs a structured view of the exemplar workflow it compares against — currently unspecified).
- It would let a future `sketch` cast target be populated from IWC workflows entirely inside the Foundry pipeline, without re-implementing gxy-sketches' IWC ingestor.
- It mirrors `summarize-cwl` cleanly (same target — Galaxy — on the input side).

Add to `MOLDS.md` as a candidate; do not commit until the first walk-through.

### 6. Inventory gap: decision-aid layer

The sketch body's `## When to use` / `## Do not use when` sections are a **routing/decision aid**, not technical content. The Foundry's `summarize-*` Molds are technical (DAG, containers, IO). The Foundry has no Mold today that produces "given this workflow, when should an agent reach for it?" content.

If a future `sketch` cast target is added (§7), it will need either:
- A new Mold (`derive-routing-aid` or similar) that consumes a Foundry summary and emits the decision-aid sections, or
- The decision-aid sections come from somewhere else (gxy-sketches' own LLM prompt, the harness, …).

This is a deferred design question, not a v1 commit. Recorded here so it is not lost when the alignment is revisited.

### 7. Possible cast target: `sketch`

A plausible — not committed — Foundry cast target is `sketch`: a `summarize-nextflow` / `summarize-galaxy-workflow` / `summarize-cwl` Mold cast emits a `SKETCH.md`-shaped artifact (frontmatter + the technical body sections). gxy-sketches today derives this content via a single LLM call against the raw workflow files; a Foundry-cast version would be derived from a structured summary instead.

Open questions if/when this is pursued:
- Does the cast emit only the technical sections (`## Analysis outline`, `## Key parameters`, `## Test data`, `## Reference workflow`) and leave the routing sections to gxy-sketches' own pipeline?
- Or does the Foundry add a routing-aid Mold (§6) and own the whole sketch?
- Either way, this is a v2+ concern. v1: align field names, do not entangle pipelines.

## What is *not* aligned

Explicit non-goals, so future contributors do not retrofit them:

- **Storage backends.** gxy-sketches is Python + pydantic + typer + `frontmatter` lib + plain markdown. The Foundry is TypeScript + Astro + Ajv. No code sharing.
- **Validators.** gxy-sketches' validator enforces a sketch-directory bundle contract (file presence, orphan files, 5 MB cap, name uniqueness). The Foundry's validator enforces a content-collection contract (frontmatter schema, wiki-link integrity, tag coherence, Mold ref resolution). Different jobs.
- **5 MB test-fixture cap.** Sketch-bundle-only invariant. Do not propagate into Foundry summary schemas.
- **LLM generation pipeline.** gxy-sketches: one-shot prompt-cached call per workflow, JSON output, deterministic frontmatter fill-in by the writer. Foundry: per-Mold cast with per-kind dispatch over typed references (patterns LLM-condensed, schemas verbatim, CLI command pages → JSON sidecars). Different shapes for different jobs.
- **IWC mirroring.** gxy-sketches clones IWC into `workflows_cache/`. The Foundry **does not** — patterns cite IWC by URL (`CORPUS_INGESTION.md`). If `summarize-galaxy-workflow` lands (§5), revisit whether the Foundry needs an IWC clone for that Mold's runtime; the answer should still be "no" if the generated skill operates on URLs supplied at runtime.

## Site placement

This is project-infrastructure research, not runtime Mold knowledge. It belongs on the design
landing page with other developer-facing records. It should not be pulled into cast artifacts unless
a future `sketch` target makes that relationship explicit.

## Open questions

- Worth a follow-up Mold note `summarize-galaxy-workflow` in inventory before walk-throughs, or wait until walks force it?
- Does gxy-sketches' boss want field-name parity adopted on their side too (e.g., would they rename anything to match Foundry choices), or is parity a one-way concession from Foundry?
- Is a `sketch` cast target on the v2+ roadmap, or stays out of scope permanently and gxy-sketches keeps owning sketch generation end-to-end?
- gxy-sketches v2 lists Snakemake + WDL; the Foundry's source axis would need `snakemake` / `wdl` if alignment is symmetric. Defer until those v2 ingestors land in gxy-sketches.
