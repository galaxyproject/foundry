---
type: mold
name: freeform-summary-to-galaxy-design
axis: source-specific
source: freeform
target: galaxy
tags:
  - mold
  - source/freeform
  - target/galaxy
status: draft
created: 2026-05-05
revised: 2026-05-05
revision: 1
ai_generated: true
summary: "Translate a free-form source summary into a Galaxy workflow design brief."
input_artifacts:
  - id: freeform-summary
    description: "Free-form source summary emitted by [[summarize-paper]] or [[interview-to-freeform-summary]]; methods, tools, sample data, references, and workflow intent."
output_artifacts:
  - id: freeform-galaxy-design
    kind: markdown
    default_filename: freeform-galaxy-design.md
    description: "Combined Galaxy interface + data-flow design brief; a single reviewable handoff for free-form sources until examples justify a split."
references:
  - kind: research
    ref: "[[galaxy-data-flow-draft-contract]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: hypothesis
    purpose: "Use the same Galaxy design-brief boundary without forcing free-form source evidence into a rigid workflow schema."
    trigger: "When the free-form summary has enough workflow structure to draft Galaxy interface and data-flow decisions."
    verification: "Promote after two worked freeform-to-Galaxy translations show the combined design brief is enough context for template generation."
related_notes:
  - "[[freeform-summary-to-galaxy-template]]"
---
# freeform-summary-to-galaxy-design

Read a free-form source summary and emit a reviewable Markdown Galaxy workflow design brief. Combine interface choices and abstract data-flow choices until free-form examples justify a cleaner split.

The output is not gxformat2 and not a rich workflow schema. [[freeform-summary-to-galaxy-template]] turns this brief and the free-form summary into a skeleton.
