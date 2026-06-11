---
description: Assemble a Foundry Pipeline into a lightweight harness skill that runs its Mold casts in order.
argument-hint: "<pipeline-slug> [harness-name]"
---

# Assemble a Pipeline into a Harness Skill

Assembling a `pipeline-<slug>` harness is now **fully deterministic** — there is no LLM step. Do not hand-author the harness; run the build command, which projects the Pipeline note's `phases:` spine plus each Mold's `summary`/`loop_endstate` and the pipeline's `harness_notes` into `casts/claude/skills/pipeline-<slug>/SKILL.md` + `_assembly.json`.

A harness is **Not a Mold** (glossary): orchestration glue, not a cast of a Mold. These in-repo `pipeline-*` skills are the deliberate **stop-gap** (`docs/ARCHITECTURE.md` §14/§15), a trivial linear exercise of the pipeline spine for test-driving the casts end-to-end — not the production harness surface.

## Run

`$1` is a Pipeline slug under `content/pipelines/`. Optional `$2` overrides the harness skill name (default `pipeline-<slug>`).

```sh
npm run assemble-pipeline -- "$1" $2        # or: foundry-build assemble-pipeline <slug> [harness-name]
```

To regenerate every harness, run `make assemble-pipelines`. The drift gate is `make check-assemble-pipelines` (byte-diff regen, mirrors `cast --check`); it runs under `make check`.

If `$1` does not resolve, the command lists the available pipelines and exits non-zero. If `$1` looks like a near-miss of a real slug (typo, plural/singular drift), recommend the correction before running — don't assemble under a misspelled name.

## What to change instead of the harness

When a run surfaces a problem with a harness, fix the **source**, then regenerate:

- Phase order / loop / branch shape → the Pipeline note's `phases:`.
- A phase's one-line intent → that Mold's `summary`.
- Loop-termination prose → that Mold's `loop_endstate`.
- A bespoke `## Notes` bullet → the pipeline's `harness_notes:` array.
- Whether a phase is a real invocation or a MANUAL checkpoint → cast the Mold (`foundry-build cast <slug>`).

Then rerun the command above and confirm `make check-assemble-pipelines` is clean.
