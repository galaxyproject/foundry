---
type: mold
name: implement-cwl-workflow-test
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
summary: "Assemble CWL job file(s) and expected-output assertions."
input_artifacts:
  - id: cwl-test-plan
    description: "Reviewable CWL test plan from [[nextflow-test-to-cwl-test-plan]] (or future CWL test-plan producers); job, fixture, assertion provenance."
  - id: cwl-workflow-draft
    description: "CWL Workflow being tested; provides input/output ports and shapes the job + assertions must match."
output_artifacts:
  - id: cwl-workflow-test
    kind: yaml
    default_filename: cwl-job.yml
    description: "CWL job file(s) with inputs and expected-output assertions for the implemented workflow."
---
# implement-cwl-workflow-test

Assemble the CWL job file(s) and expected-output assertions for the drafted workflow from its reviewed [[nextflow-test-to-cwl-test-plan]] test plan and the workflow's input/output ports.
