# discover-shed-tool scenarios

## Case: fastqc exact hit

- fixture: step need `quality control for FASTQ reads using FastQC`
- expect: recommends an installable FastQC Tool Shed wrapper with owner, repo,
  tool id, version, and changeset revision.

## Case: STAR index need

- fixture: step need `build a STAR genome index for the aligner steps`, with
  source executable `STAR --runMode genomeGenerate`.
- expect: `hit` or `weak` with `iuc/rgrnastar/rna_star` as `candidate`, never
  `miss`. The rationale may say the wrapper has no index output. The index-builder
  data manager isn't a workflow step, so it isn't the candidate.
