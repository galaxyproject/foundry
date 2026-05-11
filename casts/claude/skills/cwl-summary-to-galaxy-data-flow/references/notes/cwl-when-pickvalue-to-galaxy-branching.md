---
type: research
subtype: design-spec
title: "CWL when:/pickValue → Galaxy branching translation"
tags:
  - research/design-spec
  - source/cwl
  - target/galaxy
status: draft
created: 2026-05-11
revised: 2026-05-11
revision: 1
ai_generated: true
related_notes:
  - "[[cwl-pickvalue-to-galaxy]]"
  - "[[galaxy-paired-or-unpaired-collections]]"
  - "[[galaxy-collection-semantics]]"
  - "[[component-cwl-workflow-anatomy]]"
  - "[[galaxy-data-flow-draft-contract]]"
related_molds:
  - "[[cwl-summary-to-galaxy-interface]]"
  - "[[cwl-summary-to-galaxy-data-flow]]"
  - "[[cwl-summary-to-galaxy-template]]"
  - "[[compare-against-iwc-exemplar]]"
summary: "CWL `when:`/`pickValue` → Galaxy. Three honest translations (paired_or_unpaired input, native pick_value step, sibling workflows) plus how to pick among them."
---

# CWL `when:`/`pickValue` → Galaxy branching translation

Audience: a Mold author looking at a `summary-cwl.json` whose steps carry `when:` predicates and/or whose workflow outputs use `pickValue`, deciding which Galaxy translation to recommend.

## The three honest translations

