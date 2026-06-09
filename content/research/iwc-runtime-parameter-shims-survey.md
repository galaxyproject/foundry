---
type: research
subtype: component
tags:
  - research/component
  - target/galaxy
status: draft
created: 2026-05-04
revised: 2026-05-04
revision: 1
ai_generated: true
related_notes:
  - "[[iwc-parameter-derivation-survey]]"
  - "[[iwc-conditionals-survey]]"
  - "[[iwc-tabular-operations-survey]]"
related_patterns:
  - "[[derive-parameter-from-file]]"
  - "[[compose-runtime-text-parameter]]"
  - "[[map-workflow-enum-to-tool-parameter]]"
  - "[[conditional-gate-on-nonempty-result]]"
  - "[[conditional-route-between-alternative-outputs]]"
  - "[[conditional-run-optional-step]]"
  - "[[tabular-compute-new-column]]"
sources:
  - "https://github.com/galaxyproject/foundry/issues/93"
summary: "Focused survey of tiny IWC runtime parameter shims for flags, enums, counts, booleans, and composed text."
---

# IWC runtime parameter shims survey

Source corpus: 120 cleaned `gxformat2` workflows under `$IWC_FORMAT2/`, materialized from pinned IWC commit `deafc4876f2c778aaf075e48bd8e95f3604ccc92`. This is a narrower follow-up to [[iwc-parameter-derivation-survey]]: it looks only at tiny glue steps that adapt runtime values for downstream tool parameters.

Scope: small parameter shims that turn workflow inputs, scalar files, counts, or short strings into typed connected parameters: flags, enum dialects, booleans, column-list strings, expressions, labels, and counts.

Out of scope:

- Broad data-to-parameter derivation inventory; covered by [[iwc-parameter-derivation-survey]].
- Conditional topology after the boolean exists; covered by [[iwc-conditionals-survey]].
- Row-wise tabular computation whose output remains a dataset; covered by [[iwc-tabular-operations-survey]] and [[tabular-compute-new-column]].

## Shim Surface

The corpus uses four first-class shim mechanisms and one supporting count/computation chain. Parsed counts from [[iwc-parameter-derivation-survey]] put the authored-step surface at 63 `compose_text_param` steps, 50 `param_value_from_file` steps, 26 `map_param_value` steps, 8 `wc_gnu` count shims, and 20 `column_maker`/`Add_a_column1` steps that are parameter-adjacent rather than always parameter shims.

| Shim operation | Main observed tool/recipe | Pattern status |
|---|---|---|
| Compose runtime text | `compose_text_param` | Already authored: [[compose-runtime-text-parameter]] |
| Read scalar file as typed parameter | `param_value_from_file` | Already authored: [[derive-parameter-from-file]] |
| Map enum/string/boolean/integer to another parameter value | `map_param_value` | Already authored for enum-to-tool dialect: [[map-workflow-enum-to-tool-parameter]] |
| Count file/collection then parameterize | `wc_gnu -> param_value_from_file`, sometimes with `collection_element_identifiers` | Folded into [[derive-parameter-from-file]] and [[conditional-gate-on-nonempty-result]] |
| Compute boolean/string in tabular-land, then parameterize | `column_maker -> param_value_from_file` | Merge boundary with [[tabular-compute-new-column]] plus [[derive-parameter-from-file]] |

No simple expression-tool shim is corpus-backed here. Searches for `ExpressionTool`, `expression_tool`, `__EXPRESSION`, and related CWL-expression markers returned zero IWC `gxformat2` hits. The verified conditionals pattern separately records that an attempted embedded CWL `ExpressionTool` shim failed gxformat2 validation, so it should not be promoted as an IWC-backed replacement for the clunky collection-count boolean chain.

## Recurring Shim Idioms

### 1. Enum or label normalization into downstream tool dialects

`map_param_value` is the core adapter when one workflow-facing value must become exact downstream syntax. RNA-seq maps one `Strandedness` input into separate dialects for `featureCounts` numeric codes, Cufflinks library types, and StringTie flags; each dialect gets a separate mapper step with `on_unmapped: fail` (`$IWC_FORMAT2/transcriptomics/rnaseq-pe/rnaseq-pe.gxwf.yml:270-368`). BREW3R repeats the strandedness-to-StringTie-flag and strandedness-to-boolean split in a smaller workflow (`$IWC_FORMAT2/transcriptomics/brew3r/BREW3R.gxwf.yml:51-109`). VGP maps haplotype labels into suffix fragments like `H1`, `H2`, `pri`, and `alt`, then composes downstream strings from those fragments (`$IWC_FORMAT2/VGP-assembly-v2/Scaffolding-HiC-VGP8/Scaffolding-HiC-VGP8.gxwf.yml:276-344`).

