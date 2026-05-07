---
type: research
subtype: component
title: "Nextflow params to Galaxy workflow inputs"
tags:
  - research/component
  - source/nextflow
  - target/galaxy
status: draft
created: 2026-05-06
revised: 2026-05-06
revision: 3
ai_generated: true
related_notes:
  - "[[nextflow-workflow-io-semantics]]"
  - "[[gxformat2-workflow-inputs]]"
  - "[[galaxy-sample-sheet-collections]]"
  - "[[nextflow-path-glob-to-galaxy-datatype]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
  - "[[galaxy-workflow-testability-design]]"
  - "[[galaxy-collection-semantics]]"
  - "[[summary-nextflow]]"
  - "[[nextflow-summary-to-galaxy-interface]]"
  - "[[nextflow-summary-to-galaxy-data-flow]]"
related_molds:
  - "[[summarize-nextflow]]"
  - "[[nextflow-summary-to-galaxy-interface]]"
  - "[[nextflow-summary-to-galaxy-data-flow]]"
sources:
  - "https://www.nextflow.io/docs/latest/cli.html#pipeline-parameters"
  - "https://nextflow-io.github.io/nf-schema/latest/nextflow_schema/nextflow_schema_specification/"
  - "https://nextflow-io.github.io/nf-schema/latest/samplesheets/samplesheetToList/"
  - "https://github.com/galaxyproject/gxformat2/blob/main/schema/v19_09/workflow.yml"
  - "https://github.com/galaxyproject/galaxy/blob/dev/lib/galaxy/workflow/modules.py"
summary: "Rules for translating Nextflow params, sample sheets, channels, and control flags into gxformat2 inputs."
---

# Nextflow params to Galaxy workflow inputs

Use this note when [[nextflow-summary-to-galaxy-interface]] turns a [[summary-nextflow]] artifact into Galaxy workflow inputs. [[nextflow-workflow-io-semantics]] defines what counts as a Nextflow interface surface; this note narrows that into gxformat2 input decisions.

Evidence quality:

- **Corpus-observed** claims cite pinned fixtures under `$NEXTFLOW_FIXTURES`, the shared clone at `/Users/jxc755/projects/repositories/workflow-fixtures/pipelines/`.
- **Foundry-internal** claims cite existing Foundry notes and the `summary-nextflow` schema.
- **External-doc** claims cite Nextflow, nf-schema, gxformat2, and Galaxy docs.
- **Design inference** states the translation posture this Foundry note recommends.

## Translation order

1. Read `summary.params[]`, `summary.sample_sheets[]`, `summary.workflow.channels[]`, `summary.workflow.conditionals[]`, process and subworkflow `inputs[]`, and any warnings.
2. Classify each launch param as data-bearing, structured sample sheet, scalar workflow parameter, workflow-shape control, runtime/publish control, or reference/data-table selector.
3. For data-bearing params, use materialization evidence (`fromPath`, `fromFilePairs`, `file`, `files`, `splitCsv`, `samplesheetToList`) before process inputs.
4. Use process and named-workflow inputs to refine shape and identifiers, not to invent top-level Galaxy inputs without upstream launch-param or external-source evidence.
5. Decide gxformat2 type (`data`, `collection`, `string`, `int`, `float`, `boolean`), then separately decide `format`, `collection_type`, `optional`, `default`, and confidence.

Design inference: translate from launch params plus materialization evidence, not from every process `input:`. Process inputs refine shape; they do not create top-level Galaxy inputs unless traced to a launch param or external materialization.

## Summary to gxformat2 mapping

