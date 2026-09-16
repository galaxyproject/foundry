# summarize-nextflow scenarios

Every corpus path below is pinned in `workflow-fixtures/fixtures.yaml`.
Materialize with `make fixtures-nextflow`; verify the inspected HEAD against
that manifest. Package fixtures under `packages/summarize-nextflow/test/fixtures/`
are committed and need no network access. Run the built CLI with
`--no-with-nextflow` and the default `--profile test` unless a case says otherwise.

Run deterministic package cases with `pnpm --filter @galaxy-foundry/summarize-nextflow test`.
The corpus cases in `test/corpus-scenarios.test.ts` require the materialized pins;
set `FOUNDRY_REQUIRE_NEXTFLOW_FIXTURES=1` to fail instead of skipping absent clones.
The three downstream cases additionally require acting on the named casts;
package tests alone do not establish their translation or authoring verdicts.

## Case: tier-tagged fixtures validate

- fixture: `workflow-fixtures/pipelines/nf-core__{demo,fetchngs,hlatyping,bacass,rnaseq,sarek,taxprofiler}`.
- expect: each built CLI invocation exits 0; its JSON validates against
  [[summary-nextflow]] (`packages/summarize-nextflow/src/schema/summary-nextflow.schema.json`).
  `source.workflow` matches the repository name and `source.version` matches its
  manifest SHA; an extra field at a strict schema level is rejected.

## Case: missing source.workflow rejected

- fixture: `packages/summarize-nextflow/test/fixtures/missing-source-workflow.json`.
- expect: `validateSummary` returns `valid == false` with exactly one
  `required` diagnostic at `/source`, naming `workflow`. The built CLI's
  schema-failure test injects this JSON as resolver output and asserts exit 3,
  the same diagnostic on stderr, empty stdout, and no creation or overwrite of
  `--out`. A valid pipeline cannot naturally omit this resolver-populated field.

## Case: DSL1 tree short-circuits

- fixture: `packages/summarize-nextflow/test/fixtures/dsl1/`;
  `nextflow.config` explicitly sets `nextflow.enable.dsl = 1`, and `main.nf`
  contains the legacy `LEGACY` process with `from` / `into` IO.
- expect: built CLI exits 0 with a schema-valid envelope;
  `source.workflow == dsl1`; `processes`, `tools`, `subworkflows`,
  `workflow.channels`, and `workflow.edges` are empty; `warnings` contains
  `DSL1 pipeline is out of scope; process and workflow extraction skipped`.
  Required schema fields remain present even though extraction is skipped.

## Case: process inventory vs grep ground truth

- fixture: all explicitly listed corpus paths in the corpus list below.
- expect: for each pinned clone, `processes.length` is at least 80% of the
  number of line-start `process NAME {` declarations in its `.nf` files.
  Exclude `.git`, `.nextflow`, `work`, `node_modules`, `BioNextflow`,
  `external-modules`, `vendor`, `vendors`, and `third_party` directories.
  Canonical `(module_path, name)` definitions are unique; include aliases do not create duplicate rows.
  Corpus runs retain the threshold because text searches can count comments.

## Case: process discovery across layouts

- fixture: `packages/summarize-nextflow/test/fixtures/layouts/` and
  `workflow-fixtures/pipelines/{CRG-CNAG__CalliNGS-NF,labsyspharm__mcmicro,JaneliaSciComp__nf-demos,ZuberLab__crispr-process-nf,biocorecrg__MOP2,replikation__What_the_Phage,epi2me-labs__wf-human-variation,ncbi__egapx,nextflow-io__rnaseq-nf,seqeralabs__nf-canary}`.
- expect: the package fixture emits exactly six processes:
  `ROOT` from `modules.nf`, `FLAT` from `modules/flat.nf`, `INLINE` from
  `main.nf`, `ASSEMBLE` from `workflows/assemble.nf`, `ANNOTATE` from
  `lib/annotate.nf`, and `LOCAL` from `modules/local/local.nf`.
  Every listed corpus clone satisfies the preceding inventory threshold and
  emits at least one process when its source contains process declarations.

## Case: CalliNGS-NF multi-process-per-file

- fixture: `workflow-fixtures/pipelines/CRG-CNAG__CalliNGS-NF/`.
- expect: exactly 11 `processes` rows have `module_path == modules.nf`.

## Case: pipeline-root auto-detect

- fixture: `workflow-fixtures/pipelines/biocorecrg__MOP2/` and
  `workflow-fixtures/pipelines/ncbi__egapx/`, invoked at repository root.
- expect: built CLI exits 0; `warnings` identifies the chosen child pipeline
  root (`nf` for egapx). MOP2 retains `.` because shared process files
  exist outside its child roots; its selected entrypoint is
  `mop_consensus/mop_consensus.nf`. MOP2's ambiguous-root
  warning names the other candidate roots so the choice remains reviewable.

