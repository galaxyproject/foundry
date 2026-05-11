# Run summary — cwl-userguide-1st-workflow

## Scenario as run

User: "test drive the first 5 steps of a CWL workflow" → drove the first five
phases of `content/pipelines/cwl-to-galaxy.md` end-to-end against a single CWL
fixture by emulation.

## Inputs consumed

- Pipeline source: `content/pipelines/cwl-to-galaxy.md` (first 5 phases).
- Workflow fixture: `workflow-fixtures/cwl/common-workflow-language__user_guide/src/_includes/cwl/workflows/1st-workflow.cwl` (+ sibling `tar-param.cwl`, `arguments.cwl`, `1st-workflow-job.yml`), pinned at `common-workflow-language/user_guide @ 546b3844c9e6ea0b2c4700a876e5f96c4de15480`.
- IWC corpus: shared mirror at `~/projects/repositories/workflow-fixtures/iwc-format2/`.

## Molds exercised (all emulation; no CLI Molds in this slice)

1. **summarize-cwl** — emulation. Cast clean before run.
2. **cwl-summary-to-galaxy-interface** — emulation. Cast had pre-existing drift; re-cast before run.
3. **cwl-summary-to-galaxy-data-flow** — emulation. Cast had pre-existing drift; re-cast before run.
4. **compare-against-iwc-exemplar** — emulation. Cast clean before run.
5. **cwl-summary-to-galaxy-template** — emulation. Cast had pre-existing drift; re-cast before run.

## Outputs produced (paths under run dir)

| Mold | Output artifact | File |
| --- | --- | --- |
| summarize-cwl | `summary-cwl` | `summary-cwl.json` (validates) |
| cwl-summary-to-galaxy-interface | `cwl-galaxy-interface` | `cwl-galaxy-interface.md` |
| cwl-summary-to-galaxy-data-flow | `cwl-galaxy-data-flow` | `cwl-galaxy-data-flow.md` |
| compare-against-iwc-exemplar | `iwc-comparison-notes` | `iwc-comparison-notes.md` |
| cwl-summary-to-galaxy-template | `galaxy-workflow-draft` | `galaxy-workflow-draft.gxwf.yml` |

## Eval results

### summarize-cwl

| Case | Bucket | Status | Note |
| --- | --- | --- | --- |
| official user-guide simple workflow validates | schema | ❌ partial | `summary-cwl.json` is **schema-valid** (`validate-summary-cwl: valid`), but emulation **could not run `cwltool --validate` or `cwl-normalizer`** (cwltool not installed). `documents.validation.status = "not-run"`, `documents.normalized_path = null`. Structural extraction passes the assertions (inputs/outputs/step ids/tool refs/graph edges all populated). |
| official user-guide scatter workflow records scatter | fidelity | N/A | not exercised this run. |
| official user-guide nested workflow preserves boundary | fidelity | N/A | not exercised this run. |
| cwl v1.2 conditional workflow records when | fidelity | N/A | not exercised this run. |
| cross-document run references resolve | fidelity | ⚠️ partial | Sibling `tar-param.cwl` + `arguments.cwl` resolved by-hand; both appear in `tools[]`; every `steps[].run` (`tar-param.cwl`, `arguments.cwl`) maps to a `tools[].id`. No `normalized_path` because cwl-normalizer didn't run. No "missing document" warnings emitted. Assertion semantics met; mechanism asserted by the eval (cwl-normalizer) not exercised. |

### cwl-summary-to-galaxy-interface

No `eval.md` exists. **Gap.** Recommend writing one before the Mold leaves draft.

### cwl-summary-to-galaxy-data-flow

No `eval.md` exists. **Gap.**

### compare-against-iwc-exemplar

| Case | Status | Note |
| --- | --- | --- |
| nf-core rnaseq nearest exemplar | N/A | not a Nextflow run. |
| nf-core viralrecon nearest exemplar | N/A | not a Nextflow run. |
| nf-core mag nearest exemplar | N/A | not a Nextflow run. |
| no acceptable exemplar | ✅ | Verdict was "no nearest exemplar" (Java compilation outside IWC scope); top weak candidates not enumerated because none exist; refused to upgrade confidence on tool-overlap. |
| IWC clone reuse | N/A | used shared mirror directly, did not invoke clone-or-pull procedure. |

