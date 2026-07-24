---
type: mold
name: nextflow-summary-to-cwl-interface
axis: source-specific
source: nextflow
target: cwl
tags:
  - source/nextflow
  - target/cwl
status: draft
created: 2026-05-05
revised: 2026-05-05
revision: 1
ai_generated: true
summary: "Map a Nextflow summary into a CWL Workflow interface design brief."
input_artifacts:
  - id: summary-nextflow
    description: "Structured Nextflow pipeline summary emitted by [[summarize-nextflow]]; the source-of-truth JSON for CWL interface choices."
output_artifacts:
  - id: nextflow-cwl-interface
    kind: markdown
    default_filename: nextflow-cwl-interface.md
    description: "Reviewable Markdown brief: CWL Workflow inputs, outputs, labels, array/record/File shapes, checkpoint outputs, source provenance."
references:
  - kind: schema
    ref: "[[summary-nextflow]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Read source-level channel, parameter, process, and test-fixture evidence before choosing CWL Workflow inputs and outputs."
related_notes:
  - "[[summary-nextflow]]"
---
# nextflow-summary-to-cwl-interface

Read a Nextflow summary and emit a reviewable Markdown interface brief for a CWL Workflow. Capture workflow inputs, workflow outputs, labels, array/record/File shapes, checkpoint outputs worth exposing for tests, source-summary provenance, confidence, and open questions.

The output is a design handoff consumed by [[nextflow-summary-to-cwl-data-flow]], [[summary-to-cwl-template]], and later test-plan work.
