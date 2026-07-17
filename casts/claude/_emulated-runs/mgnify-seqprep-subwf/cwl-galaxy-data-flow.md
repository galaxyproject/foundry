# Galaxy Data-Flow Brief — mgnify-seqprep-subwf

## Topology (abstract)

The CWL subworkflow is two complementary branches gated by `when: $(inputs.single == undefined)` (paired) / `when: $(inputs.target_reads != undefined)` (presence-of-input) plus a final `pickValue: first_non_null` fan-in:

```
                                            ┌── PAIRED branch (when single_reads == undefined) ───────────────────────────────────────────┐
                                            │                                                                                              │
forward_reads ──┐                            │  count_submitted_reads ── count ────────────────────────────────────────┐                   │
                ├──── filter_paired ─out_fastq1/out_fastq2 ──► overlap_reads ── merged_reads ─► unzip_merged_reads ─► unzipped_file ──┐    │
reverse_reads ──┘                            │                                                                        │              │   │
paired_reads_length_filter ──────────────────┤                                                                        │              │   │
                                            │            fastp/json_report ─────────────────────────────────────────► │ fastp_report │   │
                                            └──────────────────────────────────────────────────────────────────────────┘              │   │
                                                                                                                                       │   │
                                            ┌── SINGLE branch (when target_reads != undefined) ──────────────────────┐                 │   │
single_reads ──────────────────────────────►│ unzip_single_reads ── unzipped_file ─┐                                  │                 │   │
                                            │                                       ├─► count_submitted_reads_single ─┘                │   │
                                            │                                       │      └── count ─────────────────────────────────►│   │
                                            └───────────────────────────────────────┘                                                  ▼   ▼
                                                                                                                            count_forward_submitted_reads      unzipped_single_reads
                                                                                                              (pickValue: first_non_null over the two count sources)        (pickValue: first_non_null over the two unzip outputs)
```

Edges (from `summary-cwl.graph.edges[]`, simplified):

| From | To | Galaxy reshape |
| --- | --- | --- |
| `forward_reads` | `filter_paired/fastq1` | (paired branch) split paired collection → forward element |
| `reverse_reads` | `filter_paired/fastq2` | (paired branch) split paired collection → reverse element |
| `paired_reads_length_filter` | `filter_paired/min_length_required` | direct integer parameter |
| `filter_paired/out_fastq1`, `out_fastq2` | `overlap_reads/forward_reads`, `reverse_reads` | direct wires within paired branch |
| `overlap_reads/merged_reads` | `unzip_merged_reads/target_reads` | direct wire |
| `single_reads` | `unzip_single_reads/target_reads` | (single branch) direct dataset wire |
| `unzip_single_reads/unzipped_file` | `count_submitted_reads_single/sequences` | direct wire |
| `forward_reads` | `count_submitted_reads/sequences` | (paired branch) directly count submitted forward reads |
| `count_submitted_reads/count`, `count_submitted_reads_single/count` | `count_forward_submitted_reads` | **fan-in: pickValue: first_non_null** |
| `unzip_merged_reads/unzipped_file`, `unzip_single_reads/unzipped_file` | `unzipped_single_reads` | **fan-in: pickValue: first_non_null** |
| `filter_paired/json_report` | `fastp_report` | direct wire (only populated in paired mode) |

## Galaxy collection semantics

- **Paired collection split**: under the interface brief's Option A (recommended), `forward_reads`/`reverse_reads` source from a single `paired` collection element. Galaxy idiom: feed the paired collection straight into the paired-mode fastp wrapper (almost every fastp Galaxy wrapper accepts paired collections natively). The "split into forward/reverse" reshape happens inside the wrapper, not as an explicit Galaxy step. Pattern: `galaxy-collection-patterns` — *paired collection passthrough*.
- **Single dataset path**: no collection semantics; plain `data` wire.
- **No scatter, no `linkMerge`, no records, no `Directory`, no `secondaryFiles`.** Galaxy idiom largely follows CWL 1:1 *inside each branch*; only the branch fan-in needs explicit reshape.

## Conditional / branching translation

`when:` predicates appear on every CWL step. Two honest Galaxy options:

1. **Workflow-level conditional** (Option A, recommended). A `select` parameter (`reads_mode`) drives a `when:` field on every gxformat2 step (gxformat2 supports per-step `when:` since the workflow-conditionals work landed). Both branches emit into the same `unzipped_single_reads` workflow output via two separate `outputSource` connections gated by the same `when:` — but gxformat2 does not have `pickValue` at the output level, so we must instead:
   - Promote the output as a **collection-of-one** from each branch, then concatenate, then expose the single result; or
   - Emit two separate workflow outputs (`processed_reads_paired`, `processed_reads_single`) and let consumers know which one materialized; or
   - Insert a tiny "pick non-empty" Galaxy tool step that selects between the two.
2. **Two separate Galaxy workflows** (`seqprep-paired`, `seqprep-single`). Cleaner. The seqprep / fastp / count-lines branches become independent workflows. Loses the "single mode bypasses fastp+seqprep" semantic difference per workflow id, but each is more conventional.

Recommendation: stay with **Option 1** in the gxformat2 skeleton, with placeholder "branch-merge" steps. Defer the merge strategy to IWC comparison.

## Abstract step list (placeholder)