This is a stable pattern leaf when the output is a tool parameter value, not a graph-control boolean.

### 2. Boolean inversion and one-of-N boolean fanout

`map_param_value` also expresses boolean inversion and enum-to-boolean fanout for conditional routing. Scanpy maps a user boolean to its opposite so legacy 10x and 10x v3 import branches are mutually exclusive (`$IWC_FORMAT2/scRNAseq/scanpy-clustering/Preprocessing-and-Clustering-of-single-cell-RNA-seq-data-with-Scanpy.gxwf.yml:173-241`). Functional annotation maps `Selected sequence type` into four one-hot booleans, then gates four `eggnog_mapper` branches (`$IWC_FORMAT2/genome_annotation/functional-annotation/functional-annotation-of-sequences/Functional_annotation_of_sequences.gxwf.yml:87-243`). VGP subworkflows map collection-size text values into `Is empty`, `Has a single sample`, and `Has multiple samples` booleans (`$IWC_FORMAT2/VGP-assembly-v2/Scaffolding-HiC-VGP8/Scaffolding-HiC-VGP8.gxwf.yml:760-937`).

This is implementation detail inside conditional routing pages, not a standalone parameter-shim page. The user story is branch selection, so the candidate should merge into [[conditional-route-between-alternative-outputs]] and [[conditional-run-optional-step]].

### 3. Empty/non-empty mapping for runtime gates

IWC uses two shapes for empty/non-empty booleans. MGnify converts a collection to a boolean by extracting collection element identifiers, counting lines with `wc_gnu`, computing `c1 != 0` with `column_maker`, and reading the result as `boolean_param` (`$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:1358-1483`). VGP Hi-C reads telomere BED files as text, maps `"" -> false`, and defaults unmapped non-empty text to `true` before gating Pretext graph steps (`$IWC_FORMAT2/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:3057-3218`).

This is pattern-worthy, but the pattern is already [[conditional-gate-on-nonempty-result]]. The shim mechanics should remain a section there because the operation is "gate on a non-empty result," not "derive a boolean for its own sake."

### 4. Scalar-file bridge into parameter-land

`param_value_from_file` is the escape hatch from one-value datasets to typed runtime ports. Pox-virus amplicon reads sequence and pool positions from small files as text parameters, then composes genomic ranges and pool suffix strings (`$IWC_FORMAT2/virology/pox-virus-amplicon/pox-virus-half-genome.gxwf.yml:409-479`, `$IWC_FORMAT2/virology/pox-virus-amplicon/pox-virus-half-genome.gxwf.yml:560-669`). Consensus peaks counts replicates with `wc_gnu` before feeding count-driven downstream parameters (`$IWC_FORMAT2/epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:299-318`). MGnify's collection gate uses the same bridge at the last step, but with `param_type: boolean` (`$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:1447-1463`).

This is already correctly centralized in [[derive-parameter-from-file]]. Count recipes are common enough to document inside that page, but not distinct enough to split into their own leaf.

### 5. Runtime text composition for expressions, column lists, config lines, and labels

`compose_text_param` is the strongest standalone runtime shim. Consensus peaks composes `c4 >= <minimum overlap>` and connects it to `Filter1.cond` (`$IWC_FORMAT2/epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:102-128`, `$IWC_FORMAT2/epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:318-336`). SRA manifest processing maps a zero column number to one, then composes a dynamic `Cut1.columnList` such as `cN,cM` (`$IWC_FORMAT2/data-fetching/sra-manifest-to-concatenated-fastqs/sra-manifest-to-concatenated-fastqs.gxwf.yml:32-113`). GROMACS dcTMD composes config lines such as `pull_coord1_rate = <float>`, `dt = <float>`, and `nsteps = <integer>` (`$IWC_FORMAT2/computational-chemistry/gromacs-dctmd/gromacs-dctmd.gxwf.yml:553-654`). Pox-virus amplicon composes genomic ranges and pool suffixes from file-derived text (`$IWC_FORMAT2/virology/pox-virus-amplicon/pox-virus-half-genome.gxwf.yml:560-669`).

