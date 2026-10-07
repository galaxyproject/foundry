# Tabular rows to a collection by key

This fixture checks the grouping behavior of `split_file_to_collection/0.5.2` in tabular column mode. The input has a header and three data rows, with `alpha` appearing twice. The expected collection has two elements: `alpha` contains both matching rows and the copied header, while `beta` contains its row and the header. Exact file assertions detect lost, duplicated, or reordered rows as well as incorrect header handling.

The tool ID, Tool Shed changeset, nested state, connection, and output name follow the pinned [IWC SRA manifest workflow](https://github.com/galaxyproject/iwc/blob/b80bc92780089b54773f558c224a27b38baa8a06/workflows/data-fetching/sra-manifest-to-concatenated-fastqs/sra-manifest-to-concatenated-fastqs.ga).

Run from this directory:

```sh
gxwf validate split-by-key.gxwf.yml
gxwf validate-tests split-by-key.gxwf-test.yml
planemo test split-by-key.gxwf.yml --galaxy_branch release_25.1 --no_dependency_resolution --no_install_resolver_dependencies
```

The pinned wrapper declares a Python 3.5 dependency that current Conda could not install in the test environment. The Planemo command uses the host Python runtime instead. The workflow ran and all collection element assertions passed on Galaxy `release_25.1`.
