---
type: mold
name: implement-galaxy-tool-step
axis: target-specific
target: galaxy
tags:
  - mold
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-05-05
revision: 5
ai_generated: true
summary: "Convert an abstract step into a concrete gxformat2 step using a tool summary."
input_artifacts:
  - id: galaxy-tool-summary
    description: "Galaxy tool summary manifest from [[summarize-galaxy-tool]] conforming to [[galaxy-tool-summary]]; binds the abstract step to a concrete tool's ports via the embedded `parsed_tool` and generated `input_schemas`."
  - id: galaxy-workflow-draft
    description: "gxformat2 skeleton being filled in step by step; the step replaces a placeholder in this draft."
output_artifacts:
  - id: galaxy-workflow-draft
    kind: yaml
    default_filename: galaxy-workflow-draft.gxwf.yml
    schema: "[[galaxy-workflow-draft]]"
    description: "gxformat2 skeleton with one more abstract step replaced by a concrete tool step (loop iteration output)."
references:
  - kind: schema
    ref: "[[galaxy-workflow-draft]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: cast-validated
    purpose: "In/out contract: the draft this Mold reads and mutates in place conforms to [[galaxy-workflow-draft]]. Cast bundles the JSON Schema alongside the [[draft-validate]] CLI checks."
  - kind: schema
    ref: "[[galaxy-tool-summary]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Bind the abstract step against the deterministic tool summary manifest emitted upstream — read `parsed_tool` for ports/datatypes and `input_schemas.workflow_step_linked` for valid step `tool_state` shape."
  - kind: cli-command
    ref: "[[draft-validate]]"
    used_at: runtime
    load: on-demand
    mode: sidecar
    evidence: hypothesis
    purpose: "Validate the mutated draft against draft-contract rules; with --concrete, also gate the extracted concrete subset (including the step just implemented) against full gxformat2."
    trigger: "After implementing or modifying a concrete tool step in the draft."
    verification: "Cast the skill, exercise on an IWC-derived draft with one drafty step, confirm both surfaces validate and diagnostics route back to the implemented step."
  - kind: research
    ref: "[[galaxy-workflow-testability-design]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Preserve testable output labels and collection element identifiers while replacing abstract steps with concrete gxformat2 steps."
    trigger: "When a concrete step changes output labels, emits collection outputs, creates a diagnostic checkpoint, or makes a final output too weakly assertable."
  - kind: research
    ref: "[[galaxy-collection-semantics]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Connect concrete Galaxy tool inputs/outputs while preserving collection mapping and reduction semantics."
    trigger: "When implementing a step with data_collection inputs, mapped outputs, reductions, or nested collection wiring."
  - kind: research
    ref: "[[nextflow-to-galaxy-channel-shape-mapping]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Check whether a concrete tool input/output can preserve the intended source-derived Galaxy collection shape."
    trigger: "When implementing concrete steps for source-derived File/list/paired/list:paired/list:list inputs or outputs."
  - kind: research
    ref: "[[nextflow-operators-to-galaxy-collection-recipes]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Turn operator-derived abstract transforms into concrete Galaxy wiring, collection operations, or review requests."
    trigger: "When a concrete step implements behavior traced to map, join, groupTuple, branch, mix, combine, or multiMap."
  - kind: research
    ref: "[[galaxy-collection-tools]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Insert built-in Galaxy collection-operation steps when a direct tool connection cannot express the needed shape."
    trigger: "When a step needs collection construction, filtering, extraction, zipping, unzipping, flattening, merging, or relabeling."
  - kind: research
    ref: "[[galaxy-apply-rules-dsl]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Implement identifier-derived collection reshaping via Apply Rules."
    trigger: "When collection element identifiers need regex parsing, nesting-level swaps, regrouping, or paired identifier assignment."
  - kind: pattern
    ref: "[[galaxy-collection-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Choose corpus-attested collection recipes when implementing concrete Galaxy steps."
    trigger: "When implementation needs cleanup-after-fanout, sync-by-identifier, singleton unboxing, relabeling, collection reshaping, or collection-tabular bridges."
  - kind: pattern
    ref: "[[galaxy-tabular-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Choose corpus-attested tabular recipes when implementing concrete Galaxy steps."
    trigger: "When implementation needs row filtering, column projection, computed columns, joins, grouping, SQL, awk, text-processing wrappers, or tabular-collection bridges."
  - kind: research
    ref: "[[galaxy-tool-job-failure-reference]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Preserve concrete tool/job failure evidence while implementing step labels, tool ids, output labels, and collection wiring."
    trigger: "When a selected wrapper has explicit failure semantics, dynamic outputs, non-default stdio rules, strict-shell behavior, or runtime-only failure risk."
---
# implement-galaxy-tool-step

Stub. Replace with real Mold content per MOLD_SPEC once first walks are done.
