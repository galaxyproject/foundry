---
type: research
tags:
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-09-26
revision: 3
related_notes:
  - "[[iwc-transformations-survey]]"
  - "[[iwc-shortcuts-anti-patterns]]"
  - "[[conditional-gate-on-nonempty-result]]"
  - "[[conditional-route-between-alternative-outputs]]"
  - "[[conditional-run-optional-step]]"
  - "[[conditional-transform-or-pass-through]]"
  - "[[derive-parameter-from-file]]"
  - "[[fan-in-bundle-consume-and-flatten]]"
  - "[[galaxy-collection-patterns]]"
  - "[[galaxy-conditionals-patterns]]"
  - "[[iwc-map-over-lifecycle-survey]]"
  - "[[iwc-parameter-derivation-survey]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
related_patterns:
  - "[[galaxy-conditionals-patterns]]"
  - "[[conditional-run-optional-step]]"
  - "[[conditional-route-between-alternative-outputs]]"
  - "[[conditional-gate-on-nonempty-result]]"
  - "[[conditional-transform-or-pass-through]]"
summary: "Corpus survey of Galaxy conditional step usage in IWC, covering when-gates, boolean shims, and routed output selection."
---

# IWC conditionals survey

The pinned IWC snapshot uses boolean `when:` gates for optional work, routed alternatives, and reporting on non-empty results. Output selection is a separate operation from skipping a step.

## Evidence scope

Source corpus: 120 cleaned `gxformat2` workflows under `$IWC_FORMAT2/`. The source is IWC commit `deafc4876f2c778aaf075e48bd8e95f3604ccc92`, recorded in `workflow-fixtures/fixtures.yaml`. `$IWC_FORMAT2` means that snapshot converted to cleaned format2, not the current IWC catalog. Full format2 reads establish both topology and parameters. Counts below come from `rg -n "^\s*when:" $IWC_FORMAT2 --glob "*.gxwf.yml"`. Local citations use `$IWC_FORMAT2/path:line` from that materialization. The source links below point to the corresponding native `.ga` workflows at the same commit. Counts include embedded subworkflows each time they occur in a containing file, so they do not count unique reusable subworkflow definitions.

## Observed conditional structure

There are 111 `when:` occurrences across 21 workflow files. Every observed gate is serialized as `when: $(inputs.when)` on the gated step, with a sibling input named `when` connected to either a user boolean, a mapped boolean, or a small subworkflow that computes a boolean from data shape. Representative direct user gates include optional BUSCO assessment in BRAKER3 (`$IWC_FORMAT2/genome_annotation/annotation-braker3/Genome_annotation_with_braker3.gxwf.yml:110-141`, `$IWC_FORMAT2/genome_annotation/annotation-braker3/Genome_annotation_with_braker3.gxwf.yml:341-385`) and optional StringTie/Cufflinks FPKM branches in RNA-seq (`$IWC_FORMAT2/transcriptomics/rnaseq-pe/rnaseq-pe.gxwf.yml:1082-1140`, `$IWC_FORMAT2/transcriptomics/rnaseq-pe/rnaseq-pe.gxwf.yml:1141-1214`).

Many gates repeat around optional outputs or optional sub-recipes: the MGnify amplicon workflows gate Krona and BIOM conversion outputs only when their upstream collection is non-empty (`$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:1330-1357`, `$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:1358-1483`, `$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:1484-1659`). VGP Hi-C workflows use gates for optional haplotype suffixing, optional extraction/unboxing, and optional Pretext tracks (`$IWC_FORMAT2/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:338-459`, `$IWC_FORMAT2/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:3057-3218`, `$IWC_FORMAT2/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:3289-3346`).

The survey also records capabilities with no observed use. `__FILTER_NULL__` has zero hits in `$IWC_FORMAT2`, so this snapshot supplies no exemplar for filtering null outputs from conditional steps. This absence does not make null filtering an anti-pattern or establish that it is unsuitable for another workflow. The closest observed idioms are either not running the optional step at all, then choosing between alternatives with `pick_value`, or deriving a boolean from an empty/non-empty output before gating follow-on reporting (`$IWC_FORMAT2/VGP-assembly-v2/Assembly-decontamination-VGP9/Assembly-decontamination-VGP9.gxwf.yml:243-305`, `$IWC_FORMAT2/VGP-assembly-v2/Assembly-decontamination-VGP9/Assembly-decontamination-VGP9.gxwf.yml:331-391`, `$IWC_FORMAT2/VGP-assembly-v2/Assembly-decontamination-VGP9/Assembly-decontamination-VGP9.gxwf.yml:392-409`).

