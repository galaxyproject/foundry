# Tabular: cut and reorder columns

Verifies `[[tabular-cut-and-reorder-columns]]`: `Cut1` emits columns in `columnList` order, and a `delimiter` that does not match the input fails silently.

Both steps read the identical tab-separated input. `reorder` asks for `c3,c1` and gets the score column before the name column — output order is list order, not input order. `comma_delimiter` asks for `c1,c2` with `delimiter: C` on tab-separated data: each line splits into a single field, so `c1` echoes the whole row and `c2` becomes the wrapper's `.` fill. No error, no warning.

The fixture opens with a `#` line. It is absent from both outputs: the wrapper skips comment lines before splitting, so a `#`-prefixed header disappears rather than being cut like a data row.
