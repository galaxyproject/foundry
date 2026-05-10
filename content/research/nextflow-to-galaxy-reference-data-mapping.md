---
type: research
subtype: component
title: "Nextflow to Galaxy reference-data mapping"
tags:
  - research/component
  - source/nextflow
  - target/galaxy
status: draft
created: 2026-05-08
revised: 2026-05-10
revision: 3
ai_generated: true
related_notes:
  - "[[nextflow-params-to-galaxy-inputs]]"
  - "[[nextflow-path-glob-to-galaxy-datatype]]"
  - "[[summary-nextflow]]"
  - "[[nextflow-summary-to-galaxy-reference-data]]"
  - "[[galaxy-sample-sheet-collections]]"
  - "[[galaxy-datatypes-conf]]"
related_molds:
  - "[[summarize-nextflow]]"
  - "[[nextflow-summary-to-galaxy-reference-data]]"
  - "[[nextflow-summary-to-galaxy-interface]]"
  - "[[nextflow-summary-to-galaxy-data-flow]]"
sources:
  - "https://nf-co.re/docs/usage/reference_genomes"
  - "https://github.com/nf-core/sarek/blob/master/conf/igenomes.config"
  - "https://github.com/nf-core/configs"
  - "https://github.com/jmchilton/foundry/issues/221"
summary: "How nf-core pipelines resolve reference data; v1 Galaxy posture is explicit optional index inputs with in-tool rebuild on absence."
---

# Nextflow to Galaxy reference-data mapping

Upfront research for [[nextflow-summary-to-galaxy-reference-data]]. Most nf-core pipelines lean on a reference-resolution pattern Galaxy has no direct analog for; this note captures the source-side options, pins the recommended Galaxy posture, and describes the brief the Mold writes so downstream interface and data-flow Molds inherit consistent decisions.

## Nextflow side — how reference data shows up

Reference-data shape varies along several roughly orthogonal dimensions: whether the pipeline consumes or produces reference data, the cardinality of the assets, whether they're keyed or per-asset, whether rebuild fallback exists, and whether multiple bundles run in parallel. The classifications below are flags an LLM can detect from a `summary-nextflow` artifact; a single pipeline often matches more than one. Grounded in the complexity bridge fixtures from jmchilton/foundry#221.

### None

Pipeline consumes no reference data. Detection: `params[]` has no path-shaped reference asset; no `getGenomeAttribute` call in `nextflow.config`. Examples: `nf-core/multiplesequencealign`, `nf-core/proteinfamilies`, `seqeralabs/nf-canary`. Galaxy translation has no reference-data surface to design.

### Reference-producing pipeline

Pipeline output **is** the reference data — it builds a database, index, or bundle for downstream consumers. Examples: `nf-core/createtaxdb`, `nf-core/references`. Detection: pipeline has no major path-shaped input but advertises bundle outputs (`publishDir` patterns matching `kraken2_database/`, `*.fai`, `bwa-index/`, …); `meta.yml` for the top-level workflow describes outputs as databases or indexes. Galaxy translation question is whether the bundle output cleanly lands as a workflow output, given that data managers are off the table — the consumer pattern (next workflow takes the bundle as an input collection) is itself open.

### Single asset

One reference asset, often optional. Examples: `nf-core/bamtofastq` (FASTA needed only when input is CRAM), `nextflow-io/rnaseq-nf` (a small bundled transcriptome). Detection: exactly one path-shaped reference param, sometimes guarded by a process-level `when:` or `if (params.X)` branch. Easiest rung to test the v1 posture against — single optional Galaxy `data` input, conditional consumer.

### Coordinated bundle

Several related assets that travel together as a logical unit. Example: `nf-core/smrnaseq` consumes `--genome` + miRBase mature + miRBase hairpin + GTF, and these four are coupled — switching genome means switching all four. Detection: multiple path-shaped reference params declared together in `nextflow_schema.json` under a shared section heading, or referenced together in a single subworkflow without per-param conditional branching. Translation strain: Galaxy v1 posture forces N separate optional `data` inputs, which can produce a workflow surface that's hard for users to fill out coherently.

### Key-expanded bundle (iGenomes-style)

A single user-facing key explodes into many derived path params at config-load time. nf-core's `params.genome = 'GATK.GRCh38'` resolves through `conf/igenomes.config` and a `getGenomeAttribute(attr)` helper:

```groovy
params {
  fasta            = getGenomeAttribute('fasta')
  fasta_fai        = getGenomeAttribute('fasta_fai')
  dict             = getGenomeAttribute('dict')
  bwa              = getGenomeAttribute('bwa')
  bwamem2          = getGenomeAttribute('bwamem2')
  dragmap          = getGenomeAttribute('dragmap')
  dbsnp            = getGenomeAttribute('dbsnp')
  dbsnp_tbi        = getGenomeAttribute('dbsnp_tbi')
  known_indels     = getGenomeAttribute('known_indels')
  // ...
}
```

Examples: `nf-core/atacseq`, `nf-core/sarek`, `nf-core/rnaseq` (with `--genome` set). Detection: `nextflow.config` includes `conf/igenomes.config` or defines `getGenomeAttribute`; `params.genome` is declared. The derived params do **not** appear in `nextflow_schema.json` and won't show up in `summarize-nextflow`'s `params[]` unless the resolver special-cases them (today it captures them with a description noting the dynamic source — see `summarize-nextflow` index §3). The Galaxy workflow surface starts at the resolved per-asset paths, not the key.

### Indexes with rebuild fallback (compute-if-missing)

Pre-built indexes are optional; the pipeline rebuilds them on absence. Modern nf-core pipelines run a "build any missing index" step at the front. Sarek's `PREPARE_GENOME` subworkflow runs `samtools faidx`, `gatk4 CreateSequenceDictionary`, `bwa index`, `bwamem2 index`, etc., gated on whether the corresponding param was supplied:

```groovy
if (!params.fasta_fai) {
  SAMTOOLS_FAIDX(fasta)
  fasta_fai = SAMTOOLS_FAIDX.out.fai
}
```

Examples: `nf-core/rnaseq` (STAR / salmon / hisat2 indexes), `nf-core/sarek` (BWA / dict / fai). Detection: source pipeline has `!params.<asset>` guards around index-building processes, often inside a `PREPARE_GENOME`-style subworkflow. Load-bearing — most users never supply pre-built indexes — but invisible to a user reading `nextflow_schema.json` because the index params just look optional. This pattern usually overlays *single asset*, *coordinated bundle*, or *key-expanded bundle*; it's an aspect, not a parallel kind.

### Multi-DB pick-list

Multiple independent reference databases, each enabling its own analysis branch — the user picks 0..N. Example: `nf-core/funcscan` lets a user enable any subset of AMR / BGC scanners (hamronization, AMRFinderPlus, DeepARG, hmmsearch, …), each with its own DB. Detection: several optional path or directory params named after distinct tools or analysis branches (`amrfinderplus_db`, `deeparg_db`, …), each guarded by a corresponding `skip_*` or `run_*` flag. Translation strain: Galaxy needs to surface "user picks 0..N of these DBs, and the workflow runs the scanners they picked" — conditional / optional-input territory, but no worked Galaxy example at this scale yet.

### Parallel bundles plus cohort data

Several parallel reference bundles plus per-cohort or per-panel data the pipeline cannot rebuild. Example: `nf-core/sarek` consumes a genome bundle plus a panel-of-normals (PoN) plus germline-resource VCFs plus intervals BED. Detection: a *key-expanded* or *coordinated bundle* core, plus additional path-shaped params (`pon`, `germline_resource`, `intervals`) that have no compute-if-missing branch and represent cohort- or study-level data the user must supply. The cohort assets can't be rebuilt on absence — they're explicit user inputs no matter the rung.

## Galaxy side

Galaxy has multiple idioms for surfacing reference data. The bullets below are presented as available shapes; the recommendations that follow narrow them to the v1 posture.

- **`dbkey`-keyed cached lookups.** Workflow inputs carry a `dbkey` annotation; tools consume an admin-pre-loaded data table indexed by `dbkey` (BWA indexes, GATK known-sites, dbSNP for common builds). Powerful when builds are common; opaque when not, and not every Galaxy server admin curates the same set.
- **Generic `from_data_table` / `.loc` lookups (no `dbkey`).** Tools can use `from_data_table` against an admin-loaded `.loc` file keyed by name rather than `dbkey` — kraken2 databases, centrifuge databases, custom-keyed index tables. Same admin-install constraint as `dbkey` tables; the difference is just the indexing key.
- **Sample sheets** (see [[galaxy-sample-sheet-collections]]). Files and typed metadata travel together in a `sample_sheet`-shaped collection with typed `column_definitions`. Variants: `sample_sheet`, `sample_sheet:paired`, `sample_sheet:paired_or_unpaired`, `sample_sheet:record`. Reference-side use case: a coordinated reference bundle can ride a `sample_sheet:record` row whose typed slots hold the FASTA, the GTF, the index tarball.
- **List of records.** Sample sheets force a unique element identifier per row; a list of records can carry column-like metadata without that uniqueness restriction. Useful when reference-data rows naturally repeat or when the column set is not row-keyed. Peer research note tracked at jmchilton/foundry#225.
- **Explicit `data` inputs.** Reference + index passed individually as workflow `data` inputs. The simplest shape; the v1 default.

