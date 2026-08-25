---
type: research
title: "Foundry feedback ledger"
tags:
  - meta
status: draft
created: 2026-08-25
revised: 2026-08-25
revision: 1
summary: "Runtime protocol for carrying actionable feedback about Foundry assets, and the related projects a run exercises, from cast skills back to Foundry maintainers."
---

# Foundry feedback ledger

The `foundry-feedback-ledger` is an opt-in runtime artifact for observations about the Foundry
assets used during a real cast-skill or pipeline run. It records actionable gaps, defects,
friction, and wishes about Molds and their authored references. It does not record unmet
requirements in the workflow being built; those belong in the open-requirements ledger.

Every entry is destined for `galaxyproject/foundry`. When a run shows that a related project is
at fault — Galaxy, a tool wrapper, the IWC corpus, a harness CLI — that observation still belongs
here, recorded with the analysis that points at the upstream. The Foundry is where the run
context lives, so it is where the issue is tracked; a maintainer forwards from there. Never tell
a user to take an observation to another tracker instead.

The registered filename is `foundry-feedback.ledger.yml`. Feedback-aware callers pass the same
file through every skill invocation in a run.

## Ledger shape

```yaml
run:
  pipeline: nextflow-to-galaxy
  run_slug: sarek-galaxy
  status: running
  phases:
    - { n: 1, kind: mold, skill: summarize-nextflow, status: done, feedback_checked: true }
    - { n: 2, kind: mold, skill: nextflow-summary-to-galaxy-interface, status: running }
entries:
  - id: channel-shape-note-silent-on-optional-outputs
    raised_by: nextflow-summary-to-galaxy-interface
    observed_in:
      mold: nextflow-summary-to-galaxy-interface
      path: content/molds/nextflow-summary-to-galaxy-interface/index.md
      revision: 6
      content_hash: 82d8...
      foundry_head: d9e0b09
    subject:
      kind: research
      label: nextflow-to-galaxy-channel-shape-mapping
      locator: content/research/nextflow-to-galaxy-channel-shape-mapping/index.md
      content_hash: a18c...
    kind: gap
    severity: major
    what: "The note does not cover optional outputs."
    expected: "State how an absent optional channel maps to the Galaxy interface."
    evidence: "Interface design stopped at the optional output decision."
    status: open
    issue: null
```

Entry `kind` is `gap`, `defect`, `friction`, or `wish`. Severity is `blocker`, `major`, or
`minor`. Status is `open`, `filed`, `duplicate`, or `wontfix`.

## Run lifecycle

For a pipeline run, the harness creates the file before phase 1 with `run.status: running`, an
empty `entries` list, and the complete top-level phase roster from its assembly record. All
phases begin `pending`. The harness changes a phase to `running` immediately before invocation
and to `done` on success. A phase that terminates the run and the run itself become `failed`; a
graceful user stop makes the run `cancelled`. A hard interruption naturally leaves the run
`running`, which is distinguishable from success without a recovery write.

A phase also carries `feedback_checked`. The harness sets it true only when that phase reported a
feedback outcome — entry ids it appended, or an explicit `no feedback`. It is absent or false
otherwise, including for a phase that simply never said. This is what separates a run that looked
for friction and found none from a run that never looked.

Loop phases remain one row and increment `iterations` after each successful iteration. Branch
phases remain one row and record the chosen path in `selected`. After every intended phase is
done, the harness sets `run.status: complete`.

For a standalone skill invocation, the first feedback-aware skill creates a ledger with
`pipeline: null`, the caller's run slug when one exists, and one phase row for itself. It owns
that row's lifecycle as well as any entry it appends.

No ledger means feedback mode was off. An empty `entries` list is evidence of a clean run only
when `run.status` is `complete` **and** every phase is `feedback_checked`. A complete run with
unchecked phases is complete but unreviewed; an empty incomplete ledger is neither.

## When to append

Appending is a deliberate pass, not a background reflex. Before a skill reports completion it
recalls what actually happened during its work — where it guessed at something the instructions
should have settled, needed information its bundle does not carry, hit an instruction that
contradicted another or contradicted the artifacts in front of it, used a reference that did not
cover the case, or did something its procedure never describes. Those are recallable events. "Was
anything unclear?" is not a useful question to ask at that moment and reliably answers itself no.

The pass ends in one of two outcomes, and the outcome is always stated: entries appended, or
`no feedback`. A skill that says nothing has not reported a clean pass.

Two entry shapes are admissible. Both require that `what` names a concrete problem, `expected`
states a proposed correction, and the entry is not already present in this ledger for the same
subject and correction.

**A Foundry source asset.** The observation concerns Foundry-authored content, implementation, or
a registry that could be changed directly, and `subject.locator` canonically identifies it. This
is the ordinary case and the one the clustering and hash checks are built for.

**A related project.** The run showed that a project the Foundry drives or cites is at fault —
Galaxy, a Tool Shed wrapper, the IWC corpus, `gxwf`, planemo. Use `subject.kind: related-project`,
name the project and the specific component in `label`, and put its public identity in
`locator` (a repository URL, a tool id, an IWC workflow id). There is no `content_hash`. State
in `what` and `evidence` what the run actually observed, and in `expected` what the upstream
would have to do. The entry is still filed against the Foundry.

Do not use feedback entries for ordinary workflow requirements, tool-selection uncertainty, or
an unsupported preference with nothing concrete to change.

## Canonical identity and provenance

For a Foundry subject, use a repository-relative authored path as `subject.locator`; for a
package-export schema, use `package://<package>#<export>`. Generated skills and harnesses are
never subjects; identify the Mold, Pipeline, caster, assembler, or registry that must change.

Initial subject kinds are `mold`, `pipeline`, `pattern`, `source-pattern`, `research`, `schema`,
`prompt`, `cli-tool`, `cli-command`, `meta`, `implementation`, and `registry`, plus
`related-project` for the upstream case above. `label` is for display only; the locator is the
identity and clustering key.

A `related-project` subject is the one kind whose locator is not a Foundry path: it is public
upstream identity, carries no content hash, and is never checked against Foundry main.

For the running Mold, copy `mold.name`, `mold.path`, `mold.revision`, and `mold.content_hash`
from `_provenance.json` into `observed_in`. Record its `mold.commit` value as `foundry_head`, but
never use that commit as exact content identity: it can be null or predate the bytes in the cast.
For a packaged reference, copy its `refs[].src` and `refs[].src_hash` into the subject locator and
content hash. When the subject is the Mold itself, use its authored path and
`observed_in.content_hash`.

## Safe updates

Read the complete ledger immediately before changing it. Preserve run state and all entries you
do not own. Append a complete entry in one rewrite; do not leave a partial YAML document. The
harness is the sole writer of pipeline lifecycle fields, while each skill writes only entries.

Keep evidence concise and safe to upstream. Never copy credentials, tokens, private repository
URLs, proprietary source text, patient or participant data, or user-identifying filesystem
paths into the ledger. Replace a run-directory prefix with `<run>/` and summarize sensitive
evidence instead of quoting it.

The reporting skill may set an open entry to `filed`, `duplicate`, or `wontfix` and record the
resolved issue URL after the corresponding disposition is confirmed. It never deletes an entry;
the ledger remains the run audit trail.