**Coverage gap**: every concrete case in `eval.md` is keyed off a Nextflow pipeline. None targets a CWL upstream. The Mold is also part of the CWL → Galaxy pipeline and should have at least one CWL-anchored case.

### cwl-summary-to-galaxy-template

No `eval.md` exists. **Gap.**

## Refinement entries written

- `content/molds/cwl-summary-to-galaxy-interface/refinements/2026-05-11-cwl-userguide-1st-workflow.md` — `eval-add`
- `content/molds/cwl-summary-to-galaxy-data-flow/refinements/2026-05-11-cwl-userguide-1st-workflow.md` — `eval-add`
- `content/molds/cwl-summary-to-galaxy-template/refinements/2026-05-11-cwl-userguide-1st-workflow.md` — `eval-add`
- `content/molds/compare-against-iwc-exemplar/refinements/2026-05-11-cwl-userguide-1st-workflow.md` — `eval-add`
- `content/molds/summarize-cwl/refinements/2026-05-11-cwl-userguide-1st-workflow.md` — `open-question`

## Process observations

- Casts for `cwl-summary-to-galaxy-{interface,data-flow,template}` were stale before this run; `npm run cast -- <name> --target=claude` reconciled them. After casting they re-checked clean. The `summary-cwl-schema` package needed `pnpm --filter @galaxy-foundry/summary-cwl-schema build` before `validate-summary-cwl` was available; cast drift had hidden this.
- `cwltool` is not installed in the emulation environment. `summarize-cwl`'s declared procedure leans on `cwltool --validate` and `cwl-normalizer`. Emulation produced a schema-valid summary by hand-walking the YAML, but the validation/normalization assertions in the eval ride on those external tools. Worth deciding whether to document the dependency in the cast bundle, or whether the skill should degrade gracefully (emit `not-run` + warnings) when the tools are absent — both paths are currently undocumented.
- IWC corpus available via the shared mirror at `~/projects/repositories/workflow-fixtures/iwc-format2/`. `compare-against-iwc-exemplar`'s declared procedure says to clone-or-pull to `~/.foundry/iwc`; the shared mirror short-circuits this. Bundle reference is ambiguous about the alternate location.
- `1st-workflow.cwl` is a non-bioinformatics CWL teaching example. The pipeline produced a sensible "no exemplar / wrapper authoring" track. Useful smoke test, but a bio-domain CWL fixture (e.g., `EBI-Metagenomics/pipeline-v5` if materialized, or one of the `bio-cwl-tools` flows wrapped in a `Workflow`) would exercise the IWC-match path and the collection-semantics branches that this run skipped entirely.

## Cross-cutting open questions

- 3 of 5 Molds in this slice ship no `eval.md`. Convention for Galaxy-targeting design-brief Molds is unsettled — what does a "case" look like when the output is a Markdown brief, not a deterministic JSON?
- `compare-against-iwc-exemplar` eval has no CWL-source case. Should the eval grow source-specific buckets, or rotate one of the Nextflow cases to a CWL counterpart?
- `summarize-cwl`'s relationship to `cwltool`/`cwl-utils`: hard dep, optional, or pluggable? Affects both the cast bundle's runtime contract and the eval's mechanism assertions.
- Run-dir-as-research-artifact convention works fine here, but no policy on lifetime / cleanup. Currently `_emulated-runs/` is treated as gitignored; the test-drive skill mentions a hypothetical `--commit` mode for regression checks but it is not implemented.

## Suggested follow-ups

- Open an issue: "Galaxy-targeting design-brief Molds need eval.md skeletons" (covers interface, data-flow, template across CWL / Nextflow / Paper).
- Open an issue: "summarize-cwl: graceful degradation when cwltool/cwl-utils unavailable".
- Re-run the same five steps against a bio-domain CWL fixture (EBI-Metagenomics or a small bio-cwl-tools-derived flow) to exercise collection semantics + IWC matching.
- Promote the interface/data-flow `eval-add` refinement entries into actual `eval.md` drafts.
