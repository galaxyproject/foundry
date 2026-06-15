# summarize-nextflow scenarios

Concrete cases for `summarize-nextflow`, exercised against the abstract
properties in `eval.md`. Each case binds a fixture and states its expected
values; the `eval.md` oracle is applied to whatever the case produces. Fixtures
are pinned in `workflow-fixtures/fixtures.yaml`; materialize with
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

## Case: nf-test enumeration matches filesystem

- fixture: each pipeline's `tests/*.nf.test` file tree.
- expect: `nf_tests[].length` equals the file count; each entry has `path`,
  `profiles[]`, and a `snapshot` block when the file contains
  `assert snapshot(...).match()`.

## Case: test-fixture localization round-trip

- fixture: any pipeline run with `--fetch-test-data --test-data-dir=<tmp>`.
- expect: every remote `test_fixtures.inputs[].url` has a corresponding on-disk
  `path`; SHA-1 hashes are stable across two runs.

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
  Any field that proves underspecified is logged in `content/log.md` under
  `gap:` and triggers an Open-gaps note update.

## Case: bacass single process row standalone

- fixture: `processes[]` row for `MINIMAP2_ALIGN` from a bacass summary.
- expect: `author-galaxy-tool-wrapper` produces a Galaxy UDT using only that
  process object (`meta`, `module_tests`, `container`, `conda`, declared IO); it
  does not consult summary-level `tools[]`, `workflow`, or `params`. Missing
  fields become logged gaps rather than implicit lookups into the parent summary.

## Case: nf-test to Galaxy test-plan translation

- fixture: a pipeline with a representative `nf_tests[]` entry containing
  `snapshot.captures[]`.
- expect: `nextflow-test-to-galaxy-test-plan` maps each capture to a Galaxy
  assertion intent or to an explicit "untranslatable" entry; no captures are
  silently elided.

## Case: bacass regression pin

- fixture: `casts/claude/summarize-nextflow/runs/nf-core__bacass/summary.json`
  (current committed run).
- expect: re-running the CLI against the pinned bacass fixture produces a JSON
  whose normalized form (sorted keys, stable ordering) is byte-identical to the
  committed run, or the diff is intentional and recorded as a schema/Mold
  revision bump.

## Case: demo regression pin

- fixture: `casts/claude/summarize-nextflow/runs/nf-core__demo/summary.json`.
- expect: same contract as bacass.
