# iwc-comparison-notes: MRSA mobile-AMR context across isolates

> Artifact id: `iwc-comparison-notes`. Produced by `compare-against-iwc-exemplar`
> from `freeform-galaxy-interface.md` + `freeform-galaxy-data-flow.md`. Structural
> diff guidance for `freeform-summary-to-galaxy-template`. Companion file:
> `iwc-exemplar.gxwf.yml`.

## Nearest exemplar

**`bacterial_genomics/amr_gene_detection/amr_gene_detection`** — IWC.

Confidence: **Medium.**

| Feature (hierarchy) | UC1 brief | Exemplar | Match |
|---|---|---|---|
| 1. Domain/intent | bacterial AMR + mobile-element context | bacterial AMR + virulence detection | **same domain** ✅ |
| 2. Input topology | `list<fasta>` (3–4 isolates) | single `data` fasta (one genome) | **differs** ⚠ |
| 3. Primary tool families | staramr, ISEScan, IntegronFinder | staramr, AMRFinderPlus, ABRicate, ToolDistillator, MultiQC | **partial** (staramr exact) |
| 4. DAG motifs | map-over callers → reshape → nearest-feature → collapse → heatmap | fan-out callers → ToolDistillator merge → MultiQC report | **partial** |
| 5. Output/report shape | per-isolate matrix + ARG heatmap + mobile-context table | per-output promotion + MultiQC HTML + distillator JSON | **partial** |
| 6. Test/fixture | not yet specified | single-genome fixture | n/a here |

Why Medium not High: domain and the `staramr` core are an exact hit (the
source even cites the AMR-gene-detection GTN tutorial this workflow comes from),
but the **input topology differs** (single genome vs isolate collection) and
UC1's **mobile-element + interval-distance half has no analog** in the exemplar.
Per the Feature-Hierarchy rubric a topology divergence + partial-tool/output
match caps this at Medium.

## Nearest exemplar gxformat2 excerpt

Inline bounded subgraph (the staramr input→step→output slice UC1 reuses), cited
from `bacterial_genomics/amr_gene_detection/amr_gene_detection`, step label
`Staramr AMR genes detection`. Fuller view in `iwc-exemplar.gxwf.yml`.

```yaml
inputs:
  - id: Input sequence fasta        # single `data` in exemplar; UC1 maps over list<fasta>
    type: data
    format: [fasta]
  - id: StarAMR database
    type: string
    restrictOnConnections: true
steps:
  - id: Staramr AMR genes detection
    label: Staramr AMR genes detection
    tool_id: toolshed.g2.bx.psu.edu/repos/iuc/staramr/staramr_search/0.11.0+galaxy3
    tool_version: 0.11.0+galaxy3
    in:
      - {id: genomes, source: Input sequence fasta}
      - {id: staramr_db_select, source: StarAMR database}
    out:
      - {id: summary, rename: staramr_summary, add_tags: [staramr_summary]}
      - {id: resfinder, rename: staramr_resfinder_report, add_tags: [staramr_resfinder_report]}
      - {id: plasmidfinder, rename: staramr_plasmidfinder_report, add_tags: [staramr_plasmidfinder_report]}
      - {id: mlst, rename: staramr_mlst_report, add_tags: [staramr_mlst_report]}
```

## Reuse verbatim (high-value idiom transfer)

- **The `staramr` step.** Real pinnable identity: `tool_id`
  `toolshed.g2.bx.psu.edu/repos/iuc/staramr/staramr_search/0.11.0+galaxy3`,
  changeset `6d5c8a6ceea0`, owner `iuc`. Input port `genomes` ← fasta; DB
  selection via `staramr_db_select` + `pointfinder_organism` **string** inputs
  with `restrictOnConnections: true`. See `iwc-exemplar.gxwf.yml`.
- **Output-promotion idiom.** The exemplar promotes each staramr output
  (`summary`, `resfinder`, `plasmidfinder`, `mlst`, `detailed_summary`, …) with
  `rename:` + `add_tags:`. UC1's interface labels (`staramr_summary`,
  `staramr_resfinder`, `staramr_plasmidfinder`) map 1:1 onto these — adopt the
  rename/tag pattern directly.
- **DB-as-string-input idiom.** staramr's database + species are surfaced as
  workflow `string` inputs, not hard-coded — UC1 should do the same so AMR-DB
  version is explicit (the source flagged DB-version dependence).

## Structural divergences the template must handle

> Routing: all **template/data-flow** issues for `freeform-summary-to-galaxy-template`.

1. **Collection map-over (topology).** Exemplar feeds a single `data` fasta;
   UC1's primary input is a `list<fasta>` of isolates. The template must take the
   exemplar's staramr step and **map it over the list**, preserving the isolate
   identifier on every output. Same for ISEScan / IntegronFinder. This is the
   single most important Galaxy-specific change vs the exemplar.
2. **Mobile-element callers absent.** ISEScan and IntegronFinder have no node in
   this exemplar (nor elsewhere in IWC AMR workflows). Template adds them as
   placeholder map-over steps; exact wrappers → per-step discover/author loop.
3. **table→interval reshape + nearest-feature distance has NO IWC exemplar.**
   This confirms the data-flow brief's corpus-gap call: the "nearest feature +
   distance" operation (`bedtools closest -d`) is absent from IWC. The exemplar
   offers no idiom to copy here — template emits an explicit placeholder chain
   (reshape → coordinate-sort → closest → classify) and the per-step loop reaches
   for `iuc/bedtools` directly. Flag as a candidate **pattern-page gap** if it
   recurs, but do not block.
4. **Aggregation idiom differs.** Exemplar aggregates with
   ToolDistillator→MultiQC into an HTML report. UC1 wants a per-isolate **matrix +
   heatmap** instead (collapse/pivot-to-wide → heatmap). Do **not** import the
   ToolDistillator/MultiQC tail; it answers a different output question. Note it
   only as an alternative report idiom.
5. **Classification step has no exemplar and undefined rules.** Keep as an
   explicit placeholder/TODO with the open question carried, not an invented step.

## Anti-pattern / shortcut check

- Promoting every intermediate as a workflow output (as the exemplar does for all
  staramr outputs) is **accepted in IWC** — fine to mirror for UC1's testable
  checkpoints. No smell.
- Do not collapse the isolate collection to an opaque concatenation before the
  per-isolate calls just to reuse the single-genome exemplar shape — that would
  lose the comparative axis. Keep the map-over.

## Findings routed forward

| finding | owner surface |
|---|---|
| map staramr/ISEScan/IntegronFinder over `list` | template |
| reuse staramr tool_id + rename/tag output idiom | template (then per-step confirms pin) |
| reshape→sort→closest→classify placeholder chain | template (data-flow gap) |
| ISEScan / IntegronFinder / bedtools-closest wrappers | per-step loop (discover-or-author) |
| nearest-feature+distance as recurring idiom | pattern-page gap (defer, don't author off one case) |
| matrix+heatmap vs ToolDistillator/MultiQC report | template (keep UC1's outputs) |
| classification rules undefined | open question → user / per-step decision |
