---
type: mold
name: cwl-summary-to-galaxy-data-flow
axis: source-specific
source: cwl
target: galaxy
tags:
  - source/cwl
  - target/galaxy
status: draft
created: 2026-05-05
revised: 2026-08-19
revision: 3
summary: "Translate a CWL summary into a Galaxy data-flow design brief."
input_artifacts:
  - id: summary-cwl
    description: "Structured CWL summary emitted by [[summarize-cwl]]; consumed alongside the Galaxy interface brief."
  - id: cwl-galaxy-interface
    description: "Preceding Galaxy interface brief from [[cwl-summary-to-galaxy-interface]] that pins inputs, outputs, and labels."
  - id: open-requirements-ledger
    description: "Carried obligations ledger [[open-requirements-ledger]]: the run's open, resolved, and surrendered entries with their provenance. Absent on the first Mold of a run; start an empty one."
output_artifacts:
  - id: cwl-galaxy-data-flow
    kind: markdown
    default_filename: cwl-galaxy-data-flow.md
    description: "Reviewable Markdown brief: abstract topology, Galaxy collection semantics, placeholder transformations, unresolved Galaxy tool needs."
  - id: open-requirements-ledger
    kind: yaml
    default_filename: open-requirements.ledger.yml
    description: "Carried obligations ledger re-emitted by this step: entries it appended or closed updated, every other entry passed through with its provenance intact."
references:
  - kind: research
    ref: "[[open-requirements-ledger]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Inherit open entries rather than re-deriving them, close the ones this brief's wiring and collection decisions settle, and append data-flow obligations the CWL summary can't settle — a scatter shape Galaxy can't express directly, an expression-derived value with no Galaxy equivalent, a `linkMerge`/`pickValue` fan-in with no settled Galaxy form."
    verification: "Promote after a worked run shows entries this Mold appends or resolves are consumed downstream without re-derivation."
  - kind: schema
    ref: "[[summary-cwl]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: cast-validated
    purpose: "Read CWL step graph, edge markers, scatter, conditionals, secondary files, and tool requirements while drafting Galaxy-facing data flow."
  - kind: research
    ref: "[[component-cwl-workflow-anatomy]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Use CWL's native graph and mark only the features that need Galaxy reinterpretation."
    verification: "Run against representative CWL summaries with scatter, secondaryFiles, and valueFrom; confirm the brief starts from summary-cwl graph edges and only adds Galaxy-specific reshape decisions."
  - kind: research
    ref: "[[galaxy-data-flow-draft-contract]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Keep the data-flow brief separate from gxformat2 templating and concrete step implementation."
    verification: "Promote after two worked CWL-to-Galaxy translations preserve this Mold boundary without moving fields."
  - kind: research
    ref: "[[galaxy-collection-semantics]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Translate CWL arrays, records, scatter, and secondary-file shapes into Galaxy dataset and collection semantics."
    trigger: "When CWL input/output or step wiring implies Galaxy collections, map-over, reduction, or shape changes."
  - kind: pattern
    ref: "[[galaxy-collection-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Ground collection reshape, relabel, cleanup, and map-over choices in corpus-observed Galaxy recipes."
    trigger: "When CWL scatter, arrays, nested arrays, records, or secondary-file contracts require explicit Galaxy collection operations."
  - kind: pattern
    ref: "[[galaxy-conditionals-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Ground conditional-branch and optional-step choices in curated, corpus-observed Galaxy when/pick_value patterns."
    trigger: "When data-flow translation needs optional steps, gating on non-empty results, routing between alternative outputs, or transform-or-pass-through branches."
  - kind: pattern
    ref: "[[galaxy-interval-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Ground genomic-interval operation choices in curated, corpus-observed Galaxy interval recipes."
    trigger: "When the workflow operates on genomic intervals (BED/GFF/VCF coordinate features) and data-flow translation needs overlap, merge, coverage, windowing, masking, or set-algebra steps."
  - kind: research
    ref: "[[cwl-pickvalue-to-galaxy]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Map CWL pickValue (first_non_null / the_only_non_null / all_non_null) on workflow outputs or step inputs into Galaxy's native `pick_value` workflow module added by galaxy#22222."
    trigger: "When any summary-cwl edge `via` contains a `pickValue:*` marker, OR any workflow_outputs[].output_source is multi-valued with pickValue, OR any steps[].in[].pick_value is non-null in the source workflow or referenced subworkflows."
  - kind: research
    ref: "[[cwl-when-pickvalue-to-galaxy-branching]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Default reference for translating CWL when:/pickValue branching: pick among `paired_or_unpaired` collection input, native `pick_value` workflow step, or sibling workflows per mode."
  - kind: research
    ref: "[[galaxy-paired-or-unpaired-collections]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "When the interface brief adopted a `paired_or_unpaired` shape, model inner-tool branching via `has_single_item` semantics instead of a Galaxy-level mode switch."
    trigger: "When the preceding cwl-galaxy-interface brief uses `paired_or_unpaired` (or `list:paired_or_unpaired`) as a workflow input, OR the data-flow brief is considering it as an option."
related_notes:
  - "[[summary-cwl]]"
  - "[[cwl-summary-to-galaxy-interface]]"
  - "[[component-cwl-workflow-anatomy]]"
  - "[[cwl-pickvalue-to-galaxy]]"
  - "[[cwl-when-pickvalue-to-galaxy-branching]]"
  - "[[galaxy-paired-or-unpaired-collections]]"
---
# cwl-summary-to-galaxy-data-flow

Read a CWL summary plus the preceding Galaxy interface brief and emit a reviewable Markdown data-flow brief. Capture abstract topology, Galaxy collection semantics, placeholder transformations, unresolved Galaxy tool needs, confidence, and open questions.

CWL already carries structured workflow shape, so this Mold should be lighter than [[nextflow-summary-to-galaxy-data-flow]].

Start from `summary-cwl.graph.edges[]` instead of rediscovering the DAG. The main work is translation pressure: CWL scatter into Galaxy map-over or collection steps, `linkMerge`/`pickValue` into explicit fan-in choices, secondary files into output contracts, and `valueFrom`/`when` into reviewable placeholders when Galaxy cannot express them directly.
