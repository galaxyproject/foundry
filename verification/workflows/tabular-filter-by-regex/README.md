# Tabular: filter rows by regex

Verifies `[[tabular-filter-by-regex]]`: `Grep1`'s header handling, what happens when an `invert` value from the
other `Grep1` version is used, and what the corpus-default `case_sensitive: -i` does to `tp_grep_tool`.

One four-line fixture is filtered five ways with the same pattern, `^[a-z]`. The header row is `NAME VALUE` and
one data row is `BRAVO`, so a case-sensitive `^[a-z]` keeps `alpha` and `charlie` and drops both — which is what
makes each difference below visible in the output rather than only in the tool form.

**`keep_header`.** `grep_keep_header` and `grep_drop_header` are the same `Grep1` 1.0.4 step differing only in
that flag. With it on, `NAME VALUE` survives a pattern it does not match; with it off, the filter sees the header
as an ordinary row and drops it. This is the page's claim that `Grep1` is the only built-in header-preserving
regex filter on the row-text path, and it holds.

**An unrecognized `invert` value is silently coerced, not rejected.** `tool_conf.xml.sample` registers both
`filters/grep.xml` (version 1.0.4) and `filters/grep_1.0.1.xml` (version 1.0.1) under the same `Grep1` id, and
they disagree on `invert`: 1.0.4 uses the flag literals `""` / `-v`, 1.0.1 uses `"false"` / `"true"`. 1.0.1 also
has no `keep_header` param. `grep_foreign_invert` sends 1.0.1's `invert: "true"` — its spelling of *NOT*
Matching — to a 1.0.4 step, and is asserted against the same baseline as `grep_drop_header`: the value is
dropped, the select falls back to its first option, and the step keeps matching rows instead of inverting. The
job goes green and the filter means the opposite of what was written.

The rendered command line is what pins this. The step produces
`cat … | grep -P -f … >> …` with no `-v`, identical to the `invert: ""` step beside it.

This fixture cannot demonstrate the 1.0.1 wrapper itself. Planemo builds a minimal tool panel with one file per
tool id, so only one `Grep1` is loaded and a `tool_version: 1.0.1` pin silently resolves to the 1.0.4 wrapper —
which is the same coercion in a different place. The two-version divergence is read from
`tool_conf.xml.sample` and the two XMLs on `release_25.1`.

**`case_sensitive: -i` is the corpus default and it is case-*in*sensitive.** Every `tp_grep_tool` instance in the
corpus sets `-i`. `tp_grep_corpus_default` copies that verbatim and keeps all four lines, header and `BRAVO`
included; `tp_grep_case_sensitive` sets `""` and keeps the two the pattern was written for. Reaching for the
corpus shape without changing that field turns a lowercase-anchored pattern into one that matches anything.

The `tp_grep_tool` `tool_state` is copied from corpus invocations rather than from the wrapper source — the
page notes there is no local clone of `bgruening/text_processing` configured in `common_paths.yml.sample`, and
there still isn't. Running it here is what checks the inferred field names.
