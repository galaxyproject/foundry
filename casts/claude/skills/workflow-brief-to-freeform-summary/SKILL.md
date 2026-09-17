---
name: workflow-brief-to-freeform-summary
description: "Check an unchanged Workflow Brief and project its approved intent into the existing freeform Galaxy design handoff."
---

# workflow-brief-to-freeform-summary

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Check an unchanged Workflow Brief and project its approved intent into the existing freeform Galaxy design handoff.

## Inputs

- Read artifact `workflow-brief`. Schema: workflow-brief-schema. Produced by `freeform-summary-to-workflow-brief`, `nextflow-summary-to-workflow-brief`. Expert-reviewed brief input; workflow and environment blockers must be clear before projection.
- Read artifact `freeform-summary`. Optional; absence is allowed and must be reported honestly. Produced by `interview-to-freeform-summary`, `summarize-paper`, `workflow-brief-to-freeform-summary`. Optional original narrative source evidence; selected brief scope controls what is carried forward.
- Read artifact `summary-nextflow`. Optional; absence is allowed and must be reported honestly. Schema: summary-nextflow. Produced by `summarize-nextflow`. Optional structured Nextflow source evidence linked by the brief; retain source pins and relevant evidence.
- Read artifact `open-requirements-ledger`. Optional; absence is allowed and must be reported honestly. Produced by `advance-galaxy-draft-step`, `apply-galaxy-workflow-changeset`, `compare-against-iwc-exemplar`, `cwl-summary-to-galaxy-data-flow`, `cwl-summary-to-galaxy-interface`, `cwl-summary-to-galaxy-template`, `freeform-summary-to-galaxy-data-flow`, `freeform-summary-to-galaxy-interface`, `freeform-summary-to-galaxy-template`, `implement-galaxy-tool-step`, `interview-to-galaxy-workflow-changeset`, `mature-galaxy-workflow-for-iwc`, `nextflow-summary-to-galaxy-data-flow`, `nextflow-summary-to-galaxy-interface`, `nextflow-summary-to-galaxy-reference-data`, `nextflow-summary-to-galaxy-template`, `repair-galaxy-draft-topology`, `workflow-brief-to-freeform-summary`. Optional existing run obligations; preserve entries and append findings or recommended brief changes.

## Outputs

- Write artifact `freeform-summary` as `freeform-summary.md`. Format: `markdown`. Derived scientific intent and selected source evidence for the existing freeform Galaxy design Molds; the brief remains unchanged.
- Write artifact `open-requirements-ledger` as `open-requirements.ledger.yml`. Format: `yaml`. Run obligations, evidence gaps, and recommended brief changes recorded separately from the input brief.

## Required Tools

- **`foundry`** (foundry). `npm install -g @galaxy-foundry/gxwf-foundry`.
  Ephemeral run: `npx --package @galaxy-foundry/gxwf-foundry foundry`.
  Check: `foundry --help`.
  Docs: https://github.com/galaxyproject/foundry/blob/main/packages/gxwf-foundry/README.md

## Load Upfront

- `references/notes/open-requirements-ledger.md`: Research note copied verbatim into the bundle. Initialize run obligations and record recommended brief changes without applying them.
- `references/notes/workflow-brief-design.md`: Research note copied verbatim into the bundle. Apply the brief boundaries: evidence and expert intent, no inferred Galaxy design, and separate workflow/environment blockers.
- `references/schemas/workflow-brief-schema.schema.json`: Schema file copied verbatim into the bundle. Carry the Markdown section declaration and its structural validator.

## Load On Demand

- `references/cli/check-workflow-brief.json`: CLI command reference packaged as a sidecar. Report declared blockers separately from structural validity. Use when: after structural validation and before reporting whether the brief is clear of declared blockers.
- `references/cli/validate-workflow-brief.json`: CLI command reference packaged as a sidecar. Validate the unchanged input brief before projection. Use when: after writing workflow-brief.md.

## Validation

- None declared.

## Procedure

Treat `workflow-brief.md` as an unchanged input. The harness must already have recorded expert review and performed current environment preflight. Run `foundry check-workflow-brief workflow-brief.md --json` before writing any derived design input. On structural failure, declared blockers, absent review, or failed preflight, stop and report the reason. Do not rewrite the brief to unblock the run.

### Project the selected intent

Read Workflow's objective, optional scope, requirements, and acceptance criteria, plus the supplied source evidence. Resolve references within the caller's workspace; report unavailable evidence rather than fabricating it. The brief's selected scope governs the projection. Source evidence can clarify the selected work but cannot broaden it.

Write the derived narrative to the run's `freeform-summary.md`, compatible with the existing freeform interface, data-flow, template, and test-plan skills. Keep provenance and explicit uncertainty. Separate scientific intent and expert-provided requirements from incidental source implementation. Do not turn Nextflow channels, processes, containers, or test snapshots into assumed Galaxy collection shapes, wrapper availability, or concrete tests.

Retain original evidence at a separate path before writing this derived summary. If the original input summary has the same path as the output, copy it to a source-evidence path first and retain that path in provenance. Never overwrite the brief or lose the original evidence.

### Record obligations outside the brief

Initialize or carry forward `open-requirements.ledger.yml`. Preserve existing entries and record missing evidence and recommended brief changes there. Do not mark a recommendation accepted or apply it to the brief. Design steps may choose Galaxy mappings within the approved scope; they must record unsupported obligations in the ledger rather than widening the brief.

Hand the derived summary and ledger to the existing design chain. Leave agent environment instructions in the brief for the harness to enforce, rather than converting them into scientific workflow steps. Confirm the brief's bytes remain unchanged before completing this step.

## Feedback Mode

- Feedback mode is off unless the caller explicitly enables `--feedback` or supplies a feedback-ledger path.
- When enabled, read `_feedback.md` before doing the work and use its registered `foundry-feedback.ledger.yml` protocol.
- Preserve harness-owned run and phase state. Append only concrete observations about a canonical Foundry source asset or a related project that this run showed to be at fault; do not put ordinary workflow requirements in this ledger.
- Before reporting completion, make one explicit pass over the work you just did. Do not ask yourself whether anything was unclear — recall what happened: where you guessed at something the instructions should have settled, needed information this bundle does not carry, hit an instruction that contradicted another or contradicted the artifacts in front of you, used a packaged reference that did not cover your case, or did something the procedure never describes.
- Append an entry for each such event that clears the protocol's bar. If none do, append nothing and report `no feedback` explicitly. Silence and a clean pass are not the same thing, and nothing downstream can tell them apart unless you say which one it was.
- Pass the same ledger path to any subagent used for this work, and merge updates serially so one writer cannot overwrite another.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
