---
name: nextflow-test-to-cwl-test-plan
description: "Translate Nextflow test evidence into a CWL workflow test plan."
---

# nextflow-test-to-cwl-test-plan

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Translate Nextflow test evidence into a CWL workflow test plan.

## Inputs

- Read artifact `summary-nextflow`. Schema: summary-nextflow. Produced by `summarize-nextflow`. Structured Nextflow summary from summarize-nextflow; carries test_fixtures, nf_tests, snapshot evidence.

## Outputs

- Write artifact `cwl-test-plan` as `cwl-test-plan.md`. Format: `markdown`. Reviewable CWL workflow test plan: job inputs, expected outputs, assertions, fixtures, rationale provenance.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- `references/schemas/summary-nextflow.schema.json`: Schema file copied verbatim into the bundle. Read summarized nf-test profiles, snapshot fixtures, selected test data, params, and expected outputs.

## Load On Demand

- None declared.

## Validation

- None declared.

## Procedure

Translate Nextflow test evidence into a CWL workflow test plan. This preserves the `NEXTFLOW → CWL` pipeline after the Galaxy-specific test-plan split; concrete CWL test artifact assembly remains owned by implement-cwl-workflow-test.

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