**Galaxy folks who care about reference-data UX increasingly dislike the cached/dbkey path.** It's invisible state that breaks when the admin hasn't loaded the build, varies between Galaxy instances, and forces wrappers to special-case "is this dbkey cached or do I rebuild." Workflows that ship to public Galaxy + small private instances + cloud Galaxy can't assume a shared cache.

### Recommendations

**If reference data can be cleanly refactored into natural workflow parameters, just do that.** If a reference table or sample sheet is only ever keyed on a single input, just make the columns of that table direct inputs to the workflow.

**Data tables (both `dbkey` and generic) are discouraged in v1.** Both kinds require admin install, `tool_data_table_conf.xml` edits, and `.loc` files, which break the Foundry's portability-first posture: a translated workflow should run on a stock Galaxy with user-uploaded inputs. A future v2 may layer them in for performance, but not for correctness.

**Prefer in-tool rebuild over a workflow-tier build step.** When an index input is unset, the corresponding Galaxy tool wrapper rebuilds it from the FASTA inside the wrapper itself, using the same logic as the source pipeline's compute-if-missing block. See *Why "in-tool rebuild"* below for the trade-off.

**Reference-producing workflows output explicit files.** Nextflow patterns where reference data is updated as part of the workflow, or where workflow output is updating an admin-managed reference, need to be restructured so the output is an explicit Galaxy dataset or collection. The downstream consumer workflow takes that as input.

**Workflows cannot bundle reference data — but inputs can.** A Galaxy workflow file is a definition, not a payload. Reference data that fits in a directory or single file (and that does not contain absolute path references inside it) can be zipped, uploaded as an input dataset, and referenced from the workflow input. The workflow's input documentation should describe how to obtain or assemble the bundle.

**Use specific datatypes when available; fall back to `data`.** Workflows can consume reference inputs as the generic `data` (any) or `directory` types when nothing more specific applies, but a more specific datatype (`fasta`, `fai`, `picard_dict`, `bwa_index`, …) gives users format-shaped upload guidance and lets tools sniff inputs correctly.

### Common reference-data datatypes

Pulled from the vendored [[galaxy-datatypes-conf]]; consult that note for the canonical extension list and sniff order.

| Asset | Galaxy `format` | Notes |
|---|---|---|
| Reference FASTA | `fasta` | `auto_compressed_types="gz,bz2"` — a `.fasta.gz` upload sniffs as `fasta`. |
| FASTA index | `fai` | Tabular subclass; emitted by `samtools faidx`. |
| Sequence dictionary | (no built-in `picard_dict` extension in vendored sample — falls through to `data` or a per-tool subtype; verify per Galaxy version) | Emitted by `gatk4 CreateSequenceDictionary`. |
| BAM | `bam` | Index sibling: `bai`. |
| CRAM | `cram` | Index sibling: `crai`. |
| BCF | `bcf` | Binary VCF. |
| VCF (bgzip) | `vcf_bgzip` | Index sibling: `tbi`. |
| GTF | `gtf` | `auto_compressed_types="gz"`. |
| GFF / GFF3 | `gff` / `gff3` | gff3 has `auto_compressed_types="gz,bz2"`. |
| BED | `bed` | Interval. |
| BWA index | `bwa_index` | Directory subclass — uploaded as a directory or extracted tarball. |
| BWA-MEM2 index | `bwa_mem2_index` | Directory subclass. |
| Bowtie color/base index | `bowtie_color_index`, `bowtie_base_index` | Directory subclass; not displayed in upload UI by default. |
| HMMER profile | `hmm2`, `hmm3` | Per HMMER version. |
| Kallisto index | `kallisto.idx` | Single binary file. |
| Generic HDF5 | `h5` / `h5ad` / `loom` | Per consumer tool. |
| 2bit | (no `2bit` in vendored sample at this pin — use `data` and document) | UCSC twoBit format. |
| Tabix index | `tbi` (built-in via `vcf_bgzip` ecosystem) | Sibling index. |

