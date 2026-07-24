---
type: mold
name: summarize-nextflow
axis: source-specific
source: nextflow
tags:
  - mold
  - source/nextflow
status: reviewed
created: 2026-04-30
revised: 2026-07-24
revision: 14
ai_generated: true
output_artifacts:
  - id: summary-nextflow
    kind: json
    default_filename: summary-nextflow.json
    schema: "[[summary-nextflow]]"
    description: "A structured JSON summary of a Nextflow pipeline, including its interface, processes, data flow, software environment, and test fixtures."
references:
  - kind: schema
    ref: "[[summary-nextflow]]"
    used_at: both
    load: upfront
    mode: verbatim
    evidence: cast-validated
    purpose: "Validate the emitted Nextflow summary JSON and provide downstream consumers the output contract."
  - kind: schema
    ref: "[[nf-core-module-meta]]"
    used_at: both
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Validate per-module meta.yml when walking nf-core modules; pins the channel IO `type` enum and tools/containers shape."
  - kind: schema
    ref: "[[nf-core-subworkflow-meta]]"
    used_at: both
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Validate subworkflow meta.yml; backs Subworkflow.calls extraction via the components: declaration."
  - kind: schema
    ref: "[[nextflow-parameters-meta]]"
    used_at: both
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Validate per-pipeline nextflow_schema.json (Draft 2020-12) when extracting params[]."
  - kind: cli-tool
    ref: "[[foundry]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: cast-validated
    purpose: "Schema-check summary-nextflow.json before returning it from the skill."
  - kind: research
    ref: "[[component-nextflow-pipeline-anatomy]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: hypothesis
    purpose: "Interpret DSL2 layout, includes, workflow/subworkflow/module boundaries, and channel/process topology."
    trigger: "When walking pipeline structure or resolving process aliases and channel flow."
    verification: "Run the generated summarize-nextflow skill against nf-core/rnaseq and confirm this reference improves process/channel topology extraction."
  - kind: research
    ref: "[[component-nextflow-containers-and-envs]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Resolve container, conda, Wave, and Bioconda/Biocontainers environment evidence."
    trigger: "When extracting tools, versions, containers, conda directives, or environment equivalences."
  - kind: research
    ref: "[[component-nextflow-testing]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: hypothesis
    purpose: "Extract nf-test files, snapshot fixtures, test profiles, and Nextflow test-data conventions."
    trigger: "When filling test_fixtures or nf_tests sections of the summary."
    verification: "Run the generated summarize-nextflow skill against nf-core/bacass and confirm this reference improves nf_tests and snapshot fixture extraction."
related_notes:
  - "[[summary-nextflow]]"
summary: "Read a Nextflow pipeline source tree (nf-core or ad-hoc DSL2) and emit a structured JSON summary for downstream translation Molds."
---

# summarize-nextflow

Read a Nextflow pipeline source tree (nf-core or ad-hoc DSL2) and emit a structured JSON summary describing its processes, channels, conditionals, containers, parameters, and test fixtures. Source-specific (Nextflow), target-agnostic. The summary is the input to every downstream Mold in the `NEXTFLOW → GALAXY` and `NEXTFLOW → CWL` pipelines: `nextflow-summary-to-galaxy-interface`, `nextflow-summary-to-galaxy-data-flow`, `nextflow-summary-to-cwl-interface`, `nextflow-summary-to-cwl-data-flow`, `author-galaxy-tool-wrapper` (for the container/conda block), `nextflow-test-to-galaxy-test-plan`, and `nextflow-test-to-cwl-test-plan` (for the test-fixture block).

This Mold owns **only the read-and-structure step**. Every cross-source-and-target translation lives downstream; this Mold is responsible for surfacing what exists in the NF tree honestly, not for reshaping it toward Galaxy or CWL idioms.

The output schema is per-source by design — see [[gxy-sketches-alignment]] for why a forced-shared cross-source summary shape was rejected.

## Inputs

The Mold expects:

- A **path or git URL** to the NF pipeline. Local clone is preferred; a git URL triggers a shallow clone the cast skill manages.
- Optional **pin**: tag, branch, or commit SHA. Mirrors `SketchSource` semantics from gxy-sketches.
- Optional **profile hint** (`test`, `test_full`, …) selecting which `conf/<profile>.config` to read for fixtures. Defaults to `test`.
- Optional **test-data directory**. When provided with fixture fetching, remote samplesheets and referenced files are downloaded under that directory and their local paths are recorded in `test_fixtures.inputs[].path`.

