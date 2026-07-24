---
type: research
tags:
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-05-02
revision: 2
ai_generated: true
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

Source corpus: 120 cleaned `gxformat2` workflows under `$IWC_FORMAT2/`. The local `$IWC_SKELETONS` tree was not present, so this survey used full `$IWC_FORMAT2` reads for both topology and parameter evidence. Counts below come from `rg -n "^\s*when:" $IWC_FORMAT2 --glob "*.gxwf.yml"`; citations use `$IWC_FORMAT2/path:line`.

## 1. How IWC actually uses conditionals

The corpus uses Galaxy `when:` gates, but not as broad workflow-level branching. There are 111 `when:` occurrences across 21 workflow files. Every observed gate is serialized as `when: $(inputs.when)` on the gated step, with a sibling input named `when` connected to either a user boolean, a mapped boolean, or a small subworkflow that computes a boolean from data shape. Representative direct user gates include optional BUSCO assessment in BRAKER3 (`$IWC_FORMAT2/genome_annotation/annotation-braker3/Genome_annotation_with_braker3.gxwf.yml:110-141`, `$IWC_FORMAT2/genome_annotation/annotation-braker3/Genome_annotation_with_braker3.gxwf.yml:341-385`) and optional StringTie/Cufflinks FPKM branches in RNA-seq (`$IWC_FORMAT2/transcriptomics/rnaseq-pe/rnaseq-pe.gxwf.yml:1082-1140`, `$IWC_FORMAT2/transcriptomics/rnaseq-pe/rnaseq-pe.gxwf.yml:1141-1214`).

The largest dense uses are not arbitrary if/else logic. They are repeated gates around optional outputs or optional sub-recipes: the MGnify amplicon workflows gate Krona and BIOM conversion outputs only when their upstream collection is non-empty (`$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:1330-1357`, `$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:1358-1483`, `$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:1484-1659`). VGP Hi-C workflows use gates for optional haplotype suffixing, optional extraction/unboxing, and optional Pretext tracks (`$IWC_FORMAT2/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:338-459`, `$IWC_FORMAT2/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:3057-3218`, `$IWC_FORMAT2/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:3289-3346`).

Corpus-zero or near-zero points matter for pattern boundaries. `__FILTER_NULL__` has zero hits in `$IWC_FORMAT2`, so IWC does not show the canonical "conditional step may produce null; filter nulls downstream" shape. The closest observed idioms are either not running the optional step at all, then choosing between alternatives with `pick_value`, or deriving a boolean from an empty/non-empty output before gating follow-on reporting (`$IWC_FORMAT2/VGP-assembly-v2/Assembly-decontamination-VGP9/Assembly-decontamination-VGP9.gxwf.yml:243-305`, `$IWC_FORMAT2/VGP-assembly-v2/Assembly-decontamination-VGP9/Assembly-decontamination-VGP9.gxwf.yml:331-391`, `$IWC_FORMAT2/VGP-assembly-v2/Assembly-decontamination-VGP9/Assembly-decontamination-VGP9.gxwf.yml:392-409`).

## 2. Inventory, demoted

| Measure | Count | Notes |
|---|---:|---|
| Cleaned workflows scanned | 120 | `$IWC_FORMAT2/**/*.gxwf.yml` |
| Workflows with `when:` | 21 | Concentrated in VGP, amplicon, microbiome, transcriptomics, genome annotation |
| `when:` step occurrences | 111 | Includes nested subworkflows embedded in format2 files |
| `__FILTER_NULL__` occurrences | 0 | No corpus-backed pattern candidate |

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

Most common gated tool IDs, by observed `when:` occurrences:

| Gated tool | Count | Interpretation |
|---|---:|---|
| `biom_convert` | 16 | Optional format export after non-empty amplicon result collections |
| `taxonomy_krona_chart` | 8 | Optional visualization after non-empty taxonomic outputs |
| `__EXTRACT_DATASET__` | 6 | Optional unboxing/extraction after shape tests |
| `pretext_graph` | 6 | Optional Pretext track addition when track data exists |
| `tp_replace_in_line` | 4 | Optional text rewrite in suffixing/masking recipes |
| `eggnog_mapper` | 4 | One-of-N annotation mode routing |
| `samtools_merge` | 4 | Optional merge/reduction branches in VGP workflows |

## 3. Recurring idioms

### 3a. User boolean gates optional analysis

