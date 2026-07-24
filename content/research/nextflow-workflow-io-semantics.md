---
type: research
title: "Nextflow workflow I/O semantics"
tags:
  - research/component
  - source/nextflow
status: draft
created: 2026-05-06
revised: 2026-05-08
revision: 4
ai_generated: true
related_notes:
  - "[[component-nextflow-pipeline-anatomy]]"
  - "[[component-nextflow-channel-operators]]"
  - "[[nextflow-parameters-meta]]"
  - "[[summary-nextflow]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
  - "[[nextflow-params-to-galaxy-inputs]]"
  - "[[nextflow-path-glob-to-galaxy-datatype]]"
related_molds:
  - "[[summarize-nextflow]]"
  - "[[nextflow-summary-to-galaxy-interface]]"
  - "[[nextflow-summary-to-galaxy-data-flow]]"
sources:
  - "https://www.nextflow.io/docs/latest/workflow.html"
  - "https://www.nextflow.io/docs/latest/process.html"
  - "https://www.nextflow.io/docs/latest/reference/channel.html"
  - "https://www.nextflow.io/docs/latest/reference/operator.html"
  - "https://www.nextflow.io/docs/latest/reference/stdlib-types.html"
  - "https://www.nextflow.io/docs/latest/cli.html#pipeline-parameters"
  - "https://www.nextflow.io/docs/latest/tutorials/workflow-outputs.html"
  - "https://nf-co.re/docs/specifications/pipelines/overview"
  - "https://nf-co.re/docs/specifications/pipelines/requirements/parameters"
  - "https://nf-co.re/docs/specifications/components/modules/input-output-options"
  - "https://nextflow-io.github.io/nf-schema/latest/nextflow_schema/nextflow_schema_specification/"
  - "https://nextflow-io.github.io/nf-schema/latest/samplesheets/samplesheetToList/"
summary: "Defines Nextflow workflow inputs and outputs from docs plus observed fixture pipeline structures."
---

# Nextflow workflow I/O semantics

Use this note when deciding what counts as a workflow input or output in a Nextflow pipeline before translating the interface into Galaxy or CWL. The central problem: Nextflow does not have one historical interface surface. Real pipelines spread interface meaning across `params`, `nextflow_schema.json`, sample-sheet schemas, entry workflow channel construction, process `input:` / `output:` blocks, named workflow `take:` / `emit:` blocks, `publishDir`, and newer workflow `publish:` / `output {}` blocks.

Evidence quality is split below:

- **Documentation-observed** claims come from Nextflow, nf-core, and nf-schema docs.
- **Corpus-observed** claims come from the pinned fixture corpus in `workflow-fixtures/pipelines/`.
- **Design inference** states how the Foundry should use those facts.

## What counts as input

Nextflow workflow input has three layers. The correct abstraction depends on which layer is being translated.

| Layer | Surface | Meaning | Translation value |
|---|---|---|---|
| Parameter surface | `params.*`, `params {}`, `nextflow_schema.json`, params files, config | User-facing values supplied at launch. May be scalars, paths, directories, glob patterns, sample sheets, toggles, tool choices, resource knobs, and output settings. | Strongest source for Galaxy top-level scalar parameters and candidate dataset inputs. |
| Materialization surface | `channel.fromPath`, `channel.fromFilePairs`, `channel.fromList(samplesheetToList(...))`, `splitCsv`, `file()`, `files()` | How launch values become channels or dataflow values. Encodes dataset-vs-collection shape. | Strongest source for Galaxy dataset and collection shapes. |
| Component surface | named workflow `take:`, process `input:` declarations | Internal function boundary. Names semantic channels or task-local staged files. | Strongest source for per-step shape and dependency semantics, not automatically top-level workflow inputs. |

Documentation-observed: an entry workflow can read `params`; named workflows declare inputs with `take:`. Processes declare task inputs with qualifiers including `val`, `path`, `env`, `stdin`, `tuple`, and `each`. A process call must be supplied a channel, dataflow value, or regular value for each declared input.