Whole-pipeline only. The Mold does **not** accept "summarize this single subworkflow" subset hints; subset summarization is an open question — see Non-goals.

## Outputs

A single JSON document conforming to [[summary-nextflow]] (`packages/summarize-nextflow/src/schema/summary-nextflow.schema.json`). Sketch shape:

```jsonc
{
  "source": {                                  // mirrors SketchSource
    "ecosystem": "nf-core" | "nextflow",
    "workflow": "rnaseq",
    "url": "https://github.com/nf-core/rnaseq",
    "version": "3.14.0",                       // tag or commit SHA
    "license": "MIT",
    "slug": "nf-core-rnaseq"
  },
  "params": [
    { "name": "input", "type": "path", "default": null,
      "description": "Samplesheet CSV", "required": true }
  ],
  "sample_sheets": [
    { "param": "input",
      "schema_path": "assets/schema_input.json",
      "discovered_via": "nf-schema",
      "format": "csv", "header": true,
      "columns": [
        { "name": "sample",     "type": "string", "kind": "meta", "required": true,
          "pattern": "^\\S+$" },
        { "name": "fastq_1",    "type": "string", "kind": "data", "format": "file-path",
          "required": true,  "exists": true, "pattern": "^\\S+\\.f(ast)?q\\.gz$" },
        { "name": "fastq_2",    "type": "string", "kind": "data", "format": "file-path",
          "required": false, "exists": true, "pattern": "^\\S+\\.f(ast)?q\\.gz$" },
        { "name": "strandedness","type": "string", "kind": "meta", "required": true,
          "enum": ["forward", "reverse", "unstranded", "auto"] }
      ] }
  ],
  "profiles": ["test", "test_full", "docker", "singularity", "conda"],
  "tools": [                                   // mirrors gxy-sketches ToolSpec, augmented
    { "name": "fastp", "version": "0.23.4",
      "biocontainer": "biocontainers/fastp:0.23.4--h5f740d0_0",   // accepts quay.io/ or docker.io biocontainers/ alias
      "bioconda":     "bioconda::fastp=0.23.4",
      "docker":       null,
      "singularity":  "https://depot.galaxyproject.org/singularity/fastp:0.23.4--h5f740d0_0",
      "wave":         null }                                        // Seqera Wave / community-cr registry
  ],
  "processes": [
    { "name": "MINIMAP2_ALIGN",                               // canonical name
      "aliases": ["MINIMAP2_CONSENSUS", "MINIMAP2_POLISH"],   // re-imported under multiple names; edges reference the alias
      "module_path": "modules/nf-core/minimap2/align/main.nf",
      "tool": "minimap2_mulled",                              // FK into tools[].name
      "container": "${ workflow.containerEngine == 'singularity' && !task.ext.singularity_pull_docker_container ? '<sing-uri>' : '<other-uri>' }",  // verbatim directive
      "conda":     "${moduleDir}/environment.yml",                                                                                                  // verbatim directive
      "inputs":  [ { "name": "reads", "shape": "tuple(val(meta), path(reads))", "description": "...", "topic": null } ],
      "outputs": [ { "name": "paf",      "shape": "tuple(val(meta), path(\"*.paf\")) optional", "description": "...", "topic": null },
                   { "name": "versions", "shape": "path(\"versions.yml\")",                     "description": "tool versions YAML", "topic": null } ],
      "when": null,
      "script_summary": "Align reads against reference, emit PAF or BAM.",
      "publish_dir": null }
  ],
  "subworkflows": [
    { "name": "FASTQ_TRIM_FASTP_FASTQC",
      "path": "subworkflows/nf-core/fastq_trim_fastp_fastqc/main.nf",
      "kind": "pipeline",
      "calls": ["FASTP", "FASTQC_RAW", "FASTQC_TRIM"],
      "inputs": [], "outputs": [] },
    { "name": "PIPELINE_INITIALISATION",
      "path": "subworkflows/local/utils_nfcore_<name>_pipeline/main.nf",
      "kind": "utility",                       // composes free functions, no process invocations
      "calls": [],
      "inputs": [], "outputs": [
        { "name": "samplesheet", "shape": "tuple(meta, path)", "description": "validated --input", "topic": null }
      ] }
  ],
  "workflow": {
    "name": "RNASEQ",
    "channels": [
      { "name": "ch_samplesheet",
        "source": "Channel.fromList(samplesheetToList(params.input, '...'))",
        "shape": "tuple(meta, [path,path])",
        "construct": "samplesheetToList",
        "from_param": "input",
        "required_runtime": false }
    ],
    "edges": [
      { "from": "ch_samplesheet", "to": "FASTP", "via": [] },
      { "from": "FASTP.out.reads", "to": "STAR_ALIGN",
        "via": ["map", "join"] }
    ],
    "conditionals": [
      { "guard": "params.skip_alignment", "branch": "alternate",
        "affects": ["STAR_ALIGN"] }
    ]
  },
  "test_fixtures": {
    "profile": "test",
    "inputs":  [ /* TestDataRef-shaped */ ],
    "outputs": [ /* ExpectedOutputRef-shaped */ ]
  },
  "nf_tests": [
    { "name": "-profile test_dfast",
      "path": "tests/dfast.nf.test",
      "profiles": ["test_dfast"],
      "params_overrides": { "outdir": "$outputDir" },
      "assert_workflow_success": true,
      "snapshot": {
        "captures":     ["succeeded_task_count", "versions_yml", "stable_names", "stable_paths"],
        "helpers":      ["getAllFilesFromDir", "removeNextflowVersion"],
        "ignore_files": ["tests/.nftignore", "tests/.nftignore_files_entirely"],
        "ignore_globs": [],
        "snap_path":    "tests/dfast.nf.test.snap"
      },
      "prose_assertions": [] }
  ]
}
```

