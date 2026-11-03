---
type: meta
title: "Start Contributing"
record_kind: infrastructure
order: 9
tags:
  - meta
status: draft
created: 2026-10-31
revised: 2026-11-03
revision: 3
summary: "Entry points for new Foundry contributors: tracks to try, runs to report, and issues to pick up."
---

This page is where to start contributing to Foundry: pipelines to run, experiments to try, content to add and issues to pick up.

Foundry gets better the more workflows go through it. Every published workflow is data: its runs show where the Molds, the skills and the Galaxy platform underneath them break. Fixing those edges makes the next workflow better and quicker to build. [IWC](https://github.com/galaxyproject/iwc) keeps a high review bar, which suits workflows installed on usegalaxy.\* servers but slows this loop. [IWC Lab](https://github.com/galaxyproject/iwc-lab) sets a lower one. Its workflows go through the same deploy pipeline and are tested nightly, but they aren't installed on public servers. That means we can merge more of them, experiment more freely and learn faster.

```text
   publish more workflows ──────► more runs, more data
   (IWC Lab: low bar)                     │
            ▲                             ▼
            │                  find edges in skills,
   better workflows ◄───────── Molds and platform; fix them
```

## Set up

Install the skills plugin per [Usage](https://galaxyproject.github.io/foundry/usage/), or clone the repository and run `make check`.

## Try a pipeline

Run with `--feedback`. When the run ends, the harness offers `report-foundry-run-feedback`, which turns the run's ledger into issue drafts for `galaxyproject/foundry`. Nothing is filed until you confirm.

- **Convert a Nextflow workflow.** [[nextflow-to-galaxy]]. Pick an nf-core or other Nextflow pipeline you know well and run `/foundry-skills:pipeline-nextflow-to-galaxy --feedback <run-slug>`. The harness summarizes the pipeline, designs the Galaxy interface and data flow, finds or wraps a tool for each step, drafts the workflow, and builds a test from the pipeline's test profile, all under `./<run-slug>/`. Check whether the draft keeps the source's steps and outputs, and whether the test passes.
- **Build a workflow from a paper.** [[paper-to-galaxy]]. Start from a methods paper whose analysis you could check by hand. Run `/foundry-skills:pipeline-paper-to-galaxy --feedback <run-slug>` with the paper plus any supplement, linked code, and data. Compare the interface and data-flow briefs against the paper before accepting the draft. Expect questions about versions, parameters, or test data the paper leaves out; answering them is part of the exercise.

## Experiment with new pipelines

- **Does the summarize Nextflow example help?** Run a pipeline with and without the [[summarize-nextflow]] step's output and compare the drafts.
- **What happens if we combine other steps?** Merge adjacent pipeline steps into one and check whether the draft holds up.
- **Are different pipelines optimized for different models?** Run the same pipeline across models and compare the results and token cost.
- **Find content to delete.** [#742](https://github.com/galaxyproject/foundry/issues/742): agents keep adding steps, docs and abstractions but rarely remove them. Pick steps or documentation to drop, run before and after, and argue for the deletion. Fewer tokens, better output, or proof that the content is redundant all count.

## Getting started without LLMs

Issues labeled [`no-agent-required`](https://github.com/galaxyproject/foundry/labels/no-agent-required) need no agent:

- [#740](https://github.com/galaxyproject/foundry/issues/740): make pattern pages readable, with data-flow diagrams and example inputs and outputs.
- [#741](https://github.com/galaxyproject/foundry/issues/741): plan how to surface Foundry content as help in the Galaxy workflows VS Code extension.
- [#743](https://github.com/galaxyproject/foundry/issues/743): build and publish `list:paired_or_unpaired` collection example workflows.
- [#744](https://github.com/galaxyproject/foundry/issues/744): build and publish `sample_sheet` collection example workflows.

## Contribute content

- **Turn a failed run into a Mold eval example.** Find the Mold whose output went wrong and copy that step's input artifacts into `content/molds/<mold>/examples/<case>/`. Add a case to the Mold's `scenarios.md` saying what correct output looks like; `review-galaxy-workflow/examples/` shows the shape. The failure becomes a fixture the Mold's next revision must pass.

## Pick up an issue

Issues labeled [`good first issue`](https://github.com/galaxyproject/foundry/labels/good%20first%20issue) are small, self-contained starting points. [[issue-labels]] explains the rest.
