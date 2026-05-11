# cwl-summary-to-galaxy-template eval

Evaluation plan for the `cwl-summary-to-galaxy-template` Mold. The template is an explicit draft scaffold — these cases check structural intent, TODO discipline, and handoff quality, not runnability.

## Case: demo skeleton is a stub, not a runnable workflow

- bucket: schema
- check: deterministic + llm-judged
- fixture: a committed CWL summary plus its interface and data-flow briefs.
- expectation: emitted `galaxy-workflow-draft.gxwf.yml` is expected to **fail** `gxwf validate` and `gxwf lint` on TODO-stub fields — unresolved tool IDs, placeholder tool_state, unwired connections. A draft that passes lint clean is suspect, because it likely fabricated tool IDs or wiring to satisfy the linter.

## Case: skeleton preserves prior design decisions

- bucket: handoff
- check: llm-judged
- fixture: any source summary plus interface/data-flow briefs containing explicit inputs, outputs, placeholders, and open questions.
- expectation: workflow inputs, outputs, placeholder steps, and TODO notes reflect the prior briefs. The template may simplify, but it must not silently contradict a high-confidence upstream decision.

## Case: TODO placeholders are actionable

- bucket: utility
- check: llm-judged
- fixture: a data-flow brief with unresolved tool needs and collection-reshape placeholders.
- expectation: each placeholder step or TODO records source CWL step, expected input/output shape, and the likely downstream owner. It should be enough for later tool-discovery or per-step implementation to start.

## Case: collection inputs use gxformat2-compatible structure

- bucket: schema
- check: deterministic
- fixture: a brief with Galaxy collection or paired/paired_or_unpaired-shaped inputs.
- expectation: gxformat2 input entries use valid `type`, `collection_type`, `format`, and `optional` shapes. The parts of the draft that are not TODO stubs must parse as gxformat2 — TODO is allowed on values, not on the shape of the surrounding structure.

## Case: outputs labeled

- bucket: handoff
- check: llm-judged
- fixture: interface brief naming workflow outputs, plus emitted draft.
- expectation: `workflow_outputs` carry the labels the interface brief named, so a later test plan can reference them by name.

## Case: IWC findings are guidance, not hidden rewrites

- bucket: utility
- check: llm-judged
- fixture: interface/data-flow briefs plus high- and low-confidence IWC comparison notes.
- expectation: high-confidence structural findings may alter the skeleton; low-confidence findings are carried as TODO/review notes. The emitted workflow should make applied IWC guidance traceable.
