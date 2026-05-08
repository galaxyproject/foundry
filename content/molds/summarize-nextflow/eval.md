# summarize-nextflow eval

Evaluation plan for the `summarize-nextflow` Mold and its CLI implementation
(`@galaxy-foundry/summarize-nextflow`). Cases are tagged by bucket:

- **schema** — does the emitted JSON validate?
- **fidelity** — does the JSON faithfully reflect the source pipeline?
- **utility** — can downstream Molds bind to the output without holes?
- **regression** — does a re-cast reproduce the prior committed run?

Fixtures are pinned in `workflow-fixtures/fixtures.yaml`; materialize with
`make fixtures-nextflow` before running.

## Case: schema-validates against every tier-tagged fixture

- bucket: schema
- check: deterministic
- fixture: `workflow-fixtures/pipelines/nf-core__{demo,fetchngs,hlatyping,bacass,rnaseq,sarek,taxprofiler}`
- expectation: CLI exits 0 and the emitted JSON validates against
  [[summary-nextflow]] (`packages/summary-nextflow-schema/src/summary-nextflow.schema.json`) with `additionalProperties: false`.

## Case: schema-validation failure surfaces, does not silently emit

- bucket: schema
- check: deterministic
- fixture: a pipeline (or synthetic tree) that drives the resolver into a
  shape the schema rejects (e.g. missing required `source.workflow`).
- expectation: CLI exits 3 (schema validation failure) and prints the AJV
  error path; nothing partial is written to `--out`.

## Case: DSL1 short-circuit

- bucket: schema
- check: deterministic
- fixture: a synthetic tree without a `workflow { ... }` block.
- expectation: emits the `source` block plus a `warnings[]` entry naming
  DSL1; does not invent processes/channels.

## Case: process inventory matches grep ground truth

- bucket: fidelity
- check: deterministic
- fixture: each tier-tagged fixture in `workflow-fixtures/fixtures.yaml`; ground truth from
  `grep -c '^process ' <every .nf file>` after excluding generated/vendor dirs
  (`.git/`, `work/`, `.nextflow/`, known vendored submodules).
- expectation: `processes[].length` is at least 80% of grep ground truth and
  ideally exact modulo comments/false-positive grep matches; aliases are merged
  into a single `processes[]` entry with the imports recorded under `aliases[]`.

## Case: process discovery is layout-agnostic

- bucket: fidelity
- check: deterministic
- fixture: every ad-hoc DSL2 fixture in `workflow-fixtures/fixtures.yaml`.
- expectation: CLI emits non-empty `processes[]` for layouts with root-level
  `modules.nf`, flat `modules/<name>.nf`, processes inline in `main.nf`, and
  process files under `workflows/`, `lib/`, or `modules/local/`; no fixture
  silently succeeds with zero processes when grep sees process blocks. Synthetic
  package regressions should assert exact counts for each layout class; corpus
  runs use the 80% threshold above to tolerate grep false positives.

## Case: multi-process-per-file

- bucket: fidelity
- check: deterministic
- fixture: `workflow-fixtures/pipelines/CRG-CNAG__CalliNGS-NF`.
- expectation: summary has 11 `processes[]` entries from root `modules.nf`.

## Case: pipeline-root auto-detect

- bucket: fidelity
- check: deterministic
- fixture: `workflow-fixtures/pipelines/biocorecrg__MOP2` and
  `workflow-fixtures/pipelines/ncbi__egapx`.
- expectation: CLI exits 0 from the repository root; `warnings[]` surfaces the
  auto-detected pipeline root so a wrong-root choice is reviewable.

## Case: non-main entrypoint detection

- bucket: fidelity
- check: deterministic
- fixture: `workflow-fixtures/pipelines/replikation__What_the_Phage`.
- expectation: summary exits 0 and `warnings[]` names `phage.nf` as the chosen
  entrypoint instead of requiring a literal `main.nf`.

## Case: alias sweep on bacass

- bucket: fidelity
- check: deterministic
- fixture: `nf-core__bacass` (known to import `MINIMAP2_ALIGN` three times
  under aliases like `MINIMAP2_CONSENSUS`, `MINIMAP2_POLISH`).
- expectation: `processes[].aliases[]` contains every `include { X as Y }`
  rename for `MINIMAP2_ALIGN` and `FASTQC`.

## Case: nf-core module metadata and unit tests are process-local

