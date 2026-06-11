---
type: mold
name: compare-against-iwc-exemplar
axis: target-specific
target: galaxy
tags:
  - mold
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-06-11
revision: 7
ai_generated: true
summary: "Find nearest IWC exemplar(s) and surface a structural diff against the upstream Galaxy design briefs to guide template authoring."
input_artifacts:
  - id: nextflow-galaxy-interface
    description: "Galaxy interface brief from [[nextflow-summary-to-galaxy-interface]] when running the NEXTFLOW → GALAXY pipeline."
  - id: nextflow-galaxy-data-flow
    description: "Galaxy data-flow brief from [[nextflow-summary-to-galaxy-data-flow]] when running the NEXTFLOW → GALAXY pipeline."
  - id: cwl-galaxy-interface
    description: "Galaxy interface brief from [[cwl-summary-to-galaxy-interface]] when running the CWL → GALAXY pipeline."
  - id: cwl-galaxy-data-flow
    description: "Galaxy data-flow brief from [[cwl-summary-to-galaxy-data-flow]] when running the CWL → GALAXY pipeline."
  - id: freeform-galaxy-interface
    description: "Galaxy interface brief from [[freeform-summary-to-galaxy-interface]] when running the PAPER → GALAXY or INTERVIEW → GALAXY pipelines."
  - id: freeform-galaxy-data-flow
    description: "Galaxy data-flow brief from [[freeform-summary-to-galaxy-data-flow]] when running the PAPER → GALAXY or INTERVIEW → GALAXY pipelines."
output_artifacts:
  - id: iwc-comparison-notes
    kind: markdown
    default_filename: iwc-comparison-notes.md
    description: "Structural diff against the nearest IWC exemplar(s); guidance for the downstream *-summary-to-galaxy-template Mold before per-step authoring. Carries an inline, bounded gxformat2 excerpt of the nearest exemplar's relevant subgraph under a labeled section, cross-referencing the iwc-exemplar-gxformat2 sibling file."
  - id: iwc-exemplar-gxformat2
    kind: yaml
    default_filename: iwc-exemplar.gxwf.yml
    description: "Cleaned gxformat2 conversion (via [[convert]] --to format2 --compact) of the nearest IWC exemplar's relevant subgraph — the concrete idiom the downstream template draft pattern-matches against. Bounded to the relevant subgraph, not the whole workflow. Absent when no nearest exemplar is found."
references:
  - kind: cli-command
    ref: "[[convert]]"
    used_at: runtime
    load: on-demand
    mode: sidecar
    evidence: corpus-observed
    purpose: "Normalize fetched IWC workflows into a consistent representation for structural comparison, and surface the nearest exemplar forward as a cleaned gxformat2 view (sibling file plus inline excerpt) for the downstream template Mold."
    trigger: "After fetching a candidate IWC workflow file and before structural comparison; and again on the nearest exemplar after ranking to emit the iwc-exemplar-gxformat2 view."
  - kind: research
    ref: "[[galaxy-data-flow-draft-contract]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: hypothesis
    purpose: "Compare against the design briefs' abstract intent without turning exemplar comparison into tool resolution."
    trigger: "When deciding whether to compare abstract data-flow shape, interface structure, or speculative implementation details."
    verification: "Promote after exemplar comparison flags structural issues without resolving concrete tool metadata."
  - kind: research
    ref: "[[iwc-test-data-conventions]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Compare proposed test-data placement and fixture shapes against IWC conventions."
    trigger: "When the design briefs hint at workflow tests or input fixture organization."
  - kind: research
    ref: "[[iwc-shortcuts-anti-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Flag proposed shortcuts that are accepted in IWC versus shortcuts that should be treated as smells."
    trigger: "When the design briefs propose tests, assertions, labels, or expected-output comparisons."
---
# compare-against-iwc-exemplar

Find the nearest IWC exemplar workflow(s) for the upstream Galaxy design briefs and emit a structural diff that guides the downstream `*-summary-to-galaxy-template` Mold before per-step authoring effort is spent.

