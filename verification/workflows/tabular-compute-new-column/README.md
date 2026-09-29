# Tabular: compute a new column

The Galaxy fixture checks `[[tabular-compute-new-column]]` by running `c1 + c2` twice over the same headered input. With numeric input column metadata, `auto_col_types: true` uses numeric values and the expected totals are `7` and `30`. With `auto_col_types: false`, the wrapper supplies string column types and the expected values are `34` and `1020`.

The header is handled separately by `ops.header_lines_select: "yes"`. A header does not establish that Galaxy's column metadata is string-valued. `auto_col_types` uses the recorded metadata when enabled. It does not infer the types needed by an expression or turn string metadata into numeric types.

The workflow and expected-output assertions remain the Galaxy-level check. A successful job alone cannot distinguish addition from concatenation.

## Source and script check, 2026-09-28

The unmodified [version 2.1 implementation](https://github.com/galaxyproject/tools-iuc/blob/06a92568f3409b035fd8a08725db20933d8d15e6/tools/column_maker/column_maker.py) was exercised directly with Python 3.13.12 and NumPy 2.5.1:

- Supplying `int,int` and `str,str` column types reproduced both committed expected-output files exactly.
- A string-input step using explicit numeric casts produced numeric columns that a subsequent expression could use.
- Column replacement updated the header as well as the data.
- Invalid numeric conversion failed, and strict missing-column failure remained effective with the keep-non-computable policy.

These checks cover script behavior with supplied column types. They do not rerun Galaxy or verify how Galaxy infers metadata for this input.
