---
type: mold
name: workflow-brief-to-freeform-summary
axis: generic
tags:
  - target/galaxy
status: draft
created: '2026-09-17'
revised: '2026-09-17'
revision: 1
summary: Check an unchanged Workflow Brief and project its approved intent into the existing freeform
  Galaxy design handoff.
input_artifacts:
  - id: workflow-brief
    description: Expert-reviewed brief input; workflow and environment blockers must be clear before projection.
  - id: freeform-summary
    role: source-evidence
    optional: true
    description: Optional original narrative source evidence; selected brief scope controls what is carried
      forward.
  - id: summary-nextflow
    role: source-evidence
    optional: true
    description: Optional structured Nextflow source evidence linked by the brief; retain source pins
      and relevant evidence.
  - id: open-requirements-ledger
    optional: true
    description: Optional existing run obligations; preserve entries and append findings or recommended
      brief changes.
output_artifacts:
  - id: freeform-summary
    kind: markdown
    default_filename: freeform-summary.md
    description: Derived scientific intent and selected source evidence for the existing freeform Galaxy
      design Molds; the brief remains unchanged.
  - id: open-requirements-ledger
    kind: yaml
    default_filename: open-requirements.ledger.yml
    description: Run obligations, evidence gaps, and recommended brief changes recorded separately from
      the input brief.
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
    purpose: Validate the unchanged input brief before projection.
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
  - kind: research
    ref: '[[open-requirements-ledger]]'
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: Initialize run obligations and record recommended brief changes without applying them.
    verification: Check the committed fixtures and review a worked run for faithful evidence and unchanged
      brief input.
---

# workflow-brief-to-freeform-summary

Treat `workflow-brief.md` as an unchanged input. The harness must already have recorded expert review and performed current environment preflight. Run `foundry check-workflow-brief workflow-brief.md --json` before writing any derived design input. On structural failure, declared blockers, absent review, or failed preflight, stop and report the reason. Do not rewrite the brief to unblock the run.

## Project the selected intent

Read Workflow's objective, optional scope, requirements, and acceptance criteria, plus the supplied source evidence. Resolve references within the caller's workspace; report unavailable evidence rather than fabricating it. The brief's selected scope governs the projection. Source evidence can clarify the selected work but cannot broaden it.

Write the derived narrative to the run's `freeform-summary.md`, compatible with the existing freeform interface, data-flow, template, and test-plan Molds. Keep provenance and explicit uncertainty. Separate scientific intent and expert-provided requirements from incidental source implementation. Do not turn Nextflow channels, processes, containers, or test snapshots into assumed Galaxy collection shapes, wrapper availability, or concrete tests.

Retain original evidence at a separate path before writing this derived summary. If the original input summary has the same path as the output, copy it to a source-evidence path first and retain that path in provenance. Never overwrite the brief or lose the original evidence.

## Record obligations outside the brief

Initialize or carry forward `open-requirements.ledger.yml`. Preserve existing entries and record missing evidence and recommended brief changes there. Do not mark a recommendation accepted or apply it to the brief. Design steps may choose Galaxy mappings within the approved scope; they must record unsupported obligations in the ledger rather than widening the brief.

Hand the derived summary and ledger to the existing design chain. Leave agent environment instructions in the brief for the harness to enforce, rather than converting them into scientific workflow steps. Confirm the brief's bytes remain unchanged before completing this step.
