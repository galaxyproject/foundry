---
type: mold
name: cwl-summary-to-galaxy-interface
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
summary: "Map a CWL summary into a Galaxy workflow interface design brief."
input_artifacts:
  - id: summary-cwl
    description: "Structured CWL summary emitted by [[summarize-cwl]]; the source-of-truth JSON for Galaxy interface choices."
output_artifacts:
  - id: cwl-galaxy-interface
    kind: markdown
    default_filename: cwl-galaxy-interface.md
    description: "Reviewable Markdown brief: Galaxy workflow inputs, outputs, labels, exposed and checkpoint outputs, source provenance, confidence."
references:
  - kind: schema
    ref: "[[summary-cwl]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: cast-validated
    purpose: "Read CWL workflow inputs, outputs, types, formats, secondary files, scatter, and requirement evidence before choosing the Galaxy interface."
  - kind: research
    ref: "[[component-cwl-workflow-anatomy]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Keep source-faithful CWL facts separate from Galaxy-facing interface choices."
    verification: "Run against the first representative CWL summaries and confirm workflow inputs/outputs map without re-parsing the original CWL."
  - kind: research
    ref: "[[galaxy-workflow-testability-design]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Choose stable Galaxy workflow input/output labels and promoted checkpoint outputs."
    trigger: "When deciding labels, public outputs, checkpoint outputs, or fixture-compatible collection inputs."
  - kind: research
    ref: "[[galaxy-collection-semantics]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Choose Galaxy collection input shapes from CWL arrays, scatter inputs, records, Directory values, and secondary-file contracts."
    trigger: "When CWL types include arrays, records, Directory, secondaryFiles, or scatter over File-like inputs."
  - kind: research
    ref: "[[galaxy-paired-or-unpaired-collections]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Choose `paired_or_unpaired` (or `list:paired_or_unpaired`) shape when the CWL discriminator is paired-vs-single reads, instead of inventing a workflow-level `reads_mode` select parameter."
    trigger: "When summary-cwl declares 2+ optional File? read-like inputs whose step bindings are gated by complementary `when:` predicates, OR workflow outputs use pickValue over branches keyed on input presence, OR an upstream `meta.single_end`-style discriminator surfaces in the summary."
  - kind: research
    ref: "[[cwl-when-pickvalue-to-galaxy-branching]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Pick among the three honest Galaxy branching translations (paired_or_unpaired input, native pick_value step, sibling workflows) before drafting the interface."
    trigger: "When summary-cwl has any steps[].when non-null OR any workflow output uses pickValue."
related_notes:
  - "[[summary-cwl]]"
  - "[[component-cwl-workflow-anatomy]]"
  - "[[galaxy-paired-or-unpaired-collections]]"
  - "[[cwl-when-pickvalue-to-galaxy-branching]]"
---
# cwl-summary-to-galaxy-interface

Read a CWL summary and emit a reviewable Markdown interface brief for a Galaxy workflow. Preserve CWL input/output intent while choosing Galaxy-facing labels, data shapes, exposed outputs, checkpoint outputs, provenance, confidence, and open questions.

The output is a design handoff, not gxformat2 and not a rich workflow schema.

Prefer direct mappings when they are honest: CWL scalar inputs become Galaxy parameter inputs, `File` inputs become dataset inputs, `File[]` plus scatter commonly becomes a `list` collection, and declared formats seed Galaxy datatype choices. Surface `Directory`, records, expression-shaped defaults, and secondary-file-heavy outputs as review notes rather than flattening them silently.