This deserves to stay as its own operation page. It is the clearest answer to "how do I build a dynamic downstream parameter without authoring a custom wrapper?"

### 6. Enum-to-code and integer normalization as small value repairs

Not every `map_param_value` is an enum dialect. SRA manifest processing maps user-provided column `0` to `1`, passes all other integers through, and then composes the resulting value into a `Cut1` column list (`$IWC_FORMAT2/data-fetching/sra-manifest-to-concatenated-fastqs/sra-manifest-to-concatenated-fastqs.gxwf.yml:32-63`). This is a tiny normalization repair, not a broad pattern leaf.

Keep this as an example inside [[map-workflow-enum-to-tool-parameter]] or [[compose-runtime-text-parameter]] only if those pages need an integer-normalization exemplar.

### 7. Long snippets selected by enum are possible but brittle

The taxonomic-rank summary workflow maps `Taxonomic rank` to long awk programs, then connects the selected program into `tp_awk_tool.code` (`$IWC_FORMAT2/amplicon/amplicon-mgnify/taxonomic-rank-abundance-summary-table/taxonomic-rank-abundance-summary-table.gxwf.yml:35-140`). This proves the mechanism can select executable text, but it is a clunky authoring surface: long snippets in frontmatter-like tool state are hard to review and easy to damage.

Do not create a separate "enum-to-program" pattern from this alone. Mention it as a high-power, high-risk edge case in [[map-workflow-enum-to-tool-parameter]] and cross-link to tabular operation pages when the real operation is taxonomy splitting.

## Candidate Pattern Boundaries

### Candidate A: `compose-runtime-text-parameter`

Scope: build connected text parameters from ordered literal and runtime pieces.

Evidence:

- Filter predicate composition in consensus peaks: `$IWC_FORMAT2/epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:102-128`, `$IWC_FORMAT2/epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:318-336`.
- Dynamic column-list composition in SRA manifest processing: `$IWC_FORMAT2/data-fetching/sra-manifest-to-concatenated-fastqs/sra-manifest-to-concatenated-fastqs.gxwf.yml:61-113`.
- Config-line composition in GROMACS dcTMD: `$IWC_FORMAT2/computational-chemistry/gromacs-dctmd/gromacs-dctmd.gxwf.yml:553-654`.

Call: **keep; already authored** as [[compose-runtime-text-parameter]]. This remains the highest-value standalone shim leaf.

### Candidate B: `derive-parameter-from-file`

Scope: read one scalar dataset as a typed parameter, including count-to-integer and file-text-to-parameter recipes.

Evidence:

- Pox-virus sequence and pool positions read as text parameters: `$IWC_FORMAT2/virology/pox-virus-amplicon/pox-virus-half-genome.gxwf.yml:409-479`.
- Consensus peak replicate count via `wc_gnu`: `$IWC_FORMAT2/epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:299-318`.
- MGnify boolean read from one-cell table: `$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:1447-1463`.

Call: **keep; already authored** as [[derive-parameter-from-file]]. Do not split `wc_gnu` count shims into a separate page yet.

### Candidate C: `map-workflow-enum-to-tool-parameter`

Scope: convert workflow-facing enum/string/integer values into exact downstream tool dialects, flags, snippets, or fragments.

Evidence:

- RNA-seq strandedness to several downstream dialects: `$IWC_FORMAT2/transcriptomics/rnaseq-pe/rnaseq-pe.gxwf.yml:270-368`.
- VGP haplotype label to suffix fragment: `$IWC_FORMAT2/VGP-assembly-v2/Scaffolding-HiC-VGP8/Scaffolding-HiC-VGP8.gxwf.yml:276-344`.
- Taxonomic rank to awk program text: `$IWC_FORMAT2/amplicon/amplicon-mgnify/taxonomic-rank-abundance-summary-table/taxonomic-rank-abundance-summary-table.gxwf.yml:35-140`.

Call: **keep; already authored** as [[map-workflow-enum-to-tool-parameter]]. Add a future refinement only if that page needs an explicit "integer normalization" subsection for the SRA `0 -> 1` case.

