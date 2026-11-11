# discover-shed-tool scenarios

## Case: fastqc need substituted by falco

- fixture: step need `quality control for FASTQ reads using FastQC`
- expect: `hit` with `iuc~falco~falco` as `candidate`, pinned to a version and
  changeset, never `mhh-hematology/falcoamadeus`. `warnings` carries
  `efficient-substitution`, and `alternates` carries the resolved
  `devteam~fastqc~fastqc` pin.

## Case: fastqc need with bz2 input keeps fastqc

- fixture: step need `quality control for fastq.bz2 reads using FastQC`
- expect: `hit` with `devteam~fastqc~fastqc` as `candidate` and no
  `efficient-substitution` warning. `rationale` names the `fastq.bz2` opt-out.

## Case: STAR index need

- fixture: step need `build a STAR genome index (STAR --runMode genomeGenerate)
  for the aligner steps`.
- expect: `hit` or `weak` with `iuc/rgrnastar/rna_star` as `candidate`, never
  `miss`. `rna_starsolo`, which outranks it in search, may be an alternate. The
  index-builder data manager is admin-only and writes a tool data table, so it
  isn't the candidate.
