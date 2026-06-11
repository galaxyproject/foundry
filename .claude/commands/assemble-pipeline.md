---
description: Assemble a Foundry Pipeline into a lightweight harness skill that runs its Mold casts in order.
argument-hint: "<pipeline-slug> [harness-name]"
---

# Assemble a Pipeline into a Harness Skill

Read Pipeline `$1` and generate a harness skill that orchestrates its phase casts in order, sets up a per-run working directory, and degrades gracefully where a phase is not yet cast.

A harness is **Not a Mold** (glossary): it is hand/LLM-authored orchestration glue, not a cast of a Mold. This command produces one such harness from a Pipeline note's machine-readable `phases:` spine. The harness lands under `casts/claude/skills/` (next to mold casts, namespaced by the `pipeline-` prefix) so `.claude/skills` picks it up, but it is assembled here — not produced by `foundry-build cast`.

`docs/ARCHITECTURE.md` (§14, §15) frames the production harness surface as an open research question that belongs downstream. An assembled `pipeline-*` skill is the deliberate in-repo **stop-gap**: a trivial linear exercise of the pipeline spine for test-driving the casts end-to-end. Not the production harness surface; not a commitment to in-repo orchestration.

`$1` is a Pipeline slug under `content/pipelines/`. Optional `$2` overrides the harness skill name (default `pipeline-<slug>`).

Examples:

- `/assemble-pipeline interview-to-galaxy`
- `/assemble-pipeline nextflow-to-galaxy`

## 0. Orient

- `content/glossary.md` — **Pipeline**, **Phase**, **Branch**, **Loop**, **Harness**, **Not a Mold**, **Routing pattern**. Load these before reasoning about phase kinds.
- `docs/HARNESS_PIPELINES.md` — the narrative the pipelines were lifted from.

Resolve `$1` to `content/pipelines/<slug>.md`. If it does not resolve, list the available pipelines and stop. If `$1` looks like a near-miss of a real slug (typo, plural/singular drift), recommend the correction before proceeding — do not assemble a harness under a misspelled name.

## 1. Read the Pipeline

Read the note. Pull from frontmatter: `title`, `summary`, `tags` (the `source/*` and `target/*` axes), and the ordered `phases:` array. The body is human context; the `phases:` array is the spine you compile.

Each phase is one of:

- **Mold phase** — `mold: "[[<slug>]]"`, optionally `loop: true`.
- **Branch phase** — `branch: <routing-pattern>` with either `branches:`/`fallthrough:` (binary) or `chain:` (sequential fallback), whose inner items are Mold wiki-links or terminal sentinels (e.g. `user-supplied`).

## 2. Resolve each phase to a cast

For every Mold wiki-link (top-level phases and branch inner items), check whether `casts/claude/skills/<slug>/SKILL.md` exists.

- **Cast present** → the harness invokes that skill by name.
- **Cast absent** (e.g. `find-test-data`, `debug-galaxy-workflow-output` today) → the harness must **not** silently skip it. Emit a manual checkpoint step: name the missing skill, summarize what that Mold is supposed to accomplish (read `content/molds/<slug>/index.md` `summary`/body for the one-line intent), and pause for the user to do it by hand before continuing.

Record the full resolution (phase → skill, cast present/absent, loop/branch shape) — you write it to the assembly sidecar in step 5.

## 3. Plan loop & branch handling

**Loop phases (`loop: true`).** The wrapped Mold is a single-entry / single-exit orchestrator that **owns its own endstate oracle** — the harness does not invent loop logic. (`advance-galaxy-draft-step` owns `gxwf draft-next-step`; it reports `draft: false` when no drafty step remains.) The harness reduces to: re-invoke the skill until it reports no remaining work, then fall through. State this generically in the generated skill — the harness re-invokes and watches for the skill's own done-signal; it does not re-implement the oracle.

**Branch phases.** Expand the routing pattern:

- `test-data-resolution` (a `chain:`) — try each entry in order; stop at the first that yields acceptable output. A terminal sentinel (`user-supplied`) means *ask the user to supply it*, not a skill. If a chain entry's Mold has no cast, render it as a MANUAL sub-step within the branch (per step 2) rather than an invocation.
- `discover-or-author` (binary `branches:` + `fallthrough:`) — run the primary; on fallthrough, run the fallback. (Not present inline in current pipelines — `advance-galaxy-draft-step` absorbed it — but handle it generically.)

