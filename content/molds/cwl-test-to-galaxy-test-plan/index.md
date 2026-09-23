---
type: mold
name: cwl-test-to-galaxy-test-plan
axis: source-specific
source: cwl
tags:
  - source/cwl
status: draft
created: 2026-04-30
revised: 2026-09-23
revision: 3
summary: "Translate CWL test fixtures into a Galaxy workflow test plan."
input_artifacts:
  - id: summary-cwl
    description: "Structured CWL summary from [[summarize-cwl]]; lists discovered test cases, job-file paths, and expected-output references."
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
    purpose: "Read the CWL summary's test cases, job-file paths, expected-output references, and assertion evidence."
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

Turn the CWL summary's discovered test cases into a reviewable Galaxy test plan. Preserve each case's job-file and expected-output provenance so [[implement-galaxy-workflow-test]] can author the final test against the concrete Galaxy workflow. The plan records assertion intent and open mappings, not a `tests-format` test file.

For each `tests[]` case, open its `job_path` when available. Map the declared CWL input values onto the Galaxy inputs the summary and translation imply. Keep `File` locations, `Directory` contents, `secondaryFiles`, arrays, and collection element identifiers visible where they affect the fixture or its Galaxy shape. Record the source path or URL and any known checksum. If a job file is missing or an input cannot be mapped, leave the fixture or label unresolved with a reason. A `job_path` in the summary is a pointer to inputs, not the inputs themselves.

Translate each recorded expected output into a Galaxy output to check. Use the CWL output id and any supplied path, URL, checksum, or assertion as evidence for an appropriate `tests-format` assertion family. Record what the assertion should establish, its expected value and tolerance when supported, and the source of that expectation. Do not infer a passing value from an output name or turn a checksum into a Galaxy assertion without confirming that the translated output can be compared that way. For collections and sidecars, identify the element or file that the check actually addresses.

Bind input and output labels to a concrete Galaxy draft only if one is available to inspect. Otherwise mark inferred labels as assumed or unresolved, set `workflow.label_source` accordingly, and record the mapping that [[implement-galaxy-workflow-test]] must confirm. Set `source.derived_from: test-evidence` for a plan based on discovered CWL tests, and `evidence: test-evidence` only for assertions supported by those tests. If a useful Galaxy check must instead be inferred from workflow intent, mark that assertion `evidence: intent` and explain its lower confidence.

Record unavailable fixtures, expression-dependent shapes, untranslatable assertions, and missing label or datatype mappings in `unresolved[]` or `warnings[]` as appropriate. Put outputs deliberately left unasserted in `omissions[]` with a reason. If the summary has no usable test case, report that coverage gap rather than presenting a fabricated case as translated evidence. Validate the emitted `galaxy-test-plan.yml` with `foundry validate-galaxy-workflow-test-plan` before handing it to [[implement-galaxy-workflow-test]].
