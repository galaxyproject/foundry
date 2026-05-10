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
revision: 2
ai_generated: true
related_notes:
  - "[[nextflow-params-to-galaxy-inputs]]"
  - "[[nextflow-path-glob-to-galaxy-datatype]]"
  - "[[summary-nextflow]]"
  - "[[nextflow-summary-to-galaxy-reference-data]]"
related_molds:
  - "[[summarize-nextflow]]"
  - "[[nextflow-summary-to-galaxy-reference-data]]"
  - "[[nextflow-summary-to-galaxy-interface]]"
  - "[[nextflow-summary-to-galaxy-data-flow]]"
sources:
  - "https://nf-co.re/docs/usage/reference_genomes"
  - "https://github.com/nf-core/sarek/blob/master/conf/igenomes.config"
  - "https://github.com/nf-core/configs"
summary: "How nf-core pipelines resolve reference data; v1 Galaxy posture is explicit optional index inputs with in-tool rebuild on absence."
---

# Nextflow to Galaxy reference-data mapping

Upfront research for [[nextflow-summary-to-galaxy-reference-data]]. Most nf-core pipelines lean on a reference-resolution pattern Galaxy has no direct analog for; this note captures the source-side options, pins the recommended Galaxy posture, and describes the brief the Mold writes so downstream interface and data-flow Molds inherit consistent decisions.

Surfaced from sarek emulation (2026-05-08); generalized to the Mold split (2026-05-10).

## Why a separate Mold

`nextflow-params-to-galaxy-inputs` covers params → Galaxy inputs in general but treats reference-bundle params as just another `data` input. That's wrong: a single nf-core `params.genome = 'GATK.GRCh38'` expands at config-load time into ~12 derived params (`fasta`, `fasta_fai`, `dict`, `bwa_index`, `bwamem2_index`, `dragmap`, `dbsnp`, `dbsnp_tbi`, `known_indels`, `known_indels_tbi`, `germline_resource`, `germline_resource_tbi`, `intervals`, `pon`, …). Treating each derived param as an independent Galaxy input misses the structure and produces a Galaxy interface with 12 confusing optional inputs.

The reference-data decision is also load-bearing on both [[nextflow-summary-to-galaxy-interface]] (which inputs exist, which are optional, which carry datatype hints) and [[nextflow-summary-to-galaxy-data-flow]] (where rebuild edges live, what flows through map-overs, whether `dbkey` survives). Letting each downstream Mold re-derive the same decision risks drift between the two briefs. Pulling it forward into [[nextflow-summary-to-galaxy-reference-data]] gives both downstream Molds one shared upstream decision to read.

## Nextflow side — how reference data shows up

Three patterns surface in the corpus, in rough frequency order:

### 1. iGenomes-style key expansion (nf-core)

`nextflow.config` includes `conf/igenomes.config` and a `getGenomeAttribute(attr)` helper. `params.genome` is a string key (`GATK.GRCh38`, `GRCh37`, `mm10`); each derived attribute is computed at config-load:

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

These params do **not** appear in `nextflow_schema.json` and won't show up in `summarize-nextflow`'s `params[]` unless the resolver special-cases them (today it captures them with a description noting the dynamic source — see `summarize-nextflow` index §3). The user supplies one key; the pipeline resolves a dozen paths.

### 2. Explicit per-asset params (mixed nf-core + ad-hoc)

`nextflow_schema.json` declares each reference asset directly as a path-shaped param:

```jsonc
{
  "fasta":     { "type": "string", "format": "file-path", "description": "Reference FASTA" },
  "fasta_fai": { "type": "string", "format": "file-path", "description": "FASTA index" }
}
```

Common in ad-hoc DSL2 pipelines and in nf-core pipelines run with `--genome null --fasta /path/to/custom.fasta`. The user supplies each path explicitly. `summarize-nextflow` captures these straightforwardly.

### 3. Compute-if-missing fallback

