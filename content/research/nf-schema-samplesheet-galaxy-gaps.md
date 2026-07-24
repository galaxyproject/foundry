---
type: research
title: "nf-schema sample sheet validation gaps in Galaxy"
tags:
  - source/nextflow
  - target/galaxy
status: draft
created: 2026-05-06
revised: 2026-05-06
revision: 1
ai_generated: true
related_notes:
  - "[[galaxy-sample-sheet-collections]]"
  - "[[nextflow-params-to-galaxy-inputs]]"
  - "[[nextflow-workflow-io-semantics]]"
  - "[[gxformat2-workflow-inputs]]"
  - "[[nextflow-path-glob-to-galaxy-datatype]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
related_molds:
  - "[[nextflow-summary-to-galaxy-interface]]"
  - "[[nextflow-summary-to-galaxy-data-flow]]"
sources:
  - "https://nextflow-io.github.io/nf-schema/latest/nextflow_schema/nextflow_schema_specification/"
  - "https://github.com/nextflow-io/nf-schema/blob/master/docs/nextflow_schema/sample_sheet_schema_specification.md"
  - "https://github.com/nextflow-io/nf-schema/blob/master/docs/samplesheets/samplesheetToList.md"
  - "https://github.com/galaxyproject/galaxy/blob/dev/lib/galaxy/tool_util_models/sample_sheet.py"
  - "https://github.com/galaxyproject/galaxy/blob/dev/lib/galaxy/model/dataset_collections/types/sample_sheet_util.py"
  - "https://github.com/galaxyproject/galaxy/blob/dev/lib/galaxy/tool_util_models/parameter_validators.py"
  - "https://github.com/galaxyproject/galaxy/blob/dev/lib/galaxy/workflow/modules.py"
  - "https://github.com/galaxyproject/galaxy/blob/dev/lib/galaxy/tools/parameters/basic.py"
  - "https://github.com/galaxyproject/gxformat2/blob/main/gxformat2/normalized/_conversion.py"
  - "https://github.com/galaxyproject/galaxy/issues/20831"
  - "https://github.com/galaxyproject/galaxy/issues/20541"
summary: "nf-schema validation mapped to Galaxy column_definitions: what survives, degrades, or is lost; Galaxy work items + cast loss-recording vocabulary."
---

# nf-schema sample sheet validation gaps in Galaxy

Use this note when [[nextflow-summary-to-galaxy-interface]] casts a Nextflow sample-sheet input to a Galaxy `sample_sheet*` collection input. It enumerates which nf-schema validation features survive, which degrade, and which are wholly lost; flags concrete Galaxy code paths to extend; and gives the cast Mold a vocabulary for recording validation losses.

Evidence quality:

- **Corpus-observed (CO)** — pinned fixtures under `workflow-fixtures/pipelines/`.
- **Galaxy source (GS)** — file paths in `lib/galaxy/...` from the dev branch.
- **gxformat2 source (FS)** — `gxformat2/...`.
- **External-doc (ED)** — nf-schema spec + nf-core component docs.
- **Design inference (DI)** — clearly marked.

## TL;DR

- nf-schema sample sheets carry four classes of constraint: per-cell type/pattern, per-cell path semantics (`format`, `exists`, `mimetype`), per-row dependent-requiredness (`dependentRequired`, `anyOf`), and cross-row uniqueness (`uniqueEntries`). Galaxy `column_definitions` natively covers only the first class, partially covers `pattern`/`enum`, and has zero expression for the per-row and cross-row classes.
- Galaxy's safe-validator allowlist is exactly three: `regex`, `in_range`, `length` (GS `lib/galaxy/tool_util_models/parameter_validators.py:469-476`). Anything richer (file existence, mimetype, conditional required, uniqueness) cannot be encoded — must downgrade to prose, drop, or promote out of the sample sheet.
- The `[\w\-_ ?]*` charset gate (GS `lib/galaxy/model/dataset_collections/types/sample_sheet_util.py:117`) silently rejects column *values* containing `;`, `.`, `:`, `,`, `/`, etc. Concrete blocker found in corpus: nf-core/taxprofiler `db_type` default `"short;long"` cannot be stored.
- Dataset-typed columns are validated only for presence and element-identifier shape — Galaxy does not sniff the dataset against a `format`, does not check `exists`, does not enforce a path regex against the dataset's filename. Datatype filtering happens at upload, not at sample-sheet construction.
- gxformat2 has no formal `column_definitions` declaration in `schema/v19_09/workflow.yml`. Column metadata round-trips as additional state via FS `gxformat2/normalized/_conversion.py:524-540`. Adding strong validator support will likely require a gxformat2 schema rev *and* a Galaxy state-persistence rev.

