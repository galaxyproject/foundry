---
type: mold
name: nextflow-to-test-data
axis: source-specific
source: nextflow
tags:
  - source/nextflow
status: reviewed
created: 2026-07-17
revised: 2026-09-15
revision: 3
summary: "Resolve a Nextflow pipeline's own declared test fixtures into Galaxy workflow test-data refs."
input_artifacts:
  - id: summary-nextflow
    description: "Structured Nextflow summary from [[summarize-nextflow]]; carries the enumerated `test_candidates[]` and explicit `test_selection`, with each candidate input represented by a role plus url/path, sha1, and filetype."
  - id: nextflow-galaxy-interface
    description: "Galaxy interface brief from [[nextflow-summary-to-galaxy-interface]] pinning the workflow input labels, collection shapes, and datatypes each resolved fixture must map onto."
output_artifacts:
  - id: test-data-refs
    kind: json
    default_filename: test-data-refs.json
    description: "Test data resolved from the pipeline's declared fixtures, expressed as URLs/paths plus expected shapes for downstream test authoring. Shared id with [[find-test-data]] — the branch's search fallback fills only the inputs this Mold leaves unresolved."
references:
  - kind: schema
    ref: "[[summary-nextflow]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Input contract: read `test_selection` and the chosen `test_candidates[].inputs[]` — role, url/path, sha1, filetype — as the declared source of test data."
  - kind: research
    ref: "[[component-nextflow-testing]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: hypothesis
    purpose: "Interpret nf-test profiles and fixture conventions before mapping declared fixtures onto Galaxy inputs."
    trigger: "When `test_selection` requires a scope choice or the selected candidate does not cover every workflow input."
    verification: "Map nf-core/bacass declared fixtures onto its Galaxy interface and confirm this note improves profile/fixture selection."
  - kind: research
    ref: "[[galaxy-workflow-testability-design]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Map each declared fixture to an addressable Galaxy input label and the collection shape it must populate."
    trigger: "When mapping a declared fixture (often a samplesheet-driven input) onto a Galaxy input's collection shape."
  - kind: research
    ref: "[[iwc-test-data-conventions]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Express each ref remote-URL-first with SHA-1 integrity and per-input collection layout when recording resolved fixtures."
    trigger: "When writing each `test-data-refs` entry."
---
# nextflow-to-test-data

Resolve the Nextflow pipeline's own declared test fixtures into Galaxy `test-data-refs`. The Nextflow summary carries every statically visible whole-pipeline case in `test_candidates[]` and records the default decision in `test_selection`. Each candidate owns its effective profiles, parameter delta, inputs, outputs, execution mode, scope, and assertions. Map the selected candidate's inputs onto the Galaxy workflow and emit one ref per input, ready for [[implement-galaxy-workflow-test]] to stage. If selection is unresolved, surface that scope decision before resolving data rather than silently choosing by profile name.

This Mold is the source-specific first leg of the harness's `test-data-resolution` branch. It resolves what the pipeline itself declares; any input it cannot resolve from a declared fixture stays a reported gap and the harness falls through to [[find-test-data]] (search), then to `user-supplied`. Deciding to fall through is a harness concern, not this Mold's — its job is an honest map of the pipeline's own fixtures.

## Sequence

1. **Enumerate Galaxy inputs and their required shape.** From the interface brief, list each workflow input: label, Galaxy collection shape (File / list / paired / list:paired / record), and datatype. This is the *target shape* every ref must satisfy.
2. **Resolve the candidate.** Read `test_selection`. If it names a candidate, collect that candidate's declared inputs: `role`, `url`/`path`, `sha1`, `filetype`, and description. If it reports `needs-scope-choice`, compare the candidates' scope, execution mode, and input coverage and record the caller's choice; do not infer scale or representativeness from a profile name alone.
3. **Map each declared fixture onto a Galaxy input.** Match by role and shape onto the interface's input labels. A samplesheet-driven Nextflow input often expands into a Galaxy collection — record the element identifiers and any split/concatenation prep needed to reach the Galaxy collection shape ([[galaxy-workflow-testability-design]]).
4. **Emit refs.** Write one `test-data-refs.json` entry per resolved input: prefer the declared remote `url` + `sha1` (remote-URL-first, [[iwc-test-data-conventions]]); fall back to the in-tree `path` plus provenance only when no URL is published. Carry datatype, collection element identifiers, and any subset/split prep. Each entry maps to an addressable workflow input label.
5. **Report genuine gaps.** An input with no declared fixture of the right shape stays `resolved: false` with a reason — this is what the harness hands to [[find-test-data]]. Do not search public sources here; searching is find-test-data's job, not this Mold's.

## No fabrication

Never invent a URL, accession, or path, and never emit a placeholder for an input you could not resolve from a declared fixture. A declared fixture with no published URL is recorded by its in-tree `path` plus provenance, not papered over with a guessed URL. Every emitted ref points at data the pipeline actually declares; everything else is an honest gap for the next leg of the branch.
