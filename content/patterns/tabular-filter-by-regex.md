---
type: pattern
pattern_kind: operation
evidence: corpus-observed
title: "Tabular: filter rows by regex"
tags:
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-05-03
revision: 2
ai_generated: true
summary: "Use tp_grep_tool for whole-line regex row filters on tabular input. Grep1 is the legacy alternative."
related_notes:
  - "[[iwc-tabular-operations-survey]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
related_patterns:
  - "[[tabular-filter-by-column-value]]"
  - "[[tabular-sql-query]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
iwc_exemplars:
  - workflow: epigenetics/atacseq/atacseq
    why: "Drops comment lines from a fragment-length histogram with tp_grep_tool and invert mode."
    confidence: high
  - workflow: epigenetics/chipseq-sr/chipseq-sr
    why: "Keeps MACS2 summary header lines and changes datatype for downstream rendering."
    confidence: high
  - workflow: VGP-assembly-v2/Purge-duplicates-one-haplotype-VGP6b/Purging-duplicates-one-haplotype-VGP6b
    why: "Drops BED rows containing REPEAT with inverted grep."
    confidence: high
  - workflow: comparative_genomics/hyphy/capheine-core-and-compare
    why: "Shows the legacy Grep1 path for keeping FASTA header lines."
    confidence: medium
---

# Tabular: filter rows by regex

## Tool

`toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_grep_tool` ("Search in textfiles with grep"). 43 step occurrences in the IWC corpus, alongside 47 occurrences of the legacy core `Grep1`. Per the §7 decision in [[iwc-tabular-operations-survey]], `tp_grep_tool` is the recommended choice — consistency with the rest of the `tp_*` text_processing family wins over `Grep1`'s slight corpus-frequency edge.

Source XML lives in the `bgruening/text_processing` toolshed repository (no local clone is configured in `common_paths.yml.sample`; parameter shapes below are inferred from corpus invocations).

## When to reach for it

Whole-line regex inclusion or exclusion of rows. Drop comment lines (`^#`), keep header-style lines (`^@`), drop rows containing a literal token (`REPEAT`), keep records by an FA-like prefix (`^>`).

If the predicate is a Python expression over specific columns (`c4 == 'PASS'`), prefer [[tabular-filter-by-column-value]] — `tp_grep_tool` has no notion of columns. If joins, windows, or grouping are part of the filter, prefer [[tabular-sql-query]].

## Parameters

Field names below are corpus-inferred from `tool_state` blocks (the underlying wrapper is not in `common_paths.yml.sample`). Verify against the live tool form when authoring.

- `infile`: connected tabular input.
- `url_paste`: the regex pattern. The field name is a textarea/file artifact; the value is the pattern itself (e.g. `^#`, `REPEAT`, `^>`).
- `regex_type`: select. Corpus values: `-P` (PCRE; dominant), `-E` (ERE), `-G` (BRE). `-P` matches the only flavor `Grep1` supports.
- `invert`: select. `""` keeps matching lines; `-v` keeps non-matching lines.
- `case_sensitive`: select. `""` is case-sensitive; `-i` is case-insensitive. (Value is the flag itself.)
- `lines_before`, `lines_after`: string-quoted integers (`"0"` corpus-default). Equivalent to grep `-B` / `-A` for context lines around each match.
- `color`: select; `NOCOLOR` is the only corpus value. Leave as `NOCOLOR` — colored output is meaningless inside a workflow.

`tp_grep_tool` does **not** expose a header-preserving toggle in any corpus invocation. If you need to keep the first line independent of the pattern, see the legacy alternative below or pre-strip the header with `Remove beginning1` and concatenate.

## Idiomatic shapes

Drop comment lines (case-insensitive PCRE, invert):

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_grep_tool/9.3+galaxy1
tool_state:
  infile: { __class__: ConnectedValue }
  url_paste: ^#
  regex_type: -P
  invert: -v
  case_sensitive: -i
  lines_before: "0"
  lines_after: "0"
  color: NOCOLOR
```

Anchored by the ATAC-seq and ChIP-seq single-read IWC exemplars.

Drop rows containing a literal token:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_grep_tool/9.5+galaxy3
tool_state:
  infile: { __class__: ConnectedValue }
  url_paste: REPEAT
  regex_type: -P
  invert: -v
  case_sensitive: -i
  lines_before: "0"
  lines_after: "0"
  color: NOCOLOR
```

Anchored by the VGP purge-duplicates IWC exemplar.

## Pitfalls

- **No header preservation.** Whole-line regex sees the header as a normal row; if your pattern matches data but not the header, you silently drop the header. Strip-then-rebind, switch to `Grep1` with `keep_header: true`, or accept that the output is headerless.
- **`url_paste` is the pattern field.** The misleading name is a wrapper artifact (text/file dual input). Don't treat it as a URL; don't escape it as one.
- **`case_sensitive` and `invert` values are the flag literals.** `case_sensitive: true` will not work — set `-i` for insensitive, `""` for sensitive. Same for `invert: -v` vs `""`.
- **PCRE vs ERE.** `regex_type: -P` is the corpus default and matches `Grep1`'s flavor. ERE / BRE are available but unattested in the survey; switching flavors mid-workflow makes patterns harder to reason about.
- **No column awareness.** A pattern like `\tPASS\t` is the closest you can get to "column 4 equals PASS" — and it's brittle (depends on tab counts, breaks on the first/last column). Use [[tabular-filter-by-column-value]] for column predicates.
- **Version pin sprawl.** Four pins coexist in the corpus (`1.1.1`, `9.3+galaxy1`, `9.5+galaxy2`, `9.5+galaxy3` — `9.5+galaxy3` dominates) with the same parameter shape. Pick the highest pin already present in the workflow you're touching; do not block PRs for older pins on cleanup grounds.

## Legacy alternative

`Grep1` ("Select lines that match an expression"; Galaxy core, `$GALAXY/tools/filters/grep.xml`). 26 step occurrences — slightly more frequent than `tp_grep_tool` but loses the consistency argument. Distinguishing parameters:

- `pattern`: the regex (text, sanitizer off; PCRE only — wrapper hardcodes `grep -P`).
- `invert`: select; `""` Matching / `-v` NOT Matching.
- `keep_header`: boolean (`true` / `false`). `true` peels the first line through unchanged, then `grep`s the remainder — the **only** built-in header-preserving regex filter on the row-text path.

When reading older IWC workflows you will encounter `Grep1` regularly; preserve it as-is. For new authoring, prefer `tp_grep_tool` unless `keep_header: true` is genuinely needed.

## See also

- [[iwc-tabular-operations-survey]] — corpus survey and §7 decision record (recommend `tp_grep_tool`, demote `Grep1` to legacy).
- [[tabular-filter-by-column-value]] — column-expression row filter (`Filter1`).
- [[tabular-sql-query]] — when SQL semantics are the right reach.
