---
type: research
tags:
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-05-02
revision: 1
ai_generated: true
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

Source corpus: 120 cleaned `gxformat2` workflows under `$IWC_FORMAT2/`, materialized in `workflow-fixtures/iwc-format2/` from pinned IWC commit `deafc4876f2c778aaf075e48bd8e95f3604ccc92`. Counts below are parsed step counts over top-level and embedded subworkflow `steps`, excluding trailing `unique_tools` summaries. Citations use `$IWC_FORMAT2/path:line`.

Scope: workflow steps that derive a Galaxy runtime parameter from upstream data, metadata, or a small intermediate file. This is the shim layer between ordinary data transforms and tools whose inputs are typed as `integer_param`, `float_param`, `text_param`, `boolean_param`, or connected expression strings.

Out of scope:

- Pure row/column transformations whose output remains a dataset; covered by [[iwc-tabular-operations-survey]].
- Pure collection structure work; covered by [[iwc-transformations-survey]].
- Conditional graph topology after a boolean already exists; covered by [[iwc-conditionals-survey]].

## 1. Tool inventory

| Tool / family | Parsed steps | Workflow files | Main role |
|---|---:|---:|---|
| `compose_text_param` | 63 | 30 | Build connected text expressions, filters, labels, command fragments, and region strings |
| `param_value_from_file` | 50 | 26 | Read a scalar from a dataset into a typed runtime parameter |
| `map_param_value` | 26 | 14 | Map booleans/enums/text/integer values into booleans, tool flags, enum codes, or generated snippets |
| `pick_value` | 49 | 16 | Choose first present value or provide defaults; adjacent but usually conditional/defaulting rather than derivation |
| `column_maker` / `Add_a_column1` | 20 | 13 | Compute values in tabular-land; only a parameter-derivation shim when immediately followed by `param_value_from_file` |
| `collection_element_identifiers` | 18 | 12 | Expose collection metadata as lines; feeds counts, relabels, filters, or other collection recipes |
| `wc_gnu` | 8 | 5 | Count lines or characters when its output is later consumed as a parameter |

The grep surface is larger because `unique_tools` repeats tool IDs and some surveys count those summaries. The parsed count above is better for authored step shapes.

## 2. Observed derivation classes

### 2a. Dataset scalar to typed parameter

`param_value_from_file` is the central bridge from file-land to parameter-land. The pattern is: some upstream step writes one scalar into a tiny dataset, then `param_value_from_file` reads it as `integer`, `float`, `text`, or `boolean` with `remove_newlines: true`.

Examples:

- VGP assembly workflows read computed genome-size and coverage files into integer/float parameters for downstream assembly tools. Examples include estimated genome size and read coverage in `$IWC_FORMAT2/VGP-assembly-v2/kmer-profiling-hifi-VGP1/kmer-profiling-hifi-VGP1.gxwf.yml` and related VGP workflows, with repeated `param_value_from_file` steps concentrated in the VGP family.
- Consensus peak workflows compute a minimum read count table, convert it to text, replicate it into a small collection, split it, and read each scalar back as an integer parameter for `samtools_view` subsampling (`$IWC_FORMAT2/epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:372-410`, `$IWC_FORMAT2/epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:410-499`). The same recipe appears in `consensus-peaks-chip-pe` and `consensus-peaks-chip-sr`.
- Influenza counts forward and reverse collection elements with `wc_gnu`, then converts those counts to integer parameters before duplicating files into collections (`$IWC_FORMAT2/virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping.gxwf.yml:198-287`).
- VGP Hi-C reads telomere BED contents as text, then maps empty text to `false` and non-empty text to `true` for gating Pretext tracks (`$IWC_FORMAT2/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:3057-3218`).

This bridge is generic. The upstream calculation is domain-specific, but the final scalar-read step is reusable and easy to get wrong because downstream tools need the typed output port, not the dataset.

### 2b. Count file or collection shape, then parameterize

The tightest recurring numeric recipe is `wc_gnu -> param_value_from_file`. The count may be a line count, a character count, or an element-count proxy after `collection_element_identifiers`.

Examples:

- Consensus peaks count the number of replicate rows with `wc_gnu`, read the count as an integer parameter, and use it as the repeat count for generating a per-replicate scalar dataset (`$IWC_FORMAT2/epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:299-318`, `$IWC_FORMAT2/epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:392-423`).
- Influenza counts lines in two upstream files and reads both counts as integer parameters (`$IWC_FORMAT2/virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping.gxwf.yml:198-287`).
- HyPhy counts characters in a cleaned regular expression with `wc_gnu` (`options: [characters]`) before downstream checks (`$IWC_FORMAT2/comparative_genomics/hyphy/capheine-core-and-compare.gxwf.yml:754-769`). This is a thinner signal than line-count-to-integer, but it shows the same "measure a file, then branch or parameterize" posture.

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

