---
type: mold
name: cwl-test-to-galaxy-test-plan
axis: source-specific
source: cwl
tags:
  - mold
  - source/cwl
status: draft
created: 2026-04-30
revised: 2026-05-08
revision: 3
ai_generated: true
summary: "Translate CWL test fixtures into a Galaxy workflow test plan."
input_artifacts:
  - id: summary-cwl
    description: "Structured CWL summary from [[summarize-cwl]]; carries test fixtures, job inputs, expected outputs."
output_artifacts:
  - id: galaxy-test-plan
    kind: json
    default_filename: galaxy-workflow-test-plan.json
    schema: "[[galaxy-workflow-test-plan]]"
    description: "Schema-valid Galaxy workflow test plan derived from CWL test fixtures, job inputs, expected outputs, assertion evidence."
references:
  - kind: schema
    ref: "[[galaxy-workflow-test-plan]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Emit a schema-valid Galaxy workflow test-plan handoff for implement-galaxy-workflow-test."
related_notes:
  - "[[galaxy-workflow-test-plan]]"
---
# cwl-test-to-galaxy-test-plan

Translate CWL test fixtures, job inputs, expected outputs, and assertion evidence into a Galaxy workflow test plan. The output is a schema-valid [[galaxy-workflow-test-plan]] handoff, not a concrete `tests-format` file; [[implement-galaxy-workflow-test]] owns final YAML authoring and static validation.
