---
name: implement-galaxy-workflow-test
description: "Assemble Galaxy workflow test fixtures and assertions."
---

# implement-galaxy-workflow-test

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Assemble Galaxy workflow test fixtures and assertions.

## Inputs

- Read artifact `galaxy-test-plan`. Schema: galaxy-workflow-test-plan. Produced by `cwl-test-to-galaxy-test-plan`, `freeform-summary-to-galaxy-test-plan`, `nextflow-test-to-galaxy-test-plan`. Schema-valid Galaxy test plan (galaxy-workflow-test-plan) from a *-test-to-galaxy-test-plan Mold; carries job inputs, expected outputs, assertion intent, fixture provenance, label assumptions, unresolved mappings, and omissions.
- Read artifact `galaxy-workflow-draft`. Schema: galaxy-workflow-draft. Produced by `advance-galaxy-draft-step`, `cwl-summary-to-galaxy-template`, `freeform-summary-to-galaxy-template`, `implement-galaxy-tool-step`, `nextflow-summary-to-galaxy-template`, `repair-galaxy-draft-topology`. gxformat2 workflow being tested; provides labels, outputs, and shapes the test must assert against.
- Read artifact `test-data-refs`. Produced by `find-test-data`, `paper-to-test-data`. Resolved test data references (URLs, paths, expected shapes) from paper-to-test-data or find-test-data.

## Outputs

- Write artifact `galaxy-workflow-test` as `galaxy-workflow-tests.yml`. Format: `yaml`. Galaxy workflow test file (tests-format) with job inputs, expected outputs, assertions; passes static schema + label cross-check.

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

- `references/cli/planemo.md`: CLI tool reference copied verbatim into the bundle. Runtime for workflow_test_init / workflow_test_on_invocation; install before authoring tests against a live invocation.
- `references/schemas/galaxy-workflow-test-plan.schema.json`: Schema file copied verbatim into the bundle. Input contract: read the schema-valid Galaxy test plan (job inputs, expected outputs, assertion intent, tolerances, label assumptions, unresolved mappings, omissions) and convert it into tests-format output, reconciling assumed labels and fixtures against the real draft.
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

Assemble a Galaxy workflow test file (`tests-format`) from the schema-valid Galaxy test plan (galaxy-workflow-test-plan), the gxformat2 draft, and the resolved test-data refs. One invocation produces a `*-tests.yml` whose job inputs come from the draft's workflow inputs and whose assertions come from the plan's assertion intent. The output must validate against tests-format and pass the workflow-label cross-check before any Planemo run.

The draft is the contract: input and output labels in the test file must address real workflow input/output labels. The test plan's bindings may be `assumed` or `unresolved` — especially for synthesized (freeform-sourced) plans whose `workflow.label_source` is `interface-brief` — so reconcile each plan binding against the real draft labels here, and resolve `unresolved[]` entries and `storage: unresolved` fixtures against the draft and the resolved test-data refs. When authoring reveals a missing label, an omitted workflow output, or an unstable collection identifier, treat it as testability pressure on the workflow itself — surface it per galaxy-workflow-testability-design rather than asserting around it.

### Sequence

1. **Bootstrap.** Prefer generating the test skeleton from a real invocation, not from scratch:
   - **`planemo workflow_test_init --from_invocation <id>`** (planemo-workflow_test_init) — preferred bootstrap for new test files; reviewer convention. See planemo-asserts-idioms §7.
   - **`planemo workflow_test_on_invocation <tests.yml> <id>`** (planemo-workflow_test_on_invocation) — fast assertion-iteration loop without re-running the workflow.
2. **Author job inputs.** Wire each workflow input to a `test-data-refs` entry. Follow iwc-test-data-conventions for remote-URL-first fixtures, recorded hashes, and per-input collection layout. Inputs must match the draft's collection shapes and datatypes.
3. **Author assertions.** Materialize the plan's assertion intent into concrete output assertions. Choose assertion families and tolerances per planemo-asserts-idioms; check each shortcut against iwc-shortcuts-anti-patterns so an existence-only or size-only assertion is a deliberate choice, not an evasion. Honor the plan's `omissions[]` and treat low-`confidence` synthesized intent as a starting point to tighten against the real invocation.
4. **Validate static.** Run validate-tests for the schema gate, then the workflow-label cross-check (`checkTestsAgainstWorkflow`): zero missing input labels, zero missing output labels, no collection/datatype mismatches. Fix before spending a Planemo run.
5. **Run green.** Drive planemo `test` on a managed Galaxy with the staged data and tools. On green, hand off the test file plus enough invocation/job/assertion context for run-workflow-test and debug-galaxy-workflow-output to use if a later run fails.

Author tests with stable labels and artifacts that Planemo can connect back to Galaxy invocations, jobs, and outputs (planemo-workflow-test-architecture) — that traceability is what makes the downstream debug skill able to locate failure evidence.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