Design inference: top-level Galaxy workflow inputs should be derived from parameter plus materialization surfaces, not from every process `input:`. Process inputs mostly describe task-local staging and downstream wiring. Named workflow `take:` entries matter when the named workflow is the real pipeline body invoked by a thin entry workflow, as in many nf-core pipelines.

## Parameter surface

`params` values are the launch-time user interface. Defaults can be assigned in `.nf` files, `nextflow.config`, params files, or config profiles; command-line and config resolution order is defined by Nextflow's pipeline parameter docs. The same parameter can be a scalar threshold, an input file, an input directory, a glob, a sample-sheet path, a reference bundle, an output directory, or a behavior toggle.

When `nextflow_schema.json` exists, it is the best available declaration for parameter type, description, requiredness, and path-like intent. [[nextflow-parameters-meta]] records the supported nf-schema vocabulary: `type` is limited to `string`, `boolean`, `integer`, and `number`; `format` can mark `file-path`, `directory-path`, `path`, or `file-path-pattern`; `exists`, `mimetype`, `pattern`, `schema`, `enum`, `hidden`, and description fields refine behavior.

Corpus-observed:

| Shape | Evidence |
|---|---|
| All seven nf-core fixtures have root `nextflow_schema.json`. | `nf-core__demo`, `nf-core__fetchngs`, `nf-core__rnaseq`, `nf-core__bacass`, `nf-core__hlatyping`, `nf-core__sarek`, `nf-core__taxprofiler`. |
| Two ad-hoc fixtures also have root `nextflow_schema.json`. | `labsyspharm__mcmicro`, `epi2me-labs__wf-human-variation`. |
| Six ad-hoc fixtures lack a root `nextflow_schema.json`. | `CRG-CNAG__CalliNGS-NF`, `JaneliaSciComp__nf-demos`, `ZuberLab__crispr-process-nf`, `biocorecrg__MOP2`, `replikation__What_the_Phage`, `ncbi__egapx`. |
| nf-core schemas often make sample sheets explicit. | `nf-core__rnaseq/nextflow_schema.json` declares `input` as `type: string`, `format: file-path`, `exists: true`, `schema: assets/schema_input.json`, `mimetype: text/csv`, and `required: ["input", "outdir"]`. |
| Required parameters can be enforced imperatively when schema is absent or not authoritative. | `labsyspharm__mcmicro/main.nf` errors when `!params.containsKey('in')`; `CRG-CNAG__CalliNGS-NF/main.nf` assigns defaults directly to `params.genome`, `params.variants`, `params.denylist`, `params.reads`, and `params.results`. |

Design inference:

- Treat `nextflow_schema.json` as high-quality but incomplete. It says what the user may supply; the entry workflow says how the value becomes dataflow.
- Path-like `string` parameters are not automatically Galaxy `data` inputs. A `directory-path` may represent a data collection root, a reference bundle, a staged cache, or an output directory.
- `outdir`, `publish_dir_mode`, email, resource, and reporting parameters are workflow-control parameters. They usually should not become Galaxy workflow inputs unless the target harness intentionally exposes execution-control knobs.
- Requiredness should combine schema `required`, missing-default checks, imperative `error`, and runtime `ifEmpty { error ... }` guards.

## Sample sheets and records

Sample sheets are the dominant structured input idiom in modern nf-core pipelines. A sample sheet is a file parameter at the launch surface, but after validation and parsing it becomes a channel of records or tuples with metadata and paths.

Documentation-observed: nf-schema `samplesheetToList()` validates a CSV/TSV sample sheet with a JSON schema and converts rows into typed Groovy values. The helper emits columns in schema property order, not source column order, and can mark fields as `meta` so metadata becomes a map in channel items.

Corpus-observed:

