# Split a prefixed taxonomy string

This fixture checks the one-step `[[tabular-split-taxonomy-string]]` recipe. The input has two non-data lines, reordered ranks, and absent interior ranks. The Planemo test compares the complete tabular output, including its header and empty fields.

The tool pin and changeset come from the pinned IWC [MAPseq to ampvis2 workflow](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/amplicon/amplicon-mgnify/mapseq-to-ampvis2/mapseq-to-ampvis2.ga). This fixture combines its rank split and a later header step into one awk program.

Run from this directory:

```sh
gxwf validate split-taxonomy.gxwf.yml
gxwf validate-tests split-taxonomy.gxwf-test.yml
planemo test split-taxonomy.gxwf.yml --galaxy_branch release_25.1
```

On 2026-10-01, Planemo ran this fixture against Galaxy `release_25.1`. Its one workflow test passed the exact-output comparison.
