---
type: research
tags:
  - target/galaxy
status: draft
created: 2026-06-10
revised: 2026-06-10
revision: 1
ai_generated: true
related_notes:
  - "[[iwc-tabular-operations-survey]]"
  - "[[iwc-interval-operations-survey]]"
  - "[[iwc-transformations-survey]]"
  - "[[iwc-shortcuts-anti-patterns]]"
  - "[[galaxy-tabular-patterns]]"
  - "[[galaxy-interval-patterns]]"
  - "[[regex-relabel-via-tabular]]"
  - "[[tabular-synthesize-bed-from-3col]]"
  - "[[galaxy-sequence-patterns]]"
  - "[[sequence-fasta-tabular-interconvert]]"
  - "[[sequence-reformat-line-width]]"
  - "[[sequence-merge-and-dedup]]"
  - "[[sequence-compute-length]]"
  - "[[sequence-extract-by-region]]"
  - "[[relabel-fasta-headers-via-tabular]]"
summary: "IWC survey of record-level FASTA manipulation (interconversion, reformat, merge/dedup, subset, extract-at-intervals); sizes a galaxy-sequence-patterns MOC."
---

# IWC sequence-record operations survey

Backs #272 — a candidate `galaxy-sequence-patterns` MOC, fourth sibling to [[galaxy-collection-patterns]], [[galaxy-tabular-patterns]], and [[galaxy-interval-patterns]]. Scope is **record-level sequence (FASTA / nucleotide-or-protein record) manipulation** — operations that read, reshape, subset, or interconvert sequence records — **not** the domain tools that analyze sequence (alignment, assembly, annotation, variant calling, search, profiling). Same discipline as #268: scope by **data-shape family + manipulation algebra**, not domain. The issue framed a **hold-if-thin gate**; the survey's first job is to size the cluster honestly.

Source corpus: `$IWC_FORMAT2/` — 120 `.gxwf.yml` files. Citations are `$IWC_FORMAT2/path` plus step label or tool name; line numbers only for stable parameter snippets.

## TL;DR — the sizing finding

**Sequence-record manipulation is real and slightly broader than interval algebra, but moderate — not the rich cluster the issue's headline counts imply.** The issue's table ranks operations by **tool_id-occurrence** count (fasta_formatter 20, getfasta 16, merge 14, …). Those counts reproduce exactly, but they are inflated by the same subworkflow embedding the interval survey caught: distinct **workflow** counts are far lower.

| Operation (corpus-observed) | tool | tool_id occ | **distinct wf** |
|---|---|---|---|
| FASTA reformat (line width) | `devteam/fasta_formatter` (`cshl_fasta_formatter`) | 20 | **4** |
| Extract sequence at intervals | `iuc/bedtools` (`bedtools_getfastabed`) | 16 | **3** |
| Merge FASTA + filter unique sequences | `galaxyp/fasta_merge_files_and_filter_unique_sequences` | 14 | **4** |
| FASTA → tabular | `devteam/fasta_to_tabular` (`fasta2tab`) | 13 | **4** |
| tabular → FASTA | `devteam/tabular_to_fasta` (`tab2fasta`) | 11 | **3** |
| Sequence length compute | `devteam/fasta_compute_length` | 7 | **3** |
| Mask sequence by intervals | `iuc/bedtools` (`bedtools_maskfastabed`) | 5 | **2** |
| Extract transcript/CDS FASTA from annotation | `devteam/gffread` | 8 | **4** |
| Filter by length | `devteam/fasta_filter_by_length` | 2 | **1** |
| Translate (nt → protein) | `iuc/seqkit_translate` | 2 | **1** |
| Subset by id list | `iuc/seqtk` (`seqtk_subseq`) | 2 | **1** |
| Subset/filter by id list | `galaxyp/filter_by_fasta_ids` | 3 | **1** |
| FASTQ → FASTA | `devteam/fastqtofasta` (`fastq_to_fasta_python`) | 10 | **3** |

Three findings sharpen the gate:

