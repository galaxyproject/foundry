---
type: mold
name: validate-cwl
axis: target-specific
target: cwl
tags:
  - mold
  - target/cwl
status: draft
created: 2026-04-30
revised: 2026-07-24
revision: 3
ai_generated: true
summary: "Run cwltool --validate / schema lint, classify failures, recommend fixes."
loop_endstate: "No shared endstate oracle yet; iterate over the tools enumerated in the CWL template, doing each by hand."
input_artifacts:
  - id: cwl-workflow-draft
    description: "Assembled CWL Workflow to validate — the `cwl-workflow-draft.cwl` from [[implement-cwl-tool-step]] (`class: Workflow`); the build result `cwltool --validate` and schema lint run against."
---
# validate-cwl

Run `cwltool --validate` and schema lint over the assembled CWL workflow, classify each diagnostic, and recommend a concrete fix — routing failures back to the authoring step that owns them.