| `summary-nextflow` evidence | Question | gxformat2 input | Fields | Confidence |
|---|---|---|---|---|
| `sample_sheets[]` with `param = p` | Does launch param `p` describe row-structured datasets? | `type: collection` | `collection_type: sample_sheet*`, `column_definitions`, `optional` | High for `nf-schema` or `samplesheetToList`; lower for `splitCsv` or `ad-hoc`. |
| `params[]` scalar type, not data/control | User-facing scalar? | `string`, `int`, `float`, `boolean` | `default`, `optional`, `restrictions` from enum | High when schema-backed. |
| `params[]` path-like plus concrete `fromPath` / `file()` | Single dataset? | `type: data` | `format` only if [[nextflow-path-glob-to-galaxy-datatype]] is confident | Medium to high. |
| `params[]` path-like plus glob/directory/list materialization | Collection? | `type: collection` | `collection_type: list` unless shape evidence says otherwise | Medium. |
| `workflow.channels[].source` uses `fromFilePairs` | Paired files? | `type: collection` | `collection_type: paired` or `list:paired` | Medium; high when current source evidence pins sample cardinality. |
| Repeated `tuple val(meta), path(reads)` | Per-sample dataset list | `type: collection` | `collection_type: list`; use `meta` for identifiers | High. |
| Repeated `tuple val(meta), path(reads)` where `reads` is `[R1, R2]` | Paired read collection | `type: collection` | `collection_type: list:paired` or `sample_sheet:paired` if sample-sheet-backed | High. |
| `tuple val(meta), path(a), path(b)` | Heterogeneous record? | Usually parallel inputs or `sample_sheet:record` | Do not default to paired | Medium. |
| `processes[].inputs[]` only | Internal task input? | No top-level input | Use only to refine shape | High. |
| `workflow.conditionals[]` guard references param | Branching control? | Scalar input if preserving branch | `boolean` or enum/string; default from param | Medium to high. |
| Hidden/report/resource/output-only param | Runtime control? | Usually exclude | Record as excluded control param when useful | High. |

## Scalar typing

| Nextflow / nf-schema type | gxformat2 type | Notes |
|---|---|---|
| `boolean` | `boolean` | Preserve default if present. |
| `integer` | `int` | Use current gxformat2 spelling, not `integer`. |
| `number` | `float` | Use current gxformat2 spelling, not `double`. |
| `string` | `string` | Add `restrictions` from enum when choices are closed. |
| Primitive list | `[string]`, `[int]`, `[float]`, `[boolean]` | Use only when Galaxy should expose multiple primitive values; otherwise keep as string or ask for interface design. |
| Path string that is a user dataset | `data` or `collection` | Do not leave as scalar if Galaxy should receive uploaded or selected data. |
| Path string that selects reference data | `data` input the user supplies, or a workflow-curated `string` enum with `restrictions` | Avoid introducing new Galaxy data tables (`from_data_table` / `.loc`); see §Reference data below. |

A path-like Nextflow string is not automatically Galaxy `data`. First decide whether it is a dataset, collection, sample sheet, reference selector, output directory, or runtime-control path.

## Sample sheets

When `summary.sample_sheets[]` exists, it is the preferred input-shape source for that param. Map it to Galaxy `sample_sheet*` when row metadata should survive as invocation-time structured metadata.

| Sample-sheet evidence | Galaxy input |
|---|---|
| One path/data column per row | `type: collection`, `collection_type: sample_sheet` |
| Two required path/data columns forming R1/R2 | `collection_type: sample_sheet:paired` |
| Optional second mate or mixed single/paired rows | `collection_type: sample_sheet:paired_or_unpaired` |
| Multiple heterogeneous path columns per row | `collection_type: sample_sheet:record` |
| `splitCsv(header: true)` without column schema | Use `sample_sheet*` only if roles are clear; otherwise fall back to flat `data` CSV or ordinary collections. |
| Source consumes the manifest file literally | `type: data`, `format: csv` or `tsv` if confident. |
| Source uses the sheet to fetch accessions or remote references | Treat as manifest data or scalar/reference design choice; do not invent dataset collections. |

Use flat `data` CSV only when the workflow consumes the manifest as a file or the target cannot safely model row datasets and metadata.

## Non-sample-sheet collections

| Nextflow evidence | Galaxy shape |
|---|---|
| Direct `fromPath` over many files | `collection_type: list` |
| Direct paired glob / `fromFilePairs` | `paired` for one sample; `list:paired` for many samples |
| Existing per-sample tuple stream without explicit column schema | `list` or `list:paired` |
| Mixed single/paired branch split | `paired_or_unpaired` or split into `list` plus `list:paired` |
| Nested grouping axis matters | `list:list`, `list:paired`, or explicit reshaping; do not collapse silently. |
| Arbitrary tuple/record | Parallel inputs, explicit tabular metadata, or manual interface decision. |

