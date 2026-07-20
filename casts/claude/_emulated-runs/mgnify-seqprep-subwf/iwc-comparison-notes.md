# IWC Exemplar Comparison — mgnify-seqprep-subwf

## Verdict: **High-confidence nearest exemplar**

The IWC corpus contains the **direct Galaxy port** of this exact MGnify subworkflow tree:

- Paired branch: `amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-quality-control-paired-end/mgnify-amplicon-pipeline-v5-quality-control-paired-end.gxwf.yml`
- Single-end branch: `amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-quality-control-single-end/...`

Domain, tool families, topology, and provenance all align. The CWL we summarized is a *subset* of the IWC port (just the fastp + unzip + seqprep portion plus a custom `count_lines.py`); the IWC version adds Trimmomatic / FastQC / prinseq / fastqtofasta / MultiQC and stops at FASTA, not FASTQ.

## Feature-hierarchy walk

1. **Domain** — exact match: MGnify Pipeline v5 amplicon QC. Same provider, same source pipeline, same release line.
2. **Input topology** — exact match: IWC paired-end variant uses `list:paired` collection as the primary input. This is the Option A shape recommended in the interface brief.
3. **Tool families** — high overlap. IWC uses `iuc/fastp` (confirms fastp wrapper exists), `bgruening/mgnify_seqprep/mgnify_seqprep` (confirms a **MGnify-specific SeqPrep wrapper** exists), `__UNZIP_COLLECTION__` (Galaxy built-in covers the gunzip step). Custom `count_lines.py` is NOT present in the IWC version.
4. **DAG motifs** — IWC uses one linear branch (paired-end only) per workflow id. The split-on-mode pattern present in the CWL is handled by **publishing two sibling workflows** rather than one workflow with a `reads_mode` switch.
5. **Output types** — IWC promotes FASTA + MultiQC artifacts, not the raw FASTQ-prep outputs the CWL exposes. The CWL subworkflow only covers the early FASTQ-prep stage; IWC's port is the full amplicon-QC pipeline.
6. **Test style** — not inspected this run; IWC convention is `tests:` block in the `.gxwf.yml` (TODO follow up).

## Confirmed Tool-Shed wrappers (from IWC ports)

| CWL step | IWC tool id | Notes |
| --- | --- | --- |
| `filter_paired` (fastp) | `toolshed.g2.bx.psu.edu/repos/iuc/fastp/fastp/0.24.1+galaxy0` | Owner `iuc`. Pinned at a stable version. |
| `unzip_merged_reads` / `unzip_single_reads` | `__UNZIP_COLLECTION__` | Galaxy built-in, no shed install. Works on collections; for a single dataset use a regular gunzip wrapper. **IWC port confirms unzipping is real (not optional) in the Galaxy MGnify port.** |
| `overlap_reads` (SeqPrep) | `toolshed.g2.bx.psu.edu/repos/bgruening/mgnify_seqprep/mgnify_seqprep/1.2+galaxy0` | **MGnify-specific** SeqPrep wrapper exists. Use this directly; no need to author a generic seqprep wrapper. |
| `count_submitted_reads*` (count_lines.py) | not present in IWC port | The IWC port emits read-count statistics via FastQC / MultiQC reports rather than a workflow-output scalar. Strong evidence that `count_lines.py` should be replaced (not wrapped) in the Galaxy port. |

## Routing findings forward

- **Template skill (`cwl-summary-to-galaxy-template`)**:
  - **Drop the `reads_mode` switch.** IWC publishes paired-end and single-end as **two separate workflows**, not one workflow with a parameter switch. Match the IWC convention: emit `mgnify-seqprep-paired.gxwf.yml` and a sibling `-single.gxwf.yml`, each a clean linear chain. The `pickValue: first_non_null` fan-in disappears entirely. This is a structural template change driven by the exemplar.
  - Use `list:paired` collection input for the paired workflow (label per IWC: `Paired-end reads`).
  - For the paired-mode skeleton: encode `fastp → __UNZIP_COLLECTION__ → mgnify_seqprep` with concrete tool ids — pattern-page coverage exists via the IWC port and a `galaxy-collection-patterns` paired-passthrough recipe.
  - **Drop the `count_lines.py` step.** Either omit the scalar read-count workflow output entirely or replace it with a FastQC/MultiQC-emitted statistic, matching IWC.
