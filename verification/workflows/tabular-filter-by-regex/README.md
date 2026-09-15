# Tabular: filter rows by regex

Verifies `[[tabular-filter-by-regex]]`: `Grep1`'s header handling, the fact that the two `Grep1` versions in the
Galaxy tree take incompatible `invert` values, and what the corpus-default `case_sensitive: -i` does to
`tp_grep_tool`.

One four-line fixture is filtered five ways with the same pattern, `^[a-z]`. The header row is `NAME VALUE` and
one data row is `BRAVO`, so a case-sensitive `^[a-z]` keeps `alpha` and `charlie` and drops both — which is what
makes each difference below visible in the output rather than only in the tool form.

**`keep_header`.** `grep_keep_header` and `grep_drop_header` are the same `Grep1` 1.0.4 step differing only in
that flag. With it on, `NAME VALUE` survives a pattern it does not match; with it off, the filter sees the header
as an ordinary row and drops it. This is the page's claim that `Grep1` is the only built-in header-preserving
regex filter on the row-text path, and it holds.

**The two `Grep1` versions are not interchangeable.** `tool_conf.xml.sample` registers both
`filters/grep.xml` (version 1.0.4) and `filters/grep_1.0.1.xml` (version 1.0.1) under the same `Grep1` id, and
they disagree on the `invert` values: 1.0.4 uses the flag literals `""` / `-v`, 1.0.1 uses `"false"` / `"true"`.
1.0.1 also has no `keep_header` param at all. `grep_legacy_pin` runs the 1.0.1 shape to pin that; the page
documented only the 1.0.4 spelling without saying which version it described. The version numbering is
misleading in the other direction too — 1.0.1 carries `profile 24.2` against 1.0.4's `20.05`, so the
lower-numbered file is the later addition.

**`case_sensitive: -i` is the corpus default and it is case-*in*sensitive.** Every `tp_grep_tool` instance in the
corpus sets `-i`. `tp_grep_corpus_default` copies that verbatim and keeps all four lines, header and `BRAVO`
included; `tp_grep_case_sensitive` sets `""` and keeps the two the pattern was written for. Reaching for the
corpus shape without changing that field turns a lowercase-anchored pattern into one that matches anything.

The `tp_grep_tool` `tool_state` is copied from corpus invocations rather than from the wrapper source — the
page notes there is no local clone of `bgruening/text_processing` configured in `common_paths.yml.sample`, and
there still isn't. Running it here is what checks the inferred field names.
