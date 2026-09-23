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

Top-level `inputs:` names the values a caller supplies to a Galaxy workflow. Choose the input type from the value the workflow consumes, and give it a stable name that a test can use as a `job:` key. See [[galaxy-workflow-testability-design]] for the test interface.

## Match the input's shape

| Value | gxformat2 `type` | Other fields to consider |
|---|---|---|
| One dataset | `data` or `File` | `format` for accepted Galaxy datatypes |
| A dataset collection | `collection` | `collection_type` for its shape, `format` for member datatypes |
| A scalar parameter | `string`, `int`, `float`, or `boolean` | `default` or choices where appropriate |

Both `data` and `File` describe a single workflow dataset input. Current normalized gxformat2 export writes `data`, but `File` is accepted on import and appears in upstream examples. This export spelling is not a reason to rewrite a working hand-authored workflow. The source schema also accepts aliases such as `text` and `integer`; [[gxformat2-schema]] records the accepted vocabulary. A test fixture's `class: File` is separate from the workflow input's `type`.

For a collection, declare the shape the workflow needs. Galaxy defaults an omitted `collection_type` to `list`; `list:paired` means a list of paired datasets. The [IWC CellPlex workflow](https://github.com/galaxyproject/iwc/blob/main/workflows/scRNAseq/fastq-to-matrix-10x/scrna-seq-fastq-to-matrix-10x-cellplex.ga) has two `list:paired` FASTQ inputs and a separate `list` of CSV sample mappings. See [[galaxy-collection-semantics]] for other shapes and [[galaxy-datatypes-conf]] for datatype extensions.

## Set omission and choices deliberately

`optional: true` permits a missing input. `default` supplies a value when an input is missing or null; it does not itself make the input optional. The [IWC Scanpy workflow](https://github.com/galaxyproject/iwc/blob/main/workflows/scRNAseq/scanpy-clustering/Preprocessing-and-Clustering-of-single-cell-RNA-seq-data-with-Scanpy.ga) combines `format: [mtx]` for its Matrix dataset with an optional text parameter whose default is `MT-`.

For text parameters, `restrictions` defines a closed choice list, `suggestions` offers choices while allowing other text, and `restrictOnConnections` derives choices from connected select inputs. Current gxformat2 declares and converts these fields, although the older vendored JSON Schema in [[gxformat2-schema]] omits them. If a numeric bound matters, check it after import: gxformat2 declares `min` and `max`, but its current native conversion does not carry them into parameter state.

After import or conversion, inspect the effective input names, types, collection shapes, and choices. Run a workflow test with representative `job:` values to check the interface Galaxy actually uses. [[iwc-test-data-conventions]] covers fixture shapes.
