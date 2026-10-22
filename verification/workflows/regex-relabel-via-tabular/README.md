# Collection: regex relabel via tabular

Verifies `[[regex-relabel-via-tabular]]`: a `tp_find_and_replace` regex turns each extracted identifier into an
`old<TAB>new` row, and `__RELABEL_FROM_FILE__` in `how_select: tabular` mode applies that table by name.

The chain follows the influenza exemplar (IWC `deafc48`, steps 35–38). `collection_element_identifiers` lists the
identifiers of `reads` and sets `change_datatype: tabular`, because that wrapper declares a `txt` output while the
relabel tool's tabular modes accept only `tabular` labels. `tp_find_and_replace` takes its output datatype from its
input, so the mapping it writes stays `tabular`. The regex `^((.+)\.fastq)$` → `$1\t$2` keeps the whole identifier
as column 1 and the captured stem as column 2. `mapping` is asserted against a three-row baseline to pin that
format.

The table is applied to a sibling, `reports`, as the SRA exemplar applies one table to two `fasterq_dump`
collections. The sibling differs from the source in three ways, and each one has an assertion:

- **Order.** `reports` lists `gamma.fastq` first, while the table lists `alpha.fastq` first. The relabeled `gamma`
  and `alpha` must still hold the `gamma` and `alpha` report contents, so a positional relabel fails the test.
  `relabeled_first`, extracted with `__EXTRACT_DATASET__` `by_index: 0`, must be the `gamma` report, which shows
  the output keeps the input collection's order rather than the table's.
- **An element missing from the table.** `delta.fastq` has no row. With `strict: false`, `RelabelFromFileTool`
  falls back to the original identifier, so the element survives as `delta.fastq`.
- **A row missing from the collection.** `beta.fastq` has a row but no element. The tool only looks up the
  collection's own identifiers, so the extra row has no effect and `element_count` stays 3.

`strict: true` would fail this job. The table has three rows for three elements, so the count check passes, but
the lookup for `delta.fastq` then raises `Failed to find original identifier`. A failing job cannot pass
a Planemo test (see the verification README), so the strict errors are read from `RelabelFromFileTool` on
`release_26.1` and the wrapper's own `expect_failure` tests rather than exercised here.

The `txt` positional mode is already covered by `[[sync-collections-by-identifier]]`'s fixture and is not repeated.

Run `gxwf validate regex-relabel-via-tabular.gxwf.yml`, `gxwf validate-tests regex-relabel-via-tabular.gxwf-test.yml`,
and `planemo test regex-relabel-via-tabular.gxwf.yml --galaxy_branch release_26.1` from this directory.
