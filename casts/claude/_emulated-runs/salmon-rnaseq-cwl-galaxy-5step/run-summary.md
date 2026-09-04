# Run summary — salmon-rnaseq-cwl-galaxy-5step

## Scenario

Test-drive phases 1–5 of `content/pipelines/cwl-to-galaxy.md` against
`workflow-fixtures/cwl/hubmapconsortium__salmon-rnaseq/pipeline.cwl`
(SHA `2f77bcf`, cwlVersion v1.2, 7 main steps + 1 nested `salmon-quantification.cwl` subworkflow
with 6 inner steps, 13 unique CommandLineTools).

User instruction: `cwl-utils` has a bug; build/use the patched checkout at
`/Users/jxc755/projects/repositories/cwl-utils` (branch `fix-normalizer-ruamel-018`).

## Molds exercised

| # | Mold | Mode | Output |
| --- | --- | --- | --- |
| 1 | `summarize-cwl` | emulation + `cwltool --validate` + `cwltool --pack` + `extract.mjs` + `foundry validate-summary-cwl` | `summary-cwl.json` (68 KB, valid) |
| 2 | `cwl-summary-to-galaxy-interface` | emulation | `cwl-galaxy-interface.md` |
| 3 | `cwl-summary-to-galaxy-data-flow` | emulation | `cwl-galaxy-data-flow.md` |
| 4 | `compare-against-iwc-exemplar` | emulation against local `~/projects/repositories/workflow-fixtures/iwc-format2/scRNAseq/` | `iwc-comparison-notes.md` |
| 5 | `cwl-summary-to-galaxy-template` | emulation + `gxwf validate --no-tool-state` | `galaxy-workflow-draft.gxwf.yml` (structural validation OK) |

## Inputs consumed

- `workflow-fixtures/cwl/hubmapconsortium__salmon-rnaseq/pipeline.cwl` @ `2f77bcf`.
- Nested `steps/salmon-quantification.cwl` read directly to recover `when:` / `pickValue` markers the summary lost.
- `~/projects/repositories/workflow-fixtures/iwc-format2/scRNAseq/*` (local IWC mirror).
- Patched `cwl-utils` from `/Users/jxc755/projects/repositories/cwl-utils` (branch `fix-normalizer-ruamel-018`), installed via `uv tool install --from <local-path> cwl-utils`.

## Outputs produced (all under the run dir)

- `normalized/pipeline.packed.json` — `cwltool --pack` output (used in lieu of `cwl-normalizer`, see process notes)
- `extract.mjs` — one-off extractor
- `summary-cwl.json` (valid against `summary-cwl` schema)
- `cwl-galaxy-interface.md`
- `cwl-galaxy-data-flow.md`
- `iwc-comparison-notes.md`
- `galaxy-workflow-draft.gxwf.yml`

## Eval results

### summarize-cwl

| Case | Verdict | Note |
| --- | --- | --- |
| user-guide simple validates | N/A | targets a different fixture |
| scatter recorded | ✅ | `steps.fastqc.scatter = ["fastq_dir"]`, edge to `fastqc/fastq_dir` carries `via: ["scatter"]` |
| nested workflow preserved | ⚠ | preserved as `tools[]` entry with `_NestedWorkflow` hint listing inner-step ids only. Inner `in:` / `out:` / `when:` / `pickValue` not captured. |
| conditional `when:` | ❌ | the nested `salmon` vs `salmon-mouse` `when:` predicates and the `pickValue: first_non_null` merge are absent from the summary. Main workflow has no `when:` so the missing inner markers are the only failures, but they are exactly the markers the downstream Molds need. |
| cross-document refs resolve | ✅ | all 13 tools + 1 nested workflow appear in `tools[]`; no unresolved `run:` strings |
| step input shape fields survive | ✅ | shape present (all null at main-workflow level for this fixture) |
| **high-level** | ⚠ | Output validates and is structurally faithful at the main-workflow level. The nested-workflow gap is the same issue as the ga4gh run but bites harder here because the salmon-rnaseq pipeline's real translation pressure lives inside the nested workflow. |

### cwl-summary-to-galaxy-interface

| Case | Verdict | Note |
| --- | --- | --- |
| secondaryFiles flagged | N/A | source has no `secondaryFiles` |
| outputs testable | ✅ | 26 stable output labels named; optional `null|File` outputs (scVelo / SquidPy / spatial branches) flagged separately |
| downstream Mold can consume | ✅ | data-flow brief consumed it without re-deriving from source CWL |
| **high-level** | ⚠ | Good shape but stalled on three Directory inputs and one Directory output for lack of a `cwl-directory-to-galaxy-collection` reference note. |

### cwl-summary-to-galaxy-data-flow

| Case | Verdict | Note |
| --- | --- | --- |
| secondaryFiles plumbing | N/A | none |
| no invented Tool Shed IDs | ✅ | placeholders only; IUC candidates mentioned only in IWC comparison brief |
| pickValue not silently dropped | ⚠ | the brief surfaces the `pickValue: first_non_null` on `salmon`/`salmon-mouse` and the recommended translation — but I had to read the nested CWL directly to find it, because the summary lost it. The Mold's *output* passes; the Mold's *honesty floor* (using only the summary) does not. |
| ExpressionTool surfaced | N/A | none |
| template Mold can consume | ✅ | step 5 used the brief directly |
| **high-level** | ⚠ | Same root cause as summarize-cwl: nested-workflow blindness. The brief did the right thing at the cost of cheating the contract. |

### compare-against-iwc-exemplar

