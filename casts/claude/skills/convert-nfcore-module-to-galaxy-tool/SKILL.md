---
name: convert-nfcore-module-to-galaxy-tool
description: "Convert one nf-core module dir into a Galaxy tool wrapper (tool.xml + macros.xml + _provenance.yml + remote-URL <test> blocks)."
---

# convert-nfcore-module-to-galaxy-tool

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Convert one nf-core module dir into a Galaxy tool wrapper (tool.xml + macros.xml + _provenance.yml + remote-URL <test> blocks).

## Inputs

- No upstream artifact inputs declared. See the procedure for user-supplied runtime inputs.

## Outputs

- None declared.

## Required Tools

- **`planemo`** (planemo). `uv tool install planemo==0.75.44` (or `pip install planemo==0.75.44`).
  Ephemeral run: `uvx --from planemo==0.75.44 planemo`.
  Check: `planemo --version`.
  Docs: https://planemo.readthedocs.io/
  Bundled reference: `references/cli/planemo.md`.

## Load Upfront

- `references/cli/planemo.md`: CLI tool reference copied verbatim into the bundle. Install metadata for the planemo CLI invoked by the convergence loop. Use when: always — the cast skill needs planemo on PATH before running lint/test.
- `references/notes/nfcore-channel-input-to-galaxy-collection.md`: Research note copied verbatim into the bundle. Map process input channels (tuple(meta, path)) to Galaxy <param type="data"> / <param type="data_collection">. Use when: emitting <inputs> for a module.
- `references/notes/nfcore-meta-map-to-galaxy-params.md`: Research note copied verbatim into the bundle. Triage meta-map keys: behavior-driving keys become Galaxy <param>s; identity keys are dropped. Use when: a process consumes a meta-map and any meta keys influence the script: body.
- `references/notes/nfcore-stub-block-to-galaxy-noop-test.md`: Research note copied verbatim into the bundle. Document the intentional drop of stub: blocks; rely on planemo test for fixture coverage. Use when: the module's main.nf contains a stub: block.
- `references/notes/nfcore-task-ext-args-to-galaxy-additional-options.md`: Research note copied verbatim into the bundle. Surface task.ext.args as a single Galaxy text param; do not enumerate per-flag inputs. Use when: the upstream script: body interpolates ${task.ext.args} (or args2/args3).
- `references/notes/nfcore-versions-emit-to-galaxy-version-command.md`: Research note copied verbatim into the bundle. Translate the versions.yml emit block (or topic: versions) into Galaxy's <version_command>. Use when: the script: body or output: declarations contain a versions emit.

## Load On Demand

- `references/cli/planemo-lint.json`: CLI command reference packaged as a sidecar. Reference for `planemo lint` flags and output classification; first gate in the convergence loop. Use when: step 10.1 — after every <command>/<inputs>/<outputs> emission.
- `references/cli/planemo-test.json`: CLI command reference packaged as a sidecar. Reference for `planemo test --test_output_json` invocation, exit codes, and the JSON report path. Use when: step 10.2 — after lint clears.
- `references/notes/component-nextflow-containers-and-envs.md`: Research note copied verbatim into the bundle. Resolve the container directive (mulled, biocontainer, Wave) and environment.yml into a Galaxy <requirements> block with matching bioconda pins. Use when: emitting <requirements> and the module's container directive is non-trivial (ternary or mulled).
- `references/notes/component-nextflow-containers-and-envs.yml`: Companion file copied verbatim into the bundle. Sibling of `references/notes/component-nextflow-containers-and-envs.md`; read it where that note directs.
- `references/notes/component-nf-core-tools.md`: Research note copied verbatim into the bundle. Reference for nf-core module conventions: meta.yml shape, modules.json, environment.yml posture, test layout, container directive idioms. Use when: parsing meta.yml, environment.yml, or main.nf and a convention is unclear; when populating _provenance.yml.
- `references/notes/galaxy-discover-datasets.md`: Research note copied verbatim into the bundle. Reference for the <discover_datasets> XML element: attributes, named/regex patterns, <data> vs <collection> contexts, test-side <discovered_dataset>. Use when: translating a Nextflow output: channel that uses a glob path or runtime-interpolated filenames into a Galaxy <collection> or multi-output <data>.
- `references/schemas/planemo-test-report.schema.json`: Schema file copied verbatim into the bundle. Validate `planemo test --test_output_json` output before classifying failures; the JSON gate that replaces free-text parsing. Use when: step 10.2 — after every `planemo test` invocation.

