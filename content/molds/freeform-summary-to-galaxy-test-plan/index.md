---
type: mold
name: freeform-summary-to-galaxy-test-plan
axis: source-specific
source: freeform
target: galaxy
tags:
  - mold
  - source/freeform
  - target/galaxy
status: reviewed
created: 2026-06-16
revised: 2026-07-24
revision: 2
ai_generated: true
summary: "Synthesize a Galaxy workflow test plan from a free-form summary and the Galaxy design briefs."
input_artifacts:
  - id: freeform-summary
    description: "Free-form source summary from [[summarize-paper]] or [[interview-to-freeform-summary]]; carries methods, sample data, parameters, and expected outputs that seed test intent."
  - id: freeform-galaxy-interface
    description: "Galaxy interface brief from [[freeform-summary-to-galaxy-interface]] that pins workflow inputs, outputs, and labels the plan binds assertions to."
  - id: freeform-galaxy-data-flow
    description: "Galaxy data-flow brief from [[freeform-summary-to-galaxy-data-flow]] that pins abstract operations and collection choices the plan must respect."
  - id: iwc-comparison-notes
    description: "Structural diff guidance from [[compare-against-iwc-exemplar]]; steers the plan toward IWC-aligned testable checkpoints and fixture shapes."
  - id: iwc-exemplar-gxformat2
    description: "Cleaned gxformat2 view of the nearest IWC exemplar from [[compare-against-iwc-exemplar]]; pattern-match its labels, collection identifiers, and tested checkpoints. Absent when no nearest exemplar was found."
output_artifacts:
  - id: galaxy-test-plan
    kind: yaml
    default_filename: galaxy-test-plan.yml
    schema: "[[galaxy-workflow-test-plan]]"
    description: "Reviewable Galaxy workflow test plan (see [[galaxy-workflow-test-plan]]): synthesized test cases with job inputs, expected outputs, assertion intent, fixture provenance, label assumptions, unresolved mappings, and omissions."
references:
  - kind: schema
    ref: "[[galaxy-workflow-test-plan]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Output contract: the emitted plan conforms to [[galaxy-workflow-test-plan]]. Cast bundles the JSON Schema so the skill carries its output shape; validate with `foundry validate-galaxy-workflow-test-plan`."
    verification: "Cast the skill, run on a representative paper/interview-derived summary, confirm the emitted YAML validates and downstream [[implement-galaxy-workflow-test]] consumes it without re-reading the source summary."
  - kind: schema
    ref: "[[tests-format]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Use the Galaxy workflow tests schema as the assertion-family vocabulary referenced by the plan's assertion intent."
    trigger: "When naming an assertion family or compare operator for a synthesized expected output."
  - kind: research
    ref: "[[galaxy-workflow-testability-design]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Choose which workflow outputs and promoted checkpoints make meaningful assertions when no upstream test evidence exists."
    trigger: "When deciding which outputs to assert, which checkpoints to promote, and which labels the plan should assume."
  - kind: research
    ref: "[[iwc-test-data-conventions]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Describe job-input fixtures, remote-URL-first locations, hashes, and collection input shapes the plan should record as fixture provenance."
    trigger: "When recording job inputs or fixture provenance, or deciding whether a fixture belongs in test-data, Zenodo, ENA/SRA, or CVMFS."
  - kind: research
    ref: "[[planemo-asserts-idioms]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Pick the assertion family and tolerance that fit each synthesized expected output by output type."
    trigger: "When turning an expected output into assertion intent and a tolerance."
  - kind: research
    ref: "[[iwc-shortcuts-anti-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Distinguish accepted IWC-style test shortcuts from assertion smells while synthesizing assertions from intent."
    trigger: "When considering existence-only, size-only, image-dimension, or tolerant output checks, or recording an omission."
  - kind: research
    ref: "[[planemo-workflow-test-architecture]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Keep the plan addressable by stable labels and artifacts Planemo can connect back to invocations, jobs, and outputs."
    trigger: "When recording the labels and checkpoints the downstream test must address."
related_notes:
  - "[[galaxy-workflow-test-plan]]"
  - "[[tests-format]]"
  - "[[implement-galaxy-workflow-test]]"
---
# freeform-summary-to-galaxy-test-plan

Synthesize a Galaxy workflow test plan from a free-form source summary and the Galaxy interface and data-flow briefs. The output is a reviewable handoff conforming to [[galaxy-workflow-test-plan]], not a concrete `tests-format` file: it records test cases, job inputs, expected outputs, assertion intent, fixture provenance, label assumptions, unresolved mappings, and intentional omissions so [[implement-galaxy-workflow-test]] can author the final Galaxy test artifact.

## Synthesized, not translated

This is the structural difference from [[nextflow-test-to-galaxy-test-plan]] and [[cwl-test-to-galaxy-test-plan]]. Those Molds **translate** existing upstream test evidence — nf-test snapshots, CWL job files and expected outputs — into a Galaxy plan. A free-form source has no upstream test fixtures to convert, so this Mold **synthesizes** the plan from workflow intent and scenario-level expected outputs: the methods, sample data, parameters, and "expected results" recorded in the free-form summary, plus the testable structure the interface/data-flow briefs and the nearest IWC exemplar imply.

Set the plan's `source.derived_from` to `intent` (not `test-evidence`) and each synthesized assertion's `evidence` to `intent`; most synthesized assertions are `confidence: medium` or `low`. Where the summary does carry a concrete expected value (a known count, a named output token, a published figure), record it as `expected_value` and raise the confidence.

## Labels and fixtures are assumed, not bound

This Mold consumes the template-era briefs, not the concrete workflow draft or the resolved test-data refs — those exist in the harness run-state by the time the plan is authored, but they are reconciled downstream rather than here. So:

- Bind assertions to the labels the interface brief pins, and set `label_status` to `assumed` (or `unresolved` when even the brief is silent) and the plan's `workflow.label_source` to `interface-brief`. [[implement-galaxy-workflow-test]] reconciles these against the real draft labels and the workflow-label cross-check.
- Record fixtures with `storage: unresolved` and `location: null` when the free-form summary names test data only by description; capture what is known (a dataset name, an accession, a Zenodo DOI, a rough size) in `fixture.provenance` so test-data resolution and the implement Mold can act on it. Use [[iwc-test-data-conventions]] for the storage classes and the remote-URL-first convention.

When a binding or fixture cannot be settled from the briefs, add an `unresolved[]` entry (with `blocking: true` when the final test cannot be authored without it) rather than inventing a label or a URL.

## Choosing assertions from intent

For each expected output the briefs expose, pick the assertion family by output type per [[planemo-asserts-idioms]] and a defensible tolerance. When the only exposed output is weakly assertable (a stochastic plot, an opaque binary), consult [[galaxy-workflow-testability-design]]: prefer recording assertion intent against a stronger promoted checkpoint, and when you settle for a weak check, record the weaker outputs in `omissions[]` with a rationale rather than asserting around them. Check each shortcut against [[iwc-shortcuts-anti-patterns]] so an existence-only or size-only intent is a deliberate choice.

Keep the plan addressable by stable labels and artifacts ([[planemo-workflow-test-architecture]]) so the downstream test, run, and debug Molds can connect assertions back to invocations and outputs.
