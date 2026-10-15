---
name: paper-to-test-data
description: "Resolve the test data a paper names into refs for each workflow input."
---

# paper-to-test-data

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Resolve the test data a paper names into refs for each workflow input.

## Inputs

- Read artifact `freeform-summary`. Produced by `interview-to-freeform-summary`, `summarize-paper`. Free-form summary from summarize-paper; sample data and reference evidence the test fixtures derive from.
- Read artifact `freeform-galaxy-interface`. Produced by `freeform-summary-to-galaxy-interface`. Galaxy interface brief from freeform-summary-to-galaxy-interface pinning the workflow input labels, collection shapes, and datatypes each ref must map onto.

## Outputs

- Write artifact `test-data-refs` as `test-data-refs.json`. Format: `json`. Schema: test-data-refs. Test data the paper names, one ref per workflow input (URLs, shapes, hashes). Shared id with find-test-data, which fills only the inputs this Mold leaves unresolved.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- `references/schemas/test-data-refs.schema.json`: Schema file copied verbatim into the bundle. Output contract: one ref per workflow input, resolved or an honest gap with a reason. Cast bundles the JSON Schema; validate with `foundry validate-test-data-refs` before returning.

## Load On Demand

- None declared.

## Validation

- Validate `test-data-refs.json` before returning it: run `foundry validate-test-data-refs test-data-refs.json` from `@galaxy-foundry/gxwf-foundry`. If the command is not on PATH, run `npx --package @galaxy-foundry/gxwf-foundry foundry validate-test-data-refs test-data-refs.json`. This checks artifact `test-data-refs` against the test-data-refs schema.

## Procedure

Read the paper free-form summary from summarize-paper and resolve the data the paper names (resolvable URLs, file shapes, expected hashes) onto the workflow inputs the interface brief declares, as `test-data-refs` with `resolved_by: paper-to-test-data`. An input the paper names no data for stays `resolved: false` with a reason, for find-test-data to search. Expected outputs are the test plan's to derive, not this skill's. Validate the file with `foundry validate-test-data-refs` before returning.

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
