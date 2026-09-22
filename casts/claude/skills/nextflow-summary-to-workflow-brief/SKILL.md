---
name: nextflow-summary-to-workflow-brief
description: "Turn a nextflow source summary and selected scope into a Workflow Brief without Galaxy design assumptions."
---

# nextflow-summary-to-workflow-brief

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Turn a nextflow source summary and selected scope into a Workflow Brief without Galaxy design assumptions.

## Inputs

- Read artifact `summary-nextflow`. Schema: summary-nextflow. Produced by `summarize-nextflow`. Source evidence supplied by the preceding summarizer; preserve uncertainty and the caller’s selected scope.

## Outputs

- Write artifact `workflow-brief` as `workflow-brief.md`. Format: `markdown`. Schema: workflow-brief-schema. Expert-editable workflow intent and agent environment, with optional details and explicit workflow or environment blockers.

## Required Tools

- **`foundry`** (foundry). `npm install -g @galaxy-foundry/gxwf-foundry`.
  Ephemeral run: `npx --package @galaxy-foundry/gxwf-foundry foundry`.
  Check: `foundry --help`.
  Docs: https://github.com/galaxyproject/foundry/blob/main/packages/gxwf-foundry/README.md

## Load Upfront

- `references/notes/workflow-brief-design.md`: Research note copied verbatim into the bundle. Apply the brief boundaries: evidence and expert intent, no inferred Galaxy design, and separate workflow/environment blockers.
- `references/schemas/summary-nextflow.schema.json`: Schema file copied verbatim into the bundle. Read and validate the structured source evidence without turning its processes or containers into Galaxy choices.
- `references/schemas/workflow-brief-schema.schema.json`: Schema file copied verbatim into the bundle. Carry the Markdown section declaration and its structural validator.

## Load On Demand

- `references/cli/check-workflow-brief.json`: CLI command reference packaged as a sidecar. Report declared blockers separately from structural validity. Use when: after structural validation and before reporting whether the brief is clear of declared blockers.
- `references/cli/validate-workflow-brief.json`: CLI command reference packaged as a sidecar. Validate the emitted brief before returning it. Use when: after writing workflow-brief.md.

## Validation

- Validate `workflow-brief.md` before returning it: run `foundry validate-workflow-brief workflow-brief.md` from `@galaxy-foundry/gxwf-foundry`. If the command is not on PATH, run `npx --package @galaxy-foundry/gxwf-foundry foundry validate-workflow-brief workflow-brief.md`. This checks artifact `workflow-brief` against the workflow-brief-schema schema.

## Procedure

Read the structured `summary-nextflow` and the caller’s selected scientific scope, then emit a Workflow Brief for expert review.

Record the selected analyses and source pin. Keep process topology, source container references, parameter evidence, reference assets, and test candidates in the linked source summary. A Nextflow process is not evidence of an available Galaxy wrapper or of a required Galaxy step.

### Evidence and scope

Read the source summary and the caller's stated objective and selection. Identify which scientific work is included and excluded; do not copy every source analysis into scope. If the selection is too ambiguous to proceed, state that uncertainty explicitly in Workflow/Blockers rather than choosing an analysis for the expert.

Write `workflow-brief.md` with `## Workflow`, `### Objective`, and `## Agent Environment`. Add optional subsections only when evidence or expert intent supports them. Identify the source and caller instructions, distinguish source facts from expert requirements, and keep scientific inputs, outputs, and acceptance criteria high-level. Missing optional detail does not require filler sections.

The writing agent must not infer Galaxy datatypes, collections, interface labels, available tools, or wrapper versions. It must not write step graphs, concrete tool states, or final test declarations. Named source tools and formats are evidence, not Galaxy choices. Explicit expert-provided Galaxy requirements may be recorded with attribution.

### Agent environment

Use supplied environment evidence or harmless availability/version probes to describe expected `gxwf`, `foundry`, and `planemo` tooling, agent constraints, container preferences, and Docker/Singularity/Apptainer usability. Distinguish requested requirements, observed facts, and unknowns. Do not claim a container engine works based only on an executable being on PATH. Do not install tools or change the environment as part of brief production.

Place known issues preventing work in `### Blockers` under the appropriate parent. Put nonblocking questions in Workflow/Open questions. Omit or leave Blockers empty when there are none; any text there, including “none”, is blocking.

### Validate and hand off

Run `foundry validate-workflow-brief workflow-brief.md`. Fix structural failures without inventing scientific intent. Run `foundry check-workflow-brief workflow-brief.md --json` and retain its result in the run report. Exit `4` means a valid but blocked brief: return that brief and its blockers for expert/environment resolution. Do not suppress the blockers to obtain a clear check.

Return the brief for expert editing and review. Producing a brief does not authorize Galaxy design or implementation, and a clear static check does not replace review or environment preflight. Keep source evidence available to the later consumer.

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