Whether the user picked iGenomes or explicit paths, modern nf-core pipelines run a "build any missing index" step at the front of the workflow. Sarek's `PREPARE_GENOME` subworkflow runs `samtools faidx`, `gatk4 CreateSequenceDictionary`, `bwa index`, `bwamem2 index`, etc., gated on whether the corresponding param was supplied:

```groovy
if (!params.fasta_fai) {
  SAMTOOLS_FAIDX(fasta)
  fasta_fai = SAMTOOLS_FAIDX.out.fai
}
```

This is the Nextflow equivalent of "the user only has to supply the FASTA; we'll derive the rest." It's load-bearing — most users never supply pre-built indexes — but it's invisible to a user reading `nextflow_schema.json` because the index params just look optional.

## Galaxy side — the v1 posture

Galaxy has two reference-data idioms historically:

- **Cached `dbkey` / data tables.** Admins pre-load BWA indexes, GATK known-sites, dbSNP for common builds. Workflow inputs carry a `dbkey` annotation; tools look up cached indexes by `dbkey`. Powerful when builds are common; opaque when not, and not every Galaxy server admin curates the same set.
- **Explicit data inputs.** Reference + index passed as workflow `data` inputs.

**Galaxy folks who care about reference-data UX increasingly dislike the cached/dbkey path.** It's invisible state that breaks when the admin hasn't loaded the build, varies between Galaxy instances, and forces wrappers to special-case "is this dbkey cached or do I rebuild." Workflows that ship to public Galaxy + small private instances + cloud Galaxy can't assume a shared cache.

