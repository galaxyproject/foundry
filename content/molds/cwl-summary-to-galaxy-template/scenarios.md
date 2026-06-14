# cwl-summary-to-galaxy-template scenarios

Concrete cases for `cwl-summary-to-galaxy-template`, exercised against the
abstract properties in `eval.md`. Each case binds a fixture and states its
expected values; the `eval.md` oracle is applied to whatever the case produces.

## Case: demo skeleton is a stub, not a runnable workflow

- fixture: a committed CWL summary plus its interface and data-flow briefs.
- expect: emitted `galaxy-workflow-draft.gxwf.yml` **fails** `gxwf validate` and
  `gxwf lint` on TODO-stub fields — unresolved tool IDs, placeholder tool_state,
  unwired connections. A draft that passes lint clean is suspect, because it
  likely fabricated tool IDs or wiring to satisfy the linter.

## Case: skeleton preserves prior design decisions

- fixture: any source summary plus interface/data-flow briefs containing explicit
  inputs, outputs, placeholders, and open questions.
- expect: workflow inputs, outputs, placeholder steps, and TODO notes reflect the
  prior briefs. The template may simplify, but it must not silently contradict a
  high-confidence upstream decision.

## Case: TODO placeholders are actionable

- fixture: a data-flow brief with unresolved tool needs and collection-reshape
  placeholders.
- expect: each placeholder step or TODO records source CWL step, expected
  input/output shape, and the likely downstream owner. It should be enough for
  later tool-discovery or per-step implementation to start.

## Case: collection inputs use gxformat2-compatible structure

- fixture: a brief with Galaxy collection or paired/paired_or_unpaired-shaped
  inputs.
- expect: gxformat2 input entries use valid `type`, `collection_type`, `format`,
  and `optional` shapes. The parts of the draft that are not TODO stubs must
  parse as gxformat2 — TODO is allowed on values, not on the shape of the
  surrounding structure.

## Case: outputs labeled

- fixture: interface brief naming workflow outputs, plus emitted draft.
- expect: `workflow_outputs` carry the labels the interface brief named, so a
  later test plan can reference them by name.

## Case: IWC findings are guidance, not hidden rewrites

- fixture: interface/data-flow briefs plus high- and low-confidence IWC
  comparison notes.
- expect: high-confidence structural findings may alter the skeleton;
  low-confidence findings are carried as TODO/review notes. The emitted workflow
  should make applied IWC guidance traceable.