### Why "in-tool rebuild" rather than "workflow-tier rebuild step"

Galaxy can also encode "if `fasta_fai` is absent, run `samtools faidx` as an explicit workflow step before alignment." Two reasons to prefer in-tool over workflow-tier:

- **gxformat2 conditional steps are weak.** Step-level `when:` exists but is awkward at scale. A workflow with 6 optional indexes turns into 6 conditional precursor steps and 6 `if/else` data routings into the consumer. The DAG explodes.
- **Wrapper-level rebuild is already common.** Galaxy's BWA, BWA-MEM2, GATK4, and Picard wrappers already handle "no index supplied" by building one. Leaning on this collapses the workflow surface and matches existing IWC convention. The reference-data Mold should not invent new wrapper behavior — it should match what existing wrappers already do.

## When to deviate from in-tool rebuild

- **Heavy indexes, repeated use.** A `bwa-mem2` index used by 200 alignment steps shouldn't rebuild 200 times. For these, an explicit workflow-tier "build index" step that fans out is correct. Threshold: rebuild more than ~3 times → workflow-tier step. Below → in-tool.
- **Index sharing across siblings.** If two sibling workflows (WES + WGS) consume the same indexes and a user runs both, an explicit input lets them share. In-tool rebuild duplicates work but doesn't break anything.

## Gaps in representation

A self-check that an LLM working from the Nextflow classifications above plus the Galaxy idioms / recommendations above has what it needs to make the per-asset shape decision. Open gaps where it does not:

- **In-tool rebuild capability discovery.** The recommendation "wrapper rebuilds the index when absent" assumes the chosen Galaxy tool wrapper actually supports the `no index supplied → build one` branch. The note asserts this is common for BWA / BWA-MEM2 / GATK4 / Picard but does not give the LLM a way to verify it for any specific tool/version. Until [[discover-shed-tool]] surfaces wrapper rebuild capability, the brief has to flag rebuild assumptions as unverified.
- **Bundle UX guidance for ≥4 coupled inputs.** The recommendations cover *why* coordinated bundles are awkward (smrnaseq four-input case, key-expanded ten-plus-input case) but do not give the LLM a concrete shape to default to. `sample_sheet:record` is suggested but not exemplified for reference data; no IWC exemplar is cited as ground truth.
- **Detecting compute-if-missing in `summary-nextflow`.** The classifications above tell the LLM what to look for (`!params.<asset>` guard around an index-building process, often inside a `PREPARE_GENOME` subworkflow). `summary-nextflow` today emits `workflow.conditionals[]` but the schema does not specifically tag a guard as a "rebuild branch." The LLM will need to infer from the guard text plus the gated process's output shape; surface a confidence note when ambiguous.
- **Multi-DB pick-list (funcscan-style) translation pattern.** No worked Galaxy exemplar for "user picks 0..N optional reference databases, each gating its own analysis branch." gxformat2 conditional + optional-input territory; the LLM can describe the choice but cannot anchor it to a known-good shape.
- **Reference-producing pipeline downstream contract.** Reference-producing workflows (createtaxdb, references) output a bundle; whether downstream consumer workflows can take that bundle as a workflow input cleanly (single dataset, collection of files, collection of typed records) is unsettled. The brief should flag this as an open question per pipeline rather than picking unilaterally.
- **Cohort / panel data without rebuild.** PoN, germline-resource, gnomAD-style large reference VCFs. The recommendations cover that they are explicit user inputs, but not how to surface "this is required only when somatic mode is enabled" — Galaxy's required-when-conditional input affordance is weak and worth noting on the brief.
- **Datatype gaps in vendored `datatypes_conf.xml.sample`.** `picard_dict`, `2bit`, and several less-common index types do not appear in the vendored sample at the pinned SHA. Real Galaxy instances may register them via tool-bundled `datatypes_conf.xml` fragments, but the LLM cannot rely on them at design time. The brief should fall back to `data` plus a description for absent extensions and flag the looseness.
- **`dbkey` propagation through map-overs.** Even with the no-cached-tables posture, `dbkey` may be set by a user upstream. The data-flow brief needs to know not to strip `dbkey` from element identifiers through map-over steps; the recommendation here pins the posture but does not yet exemplify the data-flow side.