## nf-schema validation feature inventory

### Per-cell (column-property) features

| Feature | What it enforces | Class | Evidence |
|---|---|---|---|
| `type: string\|integer\|number\|boolean` | scalar coercion | per-cell | CO `nf-core__rnaseq/assets/schema_input.json:11` |
| `type: ["string","integer"]` (union) | accept either | per-cell | CO `nf-core__taxprofiler/assets/schema_input.json:11` |
| `type: array` / `type: object` (nested) | nested structure within a cell | per-cell | ED nf-schema spec; rare in nf-core sample sheets |
| `pattern` (regex) | string regex | per-cell | CO `nf-core__rnaseq/...:12` (`^\S+$`), `:20` (path-pattern fastq) |
| `enum` | closed value set | per-cell | CO `nf-core__rnaseq/...:33` (`forward/reverse/...`), `nf-core__sarek/...:25` (`XX/XY/NA`), `nf-core__taxprofiler/schema_database.json:12-27` (15 tools) |
| `format: file-path` | string is path-to-file | per-cell, nf-schema custom | CO `nf-core__rnaseq/...:18`; ED |
| `format: directory-path` | path-to-directory | per-cell, nf-schema custom | ED |
| `format: path` | file or directory | per-cell, nf-schema custom | CO `nf-core__taxprofiler/schema_database.json:52` (`db_path`) |
| `format: file-path-pattern` | glob | per-cell, nf-schema custom | ED |
| `format: email` / `uri` / `date` etc. | standard JSON Schema formats | per-cell | ED |
| `exists: true` | path resolves on disk | per-cell, nf-schema custom | CO `nf-core__rnaseq/...:19`; CO `nf-core__sarek/...:46-110` |
| `mimetype` | MIME for file at path | per-cell, nf-schema custom | ED |
| `minimum`/`maximum` | numeric bounds | per-cell | CO `nf-core__rnaseq/...:64-65` (`percent_mapped` 0..100) |
| `exclusiveMinimum`/`exclusiveMaximum` | strict numeric bounds | per-cell | ED |
| `multipleOf` | divisibility | per-cell | ED, rare in samplesheets |
| `minLength`/`maxLength` | string length | per-cell | ED |
| `default` | default if cell omitted | per-cell | CO `nf-core__sarek/...:27` (`sex` default `NA`), `:33` (`status` default `0`), `nf-core__taxprofiler/schema_database.json:46` (`db_type` default `short;long`) |
| `description` / `help_text` | UI prose | identifier | universal |
| `errorMessage` | message override on failure | per-cell binding | CO `nf-core__rnaseq/...:13,21,28...` (every column) |
| `deprecated: true` | warn/error on use | per-cell | ED |
| `hidden: true` | UI hint | per-cell | ED |
| `fa_icon` | UI icon | identifier | ED |
| `meta: ["id"]` or `"id"` | column is a Nextflow meta-map field | identifier (channel-shaping) | CO `nf-core__rnaseq/...:14`, `nf-core__sarek/...:15-34` |

### Per-row features

| Feature | What it enforces | Evidence |
|---|---|---|
| `required: ["sample","fastq_1","strandedness"]` | listed columns must be non-null | CO `nf-core__rnaseq/...:70`, `nf-core__sarek/...:137`, `nf-core__taxprofiler/...:60` |
| `dependentRequired: {"fastq_2": ["fastq_1"]}` | column A present → column B required | CO `nf-core__sarek/...:133-136` (R2 implies R1; spring_2 implies spring_1) |
| `anyOf: [{dependentRequired: {...}}, ...]` | at least one dependentRequired branch must hold (e.g. `lane` requires *one of* `fastq_1`/`spring_1`/`bam`) | CO `nf-core__sarek/...:122-132` |
| `oneOf` / `allOf` of object schemas | exactly-one / all branches | CO `nf-core__taxprofiler/schema_input.json:62-67` uses `allOf` for cross-row uniqueness |
| `if/then/else` (JSON Schema 2019-09+) | conditional required by branch | ED |
| Object-level `pattern` / property-name patterns | rare | ED |

### Cross-row features

| Feature | What it enforces | Evidence |
|---|---|---|
| `uniqueEntries: ["lane","patient","sample"]` | tuple unique across rows | CO `nf-core__sarek/...:138` |
| `uniqueEntries: ["fastq_1"]` | column unique across rows | CO `nf-core__taxprofiler/schema_input.json:63-65` |
| `uniqueEntries: ["tool","db_name"]` | composite key unique | CO `nf-core__taxprofiler/schema_database.json:58` |
| `uniqueItems: true` (array level) | full-row uniqueness | ED |

