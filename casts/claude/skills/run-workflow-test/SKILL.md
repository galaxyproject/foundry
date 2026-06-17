---
name: run-workflow-test
description: "Execute a workflow's tests via Planemo; emit structured pass/fail and outputs."
---

# run-workflow-test

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Execute a workflow's tests via Planemo; emit structured pass/fail and outputs.

## Inputs

- No upstream artifact inputs declared. See the procedure for user-supplied runtime inputs.

## Outputs

- Write artifact `workflow-test-result` as `workflow-test-result.json`. Format: `json`. Structured pass/fail plus captured evidence — Planemo result, invocation/history/workflow ids, artifact paths, Galaxy mode, and (on failure) the observed modality and next reference surface — for debug-galaxy-workflow-output.

## Required Tools

- **`gxwf`** (gxwf). `npm install -g @galaxy-tool-util/cli@1.7.2`.
  Ephemeral run: `npx --yes --package @galaxy-tool-util/cli@1.7.2 gxwf`.
  Check: `gxwf --help | grep -q draft-validate`.
  Docs: https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli
- **`planemo`** (planemo). `uv tool install planemo==git+https://github.com/jmchilton/planemo@a9b8b8bc7ab3b12035d53bdb5383fe450413d9f3` (or `pip install planemo==git+https://github.com/jmchilton/planemo@a9b8b8bc7ab3b12035d53bdb5383fe450413d9f3`).
  Ephemeral run: `uvx --from git+https://github.com/jmchilton/planemo@a9b8b8bc7ab3b12035d53bdb5383fe450413d9f3 planemo`.
  Check: `planemo --version`.
  Docs: https://planemo.readthedocs.io/
  Bundled reference: `references/cli/planemo.md`.

## Load Upfront

- `references/cli/planemo.md`: CLI tool reference copied verbatim into the bundle. Runtime that executes the Galaxy or CWL workflow test; install before driving the harness.
- `references/schemas/tests-format.schema.json`: Schema file copied verbatim into the bundle. Validate Galaxy workflow test files before starting a Planemo or Galaxy-backed execution.

## Load On Demand

- `references/cli/validate-tests.json`: CLI command reference packaged as a sidecar. Run static schema and workflow-label checks before expensive workflow execution. Use when: before invoking Planemo when a Galaxy workflow test file is present.
- `references/notes/galaxy-workflow-invocation-failure-reference.md`: Research note copied verbatim into the bundle. Preserve invocation identifiers and state summaries needed to inspect workflow-level runtime failures after Planemo returns. Use when: planemo reports a failed, cancelled, missing-output, or ambiguous workflow invocation result.
- `references/notes/planemo-asserts-idioms.md`: Research note copied verbatim into the bundle. Interpret assertion failures and choose the right fast inner-loop command before full reruns. Use when: a workflow test file exists and the task is to run, iterate, or classify its test assertions.
- `references/notes/planemo-workflow-test-architecture.md`: Research note copied verbatim into the bundle. Run workflow tests while preserving Planemo structured artifacts, Galaxy mode, invocation id, history id, and API follow-up context. Use when: choosing between managed Galaxy, external Galaxy, full test runs, existing invocation checks, or direct workflow runs.

## Validation

- None declared.

## Procedure

Execute an assembled workflow's test file via planemo and emit a structured pass/fail with the artifacts a debug pass needs. One invocation runs the test once, captures the evidence, and — on failure — classifies the failure modality and names the next reference surface to inspect. It does not repair anything; that is debug-galaxy-workflow-output's job.

### Sequence

1. **Validate before running.** When a test file is present, run validate-tests for the static schema and workflow-label checks first. A run is expensive; do not spend one on a test file that fails static validation.
2. **Pick the Galaxy mode.** Run against a Planemo-managed Galaxy or an existing/external Galaxy. Record which mode was used, how tools, workflows, and test data were staged, and the URLs or API credentials a follow-up inspection would need. The choice and its consequences are guided by planemo-workflow-test-architecture.
3. **Run and capture.** Drive `planemo test` with structured output enabled. Preserve the invocation id, history id, workflow id, the Planemo structured result, and any test-output artifact paths — these are the inputs the debug skill consumes.
4. **Classify on failure.** When the run exits non-zero or reports failed assertions, failed jobs, a failed invocation, missing outputs, or upload/staging problems, identify the observed failure modality and the single next reference surface to open: Planemo result, Galaxy job API, Galaxy invocation API, history contents, or the test assertion report. Use planemo-asserts-idioms to read assertion failures and galaxy-workflow-invocation-failure-reference to preserve invocation identifiers and state.
5. **Hand off.** Emit the structured summary — green, or red with modality + captured artifacts + the named next surface — for debug-galaxy-workflow-output.

Keep this skill's output a faithful record of what happened, not a diagnosis. Mislabeling a staging failure as an assertion failure here sends the debug pass to the wrong reference surface.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