- bucket: fidelity
- check: deterministic
- fixture: `workflow-fixtures/pipelines/nf-core__bacass`.
- expectation: every `processes[]` row with `module_path` under
  `modules/nf-core/` has `meta != null`; `meta.tools[]`, `meta.input[]`,
  and `meta.output[]` are normalized from the vendored `meta.yml`; and
  `module_tests[].length` equals the count of `*.nf.test` files under that
  module's `tests/` directory. Every `processes[]` row under
  `modules/local/` has `meta == null` and `module_tests == []`.

## Case: subworkflow unit tests are enumerated without semantics

- bucket: fidelity
- check: deterministic
- fixture: `workflow-fixtures/pipelines/nf-core__bacass`.
- expectation: every `subworkflows[]` row whose `path` lives under
  `subworkflows/nf-core/` has `tests[].length` matching on-disk
  `*.nf.test` files under that subworkflow directory; local or untested
  subworkflows emit `tests == []`. No snapshot contents are inlined.

## Case: tool registry covers every container directive

- bucket: fidelity
- check: deterministic
- fixture: each pipeline's resolved per-process container directives.
- expectation: every `processes[].tool` is a foreign key into a `tools[]`
  entry; every container/conda directive resolves to at least one of
  `biocontainer`, `bioconda`, `singularity`, `docker`, or `wave`. Unresolved
  directives appear in `warnings[]` with the directive verbatim.

## Case: nf-test enumeration matches filesystem

- bucket: fidelity
- check: deterministic
- fixture: each pipeline's `tests/*.nf.test` file tree.
- expectation: `nf_tests[].length` equals the file count; each entry has
  `path`, `profiles[]`, and a `snapshot` block when the file contains
  `assert snapshot(...).match()`.

## Case: test-fixture localization round-trip

- bucket: fidelity
- check: deterministic
- fixture: any pipeline run with `--fetch-test-data --test-data-dir=<tmp>`.
- expectation: every remote `test_fixtures.inputs[].url` has a corresponding
  on-disk `path`; SHA-1 hashes are stable across two runs.

## Case: ad-hoc DSL2 fallback

- bucket: fidelity
- check: llm-judged
- fixture: a non-nf-core DSL2 pipeline lacking `nextflow_schema.json` and
  per-module `meta.yml` (placeholder; corpus addition pending).
- expectation: process IO is inferred from `script:` blocks rather than
  invented from absent metadata; `warnings[]` notes the missing nf-core
  affordances.

## Case: data-flow Mold can bind without holes

- bucket: utility
- check: llm-judged
- fixture: a `summarize-nextflow` output for a non-trivial pipeline
  (e.g. bacass).
- expectation: `nextflow-summary-to-galaxy-data-flow`'s cast skill consumes the JSON
  and produces a draft without "field missing" errors. Any field it
  consults that proves underspecified gets logged in `content/log.md`
  under `gap:` and triggers an Open-gaps note update.

## Case: tool-authoring Mold can resolve every tools row

- bucket: utility
- check: llm-judged
- fixture: same JSON.
- expectation: `author-galaxy-tool-wrapper` can produce UDT container or
  package-evidence decisions for every `tools[]` row; rows that don't yield
  a UDT-safe container are surfaced as evaluation gaps, not
  silently dropped.

## Case: tool-authoring Mold can consume one process row standalone

- bucket: utility
- check: llm-judged
- fixture: `processes[]` row for `MINIMAP2_ALIGN` from a bacass summary.
- expectation: `author-galaxy-tool-wrapper` produces a Galaxy UDT
  using only that process object (`meta`, `module_tests`, `container`,
  `conda`, declared IO); it does not consult summary-level `tools[]`,
  `workflow`, or `params`. Missing fields become logged gaps rather than
  implicit lookups into the parent summary.

## Case: nf-test to Galaxy test-plan translation

- bucket: utility
- check: llm-judged
- fixture: a pipeline with a representative `nf_tests[]` entry containing
  `snapshot.captures[]`.
- expectation: `nextflow-test-to-galaxy-test-plan` maps each
  capture to Galaxy assertion intent or to an explicit "untranslatable" entry;
  no captures are silently elided.

## Case: bacass hand-cast diff is reproduced

- bucket: regression
- check: deterministic
- fixture: `casts/claude/summarize-nextflow/runs/nf-core__bacass/summary.json`
  (current committed run).
- expectation: re-running the CLI against the pinned bacass fixture
  produces a JSON whose normalized form (sorted keys, stable ordering)
  is byte-identical to the committed run, or the diff is intentional and
  recorded as a schema/mold revision bump.

## Case: demo hand-cast diff is reproduced

- bucket: regression
- check: deterministic
- fixture: `casts/claude/summarize-nextflow/runs/nf-core__demo/summary.json`.
- expectation: same contract as bacass.