- `nf-core__rnaseq/workflows/rnaseq/main.nf` imports `samplesheetToList`, reads `params.input` through `channel.fromList(samplesheetToList(params.input, "${projectDir}/assets/schema_input.json"))`, then maps rows into `[meta.id, meta + [single_end: ...], reads, genome_bam, transcriptome_bam]`, groups by sample, and branches into FASTQ or BAM paths.
- `nf-core__taxprofiler/subworkflows/local/utils_nfcore_taxprofiler_pipeline/main.nf` uses `samplesheetToList(input, "assets/schema_input.json")` for samples and `samplesheetToList(databases, "assets/schema_database.json")` for database definitions.
- `nf-core__sarek/subworkflows/local/utils_nfcore_sarek_pipeline/main.nf` uses `samplesheetToList` for both normal input and restart input.
- `epi2me-labs__wf-human-variation/lib/ingress.nf` validates a sample sheet, then builds `Channel.fromPath(sample_sheet).last().splitCsv(header: true, quote: '"')`.
- `replikation__What_the_Phage/phage.nf` treats `params.fasta` as either a CSV list that maps row 0 to sample name and row 1 to file path, or a direct FASTA file when list mode is off.

Design inference:

- A sample-sheet parameter often maps to a Galaxy collection input, not to a single file input, even though its schema type is `string` and `format: file-path`.
- Preserve row metadata. `val(meta)` and sample-sheet columns carry identifiers, labels, grouping axes, single/paired flags, and optional analysis groups. They are not datasets, but they often determine Galaxy collection identifiers and branch conditions.
- Prefer sample-sheet schema over ad-hoc filename inference when both exist. It carries column names, required columns, path columns, and metadata fields.

## Path and glob inputs

Direct path/glob construction is common, especially outside nf-core. It is also present in nf-core subworkflows for references and optional resources.

Documentation-observed:

- `channel.fromPath()` emits paths matching a file name or glob pattern. Options include existence checks and type filtering.
- `channel.fromFilePairs()` emits tuples of grouping key plus a sorted list of files. `size` controls expected pair size and `flat: true` flattens file pairs.
- `file()` returns one `Path`; `files()` returns a collection of `Path` objects.
- A process `path` input stages a file or collection of files into the task work directory.

Corpus-observed counts from the fixture corpus:

| Construct | Matches | Pipelines |
|---|---:|---:|
| `Channel.fromPath` / `channel.fromPath` | 118 | 9 |
| `Channel.fromFilePairs` | 7 | 2 |
| `splitCsv` | 14 | 5 |
| `fromSamplesheet` | 0 | 0 |

Representative observed forms:

- `CRG-CNAG__CalliNGS-NF/main.nf` sets `params.reads = "$baseDir/data/reads/rep1_{1,2}.fq.gz"` and materializes it with `Channel.fromFilePairs(params.reads)`.
- `biocorecrg__MOP2/mop_preprocess/mop_preprocess.nf` uses `Channel.fromPath(params.fast5).ifEmpty { error ... }` and `Channel.fromFilePairs(params.fastq, size: 1).ifEmpty { error ... }`.
- `labsyspharm__mcmicro/main.nf` derives multiple channels from subdirectories below `params.in`, including `markers.csv`, raw-image files, staging directories, and precomputed intermediates.
- `epi2me-labs__wf-human-variation/main.nf` maps optional BED/reference inputs with `Channel.fromPath(params.bed, checkIfExists: true)` or placeholder files when absent.

Design inference:

- `fromPath` over one concrete file is a candidate Galaxy dataset input.
- `fromPath` over a directory or glob is a candidate Galaxy collection input, but the collection type depends on downstream tuple shape and process qualifiers.
- `fromFilePairs` is strong evidence for paired files, usually Galaxy `paired` or `list:paired`, unless `size: 1` indicates grouped singleton files.
- Placeholder paths such as `OPTIONAL_FILE` represent optional-branch plumbing, not real user inputs.
- `ifEmpty { error ... }` is requiredness evidence for the materialized dataflow, even if the parameter schema does not mark the parameter required.

## Channels, values, and operators

Nextflow dataflow has two cardinality classes: channels and dataflow values. Channels are asynchronous sequences; dataflow values are singleton asynchronous values. Operators transform, filter, combine, fork, or reduce them. [[component-nextflow-channel-operators]] gives the detailed operator taxonomy; this note only records why operators matter for workflow I/O.

Documentation-observed:

- `map` is one-to-one except null results are not emitted.
- `flatMap` and `flatten` fan out values.
- `collect`, `toList`, and related operators fan in many values into one list-like value.
- `groupTuple` groups tuple streams by key and emits grouped payload lists.
- `join`, `combine`, `cross`, `mix`, and `concat` combine channels with different key/order semantics.
- `branch` and `multiMap` return multiple channels.

Design inference:

- Channel shape is part of the interface. A path parameter that becomes `tuple(meta, [fastq_1, fastq_2])` should not translate like a scalar file parameter.
- Operators between materialization and first process call may change the Galaxy input shape. `groupTuple()` can turn rows into per-sample collections; `branch` can split one input surface into alternative workflow paths; `collect()` can turn many files into one collection-valued dependency.
- Some operators are nondeterministic or order-sensitive. Translation should prefer keyed metadata and explicit identifier matching over implicit channel order.

## Process and named workflow surfaces

Process `input:` and `output:` blocks define task interface. Named workflow `take:` and `emit:` define reusable workflow interface. These are real I/O surfaces, but not always top-level pipeline I/O surfaces.

Corpus-observed counts from 700 `.nf` files:

| Surface | Matches |
|---|---:|
| `input:` blocks | 656 |
| `output:` blocks | 677 |
| `take:` blocks | 266 |
| workflow/module `emit:` blocks | 244 |
| `path` qualifier | 1229 |
| `val` qualifier | 325 |
| `tuple` qualifier | 1953 |
| `env` qualifier | 20 |
| `each` qualifier | 9 |
| legacy `file` qualifier | 71 |
| legacy `set` qualifier | 21 |

Representative observed forms:

- `nf-core__rnaseq/modules/nf-core/fastqc/main.nf` uses input `tuple val(meta), path(reads)` and emits named HTML, ZIP, and versions outputs.
- `CRG-CNAG__CalliNGS-NF/modules.nf` has simple path inputs such as `path genome`, and mixed tuple outputs such as `tuple val(replicateId), path(...bam), path(...bai)`.
- `ZuberLab__crispr-process-nf/main.nf` still uses legacy DSL1-ish `set val(lane), file(bam) from rawBamFiles` and `set val(lane), file("${lane}.fastq.gz") into fastqFilesFromBam`.
- `nf-core__rnaseq/workflows/rnaseq/main.nf` declares a named workflow `take:` with semantic channel names such as `ch_samplesheet`, `ch_fasta`, and `ch_star_index`, plus comments describing expected path shapes.

Documentation-observed process qualifier meanings:

| Qualifier | Meaning for interface extraction |
|---|---|
| `val` | Scalar or metadata value. Not a dataset unless it is a path string intentionally passed as scalar. |
| `path` / legacy `file` | Staged file or collection of files. Strong dataset evidence. |
| `tuple` / legacy `set` | One channel item with multiple typed fields. Strong collection/record evidence, not automatically one Galaxy collection. |
| `env` | Environment variable value. Usually scalar/tool parameter semantics. |
| `stdin` / `stdout` | Stream surface. Rare in this corpus; translate only with per-process review. |
| `each` | Repeater. Expands task combinations and often maps to parameter sweeps or collection map-over. |

Design inference:

- For top-level interface conversion, process inputs validate and refine shape; they should not create new workflow inputs unless their upstream source is a top-level parameter or external file construction.
- Named workflow `take:` blocks are especially important in nf-core because the entry workflow often delegates to one substantive named workflow after initialization.
- `tuple val(meta), path(...)` is the core idiom for keyed dataset collections. The `meta` map supplies identifiers; the `path` field supplies datasets.
- Legacy `file` / `set` must be supported for ad-hoc pipelines even if new guidance prefers `path` / `tuple`.

## What counts as output

Nextflow output has four distinct meanings. Confusing them produces bad Galaxy interfaces.

| Surface | Meaning | Top-level output confidence |
|---|---|---|
| Process `output:` | Files/values emitted from a task into dataflow. | Medium. Internal unless published or exposed by workflow emits. |
| Named workflow `emit:` | Outputs exposed by a named workflow call. | Medium to high when the named workflow is the main pipeline body. |
| `publishDir` | Side-effect copy/link of selected process outputs into an output directory. | High for user-visible output intent; low for dataflow shape alone. |
| Entry workflow `publish:` plus top-level `output {}` | Modern declared workflow outputs. | Highest when present. |

