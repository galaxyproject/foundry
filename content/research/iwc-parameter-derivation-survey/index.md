---
type: research
tags:
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-09-26
revision: 2
related_notes:
  - "[[iwc-conditionals-survey]]"
  - "[[iwc-tabular-operations-survey]]"
  - "[[iwc-transformations-survey]]"
  - "[[compose-runtime-text-parameter]]"
  - "[[conditional-gate-on-nonempty-result]]"
  - "[[conditional-route-between-alternative-outputs]]"
  - "[[conditional-run-optional-step]]"
  - "[[derive-parameter-from-file]]"
  - "[[map-workflow-enum-to-tool-parameter]]"
  - "[[tabular-compute-new-column]]"
  - "[[component-nextflow-pipeline-anatomy]]"
related_patterns:
  - "[[conditional-gate-on-nonempty-result]]"
  - "[[conditional-route-between-alternative-outputs]]"
  - "[[tabular-filter-by-column-value]]"
  - "[[tabular-compute-new-column]]"
  - "[[tabular-cut-and-reorder-columns]]"
  - "[[tabular-split-taxonomy-string]]"
sources:
  - "https://github.com/galaxyproject/foundry/issues/89"
summary: "Corpus survey of Galaxy workflow recipes that turn upstream data, metadata, or small files into runtime parameters."
---

# IWC parameter derivation survey

The pinned IWC snapshot derives runtime parameters by reading small datasets, mapping existing parameter values, and composing text for downstream tools. The reusable mechanisms recur across domains, while the formulas and downstream syntax remain specific to each workflow.

## Evidence scope

Source corpus: 120 cleaned `gxformat2` workflows under `$IWC_FORMAT2/`, materialized in `workflow-fixtures/iwc-format2/` from IWC commit `deafc4876f2c778aaf075e48bd8e95f3604ccc92`, recorded in `workflow-fixtures/fixtures.yaml`. This is a pinned snapshot, not the current IWC catalog. Local citations use `$IWC_FORMAT2/path:line` from that materialization. Pinned native source links appear below.

Inventory counts were recounted from the corresponding 120 native `.ga` JSON files by recursively traversing `steps` and each embedded `subworkflow`. Each embedded occurrence counts within its containing workflow, even if the same subworkflow occurs elsewhere. Tool Shed IDs are grouped by tool name across versions. Workflow-file counts count each containing file once. These counts exclude `unique_tools` summaries and count all uses of each listed tool, including uses outside parameter derivation. Full format2 reads establish the selected recipes and connections.

Scope: workflow steps that derive a Galaxy runtime parameter from upstream data, metadata, or a small intermediate file. These steps connect dataset-derived values to tools that consume integer, float, text, or boolean parameters, including text expressions assembled at runtime.

Out of scope:

- Pure row/column transformations whose output remains a dataset. Covered by [[iwc-tabular-operations-survey]].
- Pure collection structure work. Covered by [[iwc-transformations-survey]].
- Conditional graph topology after a boolean already exists. Covered by [[iwc-conditionals-survey]].

## 1. Tool inventory

| Tool / family | Parsed steps | Workflow files | Main role |
|---|---:|---:|---|
| `compose_text_param` | 81 | 32 | Build connected text expressions, filters, labels, command fragments, and region strings |
| `param_value_from_file` | 97 | 34 | Read a scalar from a dataset into a typed runtime parameter |
| `map_param_value` | 56 | 17 | Map booleans/enums/text/integer values into booleans, tool flags, enum codes, or generated snippets |
| `pick_value` | 67 | 20 | Select values or provide defaults. Adjacent conditional/defaulting operation |
| `Add_a_column1` (`column_maker` wrapper family) | 55 | 18 | Compute a new dataset column. A scalar result contributes to derivation when later read by `param_value_from_file` |
| `collection_element_identifiers` | 53 | 21 | Expose collection identifiers as lines for counts, relabels, filters, or other collection recipes |
| `wc_gnu` | 35 | 13 | Count file content. Only some uses feed parameter conversion |

