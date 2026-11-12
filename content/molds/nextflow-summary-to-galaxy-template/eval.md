# nextflow-summary-to-galaxy-template eval

Evaluation plan for the `nextflow-summary-to-galaxy-template` Mold. This file is
the **abstract oracle**: properties any emitted skeleton must satisfy,
independent of fixture. The template is a draft scaffold, so these properties
check structural validity and handoff quality rather than final executable
workflows. Concrete fixtures and their expected values live in `scenarios.md`;
the oracle here is applied to whatever a scenario produces.

## Property: emitted skeleton validates structurally

- bucket: schema
- check: deterministic + llm-judged
- assertion: any emitted `galaxy-workflow-draft.gxwf.yml` has no gxformat2
  structural or encoding errors under `gxwf draft-validate --json` (plain
  `gxwf validate` rejects the `GalaxyWorkflowDraft` class). Missing concrete
  tool IDs may be skipped or clearly marked as TODOs rather than invented or
  silently dropped.

## Property: skeleton preserves prior design decisions

- bucket: handoff
- check: llm-judged
- assertion: workflow inputs, outputs, placeholder steps, and TODO notes reflect
  the prior interface and data-flow briefs. The template may simplify, but it
  must not silently contradict a high-confidence upstream decision.

## Property: TODO placeholders are actionable

- bucket: utility
- check: llm-judged
- assertion: each placeholder step or TODO records source process/operator
  context, expected input/output shape, and the likely downstream owner. It
  should be enough for later tool-discovery or per-step implementation to start.

## Property: source arguments reach `_plan_state` unchanged

- bucket: handoff
- check: deterministic + llm-judged
- assertion: every non-Resolved tool step with at least one `resolved_args`
  entry whose selector can match the call it translates has a `_plan_state`
  that parses as a YAML mapping with `resolved_args` and `intent`. Each listed entry has `process` set, and
  its `key`, `expression`, `selector`, `config`, and any `profile` equal an
  entry of that process in `summary-nextflow.json`. No entry whose selector
  can match the translated call is missing, and none whose selector names a
  different alias is present. A step with no applicable entry keeps a
  plain-text `_plan_state`. A Resolved step with applicable entries has, in
  the re-emitted ledger, a disposition for every flag instead. A
  paraphrase of the flags in place of the entries is a failure.

## Property: collection inputs use gxformat2-compatible structure

- bucket: schema
- check: deterministic
- assertion: gxformat2 input entries for Galaxy collection or sample-sheet-shaped
  inputs use valid `type`, `collection_type`, `format`, and `optional` shapes.
  Schema details such as `format` array/null behavior are validated rather than
  trusted from prose.

## Property: IWC findings are guidance, not hidden rewrites

- bucket: utility
- check: llm-judged
- assertion: high-confidence structural IWC findings may alter the skeleton;
  low-confidence findings are carried as TODO/review notes. The emitted workflow
  should make applied IWC guidance traceable.