Field-name parity with gxy-sketches (`SketchSource`, `ToolSpec`, `TestDataRef`, `ExpectedOutputRef`) is intentional and load-bearing — see [[gxy-sketches-alignment]] §1-3.

## Procedure

The cast skill is **not a single LLM prompt** over the source tree. It is a small program with one or two embedded LLM calls. The split is:

- **Deterministic:** locate files, parse `nextflow.config` and `nextflow_schema.json`, regex-tokenize `process` blocks for typed fields (name, container, conda, declared IO channel names, `when:` guards, `publishDir`), read nf-core module `meta.yml` verbatim, enumerate `include { X } from '...'` for the call graph, resolve biocontainer image strings.
- **LLM-driven:** one-line summary of each process `script:` body, reconciliation of operator-chained channel paths (`A | map | join(B) | groupTuple`) into the workflow `edges[]`, free-text `description` / `notes` fields, IO inference when `meta.yml` is absent and the script is the only signal.

Everything the schema demands as a typed enum or path is deterministic. Free-text fields are LLM. The schema enforces that boundary by typing.

### 1. Detect pipeline shape

Branch shallow on layout:
- nf-core: `nextflow.config` declares `manifest.name = 'nf-core/...'`; `modules/nf-core/`, `subworkflows/nf-core/`, and `nextflow_schema.json` are present. Prefer `meta.yml` as IO ground truth.
- ad-hoc DSL2: no `nextflow_schema.json`, no module `meta.yml`. Falls back to `script:`-block IO inference. Consult [[component-nextflow-pipeline-anatomy]] when layout differs from nf-core conventions in ways these rules do not cover.
- DSL1: rare; emit the `source` block and exit early with a `warnings[]` entry. Out of scope for v1.

Real pipelines have **multiple named workflow blocks** — typically an anonymous `workflow {}` entrypoint in `main.nf` that wires `PIPELINE_INITIALISATION → NFCORE_<NAME> → PIPELINE_COMPLETION`, plus a substantive named workflow under `workflows/<name>.nf`. Selection rule for the primary `workflow`: pick the named workflow that invokes the most pipeline processes. The anonymous `workflow {}` glue and the `NFCORE_<NAME>` wrapper land in `subworkflows[]`, marked `kind: utility` and `kind: pipeline` respectively.

### 2. Capture provenance

Populate `source` from `git remote get-url`, `git rev-parse HEAD` (or the user-supplied pin), `manifest.name` / `manifest.homePage` / `manifest.version` in `nextflow.config`, and `LICENSE` filename detection. `slug` is kebab of `<owner>-<repo>` for nf-core, kebab of repo basename otherwise.