## Validation

- None declared.

## Procedure

Convert **one nf-core module directory** into a Galaxy tool wrapper. Input is a path to `modules/nf-core/<name>/` (or any directory of the same shape: `main.nf` + `meta.yml` + `environment.yml` + optional `tests/`). Output is a self-contained tool dir: `tool.xml`, `macros.xml`, `_provenance.yml`, with `<test>` blocks pinned to remote `nf-core/test-datasets` URLs.

The skill authors a Galaxy tool XML wrapper directly from the nf-core module shape — the regular structure (`tuple(meta, path)` channels, `task.ext.args` escape hatch, versions emit, environment.yml bioconda pin) makes a mechanical mapping practical. It does **not** depend on `summarize-nextflow` — that skill summarizes whole pipelines, the wrong granularity for one module.

The skill is run per module by an outer harness (a script or human loop). Cross-module batches are not its concern.

### Inputs

The skill expects:

- A **path** to the module directory (`modules/nf-core/<name>/`, or any local clone of that shape).
- Optional **module pin**: tag, branch, or commit SHA of `nf-core/modules`. When absent, the skill resolves to `git rev-parse HEAD` of the dir's containing repo.
- Optional **test-datasets pin**: SHA of `nf-core/test-datasets` to use for `<test>` block `location` URLs. When absent, the skill resolves to a recent SHA on the module's pipeline-of-record branch (best-effort; recorded in `_provenance.yml` either way).

The skill does **not** accept "convert a subworkflow" — `meta.yml` with a populated `components:` field is out of scope (composes other modules; route to a separate subworkflow skill not in this plan).

### Outputs

Three files in a sibling output directory the harness specifies:

```
<output_dir>/
  <name>.xml          # primary wrapper
  macros.xml          # tool-local macros (token, requirements, version_command, citations)
  _provenance.yml     # nfcore source SHA, file hashes, mold revision, generated_at
```

`tool.xml` shape (skeleton; idiomatic IUC layout):

```xml
<tool id="<name>" name="<name>" version="@TOOL_VERSION@+galaxy@VERSION_SUFFIX@" profile="23.1">
  <description><!-- meta.yml description, first sentence --></description>
  <macros>
    <import>macros.xml</import>
  </macros>
  <expand macro="requirements"/>
  <expand macro="version_command"/>
  <command detect_errors="exit_code"><![CDATA[
    <!-- script: body translated, $task.ext.args → $extra_args -->
  ]]></command>
  <inputs>
    <!-- per nfcore-channel-input-to-galaxy-collection + nfcore-meta-map-to-galaxy-params -->
    <param name="extra_args" type="text" optional="true" .../>  <!-- per task.ext.args pattern -->
  </inputs>
  <outputs>
    <!-- one Galaxy <data> / <collection> per output: channel, minus the versions channel -->
  </outputs>
  <tests>
    <test>
      <param name="reads_1" location="https://raw.githubusercontent.com/nf-core/test-datasets/<sha>/.../test_1.fastq.gz"/>
      <output name="trimmed" location="https://raw.githubusercontent.com/nf-core/test-datasets/<sha>/.../trimmed.fastq.gz"
              checksum="sha256$..."/>
    </test>
  </tests>
  <help><!-- meta.yml description --></help>
  <expand macro="citations"/>
</tool>
```

`_provenance.yml` shape (canonical):

```yaml
nfcore_source:
  modules_repo: nf-core/modules
  module_path: modules/nf-core/<name>
  branch: master
  git_sha: <sha at conversion time>
  meta_yml_hash: <sha256 of meta.yml at conversion>
  main_nf_hash:  <sha256 of main.nf at conversion>
  environment_yml_hash: <sha256 of environment.yml at conversion>
  test_datasets_sha: <sha of nf-core/test-datasets pin>
generated:
  by_mold: convert-nfcore-module-to-galaxy-tool
  mold_revision: 1
  cast_target: claude
  cast_artifact_sha: <sha of cast bundle used>
  on_date: 2026-05-10
overrides: []
```

