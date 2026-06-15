# Run summary — INTERVIEW → GALAXY / "MRSA mobile-AMR context across isolates"

Driven via `/test-pipeline interview-to-galaxy "MRSA mobile-AMR context across isolates"`.
Scenario = `content/pipelines/interview-to-galaxy/scenarios.md` → *Case: MRSA mobile-AMR context across isolates*.

## Scenario as run

Interview result supplied as the saved issue body `examples/UC1_MRSA_issue.md`
(galaxy-brain #12). Aspirational (unvalidated) target: `examples/UC1_MRSA_extracted.ga`
(14-step extracted history). Drove the full 11-phase spine in one run dir.

## Molds exercised (in spine order)

| phase | mold | how run |
|---|---|---|
| 1 | interview-to-freeform-summary | emulation (read cast SKILL.md) |
| 2 | freeform-summary-to-galaxy-interface | emulation |
| 3 | freeform-summary-to-galaxy-data-flow | emulation |
| 4 | compare-against-iwc-exemplar | emulation + **real IWC corpus** (local iwc-format2 mirror) |
| 5 | freeform-summary-to-galaxy-template | emulation + **`gxwf draft-validate` (real)** |
| 6 | advance-galaxy-draft-step `[loop]` | **real `gxwf draft-next-step`/`draft-extract`/`draft-validate`** + 1 emulated concretization iteration |
| 7 | `[branch]` test-data-resolution → find-test-data \| user-supplied | emulated from eval contract (**no cast bundle**) → routed `user-supplied` |
| 8 | implement-galaxy-workflow-test | emulation + **real `gxwf validate-tests` (schema + cross-check)** |
| 9 | validate-galaxy-workflow | **real `gxwf validate`** on concrete subset |
| 10 | run-workflow-test | **blocked** — no planemo / Galaxy in env |
| 11 | debug-galaxy-workflow-output | **N/A** — no failed run to debug; also no cast bundle |

## Inputs consumed

- `content/pipelines/interview-to-galaxy/examples/UC1_MRSA_issue.md` (interview result, binding fixture).
- IWC corpus: `~/projects/repositories/workflow-fixtures/iwc-format2/bacterial_genomics/amr_gene_detection/` (nearest exemplar).
- `content/pipelines/interview-to-galaxy/examples/UC1_MRSA_extracted.ga` (compare-and-contrast target + emulated discovery source for tool_ids/ports/changesets).

## Outputs produced (under this run dir)

- `freeform-summary.md`
- `freeform-galaxy-interface.md`
- `freeform-galaxy-data-flow.md`
- `iwc-comparison-notes.md` + `iwc-exemplar.gxwf.yml`
- `galaxy-workflow-draft.gxwf.yml` (template draft; all 11 steps drafty, topology concrete; `draft valid`)
- `galaxy-workflow-draft.iter1.gxwf.yml` (loop: integronfinder concretized)
- `concrete-subset.gxwf.yml` (draft-extract of iter1; terminal-validates OK)
- `test-data-refs.json` (all inputs `resolved:false` → user-supplied)
- `galaxy-workflow-tests.yml` (test skeleton; schema + label cross-check OK)

## Eval results

### Per-step composition (member Mold eval.md applied to that step's output)

| phase / mold | property | verdict |
|---|---|---|
| 1 interview-to-freeform-summary | handoff fidelity preserves interview facts | ✅ |
| | no invented specificity | ✅ (reshape tool, classify rules, distance cutoff left open) |
| | shared shape with summarize-paper | ✅ |
| 2 interface | primary data surface identified | ✅ (list<fasta> primary; metadata not over-promoted) |
| | sample-sheet / per-sample metadata preserved | ✅ (list keyed by isolate id) |
| | output labels testable | ✅ (JBrowse/figures flagged non-workflow) |
| | uncertainty carried, not invented | ✅ |
| | downstream data-flow can consume | ✅ |
| 3 data-flow | preserves source analysis intent | ✅ |
| | operations classified, not guessed | ✅ (closest=corpus-gap tool need) |
| | collection shape survives across nodes | ✅ (identifier-sync called load-bearing) |
| | unresolved tool needs bounded | ✅ (shapes, no Tool Shed IDs) |
| | template can consume the draft | ✅ |
| 4 compare-against-iwc-exemplar | nearest exemplar + confidence + citation | ✅ (amr_gene_detection, **Medium**) |
| | selection domain-aligned, confidence justified | ✅ |
| | structural diff names real alignments/mismatches | ✅ |
| | no forced nearest | N/A (exemplar exists) |
| | generic-tool overlap not high conf | ✅ (staramr is domain-specific) |
| | gxformat2 view surfaced (sibling + inline excerpt) | ✅ *(initially missed inline excerpt + used "Medium-High"; corrected mid-run)* |
| | inline excerpt is relevant subgraph | ✅ |
| | corpus reuses local clone / offline-tolerant | ✅ (used local mirror) |
| 5 template | *(Mold has **no eval.md/scenarios.md**)* | high-level: ✅ topology fully resolved, only wrapper-tier TODO, `draft valid`, IWC-aligned, open Qs carried |
| 6 advance-loop | draft-next-step picks deterministically + stable | ✅ (picks `integronfinder`; stable) |
| | fully concrete terminates loop | ✅ (exemplar → `draft:false`) |
| | well-formed draft validates clean `--concrete` | ✅ (drafty steps excluded, not malformed) |
| | extract = maximal concrete prefix | ✅ (all-drafty → inputs only) |
| | one invocation advances one step | ✅ (integronfinder → next pick `isescan`) |
| | implemented step leaves no TODO | ✅ (`grep TODO`=0 on step; real port `integrons_table`; downstream repointed) |
| | round-trips to oracle | N/A (no fixture oracle for this scenario) |
| | terminates without per-step work on concrete | ✅ |
| | no shed candidate → authoring | ⚠ design: classify_context (no tool + undefined rules) is the fall-through case; not executed (no live shed) |
| | `--concrete` failure routes to right surface | ⚠ design: mobile_to_bed 2-input→awk arity mismatch is the routing case; documented, not executed |
| 7 find-test-data | no fabricated references | ✅ (accessions kept `resolved:false`) |
| | shape & datatype match | ✅ |
| | full input coverage | ✅ (every input one entry) |
| 8 implement-galaxy-workflow-test | tests-format schema gate | ✅ (`OK`) |
| | workflow/test cross-check gate | ✅ (`OK`, zero missing labels) |
| | static CLI validation | ✅ |
| | managed Galaxy runtime green | ❌ N/A — no planemo/Galaxy |
| 9 validate-galaxy-workflow | terminal validate (concrete) | ✅ concrete subset OK; correctly **rejects** drafty full wf |
| 10 run-workflow-test | structured Planemo capture / modes / failure handoff | ❌ blocked — no runtime |
| 11 debug-galaxy-workflow-output | — | N/A (no failed run; no cast) |

### Pipeline-level oracle

No `content/pipelines/interview-to-galaxy/eval.md` exists → oracle = scenario `expect:` + compare-and-contrast.

| scenario `expect:` assertion | verdict |
|---|---|
| gxformat2 workflow validates and round-trips | ⚠ **partial** — draft validates; concrete subset terminal-validates; **full concrete validate+roundtrip not reached** (loop incomplete: no Tool Shed/tool cache) |
| isolate-assembly collection as primary input | ✅ `MRSA isolate assemblies` list<fasta> |
| staramr + ≥1 mobile-element caller preserved | ✅ staramr + ISEScan + IntegronFinder |
| mobile-context carried as real step / explicit decision, not dropped | ✅ `nearest_feature` + `classify_context` steps; classification rules carried as explicit open decision |
| per-isolate ARG summary/heatmap as output | ✅ `staramr_summary` + `arg_heatmap` promoted |

**Compare-and-contrast vs `UC1_MRSA_extracted.ga`:**

- **Closest-feature idiom: reached.** The run independently arrives at the same `bedtools closest -d` idiom the target uses — surfaced by the data-flow brief from the Foundry interval-patterns *corpus-gap* note, then carried through the template. Strong cross-validation.
- **Richer than the target on the science the issue asked for:** the target feeds **only ISEScan** into the distance computation (IntegronFinder runs but its calls are never used downstream) and has **no classification step** — the differential call is implicit. The run keeps **both** mobile-element callers in the design and adds an explicit `classify_context` step for the 5 context classes the issue enumerates. Per the scenario's "beat the target" framing, this is favorable.
- **Tools:** the run invents **no** tool beyond the target's set; tool_ids/ports/changesets used in the loop were harvested from the target `.ga` + the IWC exemplar (staramr pinned to the **IWC `iuc/staramr/...0.11.0+galaxy3`** rather than the target's `nml/...0.12.3` — corpus-first authority preferred; nml noted as alternative).
- **Stretch goals NOT met:** Bakta whole-genome annotation and a JBrowse locus view (the issue's "bonus" the manual build skipped) were **de-scoped** by the interface brief to enrichment/figure layers — the run did *not* pull them in, so it does not exceed the target there.
- **Template topology issue vs target:** the run's single `mobile_to_bed` step combines IS+integron in one reshape; the target uses separate single-input reshapes. The combined step doesn't map onto a single-input awk → a real arity mismatch the loop must fix (insert a concat).

## Process observations

- No `gxwf` on PATH; used `node_modules/.bin/gxwf`. No planemo, no Galaxy server, no `.venv`.
- **Cast bundles missing** for `find-test-data` and `debug-galaxy-workflow-output` (both phase members) — emulated phase 7 from eval contract; phase 11 N/A.
- `freeform-summary-to-galaxy-template` has **no eval.md and no scenarios.md** (all 10 other phase Molds have eval.md).
- `implement-galaxy-workflow-test` Procedure is a **stub** ("Replace with real skill content per MOLD_SPEC once first walks are done") and declares a `galaxy-test-plan` input with **no producer in the INTERVIEW→GALAXY spine** (only the nextflow/cwl pipelines have a `*-test-to-galaxy-test-plan` phase).
- `gxwf draft-next-step` has no `--json` flag (uses `--output-format json`); minor doc nit vs intuition.
- The advance loop could not reach a full concrete endstate in this environment: 8 distinct wrappers need live discover-shed-tool + a Galaxy tool cache for summarize-galaxy-tool/`tool_state` binding; hand-fabricating that state would violate the loop's own no-fabrication property.

## Cross-cutting open questions

- Should INTERVIEW→GALAXY (and PAPER→GALAXY) gain a freeform `*-test-to-galaxy-test-plan` phase, or should `implement-galaxy-workflow-test` make `galaxy-test-plan` formally optional?
- Should `find-test-data` and `debug-galaxy-workflow-output` be cast (they're live phase members but have no bundles)?
- Should the pipeline carry a `eval.md` (end-to-end oracle) so `/test-pipeline` has a pipeline layer beyond the scenario `expect:`?
- Does the template need a guard against emitting a multi-input reshape step that no single-input text tool can realize (the `mobile_to_bed` arity bug)?