This is the simplest conditional shape: expose a boolean workflow input, connect it to `id: when`, and put `when: $(inputs.when)` on every step in the optional branch. BRAKER3 gates both genome BUSCO and protein BUSCO behind `Include BUSCO` (`$IWC_FORMAT2/genome_annotation/annotation-braker3/Genome_annotation_with_braker3.gxwf.yml:110-141`, `$IWC_FORMAT2/genome_annotation/annotation-braker3/Genome_annotation_with_braker3.gxwf.yml:341-385`). RNA-seq gates StringTie and Cufflinks FPKM branches independently with `Compute StringTie FPKM` and `Compute Cufflinks FPKM` (`$IWC_FORMAT2/transcriptomics/rnaseq-pe/rnaseq-pe.gxwf.yml:1082-1140`, `$IWC_FORMAT2/transcriptomics/rnaseq-pe/rnaseq-pe.gxwf.yml:1141-1214`). The VGP Hi-C manual-curation workflow gates a multi-step suffixing branch from `Do you want to add suffixes to the scaffold names?` (`$IWC_FORMAT2/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:312-367`, `$IWC_FORMAT2/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:368-459`).

This is a strong candidate because it is small, direct, and repeated across unrelated domains. The authoring rule is not tool-specific; the tool-specific details live inside the optional branch.

### 3b. Mutually exclusive data-prep branches plus `pick_value`

Several workflows run one of two or more alternative steps, then collapse the possible outputs back to one downstream value with `pick_value`. Scanpy imports 10x matrices through either the legacy or v3 `anndata_import` mode, maps the user boolean to its opposite with `map_param_value`, gates both import steps, then uses `pick_value` to choose the first present AnnData output (`$IWC_FORMAT2/scRNAseq/scanpy-clustering/Preprocessing-and-Clustering-of-single-cell-RNA-seq-data-with-Scanpy.gxwf.yml:180-211`, `$IWC_FORMAT2/scRNAseq/scanpy-clustering/Preprocessing-and-Clustering-of-single-cell-RNA-seq-data-with-Scanpy.gxwf.yml:212-241`, `$IWC_FORMAT2/scRNAseq/scanpy-clustering/Preprocessing-and-Clustering-of-single-cell-RNA-seq-data-with-Scanpy.gxwf.yml:337-399`). Functional annotation fans out four `eggnog_mapper` modes from booleans derived upstream, then selects outputs with `pick_value` (`$IWC_FORMAT2/genome_annotation/functional-annotation/functional-annotation-of-sequences/Functional_annotation_of_sequences.gxwf.yml:244-395`, `$IWC_FORMAT2/genome_annotation/functional-annotation/functional-annotation-of-sequences/Functional_annotation_of_sequences.gxwf.yml:396-429`).

This is the main conditional routing idiom in IWC. It is not just a `when:` pattern; the reusable recipe is `when-gated alternatives -> pick first available output`.

### 3c. Data-derived boolean from empty/non-empty collection

MGnify amplicon pipelines compute a boolean from a collection, then use it to gate output generation. The embedded subworkflow labeled `Map empty/not empty collection to boolean` extracts collection identifiers, counts lines with `wc_gnu`, converts `c1 != 0` into a boolean table with `column_maker`, and reads the result with `param_value_from_file` (`$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:1358-1483`). That boolean gates Krona and BIOM exports for SSU/LSU SILVA outputs (`$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:1330-1357`, `$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:1484-1659`).

VGP Hi-C uses the same broader shape with datasets rather than collections: `param_value_from_file` reads telomere BED outputs as text, `map_param_value` maps empty string to false and unmapped non-empty text to true, then `pretext_graph` steps are gated (`$IWC_FORMAT2/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:3057-3218`, `$IWC_FORMAT2/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:3289-3346`).

This is probably the highest-value conditionals pattern because it shows how IWC authors avoid running downstream reporting tools on empty results without relying on `__FILTER_NULL__`.

### 3d. Optional transform then fallback to original

VGP suffixing and decontamination recipes show a `when`-gated transform paired with `pick_value` fallback. In Hi-C manual curation, optional suffix expressions and replacements run only when the user requests suffixes, then `pick_value` chooses the suffixed haplotype when present or the original haplotype otherwise (`$IWC_FORMAT2/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:338-459`, `$IWC_FORMAT2/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:460-479`). In Assembly decontamination, an upstream mapped boolean gates adaptor filtering, replacement, and concatenation; later `pick_value` falls back to the original `Adaptor Action report` when the optional masking branch does not run (`$IWC_FORMAT2/VGP-assembly-v2/Assembly-decontamination-VGP9/Assembly-decontamination-VGP9.gxwf.yml:243-305`, `$IWC_FORMAT2/VGP-assembly-v2/Assembly-decontamination-VGP9/Assembly-decontamination-VGP9.gxwf.yml:331-391`, `$IWC_FORMAT2/VGP-assembly-v2/Assembly-decontamination-VGP9/Assembly-decontamination-VGP9.gxwf.yml:392-409`).

