# Tabular: concatenate a collection to one table

This fixture checks `[[tabular-concatenate-collection-to-table]]` with two list collections. The first has headered tables and verifies that `one_header: true` keeps one header, prefixes it with `Sample`, and uses `same_multiple` to repeat each element identifier on every data row. The second has headerless tables and verifies that disabling both switches keeps every data row without adding identifiers. The output files assert exact content and row order.

Both steps use the IWC-observed `collapse_dataset/5.1.0` pin and its Tool Shed changeset. The inputs and expected outputs are committed alongside the workflow. On 2026-09-30, Planemo 0.75.44 ran this test against Galaxy `release_25.1` and both output comparisons passed.

Run from this directory with:

```sh
gxwf validate concatenate-collection.gxwf.yml
gxwf validate-tests concatenate-collection.gxwf-test.yml
planemo test concatenate-collection.gxwf.yml --galaxy_branch release_25.1
```