## Case: non-main entrypoint detection

- fixture: `workflow-fixtures/pipelines/replikation__What_the_Phage/`.
- expect: built CLI exits 0; `warnings` contains
  `selected Nextflow entrypoint: phage.nf`.

## Case: bacass alias sweep

- fixture: `workflow-fixtures/pipelines/nf-core__bacass/`.
- expect: one canonical `MINIMAP2_ALIGN` row has aliases
  `MINIMAP2_CONSENSUS` and `MINIMAP2_POLISH`; one canonical `FASTQC` row has
  `FASTQC_RAW` and `FASTQC_TRIM`. Compare these sets to the live include
  renames in the pinned tree; aliases are not separate processes.

## Case: egapx commented duplicate and subworkflow aliases

- fixture: `workflow-fixtures/pipelines/ncbi__egapx/nf/subworkflows/ncbi/gnomon-training-iteration/main.nf`
  (manifest SHA `40ec7362576e4b93fa9c5bf0a6c400d9502b8a63`).
- expect: `gnomon_training_iterations.inputs[0].name == initial_hmm_params`;
  inputs include `gnomon_softmask` and exclude the commented `models_file`
  and `gnomon_softmask_lds2`. Its calls contain `gnomon_training_iteration`,
  `gnomon_training_iteration2`, `gnomon_training_iteration3`, and
  `gnomon_training_iteration4`; its emitted expression references alias 4;
  canonical `gnomon_training_iteration.aliases` contains aliases 2, 3, and 4.

## Case: bacass nf-core module metadata and tests

- fixture: `workflow-fixtures/pipelines/nf-core__bacass/modules/{nf-core,local}/`.
- expect: nf-core process rows with a sibling `meta.yml` have non-null `meta`;
  tool names and flattened input/output names match that file.
  For every module, `module_tests` contains one entry per live `test(...)`
  block in its `tests/*.nf.test` files, retaining the repo-relative file path.
  Local process rows have `meta == null` and `module_tests == []`.

## Case: bacass subworkflow tests

- fixture: `workflow-fixtures/pipelines/nf-core__bacass/subworkflows/{nf-core,local}/`.
- expect: each nf-core row's `tests` has one entry per `test(...)` block in
  that directory's `tests/*.nf.test`; local or untested rows have `tests == []`.
  Snapshots retain their `snap_path` and compact parsed file/value evidence
  when a sidecar exists; raw snapshot JSON text is not copied into the summary.

## Case: container directive coverage

- fixture: `packages/summarize-nextflow/test/fixtures/containers/` and
  `workflow-fixtures/pipelines/nf-core__bacass/`.
- expect: package processes `FASTQC_DOCKER`, `SAMTOOLS_SINGULARITY`, and
  `MINIMAP2_CONDA` point to tools `fastqc`, `samtools`, and `minimap2`.
  FastQC has the declared `biocontainer`, Samtools has the declared
  `singularity`, and Minimap2 has `bioconda == bioconda::minimap2=2.28`.
  The container-only `CONTAINER_ONLY` image has an explicit unresolved-container
  warning; the unreadable `UNKNOWN` Conda directive `???` is reported verbatim in
  `warnings`. Across bacass, every non-null `processes.tool` is a tools-name
  FK; every directive has package/container evidence or a warning naming it.
  A null FK is permitted for genuinely ambiguous multi-package processes.

## Case: nf-test enumeration matches filesystem

- fixture: `packages/summarize-nextflow/test/fixtures/nf-tests/tests/main.nf.test`
  and `workflow-fixtures/pipelines/nf-core__bacass/tests/`.
- expect: the single package file emits two entries named `first` and `second`,
  both with `path == tests/main.nf.test` and profile `test`; the first has
  captures `succeeded_task_count` and `versions_yml`, the second has
  `snapshot == null`. Bacass emits nine pipeline-level entries, one per test
  block, each retaining its path/profile and all four snapshot capture kinds.

## Case: test-fixture localization round-trip

- fixture: `packages/summarize-nextflow/test/fixtures/localization/`;
  the test transport serves `http/samplesheet.csv` and `http/reads.fastq.gz`
  as `https://example.test/data/{samplesheet.csv,reads.fastq.gz}`.
- expect: run the built package with `fetchTestData: true` into two separate
  temporary data directories. Each run emits two `test_fixtures.inputs`,
  preserving remote URLs and giving both existing absolute local paths.
  Each `sha1` equals the on-disk content hash, and URL-to-hash mappings are
  identical across runs. This test is independent of an external data host.

## Case: ad-hoc DSL2 fallback

