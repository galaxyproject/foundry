# Galaxy Interface Brief — mgnify-seqprep-subwf

## Source provenance

- **Workflow**: `seqprep-subwf` (MGnify Pipeline v5, subworkflow).
- **Entrypoint**: `seqprep-subwf.cwl` (cwlVersion `v1.2.0-dev2` — pre-release tag, mixed with v1.0 tools).
- **Repo pin**: `EBI-Metagenomics/pipeline-v5 @ 981aafc0df341a2536ed5059695bb7c33af4d3ee` (release v5.0.7).
- **License**: Apache-2.0.
- **Validation**: not run (cwltool unavailable); summary extracted by direct YAML walk.

## Workflow inputs

The CWL declares three optional `File?` inputs (`forward_reads`, `reverse_reads`, `single_reads`) plus a required `int` (`paired_reads_length_filter`). At runtime exactly one of {(forward,reverse), single} is meaningful — the workflow gates every step with a `when:` predicate keyed on whether `single_reads` is supplied.

Two honest Galaxy interface options exist; this brief recommends **Option A** and defers the final pick to the data-flow brief / IWC comparison:

### Option A (recommended) — paired collection or single dataset, gated by Galaxy conditional

| Galaxy input id | Galaxy label | Shape | Galaxy datatype (seed) | CWL source | Notes |
| --- | --- | --- | --- | --- | --- |
| `reads_mode` | Paired-end or single-end? | parameter (select) | text (enum: `paired`, `single`) | derived from `single_reads == undefined` gate | Drives a workflow-level conditional. Galaxy has no native `pickValue`; an explicit switch makes the branching legible. |
| `paired_reads` | Paired-end FASTQ collection | dataset_collection (paired) | `fastqsanger.gz` (input is gzipped per `multiple-gunzip` downstream) | `forward_reads` + `reverse_reads` (both `File?`) | Collapse the two CWL `File?` inputs into one Galaxy `paired` collection input. Exposed only when `reads_mode = paired`. |
| `single_reads` | Single-end FASTQ dataset | dataset | `fastqsanger.gz` | `single_reads: File?` | Exposed only when `reads_mode = single`. |
| `paired_reads_length_filter` | Minimum paired-read length after fastp | parameter (integer) | integer | `paired_reads_length_filter: int` | Required (no default in CWL). Only meaningful in paired mode but interface keeps it visible. |

### Option B — three optional File inputs mirroring CWL 1:1

Keeps the CWL input surface verbatim. Three `data` inputs with `optional: true`, no Galaxy conditional. Faithful to source but pushes the "exactly one mode is real" invariant out to runtime, which Galaxy users routinely get wrong. Rejected as the default; included so the data-flow step can reconsider against IWC precedent.

## Workflow outputs

| Galaxy output id | Label | Exposed? | Checkpoint? | Galaxy datatype (seed) | CWL source | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `processed_reads` | Processed reads (merged paired / passthrough single) | yes | yes | `fastqsanger` (uncompressed; `gunzip` step strips `.gz`) | `unzipped_single_reads` (pickValue first_non_null over `unzip_merged_reads/unzipped_file`, `unzip_single_reads/unzipped_file`) | Single Galaxy output, sourced from whichever branch produced data. Galaxy: a `then/else` branch in the conditional both feed the same workflow output. |
| `submitted_read_count` | Submitted read count | yes | yes | integer (Galaxy parameter output) | `count_forward_submitted_reads` (pickValue first_non_null over `count_submitted_reads/count`, `count_submitted_reads_single/count`) | Same fan-in pattern. CWL emits an `int` workflow output; in Galaxy this is uncomfortable — workflow-level scalar outputs typically materialize as a tiny file. Flag for data-flow brief. |
| `fastp_json_report` | fastp QC JSON | yes | yes | `json` (fastp report) | `fastp_report: File?` from `filter_paired/json_report` | Optional output (paired mode only). Galaxy can leave it absent in single mode. |

No `secondaryFiles`, no records, no scatter inside the subworkflow.

## Confidence

- **High**: input list mapping, output list mapping, fact that the workflow is two-branch (paired vs single), Apache-2.0 license, FASTQ format pinning via the `edam:format_1929`/`1930` declarations on fastp inputs.
- **Medium**: shape choice — collapsing `forward_reads` + `reverse_reads` into a paired collection is Galaxy-idiomatic but not source-literal. IWC comparison should sanity-check.
- **Medium**: datatype seed for `processed_reads` — `unzip_*` produces `.fastq` (uncompressed) per `gunzip -c > stdout`; `fastqsanger` is the typical Galaxy datatype, but quality encoding is not explicitly declared in source.
- **Low**: `submitted_read_count` representation — an int workflow output is unusual in Galaxy; pinning it to a parameter output vs. a small text dataset is a real design call.

## Open questions

- Should the Galaxy workflow expose `reads_mode` as a `select` parameter, or split into two separate top-level workflows? Subworkflow-as-mode-switch is awkward in Galaxy without `when:`-equivalent at the top level (gxformat2 v3 supports conditional steps; coverage at workflow output level is thinner).
- `submitted_read_count` is an `int` output. Is there an IWC precedent for scalar workflow outputs, or should this Galaxy port emit a tiny `.txt` dataset and let downstream tools parse it?
- Should `paired_reads_length_filter` move into a Galaxy "Advanced parameters" section, or stay top-level? CWL has no `doc:` to seed labelling.
- The CWL declares `v1.2.0-dev2` but referenced tools declare `v1.0`. The interface brief is unaffected, but normalization may be required before `gxwf` / Galaxy-side validators accept the source tree.

## Non-decisions (deferred downstream)

- The actual branching topology (Galaxy conditional step vs. two-pipeline split vs. select-controlled `when:` on each step) — `cwl-summary-to-galaxy-data-flow`.
- Tool selection (does the Galaxy Tool Shed have a fastp wrapper that matches the binding surface? SeqPrep wrapper? a tool that emits a numeric "read count" usable as a workflow output?) — per-step authoring loop.
- Test plan (the CWL ships no test fixture for this subworkflow alone) — `cwl-test-to-galaxy-test-plan`.
