# Collection: build list:paired with Apply Rules

Verifies `[[collection-build-list-paired-with-apply-rules]]`: one `__APPLY_RULES__` step turns a flat `list` with identifiers such as `sampleA_R1` and `sampleA_R2` into a `list:paired` keyed by sample, with `R1` in `forward` and `R2` in `reverse`.

The rule set is the serialized shape the page documents. The regex appends the sample name as column 1 and the `R1`/`R2` token as column 2. The mapping sends column 1 to `list_identifiers` and column 2 to `paired_identifier`. Galaxy lowercases the paired value before matching it, so `R1` and `R2` normalize to `forward` and `reverse` without a cleanup rule.

The input order is `sampleB_R2, sampleA_R1, sampleB_R1, sampleA_R2`. Each sample's reads are separated and its reverse read can arrive first, so a builder that paired adjacent rows or assigned roles by arrival order would fail. Galaxy groups rows by their mapped identifier path, so the expected output holds without a `sort` rule. Every leaf has distinct contents, and each `forward` and `reverse` element is asserted by file, so swapped roles or crossed samples fail rather than passing on structure alone.

Two behaviors are documented on the page from Galaxy source but not exercised here, because a passing test would only freeze current behavior: a sample with one mate, and a `u` or `unpaired` value under `paired_identifier`.

Run from this directory:

```sh
gxwf validate build-list-paired.gxwf.yml
planemo test build-list-paired.gxwf.yml --galaxy_branch release_25.1
```

`gxwf validate-tests` is omitted because it rejects nested `element_tests`. See `verification/README.md`.
