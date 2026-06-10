---
type: pattern
pattern_kind: operation
evidence: corpus-observed
title: "Interval: filter or annotate by overlap"
aliases:
  - "bedtools intersect in Galaxy"
  - "interval intersect"
  - "overlap features between two interval sets"
tags:
  - pattern
  - target/galaxy
  - topic/galaxy-transform
  - topic/interval-transform
status: draft
created: 2026-06-10
revised: 2026-06-10
revision: 1
ai_generated: true
summary: "Keep, drop, or annotate coordinate features by overlap with a second feature set; bedtools intersect (BED) or vcfvcfintersect (VCF), mapped over a collection."
related_notes:
  - "[[iwc-interval-operations-survey]]"
related_patterns:
  - "[[interval-merge-overlapping]]"
  - "[[interval-coverage]]"
  - "[[interval-consensus-by-multi-intersect]]"
  - "[[interval-mask-by-set-algebra]]"
  - "[[galaxy-interval-patterns]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
iwc_exemplars:
  - workflow: epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun
    steps:
      - label: "get merged peaks overlapping at least x replicates"
    why: "Intersect with -wa -wb in iterate mode to keep merged-sample peaks that overlap consensus regions."
    confidence: high
  - workflow: sars-cov-2-variant-calling/sars-cov-2-ont-artic-variant-calling/ont-artic-variation
    steps:
      - label: "Adjusted variant calls within primer binding sites"
    why: "Intersect variant features against a primer-binding-site BED with -wa only (report the A feature)."
    confidence: high
  - workflow: sars-cov-2-variant-calling/sars-cov-2-pe-illumina-artic-variant-calling/pe-artic-variation
    why: "VCF-native intersection with vcfvcfintersect (invert mode) instead of converting to BED."
    confidence: high
  - workflow: epigenetics/consensus-peaks/consensus-peaks-chip-pe
    why: "Same multi-intersect-then-intersect shape in the ChIP paired-end sibling workflow."
    confidence: medium
---

# Interval: filter or annotate by overlap

## Operation

Keep, drop, or annotate coordinate features (`chrom/start/end`) by whether they overlap a second set of features. This is the single most common interval operation in the IWC corpus — five workflows. Two tool paths cover it; the right one depends on whether you must stay in VCF space (see the decision sidebar).

`toolshed.g2.bx.psu.edu/repos/iuc/bedtools/bedtools_intersectbed` ("bedtools Intersect intervals") is the BED/GFF/VCF-coordinate path. `toolshed.g2.bx.psu.edu/repos/iuc/bedtools/bedtools_multiintersectbed` does the N-way variant across many feature sets at once (see [[interval-consensus-by-multi-intersect]]). Parameter names below are corpus-inferred from `tool_state`; verify against the live form when authoring.

## When to reach for it

- Keep features in set A that overlap (or do **not** overlap) set B: peaks overlapping a blocklist, variants inside primer-binding sites, regions inside a target panel.
- Annotate A features with the B features they hit (report both sides).
- Reduce a target set against one reference set, or iterate the same reference across a collection of A sets.

If you need the *count* of reads/features over regions rather than a yes/no overlap, use [[interval-coverage]]. If you want to collapse a single set's own internal overlaps, use [[interval-merge-overlapping]].

## Parameters (bedtools intersect)

- `inputA`: the features to filter/annotate (connected).
- `reduce_or_iterate`: `reduce_or_iterate_selector` is **`iterate`** in every corpus invocation — the second input `inputB` is applied per element when A is a collection. `reduce` (combine all B) is unattested.
- `overlap_mode`: a list of bedtools flags. Corpus values: `[-wa]` (report the A feature only — `ont-artic-variation`), `[-wa, -wb]` (report both A and the B feature it overlapped — `consensus-peaks-*`).
- `invert`: keep A features with **no** overlap (bedtools `-v`). `false` in the kept-on-overlap corpus cases.
- `once`: `true` collapses multiple B hits to a single A row (bedtools `-u`); used in `ont-artic-variation` so a variant in two primer regions is reported once.
- `fraction_cond`: minimum overlap fraction; `fraction_select: default` (any 1 bp) everywhere in the corpus.
- `strand`: strandedness toggle; `""` (ignore strand) in all corpus cases.
- `split`: treat spliced/blocked records as their sub-blocks; `false` in the corpus.
- `header`, `bed`, `count`, `sorted`: output toggles; corpus defaults (`false`), except `header: "true"` where the A input carries a header (`ont-artic-variation`).
- `genome_file_opts`: only needed for operations that require chromosome bounds; `loc` when set.

