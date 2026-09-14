# Collection: swap nesting with Apply Rules

Verifies `[[collection-swap-nesting-with-apply-rules]]`: `__APPLY_RULES__` turns a `list:list` keyed `sample -> segment` into a `list:list` keyed `segment -> sample`.

The pattern page carried a *conceptual* rules block with the caveat "Treat this as the logical shape, not a complete serialized workflow API blob" — which left the reader with nothing runnable. This fixture is that missing blob: the `rules` parameter nests a `rules:` list and a `mapping:` list, and `list_identifiers` takes `columns`, not a bare array.

The input is a full 2x2 grid and every one of the four leaf datasets is asserted by content in its transposed position. A mapping that silently kept the original axis order, or that transposed identifiers without moving the datasets underneath them, fails here rather than passing on element names alone.
