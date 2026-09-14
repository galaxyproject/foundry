# Comparison against the nearest IWC exemplar

Nearest exemplar: `sequence-analysis/fastq-quality-control/fastq-quality-control`.

## Agrees with the exemplar

- Single promoted HTML report output rather than one output per sample.
- Human-readable input and output labels.
- Tool versions pinned with a `+galaxyN` revision suffix.

## Diverges from the exemplar

- The exemplar takes a paired collection input; this workflow takes a single
  dataset, so per-sample aggregation is not exercised.
- The exemplar carries an adapter-trimming step ahead of QC. This workflow does
  not, which is the divergence the ledger records as `adapter-trimming-dropped`.
