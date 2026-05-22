---
type: mold
name: interview-to-freeform-summary
axis: source-specific
source: interview
tags:
  - mold
  - source/interview
status: draft
created: 2026-05-22
revised: 2026-05-22
revision: 1
ai_generated: true
summary: "Normalize a free-form user interview into the shared freeform-summary workflow handoff."
output_artifacts:
  - id: freeform-summary
    kind: markdown
    default_filename: freeform-summary.md
    description: "Methods, tools, sample data, references, constraints, open questions, and workflow intent gathered from a user interview."
---
# interview-to-freeform-summary

Turn a free-form user interview into the shared `freeform-summary` artifact consumed by downstream freeform-summary Molds.

The harness owns the live interaction style. It may run this Mold inside an interactive Claude/Codex session, feed it a saved transcript, or collect answers through a custom UI. The Mold's job is the normalized handoff: methods, tools or algorithms, inputs, outputs, parameters, data availability, expected outputs, constraints, confidence, and open questions.

Emit Markdown, not a target workflow schema. Downstream Molds treat this the same way they treat the output of [[summarize-paper]]: useful source evidence with explicit uncertainty, not a fully specified workflow.