### Identifier / non-validation keywords

| Feature | Effect | Notes |
|---|---|---|
| `meta: ["sample"]` / `meta: "id"` | column joins channel meta-map, not the data tuple | shapes `samplesheetToList` output (ED); orthogonal to validation |
| `schema: assets/schema_input.json` (on a param) | declares the file is itself a sample sheet to validate | CO `nf-core__rnaseq/nextflow_schema.json` (`input` param) |
| `errorMessage` | UX-only, not a validation primitive | universal in nf-core |
| `description`, `help_text`, `fa_icon`, `hidden`, `deprecated` | UI/help; preserve as `description` only | — |

### Params vs samplesheet vocabulary

ED `docs/nextflow_schema/sample_sheet_schema_specification.md`: most keys are shared. Divergences:

- `meta` is samplesheet-only.
- `uniqueEntries` is samplesheet-only.
- `hidden`, `fa_icon`, `help_text` are mostly params-only.

`samplesheetToList(file, schema)` materializes the sheet as a list of `[meta_map, data_field_1, ...]` tuples (ED). **Schema property order, not CSV column order, is the source of truth for tuple order.** Meta-annotated columns collapse into the leading map.

## Galaxy `column_definitions` capability inventory

### Column definition vocabulary

`SampleSheetColumnDefinition` (GS `lib/galaxy/tool_util_models/sample_sheet.py:39-47`):

| Field | Type | Notes |
|---|---|---|
| `name` | str | gated by `[\w\-_ ?]*` (GS `sample_sheet_util.py:117`) — no `.`, `/`, `:`, `,`, quotes |
| `description` | str? | free text |
| `type` | `"string"\|"int"\|"float"\|"boolean"\|"element_identifier"` | closed; no `data`, `path`, `email`, array/object, no `int|string` union |
| `optional` | bool | required by schema |
| `default_value` | scalar? | type-checked against `type` (GS `sample_sheet_util.py:42-56`) |
| `validators` | `AnySafeValidatorModel[]?` | allowlist of three (see below) |
| `restrictions` | scalar[]? | maps to nf-schema `enum` |
| `suggestions` | scalar[]? | UI dropdown hint, non-binding |

### Allowed validators

GS `lib/galaxy/tool_util_models/parameter_validators.py:469-476` — three discriminated subclasses tagged `_safe = True`:

| Validator | Fields | nf-schema analogue |
|---|---|---|
| `regex` | `expression`, `negate` | `pattern` (caveat: `regex.match` not `fullmatch` — GS `parameter_validators.py:182-187`) |
| `in_range` | `min`, `max`, `exclude_min`, `exclude_max`, `negate` | `minimum`/`maximum`/`exclusiveMinimum`/`exclusiveMaximum` |
| `length` | `min`, `max`, `negate` | `minLength`/`maxLength` |

`expression` (Python eval) and all dataset-aware validators (`metadata`, `dataset_metadata_in_data_table`, `dataset_ok`, `empty_dataset`, …) are excluded (`_safe: False` or absent).

### What is enforced and where

| Stage | Mechanism | What it checks | Source |
|---|---|---|---|
| Workflow save | `InputCollectionModule.save_to_step` → `validate_column_definitions` | column-def schema well-formed; default-value type matches `type`; validators conform to safe allowlist | GS `lib/galaxy/workflow/modules.py:1198-1199`, `tool_util_models/sample_sheet.py:42-56` |
| Collection construction (`POST /api/dataset_collections`, fetch, sample_sheet_workbook parse) | `validate_row` → `validate_column_value` per cell | row arity; cell type-coerces; `restrictions` membership; safe validators run statically | GS `sample_sheet_util.py:97-174` |
| Element-identifier columns | `validate_column_value` checks value ∈ `element_identifiers` of same collection | within-collection cross-reference | GS `sample_sheet_util.py:155-162` |
| Workflow form / runtime | `DataCollectionToolParameter` filters by `column_definitions_compatible` | structural compatibility (name + type + arity, in order) — no validator/restrictions check | GS `tools/parameters/basic.py:2585-2588`, `sample_sheet_util.py:177-212` |
| Dataset column | none beyond presence / element_identifier shape | no datatype sniff vs a `format`, no path-exists, no mimetype, no per-row dataset validation | DI |
| Cross-row | none | no uniqueness, no aggregate constraint | DI — search "unique" in `sample_sheet_util.py` returns zero matches |
| Conditional/dependent required | none | optional/required is per-column only | DI |
| Row-level error escalation | `RequestParameterInvalidException` → API 400 | first-failure short-circuit, not aggregated | GS `sample_sheet_util.py:104-112` |

