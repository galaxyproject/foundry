# Run summary — mgnify-seqprep-subwf

## Scenario as run

Re-run of the CWL → Galaxy first-5-phases test-drive against a **bio CWL
fixture** (`EBI-Metagenomics/pipeline-v5 @ v5.0.7` →
`workflows/subworkflows/seqprep-subwf.cwl`). Picked specifically to exercise
features `cwl-userguide-1st-workflow` skipped: optional types, `when:`
conditionals on every step, `pickValue: first_non_null` fan-in, paired
collection semantics, an actual IWC-corpus match.

## Inputs consumed

- Pipeline source: `content/pipelines/cwl-to-galaxy.md` (first 5 phases).
- Workflow fixture: `workflow-fixtures/cwl/EBI-Metagenomics__pipeline-v5/workflows/subworkflows/seqprep-subwf.cwl` (+ sibling tools `count_lines.cwl`, `fastp.cwl`, `multiple-gunzip.cwl`, `seqprep.cwl`).
- IWC corpus: shared mirror at `~/projects/repositories/workflow-fixtures/iwc-format2/`.

## Molds exercised (all emulation)

1. **summarize-cwl** — emulation.
2. **cwl-summary-to-galaxy-interface** — emulation.
3. **cwl-summary-to-galaxy-data-flow** — emulation.
4. **compare-against-iwc-exemplar** — emulation. **Found high-confidence nearest exemplar** this run.
5. **cwl-summary-to-galaxy-template** — emulation. Used exemplar pins.

## Outputs produced (paths under run dir)

| Mold | Output artifact | File |
| --- | --- | --- |
| summarize-cwl | `summary-cwl` | `summary-cwl.json` (validates) |
| cwl-summary-to-galaxy-interface | `cwl-galaxy-interface` | `cwl-galaxy-interface.md` |
| cwl-summary-to-galaxy-data-flow | `cwl-galaxy-data-flow` | `cwl-galaxy-data-flow.md` |
| compare-against-iwc-exemplar | `iwc-comparison-notes` | `iwc-comparison-notes.md` |
| cwl-summary-to-galaxy-template | `galaxy-workflow-draft` | `galaxy-workflow-draft.gxwf.yml` (paired-mode only; sibling `-single.gxwf.yml` deferred) |

## Eval results

### summarize-cwl

| Case | Status | Note |
| --- | --- | --- |
| official user-guide simple workflow validates | N/A | not this fixture. |
| official user-guide scatter workflow records scatter | N/A | not this fixture. |
| official user-guide nested workflow preserves boundary | N/A | not this fixture. |
| cwl v1.2 conditional workflow records when | ⚠️ partial | not the eval-case fixture, but **this run exercised the same feature**: every step in seqprep-subwf has a `when:` clause; all six recorded verbatim in `steps[].when`. Validator passes. **Suggests the eval should grow a "non-user-guide conditional" case using this fixture.** |
| cross-document run references resolve | ⚠️ partial | All four `steps[].run` (`count_lines.cwl`, `fastp.cwl`, `multiple-gunzip.cwl`, `seqprep.cwl`) appear in `tools[]`. Same caveat as last run — `cwl-normalizer` didn't actually run; the resolution mechanism is hand-walking. |

**Schema-level highlight**: `cwlVersion: v1.2.0-dev2` is allowed by the `cwl_version: string` field but is a pre-release tag. Worth either narrowing the enum or warning explicitly. Captured in the summary's `warnings[]`.

### cwl-summary-to-galaxy-interface

No `eval.md`. Output **exercised non-trivial decision pressure** missing from the first run: optional input collapse (3 File? → 1 paired collection + 1 dataset + a `reads_mode` switch), scalar workflow output handling (the int read count), `pickValue` translation.

### cwl-summary-to-galaxy-data-flow

No `eval.md`. Output exercised:
- Two-branch CWL → Galaxy translation pressure.
- Anti-pattern flagging (unzip-just-to-pass-through; bespoke read counter likely replaceable).
- `when:` predicate → Galaxy step `when:` mapping.
- `pickValue: first_non_null` translation candidates.

### compare-against-iwc-exemplar

