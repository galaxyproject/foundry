# freeform-galaxy-data-flow: MRSA mobile-AMR context across isolates

> Artifact id: `freeform-galaxy-data-flow`. Produced by
> `freeform-summary-to-galaxy-data-flow` from `freeform-summary.md` +
> `freeform-galaxy-interface.md`. An **abstract** target-shaped DAG: operations,
> map/reduce, shape changes, unresolved tool needs. Not gxformat2; does not
> resolve exact Tool Shed tools.

## Abstract DAG (nodes + edges)

```
[in] MRSA isolate assemblies (list<fasta>, keyed by isolate)
[in] isolate metadata (tabular, optional)

 A. staramr           map-over list  → per-isolate {summary, detailed, resfinder, plasmidfinder, mlst}
 B. ISEScan           map-over list  → per-isolate IS calls (tabular/GFF)
 C. IntegronFinder    map-over list  → per-isolate integron calls (tabular/GFF)
 D. Bakta (optional)  map-over list  → per-isolate annotation        [de-scoped enrichment]

 E. ARG→intervals     reshape: resfinder.tsv → BED/interval (ARG coords)   [tabular→interval bridge]
 F. IS→intervals      reshape: ISEScan → BED/interval
 G. integron→intervals reshape: IntegronFinder → BED/interval
       (E,F,G are the "table→interval/GFF3" reshaping the source names without a tool)

 H. sort intervals    coordinate-aware sort on E,F,G                      [precondition for closest]
 I. nearest-feature   ARG-intervals vs (IS ∪ integron) intervals,
                       per isolate → ARG + nearest mobile element + DISTANCE
 J. classify context  label each ARG: plasmid-located | IS-adjacent |
                       integron-associated | SCCmec-candidate | unclassified  [RULES UNDEFINED]

 K. collapse/pivot     per-isolate ARG calls → wide matrix keyed by isolate  [reduction]
 L. heatmap            matrix → ARG-by-isolate heatmap image
 (L') matrix/dotplot   plasmid/mobile-element calls by isolate

[out] staramr_summary, staramr_resfinder, staramr_plasmidfinder,
      is_elements, integrons, arg_mobile_context (=J), arg_heatmap (=L),
      mobile_element_matrix (=K/L')
```

## Collection map / reduce choices

- **Map-over** the `list` collection for A–G and the sort step H: every caller and
  reshape runs once per isolate, identifier preserved. This is plain `list`
  map-over — no paired/nested semantics.
- **Identifier synchronization** is load-bearing: the isolate name must ride
  through reshape (E–G) and the nearest-feature join (I) so the mobile-context
  table and the final matrix stay keyed by isolate. Re-attach the identifier after
  any tabular reshape that drops it.
- **Reduction** at step K: collapse the per-isolate ARG calls into one
  isolate-indexed wide table — the `tabular-pivot-collection-to-wide` /
  Collapse-Collection idiom — feeding the heatmap. The isolate column must survive
  the reduction.

## Shape-changing placeholder steps

- **E–G tabular→interval bridge** (shape change: tabular → interval/BED). Tool
  unresolved; source says "existing GTN table-processing patterns". Likely an
  awk/Text-reformatting projection of coordinate columns into BED.
- **H coordinate-aware sort** — note: IWC corpus sorts intervals with tabular
  `sort1`, but interval-algebra closest expects coordinate-sorted BED, so a
  BED-aware sort precedes I. (Corpus-grounded caveat from the interval patterns.)
- **I nearest-feature + distance** — this is the **mobile-context computation**.
  Per the Foundry interval-patterns note this "nearest feature + distance"
  operation is a **corpus gap**: no IWC exemplar, no recurring pattern page. The
  natural tool is `bedtools closest` (`-d` for signed/absolute distance) from the
  `iuc/bedtools` suite. Reach for it directly as an unresolved tool need — don't
  expect a pattern page to cover it.
- **J classify** — placeholder. Maps (distance to nearest IS/integron, replicon
  membership from plasmidfinder, SCCmec locus overlap) → a context class. **The
  source does not define the rules or cutoffs**; this stays an abstract
  classification node with undefined thresholds (open question), not a concrete
  step.

## Unresolved Galaxy tool needs (abstract, with shapes)

| op | in shape | out shape | confidence | note |
|---|---|---|---|---|
| ARG/plasmid/MLST call | fasta (map) | tabular collection | high | `staramr` named |
| IS call | fasta (map) | tabular/GFF | high | `ISEScan` named |
| integron call | fasta (map) | tabular/GFF | high | `IntegronFinder` named |
| table→interval reshape | tabular | BED/interval | med | tool unnamed; awk/Text-reformat candidate |
| coordinate sort | BED | sorted BED | med | BED-aware sort (SortBED-style) |
| nearest-feature+distance | 2× sorted BED | tabular (ARG, mobile elt, distance) | med | corpus gap → `bedtools closest -d` |
| context classify | tabular | tabular (+ class col) | low | rules undefined |
| collapse to matrix | tabular collection | wide tabular | high | pivot-collection-to-wide / Collapse Collection |
| heatmap | matrix | image | med | plotting tool unresolved (heatmap-style) |

## Confidence / open questions

- High confidence on the call layer (A–C) and the map-over/identifier spine.
- Medium on the reshape→sort→closest interval chain: the *operations* are clear
  and corpus-grounded, the exact tools are not pinned (correctly deferred to
  template/implement).
- **Low confidence on J (classify):** rules and distance cutoffs are undefined in
  the source. Carry as the workflow's central open design question, not a decided
  step. A defensible MVP: emit the nearest-feature+distance table
  (`arg_mobile_context`) and let "context class" be a downstream/notebook
  labeling, rather than hard-coding thresholds the source never gave.
- Bakta (D) and JBrowse remain de-scoped enrichment/figure layers, consistent
  with the interface brief.