### Variant-specific differences

Per [[galaxy-sample-sheet-collections]], all four variants (`sample_sheet`, `sample_sheet:paired`, `sample_sheet:paired_or_unpaired`, `sample_sheet:record`) share `column_definitions` semantics. Variant axis controls element shape, not column validation. Practical consequence: a paired-end nf-core sheet with one R1 path and an optional R2 path becomes `sample_sheet:paired` or `sample_sheet:paired_or_unpaired` — the path columns *vanish from* `column_definitions` because they become the dataset payload, leaving only metadata columns.

### Round-trip through gxformat2

- gxformat2 → Galaxy: import accepts `column_definitions` on `data_collection` inputs as additional state. gxformat2 v19_09 (FS `schema/v19_09/workflow.yml`) has no `column_definitions` field declaration. Field passes through FS `gxformat2/normalized/_conversion.py:524-540`.
- Galaxy → gxformat2 export: same code path round-trips it. No silent drop observed for the in-allowlist subset.
- DI: because gxformat2 has no schema-level declaration, additions like new validator types could in principle round-trip without a schema rev, but tooling that strict-validates against the SALAD schema (gxwf, IDE) will not understand them.
- Existing example: `gxformat2/examples/format2/synthetic-sample-sheet-input.gxwf.yml` — only uses `restrictions`, `name`, `default_value`, `optional`.

## Gap matrix

Support: **N**=Native, **P**=Partial, **L**=Lossy, **A**=Absent. Loss observable: cast / import / invocation / runtime. Foundry recommendation: **preserve / record / promote / drop / refuse**.

| nf-schema feature | Galaxy support | Loss observable | Foundry recommendation |
|---|---|---|---|
| `type: string` | N | — | preserve |
| `type: integer` | N (`int`) | — | preserve |
| `type: number` | N (`float`) | — | preserve |
| `type: boolean` | N | — | preserve |
| `type: ["string","integer"]` union | A | cast | promote to `string`; record `loss_class: type_union_collapsed` |
| `type: array` / `object` (nested cell) | A | cast | refuse; keep as scalar `string` JSON-encoded with warn |
| `pattern` | P (`regex`) | invocation | preserve via `regex` validator; record anchoring caveat (`match` vs `fullmatch`) |
| `enum` | N (`restrictions`) | — | preserve |
| `format: file-path` | P | runtime | promote: column becomes dataset payload of `sample_sheet*` variant; the path itself disappears from `column_definitions` |
| `format: directory-path` | A | cast | refuse — Galaxy has no directory dataset; record loss |
| `format: path` (file or dir) | P | cast | treat as `file-path`; record `loss_class: directory_path_unsupported` if directory branch reachable |
| `format: file-path-pattern` (glob) | A | cast | refuse — promote to `data_collection` input outside the sample sheet |
| `format: email` / others | A | cast | preserve as `regex` if a regex is supplied; otherwise record loss |
| `exists: true` | A on column; partial via Galaxy runtime for dataset columns | cast / runtime | for non-data columns refuse and promote to `data` input. For data columns record `loss_class: exists_implicit_via_dataset` |
| `mimetype` | A | cast | record loss; recommend Galaxy datatype filter on a separate `data` input |
| `minimum`/`maximum` | N (`in_range`) | — | preserve |
| `exclusiveMinimum`/`exclusiveMaximum` | N (`in_range.exclude_*`) | — | preserve |
| `multipleOf` | A | invocation | drop with `loss_class: numeric_multipleof_dropped` |
| `minLength`/`maxLength` | N (`length`) | — | preserve |
| Per-column `required` | N (`optional: false`) | — | preserve |
| `default` | N (`default_value`) | — | preserve |
| `description` | N | — | preserve |
| `errorMessage` | A as binding; partial via custom messages | cast | preserve text into `description`; do not silently lose it |
| `deprecated` | A | cast | drop column |
| `hidden` | A | cast | drop |
| `fa_icon` | A | cast | drop silently |
| `meta: [...]` | N as identifier | — | use to choose `element_identifier` for sample id; remaining meta columns survive as ordinary `column_definitions` |
| `dependentRequired` | A | cast | record + promote — emit composite scalar mode input when enumerable; otherwise record `loss_class: conditional_required_dropped` |
| `anyOf` of `dependentRequired` (sarek `lane` discriminator) | A | cast | refuse single-sheet mapping; offer split (paired sheet + record sheet) plus mode scalar; record loss |
| `oneOf` / `if/then/else` | A | cast | record loss; require interface decision |
| `uniqueEntries` (single col) | A | cast | record `loss_class: cross_row_unique_dropped`; rely on user discipline |
| `uniqueEntries` (composite key) | A | cast | record loss; consider promoting composite key column to `element_identifier` if it forms a primary key |
| `uniqueItems` (full row) | A | cast | record loss |
| `samplesheetToList` field-order rule | DI: gxformat2 column order is authoritative | — | preserve order — emit `column_definitions` in nf-schema property order, not CSV order |