## Snapshot inventory

| Measure | Count | Notes |
|---|---:|---|
| Cleaned workflows scanned | 120 | `$IWC_FORMAT2/**/*.gxwf.yml` |
| Workflows with `when:` | 21 | Concentrated in VGP, amplicon, microbiome, transcriptomics, genome annotation |
| `when:` step occurrences | 111 | Includes nested subworkflows embedded in format2 files |
| Gated embedded-subworkflow steps | 14 | Included in the 111 step occurrences |
| `__FILTER_NULL__` occurrences | 0 | No exemplar in this snapshot |

Workflow-file count by top-level domain:

| Domain | Files with `when:` |
|---|---:|
| `VGP-assembly-v2` | 5 |
| `amplicon` | 3 |
| `microbiome` | 3 |
| `bacterial_genomics` | 2 |
| `genome_annotation` | 2 |
| `transcriptomics` | 2 |
| `comparative_genomics` | 1 |
| `sars-cov-2-variant-calling` | 1 |
| `scRNAseq` | 1 |
| `virology` | 1 |

Gated tool IDs with at least four observed `when:` occurrences. Tool Shed IDs are shortened to their tool name, and embedded-subworkflow gates are counted separately above:

| Gated tool | Count | Interpretation |
|---|---:|---|
| `biom_convert` | 16 | Optional format export after non-empty amplicon result collections |
| `taxonomy_krona_chart` | 8 | Optional visualization after non-empty taxonomic outputs |
| `__EXTRACT_DATASET__` | 6 | Optional unboxing/extraction after shape tests |
| `pretext_graph` | 6 | Optional Pretext track addition when track data exists |
| `tp_replace_in_line` | 4 | Optional text rewrite in suffixing/masking recipes |
| `eggnog_mapper` | 4 | One-of-N annotation mode routing |
| `samtools_merge` | 4 | Optional merge/reduction branches in VGP workflows |
| `cutadapt` | 4 | Optional read-trimming branches |

## Recurring idioms

### User boolean gates optional analysis

This is the simplest conditional shape: expose a boolean workflow input, connect it to `id: when`, and put `when: $(inputs.when)` on every step in the optional branch. BRAKER3 gates both genome BUSCO and protein BUSCO behind `Include BUSCO` (`$IWC_FORMAT2/genome_annotation/annotation-braker3/Genome_annotation_with_braker3.gxwf.yml:110-141`, `$IWC_FORMAT2/genome_annotation/annotation-braker3/Genome_annotation_with_braker3.gxwf.yml:341-385`). RNA-seq gates StringTie and Cufflinks FPKM branches independently with `Compute StringTie FPKM` and `Compute Cufflinks FPKM` (`$IWC_FORMAT2/transcriptomics/rnaseq-pe/rnaseq-pe.gxwf.yml:1082-1140`, `$IWC_FORMAT2/transcriptomics/rnaseq-pe/rnaseq-pe.gxwf.yml:1141-1214`). The VGP Hi-C manual-curation workflow gates a multi-step suffixing branch from `Do you want to add suffixes to the scaffold names?` (`$IWC_FORMAT2/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:312-367`, `$IWC_FORMAT2/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:368-459`).

[[conditional-run-optional-step]] covers this recurring shape. Gate each step belonging to the optional branch and decide separately whether a downstream consumer needs a replacement for a skipped output.

### Mutually exclusive data-prep branches plus `pick_value`

