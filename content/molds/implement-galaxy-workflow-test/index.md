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
  - "[[galaxy-workflow-test-plan]]"
  - "[[freeform-summary-to-galaxy-test-plan]]"
  - "[[galaxy-workflow-testability-design]]"
  - "[[iwc-test-data-conventions]]"
  - "[[iwc-shortcuts-anti-patterns]]"
  - "[[planemo-asserts-idioms]]"
  - "[[tests-format]]"
summary: "Assemble Galaxy workflow test fixtures and assertions."
input_artifacts:
  - id: galaxy-test-plan
    description: "Schema-valid Galaxy test plan ([[galaxy-workflow-test-plan]]) from a *-test-to-galaxy-test-plan Mold; carries job inputs, expected outputs, assertion intent, fixture provenance, label assumptions, unresolved mappings, and omissions."
  - id: galaxy-workflow
    description: "Concrete gxformat2 workflow being tested — the loop-endstate `galaxy-workflow.gxwf.yml` from [[advance-galaxy-draft-step]] (`class: GalaxyWorkflow`); provides the real input/output labels, outputs, and collection shapes the test must assert against."
  - id: test-data-refs
    description: "Resolved test data references (URLs, paths, expected shapes) from paper-to-test-data or find-test-data."
output_artifacts:
  - id: galaxy-workflow-test
    kind: yaml
    default_filename: galaxy-workflow.gxwf-tests.yml
    description: "Galaxy workflow test file (tests-format) with job inputs, expected outputs, assertions; passes static schema + label cross-check. Named as the workflow basename + `-tests.yml` so Planemo discovers it as the companion of `galaxy-workflow.gxwf.yml`."
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
    ref: "[[galaxy-workflow-test-plan]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Input contract: read the schema-valid Galaxy test plan (job inputs, expected outputs, assertion intent, tolerances, label assumptions, unresolved mappings, omissions) and convert it into tests-format output, reconciling assumed labels and fixtures against the real draft."
    verification: "Consume a cast test plan from a *-test-to-galaxy-test-plan Mold and confirm tests-format output can be authored from it without re-reading the source summary."
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

Assemble a Galaxy workflow test file (`tests-format`) from the schema-valid Galaxy test plan ([[galaxy-workflow-test-plan]]), the concrete gxformat2 workflow (`galaxy-workflow.gxwf.yml`), and the resolved test-data refs. One invocation produces the companion test file whose job inputs come from the workflow inputs and whose assertions come from the plan's assertion intent. The output must validate against [[tests-format]] and pass the workflow-label cross-check before any Planemo run.

**Name the companion off the workflow's basename.** Planemo discovers the test file by stripping only the workflow's final extension and appending `-tests.yml`, so the companion of `galaxy-workflow.gxwf.yml` is `galaxy-workflow.gxwf-tests.yml` (keep the `.gxwf`) — not `galaxy-workflow-tests.yml`. Derive the name from whatever the workflow file is actually called; a `.ga` workflow would instead pair with `<basename>-tests.yml`.

The workflow is the contract: input and output labels in the test file must address real workflow input/output labels. The test plan's bindings may be `assumed` or `unresolved` — especially for synthesized (freeform-sourced) plans whose `workflow.label_source` is `interface-brief` — so reconcile each plan binding against the real workflow labels here, and resolve `unresolved[]` entries and `storage: unresolved` fixtures against the workflow and the resolved test-data refs. When authoring reveals a missing label, an omitted workflow output, or an unstable collection identifier, treat it as testability pressure on the workflow itself — surface it per [[galaxy-workflow-testability-design]] rather than asserting around it.

## Sequence

1. **Bootstrap.** Prefer generating the test skeleton from a real invocation, not from scratch:
   - **`planemo workflow_test_init --from_invocation <id>`** ([[planemo-workflow_test_init]]) — preferred bootstrap for new test files; reviewer convention. See [[planemo-asserts-idioms]] §7.
   - **`planemo workflow_test_on_invocation <tests.yml> <id>`** ([[planemo-workflow_test_on_invocation]]) — fast assertion-iteration loop without re-running the workflow.
2. **Author job inputs and stage their data.** Wire each workflow input to a `test-data-refs` entry, and make the data the test references actually exist on disk before any Planemo run:
   - **Prefer a bare remote `location:`** ([[iwc-test-data-conventions]], remote-URL-first) whenever the ref is a single fetchable artifact — Galaxy fetches it at upload time, so nothing is staged locally. Record the hash when known.
   - **Materialize a local `test-data/` layout only when the ref needs prep a URL can't express** — a concatenation (e.g. per-isolate chromosome+plasmid into one FASTA), a subset (one chromosome, selected loci), or a column split into named collection elements. In that case the test file's `path:` entries point at files this Mold writes: fetch from the ref's verified source URLs, run the documented prep, and lay the result out in the `test-data/` directory addressed by the `*-tests.yml`, relative to the workflow. The collection element identifiers in the staged layout must match the test file and the workflow labels exactly.
   - Never emit a `path:` (or `location:`) the test references but no source produces — an un-materialized path passes the static cross-check and fails only at upload, far from here. If a ref is `resolved: false`, surface the gap rather than authoring a path to a file that does not exist.

   Inputs must match the workflow's collection shapes and datatypes.
3. **Author assertions.** Materialize the plan's assertion intent into concrete output assertions. Choose assertion families and tolerances per [[planemo-asserts-idioms]]; check each shortcut against [[iwc-shortcuts-anti-patterns]] so an existence-only or size-only assertion is a deliberate choice, not an evasion. Honor the plan's `omissions[]` and treat low-`confidence` synthesized intent as a starting point to tighten against the real invocation.
4. **Validate static.** Run [[validate-tests]] for the schema gate, then the workflow-label cross-check (`checkTestsAgainstWorkflow`): zero missing input labels, zero missing output labels, no collection/datatype mismatches. Fix before spending a Planemo run.
5. **Run green.** Drive [[planemo]] `test` with the staged data. "Managed Galaxy" here means **Planemo-managed**: `planemo test` bootstraps its own Galaxy and installs the workflow's tools from the Tool Shed/conda — it does **not** require a pre-provisioned external server, so absence of a running Galaxy is not a reason to skip this gate (cost/runtime of heavy tool or reference-DB installs may be, but that is a deliberate deferral, not an impossibility). On green, hand off the test file plus enough invocation/job/assertion context for [[run-workflow-test]] and [[debug-galaxy-workflow-output]] to use if a later run fails.

Author tests with stable labels and artifacts that Planemo can connect back to Galaxy invocations, jobs, and outputs ([[planemo-workflow-test-architecture]]) — that traceability is what makes the downstream debug Mold able to locate failure evidence.
