---
type: research
subtype: component
title: "Galaxy sample_sheet collection types"
tags:
  - research/component
  - target/galaxy
status: draft
created: 2026-05-05
revised: 2026-05-06
revision: 2
ai_generated: true
related_notes:
  - "[[galaxy-collection-semantics]]"
  - "[[galaxy-collection-tools]]"
  - "[[nextflow-workflow-io-semantics]]"
  - "[[nextflow-params-to-galaxy-inputs]]"
  - "[[nextflow-path-glob-to-galaxy-datatype]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
related_molds:
  - "[[nextflow-summary-to-galaxy-interface]]"
  - "[[nextflow-summary-to-galaxy-data-flow]]"
sources:
  - "Galaxy PR #19305 (Implement Sample Sheets), merged 2025-07-30"
  - "lib/galaxy/model/dataset_collections/types/sample_sheet.py"
  - "lib/galaxy/model/dataset_collections/types/sample_sheet_util.py"
  - "lib/galaxy/model/dataset_collections/type_description.py"
  - "lib/galaxy/schema/schema.py (SampleSheetColumnDefinition, SampleSheetRow)"
  - "lib/galaxy/tools/wrappers.py (DatasetCollectionWrapper.sample_sheet_row)"
  - "lib/galaxy/tools/sample_sheet_to_tabular.xml"
  - "lib/galaxy/webapps/galaxy/api/dataset_collections.py (sample_sheet_workbook endpoints)"
  - "lib/galaxy/model/migrations/alembic/versions_gxy/3af58c192752_implement_sample_sheets.py"
summary: "Galaxy's sample_sheet collection family: typed column metadata, four variants, mapping rules, validator allowlist."
---

# Galaxy sample_sheet collection types

Reference for the Galaxy backend shape that targets structured per-row metadata — the natural landing zone for Nextflow `samplesheetToList` parameters and for any source-side idiom that pairs typed metadata columns with dataset references.

## Shape

A `sample_sheet` is a list-shaped collection where each element carries a typed `columns` row, and the parent collection carries a `column_definitions` schema. The model (`lib/galaxy/model/__init__.py`) adds two nullable JSON columns: `dataset_collection.column_definitions` and `dataset_collection_element.columns`. Existing collections are unaffected.

```
DatasetCollection
  collection_type: "sample_sheet"
  column_definitions: [{name, type, optional, ...}]
  elements:
    DatasetCollectionElement(element_identifier, columns: [v1, v2, ...], hda or child_collection)
```

## Column definition vocabulary

`SampleSheetColumnDefinition` (lib/galaxy/schema/schema.py:384-405):

```
type:        "string" | "int" | "float" | "boolean" | "element_identifier"
optional:    bool
default_value, validators[], restrictions[], suggestions[]
```

- `element_identifier` cross-references another row's identifier in the same collection. Captures patterns like nf-core `control_sample`. Within-collection only — no cross-collection refs.
- `restrictions[]` enumerates allowed values (maps to nf-schema `enum`).
- `validators[]` is restricted to the **safe allowlist** (`AnySafeValidatorModel`, lib/galaxy/tool_util_models/parameter_validators.py): `regex`, `in_range`, `length`. `expression` and other arbitrary-Python validators are rejected. Translation from richer nf-schema validation must drop to prose or fall through.
- String values and column names are restricted to `[\w\-_ ?]*` — no tabs, newlines, quotes, or most specials. Necessary for safe CSV/TSV serialization.

## Variants

Enforced by `COLLECTION_TYPE_REGEX` in `type_description.py`:

| Variant | Inner element shape | Typical source |
|---|---|---|
| `sample_sheet` | one dataset per row | one path column in nf-schema |
| `sample_sheet:paired` | `paired` (forward/reverse) | two path columns, paired-end fastq |
| `sample_sheet:paired_or_unpaired` | mixed single or pair | mixed-library sample sheets |
| `sample_sheet:record` | `record` (named typed slots) | heterogeneous per-sample artifacts |

Constraints to plan around:

- `sample_sheet` must be **outermost**. `list:sample_sheet` and `sample_sheet:list` are invalid.
- `prototype_elements()` is not implemented — sample-sheet-shaped pre-creation isn't possible because element count is unknown until data exists.

## Mapping rules

`allow_implicit_mapping` is `True` for everything except `record`, so sample sheets behave like lists for mapping:

- `sample_sheet` over a `(dataset → dataset)` tool produces an implicit `sample_sheet`-shaped output. **`column_definitions` and `columns` are not propagated** — metadata lives only on the input collection.
- `sample_sheet:paired` over a `paired` input produces a `sample_sheet`-shaped output (one job per row).
- A `sample_sheet` can be reduced by a `multiple=true` data input.
- Two sample sheets with identical structure can be linked for dot-product execution.

## Tool-side access

Tools read columns at runtime through `DatasetCollectionWrapper.sample_sheet_row(element_identifier)` (lib/galaxy/tools/wrappers.py:643-707), which builds a `{element_identifier: row}` dict from element `columns`. The built-in `__SAMPLE_SHEET_TO_TABULAR__` tool (lib/galaxy/tools/sample_sheet_to_tabular.xml) iterates and tab-joins for downstream tabular consumers. Tool inputs declare acceptance via `data_collection collection_type="sample_sheet,sample_sheet:paired,..."`.

`DataCollectionToolParameter` carries `column_definitions` through `to_dict()`, which lets the workflow editor render column-definition forms for sample-sheet inputs.

## API surfaces

- `POST /api/dataset_collections` accepts `column_definitions` and `rows` (a `{element_identifier: [values]}` dict).
- `POST /api/tools/fetch` carries `column_definitions` at target level and per-element `row` for remote-URI sample-sheet creation.
- Workbook endpoints (`/api/sample_sheet_workbook[/parse]`, `/api/dataset_collections/{id}/sample_sheet_workbook[/parse]`) generate and parse XLSX/CSV/TSV using openpyxl, with header rows, dropdowns for `restrictions`, type validation, and an instructions sheet.

## Workflow integration

`InputCollectionModule` (lib/galaxy/workflow/modules.py) validates `column_definitions` at workflow save and propagates them to the runtime form. Galaxy workflow YAML accepts:

```yaml
inputs:
  chipseq_data:
    type: collection
    collection_type: sample_sheet:paired
    column_definitions:
      - {type: string, name: condition, optional: false}
      - {type: int, name: replicate, optional: false}
      - {type: element_identifier, name: control_sample, optional: true}
```

This is the structured-input lever a Nextflow → Galaxy translation reaches for when source pipelines use `samplesheetToList(params.input, "assets/schema_input.json")`.

## Mapping from Nextflow sample sheets

| Nextflow / nf-schema | Galaxy `sample_sheet*` |
|---|---|
| `samplesheetToList(params.x, schema)` materialization | `sample_sheet` collection input bound to `params.x` |
| nf-schema column `type: string\|integer\|number\|boolean` | column `type: string\|int\|float\|boolean` |
| Column annotated `meta:` (carried in `meta` map) | non-path column in `columns[]` |
| Path-typed column (one per row) | element dataset (variant `sample_sheet`) |
| Two path columns (fastq pair) | inner `paired` (variant `sample_sheet:paired`) |
| Mixed single/paired rows | inner `paired_or_unpaired` |
| Heterogeneous typed per-row artifacts | inner `record` (variant `sample_sheet:record`) |
| nf-schema `enum` | `restrictions[]` |
| nf-schema `pattern` | `regex` validator |
| nf-core `control_sample` style cross-row reference | `element_identifier` column type |

Edges to flag, not silently squash, when translating:

- nf-schema validation richer than regex/in_range/length cannot be expressed; downgrade to prose with confidence note.
- Cross-sample-sheet references have no Galaxy expression — keep as plain `string` and warn.
- Ad-hoc `splitCsv(header: true)` parsing without an `assets/schema_*.json` produces no column types — translation needs ad-hoc inference; this note's mapping does not apply.
- Output side has no automatic propagation: a tool mapped over a `sample_sheet` produces a `sample_sheet`-shaped collection without `column_definitions`. Carry-forward must be explicit (re-attaching metadata via `__SAMPLE_SHEET_TO_TABULAR__` or rules DSL `add_column_from_sample_sheet_index`).

## Why this matters for the Foundry

Without sample_sheet shape awareness, `nextflow-summary-to-galaxy-interface` defaults nf-core sample-sheet inputs to `list:paired` or a flat file input, dropping per-row metadata. Surfacing the column schema lets the interface Mold pick the right variant and lets the data-flow Mold preserve `meta` fields through identifier-keyed wiring instead of inventing parallel parameter inputs.
