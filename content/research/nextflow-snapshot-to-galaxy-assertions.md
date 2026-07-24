---
type: research
title: "Nextflow nf-test snapshots to Galaxy/Planemo assertions"
tags:
  - research/component
  - source/nextflow
  - target/galaxy
status: draft
created: 2026-05-05
revised: 2026-05-05
revision: 2
ai_generated: true
related_notes:
  - "[[tests-format]]"
  - "[[summary-nextflow]]"
  - "[[planemo-asserts-idioms]]"
  - "[[iwc-test-data-conventions]]"
  - "[[iwc-shortcuts-anti-patterns]]"
  - "[[component-nextflow-testing]]"
related_molds:
  - "[[nextflow-test-to-galaxy-test-plan]]"
  - "[[implement-galaxy-workflow-test]]"
sources:
  - "https://github.com/galaxyproject/foundry/issues/65"
  - "https://github.com/galaxyproject/foundry/issues/142"
summary: "Translates nf-test snapshot assertions into Galaxy workflow test-format assertions, broken out by module-level vs pipeline-level test shape."
---

# Nextflow nf-test snapshots to Galaxy/Planemo assertions

Translation guide for the nf-test → Galaxy direction. Companion to [[tests-format]] (assertion vocabulary), [[planemo-asserts-idioms]] (output-type → assertion-family decision table), and [[summary-nextflow]] (source-side schema). This note maps the *snapshot* shape specifically; per-output assertion picking (size delta, image dimensions, etc.) defers to [[planemo-asserts-idioms]].

The corpus split is load-bearing: in the pinned `workflow-fixtures/pipelines/` fixture set, module-level, subworkflow-level, and pipeline-level `*.nf.test` files snapshot different things. Do not depend on exact counts from one fixture checkout; use the split as a shape distinction and re-sample the current fixture set when making inventory claims.

## 0. The framework primitive

nf-test's only assertion mechanism for content is `assert snapshot(<expr>).match()`. The framework serializes `<expr>` to JSON and writes it to a sibling `<name>.nf.test.snap` on first run; subsequent runs diff JSON. When `<expr>` contains files, nf-test serializes each as `<basename>:md5,<hex>` — a content hash, not a byte-equal comparison.

A `.snap` entry looks like:

```json
"sarscov2 - fasta - gtf": {
  "content": [{
    "0":          ["genome.filtered.gtf:md5,aa8b2aa1e0b5fbbba3b04d471e1b0535"],
    "1":          [["GTF_FILTER", "python", "3.9.5"]],
    "genome_gtf": ["genome.filtered.gtf:md5,aa8b2aa1e0b5fbbba3b04d471e1b0535"]
  }],
  "meta":      { "nf-test": "0.9.3", "nextflow": "25.10.2" },
  "timestamp": "2026-02-04T14:37:34.541802092"
}
```

— from `workflow-fixtures/pipelines/nf-core__rnaseq/modules/local/gtf_filter/tests/main.nf.test.snap`.

Three flavors of `<expr>` cover most of the corpus:

- **`process.out`** — module-level. Whole-process output map, every channel.
- **An ad-hoc tuple of files / scalars** — module-level, selective. `snapshot(process.out.dists_multiqc, process.out.versions).match()`.
- **A pipeline-template tuple** — pipeline-level. `snapshot(removeNextflowVersion(...), getAllFilesFromDir(...), getAllFilesFromDir(..., ignoreFile: ...)).match()`.

The first two map cleanly to Galaxy. The third is a different problem.

## 1. Module-level tests (the dominant case)

Pattern (`nextflow_process { ... assert snapshot(process.out).match() }`). The `.snap` `content[0]` object is a map of:

- positional channel index (`"0"`, `"1"`, ...) — every declared `output:` line in declaration order.
- named output identifier (`"genome_gtf"`, `"versions"`, ...) — Nextflow output topics or named emissions, when declared.

Each value is a list of `<basename>:md5,<hex>` strings (or nested lists for collection-shaped emissions, or scalar tuples for non-file values).

### 1a. Direct mapping to Galaxy

| nf-test snap | Galaxy `-tests.yml` |
|---|---|
| named channel key (`genome_gtf`) | `outputs:` label of the same role |
| `<basename>:md5,<hex>` (single file) | `checksum: md5$<hex>` when preserving nf-test snapshot semantics directly; `file:` + `compare:` only when a materialized expected file is available |
| `[<file>, <file>, ...]` (collection emission) | `element_tests:` keyed by element identifier; each element gets the equivalent checksum or file/assertion body |
| `["TOOL", "lang", "version"]` (scalar tuple — e.g. versions) | drop, or `has_text` on tool name in a versions output if exposed |

Galaxy's test format has two exact-output mechanisms:

- `checksum: "md5$<hex>"` checks the produced output content by digest and does not require a `test-data/` expected file. This is the closest direct translation of nf-test's `<basename>:md5,<hex>` snapshot token.
- `file: test-data/<basename>` plus `compare:` compares the produced output against a materialized expected file. Use this when the expected bytes are available and the output format benefits from `compare` options (`diff` with `lines_diff`, `sim_size`, `contains`, etc.).