These are tool inventories, not counts of complete derivation recipes. For example, a `wc_gnu` step can feed another dataset tool without producing a runtime parameter. The examples below use `column_maker` as shorthand for the wrapper family, while its serialized tool ID is `Add_a_column1`. `pick_value` is the IUC Tool Shed tool, not a Galaxy built-in workflow module.

The 97 `param_value_from_file` occurrences select `integer` 47 times, `text` 24 times, `boolean` 22 times, and `float` four times. Every serialized setting enables newline removal, with two native states storing `"true"` as text instead of a JSON boolean. This describes the snapshot settings, not a requirement that text parameters always discard line breaks.

## 2. Observed derivation classes

### 2a. Dataset scalar to typed parameter

`param_value_from_file` is the central bridge from datasets to typed parameters. The pattern is: some upstream step writes one scalar into a tiny dataset, then `param_value_from_file` reads it as `integer`, `float`, `text`, or `boolean` with `remove_newlines: true`.

Examples:

- VGP assembly workflows read computed genome-size and coverage files into integer/float parameters for downstream assembly tools. Examples include estimated genome size and read coverage in `$IWC_FORMAT2/VGP-assembly-v2/kmer-profiling-hifi-VGP1/kmer-profiling-hifi-VGP1.gxwf.yml` and related VGP workflows, with repeated `param_value_from_file` steps concentrated in the VGP family.
- Consensus peak workflows compute a minimum read count table, read its value as a text parameter, write that value once per replicate, split the resulting file into a collection, and read each scalar back as an integer parameter for `samtools_view` subsampling (`$IWC_FORMAT2/epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:372-410`, `$IWC_FORMAT2/epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:410-499`). The same recipe appears in `consensus-peaks-chip-pe` and `consensus-peaks-chip-sr`.
- Influenza counts identifier rows for forward and reverse data with `wc_gnu`, then converts those counts to integer parameters before duplicating files into collections (`$IWC_FORMAT2/virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping.gxwf.yml:198-287`).
- VGP Hi-C reads telomere BED contents as text, then maps empty text to `false` and non-empty text to `true` for gating Pretext tracks (`$IWC_FORMAT2/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:3057-3218`).

This bridge is generic. The upstream calculation is domain-specific, but the final scalar-read step is reusable and easy to get wrong because downstream tools need the typed output port, not the dataset.

### 2b. Count file or collection shape, then parameterize

The tightest recurring numeric recipe is `wc_gnu -> param_value_from_file`. The count may be a line count, a character count, or an element-count proxy after `collection_element_identifiers`.

Examples:

- Consensus peaks count the number of replicate rows with `wc_gnu`, read the count as an integer parameter, and use it as the repeat count for generating a per-replicate scalar dataset (`$IWC_FORMAT2/epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:299-318`, `$IWC_FORMAT2/epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:392-423`).
- Influenza counts lines in two upstream files and reads both counts as integer parameters (`$IWC_FORMAT2/virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping.gxwf.yml:198-287`).
- HyPhy counts characters in a cleaned regular expression with `wc_gnu` (`options: [characters]`) before downstream checks (`$IWC_FORMAT2/comparative_genomics/hyphy/capheine-core-and-compare.gxwf.yml:754-769`). A later `tp_awk_tool` step emits `false` for a zero count and `true` for a positive count, and `param_value_from_file` reads that result as a boolean. This is a second observed boolean-producing calculation, alongside MGnify's `column_maker` recipe (`$IWC_FORMAT2/comparative_genomics/hyphy/capheine-core-and-compare.gxwf.yml:797-870`).

For collections, the count step often starts from `collection_element_identifiers`. The MGnify embedded subworkflow extracts element identifiers, counts lines, computes `c1 != 0` with `column_maker`, and reads the result as a boolean parameter (`$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:1358-1483`). That recipe is already the strongest evidence for [[conditional-gate-on-nonempty-result]].

