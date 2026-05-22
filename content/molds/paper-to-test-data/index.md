---
type: mold
name: paper-to-test-data
axis: source-specific
source: paper
tags:
  - mold
  - source/paper
status: draft
created: 2026-04-30
revised: 2026-04-30
revision: 1
ai_generated: true
summary: "Derive workflow test inputs and expected outputs from a paper."
input_artifacts:
  - id: freeform-summary
    description: "Free-form summary from [[summarize-paper]]; sample data and reference evidence the test fixtures derive from."
output_artifacts:
  - id: test-data-refs
    kind: json
    default_filename: test-data-refs.json
    description: "Resolved workflow test inputs and expected outputs derived from paper evidence (URLs, file shapes, expected hashes)."
---
# paper-to-test-data

Stub. Replace with real Mold content per MOLD_SPEC once first walks are done.
