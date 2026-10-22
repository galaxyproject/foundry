# Cleanup, sync, and publish non-empty results

Verifies `[[cleanup-sync-and-publish-nonempty-results]]` as one chain: Filter Empty drops a sample with no hits, identifiers from the cleaned collection filter a sibling, a linked map-over pairs the two, and a non-empty gate decides whether a report runs. The leaf behaviors have their own fixtures (`collection-cleanup-after-mapover-failure`, `sync-collections-by-identifier`, `conditional-gate-on-nonempty-result`). This one checks the handoffs between them.

`search_hits` maps `Grep1` with pattern `hit$` over `samples`. `sequences` holds one file per sample under the same identifiers, in the same order, with contents unique to each sample.

## Case 1: `sampleB` has no hits

- `kept_ids` equals `sampleA` and `sampleC`, so the identifier file is read from the cleaned collection. An identifier file read from `search_hits` or `samples` would list `sampleB` too.
- `synced` has two elements, each matching its own sequence file. Syncing from the wrong identifiers would leave three.
- `paired` maps `cat1` over `drop_empty` and `synced` together. Each element must be that sample's hit row followed by that sample's sequence, so a sibling that was out of step would fail by content. Without the sync, the lengths differ and Galaxy refuses to schedule the step. That branch is read from `compatible_shape` in Galaxy's `structure.py`, not exercised.
- `report_ids` equals the same two names, so the gate counts the collection the report reads.
- `has_results` is `true`, and `report` must match the concatenated rows of both samples, prefixed by sample name, so the gated reduction ran on the paired collection.

## Case 2: no sample has hits

- `kept_ids` and `report_ids` are zero bytes, which proves the cleaned and paired collections are empty. The test does not assert `element_count: 0`, because Galaxy's collection check skips a count of zero.
- `no_results_note` is gated on `$(!inputs.when)` and must contain `False`, as in the gate fixture. Planemo does not expose a `false` boolean output, and the skipped `report` output is not asserted.

Filter Failed is not exercised, because an errored dataset fails a Planemo test.

Run from this directory:

```sh
gxwf validate cleanup-sync-publish.gxwf.yml
gxwf validate-tests cleanup-sync-publish.gxwf-test.yml
planemo test cleanup-sync-publish.gxwf.yml --galaxy_branch release_26.1
```