This Mold is the corpus-first check in Galaxy-targeting pipelines. It runs after the source-specific interface and data-flow briefs and before the gxformat2 template Mold. Discovery, ranking, and comparison are one action — there is no separate retrieval Mold.

## Procedure

- Clone or pull and merge the IWC corpus (`https://github.com/galaxyproject/iwc`) to `~/.foundry/iwc`.
- Normalize candidate workflows with [[convert]] as needed for structural comparison.
- Find the closest workflow and rank it.
- Surface the nearest exemplar forward (skip when the result is "no nearest exemplar"): see *Nearest exemplar (gxformat2) view*.

## Feature Hierarchy

1. Domain or analysis intent.
2. Input collection topology.
3. Primary tool families.
4. DAG motifs and structural recipes.
5. Output types and report shape.
6. Test style and fixture topology.

Domain comes first so a structurally similar workflow in the wrong science area does not become a misleading exemplar. Topology comes second because collection shape is one of the most important Galaxy-specific design decisions. Test style is useful after a workflow match, but should not drive initial retrieval. Briefs with no domain signal should not produce a high-confidence exemplar even if they share generic tools.

## Confidence Levels

| Level | Meaning |
|---|---|
| High | Same domain/subdomain, same input topology, same primary tool families, same major DAG motifs, and matching test fixture shape. |
| Medium | Same domain and topology, but partial tool-family or output match. Useful exemplar, not canonical. |
| Low | Cross-domain structural match only. Useful for a pattern comparison, not a nearest domain exemplar. |
| No nearest exemplar | Candidate lacks domain or topology alignment, or only shares generic tools such as MultiQC. |

## Routing findings forward

Each finding should name the authoring surface most likely to own the fix:

- Template/data-flow issue: missing node, wrong collection shape, wrong branch, placeholder too vague — surfaced for the downstream `*-summary-to-galaxy-template` Mold to apply.
- Pattern issue: recurring Galaxy idiom should become or update a pattern page.
- Tool-step issue: exact wrapper or parameterization will be handled later in the per-step loop.
- Test issue: defer to `*-test-to-galaxy-test-plan` or `implement-galaxy-workflow-test`.

Do not block downstream authoring on low-confidence exemplar mismatches. Report them as review guidance for the template Mold and the user.

## Nearest exemplar (gxformat2) view

The schema tells the template Mold what is *legal* gxformat2; it does not show *idiom*. A real, domain-adjacent gxformat2 workflow is high-value signal for constructing the draft — input/collection shapes, map-over wiring, output promotion, post-job actions. Agents have seen far more legacy `.ga` JSON than gxformat2 YAML in training, so surface the converted view rather than leaving it as prose.

Once the nearest exemplar is chosen (High or Medium confidence):

- Convert it with [[convert]] (`--to format2 --compact`).
- Write the cleaned gxformat2 of the **relevant subgraph** to the `iwc-exemplar.gxwf.yml` sibling artifact — the slice that matches the briefs' structure, not the whole workflow.
- Inline a bounded excerpt (~10–40 lines) of that subgraph under a labeled section in `iwc-comparison-notes.md`, and cite the abstract IWC workflow ID (e.g. `transcriptomics/rnaseq-pe/rnaseq-pe`) plus the step labels it covers. Cross-reference the sibling file for the fuller view.

Keep it size-bounded — a whole large workflow is noise; the relevant subgraph is the signal. When the result is "no nearest exemplar," emit neither the sibling file nor the excerpt. A Low-confidence cross-domain match may surface a short excerpt for pattern comparison but should be labeled as such, not as a domain exemplar.

## Non-goals

- **No tool discovery.** Do not replace [[discover-shed-tool]].
- **No automatic rewrite.** This Mold emits structural diff guidance; the harness or user decides which changes to apply.
- **No forced nearest.** A no-match result is valid when IWC lacks a close exemplar.
