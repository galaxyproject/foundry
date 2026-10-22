# Collection: relabel via rules and find/replace

Verifies `[[relabel-via-rules-and-find-replace]]`: to clean the inner identifiers of a `list:list`, swap that level
to the top with `__APPLY_RULES__`, relabel it from an `old<TAB>new` table, and swap back.

The chain follows the influenza exemplar (IWC `deafc48`, steps 34–39). There, `bamtools_split_ref` names each
per-reference BAM `<input dataset name>: <reference>`, and every sample's input BAM is named
`Final read mapping results`, so each sample's inner identifiers carry the same prefix. The input here stands in
for that output with a shorter prefix: `sampleA` and `sampleB`, each holding `mapped: HA` and `mapped: NA`. The four
leaf files have distinct contents.

`__RELABEL_FROM_FILE__` renames only top-level elements, so the workflow:

1. `swap_to_segment` swaps the axes, making `mapped: HA` and `mapped: NA` the outer identifiers.
2. `identifiers_per_segment` runs `collection_element_identifiers`, which accepts `list` or `list:paired`, on the
   `list:list`. Galaxy maps it over the outer level and produces a `list` of per-segment files.
   `segment_identifiers` lists that list's identifiers, which are the outer identifiers, and sets
   `change_datatype: tabular`.
3. `build_mapping` turns each line into `old<TAB>new` with `^(mapped: (.+))$` → `$1\t$2`.
4. `relabel_segments` applies the table in `tabular` mode.
5. `swap_back` restores `sample -> segment`.

Each assertion fails on a different mistake:

- `mapping` is a two-row baseline whose rows are segments, not samples. The first extraction alone yields
  per-segment lists of samples, not a list of segments.
- `segment_by_sample` must have outer identifiers `HA` and `NA`, with each sample's file under each. This shows the
  relabel renamed the swapped outer level and carried the inner collections with it.
- `relabeled` must be `sampleA -> {HA, NA}` and `sampleB -> {HA, NA}`, each leaf asserted by content. A swap that
  moved identifiers without their datasets, or a relabel that crossed segments, fails here.

`relabel_in_place` is the one-step alternative the page describes. It does not appear in IWC. One `__APPLY_RULES__`
step adds `identifier0` and `identifier1`, rewrites `identifier1` with an `add_column_regex` `replacement`, and maps
columns `[0, 2]`. Its output is asserted against the same expected `list:list` as `relabeled`. The page's two
cautions about this form come from source and are not exercised: `_build_elements_from_rule_data` in
`galaxy/managers/collections.py` assigns each leaf into a dict by identifier, so a colliding identifier replaces the
earlier dataset, and no step checks identifier characters.

The failure cases the page names are read from source instead of exercised, because a failed job cannot pass a
Planemo test. `RelabelFromFileTool` raises `appears twice in resulting collection` for a collision and
`Invalid new collection identifier` for a label outside `^[\w\- \.,]+$`. The `tp_find_and_replace` table format,
`strict`, and lookup-by-name behavior are verified by `[[regex-relabel-via-tabular]]`'s fixture and are not repeated
here.

Tool versions match that fixture: `collection_element_identifiers` 0.0.3 and `tp_find_and_replace` 9.5+galaxy3. The
influenza workflow pins `collection_element_identifiers` 0.0.2 and also sets `change_datatype: tabular` on the
first extraction, whose output only feeds the second.

Run `gxwf validate relabel-via-rules-and-find-replace.gxwf.yml`,
`gxwf validate-tests relabel-via-rules-and-find-replace.gxwf-test.yml`, and
`planemo test relabel-via-rules-and-find-replace.gxwf.yml --galaxy_branch release_26.1` from this directory.
