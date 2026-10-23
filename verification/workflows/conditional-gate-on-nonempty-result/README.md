# Conditional gate on non-empty result

Verifies `[[conditional-gate-on-nonempty-result]]`. The workflow builds both booleans the page describes and gates two steps on each one:

- `has_elements` counts the element identifiers of the `results` collection, the shape MGnify uses. `report_identifiers` runs when it is true, and `note_no_elements` runs on `$(!inputs.when)`.
- `table_has_content` reads the `table` dataset as text and maps `""` to `false`, the shape VGP Hi-C uses. `report_table` runs when it is true, and `count_table_lines` runs on the negation.

`collection_branch` and `table_branch` pass each pair of gated outputs through `pick_value` with `pick_style: only`. That style errors when both inputs are non-null or both are null. A passing test therefore shows that exactly one step of each pair ran, and the branch file shows which one.

## Cases

1. A one-element collection and a one-line table. Both booleans are `true`, and the branch outputs equal the identifier file and the table.
2. An empty collection and a zero-byte table. Both booleans are `false`. `collection_branch` is the `count_to_boolean_table` output, exactly `False` and a newline. `table_branch` is the line count `0`.
3. A collection whose only element is a zero-byte dataset, and a table holding only a newline. `has_elements` is `true` because the shim counts elements, not their contents. `table_has_content` is `false` because `param_value_from_file` trims whitespace before the mapping. `table_branch` is the line count `1`, which shows the negated step read the newline file.

The tests assert the `true` booleans directly. Planemo does not report a workflow output whose boolean is `false`, so a `false` assertion fails with "Expected output ... not found in results". The cases assert the negated step's output instead. Rechecked under Galaxy `release_26.1` and Planemo 0.75.44 on 2026-10-23.

## Rejected shorter routes

- **A collection connected straight to `when`.** Rechecked on 2026-10-23 under `release_26.1` with `when: $(inputs.when.length > 0)` and the negated expression `$(inputs.when.length == 0)`. Galaxy mapped each gated step over the connected collection. For a one-element list, each step's output became a one-element collection whose only job was skipped, and Galaxy logged "Failed to use input connections for inputs [{'when'}]". For an empty list, neither step ran a job. Because `length > 0` was false for a one-element list, the expression did not see the list as an array. The May 2026 run used `$(inputs.when)` under `release_25.1` and failed with `when_not_boolean` and `Type is: HistoryDatasetAssociation`, which fits the same per-element mapping.
- **An embedded CWL `ExpressionTool` returning a boolean from `File[]`.** Rechecked on 2026-10-23. `gxwf validate` from `@galaxy-tool-util/cli` 1.14.0 accepts the structure, but gxformat2 0.28.0 lint rejects the embedded `run:` block with "Input should be 'GalaxyWorkflow' at class". Not run under Planemo. In May 2026, gxformat2 0.21.0 rejected it the same way.

Run from this directory:

```sh
npx -y -p @galaxy-tool-util/cli@1.14.0 gxwf validate gate-on-nonempty.gxwf.yml
npx -y -p @galaxy-tool-util/cli@1.14.0 gxwf validate-tests gate-on-nonempty.gxwf-test.yml --workflow gate-on-nonempty.gxwf.yml
planemo test gate-on-nonempty.gxwf.yml --galaxy_branch release_26.1
```
