# freeform-summary-to-galaxy-template eval

Evaluation plan for the `freeform-summary-to-galaxy-template` Mold. This file is
the **abstract oracle**: properties any emitted `galaxy-workflow-draft` must
satisfy, independent of fixture. Properties are tagged by bucket:

- **fidelity** — does the draft preserve source/data-flow intent without
  inventing or discarding evidence?
- **utility** — is the draft a well-formed gxformat2 draft with topology settled?
- **handoff** — can the per-step loop consume it?

## Property: topology is fully resolved

- bucket: utility
- check: llm-judged
- assertion: workflow inputs (with collection shapes and formats), workflow
  outputs, the full step set, and the producer→consumer edge graph are concrete
  gxformat2. No step, edge, input shape, or output is left as a TODO; only
  wrapper-tier fields (`tool_id` / `tool_version` / `tool_shed_repository` /
  `tool_state` and wrapper-determined `in:`/`out:` port names) may be deferred.

## Property: draft validates against the draft contract

- bucket: utility
- check: deterministic
- assertion: `gxwf draft-validate` exits clean (`draft valid`). `TODO` / `TODO_*`
  sentinels and `_plan_*` fields appear only on unresolved tool steps — never on
  workflow inputs, outputs, or the connection graph.

## Property: deferral is wrapper-tier only, evidence not discarded

- bucket: fidelity
- check: llm-judged
- assertion: every `TODO` / `_plan_*` is wrapper-tier. A step whose recipe a
  Foundry pattern page or the IWC exemplar fully determines is filled in
  concretely (tool_id, ports, parameters) rather than left TODO; resolved
  evidence the per-step Mold could not recover is not thrown away.

## Property: source intent and open questions survive

- bucket: fidelity
- check: llm-judged
- assertion: the step set and connections reflect the data-flow brief's
  operations and their order; under-specified operations are carried as explicit
  placeholder steps with `_plan_*` context (or surfaced open questions) rather
  than silently dropped or resolved into invented tools/parameters.

## Property: the per-step loop can consume the draft

- bucket: handoff
- check: llm-judged
- assertion: `advance-galaxy-draft-step` / `implement-galaxy-tool-step` can pick
  each drafty step and resolve a wrapper from its `_plan_*` context without
  re-deriving topology from the source summary.
