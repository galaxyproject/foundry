# Foundry operations log

Append-only journal for `cast`, planned `lint`, `query`. Excluded from validator and Astro collection.

## 2026-05-01 — cast run: summarize-nextflow on nf-core/demo (45904cb)

Cast: `casts/claude/summarize-nextflow/` (hand-cast, rev 1)
Target: `nf-core/demo @ 1.1.0` (`workflow-fixtures/pipelines/nf-core__demo`, tier=tiny)
Output: `casts/claude/summarize-nextflow/runs/nf-core__demo/summary.json` — schema-valid (ajv clean).

Gaps surfaced (issue #17 — paragraphs land in the named note's `## Open gaps`):

- **gap:nextflow-containers-and-envs** — `container` directive is a ternary expression of the form `"${ workflow.containerEngine == 'singularity' && !task.ext.singularity_pull_docker_container ? '<singularity-uri>' : '<docker-uri>' }"`. SKILL.md §5's four-pattern resolver expects a literal string and matches neither branch directly. Both URIs need extraction; only one image actually runs at runtime per containerEngine. Decision pending: `processes[].container` should be the resolved literal for the default engine, or both branches structured. Motivating: `modules/nf-core/fastqc/main.nf`, all three modules in this pipeline use the same shape.
- **gap:nextflow-containers-and-envs** — `conda` directive points to `${moduleDir}/environment.yml`, not `bioconda::pkg=ver`. SKILL.md §5 pattern 4 doesn't model file-path conda. Resolution required reading each module's environment.yml (small YAML with `dependencies: [bioconda::pkg=ver]`). This is the *modern* nf-core convention; literal bioconda-string directives are legacy. Motivating: all three modules.
- **gap:nextflow-containers-and-envs** — `biocontainers/<name>:<version>--<build>` (no `quay.io/` prefix) is a docker.io biocontainer alias. SKILL.md §5 pattern 1 regex requires `quay.io/biocontainers/...`; this falls to pattern 2 (docker) and never reaches `biocontainer`. Schema's `Tool.biocontainer` field is left null even though the image is biocontainer-published. Either the resolver pattern or the schema description should accept docker.io biocontainer aliases.
- **gap:nextflow-containers-and-envs** — Seqera Wave / community-cr registry: `community.wave.seqera.io/library/multiqc:1.33--ee7739d47738383b` and `https://community-cr-prod.seqera.io/.../sha256/<digest>/data`. Doesn't match any of the four resolver patterns. Placed in `docker` / `singularity` by elimination. The wave registry is increasingly common in nf-core; resolver needs a fifth pattern or a "registry-agnostic biocontainer detection" rule.
- **gap:nextflow-pipeline-anatomy** — Channel topics (`channel.topic('versions')` and process outputs annotated `topic: versions`). Introduced in Nextflow 24.04; nf-core/demo uses them for version aggregation. Schema's ChannelIO has no `topic` field; `processes[].outputs[].shape` was used as a free-text annotation slot (`tuple(...) topic:versions`). Schema extension or a structured `ChannelIO.topic: string?` field needed.
- **gap:nextflow-pipeline-anatomy** — Multiple named workflow blocks. main.nf has anonymous `workflow {}` (entrypoint) → calls `NFCORE_DEMO` → calls `DEMO`. Schema's `Workflow` is singular. Hand-resolved by promoting DEMO (the substantive body) to `workflow`, routing NFCORE_DEMO + PIPELINE_INITIALISATION + PIPELINE_COMPLETION into `subworkflows[]`, dropping the anonymous `workflow {}` entirely. Rule "the substantive workflow is the one that calls the most processes" is a heuristic, not derivable from NF semantics. Selection rule needs naming or schema needs to support multiple workflows.
- **gap:nextflow-pipeline-anatomy** — Utility-function-only subworkflows (PIPELINE_INITIALISATION, PIPELINE_COMPLETION). They wrap free functions (`paramsHelp`, `completionEmail`, `imNotification`, `samplesheetToList`) imported from `plugin/nf-schema` and `subworkflows/nf-core/utils_nfcore_pipeline`. They invoke zero processes. `Subworkflow.calls` documented as "processes and nested subworkflows" — left empty. These are noise to a target-translation skill but real channel sources upstream of the workflow body. Schema decision: drop them, name them, or introduce a `kind: utility` flag.
- **gap:nextflow-pipeline-anatomy** — Free-function calls in workflow body (`paramsSummaryMap`, `softwareVersionsToYAML`, `methodsDescriptionText`). Not processes, not subworkflows. They produce channels consumed by MULTIQC. Currently folded into channel `description` text; lossy. Pattern is universal in nf-core templates (every pipeline does this).
- **gap:nextflow-pipeline-anatomy** — `channel.empty()` and inline `channel.fromPath(...)` assignments inside the workflow body, mixed with `.mix()` accumulators. Schema's `Channel` requires a `source` string — used the verbatim assignment expression. The accumulator pattern (`ch_multiqc_files = ch_multiqc_files.mix(...)`) means the channel's `source` is an evolving expression, not a single construction call. Captured the *initial* source only; downstream `.mix()` calls land in `description` prose.
- **gap:nextflow-testing** — nf-test fixtures use `snapshot(...).match()` with helper functions (`getAllFilesFromDir`, `removeNextflowVersion`, `ignoreFile`). ExpectedOutputRef.assertions is a string array meant for simple equality / regex / contains-string checks. Snapshot-based assertions summarized to prose; lossy. Schema description acknowledges lossiness; question is whether snapshot-shaped assertions deserve their own structured representation (path-stable, content-stable, ignore-globs) given how universal they are in nf-core.
- **gap:nextflow-testing** — `params.input` URL points to a samplesheet on a *different* nf-core/test-datasets branch (`viralrecon`, not `demo`). The cross-pipeline-borrowing pattern is common (demo borrows viralrecon's samplesheet). SKILL.md §7's "follow samplesheet URL into nf-core/test-datasets if a single fetch enumerates referenced files" — fetch was *not* attempted in this run; only the samplesheet URL is recorded. Decision: do we fetch the CSV to enumerate per-sample paths, or stop at the samplesheet URL?
- **gap:nextflow-pipeline-anatomy** — `params.fasta = getGenomeAttribute('fasta')` in main.nf — params *computed* at config-load time outside the schema. Did not appear in `nextflow_schema.json` properties for nf-core/demo (it's added dynamically). Hand-included in `params[]` with a description noting the dynamic source. Schema-extracted params miss it.
- **gap:nextflow-pipeline-anatomy** — Workflow.channels[] vs ChannelIO inside Subworkflow.outputs are different abstractions. PIPELINE_INITIALISATION's `samplesheet` output is consumed as `ch_samplesheet` in the DEMO workflow body — recorded twice (once as a subworkflow output, once as a workflow channel with `source = "PIPELINE_INITIALISATION.out.samplesheet"`). Redundant but not wrong; schema doesn't forbid it.

Schema verdict (single-pipeline sample, biased toward easy case):
- Required-field shape works on a tiny pipeline.
- `additionalProperties: false` would have rejected this run had we tried to encode topics/snapshot-assertions structurally; the safety valve was funneling complexity into free-text fields (shape strings, descriptions, warnings).
- Container resolver patterns cover ~25% of what this single pipeline used. Five of seven warnings are container/conda-shape problems.
- nf-core template noise (utility subworkflows, summary functions, channel topics) is universal; deserves a "what to drop vs. surface" rule, not per-pipeline judgment.

Next: same skill against `nf-core/bacass` (small, mid-tier) before graduating to `rnaseq` or `sarek`.

## 2026-05-01 — schema rev 2 + mold rev 3 + cast rev 2 (re-cast against nf-core/demo)

Schema (`content/schemas/summary-nextflow.schema.json`) rev 2: `Tool.wave`, `ChannelIO.topic`, `Subworkflow.kind` added; `Tool.biocontainer` widened to docker.io alias; `Process.container`/`Process.conda` re-described as verbatim directive text; `Workflow.name` documents the multi-workflow selection rule. Schema-note `summary-nextflow.md` rev 2.

Mold (`content/molds/summarize-nextflow/index.md`) rev 3: §1 names the multi-workflow selection rule; §4 captures verbatim directives + channel topics; §5 5-pattern resolver (biocontainer-quay, biocontainer-docker.io alias, wave, depot.galaxyproject.org/singularity, fallthrough docker) + file-path conda; §6 utility-vs-pipeline subworkflow split + free-function call handling.

Cast (`casts/claude/summarize-nextflow/`) rev 2: SKILL.md regenerated; schema recopied; provenance bumped with cast_history. Notes still stubs.

Re-cast on nf-core/demo: schema-valid (ajv clean), warnings down from 8 → 2. Of the 13 gaps logged in the prior entry, 9 are now structurally captured in the schema; 4 remain (snapshot-fixture structure, free-function-call modeling, accumulator-channel evolving sources, samplesheet-URL fetch policy) — kept in the notes' Open gaps sections to grow on next pipeline contact.

## 2026-05-01 — cast run: summarize-nextflow on nf-core/bacass (76e4b12)

Cast: `casts/claude/summarize-nextflow/` rev 2 (mold rev 3, schema rev 2)
Target: `nf-core/bacass @ 2.5.0` (`workflow-fixtures/pipelines/nf-core__bacass`, tier=small — bigger than tier=tiny suggested; 33 processes / 7 subworkflows / 694-line workflow body)
Output: `casts/claude/summarize-nextflow/runs/nf-core__bacass/summary.json` — schema-valid (ajv clean).

Schema held: required fields covered all 33 processes, both kinds of subworkflow, multi-tool envs, mulled containers, and a 20-conditional gating tree. No fields had to be force-fitted. Warnings: 14, all structural-coverage rather than schema-failures.

New gaps surfaced (different from demo):

- **gap:nextflow-pipeline-anatomy** — Process aliasing via `include { X as Y }` is ubiquitous in real pipelines: `CAT_FASTQ → CAT_FASTQ_SHORT/CAT_FASTQ_LONG`, `MINIMAP2_ALIGN → MINIMAP2_CONSENSUS/MINIMAP2_POLISH` (3 aliases of the same process), `KRAKEN2_KRAKEN2 → KRAKEN2/KRAKEN2_LONG`, `QUAST → QUAST_BYREFSEQID`, `FASTQC → FASTQC_RAW/FASTQC_TRIM` (in subworkflow). Workflow `edges[]` reference the alias name; `processes[].name` is the canonical name. The alias→canonical mapping is not in the schema. SKILL.md §"Caveats" mentions "alias recorded in the call graph" but doesn't say where. Need either: (a) `Process.aliases: string[]` field, (b) edges referencing canonical name + a workflow-scoped alias map, or (c) processes deduplicated to one entry per alias. Motivating: bacass has 6 distinct alias-rename patterns; demo had zero.
- **gap:nextflow-containers-and-envs** — Mulled-v2 multi-package containers: `biocontainers/mulled-v2-66534bcbb7031a148b13e2ad42583020b9cd25c4:365b17b986c1a60c1b82c6066a9345f38317b763-0` (minimap2+samtools+htslib) and BUSCO_BUSCO's busco+sepp mulled. The "name" is a digest of constituent recipes — not a tool name. Hand-resolved by synthesizing `tools[].name = '<canonical_tool>_mulled'` and joining bioconda specs with ` + `. Schema treats it as a single Tool. Gap: per-mulled constituent breakdown is not modeled — author-galaxy-tool-wrapper would need per-tool requirements but currently sees only the synthetic combined entry. Open question: does Tool need a `mulled_components: ToolSpec[]` field, or is the bioconda `+`-joined string enough?
- **gap:nextflow-containers-and-envs** — Multi-dependency `environment.yml` is common (samtools+htslib, minimap2+samtools+htslib, busco+sepp, racon+multiqc). The §5 resolver assumed "single bioconda entry per env." Resolved by synthesizing a `+`-joined bioconda string in `tools[].bioconda`; canonical `name` picked by module-directory convention. The `+`-joined string is unparseable as a literal NF directive — round-trippability is lost.
- **gap:nextflow-containers-and-envs** — `modules/nf-core/racon/environment.yml` contains an unrelated `bioconda::multiqc=1.27` alongside `bioconda::racon=1.4.20`. The container is racon-only. Likely an upstream nf-core/modules bug. Cast preferred the container's tool over the env's spurious entry. Decision rule needed: when env and container disagree on tool identity, prefer container. (Promotes from one-off observation to procedure.)
- **gap:nextflow-pipeline-anatomy** — `multiMap(criteria)` operator splits one channel into N named-branch outputs (`shortreads`, `longreads`, `fast5`). The closure `criteria` defines the branches. Similar to `.branch{}`. Schema's Channel.source is a single string; named-branch outputs landed in the shape descriptor as prose (`multimap(shortreads:..., longreads:..., fast5:...)`). Edges from the named branches reference `ch_input.shortreads` / `ch_input.longreads` — but `ch_input` is the multiMap-result channel, and the named-branch attributes aren't first-class.
- **gap:nextflow-pipeline-anatomy** — `.branch{ ... }` operator is also pervasive (single/multiple FASTQ counting, gzip/skip detection on assemblies). Same fan-out problem as multiMap. Captured one example in `ch_assembly_for_gunzip` channel; the `single`/`multiple` branches in CAT_FASTQ paths went into edge `via` as `branch:multiple` — workable but not formally typed.
- **gap:nextflow-pipeline-anatomy** — `.cross()` operator: cardinality-changing (Cartesian product by key). Different semantics from `.join()`; the via-array records the name but the receiver shape change isn't captured. Motivating: `FASTQ_TRIM_FASTP_FASTQC.out.reads.cross(filtered_long_reads){ it[0].id }.map{ short_tuple, long_tuple -> ... }` for hybrid assembly.
- **gap:nextflow-pipeline-anatomy** — Meta-mutation in `.map{}` closures: `def new_meta = meta + [single_end: true]; return [new_meta, long_fastq]`. The downstream channel has a different `meta` shape than the source. The schema's edge representation can't distinguish "meta passed through unchanged" from "meta mutated by closure" — both are recorded as identical edges. Motivating: long-read CAT_FASTQ_LONG path mutates meta, then short-read meta and long-read meta diverge.
- **gap:nextflow-pipeline-anatomy** — `ch_for_assembly`, `ch_for_kraken2_short`, `ch_for_kraken2_long` are *constructed inside if/else if branches* on `params.assembly_type`. The channel's `source` expression is conditional — three different sources for three values of one param. Schema's `Channel.source` is one string; cast picked the path that ran for the test profile (`assembly_type='short'`). Alternate-branch sources are silently dropped from the summary.
- **gap:nextflow-pipeline-anatomy** — `ch_assembly` is BOTH `.mix()`-accumulated (from UNICYCLER/CANU/MINIASM-via-RACON/DRAGONFLYE) AND directly reassigned (from MEDAKA / NANOPOLISH overwrites). The reassignment overrides the accumulator. Channel.source represents only the initial+major contributors; the polishing reassignment is hidden in edges with `via: ["assignment"]`. The reassignment shape (channel becomes a *new* channel with a different shape) isn't captured.
- **gap:nextflow-pipeline-anatomy** — `.dump(tag: 'X')` is pervasive in bacass (≥30 instances). Pure debugging side-effect, no data-flow change. Currently lands in `via[]` for edges; question is whether to filter it or keep faithful. Filtering loses upstream-author intent; keeping bloats `via[]`. Recommend filtering at parse-time as a §6 rule.
- **gap:nextflow-pipeline-anatomy** — `exit("...")` and `log.error "..."` in workflow body — can short-circuit execution or fail loudly. Not modeled. Motivating: miniasm-on-short-reads exits, liftoff-without-references log.errors.
- **gap:nextflow-pipeline-anatomy** — Subworkflow inputs are *typed values*, not all channels. `FASTQ_TRIM_FASTP_FASTQC` takes `(ch_reads, ch_adapter_fasta, val_save_trimmed_fail, val_discard_trimmed_pass, val_save_merged, val_skip_fastp, val_skip_fastqc)` — channel + path + 5 booleans. Schema's `Subworkflow.inputs[]` is `ChannelIO[]`; encoded as `ChannelIO` with `shape: "val(boolean)"`. Subworkflow caller passes `params.skip_fastp` literal — not a channel. Works but blurs the line.
- **gap:nextflow-pipeline-anatomy** — Empty list literals `[]` and `[[:],[]]` (empty meta + empty path) used as channel inputs. E.g. `MINIMAP2_ALIGN(ch_reads, [[:],[]], false, false, false)` for "no reference". Schema treats inputs as channels but these are literal Groovy expressions inlined at the call site. SKILL.md doesn't say how to record these — they're invisible in the summary.
- **gap:nextflow-pipeline-anatomy** — Multiple test profiles (11 in bacass: test, test_dfast, test_liftoff, test_hybrid, test_hybrid_dragonflye, test_long, test_long_miniasm, test_long_miniasm_prokka, test_long_dragonflye, test_full). `TestFixtures.profile` is a single string. Each exercises different code paths; selecting one is arbitrary. Schema decision: TestFixtures should probably be `TestFixtures[]` keyed by profile, OR the cast should run once per profile and emit separate summaries.
- **gap:nextflow-testing** — `params.input` is a runtime *string concatenation*: `params.pipelines_testdata_base_path + 'bacass/bacass_short_reseq.tsv'`. Not a literal URL in the test config. Resolved at config-load time by Nextflow. Cast captured the resolved URL but the resolution required mental computation. Decision rule needed: when params are computed expressions, record both the expression and the (best-effort) resolution.
- **gap:nextflow-pipeline-anatomy** — `params.fasta`, `params.input` etc. are checked at config-load time for existence (`for (param in checkPathParamList) { if (param) { file(param, checkIfExists: true) } }` at top of bacass.nf). This is workflow-scoped runtime validation that doesn't show up in `nextflow_schema.json`. Currently invisible in the summary.

What survived from rev 2 schema unchanged: container ternary handling, file-path conda directives, channel topics (none in bacass — version aggregation uses old `path "versions.yml"` style here), Subworkflow.kind, multi-workflow selection rule (BACASS picked correctly).

What didn't get exercised by bacass: Wave registry (only multiqc 1.33 used Wave in demo; bacass uses 1.27 from bioconda).

Schema verdict (two-pipeline sample, demo + bacass):
- 0 schema validation failures across both runs.
- Coverage of *additional structural patterns* beyond demo: aliasing (~6 patterns), mulled containers, multi-dep envs, multiMap/.branch/.cross/meta-mutation, conditional channel sources, .mix-then-reassign, nf-test snapshot helpers (already known lossy).
- The schema is good enough to capture skeletal structure; the *fidelity* loss is in workflow-shape-invariant operators (multiMap, branch, cross) and in conditional construction.
- Highest-yield next change: a `Process.aliases: string[]` field. Affects every downstream skill (any Galaxy tool wrapper consumer needs to know "MINIMAP2_CONSENSUS is MINIMAP2_ALIGN with different runtime args"). Currently the alias names are only in `Edge.from` / `Edge.to` strings.

Next: defer mulled-container per-component breakdown (deferred by mold §5 caveats already); add Process.aliases as the next schema bump *if* a downstream Mold (likely author-galaxy-tool-wrapper) confirms it needs the canonical→alias mapping. Otherwise this gap is logged for the third pipeline to confirm pattern.

## 2026-05-01 — schema rev 3 + mold rev 4 + cast rev 3 (aliases + nf_tests)

Promoted two bacass-surfaced patterns straight to schema rather than waiting for a third pipeline. Both are universal in nf-core templates (alias-multiplexing of modules, per-profile .nf.test files); the "wait and see" rule is for ambiguous patterns, not unambiguous ones.

Schema rev 3 (`content/schemas/summary-nextflow.schema.json`):
- `Process.aliases: string[]` — alias names from `include { X as Y }` sweep. Workflow edges reference alias; canonical `name` is FK target.
- `Summary.nf_tests: NfTest[]` (required) — one entry per `tests/*.nf.test` file. Captures profile, params overrides, assert_workflow_success, structured snapshot, prose_assertions.
- `NfTest` shape (new) — fields above.
- `SnapshotFixture` shape (new) — `captures[]`, `helpers[]`, `ignore_files[]`, `ignore_globs[]`, `snap_path`. Lets downstream test-conversion molds reconstruct equivalent assertions in target frameworks without re-parsing Groovy.
- `TestFixtures` description tightened: it's the *selected profile's* data shape; the per-test enumeration lives in `nf_tests[]`. Field stays singular (no breaking change there).

Schema-note `summary-nextflow.md` rev 3.

Mold (`content/molds/summarize-nextflow/index.md`) rev 4: §4 grew the alias-sweep rule (recover from include-as imports across main.nf/workflows/subworkflows). §7 split into `test_fixtures` + `nf_tests[]` enumeration with explicit SnapshotFixture extraction (captures, helpers, ignore_files, ignore_globs, snap_path).

Cast (`casts/claude/summarize-nextflow/`) rev 3: SKILL.md regenerated; schema recopied; provenance bumped with cast_history. Notes still stubs.

Re-cast both pipelines:
- `runs/nf-core__demo/summary.json` — added `aliases: []` to all 3 processes; added `nf_tests` with 1 entry. Schema-valid.
- `runs/nf-core__bacass/summary.json` — populated aliases for 5 canonical processes (CAT_FASTQ→{SHORT,LONG}, MINIMAP2_ALIGN→{CONSENSUS,POLISH}, KRAKEN2_KRAKEN2→{KRAKEN2,LONG}, QUAST→{BYREFSEQID}, FASTQC→{RAW,TRIM}); added `nf_tests` with 9 entries (default, dfast, hybrid, hybrid_dragonflye, long, long_dragonflye, long_liftoff, long_miniasm, long_miniasm_prokka), each with structured SnapshotFixture. Schema-valid. Warnings: 14 → 11 (3 dropped: alias-not-captured, 11-test-profiles-flat, snapshot-helpers-lossy — all now structurally captured).

Of the 17 bacass gaps logged in the prior entry, 4 are now structurally captured (process aliasing, multi-test-profile enumeration, snapshot helper extraction, snapshot ignore-globs). 13 remain (mulled containers, multi-dep envs, racon env bug, multiMap/.branch/.cross, meta-mutation closures, conditional channel construction, .mix-then-reassign, .dump pervasiveness, exit/log.error, subworkflow-typed-value-inputs, empty-list-literal channel inputs, params runtime concatenation, params runtime existence checks). These hold for the third pipeline.


## 2026-05-02 — summarize-nextflow eval.md + 7-fixture sweep

Added `content/molds/summarize-nextflow/eval.md` (14 cases: schema/fidelity/utility/regression buckets). Ran `@galaxy-foundry/summarize-nextflow` against all seven pinned fixtures (demo, fetchngs, hlatyping, bacass, rnaseq, sarek, taxprofiler) for the first time end-to-end.

**Schema-conformance (eval bucket "schema"): PASS for all 7.** Every fixture exits 0 with `--validate` enabled. `additionalProperties: false` holds.

**Fidelity findings (eval bucket "fidelity"):**

- **process counts diverge upward on large pipelines.** demo/fetchngs/hlatyping match a naive `grep -c '^process '` (3/10/12 == fs); bacass/rnaseq/sarek/taxprofiler emit MORE than the naive count (34>31, 76>66, 123>90, 61>51). Two candidate causes: the resolver counts process declarations the regex misses (multi-line, indented), or it includes processes from un-imported modules. Worth confirming before tightening the eval case.
- **nf_tests is severely under-enumerated.** Spec says "every `tests/*.nf.test`" (top-level) but corpus has many more under `modules/nf-core/*/tests/`, `subworkflows/nf-core/*/tests/`. Counts: demo 1/9, fetchngs 1/29, hlatyping 7/21, bacass 9/36, rnaseq 47/130, sarek 59/62, taxprofiler 8/72. Open question: should nf_tests capture module/subworkflow-level tests too, or is pipeline-level the contract? If the latter, eval case wording needs to say "pipeline-level tests" and add a separate fidelity case for module-level tests if/when they matter.
- **tools count looks plausible** for the size of pipeline (demo 3, bacass 26, rnaseq 42, sarek 37, taxprofiler 35) but not ground-truthed yet.
- **warnings count is 2 across every fixture** — suspiciously uniform. Likely the same boilerplate warnings (DSL2-required-version + something else) are emitted unconditionally; the pipeline-specific warnings the mold §"Caveats" predicted (meta.yml-disagreement, low-confidence operator chains) are not surfacing.

**Regression (eval bucket "regression"): FAIL on both committed runs.** demo diff 822 lines, bacass diff 4624 lines. Sampling the head of demo: committed run has hand-curated param descriptions ("Path to a samplesheet CSV.") while the CLI emits the verbatim `nextflow_schema.json` text ("Path to a metadata file containing information about the samples in the experiment."). The committed runs predate the strict-deterministic CLI; they are no longer the right regression baseline. Either re-baseline (commit the new CLI outputs as the canonical run) or drop the regression cases until a "v1 frozen" reference run is established.

**Utility (eval bucket "utility"): not exercised.** Requires running `nextflow-summary-to-galaxy-data-flow` and `author-galaxy-tool-wrapper` against the new outputs. Open as next step.

Recommended next steps:
1. Re-baseline `runs/nf-core__{demo,bacass}/summary.json` with the current CLI output, after deciding on the nf_tests scoping question (module-level in or out).
2. Add the 5 new fixtures (fetchngs, hlatyping, rnaseq, sarek, taxprofiler) as runs under `runs/` if they are intended baselines.
3. Investigate process-count divergence on bacass (34 vs naive 31) before declaring the fidelity case authoritative.
4. Investigate the uniform 2-warning count — either the warnings system is under-sampling or the corpus genuinely doesn't trigger §"Caveats" predicates.
5. Run the utility cases (data-flow Mold + tool-wrapper Mold consumers) against bacass output to surface missing fields / open gaps.

## 2026-05-03 — summarize-nextflow ad-hoc fixture sweep (overfitting check)

Issue #110 raised, then 8 ad-hoc DSL2 pipelines added to `workflow-fixtures/fixtures.yaml` (`flavor: adhoc` field new; existing 7 nf-core entries marked `flavor: nf-core`). Stress-test goal: confirm the resolver doesn't silently degrade against pipelines that don't follow the nf-core template.

**Result: severe overfitting. The resolver works only on nf-core layouts.**

### Hard failures (2/8)

- **biocorecrg/MOP2** — multi-pipeline monorepo; no `nextflow.config` at repo root. Resolver throws `not a Nextflow pipeline root`.
- **ncbi/egapx** — sources under `nf/`, no `nextflow.config` at repo root. Same throw.

Pipeline-root detection (`packages/summarize-nextflow/src/resolver.ts:121`) requires `<root>/nextflow.config` and offers no fallback for nested-pipeline or non-standard-root layouts.

### Silent degradation (6/8)

The other six exit 0 and emit *schema-valid but empty* summaries. Process counts (resolver-emitted vs filesystem grep `^process `):

| pipeline | emitted | fs | gap reason |
| - | - | - | - |
| CalliNGS-NF | 0 | 11 | 11 processes in single `modules.nf` file at root |
| mcmicro | 0 | 17 | flat `modules/<name>.nf` (one file per module, not nf-core's per-dir) |
| nf-demos | 0 | 9 | no `modules/` dir; processes in `<dir>/<file>.nf` |
| crispr-process-nf | 0 | 12 | processes inline in `main.nf` itself |
| What_the_Phage | 0 | 94 | flat `modules/<tool>.nf` + custom `phage.nf` entrypoint |
| wf-human-variation | 0 | 99 | processes spread across `workflows/`, `lib/`, `modules/local/<name>.nf` |

### Root cause

`discoverProcessFiles()` (resolver.ts:284-286):

```ts
function discoverProcessFiles(pipelineRoot: string): string[] {
  return walk(join(pipelineRoot, "modules")).filter((path) => basename(path) === "main.nf");
}
```

Two hardcoded nf-core assumptions:

1. **`<root>/modules/` exists.** Half the ad-hoc pipelines have processes elsewhere (`<root>/main.nf`, `<root>/<custom-name>.nf`, `<root>/workflows/`, `<root>/lib/`, flat `<root>/modules/<x>.nf`).
2. **One process per `main.nf` file.** CalliNGS-NF puts 11 processes in one `modules.nf`; ad-hoc pipelines routinely put multiple processes in a single file. `parseProcessFile` uses `matchOne(/process\s+(...)\{/u)` — single match — so even if the file were found, only the first process would be parsed.

### Surviving fields

- `params` — works for pipelines with `nextflow_schema.json` (nf-core, mcmicro, wf-human-variation). Returns `[]` for pipelines without it. Acceptable; the schema is optional in NF.
- `profiles` — works (parses `nextflow.config` `profiles { ... }` block). Captured 8/13/10/3/26/0 across the six.
- `subworkflows` — partial. Picked up some (10 mcmicro, 21 What_the_Phage, 13 wf-human-variation) but missed others. Not yet ground-truthed.
- `tools` — 0 across all six (downstream of empty `processes[]`).
- `nf_tests` — 0 across all six (correctly; none use nf-test).
- `warnings` — uniform 2 across every fixture (same finding as 2026-05-02; warnings appear boilerplate-only).

### Implications for the resolver

The fix-list, ordered by impact:

1. **Walk all `.nf` files** under the pipeline root (excluding `.git/`, `work/`, `.nextflow/`, vendored submodules) and grep each for `^[ \t]*process [A-Z_][A-Z0-9_]*[ \t]*\{`. This single change unblocks 5 of the 6 silent-degradation cases.
2. **Multi-process-per-file support.** Replace `matchOne` with `matchAll`; emit one `processes[]` entry per match. Each gets its own `module_path` (the file) plus a span/offset into the file for IO/script extraction.
3. **Pipeline-root auto-detect.** When `<path>/nextflow.config` is absent, walk down looking for one (handles MOP2's `mop_preprocess/`); when none found anywhere, fall back to the nearest dir containing a `.nf` file with a `workflow {` block (handles egapx's `nf/`). Surface the chosen root in `source` or `warnings`.
4. **Entrypoint detection beyond `main.nf`.** What_the_Phage uses `phage.nf`; egapx uses `ui/main.nf` or similar. The resolver should pick the .nf file containing `workflow { ... }` (named or anonymous) at the chosen root, not require a literal `main.nf`.
5. **Local-module IO inference.** Once 5/6 pipelines start emitting processes, every one of those processes will be a "local" module without `meta.yml`. The resolver currently leans on `meta.yml` for IO docs; it'll need a script-block IO inference path (already noted in mold §4 but not implemented).

### Implications for the schema

Probably none from this sweep alone — `additionalProperties: false` holds, and the schema's required fields are all already satisfiable as empty arrays. The schema isn't overfit; the **resolver** is.

### Implications for the eval

Two new fidelity cases to add to `content/molds/summarize-nextflow/eval.md`:

- **process-discovery is layout-agnostic** (deterministic): for every fixture, `processes[].length` >= 80% of `grep -c '^process ' <every .nf file>` ground truth. (80% rather than exact to allow for genuine false-positive grep matches in comment blocks.)
- **pipeline-root auto-detect** (deterministic): MOP2 and egapx are summarized successfully, with the chosen root surfaced in the JSON.

### Recommended next step

File a follow-up issue: "summarize-nextflow resolver: walk all .nf files, support multi-process-per-file, auto-detect pipeline root." This is independent of issue #110 (per-module tests + meta.yml) and should land first — there's no point capturing per-module tests while the resolver finds zero modules.

## 2026-08-19 — summarize-nextflow on ncbi/egapx (supersedes the 2026-05-03 hard-failure entry)

The 2026-05-03 sweep recorded egapx as a **hard failure** — "sources under `nf/`,
no `nextflow.config` at repo root; resolver throws `not a Nextflow pipeline
root`." That is no longer true. Fix-list items 3 (pipeline-root auto-detect) and
4 (entrypoint detection beyond `main.nf`) both landed. Re-run against the pinned
fixture (`ncbi/egapx @ 40ec736`, v0.5.2):

```
warnings: auto-detected Nextflow pipeline root from workflow block: nf
          selected Nextflow entrypoint: ui.nf
```

Exits 0, schema-valid. Counts: 95 `processes[]`, 68 `subworkflows[]`, 54 edges,
6 conditionals.

### What is still empty, and why it isn't the resolver's fault

`params`, `tools`, `sample_sheets`, `profiles`, `reference_assets`, `nf_tests`
all come back `[]`, and `container`/`conda` are null on all 95 processes. Two
causes, both properties of egapx rather than resolver gaps:

- **One global container, declared outside the detected root.**
  `process.container = 'ncbi/egapx:0.5.2'` lives in
  `ui/assets/config/docker_image.config` — under `ui/`, not the auto-detected
  `nf/` root, and pulled in by the Python launcher rather than by a
  `nextflow.config` the resolver would read. Per-process directives genuinely do
  not exist; every step is a distinct NCBI C++ toolkit binary inside one image.
- **No flat `params.*`.** The entrypoint reads `params.get('input', [:])` and
  `params.get('tasks', [:])` — nested maps supplied by a YAML input file
  (`examples/input_D_farinae_small.yaml`) plus `ui/assets/default_task_params.yaml`.
  There is no `nextflow_schema.json` and nothing flat to extract.

Worth naming as a resolver question rather than a bug: **root auto-detect and
config discovery are now coupled.** Choosing `nf/` as the root is correct for
process discovery and simultaneously puts `ui/assets/config/*.config` out of
reach. Whether config discovery should search above the detected root is open.

### Where this landed

`content/pipelines/nextflow-to-galaxy/scenarios.md` gains a **ncbi/egapx**
end-to-end case built around the empty summary — the journey's obligation is to
treat empty `tools[]`/`params[]` as *absent evidence* and say so, not as "this
pipeline has no tools". The mold-level case
(`content/molds/summarize-nextflow/scenarios.md`, "pipeline-root auto-detect")
already covered the exit-0-plus-warnings half and needs no change.