Documentation-observed:

- Workflow output blocks are available as preview in Nextflow 24.04, 24.10, and 25.04, and documented as added in 25.10.
- Workflow outputs are intended to replace `publishDir`.
- Entry workflow `publish:` assigns channels to output names; top-level `output {}` declares how those outputs are published.
- Workflow output `path` can be static, dynamic per value, or use `>>` to publish selected files.
- Workflow output `index` can write CSV, JSON, or YAML metadata preserving channel value structure.
- `publishDir` is asynchronous side-effect publishing. Downstream processes should use declared process outputs, not files in publish directories.

Corpus-observed:

- Only one fixture had a top-level `output {}` block: `nf-core__sarek/main.nf` publishes `multiqc = NFCORE_SAREK.out.multiqc_publish` and declares `output { multiqc { path "multiqc" } }`.
- Inline `publishDir` in `.nf` files was observed primarily in ad-hoc fixtures: 113 matches across 7 pipelines.
- nf-core publishing is primarily config-driven. For example, `nf-core__rnaseq/workflows/rnaseq/nextflow.config` uses `process.withName` selectors with `publishDir = [ path: { "${params.outdir}/..." }, mode: params.publish_dir_mode, pattern: '*.bam', saveAs: { ... } ]`.
- `nf-core__taxprofiler/conf/modules.config` contains many `publishDir` blocks; module `.nf` files mostly declare outputs and versions but leave publication policy to config.
- `replikation__What_the_Phage/workflows/process/virsorter2/virsorter2_collect_data.nf` publishes a tarball with inline `publishDir "${params.output}/${name}/raw_data", mode: 'copy', pattern: "virsorter2_results_${name}.tar.gz"`.
- `ncbi__egapx/nf/ui.nf` uses a UI/export process with `publishDir "${params.output}", mode: 'copy', saveAs: { ... }`, many staged inputs, and `path "*", includeInputs: true`.

Design inference:

- Prefer top-level workflow `output {}` when present; it is explicit interface vocabulary.
- Otherwise combine named workflow emits, process emits, and publication rules to identify user-visible outputs.
- Do not use `publishDir` as dataflow. Use it to name, group, filter, and label final outputs.
- Config-driven `publishDir` is load-bearing for nf-core. Reading only `.nf` files misses user-visible output intent.
- `versions.yml` and `topic: versions` are provenance/reporting outputs. They should usually become a report/provenance output class, not primary scientific outputs.

## nf-core versus ad-hoc posture

The fixture corpus shows two different extraction modes.

| Feature | nf-core fixtures | Ad-hoc fixtures |
|---|---|---|
| Parameter schema | Always root `nextflow_schema.json`. | Mixed; two roots have schemas, six do not. |
| Sample sheet | Usually `samplesheetToList` plus `assets/schema_*.json`. | Direct `fromPath`, `fromFilePairs`, `splitCsv`, directory discovery. |
| Module I/O | Heavy `tuple val(meta), path(...)`, named `emit`, versions channels. | Mixed DSL2 and legacy DSL1-ish `file` / `set`; less uniform names. |
| Publishing | Mostly config `publishDir` selectors. | Often inline `publishDir` in `.nf` files. |
| Requiredness | Schema `required` plus validation helpers. | Imperative `error`, `ifEmpty`, defaults, and custom parsers. |

Design inference: a robust summarizer needs two paths. The nf-core path should trust schema and convention but still inspect workflow construction. The ad-hoc path should mine defaults, guards, channel factories, process qualifiers, and publication side effects more aggressively.

## Extraction order for Foundry Molds

For [[summarize-nextflow]] and downstream interface Molds, use this order:

