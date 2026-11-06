# repair-galaxy-draft-topology scenarios

## Case: wrapper has no port for a public output

- fixture: `examples/fastqc-zip-no-port/galaxy-workflow-draft.gxwf.yml` and
  `open-requirements.ledger.yml` beside it.
- expect: `nf-core-demo-fastqc-zip-wrapper-output` ends `resolved`. Either an
  `add-step` at draft tier with `fastqc_zip_archives` retargeted to it, or the
  public output removed with a `kind: dropped` entry quoting the wrapper's ports.
  `text_file` is never bound as a ZIP. Other steps' `tool_id`, `tool_version` and
  edges are unchanged.

## Case: repaired draft re-enters the loop

- fixture: `examples/fastqc-zip-no-port/repaired.gxwf.yml`
- command: `gxwf draft-next-step repaired.gxwf.yml`
- expect: `draft: true`; `step` equals `["fastqc_archive_per_read"]`.

## Case: repair removes the last drafty step

- fixture: `examples/sample-sheet-restore-last-drafty/galaxy-workflow-draft.gxwf.yml`
  and `open-requirements.ledger.yml` beside it.
- expect: `nf-core-demo-trimmed-reads-metadata-carry-forward` ends `resolved`, and
  open blocking entries fall from 2 to 1. `restore_trimmed_sample_sheet_metadata`
  is gone, `trimmed_reads` is retargeted, and neither its id nor its label is left
  anywhere, including the comment frame. A `kind: dropped` entry quotes the
  searches or the collection semantics rule, not the blocking entry.
  `gxwf draft-next-step` reports `draft: false`. Driven through
  [[advance-galaxy-draft-step]], `galaxy-workflow.gxwf.yml` is written in the same
  call.

## Case: confirmed-absent wrapper

- fixture: `examples/dupradar-wrapper-absent/galaxy-workflow-draft.gxwf.yml` and
  `open-requirements.ledger.yml` beside it.
- expect: no new search runs. `dupradar-wrapper-absent` ends `resolved`. Step
  `M19_dupradar`, input `P4_dupradar_strandedness_param`, MultiQC edge
  `TODO_dupradar`, the frame entry and every mention in `doc` and `_plan_*` are
  gone. `M18_markdup`'s `TODO_bam` port goes too, because only `M19_dupradar` read
  it. A `kind: dropped` entry quotes the searches as its `because`. `multiqc_report`
  still has its source. `gxwf draft-validate` exits 0.

## Case: value must vary per run

- fixture: `examples/star-sa-index-input/galaxy-workflow-draft.gxwf.yml` and
  `open-requirements.ledger.yml` beside it.
- expect: `star-genome-sa-index-unreachable` ends `resolved`. One new integer input
  defaulting to 14, wired to `refGenomeSource|genomeSAindexNbases` on both STAR
  steps with the literal gone from both `state` blocks. No other input, output,
  step or edge changes. `gxwf draft-next-step` still reports `draft: false`.
