---
type: mold
name: summarize-cwl-workflow
axis: source-specific
source: cwl
tags:
  - target/galaxy
status: draft
created: 2026-07-26
revised: 2026-07-26
revision: 1
summary: Read a CWL workflow and emit the structured summary the Galaxy interface Molds consume.
output_artifacts:
  - id: workflow-summary
    kind: json
    default_filename: summary.json
    description: One record per CWL step, with its inputs, outputs, and the tool it runs.
references:
  - kind: cli-command
    ref: "[[validate-summary-cwl]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: cast-validated
    trigger: Before emitting the summary, to check it against the schema.
---

# Summarize a CWL workflow

A minimal but complete Mold: one action, one declared output artifact, and one reference the
cast is told exactly when to read.
