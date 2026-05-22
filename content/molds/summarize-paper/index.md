---
type: mold
name: summarize-paper
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
summary: "Extract methods, tools, sample data, and references from a paper."
output_artifacts:
  - id: freeform-summary
    kind: markdown
    default_filename: freeform-summary.md
    description: "Methods, tools, sample data, references, and workflow intent extracted from a primary paper, normalized into the shared free-form source summary handoff."
---
# summarize-paper

Stub. Replace with real Mold content per MOLD_SPEC once first walks are done.

Emit the same `freeform-summary` artifact shape used by interview-derived sources so downstream freeform-summary Molds can operate on paper and interview starts without splitting the design/template tier.
