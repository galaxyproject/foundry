---
type: research
subtype: component
title: "Nextflow reference-data classification"
tags:
  - research/component
  - source/nextflow
status: draft
created: 2026-05-10
revised: 2026-05-10
revision: 3
ai_generated: true
related_notes:
  - "[[summary-nextflow]]"
  - "[[nextflow-to-galaxy-reference-data-mapping]]"
  - "[[nextflow-summary-to-galaxy-reference-data]]"
  - "[[nextflow-summary-to-galaxy-interface]]"
  - "[[nextflow-summary-to-galaxy-data-flow]]"
  - "[[nextflow-summary-to-galaxy-template]]"
related_molds:
  - "[[summarize-nextflow]]"
  - "[[nextflow-summary-to-galaxy-reference-data]]"
  - "[[nextflow-summary-to-galaxy-interface]]"
  - "[[nextflow-summary-to-galaxy-data-flow]]"
  - "[[nextflow-summary-to-galaxy-template]]"
sources:
  - "https://nf-co.re/docs/usage/reference_genomes"
  - "https://github.com/nf-core/sarek/blob/master/conf/igenomes.config"
  - "https://github.com/nf-core/configs"
  - "https://github.com/galaxyproject/foundry/issues/221"
summary: "Source-side taxonomy of how Nextflow pipelines use reference data — eight classifications detectable from a summary-nextflow artifact."
---

# Nextflow reference-data classification

Reference-data shape varies along several roughly orthogonal dimensions: whether the pipeline consumes or produces reference data, the cardinality of the assets, whether they're keyed or per-asset, whether rebuild fallback exists, and whether multiple bundles run in parallel. The classifications below are flags an LLM can detect from a `summary-nextflow` artifact; a single pipeline often matches more than one. Grounded in the complexity bridge fixtures from galaxyproject/foundry#221.

For the Galaxy-side translation of these classifications, see [[nextflow-to-galaxy-reference-data-mapping]].

## None

Pipeline consumes no reference data. Detection: `params[]` has no path-shaped reference asset; no `getGenomeAttribute` call in `nextflow.config`. Examples: `nf-core/multiplesequencealign`, `nf-core/proteinfamilies`, `seqeralabs/nf-canary`. Galaxy translation has no reference-data surface to design.

## Reference-producing pipeline

Pipeline output **is** the reference data — it builds a database, index, or bundle for downstream consumers. Examples: `nf-core/createtaxdb`, `nf-core/references`. Detection: pipeline has no major path-shaped input but advertises bundle outputs (`publishDir` patterns matching `kraken2_database/`, `*.fai`, `bwa-index/`, …); `meta.yml` for the top-level workflow describes outputs as databases or indexes. Galaxy translation question is whether the bundle output cleanly lands as a workflow output, given that data managers are off the table — the consumer pattern (next workflow takes the bundle as an input collection) is itself open.

## Single asset

One reference asset, often optional. Examples: `nf-core/bamtofastq` (FASTA needed only when input is CRAM), `nextflow-io/rnaseq-nf` (a small bundled transcriptome). Detection: exactly one path-shaped reference param, sometimes guarded by a process-level `when:` or `if (params.X)` branch. Easiest rung to test the v1 posture against — single optional Galaxy `data` input, conditional consumer.

## Coordinated bundle

Several related assets that travel together as a logical unit. Example: `nf-core/smrnaseq` consumes `--genome` + miRBase mature + miRBase hairpin + GTF, and these four are coupled — switching genome means switching all four. Detection: multiple path-shaped reference params declared together in `nextflow_schema.json` under a shared section heading, or referenced together in a single subworkflow without per-param conditional branching. Translation strain: Galaxy v1 posture forces N separate optional `data` inputs, which can produce a workflow surface that's hard for users to fill out coherently.

## Key-expanded bundle (iGenomes-style)

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

Examples: `nf-core/atacseq`, `nf-core/sarek`, `nf-core/rnaseq` (with `--genome` set). Detection: any `params[]` entry with `source_kind: "getGenomeAttribute"` plus the verbatim `source_expression` (e.g. `getGenomeAttribute('fasta_fai')`) and `source_path` pointing at `conf/igenomes.config` or `conf/genomes.config`. The resolver scans these files explicitly (galaxyproject/foundry#229); the derived params surface in `params[]` and `reference_assets[]` even when absent from `nextflow_schema.json`. The Galaxy workflow surface starts at the resolved per-asset paths, not the key.

## Indexes with rebuild fallback (compute-if-missing)

Pre-built indexes are optional; the pipeline rebuilds them on absence. Modern nf-core pipelines run a "build any missing index" step at the front. Sarek's `PREPARE_GENOME` subworkflow runs `samtools faidx`, `gatk4 CreateSequenceDictionary`, `bwa index`, `bwamem2 index`, etc., gated on whether the corresponding param was supplied:

```groovy
if (!params.fasta_fai) {
  SAMTOOLS_FAIDX(fasta)
  fasta_fai = SAMTOOLS_FAIDX.out.fai
}
```

Examples: `nf-core/rnaseq` (STAR / salmon / hisat2 indexes), `nf-core/sarek` (BWA / dict / fai). Detection: any non-empty `reference_rebuilds[]` entry on the summary — each binds an `asset_param` to a `builder` process plus the verbatim `guard`, `guard_params`, `builder_outputs`, and `fallback_for` take-name. The negated-guard idiom is detected in both of its assignment forms: the two-statement `if (!<x>_in) { BUILDER(...); <asset> = BUILDER.out.<chan> }` used by Sarek, and the fused `if (!<x>) { ch_<asset> = BUILDER(args).<chan>.map{ ... } }` used by `nf-core/eager`'s `reference_indexing_single` (galaxyproject/foundry#349). The positive-form idiom used by `nf-core/rnaseq`'s `PREPARE_GENOME` (`if (<asset>) { unpack } else if (fasta_provided) { ch_<asset> = BUILDER(args).<chan> }`) remains a known gap — for those pipelines `reference_rebuilds[]` is empty and the asset must be flagged *rebuild-unverified*. Load-bearing — most users never supply pre-built indexes — but invisible to a user reading `nextflow_schema.json` because the index params just look optional. This pattern usually overlays *single asset*, *coordinated bundle*, or *key-expanded bundle*; it's an aspect, not a parallel kind.

## Multi-DB pick-list

Multiple independent reference databases, each enabling its own analysis branch — the user picks 0..N. Example: `nf-core/funcscan` lets a user enable any subset of AMR / BGC scanners (hamronization, AMRFinderPlus, DeepARG, hmmsearch, …), each with its own DB. Detection: several optional path or directory params named after distinct tools or analysis branches (`amrfinderplus_db`, `deeparg_db`, …), each guarded by a corresponding `skip_*` or `run_*` flag. Translation strain: Galaxy needs to surface "user picks 0..N of these DBs, and the workflow runs the scanners they picked" — conditional / optional-input territory, but no worked Galaxy example at this scale yet.

## Parallel bundles plus cohort data

Several parallel reference bundles plus per-cohort or per-panel data the pipeline cannot rebuild. Example: `nf-core/sarek` consumes a genome bundle plus a panel-of-normals (PoN) plus germline-resource VCFs plus intervals BED. Detection: a *key-expanded* or *coordinated bundle* core, plus additional path-shaped params (`pon`, `germline_resource`, `intervals`) that have no compute-if-missing branch and represent cohort- or study-level data the user must supply. The cohort assets can't be rebuilt on absence — they're explicit user inputs no matter the rung.