This differs from mutually exclusive alternatives: one side is a transformed version of the other, not a separate mode. It may deserve its own pattern if authors need to preserve downstream shape while letting an optional cleanup branch disappear.

### 3e. Optional subworkflow branch

IWC also gates entire embedded Galaxy subworkflows. MAGs-generation runs either co-assembly or individual assembly with metaSPAdes; the individual-assembly branch is an embedded workflow gated by `_unlabeled_step_19/output_param_boolean`, and a downstream `pick_value` chooses among individual, co-assembly, or custom assemblies (`$IWC_FORMAT2/microbiome/mags-building/MAGs-generation.gxwf.yml:260-294`, `$IWC_FORMAT2/microbiome/mags-building/MAGs-generation.gxwf.yml:295-410`, `$IWC_FORMAT2/microbiome/mags-building/MAGs-generation.gxwf.yml:411-439`).

This is a recipe extension of `when-gated alternatives -> pick first available output`; it probably should merge into that candidate rather than become a separate page.

## 4. Redundancy and decision points

The main redundancy is not between tools that do the same biological operation. It is between control-flow mechanisms:

| Need | Observed IWC mechanism | Nearby alternative | Survey call |
|---|---|---|---|
| User toggles optional analysis | Direct workflow boolean connected to `when` | Runtime parameter inside tool state | Keep direct `when`; it is explicit and corpus-backed |
| One-of-two or one-of-N route | Gate alternatives, then `pick_value` | One large wrapper/tool conditional | Keep as route pattern; Galaxy-native and visible in graph |
| Skip reporting when result is empty | Compute boolean from data/collection, then `when` | Run tool and filter null outputs | Keep data-derived gate; `__FILTER_NULL__` has zero corpus uptake |
| Optional transform with original fallback | Gate transform, then `pick_value` original vs transformed | Duplicate downstream branches | Keep or merge with route pattern; evidence is good but boundary is close |
| Conditional outputs after failed map-over | `__FILTER_EMPTY_DATASETS__`/`__FILTER_FAILED_DATASETS__` cleanup | `when` per element | Merge with collection cleanup; already covered by [[iwc-transformations-survey]] and existing collection cleanup patterns |

The anti-pattern note does not currently constrain conditionals directly. The strongest existing constraint comes from [[iwc-transformations-survey]]: `__FILTER_NULL__` is not observed, while cleanup after map-over failure is already a collection-transform problem rather than a conditional-step problem.

## 5. Candidate pattern boundaries

### Candidate A: `conditional-run-optional-step`

Scope: author a boolean-controlled optional branch by connecting the workflow boolean to `id: when` on every optional step, with no output selection unless downstream needs a replacement value.

Evidence:

- Optional BUSCO branches in BRAKER3: `$IWC_FORMAT2/genome_annotation/annotation-braker3/Genome_annotation_with_braker3.gxwf.yml:110-141`, `$IWC_FORMAT2/genome_annotation/annotation-braker3/Genome_annotation_with_braker3.gxwf.yml:341-385`.
- Optional StringTie/Cufflinks branches in RNA-seq: `$IWC_FORMAT2/transcriptomics/rnaseq-pe/rnaseq-pe.gxwf.yml:1082-1140`, `$IWC_FORMAT2/transcriptomics/rnaseq-pe/rnaseq-pe.gxwf.yml:1141-1214`.
- Optional suffixing branch in VGP Hi-C: `$IWC_FORMAT2/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:338-459`.

Call: **keep**. This is the operation-level primitive all other conditional recipes build on.

### Candidate B: `conditional-route-between-alternative-outputs`

Scope: run mutually exclusive alternatives with `when`, then use `pick_value` to collapse possible outputs to a single downstream value. Includes binary and one-of-N routing.

Evidence:

- Scanpy 10x legacy vs v3 import route: `$IWC_FORMAT2/scRNAseq/scanpy-clustering/Preprocessing-and-Clustering-of-single-cell-RNA-seq-data-with-Scanpy.gxwf.yml:180-211`, `$IWC_FORMAT2/scRNAseq/scanpy-clustering/Preprocessing-and-Clustering-of-single-cell-RNA-seq-data-with-Scanpy.gxwf.yml:337-399`.
- Functional annotation eggNOG mode fan-out: `$IWC_FORMAT2/genome_annotation/functional-annotation/functional-annotation-of-sequences/Functional_annotation_of_sequences.gxwf.yml:244-395`, `$IWC_FORMAT2/genome_annotation/functional-annotation/functional-annotation-of-sequences/Functional_annotation_of_sequences.gxwf.yml:396-429`.
- MAGs individual vs co-assembly/custom assemblies: `$IWC_FORMAT2/microbiome/mags-building/MAGs-generation.gxwf.yml:295-410`, `$IWC_FORMAT2/microbiome/mags-building/MAGs-generation.gxwf.yml:411-439`.

