# IWC exemplar comparison — biowardrobe_chipseq_se

Briefs compared: `cwl-galaxy-interface.md` + `cwl-galaxy-data-flow.md`.
Corpus: `~/projects/repositories/workflow-fixtures/iwc-format2/` (galaxyproject/iwc, format2).

## Nearest exemplar(s)

- **Primary:** [[chipseq-sr]] at `epigenetics/chipseq-sr/chipseq-sr.gxwf.yml`. Confidence: **medium-high**.
- **Sibling for reference:** [[chipseq-pe]] at `epigenetics/chipseq-pe/chipseq-pe.gxwf.yml`. Not selected (PE; brief is SE).
- **Adjacent:** [[consensus-peaks-chip-sr]] at `epigenetics/consensus-peaks/consensus-peaks-chip-sr.gxwf.yml`. Downstream multi-sample peak consensus; out of scope for a single-sample pipeline.

`chipseq-sr` is the closest IWC analog: same domain (ChIP-seq), same input topology (single-end FASTQ), same primary tool families (aligner → BAM filter → MACS2 → bigwig → MultiQC). Marked medium-high (not high) because the aligner and several downstream tools differ.

## Feature-hierarchy diff (brief → IWC `chipseq-sr`)

| Feature | Brief proposal | IWC chipseq-sr | Verdict |
| --- | --- | --- | --- |
| **Domain** | ChIP-seq, single-end | ChIP-seq, single-end | match |
| **Input topology** | single `fastq_file` dataset | **`collection: list` of FASTQs** | **diverge — IWC uses a list collection** |
| **Reference input** | `indices_folder` (Directory) → cached `bowtie_indices` table | `Reference genome` (string, `restrictOnConnections: true`) — Galaxy reference-data table | match in spirit; IWC uses a `string` reference-name input, not a Directory |
| **Aligner** | bowtie1 (`bowtie-alignreads`) | **bowtie2** (`devteam/bowtie2`) | diverge — version/tool family |
| **QC pre-align** | `fastx_quality_stats` (legacy) | `fastp` (adapter + quality) | diverge — IWC adapter trim, brief only emits stats |
| **Duplicate removal** | `samtools rmdup` (optional, `remove_duplicates` toggle) | not present in chipseq-sr | diverge — brief has it; IWC chipseq-sr does not |
| **BAM filter** | none | `filter MAPQ30` (samtool_filter2) | diverge — IWC adds MAPQ filter |
| **Peak caller** | MACS2 callpeak (biowardrobe wrapper) | MACS2 callpeak (`iuc/macs2_callpeak/2.2.9.1+galaxy0`) | match (different wrapper) |
| **Control sample** | optional `control_bam` File? | not modeled in chipseq-sr | diverge — IWC chipseq-sr is no-control; **chipseq-pe** also no-control. IWC pattern is per-workflow not per-input. |
| **Coverage track** | `bedtools genomecov → sort → bedGraphToBigWig` (nested 3-step subworkflow) | `Bigwig from MACS2` (single `wig_to_bigWig` step on MACS2 output) | **diverge — different recipe**; IWC uses MACS2's bigwig output |
| **Peak annotation** | `iaintersect` (biowardrobe) → tabular | not present | diverge |
| **Tag-density profile** | `atdp` (biowardrobe) → tabular | not present | diverge |
| **Stat collector** | `python-get-stat-chipseq` (biowardrobe) → log | `summary of MACS2` (text_processing/tp_grep_tool) + MultiQC | diverge — IWC uses MultiQC for aggregate stats |
| **Test fixture topology** | sibling `biowardrobe_chipseq_se.yaml` job file; no asserted outputs | gxformat2 `-tests.yml` with asserted outputs | diverge — brief has no tests yet |

## Routing findings

**Template/data-flow issues (for `cwl-summary-to-galaxy-template`):**

1. **Reconsider input topology.** IWC ChIP-seq workflows take a `collection: list` of FASTQs, not a single dataset. Even for a single-sample run, this is the IWC idiom — it makes batch use trivial without rewriting. Recommend revising the interface brief to a `list` collection input.
2. **Reference input shape.** IWC ChIP-seq uses a `string` reference-genome name with `restrictOnConnections: true`, resolved at runtime against Galaxy's cached `bowtie2_indices` data table. This is closer to the right Galaxy-native shape than "Directory input" or "data table on the back end." Recommend revising open question #1 in the interface brief.
3. **Inline subworkflow, but consider replacing with MACS2 bigwig.** The 3-step bedtools→sort→bedGraphToBigWig recipe is not the IWC idiom for ChIP-seq coverage. IWC uses MACS2's own bigwig output. If fidelity-to-source is required, keep the 3-step recipe; if reaching for an IWC-shaped output, replace.
4. **Add MultiQC.** IWC ChIP-seq workflows end with a MultiQC step aggregating fastp/bowtie/MACS2 logs into an HTML report. The brief proposes a custom biowardrobe `get_stat` step instead. Recommend adding MultiQC as a Galaxy-idiom additive, alongside or instead of `get_stat`.
5. **MAPQ filter.** IWC adds an explicit `samtool_filter2 MAPQ30` step; the CWL workflow does not. Decide: faithful-to-source (skip) vs IWC-aligned (add). Recommend faithful-to-source for the conversion fidelity test, with the MAPQ filter as a noted enrichment.

**Pattern issues:**

- The CWL-Directory → Galaxy-reference-table pattern (open question #1) is recurring. Worth surfacing as a candidate pattern page: "CWL Directory inputs for index bundles → Galaxy reference-data tables." (Out of scope for this run, raised as future work.)

**Tool-step issues (for downstream discover-shed-tool):**

- Likely Tool Shed hits: `iuc/macs2`, `devteam/bowtie` (1.x?) or `devteam/bowtie2`, `devteam/samtools_*`, `iuc/bedtools`, `wig_to_bigWig` (built-in), `iuc/fastp`.
- Likely-author: `biowardrobe` flavored `atdp`, `iaintersect`, `python-get-stat-chipseq`, `extract-fastq`, and the `macs2-callpeak-biowardrobe-only` wrapper.
- The IWC ChIP-seq workflows do not include analogs of `atdp` or `iaintersect`. If conversion fidelity matters, expect to author. If IWC-alignment is more important, drop them.

**Test issues:**

- IWC ChIP-seq carries a `-tests.yml` next to each workflow with asserted outputs. The fixture has a sibling `biowardrobe_chipseq_se.yaml` job file but no asserted outputs. Defer to `cwl-test-to-galaxy-test-plan`.

## Confidence

Medium-high on the exemplar choice (correct domain + topology), medium on the structural diff (5 substantive divergences listed). The biowardrobe-specific downstream stats (atdp, iaintersect, get_stat) have no IWC analog — that's the largest source of uncertainty about whether to translate faithfully or substitute the IWC idiom.

## Open questions

1. Conversion fidelity vs IWC-alignment tradeoff. Recommend documenting both intents at the template stage and letting the user pick.
2. Should the brief revise to `collection: list` SE input before template authoring? Recommend yes.
3. Bowtie1 vs bowtie2 — keep faithful or upgrade? Faithful for first pass.
4. Add MultiQC as an idiomatic Galaxy add-on, or leave the workflow biowardrobe-shaped? Recommend add.