- RNA-seq maps `Strandedness` into separate parameter dialects for `featureCounts`, Cufflinks, StringTie, replacement regexes, and STAR-count awk (`$IWC_FORMAT2/transcriptomics/rnaseq-pe/rnaseq-pe.gxwf.yml:270-369`; more mappings continue later in the same workflow and are mirrored in `rnaseq-sr`).
- VGP Hi-C maps haplotype labels like `Haplotype 1`, `Haplotype 2`, `Primary`, and `Alternate` into short suffixes (`H1`, `H2`, `pri`, `alt`) before composing replacement expressions (`$IWC_FORMAT2/VGP-assembly-v2/Scaffolding-HiC-VGP8/Scaffolding-HiC-VGP8.gxwf.yml:276-340`).
- The taxonomic-rank summary workflow maps `Taxonomic rank` into large awk programs, then connects those generated snippets as the `code` parameter of `tp_awk_tool` (`$IWC_FORMAT2/amplicon/amplicon-mgnify/taxonomic-rank-abundance-summary-table/taxonomic-rank-abundance-summary-table.gxwf.yml:40-140`). This is powerful but brittle; the reusable pattern is enum-to-snippet mapping, not the biological taxonomy code itself.

The boundary is important: boolean mapping for branch topology should merge into conditionals, while enum-to-tool-dialect mapping deserves a parameter-derivation page.

### 2d. Compose connected text expressions from typed parameters

`compose_text_param` is the dominant connected-text builder. It constructs expression strings for filters, awk snippets, tool config lines, labels, and genomic regions from user parameters or upstream scalar parameters.

Examples:

- Consensus peaks builds a `Filter1` condition `c4 >= <minimum overlap>` from a workflow integer input, then connects it as the `cond` parameter (`$IWC_FORMAT2/epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:102-128`, `$IWC_FORMAT2/epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:318-337`).
- SRA manifest processing maps zero-based user input to a one-based column number, composes `c<id>,c<id>` text, and connects it to `Cut1.columnList` (`$IWC_FORMAT2/data-fetching/sra-manifest-to-concatenated-fastqs/sra-manifest-to-concatenated-fastqs.gxwf.yml:32-113`).
- GROMACS dcTMD composes config lines such as `pull_coord1_rate = <rate>`, `dt = <step length>`, and `nsteps = <number>` (`$IWC_FORMAT2/computational-chemistry/gromacs-dctmd/gromacs-dctmd.gxwf.yml:553-654`).
- Pox virus amplicon processing composes genomic ranges and pool suffixes from upstream text parameters (`$IWC_FORMAT2/virology/pox-virus-amplicon/pox-virus-half-genome.gxwf.yml:560-669`).
- SARS-CoV-2 and generic variant-reporting workflows compose complex filter expressions from AF/DP thresholds; those are domain-specific but show the same connected-expression mechanism.

This is a strong generic shim pattern because it is the only corpus-backed way to turn typed workflow parameters into dynamic expression strings for tools that accept text parameters but need exact syntax.

### 2e. Compute a table value, then escape back to parameter-land

`column_maker` usually belongs to the tabular hierarchy, but there is one parameter-derivation subcase: compute a single value in a table, then read it back with `param_value_from_file`.

Examples:

- MGnify non-empty collection gate computes `c1 != 0` over a one-line count file, then reads the boolean with `param_value_from_file` (`$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:1396-1463`).
- VGP workflows compute formulas like `c3/<integer>` after converting coverage or genome-size estimates to parameters; these are mostly domain-specific assembly calculations rather than standalone parameter patterns.

The reusable bit is not `column_maker` by itself. It is the round trip: file scalar -> tabular expression -> typed parameter. Keep this as a subsection inside scalar/boolean derivation pages rather than a standalone page.

## 3. Generic shims vs tool-tied derivations

Generic shims:

- `param_value_from_file` as the file-to-typed-parameter bridge.
- `wc_gnu -> param_value_from_file` for count-to-integer.
- `collection_element_identifiers -> wc_gnu -> column_maker -> param_value_from_file` for collection non-empty boolean.
- `map_param_value` for enum-to-boolean and enum-to-tool-dialect mapping.
- `compose_text_param` for dynamic text/expression construction.

