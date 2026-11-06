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

## Case: the last drafty step, on evidence that doesn't settle it

- fixture: `examples/sample-sheet-restore-last-drafty/galaxy-workflow-draft.gxwf.yml`
  and `open-requirements.ledger.yml` beside it.
- expect: the entry's Tool Shed searches and cache miss don't carry a removal, and
  later runs realized this step with an authored wrapper. Either outcome passes:
  - Removed, with a `kind: dropped` entry from this repair quoting a collection
    semantics rule such as `SAMPLE_SHEET_MAPPING`, and recording the `sample` metadata
    as narrowed. `nf-core-demo-trimmed-reads-metadata-carry-forward` ends `resolved`,
    and open blocking entries fall from their starting 2.
    `restore_trimmed_sample_sheet_metadata` is gone, `trimmed_reads` is retargeted, and
    neither the id nor the label is left anywhere in the draft, including the comment
    frame. `trimmed_reads`'s `doc` no longer promises the original sample metadata.
    `gxwf draft-next-step` reports `draft: false`.
  - The step stays, and the entry stays `open` with a note saying what's unproven.

  A removal whose `because` rests on the searches or the cache miss fails.

## Case: a cache miss doesn't justify a removal

- fixture: `examples/dupradar-wrapper-absent/galaxy-workflow-draft.gxwf.yml` with
  `examples/dupradar-cache-miss-only/open-requirements.ledger.yml`.
- expect: `M19_dupradar` stays, with every edge and input it reads. `dupradar-unpinned`
  stays `open` with a note saying what's unproven. No `kind: dropped` entry is added.

## Case: confirmed-absent wrapper

- fixture: `examples/dupradar-wrapper-absent/galaxy-workflow-draft.gxwf.yml` and
  `open-requirements.ledger.yml` beside it.
- expect: no new search runs. `dupradar-wrapper-absent` ends `resolved`. Step
  `M19_dupradar`, MultiQC edge `TODO_dupradar`, the frame entry and every mention
  in `doc` and `_plan_*` are gone. Inputs `P4_dupradar_strandedness_param` and
  `annotation` and `M18_markdup`'s `TODO_bam` port go too, because only
  `M19_dupradar` read them. A `kind: dropped` entry quotes the searches as its `because`. `multiqc_report`
  still has its source. `gxwf draft-validate` exits 0.

## Case: value must vary per run

- fixture: `examples/star-sa-index-input/galaxy-workflow-draft.gxwf.yml` and
  `open-requirements.ledger.yml` beside it.
- expect: `star-genome-sa-index-unreachable` ends `resolved`. One new integer input
  defaulting to 14, wired to `refGenomeSource|genomeSAindexNbases` on both STAR
  steps with the literal gone from both `state` blocks. No other input, output,
  step or edge changes. `gxwf draft-validate --concrete --strict-state` exits 0.
  `gxwf draft-next-step` still reports `draft: false`.
