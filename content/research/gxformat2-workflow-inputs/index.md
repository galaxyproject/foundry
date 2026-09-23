---
type: research
title: "gxformat2 workflow inputs"
tags:
  - target/galaxy
status: draft
created: 2026-05-05
revised: 2026-09-23
revision: 3
related_notes:
  - "[[gxformat2-schema]]"
  - "[[galaxy-collection-semantics]]"
  - "[[galaxy-datatypes-conf]]"
  - "[[galaxy-workflow-testability-design]]"
  - "[[nextflow-params-to-galaxy-inputs]]"
  - "[[nextflow-path-glob-to-galaxy-datatype]]"
sources:
  - "https://github.com/galaxyproject/gxformat2/blob/main/schema/v19_09/workflow.yml"
  - "https://github.com/galaxyproject/gxformat2/blob/main/schema/v19_09/Process.yml"
  - "https://github.com/galaxyproject/gxformat2/blob/main/gxformat2/normalized/_conversion.py"
  - "https://github.com/galaxyproject/gxformat2/blob/main/gxformat2/normalized/_format2.py"
  - "https://github.com/galaxyproject/gxformat2/blob/main/gxformat2/schema/gxformat2.py"
  - "https://github.com/galaxyproject/gxformat2/blob/main/gxformat2/lint.py"
  - "https://github.com/galaxyproject/galaxy/blob/dev/lib/galaxy/workflow/modules.py"
  - "https://github.com/galaxyproject/galaxy/blob/dev/lib/galaxy/workflow/workflow_parameter_input_definitions.py"
summary: "Authoring guidance for gxformat2 workflow input types, constraints, defaults, and validation."
---

# gxformat2 workflow inputs

The top-level `inputs:` section declares the values a caller supplies when invoking a Galaxy workflow. Choose each input's type and public name from the data the workflow actually consumes. A workflow test addresses the same public names in its `job:` mapping, so verify the effective names after import or conversion. [[galaxy-workflow-testability-design]] covers that test interface.

## Choose the input type

| Declare `type` | Galaxy input | Use when |
|---|---|---|
| `data` | Dataset input | The caller supplies one dataset. |
| `collection` | Dataset collection input | The caller supplies a grouped set of datasets. Declare `collection_type` when its shape matters. |
| `string`, `int`, `float`, `boolean` | Workflow parameter input | The caller supplies a scalar value to one or more downstream steps. |

These are the spellings emitted by current gxformat2 normalization. Import also accepts compatibility spellings, including `File` for `data`, `text` for `string`, and `integer` for `int`. Native Galaxy parameter state uses `text` and `integer`. The broader primitive enum in [[gxformat2-schema]] includes `long` and `double`, but that enum alone does not establish a usable native workflow parameter mapping. For new inputs, choose a type with a defined conversion and test it after import.

Use `type: File` in a workflow **test job** to stage a file. That test fixture syntax is separate from a workflow's `type: data` declaration. The gxformat2 converter also supports simple arrays of scalar input types, which become native parameter inputs with `multiple: true`. Test the actual invocation shape before using one in a new interface.

## Constrain datasets and collections

`format` filters the Galaxy datatype extensions accepted by a `data` or `collection` input. Declare only extensions the downstream tools can really consume. An incorrect filter can hide a valid dataset or admit data the tool cannot interpret. See [[galaxy-datatypes-conf]] for extension names.

For `type: collection`, `collection_type` describes the expected shape. If omitted, Galaxy uses `list`. Nested types use colons, such as `list:paired`. Match the grouping the workflow will process, then check that a test fixture can supply that shape. [[galaxy-collection-semantics]] explains collection structures. Current gxformat2 also declares `column_definitions` for sample-sheet collections and `fields` for record collections. Use those when the workflow requires a row or record schema, and validate the resulting workflow with Galaxy.

The pinned [IWC CellPlex workflow](https://github.com/galaxyproject/iwc/blob/main/workflows/scRNAseq/fastq-to-matrix-10x/scrna-seq-fastq-to-matrix-10x-cellplex.ga) declares two `list:paired` FASTQ inputs and a separate `list` of CSV sample mappings. Those are distinct structures, even though each is a collection input.

## Decide whether omission is allowed

`optional` and `default` answer different questions. Set `optional: true` when the caller may omit an input. Use `default` when a missing or null input should receive a specific value. A declared default does not itself make an input optional. This distinction applies to dataset, collection, and parameter inputs, although a dataset default must resolve to a usable Galaxy dataset at invocation.

The pinned [IWC Scanpy workflow](https://github.com/galaxyproject/iwc/blob/main/workflows/scRNAseq/scanpy-clustering/Preprocessing-and-Clustering-of-single-cell-RNA-seq-data-with-Scanpy.ga) declares `format: [tabular]` for Genes and `format: [mtx]` for Matrix. Its optional mitochondrial-gene text parameter also has a default of `MT-`. These declarations describe different interface decisions: accepted data formats, permission to omit a parameter, and the value used when it is omitted.

The gxformat2 source schema also declares inclusive `min` and `max` bounds for numeric inputs. Current gxformat2 conversion does not copy them into native parameter state, so do not rely on those fields to enforce a bound after import. Check the imported form and an invocation if a bound matters to the analysis.

## Present choices for text parameters

Current gxformat2 declares three fields for `type: string` inputs:

| Field | Runtime effect | Use when |
|---|---|---|
| `restrictions` | Presents a closed choice list as a select input. | Only listed values are valid. |
| `suggestions` | Offers values while keeping the input as free text. | Listed values help users, but other values remain valid. |
| `restrictOnConnections: true` | Tries to derive choices from connected tool or subworkflow select inputs. | The downstream selectable values should govern the workflow input. |

Static list entries may be strings or `{value, label}` records. Connection-derived choices can fall back to free text when Galaxy cannot obtain the downstream options. Confirm the resulting invocation form, especially if tool options depend on another parameter. These fields are present in gxformat2's current SALAD source and conversion code. Foundry's older vendored structural JSON Schema omits them, so passing that schema cannot validate their shape. [[gxformat2-schema]] describes that validator's limits.

## Check the imported interface

Inspect the gxformat2 input declarations, then import or convert the workflow and confirm its effective input names, native types, collection shapes, datatype filters, and choices. Supply a representative `job:` in a workflow test and run it. This catches differences that a structural JSON Schema cannot prove, such as a usable dataset default, a valid collection type for the target Galaxy instance, or dynamic option behavior. See [[iwc-test-data-conventions]] for test input shapes.