- fixture: `packages/summarize-nextflow/test/fixtures/layouts/` and
  `workflow-fixtures/pipelines/CRG-CNAG__CalliNGS-NF/`; neither has
  `nextflow_schema.json` or per-module `meta.yml`.
- expect: the package's `INLINE` row has `meta == null`, declared input
  `word`, declared output `greeting`, and `script_excerpt` containing
  `echo $word > hello.txt`; `params == []`. Its anonymous workflow warning
  records use of the manifest-derived name. CalliNGS-NF's 11 process rows
  preserve declared IO and script evidence without fabricated nf-core metadata.
  The static package extracts declarations; interpretation of command intent
  belongs to the cast's reconciliation procedure.

## Case: bacass downstream binding

- fixture: `casts/claude/skills/summarize-nextflow/runs/nf-core__bacass/summary.json`,
  regenerated from `workflow-fixtures/pipelines/nf-core__bacass/` using the
  built CLI. Supply the companion briefs in
  `packages/summarize-nextflow/test/fixtures/bacass-handoff/` to satisfy the
  data-flow cast's preceding-phase input contract.
- expect: acting on `casts/claude/skills/nextflow-summary-to-galaxy-data-flow/`
  produces `nextflow-galaxy-data-flow.md` plus a carried requirements ledger
  without missing-summary-field errors. Every bacass tool has an explicit
  container/package-evidence decision using the
  `casts/claude/skills/author-galaxy-tool-wrapper/` rules; absent command or
  image evidence is a named unresolved assumption. Underspecified producer
  fields become explicit feedback observations; under enabled feedback mode,
  append them to `foundry-feedback.ledger.yml`.

## Case: bacass single process row standalone

- fixture: the `MINIMAP2_ALIGN` row extracted from
  `casts/claude/skills/summarize-nextflow/runs/nf-core__bacass/summary.json`.
- expect: acting on `casts/claude/skills/author-galaxy-tool-wrapper/` with a
  discovery-miss context yields a structurally validated Galaxy UDT or a
  named unresolved source-command assumption. Use only that row's `meta`,
  `module_tests`, `script_excerpt`, `container`, `conda`, and declared IO;
  no summary-level `tools`, `workflow`, or `params` lookup is allowed.
  The wrapper cast currently declares a whole summary as input; record this
  single-row contract mismatch explicitly if it prevents standalone execution.

## Case: nf-test to Galaxy test-plan translation

- fixture: `casts/claude/skills/summarize-nextflow/runs/nf-core__bacass/summary.json`,
  specifically `nf_tests` entry `-profile test` with captures
  `succeeded_task_count`, `versions_yml`, `stable_names`, and `stable_paths`.
- expect: acting on `casts/claude/skills/nextflow-test-to-galaxy-test-plan/`
  yields a schema-valid `galaxy-test-plan.yml` with
  `source.derived_from == test-evidence`. Every capture has an assertion intent
  or a named untranslatable rationale; task counts and pruned file inventories
  must not silently turn into strong content assertions.

## Case: bacass regression pin

- fixture: `workflow-fixtures/pipelines/nf-core__bacass/` and expected output
  `casts/claude/skills/summarize-nextflow/runs/nf-core__bacass/summary.json`.
- expect: built CLI output, recursively sorted by object key (array order
  preserved), equals the committed run. Baseline refreshes are generated by the
  CLI and documented in `changes.md`, together with the Mold revision.

## Case: demo regression pin

- fixture: `workflow-fixtures/pipelines/nf-core__demo/` and expected output
  `casts/claude/skills/summarize-nextflow/runs/nf-core__demo/summary.json`.
- expect: the same normalized-equality contract as bacass, independently checked.

## Corpus paths for process inventory

All paths are relative to `workflow-fixtures/pipelines/` and map directly to
manifest names (`__` represents `/`):

- `nf-core__demo`, `nf-core__fetchngs`, `nf-core__rnaseq`, `nf-core__bacass`,
  `nf-core__hlatyping`, `nf-core__sarek`, `nf-core__taxprofiler`, `nf-core__eager`.
- `nf-core__smrnaseq`, `nf-core__atacseq`, `nf-core__funcscan`,
  `nf-core__multiplesequencealign`, `nf-core__proteinfamilies`,
  `nf-core__bamtofastq`, `nf-core__createtaxdb`, `nf-core__references`.
- `CRG-CNAG__CalliNGS-NF`, `labsyspharm__mcmicro`, `JaneliaSciComp__nf-demos`,
  `ZuberLab__crispr-process-nf`, `biocorecrg__MOP2`,
  `replikation__What_the_Phage`, `epi2me-labs__wf-human-variation`,
  `ncbi__egapx`, `nextflow-io__rnaseq-nf`, `seqeralabs__nf-canary`.
