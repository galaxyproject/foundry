# Run summary — ga4gh-challenge-cwl-galaxy-5step

## Scenario

Test-drive phases 1–5 of `content/pipelines/cwl-to-galaxy.md` against
`workflow-fixtures/cwl/Barski-Lab__ga4gh_challenge/biowardrobe_chipseq_se.cwl`
(SHA `f28d47b`, cwlVersion `v1.0`, 1 main workflow + 1 nested workflow + 12 CommandLineTools).

## Molds exercised

| # | Mold | Mode | Output |
| --- | --- | --- | --- |
| 1 | `summarize-cwl` | emulation + `cwltool --validate` + `cwltool --pack` + extract.mjs + `foundry validate-summary-cwl` | `summary-cwl.json` (160 KB, valid) |
| 2 | `cwl-summary-to-galaxy-interface` | emulation | `cwl-galaxy-interface.md` |
| 3 | `cwl-summary-to-galaxy-data-flow` | emulation | `cwl-galaxy-data-flow.md` |
| 4 | `compare-against-iwc-exemplar` | emulation against local `iwc-format2/epigenetics/` | `iwc-comparison-notes.md` |
| 5 | `cwl-summary-to-galaxy-template` | emulation + `gxwf validate --no-tool-state` | `galaxy-workflow-draft.gxwf.yml` (structural validation OK) |

## Inputs consumed

- `workflow-fixtures/cwl/Barski-Lab__ga4gh_challenge/biowardrobe_chipseq_se.cwl` @ `f28d47b`.
- `~/projects/repositories/workflow-fixtures/iwc-format2/epigenetics/chipseq-sr/chipseq-sr.gxwf.yml` (IWC mirror; step 4).

## Outputs produced (all under run dir)

- `normalized/biowardrobe_chipseq_se.packed.json` (cwltool --pack output, since `cwl-normalizer` was broken — see process notes)
- `summary-cwl.json` (valid against `summary-cwl` schema)
- `extract.mjs` (one-off extractor script)
- `cwl-galaxy-interface.md`
- `cwl-galaxy-data-flow.md`
- `iwc-comparison-notes.md`
- `galaxy-workflow-draft.gxwf.yml`

## Eval results

### summarize-cwl

