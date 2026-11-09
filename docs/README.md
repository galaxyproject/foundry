# Foundry documentation: where to start

This page is for humans. For agents, please visit [AGENTS.md](../AGENTS.md).

## What is Foundry, and why does it exist?

| Doc | Read this if you want to... |
|---|---|
| [glossary.md](../content/meta/glossary.md) | Learn basic terminology for Foundry (Mold, cast, corpus, etc). |
| [guiding-principles.md](../content/meta/guiding-principles.md) | Understand why Foundry is designed this way: keep knowledge at its source, check things with tools, and base everything on real workflows. |
| [comparisons.md](../content/meta/comparisons.md) | See how Foundry differs from wikis, skill bundles and retrieval-based tools, and where it fits among them. |

## How is Foundry structured?

| Doc | Read this if you want to... |
|---|---|
| [architecture.md](../content/meta/architecture.md) | See the big picture: what the main parts of Foundry are and how they connect. |
| [code-architecture.md](../content/meta/code-architecture.md) | Work on the code. It shows how the software is divided into packages and which depend on which. |
| [content-model.md](../content/meta/content-model.md) | Understand what a Foundry "note" is: its types, its header fields, and how notes link to each other. |
| [build-and-validation.md](../content/meta/build-and-validation.md) | See what checks run on the content, what is generated automatically, and how everything stays up to date. |
| [repository-layout.md](../content/meta/repository-layout.md) | Find where each kind of file lives, and which files you edit by hand and which are made automatically. |

## How do Molds work?

| Doc | Read this if you want to... |
|---|---|
| [molds.md](../content/meta/molds.md) | Learn what a Mold is (one action an AI agent can perform), how Molds are grouped, and what is just reference material. |
| [mold-spec.md](../content/meta/mold-spec.md) | Write or edit a Mold: folder layout, required fields, and what goes in the evaluation and test-case files. |
| [schema-packages.md](../content/meta/schema-packages.md) | Add or change a Mold's input/output schema: where the file lives, the steps to add one, and how the checker confirms it matches the cast's copy. |
| [eval-philosophy.md](../content/meta/eval-philosophy.md) | Understand how Foundry judges a Mold's output, and why the rules for judging (evals) are kept separate from the test cases (scenarios). |
| [harness-pipelines.md](../content/meta/harness-pipelines.md) | See the step-by-step journeys Foundry supports (like Nextflow to Galaxy), and which steps are Molds and which the harness handles. |

## How does casting work?

| Doc | Read this if you want to... |
|---|---|
| [casting.md](../content/meta/casting.md) | Understand how a Mold becomes a ready-to-use skill for an AI agent, and how the project checks the result is current. |
| [cast-walkthrough.md](../content/meta/cast-walkthrough.md) | See one real example of casting, with every file in a finished skill traced back to its source. |

## How does the corpus work?

| Doc | Read this if you want to... |
|---|---|
| [corpus.md](../content/meta/corpus.md) | See how real, curated Galaxy workflows (the IWC collection) back Foundry's patterns and Molds without being copied in. |
| [pattern-authorship.md](../content/meta/pattern-authorship.md) | Write or propose a pattern page: how patterns are named, the three kinds, and the rule that a pattern needs a real IWC example. |

## What is the team working on, and how do I join in?

| Doc | Read this if you want to... |
|---|---|
| [start-contributing.md](../content/meta/start-contributing.md) | Help but don't know where to begin. It lists pipelines to run, experiments to try, and issues to pick up, including ones that need no AI agent. |
| [issue-labels.md](../content/meta/issue-labels.md) | Pick up or label a GitHub issue: what each label means and how an issue moves through the board. |
| [roadmap.md](../content/meta/roadmap.md) | See what the team is working on now and next, and which GitHub issue each piece lives under. |
