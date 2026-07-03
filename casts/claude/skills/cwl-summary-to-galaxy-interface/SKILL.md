---
name: cwl-summary-to-galaxy-interface
description: "Map a CWL summary into a Galaxy workflow interface design brief."
---

# cwl-summary-to-galaxy-interface

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Map a CWL summary into a Galaxy workflow interface design brief.

## Inputs

- Read artifact `summary-cwl`. Schema: summary-cwl. Produced by `summarize-cwl`. Structured CWL summary emitted by summarize-cwl; the source-of-truth JSON for Galaxy interface choices.
- Read artifact `open-requirements-ledger`. Produced by `advance-galaxy-draft-step`, `apply-galaxy-workflow-changeset`, `compare-against-iwc-exemplar`, `cwl-summary-to-galaxy-data-flow`, `cwl-summary-to-galaxy-interface`, `cwl-summary-to-galaxy-template`, `freeform-summary-to-galaxy-data-flow`, `freeform-summary-to-galaxy-interface`, `freeform-summary-to-galaxy-template`, `implement-galaxy-tool-step`, `interview-to-galaxy-workflow-changeset`, `nextflow-summary-to-galaxy-data-flow`, `nextflow-summary-to-galaxy-interface`, `nextflow-summary-to-galaxy-reference-data`, `nextflow-summary-to-galaxy-template`, `repair-galaxy-draft-topology`. Carried obligations ledger open-requirements-ledger: read prior open entries; this design step appends new unmet needs and marks ones its decisions resolve.

## Outputs

- Write artifact `cwl-galaxy-interface` as `cwl-galaxy-interface.md`. Format: `markdown`. Reviewable Markdown brief: Galaxy workflow inputs, outputs, labels, exposed and checkpoint outputs, source provenance, confidence.
- Write artifact `open-requirements-ledger` as `open-requirements.ledger.yml`. Format: `yaml`. Updated obligations ledger: new unmet needs this step surfaces appended; prior entries its decisions close marked resolved.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- `references/notes/component-cwl-workflow-anatomy.md`: Research note copied verbatim into the bundle. Keep source-faithful CWL facts separate from Galaxy-facing interface choices.
- `references/notes/open-requirements-ledger.md`: Research note copied verbatim into the bundle. Carry the open-requirements ledger: read open entries bearing on this step's decisions, mark resolved the ones it closes, and append any new unmet need it surfaces.
- `references/schemas/summary-cwl.schema.json`: Schema file copied verbatim into the bundle. Read CWL workflow inputs, outputs, types, formats, secondary files, scatter, and requirement evidence before choosing the Galaxy interface.

## Load On Demand

- `references/notes/cwl-when-pickvalue-to-galaxy-branching.md`: Research note copied verbatim into the bundle. Pick among the three honest Galaxy branching translations (paired_or_unpaired input, native pick_value step, sibling workflows) before drafting the interface. Use when: summary-cwl has any steps[].when non-null OR any workflow output uses pickValue.
- `references/notes/galaxy-collection-semantics.md`: Research note copied verbatim into the bundle. Choose Galaxy collection input shapes from CWL arrays, scatter inputs, records, Directory values, and secondary-file contracts. Use when: cWL types include arrays, records, Directory, secondaryFiles, or scatter over File-like inputs.
- `references/notes/galaxy-collection-semantics.upstream.myst`: Companion file copied verbatim into the bundle. Sibling of `references/notes/galaxy-collection-semantics.md`; read it where that note directs.
- `references/notes/galaxy-collection-semantics.yml`: Companion file copied verbatim into the bundle. Sibling of `references/notes/galaxy-collection-semantics.md`; read it where that note directs.
- `references/notes/galaxy-paired-or-unpaired-collections.md`: Research note copied verbatim into the bundle. Choose `paired_or_unpaired` (or `list:paired_or_unpaired`) shape when the CWL discriminator is paired-vs-single reads, instead of inventing a workflow-level `reads_mode` select parameter. Use when: summary-cwl declares 2+ optional File? read-like inputs whose step bindings are gated by complementary `when:` predicates, OR workflow outputs use pickValue over branches keyed on input presence, OR an upstream `meta.single_end`-style discriminator surfaces in the summary.
- `references/notes/galaxy-workflow-testability-design.md`: Research note copied verbatim into the bundle. Choose stable Galaxy workflow input/output labels and promoted checkpoint outputs. Use when: deciding labels, public outputs, checkpoint outputs, or fixture-compatible collection inputs.

## Validation

- None declared.

## Procedure

Read a CWL summary and emit a reviewable Markdown interface brief for a Galaxy workflow. Preserve CWL input/output intent while choosing Galaxy-facing labels, data shapes, exposed outputs, checkpoint outputs, provenance, confidence, and open questions.

The output is a design handoff, not gxformat2 and not a rich workflow schema.

Prefer direct mappings when they are honest: CWL scalar inputs become Galaxy parameter inputs, `File` inputs become dataset inputs, `File[]` plus scatter commonly becomes a `list` collection, and declared formats seed Galaxy datatype choices. Surface `Directory`, records, expression-shaped defaults, and secondary-file-heavy outputs as review notes rather than flattening them silently.

Carry the open-requirements-ledger through this step: read the open entries that bear on the choices you make here, mark resolved any your decisions close, and append any new unmet need you surface — a declared output with no producer, an unpinned parameter, a tool with no corpus exemplar — so a later skill inherits it instead of re-deriving it.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