### Procedure

The skill is **not a single LLM prompt**. It is a small program with embedded LLM calls:

- **Deterministic:** read meta.yml / main.nf / environment.yml / tests/main.nf.test; tokenize the `process` block for input/output channels; resolve container directive into bioconda packages; compute file hashes; resolve git SHAs; emit `_provenance.yml` and the static portions of `<requirements>`, `<citations>`, `<version_command>`.
- **LLM-driven:** translate the `script:` body into Galaxy `<command>` Cheetah; pick `<inputs>` shapes (data vs collection; conditional gating); name and document outputs; humanize `<help>`; place `<test>` block fixtures.

The boundary mirrors `summarize-nextflow` §Procedure: enumerated artifacts deterministic, free-text fields LLM.

#### 1. Read the module

Open `meta.yml`, `main.nf`, `environment.yml`, and `tests/main.nf.test` (when present). Reject early if `meta.yml.components:` is populated (subworkflow composing other modules; out of scope — see *Non-goals*).

Compute `sha256` of each file and capture for `_provenance.yml`.

#### 2. Build `<requirements>`

Walk `environment.yml.dependencies:`. Each `bioconda::<name>=<version>` becomes a Galaxy `<requirement type="package" version="<version>"><name></requirement>` entry. For mulled / multi-package environments, declare every package — bioconda's mulled-resolution produces an equivalent image (per `component-nextflow-containers-and-envs`).

Record any forced divergence from upstream container choice in `_provenance.yml.overrides`.

#### 3. Translate `<inputs>`

Per `nfcore-channel-input-to-galaxy-collection`, decide the Galaxy input shape from the process's input channel cardinality. Per `nfcore-meta-map-to-galaxy-params`, triage meta-map keys into Galaxy params, conditionals, or drops.

Emit a final `extra_args` text param per `nfcore-task-ext-args-to-galaxy-additional-options` if (and only if) the script body interpolates `${task.ext.args}` / `args2` / `args3`.

#### 4. Translate `<outputs>`

For each `output:` channel that isn't the `versions` emit, **decide cardinality first, then shape** (per `galaxy-discover-datasets` §*Convert skill posture*). The Nextflow glob alone is not enough — `path('*.bam')` (N files, one per element of an upstream collection) and `path('*.{bai,csi,crai}')` (exactly one file, alternation across mutually-exclusive extensions) look the same but map to different Galaxy idioms.

- **Single output, deterministic name** (`path("${prefix}.json")`) → `<data name="..." format="json" from_work_dir="${prefix}.json"/>`. No `<discover_datasets>`.
- **Single output, variable extension** (alternation glob like `path("*.{bai,csi,crai}")`, or `path("${prefix}.${ext}")` where `ext` is computed): the channel emits **one** file whose extension depends on inputs or args. Map to a `<data>` with the most-common extension as `format=`, plus a `<change_format>` block that flips on the input ext or the responsible param. **Preserve the upstream invocation byte-for-byte** and capture the result with a tight `mv` — `ln -s '$input' 'input.${input.ext}'` to stage with the upstream-expected name, run the tool exactly as the nf-core `script:` body does, then `mv 'input.${input.ext}'.{bai,csi,crai} '$output_name'`. **Do not** use `<collection>` + `<discover_datasets>` for this shape — there is no list. Direct write to `'$output_name'` (instead of `mv`) is the secondary form, used only when the upstream `script:` body itself passes an output-path arg to the tool. See `galaxy-discover-datasets` §*Convert skill posture* Rule 2 for the full pattern, including the variant and the `from_work_dir` callout.
- **Multi-output, list cardinality** (true glob like `path('*.bam')` where the upstream process emits N files keyed by element identifier) → `<collection type="list" name="..." format="bam">` with `<discover_datasets pattern="__name_and_ext__" visible="true"/>`.
- **Multi-output, paired cardinality** (`tuple val(meta), path("*_R{1,2}.fastp.fastq.gz")`) → `<collection type="paired" ...>` with a custom `(?P<name>...)_R(?P<identifier_1>[12])...` regex.
- **`versions` channel** → drop; the `<version_command>` carries that load (per `nfcore-versions-emit-to-galaxy-version-command`).

