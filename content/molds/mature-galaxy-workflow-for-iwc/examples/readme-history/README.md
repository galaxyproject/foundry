# Nanopore DNA variant calling

This workflow maps Oxford Nanopore DNA reads to a reference genome and calls diploid small variants with Clair3.

## Inputs

- `Nanopore reads`: a list collection of gzipped FASTQ files, one per sample.
- `Reference genome`: one FASTA file shared by all samples.

## Why Clair3 instead of medaka

The source pipeline calls variants with medaka. The current Galaxy medaka wrappers make haploid calls, so this workflow uses Clair3 for diploid genotypes.

## Testing

The bundled test passed on usegalaxy.org (invocation `4ae2da923366f120`). An earlier version of the workflow had also passed there (invocation `fbf1b200b6a8b01c`).

<details>
<summary>History</summary>

- Local Planemo on arm64 macOS: NanoPlot failed when its amd64 container ran under emulation.
- The legacy medaka 1.4.4 wrapper failed on usegalaxy.org (invocation `cf5318de2072ffe4`), which is why the workflow switched to Clair3.

</details>

## Notes for reviewers

- `gxwf validate` reports `null` optional inputs as tool-state errors; this is a known validator false positive.
