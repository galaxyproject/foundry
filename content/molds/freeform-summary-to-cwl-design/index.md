---
type: mold
name: freeform-summary-to-cwl-design
axis: source-specific
source: freeform
target: cwl
tags:
  - mold
  - source/freeform
  - target/cwl
status: draft
created: 2026-05-05
revised: 2026-05-05
revision: 1
ai_generated: true
summary: "Translate a free-form source summary into a CWL workflow design brief."
input_artifacts:
  - id: freeform-summary
    description: "Free-form source summary emitted by [[summarize-paper]] or [[interview-to-freeform-summary]]; methods, tools, sample data, references, and workflow intent."
output_artifacts:
  - id: freeform-cwl-design
    kind: markdown
    default_filename: freeform-cwl-design.md
    description: "Combined CWL interface + data-flow design brief; a single reviewable handoff for free-form sources until examples justify a split."
related_notes:
  - "[[summary-to-cwl-template]]"
---
# freeform-summary-to-cwl-design

Read a free-form source summary and emit a reviewable Markdown CWL workflow design brief. Combine interface choices and abstract data-flow choices until free-form source examples justify a cleaner split.

The output is not a concrete CWL Workflow. [[summary-to-cwl-template]] turns this brief and the free-form summary into a skeleton.