## Idiomatic shapes

Keep merged-sample peaks that overlap a consensus region, reporting both sides, mapped over a collection:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/iuc/bedtools/bedtools_intersectbed/2.31.1+galaxy0
tool_state:
  inputA: { __class__: ConnectedValue }
  reduce_or_iterate:
    reduce_or_iterate_selector: iterate
    inputB: { __class__: ConnectedValue }
  overlap_mode: [-wa, -wb]
  fraction_cond: { fraction_select: default }
  invert: false
  once: false
  strand: ""
  split: false
  header: false
```

Keep variant features that fall in primer-binding sites, report A once:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/iuc/bedtools/bedtools_intersectbed/2.30.0
tool_state:
  inputA: { __class__: ConnectedValue }
  reduce_or_iterate:
    reduce_or_iterate_selector: iterate
    inputB: { __class__: ConnectedValue }
  overlap_mode: [-wa]
  once: "true"
  header: "true"
  invert: "false"
```

(Note the quoted-boolean serialization `"true"`/`"false"` in the older `2.30.0` pin; the newer pin emits bare booleans. Both round-trip.)

## Decision: BED-native vs VCF-native intersection

When the A set is variants, you can intersect in two ways. The corpus shows both, and the choice turns on what downstream needs:

- **BED-native** — `bedtools_intersectbed`, A converted to coordinate features. Pick this when downstream only needs coordinates or you are intersecting against a region panel (`ont-artic-variation` intersects variants against primer sites).
- **VCF-native** — `toolshed.g2.bx.psu.edu/repos/devteam/vcfvcfintersect/vcfvcfintersect`. Pick this when the variant **INFO/FORMAT** fields must survive the operation. It takes two VCFs plus a reference FASTA. Corpus invocation (`pe-artic-variation`): `isect_union: -i` (intersect), `invert: true` (keep variants **absent** from the second VCF), `reference_source_selector: history`. It stays in VCF space, so no BED round-trip and no field loss.

Neither is "legacy"; they answer different questions. Lead with BED-native for region-membership; reach for VCF-native when VCF semantics matter.

## Pitfalls

- **`iterate` vs `reduce`.** Over a collection, `iterate` runs A-element-against-B per element; `reduce` would fold all B together. The corpus only ever iterates. If you mean "one shared reference set across every A element," `iterate` with a single B is still correct — `reduce` is for combining multiple B inputs. See [[galaxy-collection-patterns]] for the map-over mechanics.
- **`overlap_mode` is a list, not a scalar.** `[-wa, -wb]` and `[-wa]` produce different column counts downstream; a tabular step keyed on column positions will break if you change the mode without updating it.
- **`-v` (invert) silently changes meaning, not just direction.** `invert: true` keeps non-overlapping A features — a different dataset shape (no B columns appended). Don't pair it with `[-wa, -wb]`.
- **No proximity.** This operation answers overlap (yes/no/fraction), not "nearest feature and its distance." The corpus has no `closest`/proximity tool at all; see [[galaxy-interval-patterns]] §Gaps.

## See also

- [[galaxy-interval-patterns]] — the interval pattern map.
- [[interval-consensus-by-multi-intersect]] — the N-way multi-intersect recipe that wraps this op.
- [[interval-mask-by-set-algebra]] — set-algebra recipe using subtract/merge instead of overlap-filter.
- [[iwc-interval-operations-survey]] — corpus evidence and the redundancy/decision notes.
