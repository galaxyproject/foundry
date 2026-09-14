# Tabular: filter rows by column value

Verifies `[[tabular-filter-by-column-value]]`: `Filter1` keeps rows whose Python predicate over `cN` column references evaluates true.

Both steps run the identical predicate `c2=='PASS'` over the identical input and differ only in `header_lines`. That isolates the page's first pitfall — forgetting `header_lines` — as a difference in output rather than an argument: at `"1"` the header passes through untouched, at the default `"0"` it is evaluated like a data row, fails the predicate, and disappears with no error anywhere in the data flow.

The predicate is a string comparison on both sides so the result does not depend on how Galaxy sniffs column types for a file whose first row is a header.
