---
type: mold
name: summary-to-cwl-template
axis: target-specific
target: cwl
tags:
  - mold
  - target/cwl
status: draft
created: 2026-04-30
revised: 2026-05-05
revision: 2
ai_generated: true
summary: "CWL Workflow skeleton with per-step TODOs from source and design handoffs."
# input_artifacts intentionally omitted: this Mold is target-specific and reads
# different upstream summaries/design briefs depending on the source pipeline
# (Nextflow vs paper). Heterogeneous inputs aren't expressible without
# polymorphism; the harness binds them per-pipeline.
output_artifacts:
  - id: cwl-workflow-draft
    kind: yaml
    default_filename: cwl-workflow-draft.cwl
    description: "CWL Workflow skeleton: inputs, outputs, placeholder steps, rough connections, TODO slots for later implementation Molds."
related_notes:
  - "[[nextflow-summary-to-cwl-interface]]"
  - "[[nextflow-summary-to-cwl-data-flow]]"
  - "[[freeform-summary-to-cwl-design]]"
---
# summary-to-cwl-template

Read the original source artifact, the source summary, and all prior source-target design handoffs from the pipeline run. Emit a CWL Workflow skeleton with inputs, outputs, placeholder steps, rough connections, and TODO slots for later implementation Molds.

The interface and data-flow briefs guide the skeleton, but they do not replace source evidence. Treat the prior-step index as the working context: source summary, interface brief, data-flow brief or freeform design brief, and any open questions carried forward.
