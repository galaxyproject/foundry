---
type: research
title: "Foundry run record"
tags:
  - meta
status: draft
created: 2026-09-18
revised: 2026-09-18
revision: 1
summary: "Always-on runtime record of what a pipeline run is doing and what each phase put on disk, written by the harness and read by run-dashboard."
---

# Foundry run record

The `foundry-run-manifest` is the run directory's own account of itself. The harness creates it
before phase 1 and appends to it as phases complete, so a finished run carries a machine-readable
answer to *which pipeline was this, how far did it get, and which phase wrote which file*.

The registered filename is `foundry-run.yml`. Unlike the [[foundry-feedback-ledger]] it is not
opt-in: every run writes it, because the questions it answers are not optional ones.

## Why a record rather than a directory listing

A run directory is flat and every skill writes a fixed basename into it, so it is tempting to
recover the run by matching filenames against what the Molds declare. That does not work, and the
reasons are structural rather than incidental:

- **Pipelines are not separable by filename.** `paper-to-galaxy` and `interview-to-galaxy` declare
  identical filename sets, because `summarize-paper` and `interview-to-freeform-summary` emit the
  same artifact id. No file on disk distinguishes them.
- **One filename, many declaring Molds.** `open-requirements.ledger.yml` is declared by seventeen
  Molds and `galaxy-workflow-draft.gxwf.yml` by seven, two of the latter inside a single pipeline.
  "Which phase wrote this" is undecidable from the filesystem.
- **Loops overwrite themselves.** A per-step loop writes the same basename once per iteration.
  After twenty-six iterations the directory holds one file and no memory of the other twenty-five.
- **A branch's decision leaves no trace.** Which chain member satisfied a `[branch]` phase is a
  choice, not a file.

The record carries exactly the facts the filesystem cannot: identity, order, iteration counts,
branch selections, and the Foundry revision the run was made against.

## Record shape

```yaml
run_record_version: 1
pipeline: paper-to-galaxy
run_slug: auris-scf1
source_revision: 2
harness_name: pipeline-paper-to-galaxy
assembly_sha256: 4f3c…            # sha256 of the harness `_assembly.json`
foundry_head: 63a3f9cf…           # Foundry commit the run read
started_at: 2026-09-16T18:02:00Z
finished_at: null
status: running                   # running | complete | failed | cancelled
phases:
  - n: 1
    kind: mold
    skill: summarize-paper
    status: done                  # pending | running | done | failed | skipped
    artifacts:
      - { id: freeform-summary, file: freeform-summary.md, at: 2026-09-16T18:09:00Z }
  - n: 6
    kind: mold
    skill: advance-galaxy-draft-step
    status: done
    iterations: 26
    artifacts:
      - { id: galaxy-workflow-draft, file: galaxy-workflow-draft.gxwf.yml, at: 2026-09-16T21:36:00Z, iteration: 26 }
      - { id: galaxy-workflow, file: galaxy-workflow.gxwf.yml, at: 2026-09-16T21:40:00Z }
  - n: 7
    kind: branch
    pattern: test-data-resolution
    selected: paper-to-test-data
    status: done
    artifacts:
      - { id: test-data-refs, file: test-data-refs.json, at: 2026-09-16T21:56:00Z }
```

`assembly_sha256`, `source_revision`, and `foundry_head` pin the run to the Foundry it actually
read. Without them a reader silently resolves an old run against today's Molds and reports a
contract the run never saw. `PipelineRunRecord`, the evaluation harness's own record, carries the
same three fields under the same names.

## Lifecycle

The harness owns every field. It creates the file during working-directory setup, copying the
complete phase roster from `_assembly.json` with `status: running` and every phase `pending`. It
sets a phase `running` immediately before invoking it and `done` once the phase's artifacts are
confirmed, appending one `artifacts` row per file written. A loop phase stays one row and
increments `iterations`, appending a row per iteration that writes. A branch phase stays one row
and records the chain member that satisfied it as `selected`.

A phase that terminates the run and the run itself become `failed`; a graceful user stop makes the
run `cancelled`; after every intended phase is done the run becomes `complete`. A hard interruption
naturally leaves `running`, which is distinguishable from success without a recovery write.

An absent `foundry-run.yml` means the run predates this protocol. Readers may reconstruct a
degraded view from filenames, the feedback ledger's `run:` header, and checkpoint history, but
they must label it as reconstructed and must not claim a pipeline they cannot distinguish.

## Relationship to the other run files

| file | scope | opt-in |
|---|---|---|
| `foundry-run.yml` | what the run is and what each phase wrote | no |
| `foundry-feedback.ledger.yml` | what the run showed to be wrong with the Foundry | `--feedback` |
| `open-requirements.ledger.yml` | obligations the workflow being built has not met | no |
| checkpoint git history | per-phase and per-iteration diffs | `--checkpoint` |

The feedback ledger's `run:` header overlaps this record and predates it. It stays where it is:
that header exists so a feedback reader needs no second file, and the two are written by the same
harness in the same pass. A reader that has both should prefer this record and report disagreement
rather than silently choosing.

## Open work

- The record is agent-written, so it can drift from what happened. Checkpoint history is the
  independent check, and a reader holding both should surface disagreement rather than pick.
- `open-requirements.ledger.yml` is written on every run and registered in no registry, because
  its id is already claimed by the Mold outputs that genuinely produce it. Registering a
  harness-initialized alias would collide with that rule; the id stays with its Molds.