## Worked examples

### nf-core/rnaseq `assets/schema_input.json`

Variant: `sample_sheet:paired_or_unpaired` (R2 optional, plus optional alt bam columns).

| Source column | nf-schema features | Galaxy decision | Loss class |
|---|---|---|---|
| `sample` | string, `pattern: ^\S+$`, `meta: id`, `errorMessage` | `element_identifier`; `errorMessage` → description | `meta_id_promoted_to_element_identifier` |
| `fastq_1` | string, file-path, exists, fastq path-pattern, `errorMessage` | dataset payload (forward); column drops out of `column_definitions` | `path_pattern_to_dataset_format` |
| `fastq_2` | same, optional | dataset payload (reverse, optional → `paired_or_unpaired`) | same |
| `strandedness` | enum 4-way, `meta: strandedness` | `string` with `restrictions: [forward,reverse,unstranded,auto]`, required | none |
| `seq_platform` | string `^\S+$`, `meta` | `string` with `regex` | none |
| `seq_center` | string `^\S+$`, `meta` | `string` with `regex` | none |
| `genome_bam` | file-path, exists, `\.bam$` | conflict — alternative input branch. Promote out of sample sheet to parallel `data` input or split into `sample_sheet:record`. | `alternative_input_branch` |
| `transcriptome_bam` | same | same | same |
| `percent_mapped` | number 0..100, `meta` | `float` with `in_range(min=0, max=100)` | none |

Items-level constraints: none — no cross-row losses for rnaseq.

### nf-core/sarek `assets/schema_input.json`

Richest case in the corpus.

| Source column | nf-schema features | Galaxy decision | Loss class |
|---|---|---|---|
| `patient` | string `^\S+$`, `meta` | `string` with `regex`, required | none |
| `sample` | string `^\S+$`, `meta` | `element_identifier` | meta promotion |
| `sex` | enum XX/XY/NA, default NA, `meta` | `string` with `restrictions`, `default_value: "NA"` | none |
| `status` | integer enum 0/1, default 0, `meta` | `int` with `restrictions: [0,1]`, `default_value: 0` | none |
| `lane` | `anyOf: [int, string]` union, `^\S+$`, `meta` | `string` (collapse), `regex` | `type_union_collapsed` |
| `fastq_1` / `fastq_2` | path-pattern fastq, exists | dataset payload of `sample_sheet:paired_or_unpaired` | path-format loss |
| `spring_1` / `spring_2` | spring fastq | alternative input — Galaxy has no spring datatype baseline; refuse or split | `alternative_branch_unsupported_format` |
| `table` | recalibration table | alternative branch, `data` input | branch |
| `cram`/`crai`, `bam`/`bai` | preprocessed alternative | split into parallel `sample_sheet:record` or `data` inputs | branch |
| `contamination` | number, `exists: true` (probably schema bug — number with exists) | `float`, drop `exists` | `exists_on_non_string_dropped` |
| `vcf` | path | alternative branch, `data` input | branch |
| `variantcaller` | string | `string` | none |

Items-level (the meat of the gap):

- `dependentRequired: {fastq_2: [fastq_1], spring_2: [spring_1]}` — **A**. `paired_or_unpaired` makes R2-without-R1 unrepresentable; `spring_2`-without-`spring_1` would still be possible if both columns existed. Record `loss_class: dependentRequired_partially_structural`.
- `anyOf: [{dependentRequired: {lane: [fastq_1]}}, {lane: [spring_1]}, {lane: [bam]}]` — **A**. Encodes "lane requires *one of* the data branches." Mitigation: a top-level scalar `data_source: fastq|spring|bam` enum input plus three sample-sheet inputs (gated by docs). Record `loss_class: discriminated_union_required`.
- `required: ["patient","sample"]` — **N**.
- `uniqueEntries: ["lane","patient","sample"]` — **A**. Composite key. Record `loss_class: cross_row_unique_composite`.

### nf-core/taxprofiler `assets/schema_database.json`

Reference/database sheet — typically a separate Galaxy input from the biological samplesheet (see [[nextflow-params-to-galaxy-inputs]] §Reference data).