Do not infer a `file:` comparison from a `.snap` token alone. The token records the expected digest, not the expected bytes.

### 1b. Caveat: stub-mode tests

The pattern in module tests is to pair every real test with a `-stub` variant:

```groovy
test("sarscov2 - fasta - gtf - stub") {
    options "-stub"
    ...
    then {
        assertAll(
            { assert process.success },
            { assert snapshot(process.out).match() }
        )
    }
}
```

Stub-mode runs the process's `stub:` block (typically `touch <output>` for every declared output) instead of `script:`. The recorded md5 is therefore `d41d8cd98f00b204e9800998ecf8427e` (empty file) for every output. **Stub tests are not Galaxy-translatable** — Galaxy has no stub-mode equivalent in the test format. Drop them during translation; they're a Nextflow-specific developer-loop affordance.

### 1c. Caveat: selective snapshots with existence pre-checks

Module tests sometimes mix snapshot-comparable and non-deterministic outputs:

```groovy
{ assert path(process.out.dists_txt.get(0)).exists() },
{ assert path(process.out.pca_txt.get(0)).exists() },
{ assert snapshot(
    process.out.dists_multiqc,
    process.out.pca_multiqc,
    process.out.versions
).match() }
```

— `workflow-fixtures/pipelines/nf-core__rnaseq/modules/local/deseq2_qc/tests/main.nf.test`.

Two patterns to map:

- `path(...).exists()` → Galaxy implicit by default (a labeled output that doesn't exist fails the test). Stronger: `has_size: { min: 1 }` if emptiness needs to fail.
- Selective `snapshot(a, b, c)` → only `a`, `b`, `c` get checksum or file-backed assertions; the existence-only outputs stay as labeled outputs with no `file:`.

### 1d. Caveat: positional vs named keys

The `.snap` records **both** positional keys (`"0"`, `"1"`, ...) and named keys (`"genome_gtf"`, ...) for the same data. Use the named keys as the Galaxy output label source; the positional duplicates are an nf-test serialization quirk and would create false duplication in `-tests.yml`.

When a process declares positional-only outputs (no `emit:` names), the named keys are absent. In that case the Galaxy translation needs an output label invented at translation time — flag for human review.

## 2. Pipeline-level tests (the harder case)

Pattern (`nextflow_pipeline { ... }`). The nf-core pipeline template uses a near-uniform body, e.g. `workflow-fixtures/pipelines/nf-core__demo/tests/default.nf.test`:

```groovy
def stable_name = getAllFilesFromDir(params.outdir, relative: true, includeDir: true, ignore: ['pipeline_info/*.{html,json,txt}'])
def stable_path = getAllFilesFromDir(params.outdir, ignoreFile: 'tests/.nftignore')
assertAll(
    { assert workflow.success },
    { assert snapshot(
        removeNextflowVersion("$outputDir/pipeline_info/nf_core_demo_software_mqc_versions.yml"),
        stable_name,
        stable_path
    ).match() }
)
```

Three captures, each translatable to a different Galaxy concept (when at all):

- **`removeNextflowVersion(...versions.yml)`** — the pipeline's aggregated tool-versions YAML with the Nextflow version line stripped to avoid spurious diffs across `nextflow` versions. Galaxy has no equivalent — tool versions are tracked by wrapper `<requirements>` and surfaced in invocation provenance, not asserted in `-tests.yml`. **Drop, or replace with a weak `has_text` on a tool name** if a versions output is exposed.
- **`stable_name` (file paths, no content)** — a *list of paths* under the publish dir. Asserts "these output files exist with these names." In Galaxy this is the *set of labeled outputs* in the workflow's outputs block, plus, for collection outputs, the set of `element_tests:` keys. There is no single Galaxy assertion that mirrors "list every published file"; the equivalent is per-output existence implied by labelling.
- **`stable_path` (file paths *and* content via md5)** — the `.snap` records `<path>:md5,<hex>`. Translate per-file as in §1a: `checksum` for direct snapshot parity; a file-backed `compare:` or assertion-family choice from [[planemo-asserts-idioms]] §1 when expected files are available or checksum is too brittle. `.nftignore` (see §2a) controls which files are in this set.

### 2a. `.nftignore`, `ignoreFile:`, and `ignore:` globs

`getAllFilesFromDir(..., ignoreFile: 'tests/.nftignore')` and `ignore: [<glob>, ...]` prune which files appear in the snapshot. They don't translate to Galaxy assertions — they translate to **which workflow outputs the Galaxy `.ga` exposes as labeled outputs in the first place.**

A typical `.nftignore` excludes:

- timestamped report HTML (MultiQC, FastQC summaries)
- log / pipeline_info bundles
- `versions.yml` aggregations that vary tool-by-tool

In Galaxy authoring, this maps to: don't promote those step outputs to workflow outputs. The labeled-outputs set on the `.ga` is the equivalent of `stable_path`.

### 2b. `succeeded_task_count`

Some nf-core pipeline tests pre-template variants pass a `workflow.trace.succeededCount()` or similar into the snapshot. The translation is **not a per-output assertion** — Galaxy/Planemo invocation success is asserted at the invocation level, not per-output. Drop. (See §1 of [[summarize-nextflow]] for why summary-nextflow currently lists `succeeded_task_count` as a typical capture — it's an nf-core-template convention, not nf-test framework vocabulary.)

## 3. Subworkflow-level tests (briefly)

Subworkflow tests (`subworkflows/**/tests/main.nf.test`) follow the module pattern: `nextflow_workflow { ... assert snapshot(workflow.out).match() }`. The `.snap` keys are subworkflow output channel names. Map per §1.

## 3a. Corpus evidence posture

This note cites local fixture paths as examples, not as stable inventory statistics. The generated Nextflow fixture set is pinned by `workflow-fixtures/fixtures.yaml`, but upstream test layouts can change when fixture pins move. When counts matter for a design decision, recompute them from the current fixture checkout and cite the command or survey note that produced them. For translation rules, prefer shape claims that survive fixture churn: module tests snapshot process outputs, subworkflow tests snapshot workflow outputs, and pipeline tests usually snapshot publish-directory helper results.

## 4. Helper functions

| Helper | Translatable? | Notes |
|---|---|---|
| `getAllFilesFromDir(dir, ...)` | Indirectly | Defines the *scope* of files snapshotted; maps to which outputs the `.ga` exposes (§2a). No direct Galaxy assertion. |
| `removeNextflowVersion(file)` | No | Strips a version-banner line from a YAML before hashing. Galaxy doesn't need this — version handling is orthogonal. Drop the file from translation, or assert with `has_text` on a tool name. |
| Pipeline-local helpers (Groovy methods) | Case-by-case | Read the helper body. If it's a known pattern (line strip, key prune), the translation may exist; otherwise flag for human review. |

## 5. What does not translate automatically

- **Stub-mode tests** (`options "-stub"`) — no Galaxy equivalent. Drop.
- **`succeeded_task_count`** — invocation-level signal, not a per-output assertion.
- **Custom Groovy helpers** beyond `removeNextflowVersion` and `getAllFilesFromDir`.
- **`prose_assertions[]`** in `summary-nextflow` (free-text non-snapshot assertions extracted from `assertAll`) — by construction free-form; needs human/LLM judgement.
- **Channel-emission snapshots without a published output** — module tests can snapshot intermediate channels that aren't promoted to a workflow output. Galaxy has no analog; only published outputs translate.
- **`workflow.trace.*` and `workflow.stats.*` assertions** — Nextflow runtime metadata, not Galaxy testable.
- **Test profile data overrides** — these are *job inputs*, not assertions. Handled by [[nextflow-test-to-galaxy-test-plan]].

## 6. Authoring loop

Two staircases reduce assertion-iteration cost. Both detailed in [[planemo-asserts-idioms]] §§6–7:

1. Static gates: `validateTestsFile` (schema) and `checkTestsAgainstWorkflow` (label/type cross-check). Pure-JS, milliseconds, no Galaxy dependency.
2. `planemo workflow_test_init --from_invocation` to bootstrap a `-tests.yml` from a successful invocation, then `planemo workflow_test_on_invocation` to iterate assertions without re-running the workflow.

For a Nextflow → Galaxy translation: run the translated Galaxy workflow once, bootstrap with `--from_invocation`, then rewrite the autogenerated assertions using the nf-test `.snap` content as the expected-output authority where applicable. If the nf-test token is the only expected-output evidence, prefer `checksum: "md5$<hex>"`; if the expected file is materialized, choose `file:`/`compare:` or richer `asserts:` per [[planemo-asserts-idioms]].

## 7. Source-side gap

`SnapshotFixture` in `summary-nextflow.schema.json` records `captures[]`, `helpers[]`, `ignore_files[]`, `ignore_globs[]`, `snap_path` — but **does not parse the `.snap` JSON** itself. For module tests where `captures = ["process.out"]`, the structurally interesting per-channel filename+md5 lives only in the sidecar. Until that's parsed (#142), a translation Mold has to re-read `.snap` at runtime.

## 8. Cross-references

- [[tests-format]] — Galaxy assertion vocabulary, deep-link via [[tests-format#<def>]].
- [[planemo-asserts-idioms]] — output-type → assertion-family decision table; tolerance magnitudes; static-gate inner loop.
- [[summary-nextflow]] — source-side schema, including `NfTest` and `SnapshotFixture` shape.
- [[iwc-test-data-conventions]] — Galaxy job-input shape (the *other* half of test translation).
- [[iwc-shortcuts-anti-patterns]] — accepted-vs-smell catalog.
- [[component-nextflow-testing]] — primary-source links into nf-test, nf-core, and `nf-core/test-datasets`.
- nf-test snapshot docs: [nf-co.re/docs/developing/testing/overview](https://nf-co.re/docs/developing/testing/overview).
