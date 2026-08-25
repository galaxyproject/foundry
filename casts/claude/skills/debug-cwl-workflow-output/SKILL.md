---
name: debug-cwl-workflow-output
description: "Triage failing CWL run outputs; classify failure modes; propose fixes."
---

# debug-cwl-workflow-output

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Triage failing CWL run outputs; classify failure modes; propose fixes.

## Inputs

- Read artifact `workflow-test-result`. Produced by `run-workflow-test`. Structured run handoff from run-workflow-test: test result, run/job/artifact context, and the observed CWL failure modality.

## Outputs

- Write artifact `cwl-workflow-debug-report` as `cwl-workflow-debug-report.md`. Format: `markdown`. CWL failure-surface classification with captured run/job/output evidence and a recommended next step or reference-gap follow-up.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- None declared.

## Load On Demand

- None declared.

## Validation

- None declared.

## Procedure

Triage a failing CWL run: classify the failure mode from logs and outputs and propose a fix routed to the authoring step responsible for it.

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
