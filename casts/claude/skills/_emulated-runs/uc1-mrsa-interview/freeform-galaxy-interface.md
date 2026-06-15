# freeform-galaxy-interface: MRSA mobile-AMR context across isolates

> Artifact id: `freeform-galaxy-interface`. Produced by
> `freeform-summary-to-galaxy-interface` from `freeform-summary.md`. A design
> handoff — Galaxy workflow inputs/outputs/labels — not a gxformat2 skeleton.

## Workflow inputs

| label | Galaxy input type | datatype | notes |
|---|---|---|---|
| `MRSA isolate assemblies` | dataset collection, **`list`** | `fasta` | One combined chromosome+plasmid assembly per isolate. List element identifier = isolate/strain name (e.g. `KUN1163`). 3–4 elements. This is the primary scientific input. |
| `isolate metadata` | dataset (single) | `tabular` (TSV) | strain, year, source, symptom, chromosome accession, plasmid accession(s), genome size. **Confidence: medium** — may be a workflow input or a hand-curated sidecar (open question carried from summary). Modeled as an optional input so the workflow can join metadata into summary tables; not required for the AMR/mobile-element calls. |

Shape rationale: per-isolate granularity with one file each → a `list` collection,
not `paired`/`list:paired` (assemblies are single FASTA, not read mates). Every
caller (`staramr`, `ISEScan`, `IntegronFinder`, `Bakta`) maps over the list,
preserving the isolate identifier downstream — this is what makes the comparison
addressable per isolate.

## Workflow outputs (stable labels, testable)

Workflow-producible (should carry stable output labels):

| label | from | datatype | role |
|---|---|---|---|
| `staramr_summary` | staramr | tabular collection / merged tabular | per-isolate ARG/plasmid/MLST summary; **primary payload** |
| `staramr_resfinder` | staramr | tabular | ARG hits w/ coordinates; feeds mobile-context join |
| `staramr_plasmidfinder` | staramr | tabular | replicon calls; feeds plasmid-context |
| `is_elements` | ISEScan | tabular/GFF | insertion-sequence coordinates |
| `integrons` | IntegronFinder | tabular/GFF | integron coordinates |
| `arg_mobile_context` | reshape + classify steps | tabular | the novel deliverable: ARG × nearest-mobile-element/distance/context-class |
| `arg_heatmap` | plotting step | image (png/pdf) | ARG presence by isolate |
| `mobile_element_matrix` | plotting/collapse | tabular or image | plasmid/IS/integron calls by isolate |

Figure-/notebook-layer (flagged, **not forced into the workflow interface**):

- **JBrowse locus view** — interactive; better as a notebook figure or a terminal
  visualization step than a testable workflow output. Flagged, not promoted.
- Stacked-bar of ARG counts by context, locus diagrams — narrative figures;
  candidate workflow outputs only if a plotting tool is wired, otherwise notebook.

Checkpoint outputs worth promoting for tests: `staramr_summary` (deterministic
given pinned DB), `is_elements`, `integrons`, and `arg_mobile_context` — these
are the data spine a workflow test would assert on.

## Per-isolate identity

The list element identifier (strain name) must survive through every map-over
step so the final tables and heatmap are keyed by isolate. Any reduction
(collapse to a single matrix) must retain the isolate column. This is the
load-bearing interface constraint behind the whole comparative story.

## Source-summary provenance

- Primary input + collection name `MRSA isolate assemblies`: summary §Inputs.
- Tools and output set: summary §Tools, §Outputs.
- Bakta and JBrowse: named in source but de-scoped here from the testable
  interface (Bakta = optional enrichment; JBrowse = figure layer).

## Confidence / open questions (carried, not resolved)

- **Mobile-context classification** is an output the source names but whose rules
  are undefined. Modeled as an output label (`arg_mobile_context`) with the
  computation deferred to data-flow/template; thresholds NOT invented here.
- table→interval/GFF3 **reshaping tool** unspecified — interface names the output
  shape (intervals/GFF) but not the tool.
- `isolate metadata` input vs sidecar: unresolved (see table note).
- Whether `staramr_summary` is best exposed as a per-isolate collection or a
  single merged table is a data-flow decision; interface exposes both the
  collection and a mergeable form.
- Bakta inclusion (all isolates vs subset) deferred; not on the critical
  interface path.