### 3. Parse parameters and profiles

Read `nextflow.config` `params { ... }` block for defaults. When `nextflow_schema.json` exists (nf-core), prefer it as the source of truth for `type`, `description`, and `required` — it is real JSON Schema, copy verbatim. Some params are computed at config-load time (for example `params.fasta = getGenomeAttribute('fasta')` in `main.nf`) and will not appear in `nextflow_schema.json`; include them with a description noting the dynamic source. Enumerate `profiles { ... }` keys.

### 3.5. Resolve sample-sheet schemas

Sample-sheet inputs are the dominant structured-input idiom in modern nf-core pipelines and the most lossy thing to leave as prose inside `params[].description`. For each candidate sample-sheet parameter, populate one `sample_sheets[]` entry capturing the row schema deterministically. Discovery has three branches, recorded in `discovered_via`:

- `nf-schema`: the param's `nextflow_schema.json` entry has a `schema:` keyword pointing at a sibling JSON Schema file (`assets/schema_*.json`). Read that file. Each property in the row schema maps to one `SampleSheetColumn`. Preserve **property order**, not source-column order — `samplesheetToList()` emits columns in property order, and downstream channel item layout depends on it.
- `samplesheetToList`: the workflow imports `samplesheetToList` from nf-schema and calls it on the param. When the call cites a schema path, follow it. Without a schema path, emit the entry with `schema_path: null` and infer columns from `splitCsv`-shaped fallback if any; otherwise emit `columns: []` and a `warnings[]` note.
- `splitCsv`: a `Channel.fromPath(params.X).splitCsv(header: true)` materialization. Header inference only — emit columns by name, leave `type: string`, `kind` inferred from downstream `path()` consumption when traceable, else `meta`. Mark `discovered_via: splitCsv`.
- `ad-hoc`: pipeline-specific CSV/TSV parsing detected from script bodies (e.g. row-zero/row-one indexing). Emit a minimal entry with `columns: []` plus a `warnings[]` advisory; downstream Molds will need to handle these by hand.

Column field rules:

- `kind`: `data` when nf-schema `format` is `file-path`/`directory-path`/`path` or when the column is annotated `meta:` is **absent** and the value is consumed as a `path()` downstream. `meta` otherwise (including all `meta: true` annotations and all non-path scalars). Nest the nf-schema `meta:` annotation here even when implicit — translation Molds key on it to decide which columns become Galaxy `column_definitions[]` versus element/inner-collection slots.
- `type`: copy verbatim from the row schema (`string`/`integer`/`number`/`boolean`). Path columns are `string` with a `format` qualifier; do not collapse `path` into a synthetic type.
- `required`, `default`, `enum`, `pattern`, `exists`, `mimetype`, `description`: copy verbatim when present, leaving null/empty defaults otherwise.

This step does not reshape onto any target idiom (Galaxy `sample_sheet:paired` vs `list:paired` is not decided here). It records what the source pipeline declares; the variant choice belongs to [[nextflow-summary-to-galaxy-interface]] and [[nextflow-summary-to-cwl-interface]].

### 4. Enumerate processes

For each `process <NAME> { ... }` in `main.nf`, `workflows/`, `modules/**`, `subworkflows/**`:
- Pull `container`, `conda`, `publishDir`, `when:` directives **verbatim** into `processes[].container` / `processes[].conda`. Modern nf-core directives are ternary expressions (`workflow.containerEngine == 'singularity' ? <sing-uri> : <docker-uri>`) and file references (`${moduleDir}/environment.yml`); keep the directive text intact and resolve into `tools[]` separately (§5).
- Tokenize the `input:` and `output:` blocks for declared channel names and shapes — typed channels (`tuple val(meta), path(reads)`) become shape strings (`"tuple(meta, [path])"`); arity is preserved as a string, not structured.
- Sweep `include { ... }` statements across the pipeline (`main.nf`, `workflows/`, `subworkflows/**`) to populate `processes[].aliases`. `include { MINIMAP2_ALIGN as MINIMAP2_CONSENSUS }` adds `MINIMAP2_CONSENSUS` to the `MINIMAP2_ALIGN` process's `aliases[]`. The same module can be re-imported under multiple aliases (bacass aliases `MINIMAP2_ALIGN` three times). Edges reference the alias name; the canonical `name` is the FK target.
- Detect `topic: <name>` annotations on outputs (Nextflow 24+ channel topics — nf-core templates emit `tuple(val("${task.process}"), val('toolname'), eval(...)) topic: versions` for version aggregation). Record the topic name in `ChannelIO.topic`.
- Where `meta.yml` exists, **use it** for `description` and IO documentation rather than parsing the `script:` block.
- LLM call (one per process, batchable): summarize the `script:` body in one line. Pass the script verbatim plus the declared IO; ask only for what the tool *does*.