| Case | Status | Note |
| --- | --- | --- |
| nf-core rnaseq nearest exemplar | N/A | not a Nextflow run. |
| nf-core viralrecon nearest exemplar | N/A | not a Nextflow run. |
| nf-core mag nearest exemplar | N/A | not a Nextflow run. |
| no acceptable exemplar | N/A | this run is the opposite — high-confidence match exists. |
| IWC clone reuse | N/A | shared mirror, no clone-or-pull. |

**Filling a real gap**: this run is the first time `compare-against-iwc-exemplar` was driven against a CWL upstream that actually matches an IWC entry. The Mold's procedure worked and emitted concrete tool pins (`iuc/fastp/fastp/0.24.1+galaxy0`, `bgruening/mgnify_seqprep/mgnify_seqprep/1.2+galaxy0`, `__UNZIP_COLLECTION__`). **The eval should grow a CWL "high-confidence exemplar found" case using this fixture as evidence.**

### cwl-summary-to-galaxy-template

No `eval.md`. Output exercised:
- IWC-exemplar-driven template restructuring (split paired/single into two workflows rather than encoding the CWL switch).
- Concrete `tool_id` + `tool_shed_repository` carried from the exemplar.
- Drop-a-CWL-step (count_lines.py) based on IWC precedent.
- Sibling-workflow emission: the template produced **one** workflow file and noted that a second is needed. Open question on whether one Mold invocation should emit multiple files.

## Refinement entries written

- `content/molds/summarize-cwl/refinements/2026-05-11-mgnify-seqprep-subwf.md` — `eval-add`
- `content/molds/cwl-summary-to-galaxy-interface/refinements/2026-05-11-mgnify-seqprep-subwf.md` — `eval-add`
- `content/molds/cwl-summary-to-galaxy-data-flow/refinements/2026-05-11-mgnify-seqprep-subwf.md` — `eval-add`
- `content/molds/compare-against-iwc-exemplar/refinements/2026-05-11-mgnify-seqprep-subwf.md` — `eval-add`
- `content/molds/cwl-summary-to-galaxy-template/refinements/2026-05-11-mgnify-seqprep-subwf.md` — `open-question`

## Process observations

- `cwlVersion: v1.2.0-dev2` plus referenced tools at `v1.0` produced a mixed-version document tree; emulation worked because the structural mapping doesn't care, but a real `cwltool --validate` may refuse or upgrade. Warning is in the summary.
- IWC corpus was browsable by simple grep; `grep -rl "fastp" iwc-format2/` was sufficient to surface the MGnify amplicon ports without needing `convert`/`gxwf`. The bundle's `references/cli/convert.json` is reachable but wasn't needed for this run.
- Interface + data-flow briefs **needed** the IWC exemplar to make confident choices about `pickValue` translation and the `reads_mode` switch. Running them before the comparison Mold gave thin briefs; the comparison Mold's output materially restructured the template. Suggests the pipeline ordering is right — comparison sits between data-flow and template for a reason — but the upstream briefs should carry "deferred to IWC comparison" flags more explicitly.

## Cross-cutting open questions (new this run, on top of previous)

- **`cwl-summary-to-galaxy-template` and sibling-workflow emission**: when IWC convention is "one mode = one workflow file", does one Mold invocation emit multiple files? Or does the harness invoke the template Mold N times, once per mode? Current draft handled it by emitting paired-only and leaving a note; not a stable contract.
- **`summarize-cwl` cwlVersion handling**: the schema's `cwl_version: ["string", "null"]` is too permissive for the validation case to lean on. Should it enum-check, or warn on non-canonical versions?
- **CWL summary `int` workflow outputs**: structurally fine (schema allows it via the WorkflowOutput.type free-form string), but downstream design briefs need a pattern for it. Open work that bridges Mold boundaries.

## Suggested follow-ups

- Promote the four `eval-add` refinement entries (this run × the previous run) into actual `eval.md` drafts; the MGnify fixture is a real test case for at least four of the five Molds in this slice.
- Drive phases 6–N (`discover-or-author` loop) on the IWC-pin-equipped paired-mode draft. The pins from this run should let `discover-shed-tool` validate quickly without a Tool Shed search.
- Run a *third* test-drive against a CWL workflow with **scatter** (`scatter-workflow.cwl` from the user guide) so the collection-semantics path also has a concrete refinement.
