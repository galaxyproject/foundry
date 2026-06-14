# nextflow-summary-to-galaxy-template scenarios

Concrete cases for `nextflow-summary-to-galaxy-template`, exercised against the
abstract properties in `eval.md`. Each case binds a fixture and states its
expected values; the `eval.md` oracle is applied to whatever the case produces.

## Case: demo skeleton validates structurally

- fixture: committed `nf-core__demo` summary, interface brief, data-flow brief,
  and optional IWC comparison notes.
- expect: emitted `galaxy-workflow-draft.gxwf.yml` has no gxformat2 structural or
  encoding errors under `gxwf validate --json`. Missing concrete tool IDs may be
  skipped or clearly marked as TODOs.

## Case: skeleton preserves prior design decisions

- fixture: any source summary plus interface/data-flow briefs containing explicit
  inputs, outputs, placeholders, and open questions.
- expect: workflow inputs, outputs, placeholder steps, and TODO notes reflect the
  prior briefs. The template may simplify, but it must not silently contradict a
  high-confidence upstream decision.

## Case: TODO placeholders are actionable

- fixture: a data-flow brief with unresolved tool needs and collection reshaping
  placeholders.
- expect: each placeholder step or TODO records source process/operator context,
  expected input/output shape, and the likely downstream owner. It should be
  enough for later tool-discovery or per-step implementation to start.

## Case: collection inputs use gxformat2-compatible structure

- fixture: a brief with Galaxy collection or sample-sheet-shaped inputs.
- expect: gxformat2 input entries use valid `type`, `collection_type`, `format`,
  and `optional` shapes. Schema details such as `format` array/null behavior are
  validated rather than trusted from prose.

## Case: IWC findings are guidance, not hidden rewrites

- fixture: interface/data-flow briefs plus high- and low-confidence IWC comparison
  notes.
- expect: high-confidence structural findings may alter the skeleton;
  low-confidence findings are carried as TODO/review notes. The emitted workflow
  should make applied IWC guidance traceable.