| Source column | nf-schema features | Galaxy decision | Loss class |
|---|---|---|---|
| `tool` | enum (15 profilers), `meta` | `string` with `restrictions: [bracken, centrifuge, ...]` | none |
| `db_name` | string `^\S+$`, `meta` | `string` with `regex` | none |
| `db_params` | string `^[^"']*$`, `meta` | `string` with `regex` — caveat: column-value `[\w\-_ ?]*` gate (GS `sample_sheet_util.py:117`) is **stricter** than the source regex. CLI flag strings will commonly fail Galaxy's gate (e.g. `--threshold 0.5` has `.`, `0`, ` `). Record `loss_class: galaxy_value_charset_overrestrictive`. | per-cell value-charset |
| `db_type` | enum `short\|long\|short;long`, default `short;long` | `string` `restrictions`, `default_value: "short;long"` — value `short;long` contains `;` which is **rejected** by `[\w\-_ ?]*`. **Galaxy will refuse this value at row submission.** | per-cell value-charset (blocking) |
| `db_path` | string, format=path, exists | dataset payload of `sample_sheet` — but `format: path` means dir-or-file, and Galaxy has no directory dataset; if a tool needs directory, split into `data` input plus document | directory-path-unsupported |

Items-level: `uniqueEntries: ["tool","db_name"]` — **A**. Record loss.

The `db_type` finding is the highest-impact concrete blocker discovered: a literal nf-core enum value cannot be stored in a Galaxy `column_definition` cell. It must be rewritten (`short_long`), promoted to a separate scalar, or the gate loosened (Galaxy work item W1 below).

## Galaxy implementation roadmap

Prioritized by frequency-of-bite across the 8 nf-core fixtures.

### W1. Loosen sample-sheet column-value charset to allow nf-core-canonical values

**Problem.** `has_special_characters` (GS `lib/galaxy/model/dataset_collections/types/sample_sheet_util.py:116-119`) rejects column *values* matching anything outside `[\w\-_ ?]*`. nf-core enums and free-text routinely contain `;`, `.`, `,`, `:`, `/`, `=`, `'`, `"`. Concrete blocker: `db_type: "short;long"` (taxprofiler default).

**Fix shape.** Distinguish three charset gates:

1. column **name** (current strict gate — keep, serializes into TSV header).
2. `element_identifier` value (must serialize cleanly into TSV — keep current gate).
3. arbitrary cell value (relax to "no control characters, no embedded newline/tab; CSV-escapable") — `strip_control_characters` plus a CSV-escapability check, not the current word-boundary regex.

Touch points:

- GS `lib/galaxy/model/dataset_collections/types/sample_sheet_util.py:116-129,155-162` — split `validate_no_special_characters` into `validate_identifier_charset` and `validate_value_charset`; only call the strict one for `element_identifier`.
- GS `lib/galaxy/tools/sample_sheet_to_tabular.xml` — verify TSV escapes `\t`, `\n` correctly (introduce CSV-mode or quote rule).

**Risk.** Medium. Touches collection-build-time validation and downstream TSV writers.

**Size.** S–M. **gxformat2 rev?** No. **Existing PRs.** None found; Galaxy issue #20831 (Sample Sheets follow-up) is the umbrella.

### W2. Add `unique` column-level flag and `unique_entries` items-level flag

**Problem.** Cross-row uniqueness is the second-most-common nf-core constraint. sarek `["lane","patient","sample"]`, taxprofiler-input `["fastq_1"]`/`["fastq_2"]`/`["fasta"]`/`["sample","run_accession"]`, taxprofiler-database `["tool","db_name"]`.

**Fix shape.**

- Single-column unique: extend `SampleSheetColumnDefinition` with `unique: bool = False` (GS `lib/galaxy/tool_util_models/sample_sheet.py`).
- Composite unique: add a top-level `unique_entries: List[List[str]]` to the *collection*'s `column_definitions` envelope (currently flat list — wrap as `{"columns": [...], "unique_entries": [...]}` or attach a sibling JSON column on `dataset_collection`). The wrapper option is more future-proof.
- Validation: in `validate_row` only the current row is visible; cross-row check runs after all rows are collected. Plug into `SampleSheetDatasetCollectionType.generate_elements` (GS `types/sample_sheet.py:18-40`) — accumulate seen tuples, raise on duplicate.
- Workbook parser (GS `types/sample_sheet_workbook.py`) needs the same check at upload.

**Risk.** Medium — schema migration touches `dataset_collection.column_definitions` shape; backwards compat required (accept both list and `{columns, unique_entries}` envelope).

**Size.** M. **gxformat2 rev?** Yes for typed authoring tools.

### W3. Express conditional / dependent required at the column-definitions level

