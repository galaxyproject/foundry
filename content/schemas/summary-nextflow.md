---
type: schema
name: summary-nextflow
title: Nextflow pipeline summary
package: "@galaxy-foundry/summarize-nextflow"
package_export: "summaryNextflowSchema"
validator_bin: foundry
validator_subcommand: validate-summary-nextflow
upstream: "https://github.com/jmchilton/foundry/blob/main/packages/summarize-nextflow/src/schema/summary-nextflow.schema.json"
license: MIT
tags:
  - schema
  - source/nextflow
status: draft
created: 2026-04-30
revised: 2026-05-06
revision: 8
ai_generated: true
related_notes:
  - "[[summarize-nextflow]]"
  - "[[nextflow-workflow-io-semantics]]"
  - "[[nextflow-params-to-galaxy-inputs]]"
  - "[[nextflow-path-glob-to-galaxy-datatype]]"
  - "[[nextflow-reference-data-classification]]"
  - "[[nextflow-summary-to-galaxy-reference-data]]"
  - "[[nextflow-summary-to-galaxy-interface]]"
  - "[[nextflow-summary-to-galaxy-data-flow]]"
  - "[[nextflow-summary-to-galaxy-template]]"
  - "[[nextflow-summary-to-cwl-interface]]"
  - "[[nextflow-summary-to-cwl-data-flow]]"
  - "[[author-galaxy-tool-wrapper]]"
  - "[[nextflow-test-to-galaxy-test-plan]]"
  - "[[nextflow-test-to-cwl-test-plan]]"
summary: "JSON Schema for the structured summary emitted by the summarize-nextflow Mold."
---

