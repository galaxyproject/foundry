# Tabular: group and aggregate with Datamash

This fixture exercises the construction in `[[tabular-group-and-aggregate-with-datamash]]`. The headered input alternates keys A and B, so the grouped step needs `need_sort: true`. Its expected output checks each key, distinct-value count, numeric minimum and maximum, collapsed tag values, and generated headers. The second step leaves `grouping` empty and checks a whole-file `absmax` of -7, with no output header. The operation selects the value with the largest absolute magnitude while retaining its sign.

Both steps use the IWC-observed `1.9+galaxy0` Datamash pin and its Tool Shed changeset. The expected files are byte-scale and committed beside the workflow. A successful run must match the output contents, not just produce two nonempty files. On 2026-09-29, Planemo 0.75.44 ran this test against Galaxy `release_25.1` and both output comparisons passed.

Run from this directory with:

```sh
gxwf validate group-and-aggregate.gxwf.yml
gxwf validate-tests group-and-aggregate.gxwf-test.yml
planemo test group-and-aggregate.gxwf.yml --galaxy_branch release_25.1
```