| Case | Verdict | Note |
| --- | --- | --- |
| user-guide simple validates | N/A | run targeted ga4gh fixture, not user_guide |
| scatter recorded | N/A | source has no scatter |
| nested workflow preserved | ✅ | `#bam-bedgraph-bigwig.cwl` retained as a `tools[]` entry with a `_NestedWorkflow` hint; `steps[].run_class` would be `Workflow` for the corresponding step (translated to `Workflow` because the run target's class is `Workflow`). |
| conditional `when:` | N/A | source has no `when:` |
| cross-document refs resolve | ✅ | All 12 tools + 1 nested workflow appear in `tools[]`; no unresolved `run:` strings |
| step input shape fields survive | ✅ | `steps[].in[]` carries `source`, `default`, `value_from`, `link_merge`, `pick_value` (mostly null for this fixture but shape present) |
| **high-level** | ⚠ | Output validates against schema and is faithful. Concern: I produced this with a one-off `extract.mjs` (not the Mold), because no CLI implementation of `summarize-cwl` exists yet. The CLI claim in `SKILL.md` ("Required Tools: cwl-normalizer, cwltool, foundry") implies the LLM does the extraction at runtime — workable, but for a 14-doc workflow the schema is large enough that a CLI implementation is plainly the right path. |

### cwl-summary-to-galaxy-interface

| Case | Verdict | Note |
| --- | --- | --- |
| secondaryFiles flagged | N/A | source has no `secondaryFiles` |
| outputs testable | ✅ | 18 stable output labels named; the `null|File`-flowing macs2 outputs are flagged |
| downstream Mold can consume | ✅ | data-flow brief consumed it without re-deriving from CWL |
| **high-level** | ✅ | The brief consciously surfaces the Directory→Galaxy mapping as an open question rather than picking blindly. Good fit. |

### cwl-summary-to-galaxy-data-flow

| Case | Verdict | Note |
| --- | --- | --- |
| secondaryFiles plumbing | N/A | source has no `secondaryFiles` |
| no invented Tool Shed IDs | ✅ | placeholders only; one IUC candidate named in the IWC-comparison step, not in the data-flow brief |
| pickValue not silently dropped | N/A | no pickValue |
| ExpressionTool surfaced | N/A | no ExpressionTool |
| template Mold can consume | ✅ | step 5 used the brief directly |
| **high-level** | ✅ | The fixture has very little translation pressure (no scatter, no when, no pickValue, no expressions at workflow boundary). The brief stayed lighter than nextflow-to-galaxy peers, as the SKILL.md said to. |

### compare-against-iwc-exemplar

| Case | Verdict | Note |
| --- | --- | --- |
| nf-core/rnaseq exemplar | N/A | this run is CWL, not nf-core |
| viralrecon | N/A | as above |
| mag | N/A | as above |
| no acceptable exemplar | N/A | exemplar found |
| IWC clone reuse | ✅ | used existing `~/projects/repositories/workflow-fixtures/iwc-format2/` mirror; no clone needed |
| **high-level** | ⚠ | Found nearest IWC exemplar at medium-high confidence (`chipseq-sr`) and surfaced 6 actionable diffs. Concern: every eval-defined case is nf-core-flavored; **the Mold has zero CWL-flavored cases in `eval.md`**. This run is unscored by the existing eval. Refinement candidate. |

### cwl-summary-to-galaxy-template

| Case | Verdict | Note |
| --- | --- | --- |
| draft is a stub, not runnable | ✅ | 12 `tool_id: TODO`, 12 `tool_version: TODO`, all step inputs/outputs use `TODO_*` placeholders, but topology is fully wired |
| preserves prior decisions | ✅ | 18 named outputs match interface brief; the Directory open question is carried into `_plan_context` |
| TODO placeholders actionable | ✅ | Each `_plan_context` names source `baseCommand`, DockerRequirement, Tool Shed candidate (or "expect to author") |
| collection inputs gxformat2-shaped | ✅ | Non-TODO surfaces parse: `gxwf validate --no-tool-state` reports `Structural validation: OK` |
| outputs labeled | ✅ | 18 outputs named per the interface brief |
| IWC findings traceable | ✅ | IWC-alignment alternatives written into `_plan_context` so the per-step Mold can see them, not silently applied |
| **high-level** | ✅ | Draft structurally validates. The `_plan_context` payload is heavy but useful — it carries the Docker URIs, baseCommands, and Tool Shed candidates the per-step authoring Mold will need. |

## Refinement entries written

- `content/molds/summarize-cwl/refinements/2026-05-11-ga4gh-challenge-cwl-galaxy-5step.md` — `decision: open-question`
- `content/molds/compare-against-iwc-exemplar/refinements/2026-05-11-ga4gh-challenge-cwl-galaxy-5step.md` — `decision: eval-add`

## Process observations

1. **Cast drift on 4 of 5 Molds.** `npm run cast --check` reported drift; reconciled deterministically (no `pending_llm` follow-up needed). Drift caused by upstream changes to `content/research/galaxy-collection-semantics.md` and the `summaryCwlSchema` package export. After re-cast, `summarize-cwl` verify reports `error: _provenance.json: /refs/1/kind must be equal to one of the allowed values` for its CLI refs; the other 3 Molds verify clean. Worth investigating separately — not blocking emulation.
2. **Build was required.** `npm run cast` failed initially with `Cannot find package '@galaxy-foundry/foundry'` — had to run `pnpm --filter @galaxy-foundry/foundry build` before `npm run packages-build` could succeed. The `make validate` / `make test` happy path is fine, but the cast pipeline assumes packages are already built.
3. **`cwl-normalizer` is broken on current cwl-utils.** Calling `uvx --from cwl-utils cwl-normalizer` errors on `ruamel.yaml.round_trip_load` (removed in newer ruamel). Fell back to `cwltool --pack` for normalization. The `summarize-cwl` SKILL.md names `cwl-normalizer` as a required tool — should either pin an older `cwl-utils` or document the `cwltool --pack` fallback.
4. **No `summarize-cwl` CLI.** The Mold's SKILL.md procedure assumes the LLM reads packed CWL and emits `summary-cwl.json` itself. For this 14-document workflow, I wrote a one-off `extract.mjs` to do the structural extraction deterministically; the LLM filled in the warnings/source-record metadata. This is workable for emulation but suggests a `foundry summarize-cwl` companion to `foundry summarize-nextflow` would pay for itself.

## Cross-cutting open questions

1. CWL Directory → Galaxy reference-data-table is recurring; pattern page candidate.
2. Conditional steps in source CWL (null/File flowing to non-null sink) have no clean gxformat2 expression; current draft accepts downstream-failure semantics. Sibling-workflow split is the only fidelity-preserving alternative.
3. `compare-against-iwc-exemplar` eval has no CWL-source-shaped case.
4. `summarize-cwl` evidence-extraction step is missing a CLI counterpart to `summarize-nextflow`.
5. Cast verify error on `summarize-cwl` provenance (`refs[1].kind` enum violation) needs investigation independent of this run.

## Follow-ups

- Continue the pipeline past phase 5: `discover-or-author` loop on the 12 tools (6 likely-IUC, 5 expect-author, 1 ambiguous). The draft's `_plan_context` is already shaped for that work.
- Open an issue / refinement for the missing CLI implementation of `summarize-cwl`.
- Open an issue for the `cwl-normalizer` breakage; either pin cwl-utils or update the SKILL.md to permit `cwltool --pack` as the normalization fallback.
- Open an issue for cast verify error on `summarize-cwl` (`/refs/1/kind`).
- Open an issue (or refinement) to add CWL-source eval cases to `compare-against-iwc-exemplar`.
