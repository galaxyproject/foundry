---
type: mold
name: debug-cwl-workflow-output
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
summary: "Triage failing CWL run outputs; classify failure modes; propose fixes."
input_artifacts:
  - id: workflow-test-result
    description: "Structured run handoff from [[run-workflow-test]]: test result, run/job/artifact context, and the observed CWL failure modality."
output_artifacts:
  - id: cwl-workflow-debug-report
    kind: markdown
    default_filename: cwl-workflow-debug-report.md
    description: "CWL failure-surface classification with captured run/job/output evidence and a recommended next step or reference-gap follow-up."
---
# debug-cwl-workflow-output

Triage a failing CWL run: classify the failure mode from logs and outputs and propose a fix routed to the authoring step responsible for it.