1. **The healthy core is interconversion + reformat, not the interval-bridge tools.** `getfasta`/`maskfasta` are the operations the #268 scope-edge analysis surfaced, but in distinct-workflow terms they are mid-pack (3 / 2). The operations that actually recur are **fasta↔tabular interconversion** (`fasta2tab`/`tab2fasta`, 4 / 3) and **reformat** (`fasta_formatter`, 4) and **merge+dedup** (4). The single most reusable *construct* is a multi-step recipe — relabel FASTA headers by detouring through tabular — not any one operation (§3).
2. **The 20-occurrence headline (`fasta_formatter`) is ~2–3 authoring contexts.** All four `fasta_formatter` workflows are the mgnify amplicon family (`mgnify-amplicon-pipeline-v5-{quality-control-paired-end,quality-control-single-end,rrna-prediction,complete}`); `…-complete` embeds the other three as subworkflows. Same inflation hits `fasta2tab`/`tab2fasta` (the pathogen-identification family) and `getfasta`. Distinct-context counts run roughly **half** the workflow counts above.
3. **The biggest FASTA-touching tool in the corpus is out of scope and must be named, or the inventory looks absurd.** `bgruening/gfastats` has **113** tool_id occurrences across 10 VGP-assembly workflows — it dwarfs everything here. But it is an **assembly** tool (FASTA↔GFA conversion + assembly statistics: "Convert purged fasta to gfa", "gfastats gfa hap1", `$IWC_FORMAT2/VGP-assembly-v2/...`), domain-out per the issue. Counting it would make "sequence manipulation" read as a VGP-assembly concern, which it is not. Held out; recorded here so the hole is deliberate.

Net for the gate (the decision belongs to `/iwc-survey-act`, not here): a sequence MOC is defensible and modestly broader than interval, but should lead with the **interconversion seam and its relabel recipe**, keep the thin operations (translate, filter-by-length, subset-by-id) as footnoted ingredients, and treat `getfasta`/`maskfasta` as **shared bridges with #268**, not the headline.

## 1. What exists — operation inventory

Distinct sequence-record operations, by the move they make. Counts are evidence, not the headline; distinct-workflow counts lead (§TL;DR).

### FASTA ↔ tabular interconversion — the strongest seam (4 / 3 workflows)

The corpus reaches for the tabular form whenever it needs to *edit* sequence records (headers especially), because FASTA headers are awkward to regex in place but trivial as column 1 of a table.

- `fasta2tab` (devteam) — FASTA → tabular, header in col 1, sequence in col 2. `descr_columns: "1"`, `keep_first: "0"` (`$IWC_FORMAT2/microbiome/pathogen-identification/gene-based-pathogen-identification/Gene-based-Pathogen-Identification.gxwf.yml:286`, step "sample_specific_contigs_tabular_file_preparation"). Also `$IWC_FORMAT2/microbiome/metagenomic-genes-catalogue/metagenomic-genes-catalogue.gxwf.yml`, `$IWC_FORMAT2/microbiome/pathogen-identification/pathogen-detection-pathogfair-samples-aggregation-and-visualisation/Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation.gxwf.yml`, `$IWC_FORMAT2/proteomics/clinicalmp/clinicalmp-discovery/iwc-clinicalmp-discovery-workflow.gxwf.yml`.
- `tab2fasta` (devteam) — tabular → FASTA, the inverse. Co-occurs with `fasta2tab` in three of the four interconversion workflows (the pathogen-identification + metagenomic-genes family); `clinicalmp-discovery` uses `fasta2tab` one-way only (FASTA into a downstream tabular join).

### FASTA reformat — line-width rewrap (4 workflows, ~2 contexts)

- `cshl_fasta_formatter` (devteam) — rewrap to fixed line width. `width: "60"`, single connected input (`$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-quality-control-paired-end/mgnify-amplicon-pipeline-v5-quality-control-paired-end.gxwf.yml:661-664`, step "Paired-end post quality control FASTA files"). The width rewrap is the only parameter exercised in the corpus — case folding and header-only output are catalog capabilities with zero uptake here.

### Merge + dedup (4 workflows)

