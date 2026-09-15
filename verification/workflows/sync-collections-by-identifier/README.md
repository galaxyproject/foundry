# Collection: sync collections by identifier

Verifies `[[sync-collections-by-identifier]]`: identifiers extracted from a cleaned collection filter a sibling
to the same element set, and the relabel variant on the same path.

The page's `tool_state` shapes for `collection_element_identifiers` and `__FILTER_FROM_FILE__` were already
right; this fixture runs them rather than correcting them. What it settles is the pitfall the page left hedged —
"identifier sync is not necessarily order sync."

It is not. The identifier file lists `s1` then `s3`; the sibling holds `s3`, `s2`, `s1` in that order. The
filtered output is asserted to start at `s3`, via an `__EXTRACT_DATASET__` step in `by_index` mode, because
`FilterFromFileTool.produce_outputs` walks `hdca.collection.elements` and consults the file only as a membership
set. Filtering preserves the *input collection's* relative order and ignores the file's order entirely. Use
`[[harmonize-by-sortlist-from-identifiers]]` when order is the thing that has to match.

`output_discarded` is asserted alongside `output_filtered` so the page's "wire downstream steps to
`output_filtered`" has a fixture showing what the other terminal holds.

`relabel_sibling` covers `__RELABEL_FROM_FILE__` in `how_select: txt` mode, which the page described only as
"a connected labels file and non-strict relabeling." That mode is strictly **positional**: `RelabelFromFileTool`
indexes `new_labels[i]` against the i-th element and never looks at the old identifier. The sibling's `s3`, `s2`,
`s1` become `one`, `two`, `three` in that order, and the datasets ride along underneath — which is why the
assertion pairs each new label with the old element's content.

The labels file deliberately carries a fourth line. Only *fewer* lines than elements is an error; a longer file
passes and the surplus is dropped. That is the concrete form of the page's "relabeling can hide mismatches when
strict checks are off" — with `strict: false` the count is never checked upward, so a labels file that has
drifted out of sync with the collection relabels silently and by position.

`kept_ids` is asserted against a baseline to pin the identifier file format: one identifier per line, no header,
collection order.