### 5. Build the tool registry

Walk per-process `container` and `conda` directives. **Container directives are usually ternary** — extract both branches:

- The `singularity ?` branch typically yields an `https://depot.galaxyproject.org/singularity/<name>:<version>--<build>` URL → `tools[].singularity`.
- The fallthrough branch typically yields one of:
  - `quay.io/biocontainers/<name>:<version>--<build>` → `tools[].biocontainer`.
  - `biocontainers/<name>:<version>--<build>` (docker.io alias for the same biocontainer image) → `tools[].biocontainer` (same field; both forms are biocontainer images).
  - `community.wave.seqera.io/library/<name>:<version>--<digest>` or `https://community-cr-prod.seqera.io/.../sha256/<digest>/data` → `tools[].wave`.
  - Anything else → `tools[].docker`.

**Conda directives are usually file references** to `${moduleDir}/environment.yml`; read the file and extract its `dependencies:` list. Each `bioconda::<name>=<version>` entry becomes a `tools[]` entry with `tools[].bioconda` set to the original dependency string. Multi-tool environments are common (`minimap2` + `samtools` + `htslib`, `racon` + `multiqc`); keep every Bioconda dependency rather than selecting the first. Legacy literal-string directives (`conda "bioconda::<name>=<version>"`) feed the same field, as does the pre-`environment.yml` ternary form `conda (params.enable_conda ? "<spec>" : null)`.

Read the version off each spec rather than assuming one shape: `name=1.0` and `name==1.0` both pin exactly, a trailing `=<build>` is a conda build string and not part of the version, and an inexact constraint (`name>=1.17`) goes to `tools[].version_constraint` verbatim with `version` left `unknown`. A spec naming no version is legitimately unpinned — `unknown` with no constraint. Never let `unknown` into `tools[].versions[]`; it is the absence of a version, not a version. **A spec you cannot read must land in `warnings[]`** — the eval property is that every directive resolves *or* is flagged, and a directive that resolves in part satisfies neither unless the unread spec is named.

Tool name and version are typically derivable from any of the resolved fields. Deduplicate by `(name, version)` across processes; one entry per tool. `processes[].tool` is a foreign key into `tools[].name`; leave it null when a process declares several packages and none is "the" tool (`bioconda::xopen=1.1.0 bioconda::pysam=0.16.0`) rather than picking one arbitrarily. This block is the bridge to [[author-galaxy-tool-wrapper]] — it consumes container/conda info to choose or justify the UDT container.

### 6. Reconcile the workflow DAG

Enumerate the top-level workflow's `include` statements and channel construction (`Channel.fromPath`, `Channel.fromFilePairs`, `Channel.fromList(samplesheetToList(...))`, `splitCsv`, `file()`/`files()`, `params.*`, `channel.empty()`, `channel.topic('<name>')`). For operator chains, the deterministic parser records the *literal* chain (`["map", "join", "groupTuple"]` in `via`). Reconciling chained operators into a coherent `from → to` edge is the second LLM call: given the literal chain, the source channel shape, and the downstream process's declared input shape, emit the resolved edge.

For each emitted `workflow.channels[]` entry, populate three classified fields alongside the verbatim `source`:

