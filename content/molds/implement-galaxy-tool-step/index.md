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
revised: 2026-06-12
revision: 6
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

Replace one abstract step in the gxformat2 draft with a concrete tool step, using the upstream tool summary. One invocation resolves exactly the chosen step's `TODO_*` / `_plan_*` slots into a concrete `tool_id`, `tool_version`, `tool_state`, and wrapper-determined port names, and returns the mutated draft. This is the "Implement" leaf of the per-step loop owned by [[advance-galaxy-draft-step]].

Single step in scope. This Mold owns the chosen step and the wiring that connects it to ports already in the draft. It does not redesign topology and does not unwind earlier iterations — cross-step rework is the orchestrator's call.

## Sequence

1. **Read the step's plan.** From the [[galaxy-workflow-draft]], take the chosen step's deferred evidence: `_plan_state`, `_plan_context`, `_plan_in`, `_plan_out`, and any `TODO_*` slots the template or data-flow brief left for this phase.
2. **Bind to the tool summary.** Read the [[galaxy-tool-summary]] manifest: `parsed_tool` gives concrete input/output port names and datatypes; shape the step's `tool_state` against `input_schemas.workflow_step_linked`. Set `tool_version`, and set `tool_id` — confirming or correcting an identity-pinned id rather than re-deriving a good pin from scratch. If `input_schemas` is `null`, consult `warnings[]` for why before binding by hand.
3. **Wire ports.** Connect the step's inputs to their upstream producers and its outputs to downstream consumers per the `_plan_in` / `_plan_out` intent, using real wrapper port names. Preserve collection mapping and reduction semantics ([[galaxy-collection-semantics]]); for a source-derived shape, check the chosen input/output can actually carry the intended File / list / paired / list:paired shape ([[nextflow-to-galaxy-channel-shape-mapping]]).
4. **Close shape gaps.** When a direct tool connection cannot express the needed shape, insert a built-in collection-operation step ([[galaxy-collection-tools]]); for identifier-derived reshaping — regex parsing, nesting swaps, paired assignment — use Apply Rules ([[galaxy-apply-rules-dsl]]); for a transform traced to a Nextflow operator (map, join, groupTuple, branch, mix, combine, multiMap), turn it into concrete wiring or a review request via [[nextflow-operators-to-galaxy-collection-recipes]].
5. **Preserve testability.** Keep output labels and collection element identifiers stable and addressable ([[galaxy-workflow-testability-design]]). Do not rename a labeled output, drop a checkpoint, or make a final output too weakly assertable just to satisfy this step's wiring.
6. **Validate.** Run [[draft-validate]] `--concrete` over the mutated draft: it checks draft-contract rules and gates the extracted concrete subset — including the step just implemented — against full gxformat2. On green, return the draft for the next loop iteration; on red, route the diagnostic back to whichever decision above it implicates.

## Failure ownership

When the wrapper can't cleanly carry what the plan needs — wrong datatype, missing parameter, unsupported collection shape — record where a later failure should be investigated: tool/job failure, data-flow mistake, template wiring mistake, wrapper mismatch, or test/assertion issue. Consult [[galaxy-tool-job-failure-reference]] when the selected wrapper has explicit failure semantics (exit-code rules, stdio regex, strict-shell, dynamic outputs); implement the step's labels and wiring so that evidence survives to runtime rather than being erased by the concretization.
