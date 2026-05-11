---
name: summarize-cwl
description: "Validate and normalize a CWL Workflow tree, then emit a lightweight structured summary for downstream Galaxy translation."
---

# summarize-cwl

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Validate and normalize a CWL Workflow tree, then emit a lightweight structured summary for downstream Galaxy translation.

## Inputs

- No upstream artifact inputs declared. See the procedure for user-supplied runtime inputs.

## Outputs

- Write artifact `summary-cwl` as `summary-cwl.json`. Format: `json`. Schema: summary-cwl. Structured summary of a CWL Workflow + CommandLineTool tree: inputs, outputs, scatter, conditionals, requirements.

## Required Tools

- **`cwl-normalizer`** (cwl-utils). `uv tool install cwl-utils` (or `pip install cwl-utils`).
  Ephemeral run: `uvx --from cwl-utils cwl-normalizer`.
  Check: `cwl-normalizer --help`.
  Docs: https://github.com/common-workflow-language/cwl-utils
  Bundled reference: `references/cli/cwl-utils.md`.
- **`cwltool`** (cwltool). `uv tool install cwltool` (or `pip install cwltool`).
  Ephemeral run: `uvx cwltool`.
  Check: `cwltool --version`.
  Docs: https://cwltool.readthedocs.io/
  Bundled reference: `references/cli/cwltool.md`.
- **`foundry`** (foundry). `npm install -g @galaxy-foundry/foundry`.
  Ephemeral run: `npx --package @galaxy-foundry/foundry foundry`.
  Check: `foundry --help`.
  Docs: https://github.com/jmchilton/foundry/blob/main/packages/foundry/README.md
  Bundled reference: `references/cli/foundry.md`.

## Load Upfront

- `references/cli/cwl-utils.md`: CLI tool reference copied verbatim into the bundle. Normalize the CWL workflow (cwl-normalizer) into a single JSON document for extraction.
- `references/cli/cwltool.md`: CLI tool reference copied verbatim into the bundle. Validate the CWL entrypoint before normalization.
- `references/cli/foundry.md`: CLI tool reference copied verbatim into the bundle. Schema-check summary-cwl.json before returning it from the skill.
- `references/notes/component-cwl-workflow-anatomy.md`: Research note copied verbatim into the bundle. Use CWL's native workflow, step, tool, scatter, conditional, and requirement structure without copying the heavier Nextflow inference pipeline.
- `references/schemas/summary-cwl.schema.json`: Schema file copied verbatim into the bundle. Validate the emitted CWL summary JSON and provide downstream consumers the output contract.

## Load On Demand

- `references/notes/cwl-v1.2-schemas.md`: Research note copied verbatim into the bundle. Check official CWL v1.2 field names and source-language semantics when summarizing less-common features. Use when: the workflow uses WorkflowStep features, requirements, hints, Operation, ExpressionTool, or CommandLineTool bindings not covered by the short procedure.

## Validation

- Validate `summary-cwl.json` before returning it: run `foundry summary-cwl.json` from `@galaxy-foundry/foundry`. If the command is not on PATH, run `npx --package @galaxy-foundry/foundry foundry summary-cwl.json`. This checks artifact `summary-cwl` against the summary-cwl schema.

## Procedure

Read a CWL Workflow entrypoint, resolve referenced `Workflow`, `CommandLineTool`, `ExpressionTool`, and `Operation` documents, and emit `summary-cwl.json`. This skill is source-specific and target-agnostic: it records what the CWL says, validates and normalizes references, and leaves Galaxy interface/data-flow choices to downstream molds.

CWL is already a structured workflow language. Do not imitate summarize-nextflow's heavy inference machinery unless a real CWL fixture proves the need.

### Inputs

The skill expects:

- A local CWL entrypoint path or an HTTP(S) URL.
- Optional pin/version metadata supplied by the harness or user.
- Optional output directory/path for a normalized CWL document.
- Optional test/job file hints. If no test files are supplied or discoverable, emit `tests: []`.

### Outputs

A single JSON document conforming to summary-cwl. Sketch shape:

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

### Procedure

1. Validate the entrypoint with `cwltool --validate` or equivalent library validation. If invalid, emit source provenance, validation diagnostics, `warnings[]`, and do not invent graph structure.
2. Normalize the workflow with `cwl-normalizer` from `cwl-utils` when possible. Use the normalized JSON document as the preferred extraction surface because referenced documents have been gathered, older CWL versions have been upgraded to v1.2 when needed, and the output is regular JSON.
3. Extract `Workflow` inputs/outputs, step wiring, `scatter`, `scatterMethod`, `when`, `requirements`, and `hints` directly from the normalized CWL object model.
4. Extract every referenced `CommandLineTool` command surface: `baseCommand`, `arguments`, input/output bindings, output globs, `DockerRequirement`, and `SoftwareRequirement`.
5. Build a simple graph from workflow inputs to step inputs, step outputs to step inputs, and step outputs to workflow outputs. Add `via` markers for `scatter`, `linkMerge`, `pickValue`, `valueFrom`, and `secondaryFiles`.
6. Record test/job files only when supplied or discoverable by convention. Do not infer expected outputs from command names.
7. Validate the assembled object with `foundry validate-summary-cwl summary-cwl.json` before returning it.

### Caveats Baked Into The Procedure

- **Expressions are preserved, not executed.** `valueFrom`, `when`, expression-based globs, and JavaScript-heavy tools should surface warnings when they affect data shape.
- **Directory is a review trigger.** Preserve `Directory` types; downstream Galaxy molds decide whether to use directory-capable wrappers, explicit files, or collections.
- **Nested workflows stay visible.** A nested `Workflow` in `run:` is a step target, not a reason to flatten blindly. Summarize its boundary and warn if downstream Galaxy translation needs expansion.
- **Dependency solving is downstream.** Capture `DockerRequirement` and `SoftwareRequirement`, but do not resolve them into Tool Shed tools or new wrappers here.
- **Remote document resolution is bounded.** Resolve referenced CWL documents and tool files; do not recursively download arbitrary input data.

### Reference Dispatch

- summary-cwl — always validate output against this schema before emitting.
- component-cwl-workflow-anatomy — use for normalization, graph extraction, scatter/conditionals, requirements, and known non-goals.

### Non-Goals

- **Translation to Galaxy.** Collection choice, datatype choice, data-flow reshaping, IWC comparison, and gxformat2 authoring belong downstream.
- **Tool discovery or wrapper authoring.** Existing Galaxy wrapper search and new wrapper authoring are handled by the per-step Galaxy loop.
- **Runtime execution.** This skill summarizes and validates CWL structure; run-workflow-test owns execution.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