- **Pattern issue**: this is corpus-grade evidence for a `mgnify-amplicon-qc-paired-collection-passthrough` pattern. Consider extending `galaxy-collection-patterns.md` with the worked recipe (fastp → unzip_collection → mgnify_seqprep on a `list:paired`).
- **Tool-step issue**: all three wrappers have known IWC pins. Per-step authoring should call `discover-shed-tool` and have a high hit rate. The owner+changeset_revision are right above in the table.
- **Test issue**: the IWC port presumably ships a `tests:` block; mirror that test shape. Defer to `cwl-test-to-galaxy-test-plan`.

## Structural diff (CWL → IWC port)

| Concern | CWL subworkflow | IWC port (paired) | Resolution |
| --- | --- | --- | --- |
| Mode handling | one subworkflow gated by `when:` predicates | two sibling workflows | Split into two `.gxwf.yml` files. |
| Length filter | required `paired_reads_length_filter: int` | `fastp - Length required: int = 70 (optional)` | Mirror IWC: optional with default; expose label. |
| `count_lines.py` | per-mode scalar `int` workflow output | absent | Drop; surface read counts via MultiQC. |
| Decompression | explicit `multiple-gunzip.cwl` (CommandLineTool) | `__UNZIP_COLLECTION__` (Galaxy built-in) | Use the built-in; no wrapper authoring. |
| Output surface | unzipped merged FASTQ, int read counts, fastp JSON | FASTA (post-Trimmomatic/prinseq/format chain), MultiQC report, MultiQC stats | This CWL is only a fragment of the full IWC pipeline. Template should emit the FASTQ-prep slice as a self-contained workflow, with downstream Trimmomatic/FastQC/etc. left as a "see full IWC port" note. |
| Tool ids | TODO at template stage | concrete pins | Promote all three TODOs to concrete `tool_id` in the template — exemplar carries the pins. |

## Anti-pattern checks

- **CWL `pickValue` fan-in** — IWC convention is to publish separate workflows, not synthesize a "pick non-empty" tool. Following IWC removes the anti-pattern.
- **CWL `unzip-just-to-pass-through`** — IWC keeps the unzip step, so it's not a Galaxy anti-pattern; the downstream Trimmomatic / prinseq tools want uncompressed FASTQ. Validates the CWL choice.
- **CWL scalar `int` workflow output** — confirmed anti-pattern: IWC port drops it in favor of MultiQC.

## Confidence

- **Comparison verdict**: high (the same MGnify pipeline release line, ported by IWC, in two flavors aligning with the CWL's two branches).
- **Concrete tool pins**: high (Tool Shed ids and changeset_revisions taken directly from IWC `.gxwf.yml`).
- **Structural recommendation (split paired/single into two workflows)**: high (IWC publishes them as siblings; following the exemplar is the Foundry default).

## Open questions

- Compare the CWL subworkflow's `count_submitted_reads` semantics to the IWC port's MultiQC outputs more carefully — does any downstream consumer of this subworkflow rely on the scalar int? If yes, the "drop count_lines" recommendation has to be paid for somehow.
- Should `cwl-summary-to-galaxy-template` ever emit *multiple* workflow files in one run, or is "one template Mold invocation = one workflow file" the contract? The IWC two-sibling-workflows convention pushes us to one-or-the-other.
- The IWC port adds many steps (Trimmomatic, FastQC, prinseq, fasta_formatter, MultiQC) absent from the CWL slice. Is the Foundry's job here to (a) faithfully port the CWL slice and stop, (b) emit the slice and warn that the full Galaxy MGnify QC has more, or (c) port the full IWC-equivalent pipeline regardless of CWL source scope? Default position: (a) — the CWL is the contract.
