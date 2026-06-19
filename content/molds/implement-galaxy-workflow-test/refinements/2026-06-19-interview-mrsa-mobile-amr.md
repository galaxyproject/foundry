---
mold: implement-galaxy-workflow-test
date: 2026-06-19
intent: "Test-pipeline INTERVIEW→GALAXY on UC1/MRSA — why phases 9/11 looked 'blocked' and what the Mold should own."
decision: reference-change
---

## What surfaced

Driving the MRSA mobile-AMR journey, phase 9 authored a valid `-tests.yml` whose
job input pointed at `path: test-data/mrsa_assemblies/KUN1163.fasta` (and three
siblings). The file validated against tests-format and passed the workflow-label
cross-check — but **no Mold materializes those files**. find-test-data resolved
the source honestly (4 isolates, 8 INSDC accessions, all verified HTTP 200) plus
a prep recipe (per-isolate fetch + concatenate chromosome+plasmid), but nothing
in the chain executes that prep. So the test is statically green and not runnable
as-is: `planemo test` would fail at upload, not at assertion.

Separately, the run-summary mislabeled the runtime gate "BLOCKED — no managed
Galaxy", a framing inherited verbatim from the UC3/ATAC run. That is wrong.
`eval.md`'s "managed Galaxy runtime green" and run-workflow-test's "existing vs
managed Galaxy mode" both mean **Planemo-managed**: `planemo test` bootstraps its
own Galaxy and installs the tools. No external server is required. The real
deferral reason is cost (Bakta's multi-GB DB + ~8 tool installs), not
infeasibility.

## Change made this session (procedure prose only, no schema change)

1. **Step 2 now owns data staging.** Prefer a bare remote `location:`
   (IWC remote-URL-first) when a ref is a single fetchable artifact. Materialize
   a local `test-data/` layout **only when the ref needs prep a URL can't
   express** — concat (chr+plasmid → one FASTA), subset (one chromosome), or a
   column split into named collection elements — by fetching from the ref's
   verified source and laying files out relative to the `*-tests.yml`, with
   element identifiers matching the test file and draft labels. Made the
   no-un-materialized-path rule explicit (a path the test names but nothing
   produces passes the cross-check and fails only at upload).
2. **Step 5 clarifies "managed Galaxy" = Planemo-bootstrapped**, so a future run
   doesn't skip the runtime gate for lack of an external Galaxy. Cost of heavy
   tool/reference-DB installs is a deliberate deferral, not an impossibility.

## Open questions

- **Ownership boundary.** Should staging live here (test file + its data as one
  deliverable — chosen) or in run-workflow-test right before execution, or a
  harness step? Chose here because the `path:` entries are authored here; the
  data they reference should be produced by the same step. Revisit if a harness
  staging step emerges.
- **Should the staged `test-data/` dir become a declared frontmatter Output**
  (artifact), or stay an implicit side-effect of the tests artifact? Left
  implicit to avoid schema churn; flag if casters need it addressable.
- **eval.md wording.** "managed Galaxy with staged test data and tools available"
  is technically correct but read as "external Galaxy" by a runner once already.
  Consider tightening to "Planemo-managed Galaxy (`planemo test` provisions it +
  installs tools)".
