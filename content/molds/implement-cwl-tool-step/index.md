---
type: mold
name: implement-cwl-tool-step
axis: target-specific
target: cwl
tags:
  - mold
  - target/cwl
status: draft
created: 2026-04-30
revised: 2026-07-24
revision: 2
ai_generated: true
summary: "Convert an abstract step into a concrete CWL CommandLineTool + step."
loop_endstate: "No shared endstate oracle yet; iterate over the tools enumerated in the CWL template, doing each by hand."
input_artifacts:
  - id: cwl-tool-summary
    description: "Compact CWL tool summary from [[summarize-cwl-tool]]; binds the abstract step to a concrete CommandLineTool."
  - id: cwl-workflow-draft
    description: "CWL Workflow skeleton being filled in step by step; the step replaces a placeholder in this draft."
output_artifacts:
  - id: cwl-workflow-draft
    kind: yaml
    default_filename: cwl-workflow-draft.cwl
    description: "CWL Workflow skeleton with one more abstract step replaced by a concrete CommandLineTool step (loop iteration output)."
---
# implement-cwl-tool-step

Bind one abstract step to a concrete CWL CommandLineTool using its [[summarize-cwl-tool]] summary, replacing a single placeholder in the CWL workflow draft per loop iteration.
