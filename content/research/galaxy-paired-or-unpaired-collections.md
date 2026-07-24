---
type: research
title: "Galaxy paired_or_unpaired collection type"
tags:
  - research/component
  - target/galaxy
status: draft
created: 2026-05-11
revised: 2026-05-11
revision: 1
ai_generated: true
related_notes:
  - "[[galaxy-collection-semantics]]"
  - "[[component-cwl-workflow-anatomy]]"
related_molds:
  - "[[cwl-summary-to-galaxy-interface]]"
  - "[[cwl-summary-to-galaxy-data-flow]]"
  - "[[nextflow-summary-to-galaxy-interface]]"
summary: "Galaxy's `paired_or_unpaired` collection type: discriminated-union shape for paired-or-single reads, no workflow-level mode switch needed. Galaxy PR #19377."
---

# Galaxy `paired_or_unpaired` collections

Audience: a Mold author shaping a Galaxy workflow interface from an upstream (CWL / Nextflow / paper) source whose reads can be paired-end *or* single-end *or* a mixed batch of both.

## The shape

`paired_or_unpaired` is a Galaxy collection type modeling a **discriminated union of 1 or 2 elements**:

- **Unpaired variant** — one element with identifier `unpaired`.
- **Paired variant** — two elements with identifiers `forward` and `reverse`.

`list:paired_or_unpaired` lifts the same shape to a *heterogeneous* batch where some samples are paired and some are single-end — a representation that did not exist before this type. A `list:paired` forces every sample to be paired; a plain `list` of flat datasets loses pairing structure.

The type and rank `paired_or_unpaired` may occur at any rank within nested types (`list:paired_or_unpaired`, `list:list:paired_or_unpaired`) but **only at the deepest (innermost) rank** — the subtyping logic is implemented at the suffix level. See "Limitation: only deepest rank" below.

## When to reach for it (decision rule for translators)

Reach for `paired_or_unpaired` when the upstream workflow declares **either** of:

1. Two or more optional read-like inputs (e.g., CWL `forward_reads: File?`, `reverse_reads: File?`, `single_reads: File?`) gated by mutually-exclusive `when:` predicates that branch on which inputs are present.
2. A single workflow input that already carries "could be paired, could be single" semantics (Nextflow `meta.single_end`, paper "we accept paired-end or single-end reads").

Don't reach for it when:

- The upstream workflow has two *unrelated* file inputs that aren't a paired/single pair (then keep them as separate inputs).
- The upstream produces an explicit mode switch that downstream tooling depends on for non-mode reasons (rare).

## Subtyping (concrete matching table)

`paired` IS-A `paired_or_unpaired`. The reverse is **not** true. From `lib/galaxy/model/dataset_collections/type_description.py` `can_match_type`:

| Input expects | Data provided | Match? |
| --- | --- | --- |
| `paired_or_unpaired` | `paired` | ✅ (`paired` is a subtype) |
| `paired_or_unpaired` | `paired_or_unpaired` | ✅ exact match |
| `paired` | `paired_or_unpaired` | ❌ may lack forward/reverse |
| `list:paired_or_unpaired` | `list:paired` | ✅ each element treated as paired variant |
| `list:paired_or_unpaired` | `list` | ✅ each element treated as unpaired variant |
| `list:paired` | `list:paired_or_unpaired` | ❌ some elements may be unpaired |

The asymmetry has a consequence for downstream wiring: if a workflow uses a `paired_or_unpaired` upstream of a step that strictly requires `paired`, the Galaxy editor rejects the connection with:

> "Cannot attach optionally paired outputs to inputs requiring pairing, consider using the **Split Paired and Unpaired** tool to extract just the pairs out from this output."

The escape hatch is the built-in tool `__SPLIT_PAIRED_AND_UNPAIRED__`.

## Inside a tool wrapper

A tool declares a `paired_or_unpaired` input as:

```xml
<param name="reads" type="data_collection"
       collection_type="paired_or_unpaired" label="Input reads" />
```

At command-build time the runtime exposes:

- `$reads.has_single_item` — `True` for the unpaired variant.
- `$reads.single_item` — the single element wrapper.
- `$reads.forward` / `$reads['reverse']` — for the paired variant.

Idiomatic Cheetah:

```cheetah
#if $reads.has_single_item:
    cat $reads.single_item >> $out;
#else:
    cat $reads.forward $reads['reverse'] >> $out;
#end if
```