Several workflows run one of two or more alternative steps, then collapse the possible outputs back to one downstream value with `pick_value`. Scanpy imports 10x matrices through either the legacy or v3 `anndata_import` mode, maps the user boolean to its opposite with `map_param_value`, gates both import steps, then uses `pick_value` to choose the first present AnnData output (`$IWC_FORMAT2/scRNAseq/scanpy-clustering/Preprocessing-and-Clustering-of-single-cell-RNA-seq-data-with-Scanpy.gxwf.yml:180-211`, `$IWC_FORMAT2/scRNAseq/scanpy-clustering/Preprocessing-and-Clustering-of-single-cell-RNA-seq-data-with-Scanpy.gxwf.yml:212-241`, `$IWC_FORMAT2/scRNAseq/scanpy-clustering/Preprocessing-and-Clustering-of-single-cell-RNA-seq-data-with-Scanpy.gxwf.yml:337-399`). Functional annotation fans out four `eggnog_mapper` modes from booleans derived upstream, then selects outputs with `pick_value` (`$IWC_FORMAT2/genome_annotation/functional-annotation/functional-annotation-of-sequences/Functional_annotation_of_sequences.gxwf.yml:244-395`, `$IWC_FORMAT2/genome_annotation/functional-annotation/functional-annotation-of-sequences/Functional_annotation_of_sequences.gxwf.yml:396-429`).

These selectors are the IUC Tool Shed tool `toolshed.g2.bx.psu.edu/repos/iuc/pick_value/pick_value/0.2.0`, not a Galaxy built-in workflow module. The Scanpy and eggNOG selectors cited here use `pick_style: first`. This style takes the earliest non-null candidate in repeat order and does not check that exactly one branch produced a value. [[conditional-route-between-alternative-outputs]] covers the route and selector together, including `only` for an exactly-one requirement. Do not infer every corpus selector uses `first`.

### Data-derived boolean from empty/non-empty collection

MGnify amplicon pipelines compute a boolean from a collection, then use it to gate output generation. The embedded subworkflow labeled `Map empty/not empty collection to boolean` extracts collection identifiers, counts lines with `wc_gnu`, converts `c1 != 0` into a boolean table with `column_maker`, and reads the result with `param_value_from_file` (`$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:1358-1483`). That boolean gates Krona and BIOM exports for SSU/LSU SILVA outputs (`$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:1330-1357`, `$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:1484-1659`).

VGP Hi-C uses the same broader shape with datasets rather than collections: `param_value_from_file` reads telomere BED outputs as text, `map_param_value` maps empty string to false and unmapped non-empty text to true, then `pretext_graph` steps are gated (`$IWC_FORMAT2/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:3057-3218`, `$IWC_FORMAT2/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:3289-3346`).

[[conditional-gate-on-nonempty-result]] covers this shape. The collection recipe counts identifiers, while the dataset recipe reads text content. Neither is a general scientific-validity check, and a non-empty result can still be wrong. The four-step collection shim is an observed construction with a verification record, not proof that it is the shortest available implementation.

### Optional transform then fallback to original

VGP suffixing and decontamination recipes show a `when`-gated transform paired with `pick_value` fallback. In Hi-C manual curation, optional suffix expressions and replacements run only when the user requests suffixes, then `pick_value` chooses the suffixed haplotype when present or the original haplotype otherwise (`$IWC_FORMAT2/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:338-459`, `$IWC_FORMAT2/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:460-479`). In Assembly decontamination, an upstream mapped boolean gates adaptor filtering, replacement, and concatenation. Later `pick_value` falls back to the original `Adaptor Action report` when the optional masking branch does not run (`$IWC_FORMAT2/VGP-assembly-v2/Assembly-decontamination-VGP9/Assembly-decontamination-VGP9.gxwf.yml:243-305`, `$IWC_FORMAT2/VGP-assembly-v2/Assembly-decontamination-VGP9/Assembly-decontamination-VGP9.gxwf.yml:331-391`, `$IWC_FORMAT2/VGP-assembly-v2/Assembly-decontamination-VGP9/Assembly-decontamination-VGP9.gxwf.yml:392-409`).

[[conditional-transform-or-pass-through]] covers this boundary: the original value remains available as fallback. With a first-present selector, candidate order must put the transformed output before the original. This differs from peer-mode routing because both values may be present when the transform runs.

### Optional subworkflow branch

