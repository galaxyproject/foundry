---
type: mold
name: cwl-summary-to-galaxy-data-flow
axis: source-specific
source: cwl
target: galaxy
tags:
  - mold
  - source/cwl
  - target/galaxy
status: draft
created: 2026-05-05
revised: 2026-05-10
revision: 2
ai_generated: true
summary: "Translate a CWL summary into a Galaxy data-flow design brief."
input_artifacts:
  - id: summary-cwl
    description: "Structured CWL summary emitted by [[summarize-cwl]]; consumed alongside the Galaxy interface brief."
  - id: cwl-galaxy-interface
    description: "Preceding Galaxy interface brief from [[cwl-summary-to-galaxy-interface]] that pins inputs, outputs, and labels."
output_artifacts:
  - id: cwl-galaxy-data-flow
    kind: markdown
    default_filename: cwl-galaxy-data-flow.md
    description: "Reviewable Markdown brief: abstract topology, Galaxy collection semantics, placeholder transformations, unresolved Galaxy tool needs."
references:
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
related_notes:
  - "[[summary-cwl]]"
  - "[[cwl-summary-to-galaxy-interface]]"
  - "[[component-cwl-workflow-anatomy]]"
---
# cwl-summary-to-galaxy-data-flow

Read a CWL summary plus the preceding Galaxy interface brief and emit a reviewable Markdown data-flow brief. Capture abstract topology, Galaxy collection semantics, placeholder transformations, unresolved Galaxy tool needs, confidence, and open questions.

CWL already carries structured workflow shape, so this Mold should be lighter than [[nextflow-summary-to-galaxy-data-flow]].

Start from `summary-cwl.graph.edges[]` instead of rediscovering the DAG. The main work is translation pressure: CWL scatter into Galaxy map-over or collection steps, `linkMerge`/`pickValue` into explicit fan-in choices, secondary files into output contracts, and `valueFrom`/`when` into reviewable placeholders when Galaxy cannot express them directly.
