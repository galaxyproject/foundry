---
type: mold
name: implement-galaxy-workflow-test
axis: target-specific
target: galaxy
tags:
  - mold
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-06-12
revision: 7
ai_generated: true
related_notes:
  - "[[galaxy-workflow-testability-design]]"
  - "[[iwc-test-data-conventions]]"
  - "[[iwc-shortcuts-anti-patterns]]"
  - "[[planemo-asserts-idioms]]"
  - "[[tests-format]]"
summary: "Assemble Galaxy workflow test fixtures and assertions."
input_artifacts:
  - id: galaxy-test-plan
    description: "Reviewable Galaxy test plan from a *-test-to-galaxy-test-plan Mold; profile, fixtures, snapshot/assertion provenance."
  - id: galaxy-workflow-draft
    description: "gxformat2 workflow being tested; provides labels, outputs, and shapes the test must assert against."
  - id: test-data-refs
    description: "Resolved test data references (URLs, paths, expected shapes) from paper-to-test-data or find-test-data."
output_artifacts:
  - id: galaxy-workflow-test
    kind: yaml
    default_filename: galaxy-workflow-tests.yml
    description: "Galaxy workflow test file (tests-format) with job inputs, expected outputs, assertions; passes static schema + label cross-check."
references:
  - kind: cli-command
    ref: "[[validate-tests]]"
    used_at: runtime
    load: on-demand
    mode: sidecar
    evidence: corpus-observed
    purpose: "Run the cheap static workflow-test validation and workflow-label cross-check before Planemo execution."
    trigger: "After authoring or editing a Galaxy workflow test file and before Planemo invocation."
  - kind: cli-tool
    ref: "[[planemo]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Runtime for workflow_test_init / workflow_test_on_invocation; install before authoring tests against a live invocation."
  - kind: schema
    ref: "[[tests-format]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "JSON Schema contract for the Galaxy workflow test format. Output of this Mold must validate against it."
  - kind: research
    ref: "[[galaxy-workflow-testability-design]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Revise workflow inputs, outputs, labels, checkpoints, and collection identifiers so meaningful tests can be authored."
    trigger: "When test authoring reveals missing labels, omitted workflow-level outputs, unstable collection identifiers, weakly assertable final outputs, or fixture-shape pressure on workflow inputs."
  - kind: research
    ref: "[[iwc-test-data-conventions]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Assemble job input fixtures, remote URLs, hashes, collection shapes, and test-data layout in IWC style."
    trigger: "When writing or revising the job/input side of a Galaxy workflow test file."
  - kind: research
    ref: "[[planemo-asserts-idioms]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Choose assertion families, tolerance magnitudes, and the static/Planemo validation loop."
    trigger: "When writing or revising output assertions for a Galaxy workflow test file."
  - kind: research
    ref: "[[iwc-shortcuts-anti-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Flag assertion shortcuts that are acceptable in IWC versus shortcuts that should be avoided."
    trigger: "When considering existence-only, size-only, image-only, checksum, output-label, or negative-test patterns."
  - kind: research
    ref: "[[planemo-workflow-test-architecture]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Write tests with stable labels and artifacts that Planemo can connect back to Galaxy invocations, jobs, and outputs."
    trigger: "When adding or revising workflow tests that will be iterated with Planemo or generated from existing invocations."
---
# implement-galaxy-workflow-test

Assemble a Galaxy workflow test file (`tests-format`) from the test plan, the gxformat2 draft, and the resolved test-data refs. One invocation produces a `*-tests.yml` whose job inputs come from the draft's workflow inputs and whose assertions come from the test plan's snapshots. The output must validate against [[tests-format]] and pass the workflow-label cross-check before any Planemo run.

The draft is the contract: input and output labels in the test file must address real workflow input/output labels. When authoring reveals a missing label, an omitted workflow output, or an unstable collection identifier, treat it as testability pressure on the workflow itself — surface it per [[galaxy-workflow-testability-design]] rather than asserting around it.

## Sequence

1. **Bootstrap.** Prefer generating the test skeleton from a real invocation, not from scratch:
   - **`planemo workflow_test_init --from_invocation <id>`** ([[planemo-workflow_test_init]]) — preferred bootstrap for new test files; reviewer convention. See [[planemo-asserts-idioms]] §7.
   - **`planemo workflow_test_on_invocation <tests.yml> <id>`** ([[planemo-workflow_test_on_invocation]]) — fast assertion-iteration loop without re-running the workflow.
2. **Author job inputs.** Wire each workflow input to a `test-data-refs` entry. Follow [[iwc-test-data-conventions]] for remote-URL-first fixtures, recorded hashes, and per-input collection layout. Inputs must match the draft's collection shapes and datatypes.
3. **Author assertions.** Translate the test plan's snapshots into output assertions. Choose assertion families and tolerances per [[planemo-asserts-idioms]]; check each shortcut against [[iwc-shortcuts-anti-patterns]] so an existence-only or size-only assertion is a deliberate choice, not an evasion.
4. **Validate static.** Run [[validate-tests]] for the schema gate, then the workflow-label cross-check (`checkTestsAgainstWorkflow`): zero missing input labels, zero missing output labels, no collection/datatype mismatches. Fix before spending a Planemo run.
5. **Run green.** Drive [[planemo]] `test` on a managed Galaxy with the staged data and tools. On green, hand off the test file plus enough invocation/job/assertion context for [[run-workflow-test]] and [[debug-galaxy-workflow-output]] to use if a later run fails.

Author tests with stable labels and artifacts that Planemo can connect back to Galaxy invocations, jobs, and outputs ([[planemo-workflow-test-architecture]]) — that traceability is what makes the downstream debug Mold able to locate failure evidence.