- **`construct`** — typed enum reflecting the channel's primary materialization factory or shape-determining operator. Selection precedence: (1) `samplesheetToList` when the chain contains `samplesheetToList(...)`; (2) `splitCsv` when the chain ends in `.splitCsv(header: true)` over a path; (3) otherwise the outermost factory (`Channel.fromPath` → `fromPath`, `Channel.fromFilePairs` → `fromFilePairs`, `Channel.fromList` → `fromList`, `file(...)` → `file`, `files(...)` → `files`, `Channel.of` → `of`, `Channel.value` → `value`, `Channel.empty` → `empty`, `Channel.topic` → `topic`); (4) `other` for derived/operator-only constructions.
- **`from_param`** — FK into `params[].name` when the construction expression directly references `params.X` (e.g. `Channel.fromPath(params.reads)`, `samplesheetToList(params.input, ...)`, `file(params.fasta)`). v1 is direct-only — one-hop Groovy bindings (`def reads = params.reads; Channel.fromPath(reads)`) are deferred to galaxyproject/foundry#211. Null when no direct reference, or when `construct` is not data-bearing (`empty`, `of`, `value`, `topic`, `other`).
- **`required_runtime`** — true when the construction chain ends in `.ifEmpty { error ... }` (or an equivalent imperative emptiness-throw guard). Captures runtime requiredness even when the param's nf-schema entry does not mark it required. False otherwise.

All three fields are syntactic: regex-level extraction over the construction expression, no LLM call.

Workflow-level conditionals (`if (params.skip_alignment) { ... }`) emit `conditionals[]` entries with the guard, the branch (`alternate` vs `default`), and the set of processes affected.

Subworkflows split into two kinds:
- `kind: pipeline` — invokes pipeline processes (data-flow contributor). The `NFCORE_<NAME>` wrapper and any nested `subworkflows/local/` that calls processes.
- `kind: utility` — composes free-function calls only (`paramsHelp`, `samplesheetToList`, `completionEmail`, `imNotification`). nf-core template subworkflows like `PIPELINE_INITIALISATION` and `PIPELINE_COMPLETION`. `Subworkflow.calls` is empty for utilities; their job is to produce channels (e.g. the validated samplesheet) the primary workflow consumes.

Free-function calls in the workflow body itself (`paramsSummaryMap`, `softwareVersionsToYAML`, `methodsDescriptionText`) are not modeled as processes or subworkflows. Their channel outputs flow into the primary workflow's `channels[]`; the function names are nf-core template idiom, not pipeline-specific signal. Operator chains with deeply nested closures may produce edges flagged with low confidence in `notes`.

### 7. Surface test fixtures and nf-tests

