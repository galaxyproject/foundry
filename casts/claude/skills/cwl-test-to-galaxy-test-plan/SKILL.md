---
name: cwl-test-to-galaxy-test-plan
description: "Translate CWL test fixtures into a Galaxy workflow test plan."
---

# cwl-test-to-galaxy-test-plan

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Translate CWL test fixtures into a Galaxy workflow test plan.

## Inputs

- Read artifact `summary-cwl`. Schema: summary-cwl. Produced by `summarize-cwl`. Structured CWL summary from summarize-cwl; lists discovered test cases, job-file paths, and expected-output references.

## Outputs

- Write artifact `galaxy-test-plan` as `galaxy-test-plan.yml`. Format: `yaml`. Schema: galaxy-workflow-test-plan. Reviewable Galaxy workflow test plan (see galaxy-workflow-test-plan) derived from CWL test fixtures, job inputs, expected outputs, and assertion evidence.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- `references/schemas/galaxy-workflow-test-plan.schema.json`: Schema file copied verbatim into the bundle. Output contract: the emitted plan conforms to galaxy-workflow-test-plan. Cast bundles the JSON Schema; validate with `foundry validate-galaxy-workflow-test-plan`.
- `references/schemas/summary-cwl.schema.json`: Schema file copied verbatim into the bundle. Read the CWL summary's test cases, job-file paths, expected-output references, and assertion evidence.

## Load On Demand

- `references/notes/galaxy-workflow-testability-design.md`: Research note copied verbatim into the bundle. Choose which workflow outputs and promoted checkpoints make meaningful assertions. Use when: deciding which outputs to assert and which labels the plan should bind to.
- `references/notes/iwc-shortcuts-anti-patterns.md`: Research note copied verbatim into the bundle. Distinguish accepted IWC-style test shortcuts from assertion smells while translating tests. Use when: deciding whether to use existence-only, size-only, image-dimension, or tolerant output checks.
- `references/notes/iwc-test-data-conventions.md`: Research note copied verbatim into the bundle. Emit Galaxy/IWC-style job input fixtures, remote locations, hashes, and collection input shapes. Use when: writing job inputs or deciding whether fixtures belong in test-data, Zenodo, ENA/SRA, or CVMFS.
- `references/notes/planemo-asserts-idioms.md`: Research note copied verbatim into the bundle. Describe Galaxy workflow-test assertion intent and tolerances for translated expected outputs. Use when: turning CWL expected outputs into Galaxy test-plan assertions.
- `references/notes/planemo-workflow-test-architecture.md`: Research note copied verbatim into the bundle. Keep the plan addressable by stable labels and artifacts Planemo can connect back to invocations, jobs, and outputs. Use when: recording the labels and checkpoints the downstream test must address.
- `references/schemas/tests-format.schema.json`: Schema file copied verbatim into the bundle. Use the Galaxy workflow tests schema as the assertion-family vocabulary when translating CWL test evidence into a Galaxy test plan. Use when: mapping expected outputs, tolerances, or fixture assertions into Galaxy workflow-test assertion intent.

## Validation

- Validate `galaxy-test-plan.yml` before returning it: run `foundry validate-galaxy-workflow-test-plan galaxy-test-plan.yml` from `@galaxy-foundry/gxwf-foundry`. If the command is not on PATH, run `npx --package @galaxy-foundry/gxwf-foundry foundry validate-galaxy-workflow-test-plan galaxy-test-plan.yml`. This checks artifact `galaxy-test-plan` against the galaxy-workflow-test-plan schema.

## Procedure

Turn the CWL summary's discovered test cases into a reviewable Galaxy test plan. Preserve each case's job-file and expected-output provenance so implement-galaxy-workflow-test can author the final test against the concrete Galaxy workflow. The plan records assertion intent and open mappings, not a `tests-format` test file.

For each `tests[]` case, open its `job_path` when available. Map the declared CWL input values onto the Galaxy inputs the summary and translation imply. Keep `File` locations, `Directory` contents, `secondaryFiles`, arrays, and collection element identifiers visible where they affect the fixture or its Galaxy shape. Record the source path or URL and any known checksum. If a job file is missing or an input cannot be mapped, leave the fixture or label unresolved with a reason. A `job_path` in the summary is a pointer to inputs, not the inputs themselves.

Translate each recorded expected output into a Galaxy output to check. Use the CWL output id and any supplied path, URL, checksum, or assertion as evidence for an appropriate `tests-format` assertion family. Record what the assertion should establish, its expected value and tolerance when supported, and the source of that expectation. Do not infer a passing value from an output name or turn a checksum into a Galaxy assertion without confirming that the translated output can be compared that way. For collections and sidecars, identify the element or file that the check actually addresses.

Bind input and output labels to a concrete Galaxy draft only if one is available to inspect. Otherwise mark inferred labels as assumed or unresolved, set `workflow.label_source` accordingly, and record the mapping that implement-galaxy-workflow-test must confirm. Set `source.derived_from: test-evidence` for a plan based on discovered CWL tests, and `evidence: test-evidence` only for assertions supported by those tests. If a useful Galaxy check must instead be inferred from workflow intent, mark that assertion `evidence: intent` and explain its lower confidence.

Record unavailable fixtures, expression-dependent shapes, untranslatable assertions, and missing label or datatype mappings in `unresolved[]` or `warnings[]` as appropriate. Put outputs deliberately left unasserted in `omissions[]` with a reason. If the summary has no usable test case, report that coverage gap rather than presenting a fabricated case as translated evidence. Validate the emitted `galaxy-test-plan.yml` with `foundry validate-galaxy-workflow-test-plan` before handing it to implement-galaxy-workflow-test.

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
