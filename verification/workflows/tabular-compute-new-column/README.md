# Tabular: compute a new column

Verifies `[[tabular-compute-new-column]]`: `auto_col_types` decides whether a bare `cN` reference is a number or a string.

Both steps run the identical expression `c1 + c2` over the identical input and differ only in `error_handling.auto_col_types`. The input carries a header row, so Galaxy sniffs both columns as `str` — the situation every corpus instance is in. At `true` the references are coerced and `3 + 4` is `7`; at `false` they stay strings and `3 + 4` is `34`.

Neither step errors. The page's strict `auto_col_types` table exists because this is the whole failure mode: a wrong setting changes the arithmetic, not the exit status.
