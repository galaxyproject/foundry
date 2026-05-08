---
mold: summarize-nextflow
date: 2026-05-08
intent: Stress-test summarize-nextflow against nf-core/sarek as part of a 5-step pipeline emulation.
decision: keep
---

# Sarek emulation findings

CLI ran cleanly on `nf-core__sarek` (3.8.1). Schema validation passed.
123 processes, 74 subworkflows, 172 params, 59 nf-tests, 7 channels,
155 edges, 5 conditionals, 3 warnings — all extracted statically.

## What worked

- Sample-sheet schema discovery via nf-schema produced all 17 columns with
  correct `kind` (`meta` vs `data`) split, including the entrypoint-driver
  columns (`fastq_1/2`, `bam/bai`, `cram/crai`, `vcf`, `spring_1/2`, `table`).
  This is the load-bearing structured input for the downstream interface
  Mold; it survived sarek's complexity without changes.
- Conditionals captured the load-bearing guards: `step == 'mapping'`,
  `step in [...]`, `aligner == 'parabricks'`, and the catch-all `tools` guard.
  Enough for the data-flow Mold to scope-narrow honestly.
- Process aliasing worked (e.g. `BCFTOOLS_CONCAT` aliases to
  `CONCAT_CALLED_CHUNKS`, `CONCAT_SOMATIC_STRELKA`,
  `GERMLINE_VCFS_CONCAT`).

## Gaps surfaced

1. **`workflow.edges[]` is large but topologically opaque.**
   `155 edges` over a 123-process DAG is structurally noisy without
   subworkflow grouping. The `subworkflows[].calls` field exists but the
   downstream interface Mold cannot easily pivot from "process X is in
   subworkflow Y, which is conditional on Z" without re-walking the call
   graph by hand. Consider: (a) record `processes[].in_subworkflow` as a
   denormalized FK, or (b) expose `subworkflows[].edges` so a consumer
   can collapse to subworkflow-level DAG when scope-narrowing.

2. **Conditional guards are stringly-typed.** `step in ['mapping',
   'markduplicates', 'prepare_recalibration', 'recalibrate']` is captured
   verbatim. Useful, but the data-flow Mold has to parse Nextflow expression
   syntax to decide which processes are reachable under a chosen scope.
   Either: (a) keep verbatim and document that consumers parse it, or
   (b) extract a normalized `{param, op, values[]}` shape when the guard is
   a simple equality / membership predicate. (a) is honest; (b) is more
   useful. Open question.

3. **Implicit reductions (`mix(...).collect()`) are flattened into edges
   without preserving the gather semantics.** Sarek's MultiQC inputs come
   from a `mix()` of ~6 streams. The data-flow Mold needs to emit an
   explicit "Build List" step in Galaxy; today it has to infer this from
   edge fan-in count. Consider: surface `workflow.gathers[]` (or annotate
   edges with `via: ["mix", "collect"]` consistently — the schema
   already supports `via`, but coverage on operator-chain reconciliation
   is "best-effort" per the Mold body and may underreport).

4. **Per-process `tool` FK is empty for 26 of 123 sarek processes** (~21%).
   Confirmed: `ADD_INFO_TO_VCF`, `CAT_FASTQ`, `CONTROLFREEC_*`,
   `DEEPVARIANT_RUNDEEPVARIANT`, `ENSEMBLVEP_*`, `GAWK`, `GUNZIP`,
   `MOSDEPTH`, `MSISENSORPRO_*`, `PARABRICKS_FQ2BAM`, `RBT_VCFSPLIT`,
   etc. have `tool == null`. Some are local utility processes (`GAWK`,
   `GUNZIP`, `CAT_FASTQ`) where this is correct; others (`MOSDEPTH`,
   `DEEPVARIANT_RUNDEEPVARIANT`, `ENSEMBLVEP_VEP`) are real tool wrappers
   the resolver should have caught. Tool-authoring Mold can't bind to
   these. Add an eval case: every `processes[]` row whose `module_path`
   lives under `modules/nf-core/` must have `tool != null`; flag local
   shell utilities as a known-OK class.

## Process-level review

- `make fixtures-nextflow` was run twice in parallel by mistake during this
  session and one process crashed with a `.git/index.lock` collision.
  Suggest the Makefile guard against concurrent runs (file-based lock or
  explicit "already running" detection). Low-priority but bites integration
  tests.
- The CLI built only after a `pnpm --filter @galaxy-foundry/summary-nextflow-schema build`
  run because `dist/` was absent in the worktree. `npm run packages-build`
  would have done both in order; consider documenting "run packages-build
  before invoking the CLI" in the README, or have the CLI's `bin` script
  shell out to a build-on-demand step in dev mode.

## Open questions

- Are there sarek processes with `tool == null`? If so, surface as warning.
- Should `processes[].in_subworkflow` be added to the schema?
- Should conditional guards be normalized when shape-recognizable?
