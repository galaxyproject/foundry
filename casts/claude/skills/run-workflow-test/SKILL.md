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

- None declared.

## Required Tools

- **`gxwf`** (gxwf). `npm install -g @galaxy-tool-util/cli`.
  Ephemeral run: `npx --package @galaxy-tool-util/cli gxwf`.
  Check: `gxwf --version`.
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

Stub. Replace with real skill content per MOLD_SPEC once first walks are done.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
