---
type: mold
name: summarize-cwl-tool
axis: target-specific
target: cwl
tags:
  - mold
  - target/cwl
status: draft
created: 2026-04-30
revised: 2026-04-30
revision: 1
ai_generated: true
summary: "Derive a CommandLineTool description (container, baseCommand, IO) for a CWL target."
loop_endstate: "No shared endstate oracle yet; iterate over the tools enumerated in the CWL template, doing each by hand."
output_artifacts:
  - id: cwl-tool-summary
    kind: json
    default_filename: cwl-tool-summary.json
    description: "Compact CWL CommandLineTool summary: container, baseCommand, inputs, outputs, requirements, version metadata."
---
# summarize-cwl-tool

Stub. Replace with real Mold content per MOLD_SPEC once first walks are done.