**Problem.** Sarek's `dependentRequired` and `anyOf`-of-`dependentRequired` are routine; without them the cast Mold either over-promotes columns to required (creating impossible workflows) or under-promotes (silent runtime errors).

**Fix shape.** Two options.

- (a) **Rule-based** — add `requires: [column_name]` on a column for `dependentRequired`. Validate in `validate_row`. Covers sarek's R2→R1 and spring2→spring1.
- (b) **Discriminator-based** — add envelope-level `discriminator: {column: "data_source", branches: {fastq: [fastq_1], spring: [spring_1], bam: [bam]}}`. Covers sarek's `anyOf`-of-`dependentRequired`. Closer to JSON-Schema's `oneOf` but constrained to a single discriminator column, which is the only shape nf-core uses.

Touch points:

- GS `lib/galaxy/tool_util_models/sample_sheet.py` — extend model.
- GS `lib/galaxy/model/dataset_collections/types/sample_sheet_util.py:97-113` — extend `validate_row`.
- GS `lib/galaxy/tools/parameters/basic.py:2585-2588` (`column_definitions_compatible`) — decide whether dependent-required participates in compatibility.

**Risk.** Medium-high. Affects compatibility matching, which gates editor-time wiring.

**Size.** M. **gxformat2 rev?** Yes. **Existing PRs.** None found.

### W4. Add a `path` column type with optional datatype enforcement

**Problem.** nf-schema `format: file-path` columns become Galaxy datasets, but the path-pattern regex (`^\S+\.bam$` etc.) is lost.

**Fix shape.**

- (a, smaller) For path-bearing columns, record a `format` (Galaxy datatype) hint on `column_definitions`; have `DataCollectionToolParameter` filter compatible collections by it (GS `tools/parameters/basic.py:2585-2588`). Piggybacks on existing Galaxy datatype machinery.
- (b, larger) Promote nf-schema `pattern` on path columns to a Galaxy datatype lookup at cast time and assert at upload — out of scope for Galaxy; cast Mold concern via [[nextflow-path-glob-to-galaxy-datatype]].

**Risk.** Low for (a). **Size.** S. **gxformat2 rev?** Optional.

### W5. Carry `errorMessage` and `description` end-to-end

**Problem.** nf-core authors write `errorMessage` on every column. Galaxy's only landing slot is `column_definition.description`; safe-allowlist validators don't accept user-supplied messages — `regex`/`in_range`/`length` models have no `message` field (GS `parameter_validators.py:160-245`).

**Fix shape.** Add `message: Optional[str]` to `RegexParameterValidatorModel`, `InRangeParameterValidatorModel`, `LengthParameterValidatorModel`. Plumb through `default_message` override.

**Risk.** Low. **Size.** S. **gxformat2 rev?** No.

### W6. Distinguish "directory" vs "file" path columns

**Problem.** nf-schema `format: directory-path` and `format: path` (file-or-dir). Galaxy has no directory dataset. taxprofiler `db_path` is the routine case.

**Fix shape.** No Galaxy code change recommended now — cast-time refusal and documented loss. Galaxy roadmap item only if directory support arrives via something like CWL Directory inputs.

### W7. Aggregate-row error reporting

**Problem.** `validate_row` short-circuits on first failure (GS `sample_sheet_util.py:104-112`). Users uploading a 200-row sheet get one error at a time. nf-schema reports all errors per row.

**Fix shape.** Collect errors into a list; raise a single `RequestParameterInvalidException` with structured payload (row index → field → message).

**Risk.** Low (backward compatible if message text preserved). **Size.** S.

### Priority summary

| # | Title | Bite frequency | Risk | Size |
|---|---|---|---|---|
| W1 | Loosen value charset | every taxprofiler / db_params-style | Med | S–M |
| W2 | uniqueEntries | sarek + taxprofiler (3 of 8) | Med | M |
| W3 | dependentRequired / discriminator | sarek (highest schema complexity) | Med-High | M |
| W4 | per-column path/format hint | rnaseq / sarek alt-branches | Low | S |
| W5 | errorMessage round-trip | universal | Low | S |
| W7 | aggregate row errors | quality-of-life | Low | S |
| W6 | directory paths | taxprofiler db_path | High | L |

## Cast Mold loss-recording guidance

Cast Mold should write a per-column entry into the interface brief whenever an nf-schema feature is mapped to Galaxy `column_definitions`. Record shape:

