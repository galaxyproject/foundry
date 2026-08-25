---
type: mold
name: report-foundry-run-feedback
axis: generic
tags:
  - meta
status: draft
created: 2026-08-25
revised: 2026-08-25
revision: 1
summary: "Triage a completed or partial Foundry feedback ledger into a run review and confirmed, deduplicated upstream issue drafts."
input_artifacts:
  - id: foundry-feedback-ledger
    description: "Runtime-produced ledger containing run coverage and actionable observations about canonical Foundry source assets."
output_artifacts:
  - id: foundry-run-review
    kind: markdown
    default_filename: foundry-run-review.md
    description: "Run coverage, ledger integrity findings, dispositions, and a concise summary of feedback triage results."
  - id: foundry-issue-drafts
    kind: markdown
    default_filename: foundry-issue-drafts.md
    description: "One self-contained new-issue or existing-issue comment draft per surviving canonical subject cluster."
---

# Report Foundry run feedback

Triage a `foundry-feedback.ledger.yml` produced by feedback mode. Produce a factual run review
and a consolidated set of upstream drafts. Drafting is local by default; creating a GitHub issue
or posting a comment is a separate, explicitly confirmed action.

Always target `galaxyproject/foundry`. Do not prescribe a particular GitHub interface. If no
GitHub-capable interface is available, complete the local outputs and stop.

## Sequence

1. **Read the protocol and ledger.** Read `_feedback.md`, then the supplied feedback ledger. Do
   not infer missing fields. Preserve the original ledger until triage has produced complete
   local outputs.
2. **Assess run coverage.** Summarize `run.status` and every top-level phase. Call an empty ledger
   clean only when the run is `complete`. For `running`, `failed`, or `cancelled` runs, identify
   the last running or failed phase and all phases that remained pending.
3. **Screen unsafe evidence.** Remove credentials, private URLs, proprietary source text,
   participant data, and user-identifying paths from review text and drafts. Replace the run
   directory prefix with `<run>/`. If redaction would make an observation unverifiable, keep it
   in the local review but do not draft an upstream report.
4. **Cluster open entries.** Group `status: open` entries by `subject.locator`. Merge compatible
   observations about the same correction into one cluster while preserving the contributing
   entry ids, severities, observed content hashes, and evidence. Do not merge distinct requested
   corrections merely because they name the same subject.
5. **Check current main.** Resolve each canonical locator against current
   `galaxyproject/foundry/main`. An unchanged content hash proves only that the observed asset is
   unchanged. A changed hash requires inspection for the proposed correction. When a locator
   moved, use its kind, label, and old hash to find the successor. Mark an observation fixed only
   when current source actually contains the correction.
6. **Search for duplicates.** Search open and closed issues in `galaxyproject/foundry` using the
   canonical locator, label, and correction. Prefer a comment draft for a matching open issue;
   record a duplicate disposition for a closed issue that already resolved the correction. Do
   not open a second issue for the same work.
7. **Write `foundry-run-review.md`.** Include run status and phase coverage, ledger-integrity or
   redaction concerns, every cluster's disposition (`fixed`, `duplicate`, `comment-draft`,
   `issue-draft`, or `local-only`), and the entry ids supporting it.
8. **Write `foundry-issue-drafts.md`.** Write one self-contained section per surviving correction
   cluster. Label it as either a new-issue draft or an existing-issue comment draft. Include the
   canonical locator, observed hash, affected Mold and Mold content hash, concise evidence, the
   expected correction, and contributing entry ids. Do not include sections for fixed,
   duplicate, unsafe, or `wontfix` observations.
9. **Gate every remote mutation.** Present the local drafts and ask for explicit confirmation of
   the exact issues and comments to post. No confirmation means stop with the files. On
   confirmation, perform only the approved mutations in this invocation. Begin every posted body
   with `Posted by an AI assistant on <user>'s behalf.` and never @-mention anyone.
10. **Record confirmed dispositions.** After a successful post, update the corresponding ledger
    entries to `filed` or `duplicate` and store the issue URL. Preserve all other entry fields and
    never delete history. If a remote mutation fails, leave the entries open and report the
    failure in the run review.
