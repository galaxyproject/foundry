# Collection: harmonize by sortlist from identifiers

Verifies `[[harmonize-by-sortlist-from-identifiers]]`: the identifier file that `collection_element_identifiers`
emits drives `__SORTLIST__` in `sort_type: file` mode, and the sibling collection comes out in the reference's
order.

The pattern page documented the sort step with a flat `tool_state`:

```yaml
tool_state:
  input: { __class__: ConnectedValue }
  sort_type: file
  sort_file: { __class__: ConnectedValue }
```

`sort_type` is a conditional whose select is also named `sort_type`, and `sort_file` lives inside its
`when value="file"`. The runnable shape nests them, and the connection address is `sort_type|sort_file` — which
is what the one corpus instance (`virology/pox-virus-amplicon/pox-virus-half-genome`) serializes.

Order is asserted, not inferred. A collection output's `element_tests` are keyed by identifier and say nothing
about position, so two `__EXTRACT_DATASET__` steps in `by_index` mode pull position 0 and position 2 out as
plain datasets. `harmonized_first` is the sibling's `s3` and `harmonized_last` is its `s2`, which is the
reference order and not the sibling's own.

The page's pitfall said to "treat `sort_type: file` as reorder-plus-intersect unless you have verified behavior
for missing identifiers." It is not a filter. `SortTool.produce_outputs` compares the file's `data_lines`
against the element count and raises `Number of lines must match number of list elements` when they differ;
a line naming an identifier the collection does not have raises `List of element identifiers does not match
element identifiers in collection`. Both are job failures, so a short or mismatched list cannot silently drop
elements. The passing assertion here pins the other half — all three elements survive the reorder.

The error branches are read from `SortTool` on `release_25.1` rather than exercised: a failing invocation is not
something a green Planemo test can assert.

`order_file` is asserted against a three-line baseline, which also pins what
`[[sync-collections-by-identifier]]` claims about the same tool — one identifier per line, no header, in
collection order.
