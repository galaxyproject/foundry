---
name: compare-against-iwc-exemplar
description: "Find nearest IWC exemplar(s) and surface a structural diff against the upstream Galaxy design briefs to guide template authoring."
---

# compare-against-iwc-exemplar

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Find nearest IWC exemplar(s) and surface a structural diff against the upstream Galaxy design briefs to guide template authoring.

## Inputs

- Read artifact `nextflow-galaxy-interface`. Produced by `nextflow-summary-to-galaxy-interface`. Galaxy interface brief from nextflow-summary-to-galaxy-interface when running the NEXTFLOW → GALAXY pipeline.
- Read artifact `nextflow-galaxy-data-flow`. Produced by `nextflow-summary-to-galaxy-data-flow`. Galaxy data-flow brief from nextflow-summary-to-galaxy-data-flow when running the NEXTFLOW → GALAXY pipeline.
- Read artifact `cwl-galaxy-interface`. Produced by `cwl-summary-to-galaxy-interface`. Galaxy interface brief from cwl-summary-to-galaxy-interface when running the CWL → GALAXY pipeline.
- Read artifact `cwl-galaxy-data-flow`. Produced by `cwl-summary-to-galaxy-data-flow`. Galaxy data-flow brief from cwl-summary-to-galaxy-data-flow when running the CWL → GALAXY pipeline.
- Read artifact `freeform-galaxy-interface`. Produced by `freeform-summary-to-galaxy-interface`. Galaxy interface brief from freeform-summary-to-galaxy-interface when running the PAPER → GALAXY or INTERVIEW → GALAXY pipelines.
- Read artifact `freeform-galaxy-data-flow`. Produced by `freeform-summary-to-galaxy-data-flow`. Galaxy data-flow brief from freeform-summary-to-galaxy-data-flow when running the PAPER → GALAXY or INTERVIEW → GALAXY pipelines.

## Outputs

- Write artifact `iwc-comparison-notes` as `iwc-comparison-notes.md`. Format: `markdown`. Structural diff against the nearest IWC exemplar(s); guidance for the downstream *-summary-to-galaxy-template Mold before per-step authoring.

## Required Tools

- **`gxwf`** (gxwf). `npm install -g @galaxy-tool-util/cli`.
  Ephemeral run: `npx --package @galaxy-tool-util/cli gxwf`.
  Check: `gxwf --version`.
  Docs: https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli

## Load Upfront

- None declared.

## Load On Demand

- `references/cli/convert.json`: CLI command reference packaged as a sidecar. Normalize fetched IWC workflows into a consistent representation for structural comparison. Use when: after fetching a candidate IWC workflow file and before structural comparison.
- `references/patterns/galaxy-collection-patterns.md`: Pattern note copied verbatim into the bundle. Compare proposed collection transformations against curated corpus-observed pattern guidance. Use when: the data-flow brief proposes collection reshape, cleanup, relabel, synchronization, or collection-tabular bridge sections.
- `references/patterns/galaxy-tabular-patterns.md`: Pattern note copied verbatim into the bundle. Compare proposed tabular transformations against curated corpus-observed pattern guidance. Use when: the data-flow brief proposes tabular filtering, projection, join, aggregation, SQL, or free-form text-processing sections.
- `references/notes/galaxy-data-flow-draft-contract.md`: Research note copied verbatim into the bundle. Compare against the design briefs' abstract intent without turning exemplar comparison into tool resolution. Use when: deciding whether to compare abstract data-flow shape, interface structure, or speculative implementation details.
- `references/notes/iwc-shortcuts-anti-patterns.md`: Research note copied verbatim into the bundle. Flag proposed shortcuts that are accepted in IWC versus shortcuts that should be treated as smells. Use when: the design briefs propose tests, assertions, labels, or expected-output comparisons.
- `references/notes/iwc-test-data-conventions.md`: Research note copied verbatim into the bundle. Compare proposed test-data placement and fixture shapes against IWC conventions. Use when: the design briefs hint at workflow tests or input fixture organization.

## Validation

- None declared.

## Procedure

Find the nearest IWC exemplar workflow(s) for the upstream Galaxy design briefs and emit a structural diff that guides the downstream `*-summary-to-galaxy-template` skill before per-step authoring effort is spent.

This skill is the corpus-first check in Galaxy-targeting pipelines. It runs after the source-specific interface and data-flow briefs and before the gxformat2 template skill. Discovery, ranking, and comparison are one action — there is no separate retrieval skill.

### Procedure

- Clone or pull and merge the IWC `<url>` to `~/.foundry/iwc`.
- Normalize candidate workflows with convert as needed for structural comparison.
- Find the closest workflow and rank it.

### Feature Hierarchy

1. Domain or analysis intent.
2. Input collection topology.
3. Primary tool families.
4. DAG motifs and structural recipes.
5. Output types and report shape.
6. Test style and fixture topology.

Domain comes first so a structurally similar workflow in the wrong science area does not become a misleading exemplar. Topology comes second because collection shape is one of the most important Galaxy-specific design decisions. Test style is useful after a workflow match, but should not drive initial retrieval. Briefs with no domain signal should not produce a high-confidence exemplar even if they share generic tools.

### Confidence Levels

| Level | Meaning |
|---|---|
| High | Same domain/subdomain, same input topology, same primary tool families, same major DAG motifs, and matching test fixture shape. |
| Medium | Same domain and topology, but partial tool-family or output match. Useful exemplar, not canonical. |
| Low | Cross-domain structural match only. Useful for a pattern comparison, not a nearest domain exemplar. |
| No nearest exemplar | Candidate lacks domain or topology alignment, or only shares generic tools such as MultiQC. |

### Routing findings forward

Each finding should name the authoring surface most likely to own the fix:

- Template/data-flow issue: missing node, wrong collection shape, wrong branch, placeholder too vague — surfaced for the downstream `*-summary-to-galaxy-template` skill to apply.
- Pattern issue: recurring Galaxy idiom should become or update a pattern page.
- Tool-step issue: exact wrapper or parameterization will be handled later in the per-step loop.
- Test issue: defer to `*-test-to-galaxy-test-plan` or `implement-galaxy-workflow-test`.

Do not block downstream authoring on low-confidence exemplar mismatches. Report them as review guidance for the template skill and the user.

### Non-goals

- **No tool discovery.** Do not replace discover-shed-tool.
- **No automatic rewrite.** This skill emits structural diff guidance; the harness or user decides which changes to apply.
- **No forced nearest.** A no-match result is valid when IWC lacks a close exemplar.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