### 2c. Map enum or boolean inputs to tool-specific parameter values

`map_param_value` appears in two broad forms.

The first is graph-control or boolean normalization: invert a boolean, map one enum member to `true`, or turn empty/non-empty text into a boolean. This mostly belongs to the conditional pattern family.

Examples:

- Scanpy inverts a user boolean so legacy 10x and 10x v3 import branches can be mutually exclusive, then `pick_value` selects the available AnnData output (`$IWC_FORMAT2/scRNAseq/scanpy-clustering/Preprocessing-and-Clustering-of-single-cell-RNA-seq-data-with-Scanpy.gxwf.yml:173-241`, `$IWC_FORMAT2/scRNAseq/scanpy-clustering/Preprocessing-and-Clustering-of-single-cell-RNA-seq-data-with-Scanpy.gxwf.yml:337-404`).
- Functional annotation maps `Selected sequence type` to one boolean per eggNOG mode, gates four mutually exclusive branches, then selects the available outputs (`$IWC_FORMAT2/genome_annotation/functional-annotation/functional-annotation-of-sequences/Functional_annotation_of_sequences.gxwf.yml:90-239`, `$IWC_FORMAT2/genome_annotation/functional-annotation/functional-annotation-of-sequences/Functional_annotation_of_sequences.gxwf.yml:240-429`).
- VGP Hi-C maps empty text from telomere BED files to `false` and unmapped non-empty text to `true` (`$IWC_FORMAT2/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:3057-3218`).

The second form is tool-parameter normalization: map one workflow-facing enum into the exact flag/code/snippet needed by a downstream tool.

Examples:

- RNA-seq maps `Strandedness` into separate parameter dialects for `featureCounts`, Cufflinks, StringTie, replacement regexes, and STAR-count awk (`$IWC_FORMAT2/transcriptomics/rnaseq-pe/rnaseq-pe.gxwf.yml:270-369`. More mappings continue later in the same workflow and are mirrored in `rnaseq-sr`).
- VGP Hi-C maps haplotype labels like `Haplotype 1`, `Haplotype 2`, `Primary`, and `Alternate` into short suffixes (`H1`, `H2`, `pri`, `alt`) before composing replacement expressions (`$IWC_FORMAT2/VGP-assembly-v2/Scaffolding-HiC-VGP8/Scaffolding-HiC-VGP8.gxwf.yml:276-340`).
- The taxonomic-rank summary workflow maps `Taxonomic rank` into large awk programs, then connects those generated snippets as the `code` parameter of `tp_awk_tool` (`$IWC_FORMAT2/amplicon/amplicon-mgnify/taxonomic-rank-abundance-summary-table/taxonomic-rank-abundance-summary-table.gxwf.yml:40-140`). The reusable pattern is enum-to-snippet mapping. The biological taxonomy code and its maintenance requirements are specific to this workflow.

The boundary is important: boolean mapping for branch topology should merge into conditionals, while enum-to-tool-dialect mapping deserves a parameter-derivation page.

### 2d. Compose connected text expressions from typed parameters

`compose_text_param` is the dominant connected-text builder. It constructs expression strings for filters, awk snippets, tool config lines, labels, and genomic regions from user parameters or upstream scalar parameters.

Examples:

- Consensus peaks builds a `Filter1` condition `c4 >= <minimum overlap>` from a workflow integer input, then connects it as the `cond` parameter (`$IWC_FORMAT2/epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:102-128`, `$IWC_FORMAT2/epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:318-337`).
- SRA manifest processing maps the SRA column sentinel `0` to `1` and passes other values through unchanged. It composes `c<SRA column>,c<identifier column>` text, and connects it to `Cut1.columnList` (`$IWC_FORMAT2/data-fetching/sra-manifest-to-concatenated-fastqs/sra-manifest-to-concatenated-fastqs.gxwf.yml:32-113`).
- GROMACS dcTMD composes config lines such as `pull_coord1_rate = <rate>`, `dt = <step length>`, and `nsteps = <number>` (`$IWC_FORMAT2/computational-chemistry/gromacs-dctmd/gromacs-dctmd.gxwf.yml:553-654`).
- Pox virus amplicon processing composes genomic ranges and pool suffixes from upstream text parameters (`$IWC_FORMAT2/virology/pox-virus-amplicon/pox-virus-half-genome.gxwf.yml:560-669`).
- SARS-CoV-2 and generic variant-reporting workflows compose complex filter expressions from AF/DP thresholds. Those are domain-specific but show the same connected-expression mechanism.

This repeatedly observed mechanism builds text parameters without a custom wrapper. It concatenates components and does not validate the downstream expression syntax.

### 2e. Compute a table value, then escape back to parameter-land

`column_maker` usually belongs to the tabular hierarchy, but there is one parameter-derivation subcase: compute a single value in a table, then read it back with `param_value_from_file`.

Examples:

- MGnify non-empty collection gate computes `c1 != 0` over a one-line count file, then reads the boolean with `param_value_from_file` (`$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:1396-1463`).
- VGP workflows compute formulas like `c3/<integer>` after converting coverage or genome-size estimates to parameters. These are mostly domain-specific assembly calculations rather than standalone parameter patterns.

The reusable bit is not `column_maker` by itself. It is the round trip: file scalar -> tabular expression -> typed parameter. Keep this as a subsection inside scalar/boolean derivation pages rather than a standalone page.

## 3. Reusable mechanisms and domain-specific values

Reusable mechanisms:

- `param_value_from_file` as the file-to-typed-parameter bridge.
- `wc_gnu -> param_value_from_file` for count-to-integer.
- `collection_element_identifiers -> wc_gnu -> column_maker -> param_value_from_file` for collection non-empty boolean.
- `map_param_value` for enum-to-boolean and enum-to-tool-dialect mapping.
- `compose_text_param` for dynamic text/expression construction.

Domain-specific values:

- RNA-seq strandedness maps are reusable across RNA-seq workflows but still tied to downstream tool dialects (`featureCounts`, Cufflinks, StringTie, STAR-count awk).
- Taxonomic-rank-to-awk snippets are specific to the MGnify summary workflow shape.
- GROMACS config-line composition is specific to GROMACS tools, even though the `compose_text_param` mechanism is generic.
- VGP haplotype suffix abbreviation is a domain convention, not a Galaxy-wide parameter derivation rule.

The pattern pages describe the common mechanisms and use domain examples to show their boundaries. RNA-seq numeric codes are text in the observed mappings. StringTie maps `unstranded` to an empty string, which is a meaningful flag choice. Those details must survive translation even though the mapping operation is generic.

## 4. Established pattern boundaries

The survey's original candidate decisions now correspond to existing pages. The table retains the candidate letters used by neighboring notes as a record of those boundaries.

| Original candidate | Need | Current coverage |
|---|---|---|
| A: scalar file bridge | Connect a dataset value to a typed tool parameter | [[derive-parameter-from-file]] |
| B: count parameter | Count rows, characters, or collection identifiers before converting the result | Count recipes within [[derive-parameter-from-file]] |
| C: non-empty boolean | Derive a boolean from data and skip downstream reporting when empty | [[conditional-gate-on-nonempty-result]] |
| D: enum mapping | Translate workflow choices into downstream codes, flags, or snippets | [[map-workflow-enum-to-tool-parameter]] |
| E: runtime text | Concatenate literals and connected scalar values into a text parameter | [[compose-runtime-text-parameter]] |
| F: routing boolean | Invert a boolean or map enum choices to branch-control values | [[conditional-route-between-alternative-outputs]] and [[conditional-run-optional-step]] |
| G: tabular scalar calculation | Calculate a dataset value, then expose it as a parameter | [[tabular-compute-new-column]] for the column calculation and [[derive-parameter-from-file]] for the bridge |
| H: default or available value | Choose among optional parameters or nullable branch outputs | Adjacent selection operation, with routed outputs covered by [[conditional-route-between-alternative-outputs]] |

