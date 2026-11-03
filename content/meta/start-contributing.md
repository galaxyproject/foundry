---
type: meta
title: "Start Contributing"
record_kind: infrastructure
order: 9
tags:
  - meta
status: draft
created: 2026-10-31
revised: 2026-10-31
revision: 1
summary: "Entry points for new Foundry contributors: tracks to try, runs to report, and issues to pick up."
---

TODO: one-paragraph intro.

## Set up

Install the skills plugin per [Usage](https://galaxyproject.github.io/foundry/usage/), or clone the repository and run `make check`.

## Try a pipeline

Run with `--feedback`. When the run ends, the harness offers `report-foundry-run-feedback`, which turns the run's ledger into issue drafts for `galaxyproject/foundry`. Nothing is filed until you confirm.

- **Convert a Nextflow workflow.** [[nextflow-to-galaxy]]. Pick an nf-core or other Nextflow pipeline you know well and run `/foundry-skills:pipeline-nextflow-to-galaxy --feedback <run-slug>`. The harness summarizes the pipeline, designs the Galaxy interface and data flow, finds or wraps a tool for each step, drafts the workflow, and builds a test from the pipeline's test profile, all under `./<run-slug>/`. Check whether the draft keeps the source's steps and outputs, and whether the test passes.
- **Build a workflow from a paper.** [[paper-to-galaxy]]. Start from a methods paper whose analysis you could check by hand. Run `/foundry-skills:pipeline-paper-to-galaxy --feedback <run-slug>` with the paper plus any supplement, linked code, and data. Compare the interface and data-flow briefs against the paper before accepting the draft. Expect questions about versions, parameters, or test data the paper leaves out; answering them is part of the exercise.

## Contribute content

- **Turn a failed run into a Mold eval example.** Find the Mold whose output went wrong and copy that step's input artifacts into `content/molds/<mold>/examples/<case>/`. Add a case to the Mold's `scenarios.md` saying what correct output looks like; `review-galaxy-workflow/examples/` shows the shape. The failure becomes a fixture the Mold's next revision must pass.

## Pick up an issue

Issues labeled [`good first issue`](https://github.com/galaxyproject/foundry/labels/good%20first%20issue) are small, self-contained starting points. [[issue-labels]] explains the rest.