This page is auto-rendered from the JSON Schema authored in this repo and shipped on npm as part of `@galaxy-foundry/summarize-nextflow` (the producer co-locates its own schema). Each `$def` becomes a section below with a stable anchor ID — research notes and Mold bodies can deep-link individual shapes via [[summary-nextflow#Tool]].

**Source-of-truth chain:**

1. `packages/summarize-nextflow/src/schema/summary-nextflow.schema.json` — the canonical JSON, hand-edited as part of the Mold/cast loop ([[summarize-nextflow]]). Mold frontmatter cites it via [[summary-nextflow]] wiki-links; cast imports the `summaryNextflowSchema` runtime export and serializes it into cast bundles.
2. `packages/summarize-nextflow/scripts/sync-schema.mjs` runs at `prebuild`, regenerating the typed `summary-nextflow.schema.generated.ts` const wrapper from the canonical JSON.
3. Published as `@galaxy-foundry/summarize-nextflow` on npm. Site rendering imports the schema directly from this package via `site/src/lib/schema-registry.ts`; the published artifact also exports `validateSummary()` and ships the standalone `summarize-nextflow` bin (self-validates by default). The unified `foundry` CLI in `@galaxy-foundry/foundry` exposes the same gate as `foundry validate-summary-nextflow` for downstream cast skills.

**At runtime in cast skills:** validation should happen through the CLI command:

```sh
foundry validate-summary-nextflow summary.json
```

The same schema is copied verbatim into `references/schemas/summary-nextflow.schema.json` per the casting policy in `docs/COMPILATION_PIPELINE.md`. The package additionally exports `validateSummary` (AJV gate) for TypeScript consumers, but generated skills should prefer command-shaped validation so failures are easy to reproduce outside the agent runtime.

Contrast with [[tests-format]], which is vendored *from* an external npm package (`@galaxy-tool-util/schema`); this schema is *authored here* and shipped *to* npm — the direction of the source-of-truth chain is reversed.

## Why per-source

Paper, Nextflow, and CWL are different enough that forcing a shared cross-source summary shape would either lose detail or bloat all three (`docs/HARNESS_PIPELINES.md` §"Mold-inventory parity"). Each `summarize-<source>` Mold emits its own schema; downstream source-target Molds such as `nextflow-summary-to-galaxy-interface`, `nextflow-summary-to-galaxy-data-flow`, `nextflow-summary-to-cwl-interface`, and `nextflow-summary-to-cwl-data-flow` consume this summary without pretending every source has one shared shape.

## Field-name parity with gxy-sketches

Three sub-shapes mirror gxy-sketches verbatim — see [[gxy-sketches-alignment]] for the rationale:

- `SourceRecord` — mirrors `SketchSource` (`ecosystem`, `workflow`, `url`, `version`, `license`, `slug`).
- `Tool` — extends `ToolSpec` (`name`, `version`) with the resolved container/conda strings the bridge to [[author-galaxy-tool-wrapper]] needs.
- `TestDataRef` / `ExpectedOutputRef` — mirror gxy-sketches' field names exactly. The sketch-bundle invariant that `path` must live under `test_data/` is intentionally dropped; the Foundry summary describes fixtures as data, it does not bundle them.

## Cast-time role

Per `docs/COMPILATION_PIPELINE.md`'s per-kind dispatch, this schema is referenced by [[summarize-nextflow]] via `output_artifacts[].schema` and copied verbatim into the cast bundle's `references/schemas/`. The cast skill validates its emitted JSON with `validate-summary-nextflow` before returning; failure is loud — downstream Molds bind to this shape and would produce worse errors later.

## What is intentionally not modeled

- **Structured channel typing.** `processes[].inputs[].shape` is a string (`"tuple(meta, [path,path])"`), not a structured type. NF channel typing is a research project; a string is enough for downstream Molds to reason about and an LLM to emit.
- **Operator-chain semantics.** `Edge.via` records the literal operator chain (`["map", "join", "groupTuple"]`). Reconciling what the chain *does* to channel shapes is left to the LLM step that fills `Edge.notes` when confidence is low.
- **Multi-tool processes outside decomposed mulled-v2 containers.** A process can run multiple tools (a shell pipeline of two binaries). `Process.tool` is nullable; multi-tool processes set it null and surface tool details in `script_summary` and `container`. A `tools[]` foreign-key array on `Process` would be cleaner; deferred until downstream use forces it.

## Revision 2 — 2026-05-01

First cast against `nf-core/demo @ 1.1.0` exposed gaps in the v1 shape (see `content/log.md`'s 2026-05-01 entry). Changes:

- **`Tool.biocontainer` description widened** to accept the docker.io alias `biocontainers/<name>:<version>--<build>` alongside `quay.io/biocontainers/...`. Modern nf-core modules publish the docker.io form in the docker branch and the `depot.galaxyproject.org/singularity/...` form in the singularity branch.
- **`Tool.wave` field added** for Seqera Wave / community-cr registry images (`community.wave.seqera.io/...`, `https://community-cr-prod.seqera.io/...`). Kept distinct from `docker` because resolution rules and provenance differ.
- **`Process.container` and `Process.conda` re-described as verbatim directive text** (not "resolved"). Modern container directives are ternary expressions over `workflow.containerEngine`; modern conda directives are file references to `${moduleDir}/environment.yml`. The schema now records the directive faithfully and pushes resolution into `tools[]`.
- **`ChannelIO.topic` field added** for Nextflow 24+ channel topics. nf-core templates emit a per-process `topic: versions` triple to a global topic for version aggregation; the v1 shape had no place to record this.
- **`Subworkflow.kind` enum added** (`pipeline` | `utility`). nf-core template subworkflows like PIPELINE_INITIALISATION compose free-function calls (`paramsHelp`, `completionEmail`) without invoking processes; their `calls[]` is empty by design. The `kind` field disambiguates real data-flow contributors from utility wrappers.
- **`Workflow.name` description names the selection rule** for pipelines with multiple named workflow blocks (anonymous `workflow {}` + NFCORE_<NAME> + a substantive named workflow): pick the one with the most process invocations — typically `workflows/<name>.nf` — and route the rest into `subworkflows[]`.

What was *not* changed despite biting:
- nf-test snapshot assertions (`snapshot(...).match()` with helpers) remain summarized to prose strings in `ExpectedOutputRef.assertions[]`. A structured "snapshot fixture" shape would help but is deferred until rev 3 when the testing note has paragraphs to inform the design.
- Free-function calls in workflow bodies (`paramsSummaryMap`, `softwareVersionsToYAML`) remain folded into channel `description` text. No first-class representation; their effects are channel sources, the names are nf-core idiom not pipeline-specific signal.

## Revision 3 — 2026-05-01

Second cast against `nf-core/bacass @ 2.5.0` (33 processes, 9 nf-test files, 11 test profiles) exposed two structural-coverage gaps the second pipeline made universal. Changes:

- **`Process.aliases: string[]` added.** Real pipelines re-import a single module multiple times under different aliases via `include { X as Y }` — bacass has six such patterns (CAT_FASTQ→{SHORT,LONG}, MINIMAP2_ALIGN→{CONSENSUS,POLISH} (3 aliases of one process), KRAKEN2_KRAKEN2→{KRAKEN2,KRAKEN2_LONG}, QUAST→QUAST_BYREFSEQID, plus FASTQC→{RAW,TRIM} inside FASTQ_TRIM_FASTP_FASTQC). Workflow `edges[].from`/`.to` reference alias names; canonical names didn't appear in edges at all. The new field captures the alias→canonical mapping so downstream skills (especially author-galaxy-tool-wrapper, which needs to know "MINIMAP2_CONSENSUS shares MINIMAP2_ALIGN's container/conda but is invoked with different runtime args") can resolve references.
- **`Summary.nf_tests: NfTest[]` added.** bacass has 9 `tests/*.nf.test` files, one per test profile. The previous schema's `test_fixtures` is singular (one selected profile's data shape); the rest of the test surface was invisible. The new array enumerates every `.nf.test` with structured fields: profile, params overrides, assert_workflow_success, prose_assertions, and a structured `snapshot: SnapshotFixture | null` capturing the `snapshot(...).match()` semantics.
- **`SnapshotFixture` shape added.** nf-core templates use a near-uniform snapshot pattern: pass succeeded-task-count + version-yaml + stable-name list + stable-path list into snapshot(), pruning via `ignoreFile:` and `ignore:` globs. The new shape records `captures`, `helpers`, `ignore_files`, `ignore_globs`, and the `.snap` path — enough for downstream test-plan molds (e.g. `nextflow-test-to-galaxy-test-plan`) to reconstruct equivalent assertion intent in target frameworks without re-parsing Groovy.

What was not changed despite biting:
- TestFixtures stayed singular. Multiple test profiles surfaced via `nf_tests[]` rather than promoting `test_fixtures` to an array — this preserves backward compatibility and keeps the "data shape of the selected profile" abstraction.
- Mulled-v2 multi-package containers, multiMap/.branch/.cross fan-out, conditional channel construction, .mix-then-reassign — all still had only one bite each (bacass), so deferred per the "grow from contact" rule.

## Revision 4 — 2026-05-05

Snapshot-sidecar parsing landed for module and subworkflow tests whose interesting assertions live in sibling `.nf.test.snap` JSON files. Changes:

- **`SnapshotFixture.parsed_content: SnapshotContent[]` added.** Each parsed sidecar entry preserves the snapshot name plus channel-keyed `SnapshotChannel` values.
- **`SnapshotFile` added.** `<path>:md5,<hex>` strings become file digest assertions with `path`, `basename`, `md5`, and a `stub` flag for empty-file md5s.
- **Non-file values preserved.** Version tuples, counts, and other scalar snapshot values remain in `SnapshotChannel.values` so downstream test-plan Molds do not re-read `.snap` files.

## Revision 7 — 2026-05-06

Top-level `Param` entries gained the nf-schema metadata previously only available on sample-sheet columns. Resolves jmchilton/foundry#186.

- **`Param.format` added** (string|null). nf-schema `format` keyword: `file-path`, `directory-path`, `path`, `file-path-pattern`. Disambiguates path-typed params from plain strings without re-reading `nextflow_schema.json`.
- **`Param.hidden` added** (boolean|null). nf-schema `hidden` keyword. CLI-plumbing params (`validate_params`, `pipelines_testdata_base_path`, `version`, …) now drop out of user-facing target interfaces structurally.
- **`Param.mimetype` added** (string|null). nf-schema `mimetype` keyword. Seeds Galaxy `format` on path params when present.
- **`Param.schema_group` added** (string|null). The parent `$defs` section's `title` (e.g. `Input/output options`, `Reference genome options`). Preserves nf-schema sectioning for UI grouping.
- **`Param.fa_icon` added** (string|null). The parent section's Font Awesome icon hint.

Downstream Molds — [[nextflow-summary-to-galaxy-interface]], [[nextflow-summary-to-cwl-interface]], [[nextflow-summary-to-galaxy-data-flow]] — can now consume these structurally instead of re-parsing the source schema. Mapping table in [[nextflow-params-to-galaxy-inputs]].

## Revision 6 — 2026-05-05

Sample-sheet schemas became first-class structured inputs. Resolves the open question raised in [[nextflow-workflow-io-semantics]] §"Open questions" and tracked in jmchilton/foundry#177.

- **`Summary.sample_sheets: SampleSheet[]` added** (required; empty array when none). Promotes sample-sheet shape out of `params[].description` prose so downstream target Molds can pick collection variants without re-parsing the source pipeline.
- **`SampleSheet` shape added.** Binds one `params[]` parameter (`param`) to a row schema (`columns`) plus discovery provenance (`discovered_via`: `nf-schema` | `samplesheetToList` | `splitCsv` | `ad-hoc`), optional `schema_path`, `format`, and `header`.
- **`SampleSheetColumn` shape added.** Captures `name`, JSON Schema-style scalar `type`, `kind` (`data` for path-typed dataset references vs `meta` for per-row metadata), `format`, `required`, `default`, `enum`, `pattern`, `exists`, `mimetype`, `description`. Validation hints stay verbatim — target Molds decide which survive translation (e.g. Galaxy's `sample_sheet` validator allowlist is regex/in_range/length only; richer nf-schema validation downgrades to prose with confidence note).

Why now: nf-core's `samplesheetToList(params.input, "assets/schema_input.json")` idiom maps almost 1:1 onto Galaxy's `sample_sheet[:paired|:paired_or_unpaired|:record]` collection types (`column_definitions`, typed columns including `element_identifier` cross-row refs, `restrictions[]` for enums, regex validators). Without structured columns the interface Mold cannot pick `sample_sheet:paired` vs `list:paired` vs flat-file principally, and per-row `meta` fields silently fall to parallel parameter inputs. See [[galaxy-sample-sheet-collections]] for the target-side mapping table consumed by [[nextflow-summary-to-galaxy-interface]] and [[nextflow-summary-to-galaxy-data-flow]].

What was *not* changed: `Param.type` still records the param's own type (`string`/`path`) — the sample-sheet relationship is expressed by `sample_sheets[].param` referencing `params[].name`, not by mutating the param entry.

## Revision 5 — 2026-05-05

Mulled-v2 multi-package container decomposition now has a narrow optional shape. Changes:

- **`Tool.mulled_components: ToolSpec[]` added.** When `summarize-nextflow` is given a cached BioContainers `multi-package-containers` TSV, opaque `mulled-v2-*` container IDs can be decomposed into constituent Bioconda package specs.
- **`ToolSpec` added.** Constituent packages record `name`, `version`, and exact `bioconda` requirement text.