| Case | Verdict | Note |
| --- | --- | --- |
| nf-core/rnaseq exemplar | N/A | this is CWL, not nf-core |
| viralrecon | N/A | as above |
| mag | N/A | as above |
| no acceptable exemplar | N/A (in spirit) | the brief honestly returned "no single exemplar" and used three partial slices — closest analogue is this case but it does not name a single weak candidate; it names three |
| IWC clone reuse | ✅ | reused local mirror |
| **high-level** | ⚠ | Same gap as the ga4gh run: every eval case is nf-core-flavored. Run unscored. Refinement entry filed. |

### cwl-summary-to-galaxy-template

| Case | Verdict | Note |
| --- | --- | --- |
| draft is a stub, not runnable | ✅ | TODO `tool_id` / `tool_version` / `tool_state` on every step; structural `gxwf validate` passes only because tool-state checking is skipped |
| preserves prior design decisions | ✅ | collapsed-salmon-alevin call, flattened nested workflow, `list:paired` per IWC, all consistent with the data-flow + IWC briefs |
| TODO placeholders are actionable | ✅ | every step's `_plan_context` carries the source CWL filename, the data-flow brief recommendation, and the IWC reference (when one exists) |
| collection inputs use gxformat2-compatible structure | ✅ | `type: collection`, `collection_type: list:paired`, `optional`, `restrictOnConnections` all valid |
| outputs labeled | ✅ | 27 workflow outputs match the interface brief's promoted/optional split |
| IWC findings are guidance, not hidden rewrites | ✅ | `list:paired` shape, `salmon-alevin` collapse, and `map_param_value` patterns are captured in `_plan_context`; low-confidence choices (decompose-vs-monolith for scanpy) live as `_plan_state` TODOs |
| **high-level** | ✅ | The brief is the most directly usable artifact of the run. The shape is right; the per-step TODOs are pointed enough that a sane `implement-galaxy-tool-step` pass would have signal to act on. |

## Process observations

- `cwl-normalizer` is still broken on v1.2 input. The user's `fix-normalizer-ruamel-018` patch fixes the ruamel-0.18 incompatibility (`round_trip_load_all` removal) but does not address the more fundamental bug: `normalizer.py:87` only upgrades `draft-3 | v1.0 | v1.1` and errors out on anything else, including v1.2. The error-format call shape is also broken (passes a tuple as a single arg to a 2-placeholder format string, which throws inside stdlib `logging`). Workaround: `cwltool --pack` produces the equivalent `$graph` JSON. Two separate issues worth filing upstream.
- `cwltool` writes INFO logs to stdout in some configurations; the first attempt to `> file 2>&1 | tail` polluted the JSON output. Real fix: `cwltool --pack <file> 2>/dev/null > out.json`. Worth mentioning in the SKILL.md procedure or in the `references/cli/cwltool.md` reference.
- `foundry validate-summary-cwl` requires building `packages/gxwf-foundry` first; the convenient `npx foundry ...` form doesn't work because the package is local-only. SKILL.md says `npx --package @galaxy-foundry/gxwf-foundry foundry ...`, which is the right invocation; I started with the wrong one and lost ~30 seconds.
- The extractor I wrote (`extract.mjs`) is the third one of its kind in this project (`ga4gh-challenge-cwl-galaxy-5step`, `mgnify-seqprep-subwf`, this run). Same gaps each time. A `foundry summarize-cwl` CLI would replace the per-run improvisation.

## Refinement entries written

- `content/molds/summarize-cwl/refinements/2026-05-11-salmon-rnaseq-cwl-galaxy-5step.md` — decision: `schema-change` (nested workflows + array.items)
- `content/molds/cwl-summary-to-galaxy-interface/refinements/2026-05-11-salmon-rnaseq-cwl-galaxy-5step.md` — decision: `keep` (with reference-note gap noted)
- `content/molds/cwl-summary-to-galaxy-data-flow/refinements/2026-05-11-salmon-rnaseq-cwl-galaxy-5step.md` — decision: `schema-change`
- `content/molds/compare-against-iwc-exemplar/refinements/2026-05-11-salmon-rnaseq-cwl-galaxy-5step.md` — decision: `eval-add`
- `content/molds/cwl-summary-to-galaxy-template/refinements/2026-05-11-salmon-rnaseq-cwl-galaxy-5step.md` — decision: `keep` (with `_plan_*` extension suggestions)

## Cross-cutting open questions

- `summary-cwl` nested workflow gap — extend schema to carry inner `inputs/outputs/steps/in/out/when/pickValue`, or promote to top-level `subworkflows[]`? (highest leverage)
- `cwl-normalizer` v1.2 + error-format bugs — open upstream issues against `cwl-utils`?
- `cwltool --pack` substitution — accept as procedure, or pin a working `cwl-utils` version?
- `cwl-directory-to-galaxy-collection.md` reference — add a focused note, or section in `galaxy-collection-semantics.md`?
- `compare-against-iwc-exemplar/eval.md` CWL cases — add a CWL-flavored case set (carried over from prior ga4gh run; still not done).
- `foundry summarize-cwl` CLI — scope and ship.

## Suggested follow-ups

- Open upstream `cwl-utils` issues for the v1.2 + error-format bugs (separate from the ruamel patch already shipped).
- Promote the nested-workflow gap into a schema change for `summary-cwl` plus a procedure update for `cwl-summary-to-galaxy-data-flow`.
- Add CWL-flavored cases to `compare-against-iwc-exemplar/eval.md` (track from the ga4gh refinement entry, still open).
- Scope `foundry summarize-cwl` as a deterministic CLI; the third one-off extractor is sufficient evidence.
