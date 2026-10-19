---
mold: advance-galaxy-draft-step
date: 2026-10-19
intent: Give a step that nothing can implement an honest exit instead of a silent success.
decision: eval-add
---

A `test-pipeline` run of nextflow-to-galaxy on nf-core/demo (2026-10-16,
`--through 7`, `openai-codex/gpt-5.6-terra`) concretized three loop steps,
then stalled on `restore_trimmed_sample_sheet_metadata`. That step must rebuild
a `sample_sheet:paired_or_unpaired` collection from the trimmed rows plus the
original rows. The call found that `__APPLY_RULES__` reads only one collection
and the Tool Shed searches it ran found nothing. It left the draft and ledger
unchanged, wrote a partial `galaxy-workflow.gxwf.yml`, and reported success.
The controller's no-progress guard caught it.

The Mold gave it no way out. The stock branch of step 2 never searches the
Tool Shed or authors a wrapper, and step 5 only escalated on a blocking entry
appended by [[implement-galaxy-tool-step]].

Step 2 now ends: search the Tool Shed, then author. If neither can meet the
declared output, the call appends a blocking entry for the step and goes to
step 5. A new "How a call ends" section names the three ways a non-terminal call
ends and keeps `draft-extract` to the terminal call. A routing eval checks it.
`repair-galaxy-draft-topology` now accepts the case.

`test-pipeline` reads that entry: a call that leaves the draft unchanged with an
open or surrendered blocking entry for its step fails as `loop_blocked`, naming
the entry, rather than `loop_no_progress`.