Call: **keep**. This is the highest-value routing page because it explains the necessary downstream `pick_value` merge, not just the `when` field.

### Candidate C: `conditional-gate-on-nonempty-result`

Scope: derive a boolean from a dataset or collection being empty/non-empty, then gate downstream reporting or conversion steps.

Evidence:

- MGnify collection identifier count to boolean: `$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:1358-1483`.
- MGnify gated Krona/BIOM outputs: `$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:1330-1357`, `$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:1484-1659`.
- VGP telomere track text-to-boolean gate: `$IWC_FORMAT2/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:3057-3218`, `$IWC_FORMAT2/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:3289-3346`.

Call: **keep**. This is distinct from generic optional branching because the boolean is computed from data shape/content.

User story: a generated Galaxy workflow needs to skip optional reporting/export steps when an upstream dataset or collection is empty. The corpus-backed MGnify recipe proves the shape by turning collection membership into a boolean through `collection_element_identifiers -> wc_gnu -> column_maker -> param_value_from_file`, then using that boolean as `inputs.when`. This is structurally useful but clunky: it is a four-step shim for one boolean, so the pattern page should present it as verified IWC precedent, not necessarily the preferred authoring target.

Verification outcome: `verification/workflows/conditional-gate-on-nonempty-result/gate-on-nonempty.gxwf-test.yml` passes under Planemo against Galaxy `release_25.1` with the MGnify-style shim. Direct `when` over the collection failed with `when_not_boolean`, and an embedded CWL `ExpressionTool` shim failed gxformat2 validation, so the known-good recipe remains `collection_element_identifiers -> wc_gnu -> column_maker -> param_value_from_file -> when`.

### Candidate D: `conditional-transform-or-pass-through`

Scope: optionally transform an input, then choose transformed output if present or original input otherwise.

Evidence:

- Optional haplotype suffixing then fallback to original haplotypes: `$IWC_FORMAT2/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:338-479`.
- Optional masking action report then fallback to original report: `$IWC_FORMAT2/VGP-assembly-v2/Assembly-decontamination-VGP9/Assembly-decontamination-VGP9.gxwf.yml:243-409`.

Call: **keep separately for now**. It shares `pick_value` with Candidate B, but the authoring decision is different: Candidate B routes among peer alternatives, while this recipe preserves one original value unless an optional transform runs. Merge later only if the page proves too thin after use.

### Candidate E: `conditional-filter-null-outputs`

Scope: use `__FILTER_NULL__` after conditional steps.

Evidence: zero `__FILTER_NULL__` hits in `$IWC_FORMAT2`; [[iwc-transformations-survey]] also notes no corpus uptake.

Call: **drop**. Document as a catalog capability, not an IWC-backed pattern.

### Candidate F: `conditional-cleanup-after-mapover-failure`

Scope: recover after mapped tools return empty or failed datasets.

Evidence: covered as collection cleanup in [[iwc-transformations-survey]] and existing collection cleanup patterns. The observed mechanisms are `__FILTER_EMPTY_DATASETS__` and `__FILTER_FAILED_DATASETS__`, not `when:` gates.

Call: **merge** into the collection-cleanup pattern family; do not create a conditionals-specific page.

## 6. Open questions

1. Should conditionals get a MOC page (`galaxy-conditionals-patterns.md`) now, or wait until at least two operation pages are authored?

2. Answered for now: keep `conditional-transform-or-pass-through` separate from `conditional-route-between-alternative-outputs`. The boundary is "same value optionally modified" vs "peer alternatives routed to one output". Revisit only if the separate page proves too thin.

3. Answered for now: `verification/workflows/conditional-gate-on-nonempty-result/gate-on-nonempty.gxwf-test.yml` passes with the MGnify shim, while the tested direct collection gate and embedded CWL expression-tool shim fail. Keep the MGnify recipe as lead known-good shape until a different short route validates.

4. No. Do not add `__FILTER_NULL__` to the anti-pattern note from zero uptake alone. Lack of uptake does not make a Galaxy feature an anti-pattern; users can be slow to adopt newer or esoteric features. Keep the survey call as "catalog capability, no IWC-backed pattern candidate" unless separate evidence shows a concrete reason not to endorse it.

5. Does the Foundry need a background reference note for Galaxy `when:` syntax and nullable downstream behavior before operation pattern pages are useful?