1. **Inventory launch params.** Read `nextflow_schema.json` if present; also read `params` defaults in `.config` and `.nf` files. Record type, format, default, requiredness, enum, path constraints, and descriptions.
2. **Classify control params.** Separate data-bearing parameters from output, resource, profile, reporting, and behavior toggles. Keep toggles if they alter workflow shape.
3. **Resolve sample-sheet schemas.** When a param property has `schema: assets/schema_*.json` or the workflow calls `samplesheetToList`, parse the sample-sheet schema as the structured input shape.
4. **Trace materialization.** Follow each input-like param into `fromPath`, `fromFilePairs`, `fromList`, `splitCsv`, `file`, `files`, placeholder channels, and `ifEmpty` guards.
5. **Read component boundaries.** Use named workflow `take:` / `emit:` and process `input:` / `output:` to refine channel shapes, file arity, optionality, and labels.
6. **Apply operator semantics.** Use [[component-nextflow-channel-operators]] to account for grouping, branching, fan-in, fan-out, joins, and reductions before the first task or final output.
7. **Identify output intent.** Prefer workflow output blocks. Otherwise inspect named emits plus `publishDir` in `.nf` and `.config` files. Keep publication grouping separate from dataflow edges.
8. **Emit confidence.** Mark schema-backed, sample-sheet-backed, and direct channel-backed facts as high confidence. Mark glob-only file typing, dynamic closures, and output side effects as lower confidence.

## Mapping reminders

- `params.input` is only a name. Determine whether it is a sample sheet, direct dataset, directory, glob, accession list, or workflow mode switch.
- `val(meta)` is metadata, not data. Use it for Galaxy collection identifiers, labels, tags, and synchronization.
- `tuple` is a record, not automatically a Galaxy paired collection. Pairing requires path count and semantic evidence.
- `path` with `arity: '1'` is stronger single-file evidence than a glob with no arity.
- `optional: true` outputs emit nothing when absent; Galaxy output handling may need conditional or optional-output modeling.
- Multiple queue channels to one process can be nondeterministic; prefer keyed `join` / `combine` evidence before assuming synchronized collections.
- Topic channels are implicit fan-in. In this corpus they mostly carry versions, but the extractor should not assume topic edges are normal explicit wires.
- Workflow `output {}` and `publishDir` both describe user-visible files, but only workflow `publish:` participates in the modern top-level workflow output interface.

## Open questions

- ~~Should `summary-nextflow` distinguish launch parameters from materialized workflow inputs as separate arrays?~~ **Resolved 2026-05-08 — no.** `summary-nextflow` stays Nextflow-faithful: `params[]` is the launch surface, `sample_sheets[]` is the structured-bridge surface, and materialization stays inside `workflow.channels[]`. The input-vs-intermediate-vs-reference classification is a *target* concern and lives in [[nextflow-summary-to-galaxy-interface]] / `nextflow-summary-to-cwl-interface`. Three small Nextflow-faithful enrichments to `workflow.channels[]` were added so the converter does mechanical lookups instead of re-parsing `source` strings: `construct` (typed enum), `from_param` (FK into `params[]` for direct references), and `required_runtime` (boolean from `.ifEmpty { error … }` guards). One-hop Groovy bindings (`def reads = params.reads; Channel.fromPath(reads)`) are deferred to galaxyproject/foundry#211. Tracking issue galaxyproject/foundry#179.
- ~~Should sample-sheet schemas become first-class structured inputs instead of prose inside a parameter entry?~~ **Resolved 2026-05-05 — yes.** Promoted to `Summary.sample_sheets[]` in [[summary-nextflow]] rev 6; resolution rationale and Galaxy-side mapping in [[galaxy-sample-sheet-collections]]; tracking issue galaxyproject/foundry#177.
- ~~How should Galaxy targets expose Nextflow execution-control parameters such as `outdir`, `publish_dir_mode`, email, and `save_*` toggles?~~ **Resolved 2026-05-06 for v1 — classify by effect in [[nextflow-params-to-galaxy-inputs]]: exclude publish/runtime controls by default; keep booleans/enums only when they alter workflow shape, tool choice, or command outputs.**
- Do workflow output `index` files deserve a target-side Galaxy pattern for preserving sample metadata beside published datasets?
- How much legacy DSL1 support should the cast skill keep for `file` / `set` pipelines versus flagging them as low-confidence?