## 4. Author the harness SKILL.md

Write `casts/claude/skills/<harness-name>/SKILL.md` (default `<harness-name>` = `pipeline-<slug>`). Follow this shape:

```markdown
---
name: pipeline-<slug>
description: "<pipeline summary> — orchestrates the <N> Foundry skills of the <TITLE> pipeline in order, in a per-run working directory."
---

# pipeline-<slug>

Harness for the **<TITLE>** Foundry pipeline. Runs the constituent skills in order
inside a single per-run working directory. Assembled from `content/pipelines/<slug>.md`
(revision <rev>) — regenerate with `/assemble-pipeline <slug>` if the pipeline changes;
do not hand-edit.

## When To Use

- <pipeline summary>

## Working directory (do this first)

Every constituent skill writes fixed filenames to its working directory. To keep one run's
artifacts namespaced and avoid clobbering a prior run (foundry#282):

1. Pick a run slug — use the harness argument if given, else ask the user for a short
   project name up front. Do **not** wait to derive it from a source id/title: the
   directory must exist before phase 1 writes its first artifact. Default `<slug>-run`.
2. Create `./<run-slug>/` in the current directory. If it exists, suffix `-2`, `-3`, … .
3. Run **every** skill invocation below with `./<run-slug>/` as its working directory:
   **prefix every default input and output filename with `./<run-slug>/`** when you invoke
   the skill. The skills preserve their declared basenames (e.g. `freeform-summary.md`,
   `galaxy-workflow-draft.gxwf.yml`) and honor a harness-supplied directory; you supply the
   prefix on **both reads and writes**, so each phase finds the prior phase's output and
   nothing lands in the repo root (foundry#282).

Announce the chosen directory before starting.

## Pipeline

Run these phases in order. After each, confirm the expected artifact exists in the run
directory before advancing.

1. **<skill-name>** — invoke the `<skill-name>` skill. <one-line of what it produces>
2. ... (one numbered entry per Mold phase, in pipeline order) ...

   For a **loop phase**: "Re-invoke `<skill-name>` repeatedly. It owns its own endstate
   oracle and advances the work by one unit per call; stop when it reports no remaining
   work, then continue."

   For a **branch phase**: "Resolve <pattern>: try <entry-1>, then <entry-2>, …; stop at
   the first that yields acceptable output. `user-supplied` means ask the user to provide
   it directly."

   For an **un-cast phase**: "MANUAL — `<skill-name>` is not yet cast. It should
   <one-line intent>. Do this by hand (or skip if not applicable) and confirm before
   continuing."

## Done

Report the final artifacts in `./<run-slug>/` and any phases that were handled manually.

## Notes

- Do not re-implement any skill's internal logic here; this harness only sequences and
  routes. Endstate detection for loop phases belongs to the looped skill.
- Carry unresolved assumptions forward as notes rather than inventing missing inputs.
```

Fill every `<...>` from the pipeline. Number the Pipeline section with one entry per Mold-shaped phase in order; expand loop/branch/un-cast phases using the inline guidance above. Keep the description under the skill-frontmatter length the other casts use (one sentence).

## 5. Write the assembly sidecar

Write `casts/claude/skills/<harness-name>/_assembly.json` recording provenance and drift signal:

```json
{
  "source_pipeline": "<slug>",
  "source_revision": <rev>,
  "harness_name": "<harness-name>",
  "phases": [
    { "phase": 1, "kind": "mold", "skill": "<slug>", "cast_present": true, "loop": false },
    { "phase": 2, "kind": "branch", "pattern": "test-data-resolution",
      "chain": ["find-test-data", "user-supplied"], "cast_present": [false, null] }
  ]
}
```

This is a harness artifact, not a cast `_provenance.json`; the cast verifier does not read it. It exists so a later run can detect that the pipeline changed since assembly.

## 6. Report

Summarize: harness path, phase count, which phases resolved to real casts vs. manual checkpoints, and the working-directory convention. Then, per the project's plan-completion convention, offer the user next-step options via AskUserQuestion — including launching a review subagent and proceeding to assemble another pipeline.