**Recommended v1 posture.** Translate every nf-core reference asset to an **explicit optional Galaxy `data` input**. When the input is unset, the corresponding Galaxy tool wrapper is responsible for rebuilding it from the FASTA inside the wrapper itself (using the same logic as the source pipeline's compute-if-missing block). Cached/dbkey lookups stay out of the interface; a future v2 may layer them in for performance, but not for correctness.

Concretely, sarek's reference surface translates to roughly:

| Galaxy input | Type | Required? | Behavior when unset |
|---|---|---|---|
| `fasta_reference` | `data`, `fasta` | yes | n/a |
| `fasta_fai` | `data`, `fai` | optional | wrapper runs `samtools faidx` to build inside the alignment / variant-calling tool |
| `bwa_index` | `data` (collection of index files, or a single tar) | optional | wrapper runs `bwa index` on the FASTA |
| `bwamem2_index` | `data` | optional | wrapper runs `bwa-mem2 index` |
| `dict` | `data`, `picard_dict` | optional | wrapper runs `gatk4 CreateSequenceDictionary` |
| `dbsnp` | `data`, `vcf_bgzip` | optional | passes `--dbsnp` only when supplied; tool runs without dbSNP otherwise |
| `dbsnp_tbi` | `data`, `tbi` | optional | wrapper runs `tabix` on the supplied dbSNP if absent |
| `known_indels` | `data`, `vcf_bgzip` | optional | same |
| `known_indels_tbi` | `data`, `tbi` | optional | wrapper runs `tabix` |
| `intervals_bed` | `data`, `bed` | optional | required when `wes=true`; otherwise WGS chunking happens inside tools |
| `pon` (somatic only) | `data`, `vcf_bgzip` | optional | tool runs without panel of normals |

iGenomes the *key* (`params.genome`) does not survive translation. The Galaxy workflow has no equivalent of "type `GATK.GRCh38` and we'll resolve 12 paths." Users supply at minimum the FASTA; everything else is optional with in-tool fallback.

## Why "in-tool rebuild" rather than "workflow-tier rebuild step"

Galaxy can also encode "if `fasta_fai` is absent, run `samtools faidx` as an explicit workflow step before alignment." Two reasons to prefer in-tool over workflow-tier:

- **gxformat2 conditional steps are weak.** Step-level `when:` exists but is awkward at scale. A workflow with 6 optional indexes turns into 6 conditional precursor steps and 6 `if/else` data routings into the consumer. The DAG explodes.
- **Wrapper-level rebuild is already common.** Galaxy's BWA, BWA-MEM2, GATK4, and Picard wrappers already handle "no index supplied" by building one. Leaning on this collapses the workflow surface and matches existing IWC convention. The reference-data Mold should not invent new wrapper behavior — it should match what existing wrappers already do.

## When to deviate from in-tool rebuild

- **Heavy indexes, repeated use.** A `bwa-mem2` index used by 200 alignment steps shouldn't rebuild 200 times. For these, an explicit workflow-tier "build index" step that fans out is correct. Threshold: rebuild more than ~3 times → workflow-tier step. Below → in-tool.
- **Index sharing across siblings.** If two sibling workflows (WES + WGS) consume the same indexes and a user runs both, an explicit input lets them share. In-tool rebuild duplicates work but doesn't break anything.

## Output: the reference-data brief

The Mold writes a Markdown brief consumed by [[nextflow-summary-to-galaxy-interface]] and [[nextflow-summary-to-galaxy-data-flow]]. Sections:

- **Source surface.** Which of the three patterns above the pipeline uses (iGenomes-key, explicit per-asset, or both); the iGenomes key disposition (drop the key, retain the per-asset paths only); a list of the reference params extracted from `summary-nextflow` (`params[]` plus dynamic-source params surfaced by `summarize-nextflow` §3) with their source-side names.
- **Galaxy inputs.** One row per reference asset: Galaxy input name, datatype hint (`fasta`, `fai`, `picard_dict`, `vcf_bgzip`, `tbi`, `bed`, …), required vs optional, rebuild-on-absence behavior the wrapper is expected to implement, source-summary provenance (which `params[]` entry or compute-if-missing branch backed the decision), and confidence.
- **Workflow-tier rebuild deviations.** Any asset that should become an explicit workflow step rather than in-tool rebuild (heavy index used >~3 times, sibling-shared, …).
- **`dbkey` posture.** Whether downstream consumers will need to preserve `dbkey` on intermediate datasets; the default is "do not introduce new `dbkey`-driven behavior" but the data-flow brief still needs to know not to strip user-supplied `dbkey` annotations through map-overs.
- **Open questions for the user.** Surface anything the source pipeline does that the Galaxy posture cannot honor (large user-supplied VCFs with no rebuild path, custom genome bundles, runtime-only references), so the harness can resolve them before interface authoring.

The brief is design-tier, not gxformat2 — it should not invent step IDs, tool IDs, or `column_definitions`. It pins decisions; the downstream Molds spend them.

## Open questions

- **iGenomes key as a Galaxy data table?** Some Galaxy admins might want `genome` as a dropdown that resolves a cached bundle. Out of scope for v1; revisit if a corpus exemplar surfaces.
- **PoN, germline-resource, gnomAD-style large reference VCFs.** These are big and per-build; treating them as optional `data` inputs is correct but the user has to supply them. No wrapper-level rebuild is possible. Worth its own subsection once a sarek-shaped somatic translation exists.
- **Test data parity.** IWC test fixtures for variant-calling workflows tend to ship a tiny FASTA + index bundle. nf-core test profiles ship the same. Worth a follow-up subsection on translating the test fixture set, not just the input surface — likely belongs to [[nextflow-test-to-galaxy-test-plan]] rather than this Mold.

## Corpus footing

Thin. One pinned exemplar (`nf-core__sarek` 3.8.1) drove this stub; bacass and rnaseq have lighter reference surfaces (no BQSR, no germline resources) and don't fully exercise the recommendations here. Promote out of `status: draft` after at least one of: rnaseq + sarek emulation cross-checked, taxprofiler emulation tried, or an IWC-side review of the recommended posture against existing variant-calling exemplars.
