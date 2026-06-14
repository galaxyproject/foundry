# cwl-summary-to-galaxy-template eval

Evaluation plan for the `cwl-summary-to-galaxy-template` Mold. This file is the
**abstract oracle**: properties any emitted draft must satisfy, independent of
fixture. The template is an explicit draft scaffold — these properties check
structural intent, TODO discipline, and handoff quality, not runnability.
Concrete fixtures and their expected values live in `scenarios.md`; the oracle
here is applied to whatever a scenario produces.

## Property: draft stubs fail lint rather than passing clean

- bucket: schema
- check: deterministic + llm-judged
- assertion: a draft carrying TODO-stub fields — unresolved tool IDs, placeholder
  tool_state, unwired connections — is expected to **fail** `gxwf validate` and
  `gxwf lint`. A draft that passes lint clean is suspect, because it likely
  fabricated tool IDs or wiring to satisfy the linter.

## Property: skeleton preserves prior design decisions

- bucket: handoff
- check: llm-judged
- assertion: workflow inputs, outputs, placeholder steps, and TODO notes reflect
  the prior interface and data-flow briefs. The template may simplify, but it
  must not silently contradict a high-confidence upstream decision.

## Property: TODO placeholders are actionable

- bucket: utility
- check: llm-judged
- assertion: each placeholder step or TODO records source CWL step, expected
  input/output shape, and the likely downstream owner. It should be enough for
  later tool-discovery or per-step implementation to start.

## Property: collection inputs use gxformat2-compatible structure

- bucket: schema
- check: deterministic
- assertion: gxformat2 collection input entries use valid `type`,
  `collection_type`, `format`, and `optional` shapes. The parts of the draft
  that are not TODO stubs must parse as gxformat2 — TODO is allowed on values,
  not on the shape of the surrounding structure.

## Property: outputs carry interface-brief labels

- bucket: handoff
- check: llm-judged
- assertion: `workflow_outputs` carry the labels the interface brief named, so a
  later test plan can reference them by name.

## Property: IWC findings are guidance, not hidden rewrites

- bucket: utility
- check: llm-judged
- assertion: high-confidence structural IWC findings may alter the skeleton;
  low-confidence findings are carried as TODO/review notes. The emitted workflow
  should make applied IWC guidance traceable.