- `fasta_merge_files_and_filter_unique_sequences` (galaxyp) — concatenate a set of FASTAs **and** drop duplicate records in one step. The corpus pins `uniqueness_criterion: sequence` (dedup by sequence content, not header) with `accession_parser: ^>([^ ]+).*$` and `batchmode.processmode: merge` (`$IWC_FORMAT2/microbiome/pathogen-identification/pathogen-detection-pathogfair-samples-aggregation-and-visualisation/Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation.gxwf.yml:1204`). The dedup-aware merge is the differentiator from a plain `cat` of FASTA files.

### Sequence length → tabular (3 workflows)

- `fasta_compute_length` (devteam) — emit a tabular (id, length) table. `keep_first: "0"` (all), `keep_first_word: false` (`$IWC_FORMAT2/VGP-assembly-v2/Purge-duplicate-contigs-VGP6/Purge-duplicate-contigs-VGP6.gxwf.yml:1655`). Output is tabular, so this is also a sequence→tabular bridge (§5), distinct in purpose from `fasta2tab` (which carries the sequence too).

### Extract / mask by intervals — the #268 shared seam (3 / 2 workflows)

- `bedtools_getfastabed` (iuc) — extract FASTA at BED intervals. `fasta_source_selector: history`, `nameOnly/split/strand/tab: false` (`$IWC_FORMAT2/microbiome/pathogen-identification/pathogen-detection-pathogfair-samples-aggregation-and-visualisation/Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation.gxwf.yml:576`).
- `bedtools_maskfastabed` (iuc) — mask FASTA regions named by a BED. `mc: N` (mask character), `soft: false` (hard mask, lowercase when soft) (`$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-complete/mgnify-amplicon-pipeline-v5-complete.gxwf.yml:3770`).

These two consume intervals and produce sequence. #268 deliberately held them out of interval algebra on the **output-shape** rule (produces sequence records → sequence, not interval); see [[iwc-interval-operations-survey]] §5. They are the canonical cross-MOC bridge, not the sequence core.

### Extract transcript/CDS FASTA from annotation (4 workflows; pulled in per scope decision)

