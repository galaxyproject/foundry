# Prepend or replace a tabular header

This gxformat2 fixture exercises both branches of `[[tabular-prepend-header]]`. The first step prepends a fixed metric header and preserves headerless rows. The second replaces an incoming header, appends `.fasta` only where missing, and writes three tab-separated fields. The Planemo test compares both complete outputs to committed expected files, including the first line and all data rows.

The pins and Tool Shed changesets come from the pinned IWC [VGP purge-duplicates](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/VGP-assembly-v2/Purge-duplicates-one-haplotype-VGP6b/Purging-duplicates-one-haplotype-VGP6b.ga) and [MAGs generation](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/microbiome/mags-building/MAGs-generation.ga) workflows. The [awk wrapper](https://github.com/bgruening/galaxytools/blob/da30fe3911619a10dc5f6b8840214e0011e1833d/tools/text_processing/text_processing/awk.xml) declares `infile`, `code`, `variables`, and `outfile`.

Run from this directory:

```sh
gxwf validate prepend-header.gxwf.yml
gxwf validate-tests prepend-header.gxwf-test.yml
planemo test prepend-header.gxwf.yml --galaxy_branch release_25.1
```

On 2026-09-30, Planemo tested this fixture against Galaxy `release_25.1`. The one workflow test passed both full-output comparisons.
