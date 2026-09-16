---
type: meta
title: "Roadmap"
record_kind: foundation
order: 10
tags:
  - meta
status: draft
created: 2026-09-14
revised: 2026-09-16
revision: 3
summary: "The current development direction of the Galaxy Workflow Foundry, grounded in live GitHub issue metadata."
---

The roadmap is an editorial view over the Foundry's GitHub issues. The checked-in prose explains why each work area matters; live issue labels, native sub-issue relationships, titles, and states define what belongs here and are verified in CI. Near-term `priority/mvp` work appears first, followed by `priority/v2` work.

## At a glance

- [#500 — Implement actual interviews.](https://github.com/galaxyproject/foundry/issues/500)
- [#67 — Research Nextflow test profile selection](https://github.com/galaxyproject/foundry/issues/67).
- [#66 — Research Nextflow test fixtures to Galaxy job inputs](https://github.com/galaxyproject/foundry/issues/66).
- [#59 — Research Nextflow process to Galaxy tool wrapper mapping](https://github.com/galaxyproject/foundry/issues/59).
- [#267 — Source-agnostic Galaxy input collection-shape selection note (+ IWC survey to ground it)](https://github.com/galaxyproject/foundry/issues/267).
- [#501 — Improved Support for Tool Development](https://github.com/galaxyproject/foundry/issues/501).
- [#318 — Revise how skills working on draft coordinate - more direct, more deterministic, more YAML](https://github.com/galaxyproject/foundry/issues/318).
- [#332 — Introduce a finalize-workflow step.](https://github.com/galaxyproject/foundry/issues/332)
- [#365 — Foundry should use (or know about) job cache](https://github.com/galaxyproject/foundry/issues/365).
- [#504 — Improve Pattern Pages](https://github.com/galaxyproject/foundry/issues/504).
- [#476 — Build a Pi-backed black-box Pipeline evaluation harness](https://github.com/galaxyproject/foundry/issues/476).
- [#491 — Add IWC-policy workflow review pipeline with conditional Foundry quality checks](https://github.com/galaxyproject/foundry/issues/491).
- [#535 — Prove the IWC review pipeline on a real PR and accept its policy pin](https://github.com/galaxyproject/foundry/issues/535).
- [#492 — Add a checklist-driven Galaxy workflow maturation pipeline for IWC publication](https://github.com/galaxyproject/foundry/issues/492).
- [#531 — Prove the IWC maturation pipeline with runnable fixtures and a .ga entry case](https://github.com/galaxyproject/foundry/issues/531).
- [#90 — Survey: Galaxy reporting and publishing patterns](https://github.com/galaxyproject/foundry/issues/90).
- [#306 — Pipeline construction for Loom/Orbit: a `loom` cast target that lowers pipelines into Loom plans](https://github.com/galaxyproject/foundry/issues/306).
- [#499 — First Class CWL Support](https://github.com/galaxyproject/foundry/issues/499).
- [#507 — Improved Structure and Schemas for Mold Artifacts](https://github.com/galaxyproject/foundry/issues/507).
- [#40 — Write IWC exemplar match schema](https://github.com/galaxyproject/foundry/issues/40).
- [#225 — Document Galaxy list-of-record collections for reference data](https://github.com/galaxyproject/foundry/issues/225).
- [#308 — Design a Claude dynamic-workflow projection for Foundry Pipelines](https://github.com/galaxyproject/foundry/issues/308).

## Work areas

### [#500 — Implement actual interviews.](https://github.com/galaxyproject/foundry/issues/500)

Replace the interview path's current placeholder behavior with a useful guided exchange that can discover a user's workflow intent, constraints, evidence, and unresolved choices before producing the free-form summary consumed by downstream Molds.

**Substeps**

- [ ] [#377 — interview-to-freeform-summary is reviewed + pipelined but declares zero references](https://github.com/galaxyproject/foundry/issues/377)

### [#67 — Research Nextflow test profile selection](https://github.com/galaxyproject/foundry/issues/67)

Define how the Foundry chooses among Nextflow test profiles and cases so that translation starts from the smallest representative runnable path, records when several choices are meaningful, and asks the user only when evidence cannot settle the selection.

### [#66 — Research Nextflow test fixtures to Galaxy job inputs](https://github.com/galaxyproject/foundry/issues/66)

Map Nextflow profiles, parameters, sample sheets, local or remote fixtures, and expected outputs into concrete Galaxy workflow-test job inputs, including collection construction and trustworthy datatype or hash assertions.

### [#59 — Research Nextflow process to Galaxy tool wrapper mapping](https://github.com/galaxyproject/foundry/issues/59)

Ground tool-wrapper authoring in an explicit mapping from Nextflow process evidence to Galaxy inputs, outputs, command construction, containers, and optional behavior, including difficult cases such as shell fragments and processes that invoke several tools.

### [#267 — Source-agnostic Galaxy input collection-shape selection note (+ IWC survey to ground it)](https://github.com/galaxyproject/foundry/issues/267)

Provide shared, corpus-grounded guidance for selecting Galaxy input collection shapes such as lists, paired collections, and sample sheets so each source-specific translation path can make the same decision from evidence rather than embedding its own heuristics.

### [#501 — Improved Support for Tool Development](https://github.com/galaxyproject/foundry/issues/501)

Make custom Galaxy tool development a reliable branch of workflow construction by packaging authoritative upstream guidance, exposing the actual user-tool schema, validating generated wrappers mechanically, and keeping unsupported container or interface choices explicit.

**Substeps**

- [ ] [#368 — Include upstream advice/prompts/docs for tool development.](https://github.com/galaxyproject/foundry/issues/368)
- [ ] [#468 — author-galaxy-tool-wrapper: no validation step, no GalaxyUserTool schema, and the bundled prompt contradicts it](https://github.com/galaxyproject/foundry/issues/468)

### [#318 — Revise how skills working on draft coordinate - more direct, more deterministic, more YAML](https://github.com/galaxyproject/foundry/issues/318)

Move coordination state into the draft workflow itself so unresolved topology and tool-discovery outcomes become explicit YAML TODOs, the next unit of work can be selected deterministically, and the requirements ledger is reserved for obligations rather than general agent handoff.

### [#332 — Introduce a finalize-workflow step.](https://github.com/galaxyproject/foundry/issues/332)

Add a distinct finalization phase after the draft becomes computationally complete, giving the Foundry one place to review the whole workflow, improve names and comments, resolve presentation concerns, and perform checks that do not belong in per-step implementation.

### [#365 — Foundry should use (or know about) job cache](https://github.com/galaxyproject/foundry/issues/365)

Integrate Planemo and Galaxy job caching into repeated Foundry runs through a persistent project profile, expose cache-aware execution where the CLI permits it, and teach the harness to distinguish a legitimate reuse from rare false-green or crashed-tool failure modes.

### [#504 — Improve Pattern Pages](https://github.com/galaxyproject/foundry/issues/504)

Turn Pattern pages into stronger executable references by showing data flow for multi-step operations and ensuring each pattern is backed by a small test workflow that demonstrates the claimed construction rather than relying on prose alone.

**Substeps**

- [ ] [#284 — Data Flow Examples on Multi-Step Patterns](https://github.com/galaxyproject/foundry/issues/284)
- [ ] [#505 — Ensure every pattern page has a test workflow.](https://github.com/galaxyproject/foundry/issues/505)

### [#476 — Build a Pi-backed black-box Pipeline evaluation harness](https://github.com/galaxyproject/foundry/issues/476)

Build a repeatable black-box harness that runs published Pipeline and skill artifacts through Pi workers, captures structured evidence, and separates exploratory refinement from conformance results that can support regression detection and credible release claims.

### [#491 — Add IWC-policy workflow review pipeline with conditional Foundry quality checks](https://github.com/galaxyproject/foundry/issues/491)

Compose summarization, structural validation, execution, and one advisory review Mold into a Galaxy workflow review Pipeline grounded in accepted IWC policy, with additional Foundry quality checks applied only where the available evidence supports them.

### [#535 — Prove the IWC review pipeline on a real PR and accept its policy pin](https://github.com/galaxyproject/foundry/issues/535)

Convert the structurally complete review Pipeline into scored evidence: land the upstream policy revision so the vendored review command is pinned to an accepted commit rather than a proposal, record how the Claude and Copilot review policies relate, and run all four phases against a real IWC pull request so the eval properties and harness gates are observed rather than asserted.

### [#492 — Add a checklist-driven Galaxy workflow maturation pipeline for IWC publication](https://github.com/galaxyproject/foundry/issues/492)

Provide a lifecycle Pipeline that applies the accepted IWC contributor checklist to an existing Galaxy workflow, makes well-supported metadata and generalization improvements, preserves ambiguous decisions for users, and validates and reruns the result before presenting it as publication-ready.

**Substeps**

- [x] [#496 — Implement the mature-galaxy-workflow-for-iwc Mold](https://github.com/galaxyproject/foundry/issues/496)

### [#531 — Prove the IWC maturation pipeline with runnable fixtures and a .ga entry case](https://github.com/galaxyproject/foundry/issues/531)

Close the evidence gap beneath the maturation Pipeline by authoring a runnable checklist fixture with real steps, outputs, and committed test data, walking it green and then deliberately red through all four phases with the failure attributed instead of any assertion weakened, and binding the lossless-normalization property to a committed `.ga` entry case.

### [#90 — Survey: Galaxy reporting and publishing patterns](https://github.com/galaxyproject/foundry/issues/90)

Survey the IWC corpus to establish how Galaxy workflows select, label, group, and expose user-facing outputs, giving later reporting and publication work concrete patterns instead of inventing a generic output policy from first principles.

### [#306 — Pipeline construction for Loom/Orbit: a `loom` cast target that lowers pipelines into Loom plans](https://github.com/galaxyproject/foundry/issues/306)

Add a Loom cast target that lowers Foundry Pipeline descriptions and their generated skills into executable Loom plans while preserving the architectural boundary in which the Foundry publishes portable knowledge and Loom owns stateful orchestration.

### [#499 — First Class CWL Support](https://github.com/galaxyproject/foundry/issues/499)

Bring CWL to first-class status across the Foundry by exercising CWL-to-Galaxy end to end, tightening CWL summarization, producing the missing test-plan handoffs, and supporting CWL as a target alongside the paths already proven for Nextflow and free-form sources.

**Substeps**

- [ ] [#231 — summarize-cwl: tighten cast skill's deterministic/LLM split](https://github.com/galaxyproject/foundry/issues/231)
- [ ] [#243 — summarize-cwl: emit a skinny packed CWL (docs + schema.org stripped) alongside the full pack](https://github.com/galaxyproject/foundry/issues/243)
- [ ] [#448 — paper-to-cwl: a missing cwl-test-plan producer, and find-test-data used off its target axis](https://github.com/galaxyproject/foundry/issues/448)
- [ ] [#378 — First walk: cwl-to-galaxy end-to-end via ga4gh_challenge (earn the CWL-source tier out of draft)](https://github.com/galaxyproject/foundry/issues/378)

### [#507 — Improved Structure and Schemas for Mold Artifacts](https://github.com/galaxyproject/foundry/issues/507)

Strengthen the contracts passed between Molds by replacing loosely interpreted Markdown where stable structure has emerged, while retaining narrative handoffs where judgment and uncertainty matter and avoiding schemas that merely formalize unproven abstractions.

**Substeps**

- [ ] [#48 — Write target test plan schema](https://github.com/galaxyproject/foundry/issues/48)
- [ ] [#49 — Write workflow test run report schema](https://github.com/galaxyproject/foundry/issues/49)
- [ ] [#50 — Write workflow debug recommendation schema](https://github.com/galaxyproject/foundry/issues/50)

### [#40 — Write IWC exemplar match schema](https://github.com/galaxyproject/foundry/issues/40)

Define a traceable structured result for selecting the nearest IWC exemplar, including the chosen workflow, matching rationale, relevant structural features, evidence locations, and confidence for downstream template and implementation Molds.

### [#225 — Document Galaxy list-of-record collections for reference data](https://github.com/galaxyproject/foundry/issues/225)

Research Galaxy's record-shaped collection types as a possible representation for structured reference assets, clarifying when `list:record` is preferable to sample-sheet collections and grounding any recommendation in current Galaxy behavior and real workflows.

### [#308 — Design a Claude dynamic-workflow projection for Foundry Pipelines](https://github.com/galaxyproject/foundry/issues/308)

Evaluate how Foundry Pipeline phase graphs, branches, loops, typed handoffs, and validation gates could compile into Claude dynamic workflow scripts without moving harness responsibility into the Foundry or duplicating orchestration semantics in another source format.
