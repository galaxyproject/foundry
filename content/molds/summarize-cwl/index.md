---
type: mold
name: summarize-cwl
axis: source-specific
source: cwl
tags:
  - source/cwl
status: draft
created: 2026-04-30
revised: 2026-05-10
revision: 2
ai_generated: true
summary: "Validate and normalize a CWL Workflow tree, then emit a lightweight structured summary for downstream Galaxy translation."
output_artifacts:
  - id: summary-cwl
    kind: json
    default_filename: summary-cwl.json
    schema: "[[summary-cwl]]"
    description: "Structured summary of a CWL Workflow + CommandLineTool tree: inputs, outputs, scatter, conditionals, requirements."
references:
  - kind: schema
    ref: "[[summary-cwl]]"
    used_at: both
    load: upfront
    mode: verbatim
    evidence: cast-validated
    purpose: "Validate the emitted CWL summary JSON and provide downstream consumers the output contract."
  - kind: research
    ref: "[[component-cwl-workflow-anatomy]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Use CWL's native workflow, step, tool, scatter, conditional, and requirement structure without copying the heavier Nextflow inference pipeline."
    verification: "Run the generated summarize-cwl skill against one simple normalized workflow, one scattered workflow, and one workflow with remote run references; confirm the summary validates and downstream CWL-to-Galaxy molds can consume it."
  - kind: research
    ref: "[[cwl-v1.2-schemas]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Check official CWL v1.2 field names and source-language semantics when summarizing less-common features."
    trigger: "When the workflow uses WorkflowStep features, requirements, hints, Operation, ExpressionTool, or CommandLineTool bindings not covered by the short procedure."
  - kind: cli-tool
    ref: "[[cwltool]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Validate the CWL entrypoint before normalization."
    verification: "Run summarize-cwl against one valid and one invalid CWL fixture; the invalid one must surface cwltool diagnostics in summary-cwl.json."
  - kind: cli-tool
    ref: "[[cwl-utils]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Normalize the CWL workflow (cwl-normalizer) into a single JSON document for extraction."
    verification: "Run summarize-cwl against the cross-document-run-refs eval case; documents.normalized_path must be populated and tools[] must contain the referenced CommandLineTools."
  - kind: cli-tool
    ref: "[[foundry]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: cast-validated
    purpose: "Schema-check summary-cwl.json before returning it from the skill."
related_notes:
  - "[[summary-cwl]]"
  - "[[component-cwl-workflow-anatomy]]"
  - "[[cwl-v1.2-schemas]]"
---
# summarize-cwl

Read a CWL Workflow entrypoint, resolve referenced `Workflow`, `CommandLineTool`, `ExpressionTool`, and `Operation` documents, and emit `summary-cwl.json`. This Mold is source-specific and target-agnostic: it records what the CWL says, validates and normalizes references, and leaves Galaxy interface/data-flow choices to downstream molds.

CWL is already a structured workflow language. Do not imitate [[summarize-nextflow]]'s heavy inference machinery unless a real CWL fixture proves the need.

## Inputs

The Mold expects:

- A local CWL entrypoint path or an HTTP(S) URL.
- Optional pin/version metadata supplied by the harness or user.
- Optional output directory/path for a normalized CWL document.
- Optional test/job file hints. If no test files are supplied or discoverable, emit `tests: []`.

## Outputs

A single JSON document conforming to [[summary-cwl]]. Sketch shape:

```jsonc
{
  "summary_version": "1",
  "source": {
    "ecosystem": "cwl",
    "workflow": "rnaseq-qc",
    "url": "https://example.org/workflows/rnaseq-qc.cwl",
    "version": "abc123",
    "license": null,
    "slug": "rnaseq-qc",
    "cwl_version": "v1.2",
    "entrypoint": "rnaseq-qc.cwl#main"
  },
  "documents": {
    "entrypoint": "rnaseq-qc.cwl",
    "normalized_path": "normalized/rnaseq-qc.cwl.json",
    "validation": {
      "command": "cwltool --validate rnaseq-qc.cwl",
      "status": "valid",
      "diagnostics": []
    }
  },
  "workflow_inputs": [
    {
      "id": "reads",
      "label": "reads",
      "type": "File[]",
      "optional": false,
      "default": null,
      "doc": "Input FASTQ files.",
      "format": "edam:format_1930",
      "secondary_files": []
    }
  ],
  "workflow_outputs": [
    {
      "id": "report",
      "label": "report",
      "type": "File",
      "output_source": "multiqc/report",
      "doc": null,
      "format": "edam:format_2330",
      "secondary_files": []
    }
  ],
  "steps": [
    {
      "id": "fastqc",
      "run": "#fastqc_tool",
      "run_class": "CommandLineTool",
      "label": "FastQC",
      "doc": null,
      "in": [{ "id": "reads", "source": ["reads"], "value_from": null }],
      "out": ["html", "zip"],
      "scatter": ["reads"],
      "scatter_method": "dotproduct",
      "when": null,
      "requirements": [],
      "hints": []
    }
  ],
  "tools": [
    {
      "id": "fastqc_tool",
      "label": "FastQC",
      "base_command": ["fastqc"],
      "arguments": [],
      "inputs": [],
      "outputs": [],
      "requirements": [
        {
          "class": "DockerRequirement",
          "docker_pull": "quay.io/biocontainers/fastqc:0.12.1--hdfd78af_0",
          "docker_image_id": null,
          "packages": [],
          "raw": {}
        }
      ],
      "hints": []
    }
  ],
  "graph": {
    "nodes": [{ "id": "fastqc", "kind": "step", "label": "FastQC" }],
    "edges": [{ "from": "reads", "to": "fastqc/reads", "via": ["scatter"] }]
  },
  "tests": [],
  "warnings": []
}
```

## Procedure

1. Validate the entrypoint with `cwltool --validate` or equivalent library validation. If invalid, emit source provenance, validation diagnostics, `warnings[]`, and do not invent graph structure.
2. Normalize the workflow with `cwl-normalizer` from `cwl-utils` when possible. Use the normalized JSON document as the preferred extraction surface because referenced documents have been gathered, older CWL versions have been upgraded to v1.2 when needed, and the output is regular JSON.
3. Extract `Workflow` inputs/outputs, step wiring, `scatter`, `scatterMethod`, `when`, `requirements`, and `hints` directly from the normalized CWL object model.
4. Extract every referenced `CommandLineTool` command surface: `baseCommand`, `arguments`, input/output bindings, output globs, `DockerRequirement`, and `SoftwareRequirement`.
5. Build a simple graph from workflow inputs to step inputs, step outputs to step inputs, and step outputs to workflow outputs. Add `via` markers for `scatter`, `linkMerge`, `pickValue`, `valueFrom`, and `secondaryFiles`.
6. Record test/job files only when supplied or discoverable by convention. Do not infer expected outputs from command names.
7. Validate the assembled object with `foundry validate-summary-cwl summary-cwl.json` before returning it.

## Caveats Baked Into The Procedure

- **Expressions are preserved, not executed.** `valueFrom`, `when`, expression-based globs, and JavaScript-heavy tools should surface warnings when they affect data shape.
- **Directory is a review trigger.** Preserve `Directory` types; downstream Galaxy molds decide whether to use directory-capable wrappers, explicit files, or collections.
- **Nested workflows stay visible.** A nested `Workflow` in `run:` is a step target, not a reason to flatten blindly. Summarize its boundary and warn if downstream Galaxy translation needs expansion.
- **Dependency solving is downstream.** Capture `DockerRequirement` and `SoftwareRequirement`, but do not resolve them into Tool Shed tools or new wrappers here.
- **Remote document resolution is bounded.** Resolve referenced CWL documents and tool files; do not recursively download arbitrary input data.

## Reference Dispatch

- [[summary-cwl]] — always validate output against this schema before emitting.
- [[component-cwl-workflow-anatomy]] — use for normalization, graph extraction, scatter/conditionals, requirements, and known non-goals.

## Non-Goals

- **Translation to Galaxy.** Collection choice, datatype choice, data-flow reshaping, IWC comparison, and gxformat2 authoring belong downstream.
- **Tool discovery or wrapper authoring.** Existing Galaxy wrapper search and new wrapper authoring are handled by the per-step Galaxy loop.
- **Runtime execution.** This Mold summarizes and validates CWL structure; [[run-workflow-test]] owns execution.