See [[nextflow-to-galaxy-channel-shape-mapping]] for detailed channel-shape rules. Keep collection shape separate from datatype; R1/R2 names determine pairing, not the Galaxy datatype extension.

## Control params

Exclude by default:

| Class | Examples | Reason |
|---|---|---|
| Output location/publishing | `outdir`, `publish_dir_mode` | Galaxy owns histories and workflow outputs. |
| Email/notification | `email`, `email_on_fail`, `plaintext_email`, `hook_url` | Runtime reporting, not scientific input. |
| Logs/reports/runtime metadata | `trace_report_suffix`, `monochrome_logs`, `validate_params` | Execution UX. |
| Institutional/profile config | `config_profile_name`, `pipelines_testdata_base_path` | Site/run environment config. |
| CLI plumbing | `help`, `help_full`, `show_hidden`, `version` | Nextflow CLI behavior. |
| Pure publish toggles | `save_*` flags that only affect `publishDir` | Galaxy output exposure should be a workflow-design choice. |

Keep as Galaxy scalar inputs when they alter workflow shape:

| Class | Examples | Reason |
|---|---|---|
| Tool or mode switches | `aligner`, `trimmer`, `ribo_removal_tool`, `tools` | Selects subgraph or tool branch. |
| Skip flags that gate analysis | `skip_alignment`, `skip_trimming`, `skip_fastqc` | Changes which steps run. |
| Save flags that change command outputs | tool arguments that make extra datasets | Alters command and output set. |
| Report config consumed by a Galaxy tool | `multiqc_config`, `multiqc_logo` | Real data input if the target includes that customization. |

A `save_*` or `skip_*` name is not enough. Classify by effect: if the param only changes `publishDir`, exclude. If it changes whether processes run, which tool is called, or which files a command creates, keep as scalar input or resolve to a fixed Galaxy design default.

### Warning and impact assessment

Most execution-control params (`outdir`, `publish_dir_mode`, email, `save_*` toggles, reporting flags) are not Galaxy workflow concerns: Galaxy owns history layout, output exposure, and notifications. Drop them silently from the Galaxy interface, but record them so casting can surface a single warning to the user and a per-param impact note to the agent.

Cast Mold posture:

- **Warn the user.** Emit one consolidated notice listing each Nextflow param dropped from the Galaxy interface, grouped by class (publish, notification, runtime UX, CLI plumbing). The user should know the Galaxy target is not a faithful CLI replica.
- **Assess problematic cases.** For each dropped param the agent must decide whether the omission only changes runtime UX (safe) or changes scientific output (problematic). Mark a param problematic when any of these hold:
  - It is referenced outside `publishDir` / report config — e.g. inside a process script, channel construction, or branch guard.
  - A `save_*` flag gates a tool argument or process that produces a published dataset the Galaxy target should expose.
  - A `skip_*` flag gates a process whose outputs feed downstream steps the target keeps.
  - It selects a reference / database location with no portable Galaxy substitute (user-supplied `data`, curated `string` enum, or existing CVMFS path).
  - It is required by nf-schema and has no Galaxy-side substitute.
- **Promote, don't drop, when problematic.** Convert the param into a scalar input, fixed design default, or recorded validation loss; do not let it stay in the silent-exclude bucket.
- **Record the decision.** Each excluded param gets `source_param`, `class`, `effect`, `assessment` (`safe` or `problematic`), and a one-line reason in the interface brief, so review can audit the exclusion list.

Default to safe-exclude only after the agent has traced the param's references in the summary; a name match alone is not assessment.

## Requiredness and defaults

| Evidence | Interpretation | Strength |
|---|---|---|
| nf-schema root `required[]` includes param | Required launch param | High |
| `Param.required: true` | Required, source-normalized | High |
| Missing-default imperative `error` | Required | High |
| `Channel.fromPath(...).ifEmpty { error ... }` | Materialized data required | High, but may be branch-conditional. |
| Sample-sheet column required | Required row column | High |
| Default exists | Default value, not optionality | Medium to high |
| Optional placeholder path or empty channel | Optional branch plumbing | Medium |
| Branch guard uses param | Required only in that branch | Medium |

Rules:

- Set `optional: false` unless omission is semantically valid.
- Do not infer `optional: true` from `default`.
- Set `default` when Galaxy should supply a value if the user omits or nulls the input.
- For branch-required inputs, prefer a scalar mode input plus branch-specific data inputs and a confidence note.
- For sample sheets, required metadata columns become `column_definitions[].optional: false`; optional mate columns usually imply `sample_sheet:paired_or_unpaired`.
- `ifEmpty { error }` after filters may mean content constraint, not launch-param requiredness. Preserve that as validation loss or an open question.

## Confidence annotations

| Confidence | Use when |
|---|---|
| High | nf-schema and materialization agree; sample-sheet schema exists; channel shape is simple; Galaxy shape is native. |
| Medium | One strong source plus inferred shape; branch/default interaction; path format known but arity inferred. |
| Low | Ad-hoc CSV parsing; glob-only typing; dynamic Groovy closures; arbitrary tuple/record; control effect unclear. |

Downstream interface briefs should record `source_param`, `evidence`, chosen `galaxy_input_type`, `collection_type` if applicable, `requiredness_basis`, known losses, confidence, and open questions.

## Corpus examples

Corpus-observed:

- `$NEXTFLOW_FIXTURES/nf-core__rnaseq/nextflow_schema.json` declares `input` as required with `format: file-path`, `exists: true`, `schema: assets/schema_input.json`, and `mimetype: text/csv`. Do not map it as plain `data` by default; inspect the row schema and materialization.
- `$NEXTFLOW_FIXTURES/nf-core__rnaseq/assets/schema_input.json` includes `sample`, `fastq_1`, optional `fastq_2`, `strandedness`, and optional BAM path columns. This is sample metadata plus datasets, not just a CSV file.
- `$NEXTFLOW_FIXTURES/nf-core__rnaseq/workflows/rnaseq/main.nf` passes mode and skip parameters such as `trimmer`, `remove_ribo_rna`, `ribo_removal_tool`, `skip_alignment`, and `aligner` into workflow branches and subworkflows. Preserve these only when the Galaxy target keeps source configurability.
- `$NEXTFLOW_FIXTURES/nf-core__taxprofiler/subworkflows/local/utils_nfcore_taxprofiler_pipeline/main.nf` calls `samplesheetToList` for both biological input and database definitions. These likely map to different Galaxy interface decisions: sample datasets versus database/reference strategy.
- `$NEXTFLOW_FIXTURES/nf-core__sarek/subworkflows/local/samplesheet_to_channel/main.nf` uses `ifEmpty { error }` after sample filters for tumor/normal constraints. That is conditional content validation, not just unconditional top-level requiredness.

Foundry-internal:

- [[gxformat2-workflow-inputs]] separates `optional` from `default` and recommends current gxformat2 scalar spellings.
- [[galaxy-sample-sheet-collections]] defines `sample_sheet`, `sample_sheet:paired`, `sample_sheet:paired_or_unpaired`, and `sample_sheet:record`.
- [[nextflow-workflow-io-semantics]] records that `params.input` is only a name; materialization decides whether it is a sample sheet, direct dataset, directory, glob, accession list, or mode switch.

## Reference data

Nextflow pipelines often pass reference paths through params (genomes, indices, annotation bundles, kraken DBs). Translating these to Galaxy:

- **Prefer a `data` input the user supplies** when the reference is small, distributable, or already lives on the Galaxy instance as a regular dataset.
- **Prefer a workflow-curated `string` input with `restrictions`** when there is a small closed set of supported references the workflow author wants to enumerate.
- **Reuse existing CVMFS / data-table-backed inputs** only when an established Galaxy tool the workflow already calls expects that exact `.loc` value (e.g. `bowtie2_indexes`). The string is then the `.loc` first column, as in [[iwc-test-data-conventions]].
- **Do not introduce new Galaxy data tables to support a translated workflow.** Data tables require admin install, `tool_data_table_conf.xml` edits, and `.loc` files, which break the Foundry's portability-first posture: a translated workflow should run on a stock Galaxy with user-uploaded inputs. Record the loss and ask for an interface decision instead.

The same rule applies to database/reference sample sheets (e.g. nf-core/taxprofiler `databases`): map them to a regular sample-sheet collection of user-supplied datasets, or to a curated string selector — not to a new admin-managed table.

## Open questions

- Conditional requiredness has no clean pure-gxformat2 expression; interface briefs need review notes.