IWC also gates entire embedded Galaxy subworkflows. MAGs-generation offers co-assembly and individual assembly with metaSPAdes, plus custom assemblies. The individual-assembly branch is an embedded workflow gated by `_unlabeled_step_19/output_param_boolean`, and a downstream `pick_value` chooses among individual, co-assembly, or custom assemblies (`$IWC_FORMAT2/microbiome/mags-building/MAGs-generation.gxwf.yml:260-294`, `$IWC_FORMAT2/microbiome/mags-building/MAGs-generation.gxwf.yml:295-410`, `$IWC_FORMAT2/microbiome/mags-building/MAGs-generation.gxwf.yml:411-439`).

The MAGs selector uses `pick_style: first` with individual, co-assembly, and custom assemblies in that order. Gating an embedded subworkflow therefore extends the same route-and-select recipe. It does not require a separate operation pattern.

## Established pattern boundaries

The conditionals map already exists at [[galaxy-conditionals-patterns]]. Its pages separate the action required downstream:

| Need | Observed mechanism | Pattern |
|---|---|---|
| Run optional work from a user choice or available boolean | Boolean connected to `when` on optional steps | [[conditional-run-optional-step]] |
| Continue with one of several compatible outputs | Gate peer alternatives and select an output | [[conditional-route-between-alternative-outputs]] |
| Avoid reporting or exporting an empty result | Derive a boolean from membership or content, then gate the consumer | [[conditional-gate-on-nonempty-result]] |
| Preserve the original value unless transformed | Gate the transform and select transformed output before original fallback | [[conditional-transform-or-pass-through]] |
| Drop or replace unusable collection members after map-over | Collection cleanup tools | [[collection-cleanup-after-mapover-failure]] |

A tool's internal conditional can be appropriate when the choice belongs inside that tool's operation. A workflow-level gate exposes whether a step runs. Select by the behavior required, not by whether one mechanism is more common in this corpus.

`__FILTER_EMPTY_DATASETS__` and `__FILTER_FAILED_DATASETS__` address collection state after mapped work. They do not establish an alternative output for an unconditional consumer of a skipped branch. `__FILTER_NULL__` is a catalog capability with no observed use here. Its fit needs separate evidence about the intended nullable output and downstream collection shape. Zero uptake alone does not justify rejection.

## Verification record and limits

The existing verification record for `verification/workflows/conditional-gate-on-nonempty-result/gate-on-nonempty.gxwf-test.yml` reports two passing cases under Planemo 0.75.41 against Galaxy `release_25.1`, using the MGnify-style collection-to-boolean shim. This is a recorded result, not a new run performed for this survey revision.

That record also reports two rejected shorter candidates. The tested direct collection-derived `when` failed with `when_not_boolean`, and an embedded CWL `ExpressionTool` failed validation with gxformat2 0.21.0. These outcomes apply to those constructions and versions. They do not establish that every shorter boolean-producing route is invalid or that the current validator has the same restriction.

The snapshot inventory establishes observed syntax, topology, and tool parameters. It does not rerun every workflow, prove that all mode booleans are exclusive, or show that non-empty reporting inputs contain scientifically correct results. The linked pattern pages carry construction details and their own evidence grades.

## Pinned upstream exemplars

These native IWC workflow sources correspond to the local format2 citations above:

- [BRAKER3](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/genome_annotation/annotation-braker3/Genome_annotation_with_braker3.ga)
- [RNA-seq paired end](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/transcriptomics/rnaseq-pe/rnaseq-pe.ga)
- [Scanpy import routing](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/scRNAseq/scanpy-clustering/Preprocessing-and-Clustering-of-single-cell-RNA-seq-data-with-Scanpy.ga)
- [Functional annotation](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/genome_annotation/functional-annotation/functional-annotation-of-sequences/Functional_annotation_of_sequences.ga)
- [MGnify rRNA prediction](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.ga)
- [VGP Hi-C manual curation](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.ga)
- [VGP assembly decontamination](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/VGP-assembly-v2/Assembly-decontamination-VGP9/Assembly-decontamination-VGP9.ga)
- [MAGs generation](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/microbiome/mags-building/MAGs-generation.ga)