**Cardinality heuristic**: if the upstream `input:` channel is `tuple(meta, path)` (one item per process invocation) and `output:` emits one path per concept, the output is single — even when the path is glob-shaped. Process cardinality = output cardinality unless the script explicitly fans out.

#### 5. Translate `script:` to `<command>`

LLM step. Pass:

- The verbatim `script:` body.
- The Galaxy `<inputs>` and `<outputs>` already chosen.
- The `task.ext.args` mapping (text param → `$extra_args`).

Ask only for the Cheetah-flavored Galaxy command. Wrap in `<![CDATA[...]]>`. Set `detect_errors="exit_code"` unless a comment in the original `script:` argues otherwise.

#### 6. Emit `<version_command>`

Per `nfcore-versions-emit-to-galaxy-version-command`: extract the primary tool's version-emit line from the heredoc or `topic: versions` annotation, strip Nextflow escaping (`\$( → $(` etc.), and wrap in `<![CDATA[...]]>`.

#### 7. Emit `<citations>` and `<help>`

`<citations>` are DOIs from `meta.yml.tools[].doi` (one `<citation type="doi">…</citation>` per tool). `<help>` is the `meta.yml.description` (humanized one-liner; expanded into a paragraph if `meta.yml` has a longer prose block).

#### 8. Emit `<test>` blocks (remote URLs)

Read `tests/main.nf.test`. For each test that asserts a successful run with a non-trivial fixture:

- Resolve every input fixture path to a `raw.githubusercontent.com/nf-core/test-datasets/<test_datasets_sha>/...` URL. Pin `<test_datasets_sha>` upfront — never use a branch ref.
- Emit Galaxy `<param ... location="https://..."/>` for inputs.
- For outputs, prefer `<output name="..." location="https://..." checksum="sha256$..."/>` (compute checksum from the upstream snapshot file when one exists; omit if not).

