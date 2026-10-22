# Collection: cleanup after map-over failure

Verifies `[[collection-cleanup-after-mapover-failure]]` for `__FILTER_EMPTY_DATASETS__` 1.1.0: a mapped step leaves one element empty, the drop form removes that identifier, the replacement form keeps it with the sentinel's contents, and a header-only result is not empty.

`search_hits` maps `Grep1` with pattern `hit$` over three tabular samples. `sampleA` and `sampleC` have matching rows. `sampleB` has none, so its output is zero bytes. `Grep1` exits 1 when nothing matches, and its wrapper declares only exit codes of 2 or more, as warnings, so `sampleB` finishes in the `ok` state. The test asserts the zero size before any filter runs, so the filter assertions cannot pass on an input that was never empty.

- `drop_empty` asserts two elements, `sampleA` and `sampleC`, each by file. Keeping `sampleB` would change the count.
- `replace_empty` connects `sentinel` as `replacement` and asserts three elements. `sampleB` must match the sentinel file, and `sampleA` and `sampleC` keep their search results, so a replacement that renamed, reordered, or overwrote good elements would fail.
- `drop_empty_with_header` runs the same search with `keep_header: true`, so `sampleB` holds only the `read status` header. The test asserts that all three elements survive and that `sampleB` is the header line. This is the page's claim that Filter Empty tests bytes, not rows.

`__FILTER_FAILED_DATASETS__` is not exercised. Planemo reports a workflow test as an error whenever the history holds an errored dataset, so a deliberately failing mapped job cannot produce a passing test. Galaxy's API test `test_filter_failed_mapping` covers that tool with the test-only `exit_code_from_file` tool.

Run from this directory:

```sh
gxwf validate cleanup-empty-after-mapover.gxwf.yml
gxwf validate-tests cleanup-empty-after-mapover.gxwf-test.yml
planemo test cleanup-empty-after-mapover.gxwf.yml --galaxy_branch release_26.1
```
