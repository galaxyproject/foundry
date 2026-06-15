---
description: Test-drive a single Mold against a scenarios.md case — run its cast, evaluate the output against eval.md properties.
argument-hint: "<mold> [scenarios.md case name or description]"
---

# Test-mold

Scoped entry point into `/test-drive` for one Mold. `$1` is `<mold-slug> [case]`.

This is `/test-drive` narrowed to a single Mold bound to a `scenarios.md` case. Follow `.claude/commands/test-drive.md` end to end; this file only fixes the scope and the scenario source. The eval↔scenario split is in `docs/EVAL_PHILOSOPHY.md`.

## Bind

- **Mold** — the first token of `$1` → `content/molds/<mold>/`.
- **Scenario** — the rest of `$1` selects a case from `content/molds/<mold>/scenarios.md`:
  - a `## Case:` name → bind that case's `fixture:` and carry its `expect:` assertions;
  - empty → list the cases and ask which (or run the small/cheap ones);
  - a free description → pick or synthesize the closest case, and note that it's ad-hoc.
- **Oracle** — `content/molds/<mold>/eval.md` (the `## Property:` set). The oracle is fixture-independent; it applies to whatever the scenario produces.

## Run

Follow `/test-drive` steps 1–7 for this one Mold:

1. Ensure the bound case's fixture is materialized (step 1).
2. Ensure the cast is current (step 2).
3. Drive the Mold by emulating `casts/claude/skills/<mold>/SKILL.md` (step 4), consuming the bound fixture. Prefer the CLI where the Mold ships one.
4. Evaluate (step 5): apply **every** `eval.md` property to the output (✅/❌/N/A), plus the bound case's `expect:` assertions. Use the deterministic `validate-*` check for `bucket: schema` properties.
5. Capture refinements (step 6) and write a run summary (step 7).

Report eval results in a table — properties × pass/fail, plus the case's `expect:` checks. Don't paper over misses; misses are the point of the run.
