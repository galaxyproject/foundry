# IWC Integration

The Foundry has **no IWC ingestion pipeline, no exemplar mirror, and no `workflow-fixtures` runtime dependency**. It integrates the IWC corpus through citations, survey notes, optional inline excerpts, and Molds that can fetch live corpus evidence at runtime.

`workflow-fixtures/` now lives as a top-level directory inside the Foundry checkout (Foundry support infrastructure, not a separate product). Generated corpora — `pipelines/`, `cwl/`, `iwc-src/`, `iwc-cleaned/`, `iwc-format2/`, `iwc-skeletons/` — are gitignored. The validator and site-content traversal stay scoped to `content/`; `workflow-fixtures/` is invisible to them. The directory is cited by `$IWC_FORMAT2/...` and `$IWC_SKELETONS/...` from authoring/survey notes; CWL research can cite `workflow-fixtures/cwl/<repo>/...` paths in ad-hoc notes, but polished content should prefer upstream URLs or abstract workflow IDs. Nothing in `casts/` or `content/` reads from it at build time.

## Skeleton tier

Survey-time evidence has three tiers:

1. **Grep** over `$IWC_FORMAT2/**/*.gxwf.yml` — cheap, blind to step-pair / step-sequence patterns.
2. **Skeleton scan** over `$IWC_SKELETONS/**/*.gxwf.yml` — cheap structural read; sees topology, control flow, and tool sequences. All 120 skeletons fit in agent context (median ~6KB, total ~1MB).
3. **Whole-workflow reading** of selective `$IWC_FORMAT2` files — expensive; reserved for parameter-level evidence on the recipes that look promising from tier 1 or 2.

A skeleton is the format2 workflow with non-structural fields stripped, leaving:

- `tool_id`, `label`, `doc` per step
- `in:` (with `source:`) / `out:` (ids only) / `step_inputs` topology
- `when:` expressions and other control flow
- `run:` subworkflow descents (recursive)
- workflow-level `inputs:` / `outputs:` / `tags` / `release` / `license`

Dropped: `tool_state` parameter blobs, step `position:` UI metadata, step-level `comments:` / `uuid` / `tool_shed_repository` / `tool_version` (redundant with `tool_id`), output post-processing fields (`add_tags`, `change_datatype`, `hide`, `rename`, …), and top-level `comments:` (Galaxy sticky-notes, not topology).

Regen: `cd workflow-fixtures && make skeletons` (or `tsx workflow-fixtures/scripts/build-skeletons.ts`). Idempotent — rebuilds `iwc-skeletons/` from the current `iwc-format2/`. Re-run after `make iwc` bumps the IWC pin.

The pattern is **skeletons + selective full reads**, not skeletons replacing full reads. `/iwc-survey` defaults to "skeleton scan first, then drill into `$IWC_FORMAT2`" for workflow-shape topics; tool-level topics still lean grep + structured-block extraction.

## What the Foundry does instead

1. **Patterns cite IWC by URL, in the page body.** A pattern's `## Exemplars` section lists IWC workflows that demonstrate it, each as a free-form Markdown link (`[bacterial-genomics/...](https://github.com/galaxyproject/iwc/blob/<sha>/workflows/...)`) with one-liner author commentary. Pin to a specific commit SHA when stability matters; pin to `main` when freshness matters. Author choice per citation; no enforced policy.

2. **Inline excerpts when they earn it.** A pattern author may paste 10–30 lines of cleaned `gxformat2` directly into a pattern body to illustrate an idiom. The cleaning is done **at authoring time** by the human running `gxwf` locally (probably against `workflow-fixtures`, or against a fresh clone, or against a raw IWC URL — the Foundry doesn't care). The excerpt is committed verbatim into the pattern page; no build-time regeneration; rot is rot.

3. **No IWC category aggregation layer.** Corpus grounding lives in survey notes, pattern exemplars, and body citations.

4. **`compare-against-iwc-exemplar` (the Mold) operates against live IWC.** The generated skill loads with instructions to fetch IWC at runtime via `WebFetch` / `gxwf`, not against Foundry-hosted exemplar pages. The Mold's source artifact describes the *procedure*, not a corpus index.

## What this gives up

- **Per-workflow inverse view** ("which Foundry patterns does this specific IWC workflow demonstrate"). No structural support. To recover, an author can hand-write a `concept` note for a particularly canonical workflow and wiki-link to it. By exception, not by structural rule.
- **Per-workflow or per-category browsing in the static site.** No structural support for now.
- **Build-time inlining of full workflow content into casts.** Casts that need workflow detail get IWC URLs the agent fetches at runtime, or the small hand-curated excerpts on pattern pages.
- **Auto-detection of upstream IWC structural drift.** A cited workflow can change shape without tripping any Foundry signal. Mitigation: pin citations to commit SHAs where stability matters; rely on review when authoring patterns.

## Validation

There is no IWC-specific validator layer. Citations in pattern bodies are not validated (URLs are URLs; the cost of brokenness is moderate, the cost of automated link-check at scale is real).

## What lives where (summary)

- **In the Foundry repo:** patterns with IWC citations and optional excerpts in body, plus surveys that explain the corpus evidence.
- **NOT in the Foundry repo:** workflow-fixtures, exemplar pages, `_pin.txt`, ingest scripts, hand-curated annotation markers, frontmatter schema for `exemplar` notes.
- **In generated fixture directories:** workflow-fixtures supports authoring and survey work only. No reference from Foundry tooling.

## Minimum Exercise

To exercise this lighter integration:

1. Author 2–3 patterns end-to-end with `## Exemplars` sections citing IWC paths/URLs and one inline excerpt when useful.
2. Confirm a Mold can wiki-link a pattern and that casting preserves the citations as live evidence pointers, not embedded mirrors.

If the loop holds, scale to more patterns. No further integration tooling is planned.
