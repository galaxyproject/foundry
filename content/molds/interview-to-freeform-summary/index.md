---
type: mold
name: interview-to-freeform-summary
axis: source-specific
source: interview
tags:
  - source/interview
status: reviewed
created: 2026-05-22
revised: 2026-07-24
revision: 3
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

The harness owns the live interaction style. It may run this Mold inside an interactive Claude/Codex session, feed it a saved transcript, or collect answers through a custom UI. The Mold's job is the normalized handoff, not the conversation.

Emit Markdown, not a target workflow schema. Downstream Molds treat this exactly like the output of [[summarize-paper]]: useful source evidence with explicit uncertainty, not a fully specified workflow. Keeping the two producers shape-compatible is what lets paper and interview starts share one design/template tier.

## What to capture

Record what the interview actually supports, and mark the rest as uncertain rather than inventing it:

- **Workflow intent** — what the user is trying to build, in their words.
- **Methods / algorithms** — the analytical steps, ordered as the user describes them.
- **Tools** — named tools or versions if given; otherwise the operation to be resolved downstream.
- **Inputs** — sample data, formats, per-sample structure, paired/grouped shape.
- **Outputs** — expected results and which ones matter for review or testing.
- **Parameters** — any non-default settings the user calls out.
- **Data availability** — whether real or test data exists, and where.
- **Constraints** — runtime, environment, licensing, or scale limits.
- **Confidence and open questions** — where the user was unsure, and what still needs answering.

## Don't over-specify

A free-form source carries genuine uncertainty; preserve it. Do not promote a vague answer ("some kind of alignment") into a precise tool or parameter — record it as intent plus an open question. Silent invention here propagates as false confidence through every downstream brief.