When `tests/main.nf.test` has no usable fixture (stub-only coverage, missing test file), the convert skill **does not ship a placeholder `<test>`**. It surfaces the gap in `_provenance.yml.overrides` and exits with a non-zero status; the harness escalates to human review. Every shipped wrapper carries at least one `<test>` block backed by a real fixture (per `nfcore-stub-block-to-galaxy-noop-test` and the reviewer skill's dimension #6).

#### 9. Emit `_provenance.yml`

Collect: nf-core module source (repo, path, branch, git_sha), file hashes, test-datasets pin, mold metadata, any overrides (forced divergence from upstream container, dropped stub block, hand-edits the skill chose to apply).

#### 10. Convergence loop: lint, test, fix

Iterate until clean. Both gates exit on structured signals — never free-text grep.

##### 10.1 Lint

`planemo lint <output_dir>` (see planemo-lint). Treat by exit code:

- Exit 0 — proceed to 10.2.
- Non-zero — read the diagnostic block. XSD failures are hard: fix the XML and re-emit. Soft findings (missing `<help>`, missing `<citations>`) are fixed in place by the skill, then loop.

##### 10.2 Test

`planemo test <output_dir> --test_output_json <output_dir>/_planemo_test_report.json` (see planemo-test). Always pass `--test_output_json`; planemo's stdout is for humans and intentionally not part of the skill's parsing surface.

After the run:

1. **Validate.** AJV-check the JSON against planemo-test-report (`validate-planemo-test-report` CLI from `@galaxy-foundry/planemo-test-report-schema`). A schema-invalid report means the pinned planemo SHA drifted or the run aborted before writing the report — escalate to human triage; do not classify.
2. **Classify** from schema fields, not free-text. `tests[].data.job` is `dict[str, Any]` (extra-allow) — its inner keys come from the Galaxy job state and are not constrained by planemo-test-report, so treat them as best-effort signals:
   - `tests[].data.status == "success"` → pass.
   - `tests[].data.status == "failure"` + `data.problem_log` matches an output-discovery pattern (`<discover_datasets>` mismatch, missing dataset name, format mismatch) → adjust the corresponding `<output>` / `<discover_datasets>` block.
   - `tests[].data.status == "failure"`, and `data.job.stderr` (when present) carries upstream tool stderr → the `<command>` Cheetah translation is wrong; LLM revises.
   - `tests[].data.status == "error"` with HTTP/URL signals → fixture-availability fault; verify the `nf-core/test-datasets` URL resolves and consider a local `test-data/` fallback, recording the divergence in `_provenance.yml.overrides`.
   - Any other failure shape → human triage.
3. **Stop** when lint and test both clear.

The convergence loop is bounded (default 3 attempts). On exhaustion, the skill writes whatever it has and surfaces the final `_planemo_test_report.json` (plus the lint diagnostics) for human triage.

### Non-goals

- **Subworkflow conversion.** `meta.yml.components:` populated → out of scope. Routed to a separate skill (not in this plan).
- **Pipeline conversion.** Whole nf-core pipelines stay with `nextflow-to-galaxy`; this skill runs at the module tier.
- **Discovery / dedup against IUC.** The new repo coexists with IUC by design (different interface contract for the same upstream tool).
- **Cross-module refactoring.** Per-module unit; harness owns batches.
- **Tool Shed publication.** The output is a tool dir on disk; `.shed.yml` and shed publication live in the new repo's CI, not in this skill.

### Caveats

- **`meta.yml` may lie.** Hand-authored, can drift from `script:` IO. When the LLM-inferred IO disagrees with `meta.yml`, prefer `meta.yml` and surface the disagreement in `_provenance.yml.overrides`.
- **Container directive ternaries** require pulling **both** branches; the bioconda pin from `environment.yml` is the source of truth for `<requirements>`. Don't substitute a hand-picked container source.
- **`task.ext.args` with embedded Groovy logic** can't be cleanly mapped to a single text param. Surface as a text param **plus** a heavy `<help>` block; document the divergence in `_provenance.yml.overrides`.
- **Stub-only tests.** When `tests/main.nf.test` has only stub-mode coverage (`-stub-run`), the convert skill cannot derive a Galaxy `<test>` from it (per `nfcore-stub-block-to-galaxy-noop-test`). Surface the gap; let the harness decide whether to author a `<test>` by hand.

### Reference dispatch (for casting)

- `research` → the 5 nf-core→Galaxy translation notes (`nfcore-channel-input-to-galaxy-collection`, `nfcore-meta-map-to-galaxy-params`, `nfcore-task-ext-args-to-galaxy-additional-options`, `nfcore-versions-emit-to-galaxy-version-command`, `nfcore-stub-block-to-galaxy-noop-test`) plus `component-nf-core-tools`, `component-nextflow-containers-and-envs`, `galaxy-discover-datasets`. All copied verbatim into the cast bundle under `references/notes/`, loaded per each ref's `used_at`/`load`.
- `cli-tool` → planemo carries the pinned install metadata; flows into the cast bundle's `_required_tools.json` via the PR #235 mechanism.
- `cli-command` → planemo-lint and planemo-test cast to JSON sidecars; consulted on-demand inside the §10 loop.
- `schema` → planemo-test-report copied verbatim into the cast bundle; the convergence loop AJV-validates `--test_output_json` output against it before classifying failures.
- `examples` — pending: 3 hand-picked Wave 1 modules (one trivial, one paired-aware, one with conditional). Used for round-trip smoke testing before this skill ships.

### Revision history

- **rev 1 (2026-05-10)** — initial draft. Procedure sketched against the trimmed plan; no cast runs yet. Pattern + CLI references all `evidence: hypothesis`.
- **rev 2 (2026-05-11)** — convergence loop rewritten against the JSON test-report gate: §10.2 now consumes `planemo test --test_output_json` validated against planemo-test-report; pulled in `cli-tool`/`cli-command`/`schema` references for planemo, planemo-lint, planemo-test, planemo-test-report. Deferred-manpages caveat removed.
- **rev 4 (2026-06-19)** — brought in line with the rest of the inventory: the 7 research refs switched `mode: condense` → `mode: verbatim` (matching every other skill; the prior condense was always a verbatim passthrough), so the cast is fully deterministic and the notes land under `references/notes/`. planemo ref now sources released `0.75.44` (jmchilton fork retired).

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
