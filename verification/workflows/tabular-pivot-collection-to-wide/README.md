# Tabular: pivot collection to wide

This fixture checks `[[tabular-pivot-collection-to-wide]]` with two list collections. In each, `alpha` and `beta` contain different sets of keys. The first step joins headerless two-column tables with `fill_char: "0"`, checking `#KEY` and element-plus-column headers. The second joins headered tables with `fill_char: "."`, checking original key header and element-only value headers. Both expected files assert the union of keys, fill values, values in the correct element columns, and output row order.

The workflow pins the IWC-observed `collection_column_join/0.0.3` Tool Shed changeset. Inputs and expected outputs are committed alongside it. On 2026-09-30, Planemo 0.75.44 ran this test against Galaxy `release_25.1` and both output comparisons passed.

Run from this directory with:

```sh
gxwf validate pivot-collection.gxwf.yml
gxwf validate-tests pivot-collection.gxwf-test.yml
planemo test pivot-collection.gxwf.yml --galaxy_branch release_25.1
```