```yaml
column_loss_records:
  - source_column: db_type
    nf_schema_features:
      type: string
      enum: ["short", "long", "short;long"]
      default: "short;long"
      meta: ["db_type"]
    galaxy_column_definition:
      name: db_type
      type: string
      restrictions: ["short", "long", "short;long"]
      default_value: "short;long"
      optional: true
    loss_class: galaxy_value_charset_overrestrictive
    loss_severity: blocking
    mitigation: rename canonical value "short;long" to "short_long" and remap upstream; record CLI mismatch
```

### `loss_class` enum

| `loss_class` | When |
|---|---|
| `none` | feature preserved exactly |
| `regex_anchor_drift` | `pattern` preserved as `regex` validator (Galaxy uses `match`, not `fullmatch`) |
| `type_union_collapsed` | nf-schema `["string","integer"]` collapsed to `string` |
| `numeric_multipleof_dropped` | `multipleOf` not expressible |
| `path_pattern_to_dataset_format` | path column became dataset payload; per-pattern check lost |
| `directory_path_unsupported` | `format: directory-path` |
| `path_glob_unsupported` | `format: file-path-pattern` |
| `mimetype_dropped` | `mimetype` lost |
| `exists_dropped` | `exists: true` dropped (non-data column) |
| `exists_implicit_via_dataset` | `exists` satisfied because column is a Galaxy dataset |
| `errorMessage_dropped` | nf-schema `errorMessage` lost (until W5) |
| `dependentRequired_dropped` | per-row dependent required not expressible |
| `dependentRequired_partially_structural` | satisfied by paired/paired_or_unpaired structure |
| `discriminated_union_required` | `anyOf`-of-`dependentRequired` not expressible |
| `cross_row_unique_dropped` | single-column `uniqueEntries` |
| `cross_row_unique_composite` | composite-key `uniqueEntries` |
| `galaxy_value_charset_overrestrictive` | column value contains a char outside `[\w\-_ ?]` |
| `meta_id_promoted_to_element_identifier` | `meta: ["id"]` mapped to `element_identifier` |
| `alternative_input_branch` | column belongs to an `anyOf`-style alt branch; promoted out of sample sheet |
| `deprecated_dropped` | `deprecated: true` columns excluded |

### `loss_severity` enum

| Value | Meaning |
|---|---|
| `none` | round-trip exact |
| `cosmetic` | UI prose lost, behavior identical |
| `informational` | constraint not enforced, but unlikely to mis-fire |
| `behavioral` | constraint not enforced; user discipline required |
| `blocking` | feature fundamentally cannot be expressed; user must be redirected (alt branch, refuse) |

### Refuse vs map-and-warn

Refuse mapping (push back to interface brief as a question) when:

- A `format: directory-path` column is required.
- A `format: file-path-pattern` column would be the dataset payload.
- A discriminated `anyOf`-of-`dependentRequired` cannot be modeled by a single sample-sheet variant.
- Column value charset is fundamentally incompatible (e.g. nf-schema enum value contains `;`).
- The sheet uses a nested `schema:` reference to validate a per-row file (a sheet of sheets).

Map-and-warn (record loss, proceed) when:

- `multipleOf`, `exclusive*`, `minLength`/`maxLength`.
- `pattern` (regex anchoring caveat).
- `errorMessage`, `description`, `help_text` (cosmetic until W5).
- `uniqueEntries` (record `behavioral`; user discipline).
- `dependentRequired` already structurally satisfied by the variant.

## Open questions

- gxformat2 schema authority for `column_definitions`. Today round-trips as additional state. Should W2/W3 trigger a real v19_09 rev plus IDE bindings, or remain in additional state? Punt: small-rev once W2 lands.
- `column_definitions_compatible` (GS `sample_sheet_util.py:177-212`) compares only `name` + `type`. Should validators participate in compatibility? Tightening would break editor wiring of legacy sample sheets.
- `RegexParameterValidatorModel` uses `regex.match`, not `fullmatch` — should the sample-sheet caller force `fullmatch` semantics by appending `$`? Cast Mold could do this transparently and record under `regex_anchor_drift`.
- nf-schema `meta` mapping: is *every* `meta`-marked column promoted to `element_identifier`, or only `meta: id`? Convention is `meta: ["id"]` for primary key, others as ordinary metadata. Confirm with sarek (six `meta` columns).
- For sample sheets that mix multiple "branches" (sarek: fastq vs spring vs bam vs cram vs vcf), should the cast Mold *always* split into multiple Galaxy inputs gated by a scalar mode, or attempt `sample_sheet:record`? Likely a per-pipeline interface decision.
- Should W3's "discriminator" be added as gxformat2 schema or as a Galaxy-only extension? Affects portability to CWL.
- Galaxy issue #20541 (Custom Tabular Inputs for Workflows) — long-term home for richer column-validation, or extend `sample_sheet` codepath?
