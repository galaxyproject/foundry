# summarize-nextflow scenarios

Fixtures are pinned in `workflow-fixtures/fixtures.yaml`; materialize with
`make fixtures-nextflow` before running.

## Case: tier-tagged fixtures validate

- fixture: `workflow-fixtures/pipelines/nf-core__{demo,fetchngs,hlatyping,bacass,rnaseq,sarek,taxprofiler}`
- expect: CLI exits 0 and the emitted JSON validates against [[summary-nextflow]]
  (`packages/summarize-nextflow/src/schema/summary-nextflow.schema.json`) with
  `additionalProperties: false`.

## Case: missing source.workflow rejected

- fixture: a pipeline (or synthetic tree) that drives the resolver into a shape
  the schema rejects (e.g. missing required `source.workflow`).
- expect: CLI exits 3 (schema validation failure), prints the AJV error path,
  and nothing partial is written to `--out`.

## Case: DSL1 tree short-circuits

- fixture: a synthetic tree without a `workflow { ... }` block.
- expect: emits the `source` block plus a `warnings[]` entry naming DSL1; does
  not invent processes/channels.

## Case: process inventory vs grep ground truth

- fixture: each tier-tagged fixture in `workflow-fixtures/fixtures.yaml`; ground
  truth from `grep -c '^process ' <every .nf file>` after excluding
  generated/vendor dirs (`.git/`, `work/`, `.nextflow/`, known vendored
  submodules).
- expect: `processes[].length` is at least 80% of grep ground truth and ideally
  exact modulo comments/false-positive grep matches; aliases merged into a
  single `processes[]` entry with imports recorded under `aliases[]`.

## Case: process discovery across layouts

- fixture: every ad-hoc DSL2 fixture in `workflow-fixtures/fixtures.yaml`.
- expect: non-empty `processes[]` for layouts with root-level `modules.nf`, flat
  `modules/<name>.nf`, processes inline in `main.nf`, and process files under
  `workflows/`, `lib/`, or `modules/local/`; no fixture silently succeeds with
  zero processes when grep sees process blocks. Synthetic package regressions
  assert exact counts for each layout class; corpus runs use the 80% threshold
  to tolerate grep false positives.

## Case: CalliNGS-NF multi-process-per-file

- fixture: `workflow-fixtures/pipelines/CRG-CNAG__CalliNGS-NF`.
- expect: summary has 11 `processes[]` entries from root `modules.nf`.

## Case: pipeline-root auto-detect

- fixture: `workflow-fixtures/pipelines/biocorecrg__MOP2` and
  `workflow-fixtures/pipelines/ncbi__egapx`.
- expect: CLI exits 0 from the repository root; `warnings[]` surfaces the
  auto-detected pipeline root so a wrong-root choice is reviewable.

## Case: non-main entrypoint detection

- fixture: `workflow-fixtures/pipelines/replikation__What_the_Phage`.
- expect: summary exits 0 and `warnings[]` names `phage.nf` as the chosen
  entrypoint instead of requiring a literal `main.nf`.

## Case: bacass alias sweep

- fixture: `nf-core__bacass` (known to import `MINIMAP2_ALIGN` three times under
  aliases like `MINIMAP2_CONSENSUS`, `MINIMAP2_POLISH`).
- expect: `processes[].aliases[]` contains every `include { X as Y }` rename for
  `MINIMAP2_ALIGN` and `FASTQC`.

## Case: egapx commented duplicate and subworkflow aliases

- fixture: `ncbi/egapx` at
  `40ec7362576e4b93fa9c5bf0a6c400d9502b8a63`, file
  `nf/subworkflows/ncbi/gnomon-training-iteration/main.nf`.
- expect: `gnomon_training_iterations.inputs[0].name == initial_hmm_params`;
  its inputs include `gnomon_softmask` and exclude the commented
  `models_file` and `gnomon_softmask_lds2`; `calls[]` contains the four
  live spellings `gnomon_training_iteration` through
  `gnomon_training_iteration4`; its emitted expression references
  `gnomon_training_iteration4`; and the canonical
  `gnomon_training_iteration.aliases[]` contains aliases 2, 3, and 4.

## Case: bacass nf-core module metadata and tests

- fixture: `workflow-fixtures/pipelines/nf-core__bacass`.
- expect: every `processes[]` row with `module_path` under `modules/nf-core/`
  has `meta != null`; `meta.tools[]`, `meta.input[]`, and `meta.output[]` are
  normalized from the vendored `meta.yml`; and `module_tests[].length` equals
  the count of `*.nf.test` files under that module's `tests/` directory. Every
  `processes[]` row under `modules/local/` has `meta == null` and
  `module_tests == []`.

## Case: bacass subworkflow tests

- fixture: `workflow-fixtures/pipelines/nf-core__bacass`.
- expect: every `subworkflows[]` row whose `path` lives under
  `subworkflows/nf-core/` has `tests[].length` matching on-disk `*.nf.test`
  files under that subworkflow directory; local or untested subworkflows emit
  `tests == []`. No snapshot contents are inlined.

## Case: container directive coverage

