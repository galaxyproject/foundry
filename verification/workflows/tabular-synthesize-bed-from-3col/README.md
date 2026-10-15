# Three-column intervals to BED

This fixture exercises both strand programs from the pinned IWC [MGnify rRNA prediction workflow](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.ga). The inputs represent one-based inclusive intervals. The expected BED files check exact starts, unchanged ends, constant names and scores, strand, and tab separators. Two one-base intervals make off-by-one errors visible.

The workflow retains the pinned tool version `9.5+galaxy0` and Tool Shed changeset `3dc70b59608c`. The IWC workflow has four awk steps, one for each SSU/LSU and strand combination. This fixture uses one step per strand because the conversion is identical for both targets.

Run from this directory:

```sh
gxwf validate synthesize-bed.gxwf.yml
gxwf validate-tests synthesize-bed.gxwf-test.yml
planemo test synthesize-bed.gxwf.yml --galaxy_branch release_25.1
```

The two `gxwf` commands check the workflow and test declarations. Planemo runs the workflow and checks the complete output files. This fixture assumes the input coordinate convention described above. It does not prove that an arbitrary upstream table follows that convention.

On 2026-10-04, both `gxwf` commands passed and direct execution of the two workflow awk programs matched their complete expected files. Planemo could not start a Galaxy server in this sandbox because binding a local port was denied, so Galaxy execution remains unverified.