Branching happens **inside the wrapper**, not at the workflow level. This is the key reason `paired_or_unpaired` collapses a CWL "paired-or-single subworkflow with `when:` on every step" into a single Galaxy workflow with no mode-switch parameter.

## Translation playbook

For a Mold translating from CWL / Nextflow:

1. **Detect the mode-discrimination pattern** in the source (multiple optional reads inputs with `when:`-gated steps, or `meta.single_end`-style metadata).
2. **Recommend the `paired_or_unpaired` shape in the interface brief** as the primary option, ahead of "three optional File? inputs" or a workflow-level `reads_mode` switch.
3. **In the data-flow brief**, model the per-step branching as a *wrapper-internal* concern (`has_single_item` / `forward` / `reverse`) rather than a workflow-level `when:`. The branching disappears from the gxformat2 topology.
4. **For batched / list inputs** (mixed paired+single batches), use `list:paired_or_unpaired`. This is the canonical shape for a Galaxy port of an MGnify-style amplicon QC pipeline driven by a sample sheet.
5. **Watch for downstream paired-only tools**. If any step strictly needs `paired`, insert `__SPLIT_PAIRED_AND_UNPAIRED__` upstream of that step (and document that the unpaired samples are dropped at that fork).
6. **Don't synthesize a workflow-level `reads_mode` select parameter** for what is structurally a collection-shape concern.

## Limitation: only deepest rank

The subtyping logic is implemented at the suffix level. `paired_or_unpaired` works correctly when it's the innermost type in a nested collection (`list:paired_or_unpaired`, `list:list:paired_or_unpaired`). Putting it at a non-deepest rank (e.g., `paired_or_unpaired:list`) does not match the regex / subtyping rules. For CWL workflows with `scatter` over read inputs that already produce `list:list:File`, careful rank ordering is required.

## Relationship to the IWC sibling-workflows convention

IWC's MGnify amplicon ports (`amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-quality-control-paired-end` and `…-single-end`) publish **two separate `.gxwf.yml` files**, one per mode. That convention predates `paired_or_unpaired` (the type landed in PR #19377, late 2024 onward). With `paired_or_unpaired` available, a CWL→Galaxy translator may legitimately recommend consolidating the two IWC ports into one workflow, or continue the two-sibling convention for backwards compatibility. Surface both options in the IWC comparison brief; let the user / template Mold decide.

## Citations

- Introduced by `galaxyproject/galaxy` PR #19377 ("Empower Users to Build More Kinds of Collections, More Intelligently"), authored by John Chilton. Merge commit `c212434dc8`.
- Type plugin: `lib/galaxy/model/dataset_collections/types/paired_or_unpaired.py`.
- Type validation regex: `lib/galaxy/model/dataset_collections/type_description.py:15-17`.
- Subtype matching: `CollectionTypeDescription.can_match_type` and `has_subcollections_of_type` in the same file, ~lines 76–124.
- Workflow editor rejection message: `client/src/components/Workflow/Editor/modules/terminals.ts:658-663`.
- Runtime wrapper properties: `lib/galaxy/tools/wrappers.py:801, 805` (`has_single_item`, `single_item`).
- Formal semantics: `lib/galaxy/model/dataset_collections/types/collection_semantics.yml` (`BASIC_MAPPING_PAIRED_OR_UNPAIRED_*`, `MAPPING_LIST_PAIRED_OVER_PAIRED_OR_UNPAIRED`, etc.).
- Built-in tool `__SPLIT_PAIRED_AND_UNPAIRED__`: `lib/galaxy/tools/__init__.py:4027-4032`.

## Evidence quality

- **Galaxy-source observed (concrete)**: type definition, identifiers, subtype matching table, editor rejection message, `has_single_item` runtime API, `__SPLIT_PAIRED_AND_UNPAIRED__` tool, limitation on deepest rank.
- **Foundry inference (marked)**: the translation playbook (when to reach for `paired_or_unpaired` from CWL evidence) is an inference from the type's stated purpose; corpus validation comes from re-running CWL → Galaxy test-drives.
- **Speculation (marked)**: the IWC sibling-workflows convention *may* legitimately consolidate to a single `paired_or_unpaired` workflow under future updates; not validated against a re-ported IWC workflow yet.