| Galaxy step id | Abstract operation | CWL origin | Galaxy `when:` | Inputs | Outputs | Wrapper risk |
| --- | --- | --- | --- | --- | --- | --- |
| `count_submitted_reads_paired` | Count FASTQ records before processing | `count_submitted_reads` → `count_lines.cwl` (`count_lines.py -f <fastq> -n 4`) | `reads_mode == paired` | `paired_reads` (forward element) | scalar count | **High** — `count_lines.py` is custom; Galaxy will likely use a generic FASTQ-stats / wc tool. Different operation surface. |
| `filter_paired` | Trim + QC paired FASTQs with fastp | `filter_paired` → `fastp.cwl` | `reads_mode == paired` | `paired_reads`, `paired_reads_length_filter` | paired collection trimmed, JSON report, (HTML report dropped) | **Low** — Galaxy fastp wrappers exist in Tool Shed. |
| `overlap_reads` | Merge overlapping paired reads with SeqPrep | `overlap_reads` → `seqprep.cwl` | `reads_mode == paired` | trimmed paired collection | merged single-file, unmerged forward, unmerged reverse | **Medium** — search Tool Shed for `seqprep`. Likely exists but needs confirmation. |
| `unzip_merged_reads` | Decompress merged FASTQ | `unzip_merged_reads` → `multiple-gunzip.cwl` | `reads_mode == paired` | merged FASTQ.gz | merged FASTQ | **Low** — generic gzip-extract Galaxy tool. May not be needed at all if downstream consumers accept `.fastq.gz`. **Anti-pattern check**: unzipping just to re-zip downstream is wasted I/O. |
| `unzip_single_reads` | Decompress single FASTQ | `unzip_single_reads` → `multiple-gunzip.cwl` | `reads_mode == single` | `single_reads` | unzipped FASTQ | **Low** — same as above. Same anti-pattern caveat. |
| `count_submitted_reads_single` | Count FASTQ records (single mode) | `count_submitted_reads_single` → `count_lines.cwl` | `reads_mode == single` | decompressed single FASTQ | scalar count | Same as paired counterpart. |
| `pick_output` (synthetic) | Surface a single `processed_reads` Galaxy output from whichever branch ran | CWL `pickValue: first_non_null` at workflow output | always | `unzip_merged_reads/out`, `unzip_single_reads/out` | `processed_reads` | **Medium** — Galaxy idiom: concatenate-collections or a tiny "pick first non-empty" tool. Needs pattern-page anchoring. |
| `pick_count` (synthetic) | Surface a single `submitted_read_count` from whichever count step ran | CWL `pickValue: first_non_null` over counts | always | `count_submitted_reads/out`, `count_submitted_reads_single/out` | `submitted_read_count` | **Medium** — same pattern as `pick_output`. |

## Unresolved Galaxy tool needs

- **fastp** — Galaxy Tool Shed wrapper expected to exist. Per-step authoring: confirm with `discover-shed-tool`.
- **SeqPrep** — uncertain. May need authoring.
- **count_lines.py** — bespoke MGnify script that counts FASTQ records by counting lines/4. Galaxy alternative: a generic count-lines tool, fastp's own read-count statistic, or author a wrapper. Surface to the user as a real tool-discovery question, since the CWL semantics ("4 lines = one read") are exactly what most Galaxy FASTQ-statistics tools already give.
- **gunzip** — generic. Galaxy has multiple. Anti-pattern flag: confirm downstream actually needs uncompressed input before keeping this step at all.
- **pickValue fan-in** — Galaxy has no first-class equivalent. Either use the "concatenate collections" pattern with both branches gated by `when:`, or insert a "pick first non-empty" custom tool. Pattern-page candidate.

## Placeholder transformations / reviewable expressions

- `fastp.cwl#arguments` — InlineJavascript for output naming (`$(inputs.fastq1.nameroot).fastp.fastq`) and presence-of-fastq2 branching. Galaxy fastp wrappers handle this internally; not a translation problem.
- `seqprep.cwl#arguments` — JS expression `inputs.namefile.nameroot.split('_')[0] + '_MERGED.fastq.gz'` derives the merged-output filename from the *forward reads* filename. Galaxy semantics: a paired collection's element identifier is what would seed downstream filenames; ensure the SeqPrep wrapper preserves identifiers.
- `count_lines.cwl#outputs.count` uses `outputEval: $(parseInt(self[0].contents))` to coerce a file into an int. Galaxy alternative: emit the count as a text dataset and parse downstream — straight `int` workflow outputs are unusual.

## Confidence

- **High**: topology decomposition (two branches + fan-in).
- **High**: anti-pattern flags (decompression-before-rezipping; bespoke `count_lines.py` likely replaceable).
- **Medium**: fan-in strategy choice (concat-collections vs synthetic pick-tool); IWC comparison should anchor this.
- **Medium**: SeqPrep wrapper availability.
- **Low**: int workflow output handling — no precedent surveyed yet.

## Open questions

- Is there an IWC paired-FASTQ workflow that uses a similar "both branches feed one output" idiom we can copy?
- Is `unzip_*` actually needed for downstream MGnify steps, or is this a CWL-only quirk? In Galaxy, leaving outputs gzipped is the norm.
- Does any IWC workflow expose a scalar read count as a workflow output? Or is the convention to ship it inside a MultiQC / stats report?

## Non-decisions (deferred downstream)

- gxformat2 skeleton with concrete `when:` clauses, the pick-output choice, and step ordering — `cwl-summary-to-galaxy-template`.
- Exact tool ids / parameters — per-step authoring loop.
- Test data shape — `cwl-test-to-galaxy-test-plan`.
