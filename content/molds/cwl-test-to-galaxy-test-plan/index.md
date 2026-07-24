---
type: mold
name: cwl-test-to-galaxy-test-plan
axis: source-specific
source: cwl
tags:
  - source/cwl
status: draft
created: 2026-04-30
revised: 2026-05-03
revision: 2
ai_generated: true
summary: "Translate CWL test fixtures into a Galaxy workflow test plan."
input_artifacts:
  - id: summary-cwl
    description: "Structured CWL summary from [[summarize-cwl]]; carries test fixtures, job inputs, expected outputs."
output_artifacts:
  - id: galaxy-test-plan
    kind: yaml
    default_filename: galaxy-test-plan.yml
    schema: "[[galaxy-workflow-test-plan]]"
    description: "Reviewable Galaxy workflow test plan (see [[galaxy-workflow-test-plan]]) derived from CWL test fixtures, job inputs, expected outputs, and assertion evidence."
references:
  - kind: schema
    ref: "[[galaxy-workflow-test-plan]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Output contract: the emitted plan conforms to [[galaxy-workflow-test-plan]]. Cast bundles the JSON Schema; validate with `foundry validate-galaxy-workflow-test-plan`."
    verification: "Cast the skill on a CWL summary carrying tests and confirm the emitted YAML validates and downstream [[implement-galaxy-workflow-test]] consumes it."
  - kind: schema
    ref: "[[summary-cwl]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Read the CWL summary's test cases, job inputs, expected outputs, and assertion evidence."
  - kind: schema
    ref: "[[tests-format]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Use the Galaxy workflow tests schema as the assertion-family vocabulary when translating CWL test evidence into a Galaxy test plan."
    trigger: "When mapping expected outputs, tolerances, or fixture assertions into Galaxy workflow-test assertion intent."
  - kind: research
    ref: "[[iwc-test-data-conventions]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Emit Galaxy/IWC-style job input fixtures, remote locations, hashes, and collection input shapes."
    trigger: "When writing job inputs or deciding whether fixtures belong in test-data, Zenodo, ENA/SRA, or CVMFS."
  - kind: research
    ref: "[[planemo-asserts-idioms]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Describe Galaxy workflow-test assertion intent and tolerances for translated expected outputs."
    trigger: "When turning CWL expected outputs into Galaxy test-plan assertions."
  - kind: research
    ref: "[[galaxy-workflow-testability-design]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Choose which workflow outputs and promoted checkpoints make meaningful assertions."
    trigger: "When deciding which outputs to assert and which labels the plan should bind to."
  - kind: research
    ref: "[[iwc-shortcuts-anti-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Distinguish accepted IWC-style test shortcuts from assertion smells while translating tests."
    trigger: "When deciding whether to use existence-only, size-only, image-dimension, or tolerant output checks."
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
  - "[[summary-cwl]]"
  - "[[tests-format]]"
---
# cwl-test-to-galaxy-test-plan

Translate CWL test fixtures, job inputs, expected outputs, and assertion evidence into a Galaxy workflow test plan. The output is a reviewable YAML handoff conforming to [[galaxy-workflow-test-plan]], not a concrete `tests-format` file; [[implement-galaxy-workflow-test]] owns final YAML authoring and static validation. Because this plan is translated from real CWL test fixtures, set `source.derived_from: test-evidence` and prefer `evidence: test-evidence` on the assertions it carries.
