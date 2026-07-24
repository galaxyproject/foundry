---
type: research
title: "CWL v1.2 schema documents"
tags:
  - source/cwl
status: draft
created: 2026-05-10
revised: 2026-05-10
revision: 1
ai_generated: true
related_notes:
  - "[[component-cwl-workflow-anatomy]]"
  - "[[summary-cwl]]"
related_molds:
  - "[[summarize-cwl]]"
sources:
  - "https://github.com/common-workflow-language/cwl-v1.2/tree/v1.2.1"
  - "https://www.commonwl.org/v1.2/Workflow.html"
summary: "Vendored official CWL v1.2.1 JSON/SALAD schema documents used as source-structure reference for CWL summarization."
---

# CWL v1.2 Schema Documents

Vendored from `common-workflow-language/cwl-v1.2` tag `v1.2.1`, pinned at SHA `ae6899d`. These files are reference material for [[summarize-cwl]] and [[component-cwl-workflow-anatomy]], not Mold IO schemas.

Vendored files under `content/research/cwl-v1.2/`:

- `cwl.yaml` — generated JSON Schema for CWL v1.2.
- `CommonWorkflowLanguage.yml` — top-level SALAD schema imports.
- `Process.yml` — shared process, requirement, hint, and parameter definitions.
- `CommandLineTool.yml` — command-line tool schema.
- `CommandLineTool-standalone.yml` — standalone command-line tool import surface.
- `Workflow.yml` — workflow, step, scatter, link, and output-source schema.
- `Operation.yml` — abstract operation schema.

Re-sync:

```sh
pnpm sync:vendored
```

The vendored upstream manifest uses pinned raw GitHub URLs. Updating to a new CWL release should change the raw URLs and `pinned_ref` values together, then re-run `pnpm sync:vendored`.

## Foundry Role

Use these documents to check field names, enums, and source semantics while drafting or refining CWL Molds. Do not cite these files from polished Galaxy pattern pages as corpus evidence; they are language specification references, not workflow exemplars.