### Candidate D: `map-parameter-for-conditional-routing`

Scope: map booleans or enums to booleans used only for `when` gates.

Evidence:

- Scanpy boolean inversion for two import branches: `$IWC_FORMAT2/scRNAseq/scanpy-clustering/Preprocessing-and-Clustering-of-single-cell-RNA-seq-data-with-Scanpy.gxwf.yml:173-241`.
- Functional annotation one-of-N boolean fanout: `$IWC_FORMAT2/genome_annotation/functional-annotation/functional-annotation-of-sequences/Functional_annotation_of_sequences.gxwf.yml:87-243`.
- VGP collection-size classification booleans: `$IWC_FORMAT2/VGP-assembly-v2/Scaffolding-HiC-VGP8/Scaffolding-HiC-VGP8.gxwf.yml:760-937`.

Call: **merge** into [[conditional-route-between-alternative-outputs]] and [[conditional-run-optional-step]]. The authoring decision is conditional topology, not parameter normalization.

### Candidate E: `derive-nonempty-boolean-parameter`

Scope: turn empty/non-empty datasets or collections into boolean runtime parameters.

Evidence:

- MGnify collection-to-boolean chain: `$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:1358-1483`.
- VGP text-empty mapping: `$IWC_FORMAT2/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:3057-3218`.

Call: **merge** into [[conditional-gate-on-nonempty-result]]. The boolean shim is important, but the reusable operation is gating downstream work on non-empty output.

### Candidate F: `compute-tabular-value-then-parameterize`

Scope: use a tabular tool such as `column_maker` or `table_compute` to compute one value, then read it as a parameter.

Evidence:

- MGnify `column_maker` computes `c1 != 0` before `param_value_from_file`: `$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:1414-1463`.
- Consensus peaks uses `wc_gnu` and downstream scalar parameterization around replicate counts: `$IWC_FORMAT2/epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:299-318`.

Call: **merge**. Keep tabular computation on [[tabular-compute-new-column]] or specific tabular pages; keep the escape back to parameter-land on [[derive-parameter-from-file]].

### Candidate G: simple expression shim

Scope: replace small shim chains with a single simple expression tool or CWL `ExpressionTool`-like adapter.

Evidence: zero IWC `gxformat2` hits for `ExpressionTool`, `expression_tool`, `__EXPRESSION`, or related markers in this corpus scan.

Call: **drop as corpus-backed pattern; catalog gap only**. Do not recommend a shorter expression shim until it has a verified-pattern workflow and survives gxformat2 validation.

## Relationship To Existing Surveys And Patterns

This focused survey does not supersede [[iwc-parameter-derivation-survey]]. It narrows that survey's broad candidates into shim-specific authoring boundaries:

- [[derive-parameter-from-file]] owns scalar files, counts, and the final typed-parameter bridge.
- [[compose-runtime-text-parameter]] owns text assembly from constants plus runtime scalar values.
- [[map-workflow-enum-to-tool-parameter]] owns exact downstream dialect normalization.
- [[conditional-gate-on-nonempty-result]] owns empty/non-empty boolean derivation when the boolean feeds `when`.
- [[conditional-route-between-alternative-outputs]] and [[conditional-run-optional-step]] own boolean inversion and one-of-N gate booleans.
- [[tabular-compute-new-column]] owns row-wise or one-cell tabular computation before any parameter bridge.

The main refinement from this pass is suppression, not expansion: many shim chains are implementation details inside already-authored operation pages.

## Open Questions

1. Should [[map-workflow-enum-to-tool-parameter]] add a short "integer normalization" subsection for SRA's `0 -> 1` column repair, or is that too thin?

2. Should [[compose-runtime-text-parameter]] explicitly warn about unvalidated downstream syntax for `Filter1.cond`, `Cut1.columnList`, and config-line consumers, or is the current pitfall coverage enough?

3. Should [[conditional-gate-on-nonempty-result]] state more strongly that simple expression tools are not corpus-backed and failed the current verified-pattern route, or keep that as survey-only context?

4. Should the taxonomic-rank enum-to-awk snippet stay as a pitfall/example inside [[map-workflow-enum-to-tool-parameter]], or should it be referenced only from tabular taxonomy pages to avoid normalizing long generated programs?
