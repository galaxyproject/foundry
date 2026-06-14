# summarize-nextflow eval

Evaluation plan for the `summarize-nextflow` Mold and its CLI implementation
(`@galaxy-foundry/summarize-nextflow`). This file is the **abstract oracle**:
properties any run must satisfy, independent of fixture. Concrete fixtures and
their expected values live in `scenarios.md`; the oracle here is applied to
whatever a scenario produces. Properties are tagged by bucket:

- **schema** — does the emitted JSON validate?
- **fidelity** — does the JSON faithfully reflect the source pipeline?
- **utility** — can downstream Molds bind to the output without holes?
- **regression** — does a re-run reproduce a prior committed run?

## Property: successful runs emit schema-valid JSON

- bucket: schema
- check: deterministic
- assertion: on success the CLI exits 0 and the emitted JSON validates against
  [[summary-nextflow]] with `additionalProperties: false`.

## Property: schema-invalid output fails loud, never partial

- bucket: schema
- check: deterministic
- assertion: when the resolver produces a shape the schema rejects, the CLI
  exits 3, prints the AJV error path, and writes nothing partial to `--out`.

## Property: DSL1 short-circuits without fabrication

- bucket: schema
- check: deterministic
- assertion: a tree with no `workflow { ... }` block emits the `source` block
  plus a `warnings[]` entry naming DSL1; it invents no processes or channels.

## Property: process inventory is complete vs ground truth

- bucket: fidelity
- check: deterministic
- assertion: `processes[].length` is at least 80% of grep ground truth and
  ideally exact modulo comments/false positives; every `include { X as Y }`
  alias is merged into one `processes[]` entry with renames recorded under
  `aliases[]`.

## Property: process discovery is layout-agnostic

- bucket: fidelity
- check: deterministic
- assertion: `processes[]` is non-empty for every layout class (root
  `modules.nf`, flat `modules/<name>.nf`, inline in `main.nf`, files under
  `workflows/`/`lib/`/`modules/local/`); no input silently succeeds with zero
  processes when grep sees `process` blocks.

## Property: pipeline-root and entrypoint choices are reviewable

- bucket: fidelity
- check: deterministic
- assertion: when run from a repository root, `warnings[]` surfaces the
  auto-detected pipeline root; a non-`main.nf` entrypoint is detected and named
  in `warnings[]` rather than requiring a literal `main.nf`. A wrong-root or
  wrong-entrypoint choice is never silent.

## Property: nf-core module metadata and tests are process-local

- bucket: fidelity
- check: deterministic
- assertion: every `processes[]` row under `modules/nf-core/` has `meta != null`
  normalized from the vendored `meta.yml` (`meta.tools[]`/`input[]`/`output[]`),
  and `module_tests[].length` equals the on-disk `*.nf.test` count for that
  module; every `modules/local/` row has `meta == null` and `module_tests == []`.

## Property: subworkflow tests are enumerated structurally

- bucket: fidelity
- check: deterministic
- assertion: every `subworkflows[]` row under `subworkflows/nf-core/` has
  `tests[].length` matching its on-disk `*.nf.test` count; local or untested
  subworkflows emit `tests == []`; no snapshot contents are inlined.

## Property: every tool directive resolves or is flagged

- bucket: fidelity
- check: deterministic
- assertion: every `processes[].tool` is a foreign key into a `tools[]` entry,
  and every container/conda directive resolves to at least one of biocontainer,
  bioconda, singularity, docker, or wave; unresolved directives appear in
  `warnings[]` with the directive verbatim.

## Property: nf-test enumeration matches the filesystem

- bucket: fidelity
- check: deterministic
- assertion: `nf_tests[].length` equals the `*.nf.test` file count; each entry
  carries `path`, `profiles[]`, and a `snapshot` block whenever the file
  contains `assert snapshot(...).match()`.

## Property: test-fixture localization round-trips with stable hashes

- bucket: fidelity
- check: deterministic
- assertion: under `--fetch-test-data`, every remote `test_fixtures.inputs[].url`
  gets a corresponding on-disk `path`, and SHA-1 hashes are stable across two
  runs.

## Property: ad-hoc DSL2 IO is inferred, not invented

- bucket: fidelity
- check: llm-judged
- assertion: for a pipeline lacking `nextflow_schema.json` and per-module
  `meta.yml`, process IO is inferred from `script:` blocks rather than
  fabricated from absent metadata, and `warnings[]` notes the missing nf-core
  affordances.

## Property: data-flow Mold binds without holes

- bucket: utility
- check: llm-judged
- assertion: `nextflow-summary-to-galaxy-data-flow` consumes the JSON and
  produces a draft without "field missing" errors; any field it consults that
  proves underspecified is logged as a gap rather than silently dropped.

## Property: tool-authoring resolves every tools row

- bucket: utility
- check: llm-judged
- assertion: `author-galaxy-tool-wrapper` produces a UDT container or
  package-evidence decision for every `tools[]` row; rows that don't yield a
  UDT-safe container surface as evaluation gaps, not silent drops.

## Property: tool-authoring consumes one process row standalone

- bucket: utility
- check: llm-judged
- assertion: `author-galaxy-tool-wrapper` builds a Galaxy UDT from a single
  `processes[]` object (`meta`, `module_tests`, `container`, `conda`, declared
  IO) without consulting summary-level `tools[]`, `workflow`, or `params`;
  missing fields become logged gaps rather than implicit parent lookups.

## Property: nf-test maps to a test plan without silent loss

- bucket: utility
- check: llm-judged
- assertion: `nextflow-test-to-galaxy-test-plan` maps each `snapshot.captures[]`
  to a Galaxy assertion intent or to an explicit "untranslatable" entry; no
  captures are silently elided.

## Property: re-runs are reproducible

- bucket: regression
- check: deterministic
- assertion: re-running against a pinned fixture produces JSON whose normalized
  form (sorted keys, stable ordering) is byte-identical to the committed run, or
  the diff is intentional and recorded as a schema/Mold revision bump.
