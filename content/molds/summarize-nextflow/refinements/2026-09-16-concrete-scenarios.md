---
mold: summarize-nextflow
date: 2026-09-16
intent: "Bind and execute every pre-existing scenario for issue 534."
decision: eval-add
---

All 21 scenarios now name manifest-pinned corpus paths or committed package
fixtures. The 18 deterministic scenarios are exercised by 45 tests across all
26 manifest pins. The three downstream cases were driven manually using the
committed cast instructions and the regenerated bacass summary, not a Pi worker.

Corpus execution found and fixed explicit DSL1 extraction, nf-test loss from
quoted comment text, and container directives missing from the final tool
registry without a warning. Regression summaries were regenerated with built
workspace tooling; their large diffs reflect accumulated profile, process IO,
script, module-test/snapshot, channel and reference extraction changes.

Data-flow drafting consumed the summary and concrete preceding-phase fixtures,
carried open graph/reference requirements, and recorded partial channel extraction
as feedback. Every one of 34 tools received a container/package-evidence decision.
The Galaxy test plan preserves all nine cases and records explicit dispositions for all
36 snapshot captures rather than inventing content assertions.

Row-only Minimap2 authoring produced a structurally valid PAF UDT and passed the
packaged critic criteria. The consumer's declared whole-summary input validator
rejects the same standalone row (exit 3, 26 diagnostics). This scenario remains a
partial success: evidence is sufficient for manual authoring, but the cast input
contract needs a separate correction. BAM mode and pipeline-specific versions
YAML were explicitly outside the generated PAF variant.

The existing bacass test_liftoff remote download integration test exceeded its
120-second subprocess cap twice; all other 158 summarize-nextflow tests passed.
The fixture's chromosome-21 FASTA response is 47,488,493 bytes. This is distinct
from the deterministic localization scenario, which passed with committed data.
The full make check also detected vendored upstream drift against local Galaxy
and galaxy-tool-util checkouts; those unrelated vendored files were not refreshed.

Run outputs, feedback entries, and a per-scenario results table are retained in
the Galaxy Brain maintain project's issue-534-run directory. No upstream issue
was filed automatically.
