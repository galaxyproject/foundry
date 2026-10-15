---
type: meta
title: "Corpus Integration"
record_kind: foundation
order: 8
tags:
  - meta
status: reviewed
created: 2026-04-30
revised: 2026-09-23
revision: 7
summary: "How IWC evidence grounds Foundry patterns and Molds without making the corpus part of the content model."
---

IWC workflows give the Foundry examples of Galaxy construction in use. The Foundry turns that evidence into pattern pages and Mold guidance while leaving the workflows in their upstream project. A contributor can inspect the evidence behind a pattern without maintaining a second IWC catalog of Foundry notes.

## Evidence workspace

`workflow-fixtures/` is a research workspace inside the Foundry checkout. Its tracked manifest, scripts, and Makefile materialize pinned IWC sources as cleaned `gxformat2` workflows under `iwc-format2/` and structural views under `iwc-skeletons/`. The generated trees are gitignored. The same workspace also holds pinned Nextflow and CWL sources for other research. See [[repository-layout]] for the boundary between this workspace and `content/`.

Survey authors can grep `$IWC_FORMAT2` for candidate tools, scan `$IWC_SKELETONS` for connections and control flow, then read selected full workflows to confirm parameters. Skeletons omit parameter blobs, so a structural match alone does not establish an exact tool recipe. The `/iwc-survey` authoring command asks for file-and-line citations in survey notes. To rebuild the structural views after materializing IWC, run `make skeletons` from `workflow-fixtures/`.

The fixture trees support research and verification. They are not Foundry notes, site content, or inputs to the normal cast build. A generated path such as `$IWC_FORMAT2/...:42` is useful inside a survey because it points to the inspected material, but it is tied to a local materialization. Pattern metadata uses a stable workflow identity instead.

## From survey to pattern

[[pattern-authorship]] requires an IWC exemplar before an operation or recipe becomes a pattern page. Each pattern declares its evidence grade. Operation and recipe pages should also declare `iwc_exemplars` in frontmatter. Each entry names an abstract IWC workflow ID, explains why that workflow demonstrates the pattern, and assigns `high`, `medium`, or `low` confidence. It may name relevant steps by label or ID. A generated file path or line citation is invalid as the `workflow` value.

For example, [[collection-unbox-singleton]] names VGP workflow IDs in `iwc_exemplars`, explains the singleton extraction each shows, and links the source survey through `related_notes`. Its verification path points separately to a local executable check. These are different claims: an exemplar shows that a workflow uses an idiom, while verification tests a specified behavior. Maps of content route readers among patterns and do not need to invent their own exemplar list.

The pattern schema checks the fields and their types. Validation warns when an operation or recipe has no `iwc_exemplars` and rejects generated paths or line citations in exemplar workflow IDs. It does not fetch IWC to confirm that a workflow ID exists or that its steps support the claim. Reviewers should inspect the cited workflow when the inference matters. A pattern body can explain a small workflow excerpt or link to upstream material when that helps the reader, but neither an `## Exemplars` heading nor an inline excerpt is a required template.

## How Molds use the corpus

Molds refer to pattern pages through typed references, and casting copies those pages into the generated bundle. The cast does not regenerate them from local IWC fixtures. The [[compare-against-iwc-exemplar]] Mold is a separate runtime comparison: its procedure fetches IWC into `~/.foundry/iwc`, ranks workflows against Galaxy design briefs, and reports structural differences. When it finds a suitable match, it passes a bounded converted subgraph and excerpt to the downstream template Mold. It may also report that there is no nearest exemplar.

This division keeps authored, reviewable pattern claims separate from a run's live comparison. A new IWC revision does not automatically change a cast pattern or fail validation. Contributors refresh survey evidence and pattern claims deliberately, then regenerate affected casts through the usual [[build-and-validation]] process.