**Two artifacts come out of this step:** `test_fixtures` (data shape of the selected profile's input) and `nf_tests[]` (every `tests/*.nf.test` file).

**`test_fixtures`** — read `conf/<profile>.config` (default `conf/test.config`) for `params.input` (samplesheet URL) and any other URL-shaped params. For nf-core pipelines, follow the samplesheet URL into the `nf-core/test-datasets` repo if a single fetch is enough to enumerate the file paths it references; otherwise emit the samplesheet URL alone as the input. The samplesheet URL may be a runtime concatenation (`params.pipelines_testdata_base_path + 'foo.csv'`); resolve at config-load semantics and record the resolved URL.

When fixture fetching is enabled, hash each fetched remote file with SHA-1. When a test-data directory is provided, write the samplesheet and every referenced remote file under that directory using a deterministic URL-derived path and record that local filesystem path in `path` while preserving the original `url`.

Each entry follows `TestDataRef` (inputs) / `ExpectedOutputRef` (outputs) field names verbatim. The `path` vs `url` rules from gxy-sketches' `TestDataRef` carry over, with one extension: `path` may be the local fetched path for a remote URL. The "must be under `test_data/`" constraint does **not** — see [[gxy-sketches-alignment]] §1.

**`nf_tests[]`** — enumerate every `tests/*.nf.test` file. Real pipelines have one .nf.test per test profile (bacass has 9). For each:

- `name` = the description string passed to `test("...")`.
- `path` = repo-relative file path.
- `profiles[]` = file-level `profile "<name>"` declaration plus any per-test config overrides.
- `params_overrides` = the `when { params { ... } }` block as a key→value map.
- `assert_workflow_success` = `true` when an `assert workflow.success` (or equivalent) clause is present.
- `snapshot` = structured `SnapshotFixture` when an `assert snapshot(...).match()` clause is present, else `null`. nf-core templates use a near-uniform snapshot pattern; extract:
  - `captures[]` = logical names of values passed into `snapshot(...)` (typical set: `succeeded_task_count`, `versions_yml`, `stable_names`, `stable_paths`).
  - `helpers[]` = nf-test helper functions invoked (`getAllFilesFromDir`, `removeNextflowVersion`, ...).
  - `ignore_files[]` = repo-relative paths passed as `ignoreFile:` to helpers (e.g. `tests/.nftignore`).
  - `ignore_globs[]` = inline `ignore: [...]` glob list from helpers.
  - `snap_path` = repo-relative path of the corresponding `.nf.test.snap` file.
- `prose_assertions[]` = any other complex/non-snapshot assertions, summarized to prose strings. Empty for snapshot-only tests (the common nf-core case).

Consult [[component-nextflow-testing]] when fixtures use a layout outside `conf/test.config` + nf-test (e.g. legacy `test/` scripts, external test harnesses) or when assertions are non-snapshot equality / regex / `containsString` checks.

### 8. Validate and emit

Validate the assembled object before emitting: run `foundry validate-summary-nextflow summary-nextflow.json`. The subcommand is shipped by `@galaxy-foundry/foundry` and can be invoked from npm with `npx --package @galaxy-foundry/foundry foundry validate-summary-nextflow summary-nextflow.json`. The standalone `summarize-nextflow` bin (from `@galaxy-foundry/summarize-nextflow`) self-validates by default and is the better gate when the skill is also producing the summary. On schema failure, the cast skill should fail loud — the downstream Molds bind to the schema and will produce worse errors later. `additionalProperties: false` at every level catches drift early; do not add extra fields to work around a mismatch.

## Caveats baked into the procedure

The procedure assumes — and the cast skill must surface in `warnings[]` when relevant — the following NF realities:

- **DSL1 pipelines are out of scope.** Detected via the absence of DSL2 syntax (`workflow { ... }` block); emit a single warning and exit with the provenance block only.
- **`meta.yml` may lie.** nf-core module `meta.yml` is hand-authored and can drift from the actual `script:` IO. When the LLM-inferred IO disagrees with `meta.yml`, prefer `meta.yml` and surface the disagreement as a warning rather than overriding it.
- **Channel shapes are strings, not structured types.** `"tuple(meta, [path,path])"` is enough for downstream Molds to reason about; structured channel typing is a research project. Downstream Molds that need structure must parse the string.
- **Operator chains are summarized, not executed.** The LLM reconciliation pass is best-effort. Workflows with deeply nested closures (`map { ... }` with substantial Groovy logic) may produce edges flagged with low confidence in `notes`.
- **`include` aliasing is followed one level.** `include { FASTP as TRIM_PROC } from '...'` resolves to `FASTP` in `processes[].name` and the alias is recorded in the call graph. Multi-level aliasing chains are not chased.
- **Test-fixture fetching is bounded.** Without explicit fixture fetching, record URL, role, filetype, and expected SHA-1 if present; do not download content for validation. When fixture fetching is requested, fetch only selected-profile URL params and direct remote URLs discovered in fetched samplesheets. Do not recursively crawl archives or arbitrary generated paths.

## Reference dispatch

- [[summary-nextflow]] — always validate output against this schema before emitting.
- [[component-nextflow-pipeline-anatomy]] — consult on ad-hoc DSL2 layouts that do not match nf-core conventions, or on workflow-block patterns the multi-workflow selection rule does not resolve.
- [[component-nextflow-containers-and-envs]] — consult on container/conda directives outside the resolver patterns above, including mulled-v2, custom registries, env modules, Wave, and multi-dependency `environment.yml` files.
- [[component-nextflow-testing]] — consult on test fixture layouts outside `conf/test.config` + nf-test, or on snapshot/assertion patterns the structured fallback does not capture well.

## Non-goals

- **Subset summarization.** Whole-pipeline only. A single-subworkflow summarizer might land later, but the schema and downstream Molds assume the whole-pipeline shape today.
- **Translation to a target idiom.** This Mold does not produce Galaxy collections, CWL scatter, or any target-shaped data flow. Those live in [[nextflow-summary-to-galaxy-interface]], [[nextflow-summary-to-galaxy-data-flow]], [[nextflow-summary-to-cwl-interface]], and [[nextflow-summary-to-cwl-data-flow]].
- **Tool wrapping.** Container/conda info is captured for [[author-galaxy-tool-wrapper]] to consume; this Mold never authors a wrapper.
- **Test execution.** Fixtures are described, not run. [[run-workflow-test]] owns execution.
- **Schema evolution.** The schema at [[summary-nextflow]] is v1, draft. Adding fields requires evaluating against the canonical exemplars (rnaseq, sarek, one ad-hoc DSL2 pipeline) before merging.
