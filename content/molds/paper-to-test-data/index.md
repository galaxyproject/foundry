---
type: mold
name: paper-to-test-data
axis: source-specific
source: paper
tags:
  - source/paper
status: draft
created: 2026-04-30
revised: 2026-10-20
revision: 4
summary: "Resolve the test data a paper names into refs for each workflow input."
input_artifacts:
  - id: freeform-summary
    description: "Free-form summary from [[summarize-paper]]; sample data and reference evidence the test fixtures derive from."
  - id: freeform-galaxy-interface
    role: workflow-interface
    description: "Galaxy interface brief from [[freeform-summary-to-galaxy-interface]] pinning the workflow input labels, collection shapes, and datatypes each ref must map onto, in PAPER → GALAXY."
  - id: freeform-cwl-design
    role: workflow-interface
    description: "CWL design from [[freeform-summary-to-cwl-design]] naming the workflow input ports each ref must map onto, in PAPER → CWL."
output_artifacts:
  - id: test-data-refs
    kind: json
    default_filename: test-data-refs.json
    schema: "[[test-data-refs]]"
    description: "Test data the paper names, one ref per workflow input (URLs, shapes, hashes). Shared id with [[find-test-data]], which fills only the inputs this Mold leaves unresolved."
references:
  - kind: schema
    ref: "[[test-data-refs]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: cast-validated
    purpose: "Output contract: one ref per workflow input, resolved or an honest gap with a reason. Cast bundles the JSON Schema; validate with `foundry validate-test-data-refs` before returning."
    verification: "Run the test-data-resolution chain on a pinned scenario and confirm each leg's test-data-refs.json validates and implement-galaxy-workflow-test stages from it."
---
# paper-to-test-data

Read the paper free-form summary from [[summarize-paper]] and resolve the data the paper names (resolvable URLs, file shapes, expected hashes) onto the workflow inputs the target declares — the Galaxy interface brief's input labels, or the CWL design's input ports — as `test-data-refs` with `resolved_by: paper-to-test-data`. An input the paper names no data for stays `resolved: false` with a reason, for [[find-test-data]] to search; that includes an optional one, which this Mold never marks `omitted`. Expected outputs are the test plan's to derive, not this Mold's. Validate the file with `foundry validate-test-data-refs` before returning.
