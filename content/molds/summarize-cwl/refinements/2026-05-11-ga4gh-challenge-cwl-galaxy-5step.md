---
mold: summarize-cwl
date: 2026-05-11
intent: 5-step CWL→Galaxy emulation on Barski-Lab/ga4gh_challenge biowardrobe_chipseq_se.cwl
decision: open-question
---

## What worked

- Procedure as written is sufficient: `cwltool --validate` → normalize → extract structure → schema-validate. The fixture (1 main workflow, 1 nested workflow, 12 CommandLineTools, no scatter/when/pickValue) sat comfortably inside the schema.
- The `summary-cwl` schema accommodated the fixture with no edits — including the nested workflow (treated as a `Workflow`-class entry in `tools[]` with a `_NestedWorkflow` hint in `requirements/raw`).
- Validation against `foundry validate-summary-cwl` caught real authoring bugs (graph-node `kind` enum, `provenance: string`, `diagnostics: string[]`). Schema-as-contract held.

## Gaps surfaced

1. **`cwl-normalizer` is broken with current `cwl-utils` + `ruamel.yaml`.** `uvx --from cwl-utils cwl-normalizer` errors with `'round_trip_load_all()' has been removed`. The skill bundle names `cwl-normalizer` as a required tool but it's unusable as of this run. Working alternative: `cwltool --pack` produces a `$graph`-bundled JSON document that is structurally equivalent for extraction purposes and is what this run used. The SKILL.md should either pin a working `cwl-utils` version or accept `cwltool --pack` as the normalization step.

2. **No CLI implementation.** `summarize-nextflow` has a deterministic CLI (`foundry summarize-nextflow ...`); `summarize-cwl` does not. The procedure expects the LLM to read the packed CWL document and emit `summary-cwl.json` directly. For a 14-document workflow that's ~3700 lines of normalized JSON and ~160 KB of output — feasible but expensive per run, and easy to get the enum/type fields wrong. I had to write a 130-line one-off `extract.mjs` to do the structural extraction deterministically. A `foundry summarize-cwl` companion would pay for itself fast and would make `eval.md`'s `check: deterministic` cases meaningfully deterministic.

3. **Cast verify error on `summarize-cwl`.** After re-cast, `scripts/cast-skill-verify.ts summarize-cwl --target=claude` reports `error: _provenance.json: /refs/1/kind must be equal to one of the allowed values` for refs `1` and `2` (the two `cli-command` references). The other 4 CWL→Galaxy Molds verify clean. Worth investigating whether the `kind: cli-command` value or the verify schema is the outlier.

## Open questions

- Should the SKILL.md's "Required Tools" be updated to either pin a working `cwl-utils` or accept `cwltool --pack` as the normalization step?
- Is `foundry summarize-cwl` worth scoping as a CLI?
- What's the right shape for representing a nested CWL `Workflow` in `tools[]`? This run used a `_NestedWorkflow`-classed entry inside `requirements`; the schema accepts it but does not endorse it.
