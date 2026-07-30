---
type: meta
title: "Pattern Authorship Policy"
record_kind: infrastructure
order: 2
tags:
  - meta
status: reviewed
created: 2026-05-01
revised: 2026-07-30
revision: 4
summary: "Developer-facing authorship rules for operation-named, corpus-grounded pattern pages."
---

Project-infrastructure policy for `content/patterns/` notes. Read this before hand-authoring
pattern pages or running survey commands that propose new ones. Pattern-specific rules (for example,
when to set `auto_col_types: true`) belong on the pattern page itself, not here.

## Pattern kinds

Use `pattern_kind` to describe the level of organization:

- `operation` — an actionable pattern centered on one workflow-construction operation. It may link to related operations but should not require a multi-step lifecycle to explain its core move.
- `recipe` — an actionable pattern centered on an ordered composition of operations. Use this when the reusable value is sequencing, handoff, and decision points across multiple lower-level operations.
- `moc` — a map-of-content page that routes readers to operations and recipes. It should not own a primary construction recipe.

## Naming: operation- and recipe-anchored

Operation pattern pages are named after the **operation** they describe, not the tool that implements it. Recipe pattern pages are named after the lifecycle or composition they describe. Tool-anchored content is fine *inside* an operation- or recipe-named page.

- ✅ `tabular-filter-by-regex.md` — operation; lists `tp_grep_tool` as the recommended tool, `Grep1` as a legacy footnote.
- ✅ `tabular-prepend-header.md` — operation; implementation uses awk, but awk isn't in the title.
- ✅ `cleanup-sync-and-publish-nonempty-results.md` — recipe; the value is the ordered cleanup, sibling sync, and publish gate.
- ❌ `tp_grep_tool.md` — tool name in title.
- ❌ `awk-in-galaxy.md` — tool name in title; split into operation-named sub-pages instead.

Operation-anchored naming was decided 2026-04-30 in the tabular survey (`content/research/iwc-tabular-operations-survey/index.md` §7). Recipe pages extend the same rule to multi-step lifecycle patterns.

## Corpus-first

No exemplar in IWC, no pattern page. If the survey turns up an interesting capability with zero corpus uptake, document the gap as a one-line note in the survey — do not write a speculative pattern page.

This is what stops the foundry from accreting tool documentation that nobody actually reaches for in the wild.

## Legacy tools as footnotes

When the corpus shows a modern tool *and* a legacy alternative for the same operation (e.g. `datamash_ops` modern vs `Grouping1` legacy), the pattern page leads with the modern tool and footnotes the legacy with a "Legacy alternative" pointer. Reading old IWC workflows must stay possible; recommending old tools to new authors must not.

## Three places where authorship rules live

| Layer | What lives there | Example |
|---|---|---|
| `content/meta/pattern-authorship.md` (this file) | Project-level authorship policy | "Operation-anchored naming" |
| `content/research/iwc-shortcuts-anti-patterns/index.md` | Corpus-grounded "don't do this" calls | "Don't reach for `Grep1` when `tp_grep_tool` is available" |
| The pattern page itself | Prescriptive per-pattern rules | `auto_col_types` per-expression-kind table on `tabular-compute-new-column` |

The IWC survey commands read all three before asking the user a question, so already-decided calls don't get re-litigated.
