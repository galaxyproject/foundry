---
type: mold
name: nextflow-test-to-cwl-test-plan
axis: source-specific
source: nextflow
tags:
  - source/nextflow
  - target/cwl
status: draft
created: 2026-05-03
revised: 2026-05-03
revision: 1
ai_generated: true
summary: "Translate Nextflow test evidence into a CWL workflow test plan."
input_artifacts:
  - id: summary-nextflow
    description: "Structured Nextflow summary from [[summarize-nextflow]]; carries test_fixtures, nf_tests, snapshot evidence."
output_artifacts:
  - id: cwl-test-plan
    kind: markdown
    default_filename: cwl-test-plan.md
    description: "Reviewable CWL workflow test plan: job inputs, expected outputs, assertions, fixtures, rationale provenance."
related_notes:
  - "[[summary-nextflow]]"
references:
  - kind: schema
    ref: "[[summary-nextflow]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Read summarized nf-test profiles, snapshot fixtures, selected test data, params, and expected outputs."
---
# nextflow-test-to-cwl-test-plan

Translate Nextflow test evidence into a CWL workflow test plan. This preserves the `NEXTFLOW → CWL` pipeline after the Galaxy-specific test-plan split; concrete CWL test artifact assembly remains owned by [[implement-cwl-workflow-test]].