- fixture: each pipeline's resolved per-process container directives.
- expect: every `processes[].tool` is a foreign key into a `tools[]` entry;
  every container/conda directive resolves to at least one of `biocontainer`,
  `bioconda`, `singularity`, `docker`, or `wave`. Unresolved directives appear
  in `warnings[]` with the directive verbatim.

## Case: nf-test case enumeration matches source

- fixture: each pipeline's `tests/*.nf.test` file tree.
- expect: nf-test-kind `test_candidates[]` has one entry per literal pipeline
  `test(...)` block, or one warned aggregate per dynamically generated file;
  each entry has `path`, `effective_profiles[]`, and a `snapshot` block when its
  case contains `assert snapshot(...).match()`.

## Case: canonical whole-pipeline nf-test selection

- fixture: `workflow-fixtures/pipelines/nf-core__demo` at the
  `workflow-fixtures/fixtures.yaml` pin; `tests/default.nf.test` contains the
  `nextflow_pipeline` suite `Test pipeline` with the single case
  `test("-profile test")`, and `nf-test.config` declares `profile "test"`.
- expect: absent an explicit caller choice, selection resolves to
  `tests/default.nf.test::-profile test` with effective profile `test`; the
  duplicate textual `-profile test` in the case label is not used as
  configuration evidence, and no `nf-test` executable is invoked.

## Case: non-canonical pipeline tests remain ambiguous

- fixture: `workflow-fixtures/pipelines/nf-core__references`, whose pipeline
  tests at the `workflow-fixtures/fixtures.yaml` pin are the ten files
  `tests/{hisat2,kallisto,multiple,rnaseq,rsem,salmon,samtools,sarek,tabix,wbcel235}.nf.test`;
  there is no pipeline-level `default.nf.test` or `main.nf.test`.
- expect: the result reports that a scope choice is needed and preserves all
  ten candidates; it does not select `hisat2.nf.test` by filename order or
  infer `test_full` from a config file that is not a resolved profile.

## Case: ad-hoc no-profile fallback is checked for runnability

- fixture: `workflow-fixtures/pipelines/CRG-CNAG__CalliNGS-NF` at the
  `workflow-fixtures/fixtures.yaml` pin; it has no nf-test, no test-kind profile,
  and defaults `genome`, `variants`, `denylist`, and paired `reads` to files
  below the repository's bundled `data/` directory.
- expect: the no-profile candidate is selected because all four required launch
  inputs resolve to those bundled files; its source kind is `pipeline-defaults`
  and its effective profile list is empty.

## Case: test-fixture localization round-trip

- fixture: any pipeline run with `--fetch-test-data --test-data-dir=<tmp>`.
- expect: every remote `test_candidates[].inputs[].url` has a corresponding
  on-disk `path`; SHA-1 hashes are stable across two runs and candidate input
  lists remain independent.

## Case: ad-hoc DSL2 fallback

- fixture: a non-nf-core DSL2 pipeline lacking `nextflow_schema.json` and
  per-module `meta.yml` (placeholder; corpus addition pending).
- expect: process IO is inferred from `script:` blocks rather than invented from
  absent metadata; `warnings[]` notes the missing nf-core affordances.

## Case: bacass downstream binding

- fixture: a `summarize-nextflow` output for a non-trivial pipeline (bacass).
- expect: `nextflow-summary-to-galaxy-data-flow`'s cast skill consumes the JSON
  and produces a draft without "field missing" errors; `author-galaxy-tool-wrapper`
  produces UDT container or package-evidence decisions for every `tools[]` row.
  Any field that proves underspecified becomes an explicit feedback observation
  against the producer Mold or schema. Under feedback mode, append it to the
  registered `foundry-feedback-ledger`; never hide it in prose output.

## Case: bacass single process row standalone

- fixture: `processes[]` row for `MINIMAP2_ALIGN` from a bacass summary.
- expect: `author-galaxy-tool-wrapper` produces a Galaxy UDT using only that
  process object (`meta`, `module_tests`, `container`, `conda`, declared IO); it
  does not consult summary-level `tools[]`, `workflow`, or `params`. Missing
  fields become explicit feedback observations rather than implicit lookups into
  the parent summary.

## Case: nf-test to Galaxy test-plan translation

- fixture: a pipeline with a representative nf-test-kind `test_candidates[]`
  entry containing `snapshot.captures[]`.
- expect: `nextflow-test-to-galaxy-test-plan` maps each capture to a Galaxy
  assertion intent or to an explicit "untranslatable" entry; no captures are
  silently elided.

## Case: bacass regression pin

- fixture: `casts/claude/skills/summarize-nextflow/runs/nf-core__bacass/summary.json`
  (current committed run).
- expect: re-running the CLI against the pinned bacass fixture produces a JSON
  whose normalized form (sorted keys, stable ordering) is byte-identical to the
  committed run, or the diff is intentional and recorded as a schema/Mold
  revision bump.

## Case: demo regression pin

- fixture: `casts/claude/skills/summarize-nextflow/runs/nf-core__demo/summary.json`.
- expect: same contract as bacass.
