# Collection: flatten after fan-out

Verifies `[[collection-flatten-after-fanout]]`: `__FLATTEN__` collapses a `list:list` into a flat `list`.

The pattern page said only that element identifiers "may retain hints" after flattening. That is the part a reader has to guess at, so the test asserts it exactly: the output element identifiers are the outer and inner identifiers joined by `join_identifier`, and the flattened collection type is `list`.

The second step runs the same flatten with `join_identifier: "-"` so the separator is shown to be the authored choice rather than a fixed `_`.

The input is deliberately ragged — `sampleA` has two elements, `sampleB` has one — so a flatten that silently required a rectangular `list:list` would fail here.