- `gffread` (devteam) — read a GFF/GTF + genome FASTA, emit transcript/CDS FASTA. `$IWC_FORMAT2/genome_annotation/annotation-maker/Genome_annotation_with_maker_short.gxwf.yml:406`; also annotation-braker3, annotation-helixer, lncRNAs-annotation. The operation is record-level sequence extraction (annotation→sequence, parallel to getfasta's interval→sequence), so it is in scope per the #272 scope-edge decision — but every corpus instance lives in a `genome_annotation` pipeline, so it is annotation-domain-flavored. Treat as an in-scope operation with a Bridges note (§5).

### Subset by id list — a two-tool redundancy (1 + 1 workflows)

- `seqtk_subseq` (iuc) — keep records whose names appear in a connected name list. `source.type: name`, `name_list` connected, `l: "0"` (`$IWC_FORMAT2/virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping.gxwf.yml:505`).
- `filter_by_fasta_ids` (galaxyp) — same job, different tool: `header_criteria_select: id_list`, `identifiers` connected, `id_regex.find: beginning`, `dedup: false`, plus an `output_discarded` complement and a `sequence_criteria` branch (`$IWC_FORMAT2/microbiome/metagenomic-genes-catalogue/metagenomic-genes-catalogue.gxwf.yml:934`, step "Filter FASTA to keep CDS corresponding to ARGs"). Decision-point in §2.

### Filter by length / translate / FASTQ→FASTA (thin — 1, 1, 3 workflows)

- `fasta_filter_by_length` (devteam) — `min_length: "0"`, connected `max_length` (`$IWC_FORMAT2/VGP-assembly-v2/Assembly-decontamination-VGP9/Assembly-decontamination-VGP9.gxwf.yml:515`, filtering to short mitochondrial scaffolds).
- `seqkit_translate` (iuc) — nucleotide → protein, `frame: "1"`, `transl_table: "1"` (`$IWC_FORMAT2/microbiome/metagenomic-genes-catalogue/metagenomic-genes-catalogue.gxwf.yml:1332`).
- `fastq_to_fasta_python` (devteam) — FASTQ → FASTA, no parameters; pure record-format interconversion (`$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-quality-control-paired-end/mgnify-amplicon-pipeline-v5-quality-control-paired-end.gxwf.yml:566`). In scope as interconversion per the #272 decision, though it sits at the reads-domain edge.

### Absent — catalog capabilities with zero corpus uptake

Reverse-complement (standalone — `reverse_complement: none` appears only as a *parameter* inside HyPhy codon tools, `$IWC_FORMAT2/comparative_genomics/hyphy/hyphy-core.gxwf.yml:157`, not a sequence operation), sequence sort, GC/composition compute, standalone dedup (`seqkit_rmdup`), EMBOSS `seqret`/`transeq`, `fasta_nucleotide_changer`, `fastx_collapser`, `fasta_clipping_histogram`. Per corpus-first these are documented gaps, **not** candidate patterns; none is anti-pattern evidence, just no exemplar.

## 2. Redundancy / decision-points

Where the corpus shows more than one tool for one job — the boundaries a MOC must adjudicate.

1. **Subset FASTA by id list — `seqtk_subseq` (iuc) vs `filter_by_fasta_ids` (galaxyp).** Both keep records named by a connected id list. `filter_by_fasta_ids` adds a discarded-complement output, regex anchoring (`id_regex.find: beginning`), an in-line `dedup`, and a `sequence_criteria` branch; `seqtk_subseq` is leaner and also does region/range subsetting (`l:` flank). Split cleanly by domain (virology reaches for seqtk; proteomics/microbiome for filter_by_fasta_ids), mirroring the `bedtools`-vs-`gops` and `tp_grep`-vs-`Grep1` redundancies the sibling surveys resolved. → Q1.
2. **Sequence length / stats — `fasta_compute_length` (devteam) vs `fasta_stats` (iuc) vs `gfastats` (bgruening).** `fasta_compute_length` emits a clean (id, length) table — the record-level move. `fasta_stats` (`$IWC_FORMAT2/genome-assembly/assembly-with-flye/Genome-assembly-with-Flye.gxwf.yml`, "Fasta Statistics") and `gfastats` are aggregate-statistics / assembly tools. The length-table operation is in scope; aggregate-stats is domain. The page must not absorb assembly stats. → Q2.
3. **Merge FASTA — dedup-aware merge vs plain concatenation.** `fasta_merge_files_and_filter_unique_sequences` merges *and* dedups by sequence; four workflows reach for it specifically when duplicate records must go (proteomics search DBs, pathogen aggregation). A plain `tp_cat`/text concat would merge without dedup. The page should make the dedup criterion (`uniqueness_criterion: sequence`) the reason-to-use, not the merge alone. → Q3.
4. **Interconversion direction vs purpose.** `fasta2tab` appears both as the front half of a roundtrip (→ edit → `tab2fasta`) and one-way (FASTA into a tabular join, `clinicalmp-discovery`). One operation page covering both directions, with the roundtrip as a separate recipe? → Q4.

## 3. Recurring idioms

### Single-tool parameter idioms (with citations)

- **`fasta_formatter` only ever rewraps width** in the corpus (`width: "60"`, `…quality-control-paired-end…:664`). Case folding / header-only modes are unused.
- **`fasta_merge_files_and_filter_unique_sequences` dedups by *sequence*, not header** (`uniqueness_criterion: sequence`, `…PathoGFAIR…:1204`) — the same record can carry different headers across inputs; sequence-identity dedup is the point.
- **`fasta2tab` splits to exactly two columns** (`descr_columns: "1"`, `keep_first: "0"`) so the header is col 1 and the full sequence is col 2 — the shape the relabel recipe (below) depends on.
- **`maskfasta` picks hard vs soft via `soft:`** (`soft: false` + `mc: N` = replace with N; `soft: true` = lowercase), `…mgnify…complete…:3770`.

### Multi-step recipe — relabel FASTA headers via the tabular detour (the high-value unit)

Invisible to grep; the most reusable sequence construct in the corpus. **`fasta2tab` → `tp_find_and_replace` on column 1 → `tab2fasta`** — convert records to a (header, sequence) table, rewrite the header column with text processing, convert back. Confirmed tight in `$IWC_FORMAT2/microbiome/pathogen-identification/gene-based-pathogen-identification/Gene-based-Pathogen-Identification.gxwf.yml` (`fasta2tab` step 9 `:272` → `tp_find_and_replace` on `column: "1"` step 12 `:347-375` → `tab2fasta` step 15 `:474`); the find/replace injects a per-sample id into each header via a connected `replace_pattern`. The same `fasta2tab`…`tab2fasta` envelope recurs in `metagenomic-genes-catalogue` and `PathoGFAIR` (interconversion pair co-present, with tabular text-processing between). This is a sequence-record-specific cousin of [[regex-relabel-via-tabular]] (which relabels *collection identifiers*, not record headers) — distinct enough to warrant its own page, cross-linked to the tabular relabel patterns. **Keep.**

## 4. Candidate pattern boundaries

Operation-/recipe-anchored names per `docs/PATTERNS.md`. Because the interconversion seam and its recipe carry the value, the keep-set is interconversion-led with a recipe at the top.

**Recipe (keep — highest value):**

- **`recipe: relabel-fasta-headers-via-tabular`** — §3 recipe. Evidence: 3 workflows, one tight-confirmed wiring. **Keep.** The flagship sequence construct; cross-link [[regex-relabel-via-tabular]] and [[galaxy-tabular-patterns]].

**Operations (keep ≥2-workflow ones as standalone; thin ones become ingredients/footnotes):**

- **`sequence-fasta-tabular-interconvert`** (`fasta2tab` + `tab2fasta`, both directions) — Evidence: 4 / 3 workflows. **Keep** — the strongest standalone operation; it underpins the recipe and the sequence↔tabular bridge. Q4 decides one page vs two.
- **`sequence-reformat-line-width`** (`fasta_formatter` width rewrap) — Evidence: 4 workflows (≈2 contexts). **Keep**, scoped tightly to the width-rewrap move (the only one used).
- **`sequence-merge-and-dedup`** (`fasta_merge_files_and_filter_unique_sequences`) — Evidence: 4 workflows. **Keep**; lead with the dedup-by-sequence criterion (Q3).
- **`sequence-compute-length`** (`fasta_compute_length` → id/length table) — Evidence: 3 workflows. **Keep**, fenced off from aggregate assembly stats (Q2).
- **`sequence-extract-at-intervals`** (`getfasta`) — Evidence: 3 workflows. **Keep**, but author as a **bridge page** shared with #268 (output-shape rule), not a standalone interval-ignorant op.
- **`sequence-subset-by-id`** (`seqtk_subseq` / `filter_by_fasta_ids`) — Evidence: 2 workflows across two tools. **Keep, flag the redundancy** (Q1); lead-tool TBD.
- **`sequence-mask-by-intervals`** (`maskfasta`) — Evidence: 2 workflows. **Keep-or-merge** into the extract-at-intervals bridge page as its sibling move. → Q5.
- **`sequence-extract-from-annotation`** (`gffread`) — Evidence: 4 workflows, all genome_annotation. **Keep, flag domain-embedding**; or fold into the extract bridge family. → Q5.

**Drop as standalone (thin / single-source — document as ingredients or footnotes):**

- **filter-by-length** (`fasta_filter_by_length`, 1 wf), **translate** (`seqkit_translate`, 1 wf), **FASTQ→FASTA** (`fastq_to_fasta_python`, reads-edge). Single-source; mention inside the MOC's operation list, no standalone pages unless a second exemplar appears. → Q6.

**Gaps (document, no page):** reverse-complement, sequence sort, composition/GC, standalone dedup, EMBOSS seqret/transeq — §1 "Absent".

## 5. Bridges (cross-shape seams the MOC should cross-link)

- **sequence ↔ tabular.** The dominant seam. `fasta2tab`/`tab2fasta` interconvert; `fasta_compute_length` emits a (id, length) table; the relabel recipe lives entirely on this seam. The line is: tabular treats the record as opaque columns (header = col 1, sequence = col 2); sequence operations understand FASTA record structure. Cross-link [[galaxy-tabular-patterns]] and [[iwc-tabular-operations-survey]].
- **sequence ↔ interval.** `getfasta` (intervals → sequence) and `maskfasta` (intervals + sequence → masked sequence) are the inverse-facing seam to #268, which already documented these as out-of-interval-scope on the output-shape rule (see [[iwc-interval-operations-survey]] §5). Each MOC's `## Bridges` should point at the other; the sequence MOC owns the operations, #268 owns the BED that feeds them. Cross-link [[galaxy-interval-patterns]].
- **alignment → sequence (scope edge).** `samtools_fastx` (BAM → FASTQ/FASTA, 2 workflows: host-contamination-removal, nanopore pre-processing) and `bedtools_bamtobed` (BAM → BED, owned by #268) convert alignment records to sequence/interval. The sequence MOC notes `samtools_fastx` as an input bridge; it is not a sequence-record *manipulation*, so no page.
- **annotation → sequence (scope edge).** `gffread` extracts transcript/CDS FASTA from GFF + genome. Pulled in as an operation per the #272 decision, but flagged here as annotation-domain-resident; the Bridges note links it to the annotation pipelines that produce its GFF input.

## 6. Out of scope — the assembly elephant and domain consumers

Named so the held-out set is deliberate, not an oversight:

- **`gfastats`** (bgruening, 113 occ / 10 VGP workflows) — assembly FASTA↔GFA conversion + assembly statistics. Domain (assembly). The corpus's largest FASTA-touching tool; out.
- **`Fasta_to_Contig2Bin`, `concoct_cut_up_fasta`, `concoct_extract_fasta_bins`** — metagenomic binning. Domain.
- **`peptideshaker fasta_cli`** — proteomics search-DB build. Domain.
- **`fastqc`** (7 wf), **assembly/alignment/annotation/variant/search tools** — consume or emit sequence but do not manipulate records. Domain, per the #272 scope rule.

## 7. Beyond IWC (not surveyed)

Unlike the interval survey, this cluster did **not** need a GTN cross-reference to justify graduation — the IWC corpus carries enough record-level operations on its own. The absent capabilities in §1 (reverse-complement, sequence sort, composition) are common in GTN training material and the Tool Shed, but per corpus-first they stay gaps until an IWC exemplar appears. No GTN mining was performed this run; flag if `/iwc-survey-act` wants the absent-everywhere vs IWC-absent distinction the interval survey drew for `closest`.

## 8. Open questions

1. **Q1 — subset-by-id lead tool.** `seqtk_subseq` (iuc, leaner, also does ranges) vs `filter_by_fasta_ids` (galaxyp, discarded-complement + regex anchoring)? Both single-workflow; pick a recommended tool and footnote the other, or present co-equal pending a tiebreak? Evidence §2.1.
2. **Q2 — length vs stats boundary.** Confirm `sequence-compute-length` covers only the (id, length) table and explicitly excludes `fasta_stats`/`gfastats` aggregate assembly stats. Evidence §2.2.
3. **Q3 — merge page framing.** Lead `sequence-merge-and-dedup` with the dedup-by-sequence criterion (vs plain concat)? Or split "merge" from "dedup"? Evidence §2.3.
4. **Q4 — interconversion page shape.** One `sequence-fasta-tabular-interconvert` page covering both directions, with `relabel-fasta-headers-via-tabular` as a separate recipe; or fold the one-way `fasta2tab→join` case in too? Evidence §1, §3.
5. **Q5 — extract/mask bridge granularity.** Is there one `sequence-extract-at-intervals` bridge page that also holds `maskfasta` (mask-by-intervals) and `gffread` (extract-at-annotation) as sibling moves, or three pages? Lean: one bridge page with three moves, given each is thin. Evidence §4, §5. *(Resolved in the #272 PR: one page, authored as `sequence-extract-by-region` with three moves.)*
6. **Q6 — does the MOC graduate now, or hold?** The gate. Moderate corpus, interconversion-led, recipe-carried, with several thin single-source operations and the motivating interval-bridge tools shared with #268. Graduate a modest interconversion-led MOC, or hold the thin operations (translate, filter-by-length, subset-by-id) until second exemplars appear? Decision owned by `/iwc-survey-act`. Evidence: TL;DR + §4.
7. **Q7 — MOC naming.** Issue specifies slug `galaxy-sequence-patterns`, title "Galaxy: sequence patterns", topic tag `topic/sequence-transform`. *(Resolved in the #272 PR: naming confirmed as specified; `topic/sequence-transform` registered in `meta_tags.yml`.)*
