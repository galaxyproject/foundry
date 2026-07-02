---
name: interview-to-freeform-summary
description: "Normalize a free-form user interview into the shared freeform-summary workflow handoff."
---

# interview-to-freeform-summary

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Normalize a free-form user interview into the shared freeform-summary workflow handoff.

## Inputs

- No upstream artifact inputs declared. See the procedure for user-supplied runtime inputs.

## Outputs

- Write artifact `freeform-summary` as `freeform-summary.md`. Format: `markdown`. Methods, tools, sample data, references, constraints, open questions, and workflow intent gathered from a user interview.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- None declared.

## Load On Demand

- None declared.

## Validation

- None declared.

## Procedure

Turn a free-form user interview into the shared `freeform-summary` artifact consumed by downstream freeform-summary skills.

The harness owns the live interaction style. It may run this skill inside an interactive Claude/Codex session, feed it a saved transcript, or collect answers through a custom UI. The skill's job is the normalized handoff, not the conversation.

Emit Markdown, not a target workflow schema. Downstream skills treat this exactly like the output of summarize-paper: useful source evidence with explicit uncertainty, not a fully specified workflow. Keeping the two producers shape-compatible is what lets paper and interview starts share one design/template tier.

### What to capture

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

### Don't over-specify

A free-form source carries genuine uncertainty; preserve it. Do not promote a vague answer ("some kind of alignment") into a precise tool or parameter — record it as intent plus an open question. Silent invention here propagates as false confidence through every downstream brief.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
