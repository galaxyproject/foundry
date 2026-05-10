---
name: implement-galaxy-workflow-test
description: "Assemble Galaxy workflow test fixtures and assertions."
---

# implement-galaxy-workflow-test

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Assemble Galaxy workflow test fixtures and assertions.

## Inputs

- Read artifact `galaxy-test-plan`. Produced by `cwl-test-to-galaxy-test-plan`, `nextflow-test-to-galaxy-test-plan`. Reviewable Galaxy test plan from a *-test-to-galaxy-test-plan Mold; profile, fixtures, snapshot/assertion provenance.
- Read artifact `galaxy-workflow-draft`. Produced by `cwl-summary-to-galaxy-template`, `implement-galaxy-tool-step`, `nextflow-summary-to-galaxy-template`, `paper-summary-to-galaxy-template`. gxformat2 workflow being tested; provides labels, outputs, and shapes the test must assert against.
- Read artifact `test-data-refs`. Produced by `find-test-data`, `paper-to-test-data`. Resolved test data references (URLs, paths, expected shapes) from paper-to-test-data or find-test-data.

## Outputs

- Write artifact `galaxy-workflow-test` as `galaxy-workflow-tests.yml`. Format: `yaml`. Galaxy workflow test file (tests-format) with job inputs, expected outputs, assertions; passes static schema + label cross-check.

## Required Tools

- **`gxwf`** (gxwf). `npm install -g @galaxy-tool-util/cli`.
  Ephemeral run: `npx --package @galaxy-tool-util/cli gxwf`.
  Check: `gxwf --version`.
  Docs: https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli

## Load Upfront

- `references/schemas/tests-format.schema.json`: Schema file copied verbatim into the bundle. JSON Schema contract for the Galaxy workflow test format. Output of this Mold must validate against it.

## Load On Demand

- `references/cli/validate-tests.json`: CLI command reference packaged as a sidecar. Run the cheap static workflow-test validation and workflow-label cross-check before Planemo execution. Use when: after authoring or editing a Galaxy workflow test file and before Planemo invocation.
- `references/notes/galaxy-workflow-testability-design.md`: Research note copied verbatim into the bundle. Revise workflow inputs, outputs, labels, checkpoints, and collection identifiers so meaningful tests can be authored. Use when: test authoring reveals missing labels, omitted workflow-level outputs, unstable collection identifiers, weakly assertable final outputs, or fixture-shape pressure on workflow inputs.
- `references/notes/iwc-shortcuts-anti-patterns.md`: Research note copied verbatim into the bundle. Flag assertion shortcuts that are acceptable in IWC versus shortcuts that should be avoided. Use when: considering existence-only, size-only, image-only, checksum, output-label, or negative-test patterns.
- `references/notes/iwc-test-data-conventions.md`: Research note copied verbatim into the bundle. Assemble job input fixtures, remote URLs, hashes, collection shapes, and test-data layout in IWC style. Use when: writing or revising the job/input side of a Galaxy workflow test file.
- `references/notes/planemo-asserts-idioms.md`: Research note copied verbatim into the bundle. Choose assertion families, tolerance magnitudes, and the static/Planemo validation loop. Use when: writing or revising output assertions for a Galaxy workflow test file.
- `references/notes/planemo-workflow-test-architecture.md`: Research note copied verbatim into the bundle. Write tests with stable labels and artifacts that Planemo can connect back to Galaxy invocations, jobs, and outputs. Use when: adding or revising workflow tests that will be iterated with Planemo or generated from existing invocations.

## Validation

- None declared.

## Procedure

Stub. Replace with real skill content per MOLD_SPEC once first walks are done.
- **`planemo workflow_test_init --from_invocation <id>`** — preferred bootstrap for new test files; reviewer convention. See planemo-asserts-idioms §7.
- **`planemo workflow_test_on_invocation <tests.yml> <id>`** — fast assertion-iteration loop without re-running the workflow.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