`pick_value` remains useful context even though selection does not calculate a new value from upstream data. Scanpy uses it both for optional numeric defaults and for selecting the available AnnData output. The consumer's behavior determines which pattern applies.

## 5. Construction checks

- Connect the selected typed port from `param_value_from_file`, such as `integer_param` or `boolean_param`. A dataset connection does not substitute for a parameter connection.
- Match the scalar producer to the intended measurement. An identifier row count measures the exposed collection identifiers, while a character count measures file content. Neither establishes scientific correctness.
- Preserve the mapper's output type, exact mapping values, and unmapped-value policy. Numeric-looking text codes and empty string flags can be deliberate.
- Preserve component order, connection paths, literal spaces, and punctuation in composed text. The downstream tool's syntax still needs checking.
- Keep dataset computation separate from parameter conversion in the explanation. `column_maker` alone does not expose a typed runtime parameter.
- For data-derived `when`, establish a boolean-producing connection before applying the conditional topology. A dataset or collection is not itself proof of a valid boolean input.

## 6. Verification record and limits

The collection non-empty recipe connects this survey to [[iwc-conditionals-survey]]:

```text
collection_element_identifiers -> wc_gnu -> column_maker(c1 != 0) -> param_value_from_file -> when
```

The existing record at `verification/workflows/conditional-gate-on-nonempty-result/README.md` reports two passing cases under Planemo 0.75.41 against Galaxy `release_25.1` using the MGnify-style shim. It also records a tested direct collection-derived gate failing with `when_not_boolean`, and an embedded CWL `ExpressionTool` rejected by gxformat2 0.21.0. These are recorded outcomes for those constructions and versions, not a new execution for this revision or evidence that every shorter boolean-producing recipe is invalid.

The source recount establishes the inventory, and inspected workflow excerpts establish the selected settings and connections. It does not rerun all 120 workflows or prove that each domain formula produces scientifically correct results. The linked pattern pages carry their own evidence grades and verification fixtures.

## Pinned upstream exemplars

These native sources correspond to the local format2 examples above:

- [VGP k-mer profiling](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/VGP-assembly-v2/kmer-profiling-hifi-VGP1/kmer-profiling-hifi-VGP1.ga)
- [Consensus peaks ATAC/CUT&RUN](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.ga)
- [Influenza consensus and subtyping](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping.ga)
- [VGP Hi-C manual curation](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.ga)
- [HyPhy CAPHEINE](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/comparative_genomics/hyphy/capheine-core-and-compare.ga)
- [MGnify rRNA prediction](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.ga)
- [Scanpy preprocessing and clustering](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/scRNAseq/scanpy-clustering/Preprocessing-and-Clustering-of-single-cell-RNA-seq-data-with-Scanpy.ga)
- [Functional annotation](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/genome_annotation/functional-annotation/functional-annotation-of-sequences/Functional_annotation_of_sequences.ga)
- [RNA-seq paired end](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/transcriptomics/rnaseq-pe/rnaseq-pe.ga)
- [VGP Hi-C scaffolding](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/VGP-assembly-v2/Scaffolding-HiC-VGP8/Scaffolding-HiC-VGP8.ga)
- [Taxonomic rank abundance summary](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/amplicon/amplicon-mgnify/taxonomic-rank-abundance-summary-table/taxonomic-rank-abundance-summary-table.ga)
- [SRA manifest processing](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/data-fetching/sra-manifest-to-concatenated-fastqs/sra-manifest-to-concatenated-fastqs.ga)
- [GROMACS dcTMD](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/computational-chemistry/gromacs-dctmd/gromacs-dctmd.ga)
- [Pox virus half-genome amplicons](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/virology/pox-virus-amplicon/pox-virus-half-genome.ga)
