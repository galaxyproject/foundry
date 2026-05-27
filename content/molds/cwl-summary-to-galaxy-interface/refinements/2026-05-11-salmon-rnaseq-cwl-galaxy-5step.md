---
mold: cwl-summary-to-galaxy-interface
date: 2026-05-11
intent: 5-step CWL→Galaxy emulation on hubmapconsortium/salmon-rnaseq pipeline.cwl
decision: keep
---

## What worked

- Workflow inputs and outputs map cleanly from the summary; the Directory[] → list:list discussion landed in "open questions" without forcing a choice prematurely.
- Optional `null|File` workflow outputs (scVelo / SquidPy branches) surfaced as "optional public outputs" rather than being collapsed; downstream data-flow brief and template both used the distinction.
- "Promote as public / optional / checkpoint" structure carries over well from the ga4gh run.

## Gaps surfaced

1. **Three Directory-typed inputs and one Directory-typed output, no IUC convention to lean on.** The brief stalled on every Directory case the same way: "open question, recommend X". With three Directory inputs (`fastq_dir: Directory[]`, `img_dir: Directory?`, `metadata_dir: Directory?`) and one Directory workflow output (`salmon_output`), this fixture is the worst-case for the gap. A reference note `cwl-directory-to-galaxy-collection.md` (or section in the existing collection-semantics note) would let the brief converge.

2. **`assay` enum allowed values come from a nested CWL document, not the summary.** The brief flagged this as open question #5, but a faithful "interface" Mold should be able to enumerate select-parameter allowed values when the source CWL constrains them. Currently the constraint is buried in `salmon-quantification.cwl` and `salmon.cwl` (presumably a switch on `assay` string), and `summarize-cwl` doesn't surface enum-like discriminators. Probably out of scope for *this* Mold to fix; flag for `summarize-cwl`.

3. **`organism` is a `when:`-discriminator masquerading as a free string.** The CWL declares `organism: string?, default: human` but inside the nested workflow it gates `salmon` vs `salmon-mouse` via `when:`. From a `summary-cwl.json` perspective the field is just `string?`. The interface brief recommended treating it as a select (correct call), but only because I read the nested CWL directly. Same root cause as the data-flow refinement: nested-workflow `when:` markers should reach this Mold.

## Open questions

- Same as data-flow: where should "CWL Directory → Galaxy collection" reference live?
- Should the interface Mold's procedure explicitly say "when the summary exposes a value-driven `when:` predicate against a workflow input, treat that input as a select parameter with the enumerated values"?
