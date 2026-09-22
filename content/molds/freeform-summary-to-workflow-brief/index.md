---
type: mold
name: freeform-summary-to-workflow-brief
axis: source-specific
source: freeform
tags:
  - source/freeform
status: draft
created: '2026-09-17'
revised: '2026-09-17'
revision: 1
summary: Turn a freeform source summary and selected scope into a Workflow Brief without Galaxy design
  assumptions.
input_artifacts:
  - id: freeform-summary
    description: Source evidence supplied by the preceding summarizer; preserve uncertainty and the caller’s
      selected scope.
output_artifacts:
  - id: workflow-brief
    kind: markdown
    default_filename: workflow-brief.md
    schema: '[[workflow-brief-schema]]'
    description: Expert-editable workflow intent and agent environment, with optional details and explicit
      workflow or environment blockers.
references:
  - kind: schema
    ref: '[[workflow-brief-schema]]'
    used_at: both
    load: upfront
    mode: verbatim
    evidence: cast-validated
    purpose: Carry the Markdown section declaration and its structural validator.
  - kind: research
    ref: '[[workflow-brief-design]]'
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: 'Apply the brief boundaries: evidence and expert intent, no inferred Galaxy design, and separate
      workflow/environment blockers.'
    verification: Check the committed fixtures and review a worked run for faithful evidence and unchanged
      brief input.
  - kind: cli-command
    ref: '[[validate-workflow-brief]]'
    used_at: runtime
    load: on-demand
    mode: sidecar
    evidence: hypothesis
    purpose: Validate the emitted brief before returning it.
    verification: Check the committed fixtures and review a worked run for faithful evidence and unchanged
      brief input.
    trigger: After writing workflow-brief.md.
  - kind: cli-command
    ref: '[[check-workflow-brief]]'
    used_at: runtime
    load: on-demand
    mode: sidecar
    evidence: hypothesis
    purpose: Report declared blockers separately from structural validity.
    verification: Check the committed fixtures and review a worked run for faithful evidence and unchanged
      brief input.
    trigger: After structural validation and before reporting whether the brief is clear of declared blockers.
---

# freeform-summary-to-workflow-brief

Read the narrative or interview-derived `freeform-summary` and emit a Workflow Brief for expert review.

## Evidence and scope

Read the source summary and the caller's stated objective and selection. Identify which scientific work is included and excluded; do not copy every source analysis into scope. If the selection is too ambiguous to proceed, state that uncertainty explicitly in Workflow/Blockers rather than choosing an analysis for the expert.

Write `workflow-brief.md` with `## Workflow`, `### Objective`, and `## Agent Environment`. Add optional subsections only when evidence or expert intent supports them. Identify the source and caller instructions, distinguish source facts from expert requirements, and keep scientific inputs, outputs, and acceptance criteria high-level. Missing optional detail does not require filler sections.

The writing agent must not infer Galaxy datatypes, collections, interface labels, available tools, or wrapper versions. It must not write step graphs, concrete tool states, or final test declarations. Named source tools and formats are evidence, not Galaxy choices. Explicit expert-provided Galaxy requirements may be recorded with attribution.

## Agent environment

Use supplied environment evidence or harmless availability/version probes to describe expected `gxwf`, `foundry`, and `planemo` tooling, agent constraints, container preferences, and Docker/Singularity/Apptainer usability. Distinguish requested requirements, observed facts, and unknowns. Do not claim a container engine works based only on an executable being on PATH. Do not install tools or change the environment as part of brief production.

Place known issues preventing work in `### Blockers` under the appropriate parent. Put nonblocking questions in Workflow/Open questions. Omit or leave Blockers empty when there are none; any text there, including “none”, is blocking.

## Validate and hand off

Run `foundry validate-workflow-brief workflow-brief.md`. Fix structural failures without inventing scientific intent. Run `foundry check-workflow-brief workflow-brief.md --json` and retain its result in the run report. Exit `4` means a valid but blocked brief: return that brief and its blockers for expert/environment resolution. Do not suppress the blockers to obtain a clear check.

Return the brief for expert editing and review. Producing a brief does not authorize Galaxy design or implementation, and a clear static check does not replace review or environment preflight. Keep source evidence available to the later consumer.