Tool-tied derivations:

- RNA-seq strandedness maps are reusable across RNA-seq workflows but still tied to downstream tool dialects (`featureCounts`, Cufflinks, StringTie, STAR-count awk).
- Taxonomic-rank-to-awk snippets are specific to the MGnify summary workflow shape.
- GROMACS config-line composition is specific to GROMACS tools, even though the `compose_text_param` mechanism is generic.
- VGP haplotype suffix abbreviation is a domain convention, not a Galaxy-wide parameter derivation rule.

The pattern pages should lead with the generic shim, then include tool-tied examples as evidence and caveats. Do not make a page for every downstream dialect.

## 4. Candidate pattern boundaries

### Candidate A: `derive-parameter-from-file`

Scope: read a scalar dataset into a typed Galaxy runtime parameter with `param_value_from_file`, including `integer`, `float`, `text`, and `boolean` outputs.

Evidence:

- Consensus peak minimum-read and replicate-count scalar reads: `$IWC_FORMAT2/epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:372-410`, `$IWC_FORMAT2/epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:467-499`.
- Influenza line counts converted to integer parameters: `$IWC_FORMAT2/virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping.gxwf.yml:198-287`.
- VGP telomere text read for later boolean mapping: `$IWC_FORMAT2/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:3057-3092`.

Call: **keep**. This is the central data-to-parameter bridge, repeated across domains.

### Candidate B: `derive-count-parameter-from-file-or-collection`

Scope: count lines/elements/characters with `wc_gnu` or `collection_element_identifiers`, then use the count as a runtime parameter.

Evidence:

- Replicate count in consensus peaks: `$IWC_FORMAT2/epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:299-318`, `$IWC_FORMAT2/epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:392-423`.
- Influenza count-to-collection-size parameters: `$IWC_FORMAT2/virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping.gxwf.yml:198-287`.
- MGnify collection identifier count: `$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:1376-1414`.

Call: **keep, likely as a subsection of Candidate A unless the page gets too large**. The recipe is smaller than the scalar bridge but common enough to name.

### Candidate C: `derive-nonempty-boolean-parameter`

Scope: derive `true`/`false` from whether a dataset or collection has content, then use it as a `when` input or other boolean parameter.

Evidence:

- MGnify collection non-empty subworkflow: `$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:1358-1483`.
- VGP telomere text empty/non-empty mapping: `$IWC_FORMAT2/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:3057-3218`.
- Gated downstream Pretext/Krona/BIOM outputs are already covered in [[iwc-conditionals-survey]].

Call: **merge into [[conditional-gate-on-nonempty-result]]**. The boolean-derivation mechanics should be a major section of that pattern, not a separate sibling page. Verified-pattern workflow issue #84 should test this directly before recommending a shorter alternative over the MGnify four-step recipe: https://github.com/galaxyproject/foundry/issues/84.

### Candidate D: `map-workflow-enum-to-tool-parameter`

Scope: map a workflow-facing enum or string value to one or more downstream tool dialects: numeric codes, flags, replacement snippets, or command fragments.

Evidence:

- RNA-seq `Strandedness` mapped into `featureCounts`, Cufflinks, StringTie, replacement regexes, and STAR-count awk snippets: `$IWC_FORMAT2/transcriptomics/rnaseq-pe/rnaseq-pe.gxwf.yml:270-369` and later mappings in the same file; mirrored in `rnaseq-sr`.
- VGP haplotype labels mapped to suffix abbreviations: `$IWC_FORMAT2/VGP-assembly-v2/Scaffolding-HiC-VGP8/Scaffolding-HiC-VGP8.gxwf.yml:276-340`.
- Taxonomic rank mapped to generated awk programs: `$IWC_FORMAT2/amplicon/amplicon-mgnify/taxonomic-rank-abundance-summary-table/taxonomic-rank-abundance-summary-table.gxwf.yml:40-140`.

Call: **keep**. This is distinct from conditionals when the output is a tool parameter, not a branch-control boolean.

### Candidate E: `compose-runtime-text-parameter`

Scope: build connected text/expression parameters with `compose_text_param` from constants plus workflow or upstream scalar values.

Evidence:

- `Filter1.cond` expression in consensus peaks: `$IWC_FORMAT2/epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:102-128`, `$IWC_FORMAT2/epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:318-337`.
- Dynamic `Cut1.columnList` in SRA manifest processing: `$IWC_FORMAT2/data-fetching/sra-manifest-to-concatenated-fastqs/sra-manifest-to-concatenated-fastqs.gxwf.yml:32-113`.
- GROMACS config-line construction: `$IWC_FORMAT2/computational-chemistry/gromacs-dctmd/gromacs-dctmd.gxwf.yml:553-654`.
- Pox virus range and suffix construction: `$IWC_FORMAT2/virology/pox-virus-amplicon/pox-virus-half-genome.gxwf.yml:560-669`.

Call: **keep**. This is the highest-value standalone page from this survey after `param_value_from_file` because it explains how to build dynamic expressions without writing a custom wrapper.

### Candidate F: `map-parameter-for-conditional-routing`

Scope: invert booleans or map enum values to booleans for `when` gates.

Evidence:

- Scanpy 10x import branch inversion: `$IWC_FORMAT2/scRNAseq/scanpy-clustering/Preprocessing-and-Clustering-of-single-cell-RNA-seq-data-with-Scanpy.gxwf.yml:173-241`, `$IWC_FORMAT2/scRNAseq/scanpy-clustering/Preprocessing-and-Clustering-of-single-cell-RNA-seq-data-with-Scanpy.gxwf.yml:337-404`.
- Functional annotation one-of-N eggNOG gates: `$IWC_FORMAT2/genome_annotation/functional-annotation/functional-annotation-of-sequences/Functional_annotation_of_sequences.gxwf.yml:90-239`, `$IWC_FORMAT2/genome_annotation/functional-annotation/functional-annotation-of-sequences/Functional_annotation_of_sequences.gxwf.yml:240-429`.

Call: **merge into [[conditional-route-between-alternative-outputs]] and [[conditional-run-optional-step]]**. Do not create a parameter-derivation page just for boolean gate plumbing.

### Candidate G: `compute-tabular-value-then-parameterize`

Scope: use `column_maker`, `table_compute`, or a tabular tool to compute one scalar, then read it as a parameter.

Evidence:

- MGnify `c1 != 0` boolean in the non-empty collection gate: `$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:1396-1463`.
- Consensus peaks `table_compute` minimum value used to drive subsampling: `$IWC_FORMAT2/epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:263-299`, `$IWC_FORMAT2/epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:372-499`.

Call: **merge**. Cover the tabular computation in [[tabular-compute-new-column]] or a relevant tabular page, and cover the escape back to parameter-land in Candidate A. A standalone page would duplicate both.

### Candidate H: `pick-default-or-first-available-parameter`

Scope: use `pick_value` for defaults or to collapse nullable branch outputs.

Evidence:

- Scanpy defaults several optional numeric parameters with `pick_value`, then also uses it to select the available AnnData output (`$IWC_FORMAT2/scRNAseq/scanpy-clustering/Preprocessing-and-Clustering-of-single-cell-RNA-seq-data-with-Scanpy.gxwf.yml:241-404`).
- Conditional surveys already cover `pick_value` as the branch-output merge after gated alternatives.

Call: **drop from this survey's hierarchy**. It is parameter defaulting or conditional output selection, not derivation from upstream data. Keep it inside conditionals and optional-input/default-value guidance if that page lands later.

## 5. Cross-links to conditionals and verified patterns

The parameter-derivation and conditional surveys overlap at exactly one high-value seam: **derive a boolean from data, then use it as `when`**. The pattern page should be [[conditional-gate-on-nonempty-result]], not a separate parameter page, because the user story is "skip downstream work when upstream data is empty" rather than "read a boolean from a file".

The MGnify recipe is corpus-backed but clunky: `collection_element_identifiers -> wc_gnu -> column_maker(c1 != 0) -> param_value_from_file`. Issue #84 should verify whether a smaller Galaxy-native workflow can replace it as the recommended authoring target while preserving the MGnify shape as IWC evidence: https://github.com/galaxyproject/foundry/issues/84.

## 6. Open questions

- **Q1.** Candidate A and B: one page with count recipes as a section, or two pages? Lean: one page first.
- **Q2.** Candidate D: one enum-mapping page, or one page per common dialect family such as strandedness? Lean: one generic page plus domain examples.
- **Q3.** Candidate E: should `compose_text_param` page be operation-named (`compose-runtime-text-parameter`) or tool-named? Lean: operation-named, per prior tabular decisions.
- **Q4.** Should `pick_value` get a separate defaulting page later, outside this derivation hierarchy? Lean: defer until optional-input/defaulting becomes a known Mold need.
- **Q5.** Verified-pattern issue #84: can a shorter non-empty gate replace the MGnify four-step recipe as recommendation, or must the corpus recipe remain primary?
