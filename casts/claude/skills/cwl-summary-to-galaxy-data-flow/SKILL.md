---
name: cwl-summary-to-galaxy-data-flow
description: "Translate a CWL summary into a Galaxy data-flow design brief."
---

# cwl-summary-to-galaxy-data-flow

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Translate a CWL summary into a Galaxy data-flow design brief.

## Inputs

- Read artifact `summary-cwl`. Schema: summary-cwl. Produced by `summarize-cwl`. Structured CWL summary emitted by summarize-cwl; consumed alongside the Galaxy interface brief.
- Read artifact `cwl-galaxy-interface`. Produced by `cwl-summary-to-galaxy-interface`. Preceding Galaxy interface brief from cwl-summary-to-galaxy-interface that pins inputs, outputs, and labels.
- Read artifact `open-requirements-ledger`. Produced by `advance-galaxy-draft-step`, `apply-galaxy-workflow-changeset`, `compare-against-iwc-exemplar`, `cwl-summary-to-galaxy-data-flow`, `cwl-summary-to-galaxy-interface`, `cwl-summary-to-galaxy-template`, `freeform-summary-to-galaxy-data-flow`, `freeform-summary-to-galaxy-interface`, `freeform-summary-to-galaxy-template`, `implement-galaxy-tool-step`, `interview-to-galaxy-workflow-changeset`, `nextflow-summary-to-galaxy-data-flow`, `nextflow-summary-to-galaxy-interface`, `nextflow-summary-to-galaxy-reference-data`, `nextflow-summary-to-galaxy-template`, `repair-galaxy-draft-topology`. Carried obligations ledger open-requirements-ledger: read prior open entries; this design step appends new unmet needs and marks ones its decisions resolve.

## Outputs

- Write artifact `cwl-galaxy-data-flow` as `cwl-galaxy-data-flow.md`. Format: `markdown`. Reviewable Markdown brief: abstract topology, Galaxy collection semantics, placeholder transformations, unresolved Galaxy tool needs.
- Write artifact `open-requirements-ledger` as `open-requirements.ledger.yml`. Format: `yaml`. Updated obligations ledger: new unmet needs this step surfaces appended; prior entries its decisions close marked resolved.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- `references/notes/component-cwl-workflow-anatomy.md`: Research note copied verbatim into the bundle. Use CWL's native graph and mark only the features that need Galaxy reinterpretation.
- `references/notes/cwl-when-pickvalue-to-galaxy-branching.md`: Research note copied verbatim into the bundle. Default reference for translating CWL when:/pickValue branching: pick among `paired_or_unpaired` collection input, native `pick_value` workflow step, or sibling workflows per mode.
- `references/notes/galaxy-data-flow-draft-contract.md`: Research note copied verbatim into the bundle. Keep the data-flow brief separate from gxformat2 templating and concrete step implementation.
- `references/notes/open-requirements-ledger.md`: Research note copied verbatim into the bundle. Carry the open-requirements ledger: read open entries bearing on this step's decisions, mark resolved the ones it closes, and append any new unmet need it surfaces.
- `references/schemas/summary-cwl.schema.json`: Schema file copied verbatim into the bundle. Read CWL step graph, edge markers, scatter, conditionals, secondary files, and tool requirements while drafting Galaxy-facing data flow.

## Load On Demand

- `references/patterns/galaxy-collection-patterns.md`: Pattern note copied verbatim into the bundle. Ground collection reshape, relabel, cleanup, and map-over choices in corpus-observed Galaxy recipes. Use when: cWL scatter, arrays, nested arrays, records, or secondary-file contracts require explicit Galaxy collection operations.
- `references/patterns/galaxy-conditionals-patterns.md`: Pattern note copied verbatim into the bundle. Ground conditional-branch and optional-step choices in curated, corpus-observed Galaxy when/pick_value patterns. Use when: data-flow translation needs optional steps, gating on non-empty results, routing between alternative outputs, or transform-or-pass-through branches.
- `references/patterns/galaxy-interval-patterns.md`: Pattern note copied verbatim into the bundle. Ground genomic-interval operation choices in curated, corpus-observed Galaxy interval recipes. Use when: the workflow operates on genomic intervals (BED/GFF/VCF coordinate features) and data-flow translation needs overlap, merge, coverage, windowing, masking, or set-algebra steps.
- `references/notes/cwl-pickvalue-to-galaxy.md`: Research note copied verbatim into the bundle. Map CWL pickValue (first_non_null / the_only_non_null / all_non_null) on workflow outputs or step inputs into Galaxy's native `pick_value` workflow module added by galaxy#22222. Use when: any summary-cwl edge `via` contains a `pickValue:*` marker, OR any workflow_outputs[].output_source is multi-valued with pickValue, OR any steps[].in[].pick_value is non-null in the source workflow or referenced subworkflows.
- `references/notes/galaxy-collection-semantics.md`: Research note copied verbatim into the bundle. Translate CWL arrays, records, scatter, and secondary-file shapes into Galaxy dataset and collection semantics. Use when: cWL input/output or step wiring implies Galaxy collections, map-over, reduction, or shape changes.
- `references/notes/galaxy-collection-semantics.upstream.myst`: Companion file copied verbatim into the bundle. Sibling of `references/notes/galaxy-collection-semantics.md`; read it where that note directs.
- `references/notes/galaxy-collection-semantics.yml`: Companion file copied verbatim into the bundle. Sibling of `references/notes/galaxy-collection-semantics.md`; read it where that note directs.
- `references/notes/galaxy-paired-or-unpaired-collections.md`: Research note copied verbatim into the bundle. When the interface brief adopted a `paired_or_unpaired` shape, model inner-tool branching via `has_single_item` semantics instead of a Galaxy-level mode switch. Use when: the preceding cwl-galaxy-interface brief uses `paired_or_unpaired` (or `list:paired_or_unpaired`) as a workflow input, OR the data-flow brief is considering it as an option.

## Validation

- None declared.

## Procedure

Read a CWL summary plus the preceding Galaxy interface brief and emit a reviewable Markdown data-flow brief. Capture abstract topology, Galaxy collection semantics, placeholder transformations, unresolved Galaxy tool needs, confidence, and open questions.

CWL already carries structured workflow shape, so this skill should be lighter than nextflow-summary-to-galaxy-data-flow.

Start from `summary-cwl.graph.edges[]` instead of rediscovering the DAG. The main work is translation pressure: CWL scatter into Galaxy map-over or collection steps, `linkMerge`/`pickValue` into explicit fan-in choices, secondary files into output contracts, and `valueFrom`/`when` into reviewable placeholders when Galaxy cannot express them directly.

Carry the open-requirements-ledger through this step: read the open entries that bear on the choices you make here, mark resolved any your decisions close, and append any new unmet need you surface — a declared output with no producer, an unpinned parameter, a tool with no corpus exemplar — so a later skill inherits it instead of re-deriving it.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