CWL has two related branching mechanisms with no 1:1 gxformat2 equivalent (until galaxy#22222 — see `cwl-pickvalue-to-galaxy`):

- **`when:` on a step** — execute conditionally on a JS predicate.
- **`pickValue:` on a step input or workflow output** — fan in N candidate sources and pick `first_non_null` / `the_only_non_null` / `all_non_null`.

Three Galaxy-idiomatic translations are available; each is honest for a different source shape.

### Translation A — `paired_or_unpaired` collection (preferred when the discriminator is paired-vs-single)

When the CWL `when:` predicates discriminate the **paired-vs-single mode of read inputs** (the seqprep-subwf pattern: `single_reads: File?` triggers single mode; absence triggers paired mode), the entire branching collapses into a single workflow with a `paired_or_unpaired` (or `list:paired_or_unpaired` for batches) input.

- The mode-switch parameter disappears.
- The per-step `when:` predicates disappear.
- The `pickValue` fan-in disappears — both branches feed the same wrapper, branching happens inside the wrapper via `has_single_item`.
- Result: one workflow, fewer steps, no synthetic merge.

See `[[galaxy-paired-or-unpaired-collections]]` for the type itself and the decision rule.

### Translation B — native `pick_value` workflow step (preferred for non-collection-shaped branches, post galaxy#22222)

When the CWL `pickValue` is on the workflow output (or a step input) but the discriminator is **not** a collection-shape concern (e.g., it's a parameter-driven mode, or branches that produce different artifact kinds, or `all_non_null` aggregation), use Galaxy's native `pick_value` workflow module.

- Each upstream branch keeps a per-step gxformat2 `when:` predicate.
- A `type: pick_value` step with `state.mode: <cwl_mode>` fans in the branch outputs.
- Workflow output reads from the `pick_value` step's `output`.

See `[[cwl-pickvalue-to-galaxy]]` for the full mapping (mode table, gxformat2 surface, gotchas, version floor).

### Translation C — sibling workflows per mode (preferred when IWC convention exists or modes diverge structurally)

When the IWC corpus already publishes the same upstream pipeline as **two separate workflow files** (one per mode), follow the IWC convention. Same applies when the two CWL branches diverge structurally beyond a single fan-in point (different downstream steps per mode, not just different sources to the same output).

- Each Galaxy `.gxwf.yml` is a linear workflow with no branching.
- Two sibling files: `<name>-paired.gxwf.yml`, `<name>-single.gxwf.yml`.
- Downstream consumers (and registries) pick the workflow that matches their data shape.

Evidence: `EBI-Metagenomics/pipeline-v5` → IWC ports `amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-quality-control-paired-end` and `…-single-end`.

## Picking among A / B / C

Decision walk for the data-flow Mold:

1. **Is the discriminator paired-vs-single reads (or a near-cousin: optional File? read inputs gated by `when:`)?** → A. Translation B/C are fallbacks if `paired_or_unpaired` cannot model the shape (e.g., scatter/nesting depth limit; see `[[galaxy-paired-or-unpaired-collections]]` §"Limitation: only deepest rank").
2. **Does an IWC port of the same upstream pipeline exist as sibling workflows?** → C, *unless* updating to `paired_or_unpaired` (A) is explicitly an upgrade. Surface both options in `compare-against-iwc-exemplar`'s comparison notes.
3. **Does the workflow output use `pickValue: all_non_null` (collection aggregation), or does the branching produce structurally divergent outputs that need first-non-null/the-only-non-null fan-in?** → B.
4. **None of the above (custom predicate, non-paired-mode `when:`)** → B (default to native `pick_value`). Use C only if the branches share *no* downstream structure.

## Anti-patterns to call out in the brief

- **Synthesizing a "pick non-empty" custom Galaxy tool.** With galaxy#22222 (`pick_value` module), this is no longer needed and is now an anti-pattern. The Foundry's prior data-flow briefs that recommended this should be updated.
- **Emitting a workflow-level `reads_mode` select parameter when the discriminator is collection-shape.** Use translation A instead.
- **Translating CWL `first_non_null` to Galaxy `first_or_skip`** without flagging that this is a Galaxy-only semantic (`first_or_skip` emits a "skipped" HDA on all-null; CWL `first_non_null` errors). Don't swap modes silently.

## Source-side anti-patterns to surface

CWL sources sometimes carry mode-switch branching that is a CWL accommodation rather than a real design choice. Surface these as anti-pattern flags during the data-flow brief:

- **Bespoke per-pipeline utility scripts** (`count_lines.py`, ad-hoc renamers) that emit scalar metrics consumable only via CWL's typed workflow outputs. Galaxy convention: drop them in favor of MultiQC / fastp JSON / FastQC reports.
- **Decompress-just-to-pass-through** chains (CWL `multiple-gunzip.cwl` step that exists because the next CWL tool refuses gzipped input). Galaxy tools commonly accept `.fastq.gz` directly; verify before keeping the unzip step. Where IWC keeps it (e.g., `__UNZIP_COLLECTION__` in MGnify amplicon ports), the downstream is intentional.

## Galaxy version floor

Translation B (native `pick_value`) requires Galaxy ≥ `main` 2026-03-31 (galaxy#22222 merge date). Workflows using `type: pick_value` will not import on older releases. Translations A and C have no recent version floor (A requires `paired_or_unpaired` support, present since PR #19377 / late 2024).

## Citations

- `[[cwl-pickvalue-to-galaxy]]` — full PR analysis of galaxy#22222 (the native `pick_value` module).
- `[[galaxy-paired-or-unpaired-collections]]` — the discriminated-union collection type and the `paired ⊏ paired_or_unpaired` subtyping lattice.
- IWC sibling-workflows convention: `amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-quality-control-paired-end` and `…-single-end` in the IWC corpus.
- Run-dir evidence for the discriminator-classification trap: `casts/claude/skills/_emulated-runs/mgnify-seqprep-subwf/cwl-galaxy-interface.md` (the under-read Option A) vs the now-recommended translation A.

## Evidence quality

- **Corpus-observed (concrete)**: IWC sibling-workflows precedent for the paired-vs-single MGnify pipeline.
- **Galaxy-source-observed (concrete via referenced notes)**: `pick_value` semantics, `paired_or_unpaired` subtyping.
- **Foundry-inference (marked)**: the three-translation taxonomy and the decision walk are inferred from one run + IWC evidence; refine after more CWL→Galaxy test-drives.
- **Anti-pattern catalog**: corpus-grounded for `count_lines.py` (one run) and unzip-just-to-pass-through (same run); expect drift as more CWL fixtures land.
