---
type: meta
title: "Molds"
record_kind: foundation
order: 3
tags:
  - meta
status: reviewed
created: 2026-04-30
revised: 2026-08-06
revision: 22
summary: "The axes a Mold buckets on, the boundary against reference content, and where the Mold set is still uneven."
---

A Mold is the Foundry's unit of action: an abstract, typed source artifact that casting turns into a skill an agent runs. Each is atomic at the harness-step tier, which is a statement about granularity, not size. [[mold-spec]] owns the authoring contract, [[casting]] owns what a cast does with one, and [[harness-pipelines]] owns which Molds each journey composes.

This record owns the **shape** of the Mold set rather than its membership — the axes a Mold buckets on, the boundary that decides whether a piece of knowledge becomes a Mold at all, and where the set is still uneven. It does not list the Molds that exist. `content/molds/` is the membership; the generated `content/Index.md` and `content/Dashboard.md` project it with summaries; the site's Mold browse renders it. A hand-kept catalog here would be a fourth copy of that, and the first Mold authored after it was written would make it wrong.

## The axes a Mold buckets on

`axis` is a required frontmatter enum, not a mental model for grouping: `source-specific`, `target-specific`, `tool-specific`, or `generic`. The chosen value requires the field that names the specialization — `source`, `target`, or `tool` — and the schema rejects an axis whose companion field is missing. [[mold-spec]] owns that contract. What each value *means* is here.

- **`source-specific`** — the input format determines the content. A paper, a Nextflow tree, a CWL document, and an existing Galaxy workflow each demand different reading, and no shared summary shape survives forcing them together.
- **`target-specific`** — the output target determines the content. Galaxy and CWL disagree about what a step, a test, and a validation failure are.
- **`tool-specific`** — reserved for an action that genuinely depends on one external tool's behavior. No Mold carries it. Whole-CLI reference surfaces are not what it is for.
- **`generic`** — none of the above.

The enum records one specialization, not a pair. Many Molds are genuinely source × target — `nextflow-summary-to-galaxy-interface` reads a Nextflow summary and designs a Galaxy interface — and declare `source-specific`, leaving the target to the Mold's name and its `input_artifacts[]` / `output_artifacts[]` contracts, which is where the handoff is actually pinned. Whether one value plus the artifact contracts carries enough is open below.

## Mold or reference content

A Mold acts; reference content explains. The test is whether the content terminates in a decision — emit this artifact, pick this wrapper, route back to that phase — or whether a reader consults it. Getting this wrong toward reference is cheap: a pattern page that should have been a Mold just sits there being read. The other direction puts explanation inside a cast bundle, where nothing cites it and nothing keeps it current.

Excluded by design, named so the boundary stays visible:

- **Pure reference content.** Pattern pages, CLI manual pages under `content/cli/<tool>/<command>.md`, schema notes, prompt fragments, examples, and research notes are *referenced by* Molds, not Molds themselves. `reference_contract.yml` registers the kinds and [[casting]] dispatches each one.
- **Harnesses.** Hand-authored orchestration that sequences Molds and is never cast from one.
- **Approval gates, scope confirmation, plan presentation, and tool-discovery routing.** Harness-level concerns; [[harness-pipelines]] holds the reasoning for each.
- **Hand-authored prior-art skills.** The `gxwf-cli` help-text dump and the `find-shed-tool` skill design are prior art. Their content feeds CLI manual pages and action Molds; their form does not.

**Wrapping a CLI is not a disqualifier.** `discover-shed-tool`, `advance-galaxy-draft-step`, `validate-galaxy-workflow`, and `run-workflow-test` all wrap CLIs and are Molds. The criterion is whether there is procedural content worth casting — when to run, how to read the result, when to loop back — not whether the mechanism underneath is deterministic.

### Worked example: `compare-against-iwc-exemplar`

A case that could have gone the other way. "Compare the design against the IWC corpus" sounds like knowledge: the corpus-first principle is already reference content ([[corpus]]), and one plausible shape was a pattern page describing the idiom, cited by the template Mold.

It landed as an action Mold because the criterion above resolves the same way it does for the CLI wrappers — there is procedure worth casting. It runs after the design briefs and before the template Mold, so corpus divergence is caught before per-step effort is spent; it ranks candidates by a feature hierarchy rather than superficial similarity; and it hands off a structural-diff artifact the template Mold consumes. The corpus-first *principle* stays reference content; the *act* of locating the nearest exemplar, ranking it, and gating the template step is a Mold.

## Where the Mold set is uneven

Direction, not inventory. Each of these is a property of the set that membership alone does not show.

- **The Galaxy target is far ahead of the CWL target.** Galaxy paths have a per-step orchestrator, a corpus-grounding Mold, and four test-plan producers; the CWL paths have leaf-shaped per-step work and one test-plan producer, which is Nextflow-sourced. The paper-sourced CWL journey has no test-plan producer at all — [issue #448](https://github.com/galaxyproject/foundry/issues/448).
- **The run/debug tier is thinner than the authoring tier, on purpose.** `run-workflow-test` and the two `debug-*-workflow-output` Molds are sized for work an agent could often do ad-hoc. They are Mold-shaped for inventory completeness; whether they earn casting is a question a walk should answer, not this record.
- **Walk status is not kept here.** A Mold earns its `eval.md` and `scenarios.md` after a first walk, not before, so the validator's missing-companion warnings are the closest thing to a walk-status surface. They are meant to stand until a walk closes them, and clearing one by authoring would remove the signal without changing the fact.

## Open questions

- Does `axis` need a pair form for source × target Molds, or do one value plus the artifact contracts carry enough?
- `tool-specific` has no member. Does it survive the next ten Molds, or was the fourth value speculative?
- Is the CWL-target lag a deliberate scope decision or an unclosed gap? The pipelines disagree with each other today.
- Do the run/debug Molds survive their first walk as Molds?
