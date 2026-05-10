---
type: research
subtype: component
title: "CWL workflow anatomy"
tags:
  - research/component
  - source/cwl
status: draft
created: 2026-05-10
revised: 2026-05-10
revision: 1
ai_generated: true
related_notes:
  - "[[summary-cwl]]"
  - "[[cwl-v1.2-schemas]]"
  - "[[galaxy-collection-semantics]]"
related_molds:
  - "[[summarize-cwl]]"
  - "[[cwl-summary-to-galaxy-interface]]"
  - "[[cwl-summary-to-galaxy-data-flow]]"
  - "[[cwl-summary-to-galaxy-template]]"
sources:
  - "https://www.commonwl.org/v1.2/Workflow.html"
  - "https://cwltool.readthedocs.io/en/stable/"
  - "https://github.com/common-workflow-language/cwl-utils#normalize-a-cwl-document"
  - "https://pypi.org/project/cwl-utils/"
  - "https://github.com/common-workflow-language/cwldep"
summary: "CWL structure relevant to summarize-cwl: normalized documents, steps, scatter, conditionals, requirements, and dependency handling."
---

# CWL Workflow Anatomy

CWL is a structured workflow language, not a pipeline framework that must be inferred from ecosystem conventions. The `summarize-cwl` Mold should therefore start from CWL's own validated object model and avoid recreating the heavy Nextflow extraction stack.

## Normalization Posture

Use `cwltool --validate` as the first gate. If validation fails, the summary should emit provenance plus validation diagnostics and stop before producing downstream-looking graph claims.

Use `cwl-normalizer` from `cwl-utils` as the default normalization surface. The cwl-utils README describes it as producing JSON CWL documents with dependencies packed together, upgrading to CWL v1.2 as needed, and optionally refactoring CWL expressions into separate steps. This is the right handoff for `summarize-cwl`: structured enough for extraction, still source-faithful, and not a Galaxy design.

Use `cwl-utils` for structured extraction when implementing the cast skill: it is a maintained CWL utility package with command and Python-library surfaces for loading CWL documents, normalizing them, inspecting Docker requirements, and citation/provenance metadata.

Treat `cwldep` as optional research for dependency import workflows, not the default normalizer. It can add, install, check, and update workflow dependencies, but `cwl-normalizer` plus direct document resolution is the narrower operation needed for v1.

## Objects To Preserve

Preserve these CWL concepts directly in [[summary-cwl]]:

- `Workflow` inputs and outputs, including type expressions, `format`, `secondaryFiles`, defaults, labels, and docs.
- `WorkflowStep` ids, `run` targets, input source wiring, output ids, `scatter`, `scatterMethod`, `when`, requirements, and hints.
- `CommandLineTool` command surfaces: `baseCommand`, `arguments`, inputs, outputs, input/output bindings, and requirement blocks.
- `DockerRequirement` and `SoftwareRequirement`. Capture the raw requirement object and a few easy fields (`dockerPull`, `dockerImageId`, package names/versions), but do not solve packages into Galaxy wrappers here.
- `ExpressionTool`, `Operation`, nested `Workflow`, and extension-heavy steps as graph nodes with warnings when they are likely to affect Galaxy translation.

## Graph Edges

The CWL graph can be derived mechanically:

- Workflow input to step input: each `WorkflowStepInput.source` pointing at a workflow input.
- Step output to step input: each `source` pointing at `<step>/<output>`.
- Step output to workflow output: each `WorkflowOutputParameter.outputSource`.

Add `via` markers when an edge crosses a shape-affecting feature:

- `scatter` when the consuming step scatters over that input.
- `linkMerge` when multiple sources are merged.
- `pickValue` when nullable or multi-source selection is declared.
- `valueFrom` when an expression rewrites the value.
- `secondaryFiles` when sidecar files are part of the value contract.

Do not try to execute `valueFrom` or JavaScript expressions. Preserve them verbatim and mark the edge lower confidence for Galaxy translation.

## Galaxy-Relevant Shape Signals

CWL arrays are the main signal for Galaxy collections. `File[]` and scattered `File` inputs often map to Galaxy `list`; nested arrays may imply `list:list` or a review question. Records may map to Galaxy sample-sheet-like structures only when fields describe repeated per-sample metadata plus data files; otherwise keep them as workflow-level parameter grouping notes.

`secondaryFiles` are not ordinary extra workflow outputs. They often mean Galaxy should preserve paired sidecars such as BAM/BAI, FASTA/FAI, VCF/TBI, or index directories through tool-step outputs and tests.

`Directory` is a review trigger. Galaxy can move directories through some tools, but many IWC-style workflows prefer explicit files or collections. Keep `Directory` visible in summaries and downstream interface briefs rather than flattening it.

## Tests

CWL job files are good test-plan seeds when they are supplied by the user, live beside the workflow by convention, or are named in an external runner configuration. The summarizer should not invent expected outputs. It can record job inputs and expected-output files/checksums only when they are present in a discoverable test description.

## Boundaries

`summarize-cwl` owns validation, normalization, graph enumeration, command/tool surface extraction, requirement capture, and warnings.

Downstream molds own:

- Galaxy interface choices from CWL types and docs.
- Galaxy collection and scatter/map-over semantics.
- IWC exemplar comparison.
- gxformat2 skeleton authoring.
- Tool Shed discovery or new Galaxy wrapper authoring.
