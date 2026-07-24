---
type: research
tags:
  - source/nextflow
component: "nf-core/tools (Python package + ecosystem)"
status: draft
created: 2026-05-01
revised: 2026-05-01
revision: 1
ai_generated: true
summary: "White paper on nf-core/tools — conventions, CLI surface, schema universe, container resolution. Survey, not decision."
related_molds:
  - "[[summarize-nextflow]]"
  - "[[convert-nfcore-module-to-galaxy-tool]]"
related_notes:
  - "[[convert-nfcore-module-to-galaxy-tool]]"
  - "[[component-nextflow-containers-and-envs]]"
sources:
  - "https://github.com/nf-core/tools"
  - "https://nf-co.re/docs/nf-core-tools"
  - "https://nf-co.re/pipelines.json"
  - "https://github.com/nf-core/modules"
  - "https://github.com/nf-core/test-datasets"
  - "https://github.com/nf-core/configs"
---

# `nf-core/tools` and the nf-core Pipeline Toolchain: A Technical Survey

**Source clone:** `~/projects/repositories/nf-core-tools` (commit `b6c5737`, version `4.0.2`).

## Overview

`nf-core/tools` is the official Python package that the nf-core community publishes to PyPI as `nf-core` (current release **4.0.2**, May 2026). It is a Click-based CLI plus an importable Python library (`nf_core.*`) that handles essentially every lifecycle task a pipeline author or operator performs against an nf-core Nextflow pipeline: scaffolding new pipelines from a Jinja-rendered cookiecutter template, installing and updating shared modules and subworkflows from `nf-core/modules`, linting, schema management, listing remote pipelines, downloading pipelines together with their container images for offline use, and synchronising pipelines with the upstream template as it evolves.

Conceptually the package solves three problems for the community: **enforcing convention** (every nf-core pipeline shares a directory layout, file inventory, and metadata schema, and `nf-core pipelines lint` is the reference enforcer), **enabling code reuse across pipelines** (the `modules`/`subworkflows` subcommands implement a Git-tracked package manager whose state lives in `modules.json`), and **bridging the pipeline to its surrounding registries** (pipelines.json, nf-core/configs, nf-core/test-datasets).

Historically the package began as a small scaffolding helper around 2018 and has tracked the nf-core pipeline standard ever since. The 2.x line introduced subworkflows; 3.x rewrote the create UI in Textual and added the schema validator plugin model; 4.x consolidates around nf-test as the canonical pipeline test harness, replaces `pytest_workflow` and `pytest_modules` style harnesses, and tightens the `.nf-core.yml` schema with a Pydantic v2 model.

It sits in the centre of an ecosystem of GitHub repositories: `nf-core/pipelines.json` (pipeline registry), `nf-core/modules` (the canonical module + subworkflow registry), `nf-core/configs` (institutional Nextflow configs), `nf-core/test-datasets` (branch-per-pipeline test data), and the website `nf-co.re` which serves the schema-builder web UI and API. The CLI talks to all of them over HTTPS and the GitHub API.

## The nf-core conventions the tools encode

A pipeline that the tools recognise as nf-core compliant follows the layout reproduced verbatim in `nf_core/pipeline-template/`. The canonical structure is:

- `main.nf` — entrypoint; imports `workflows/<name>.nf` and the boilerplate utility subworkflows (`utils_nfcore_pipeline`, `utils_nfschema_plugin`).
- `nextflow.config` — sets `manifest`, `params`, `profiles` (at minimum `test`, `test_full`, `docker`, `singularity`, `conda`, `apptainer`, `arm`), and includes the conf/ files.
- `nextflow_schema.json` — JSON Schema (Draft-07) for `params`, with nf-core extensions (see *Schema universe*).
- `workflows/<name>.nf` — the pipeline DSL2 workflow definition.
- `modules/nf-core/<tool>/<subtool>/` — vendored modules pulled from `nf-core/modules`. Each module has `main.nf`, `meta.yml`, `environment.yml`, and `tests/main.nf.test` plus snapshots.
- `modules/local/` — pipeline-specific modules.
- `subworkflows/nf-core/<name>/` and `subworkflows/local/<name>/` — same split for subworkflows. `meta.yml` for subworkflows declares `components:` (the modules/subworkflows it depends on).
- `conf/base.config`, `conf/modules.config`, `conf/test.config`, `conf/test_full.config` — required by the `included_configs` and `base_config` lint checks.
- `assets/` — schema_input.json (sample sheet schema), MultiQC config, email templates, logos.
- `bin/` — pipeline-shipped helper scripts placed on `PATH` for processes.
- `docs/` — `usage.md`, `output.md`, `images/`.
- `tests/` — top-level nf-test files; the lint check `nf_test_content` enforces presence and naming.
- `.nf-core.yml` — see below.
- `modules.json` — see below.
- `nf-test.config`, `tower.yml`, `CHANGELOG.md`, `CITATIONS.md`, `CODE_OF_CONDUCT.md`, `LICENSE`, `README.md` — all enforced by `files_exist`.

### `.nf-core.yml`

Validated by `NFCoreYamlConfig` (Pydantic v2) in `nf_core/utils.py`. The recognised fields are:

- `repository_type: "pipeline" | "modules"` — discriminates pipeline repos from module repos. `nf_core/components/components_command.py` switches behaviour on this.
- `nf_core_version` — version of the tools used to render or last sync the template.
- `org_path` — used in modules-type repos (e.g. `nf-core` or an institutional fork).
- `lint:` — `NFCoreYamlLintConfig`; per-check disable map. A check listed here is skipped or downgraded; the `files_exist` and `files_unchanged` checks accept lists of paths to ignore.
- `template:` — `NFCoreTemplateConfig`; captures the cookiecutter answers (`name`, `description`, `author`, `version`, skipped features).
- `bump_version:` — modules-repo only; per-component opt-out of `bump-versions`.
- `update:` — pipeline-repo only; per-module pinning that suppresses `nf-core modules update`.

Unknown fields are tolerated only via `.get` because the model is defined with explicit attributes; at lint time mismatches are reported by `nfcore_yml`.

### `modules.json`

Lives at the pipeline root. JSON object of the form:

```
{
  "name": "<pipeline>",
  "homePage": "...",
  "repos": {
    "https://github.com/nf-core/modules.git": {
      "modules":      {"nf-core": {"<tool>/<subtool>": {"branch":"master","git_sha":"...","installed_by":["modules"]}}},
      "subworkflows": {"nf-core": {"<name>": {"branch":"master","git_sha":"...","installed_by":["subworkflows"]}}}
    }
  }
}
```

`nf_core/modules/modules_json.py` reads, validates, and rewrites it. Every `install/update/remove/patch` command mutates this file. The `installed_by` field tracks whether a module was added directly or pulled in transitively as a subworkflow dependency — removing the parent removes the child only if no other parent remains. `git_sha` pins the commit in `nf-core/modules` from which the module's directory was copied; `nf-core modules update` diffs the working tree against that SHA and against the requested SHA.

## `nf-core` CLI surface

The CLI is defined in `nf_core/__main__.py` using `click` + `rich-click`. Top-level groups: `pipelines`, `modules`, `subworkflows`, `test-datasets`, `interface` (TUI via `trogon`).

### `nf-core pipelines`

- `create` — Textual TUI (or `--template-yaml` for headless) that renders `nf_core/pipeline-template/` through Jinja using a `template_features.yml` answer set. Skipped features remove sections of the template.
- `lint` — runs the lint test battery (see *Linting*); supports `--release`, `--fix`, `--key`, `--show-passed`, `--fail-warned`, `--fail-ignored`, `--json <file>`, `--markdown <file>`, `--sort-by`.
- `download` — clones a pipeline at a revision, optionally fetches container images. Shells out to `nextflow inspect -format json` to enumerate processes and containers (see *Container resolution*).
- `list` — fetches `https://nf-co.re/pipelines.json`, joins it with local clone state, prints table or `--json`.
- `launch` — interactive parameter wizard against `nextflow_schema.json`; can post to the nf-co.re web GUI for collaborative editing then poll back.
- `create-params-file` — non-interactive; emits a YAML params file populated with schema defaults.
- `sync` — fetches the current template, re-renders against the recorded answers in `.nf-core.yml`, commits to a `TEMPLATE` branch, opens a PR back to `dev`.
- `bump-version` — rewrites `manifest.version` in `nextflow.config`, `nextflow_schema.json`, `CITATIONS.md`, etc.
- `create-logo` — produces nf-core-styled logos.
- `rocrate` — emits Research Object Crate metadata via `repo2rocrate`.
- `schema validate <pipeline> <params>` — validates a params file against `nextflow_schema.json`.
- `schema build` — interactive; opens the web schema builder, polls for the result, writes back.
- `schema lint` — schema-itself validation (Draft-07 + nf-core conventions).
- `schema docs` — generates Markdown documentation from the schema.

### `nf-core modules`

- `list remote` / `list local` — enumerate modules in a remote modules repo or the current pipeline's vendored set.
- `install <name>`, `update <name>`, `remove <name>` — package-manager operations against `modules.json`.
- `create <tool>/<subtool>` — scaffolds a new module from `nf_core/module-template/`.
- `info <name>` — pretty-prints `meta.yml` for a remote or local module.
- `lint` — runs the module lint suite (see below).
- `patch <name>` — captures local diffs against the upstream module as a `<name>.diff` file that survives `update`.
- `bump-versions` — bumps tool versions in `environment.yml` and the container directive.
- `test <name>` — runs the module's nf-test.

### `nf-core subworkflows`

Same surface as modules (`create`, `install`, `update`, `remove`, `list`, `info`, `lint`, `patch`, `test`) backed by a shared `nf_core/components/` layer. A subworkflow's `meta.yml` declares `components: [<module>, <subworkflow>]` which the install command resolves transitively.

### `nf-core test-datasets`

- `search` — keyword search across branches of `nf-core/test-datasets`.
- `list` — list all data files for the current pipeline branch.
- `list-branches` — list branches (one per pipeline).

### `nf-core interface`

Trogon-rendered TUI wrapping the click app — useful for discovery, not a separate command surface.

A flag worth flagging: **almost no commands offer JSON output by default**. `pipelines list` and `pipelines lint` do (`--json`); the rest are human-oriented Rich tables and prompts. Programmatic consumers usually drop to the Python API.

## Python API

The package exposes modules under `nf_core/` whose `__init__.py` files are deliberately minimal — most public API is reached by importing the leaf modules:

- `nf_core.pipelines.schema.PipelineSchema` — `.load_schema()`, `.validate_params()`, `.validate_schema()`, `.get_schema_defaults()`, `.schema_to_markdown()`. The most stable internal interface; reused by `lint`, `launch`, `create-params-file`.
- `nf_core.pipelines.lint.PipelineLint` — registry of lint tests as instance methods named after the entries in `lint_tests`. The `_get_results_md()`, `_get_lint_results()` outputs include a `"nf_core_tools_version"` field, per-category test arrays (`tests_pass`, `tests_warned`, `tests_failed`, `tests_ignored`, `tests_fixed`), and counts.
- `nf_core.pipelines.list.Workflows` — wraps `https://nf-co.re/pipelines.json`; exposes `.remote_workflows` and `.local_workflows` lists each containing a `Pipeline` model.
- `nf_core.pipelines.download.DownloadWorkflow` — full download orchestrator, including container fetch.
- `nf_core.pipelines.create.create.PipelineCreate` — programmatic scaffolding.
- `nf_core.modules.modules_json.ModulesJson` — read/write the manifest.
- `nf_core.modules.modules_repo.ModulesRepo` — clone and resolve refs in a modules repository (default `https://github.com/nf-core/modules.git`, branch `master`, all overridable via env vars `NF_CORE_MODULES_REMOTE`, `NF_CORE_MODULES_NAME`, `NF_CORE_MODULES_DEFAULT_BRANCH`).
- `nf_core.components.components_command.ComponentCommand` — base class shared by modules and subworkflows operations; `.get_local_components()`, `.has_modules_file()`, `.check_modules_structure()`.
- `nf_core.utils` — `is_pipeline_directory`, `fetch_wf_config` (runs `nextflow config`), `load_tools_config` (returns a Pydantic `NFCoreYamlConfig`), `setup_requests_cachedir` (a 1-day `requests_cache` for GitHub calls), `GitHubAPISession` (rate-limit-aware), `anaconda_package`, `get_biocontainer_tag`, `determine_base_dir`, `is_file_binary`.

There is **no documented stable API contract**. The README and online docs cover the CLI; `nf_core.*` modules are imported by other tools (`nf-core/configs` scripts, nf-validation, internal nf-core webapps) but breaking changes happen across major releases. Type hints are mostly in place since 4.x.

## The schema universe

- `nextflow_schema.json` — JSON Schema Draft-07 for `params`. nf-core layers conventions on top: top-level `definitions` groups parameters into UI panels; per-property keywords `fa_icon` (FontAwesome), `hidden` (boolean, hides from launch UI), `help_text`, `mimetype` (for file params; checked by `check_for_input_mimetype`), and a custom `default` resolution that tolerates nulls and Nextflow-style closures. The schema is consumed by `pipelines launch`, `create-params-file`, the nf-co.re schema builder, the in-pipeline `nf-validation` / `nf-schema` Nextflow plugins, and Seqera Platform.
- `assets/schema_input.json` — JSON Schema for the sample-sheet CSV/TSV; consumed at runtime by the `nf-schema` plugin's `samplesheetToList` operator.
- `pipeline_template.yml` (in tools, `nf_core/pipelines/create/template_features.yml`) — describes the cookiecutter feature flags (`fastqc`, `multiqc`, `nf_schema`, `igenomes`, `email`, `slackreport`, `adaptivecard`, …). Each entry has `skippable_paths`, `forbidden_paths`, `nfcore_yml_skip_value`, etc.
- `.nf-core.yml` — covered above. Pydantic-validated; `additionalProperties` is effectively closed because Pydantic v2 with explicit fields ignores extras by default.
- `modules.json` — covered above. Validated by `nf_core/modules/modules_json.py` against an internal jsonschema.
- `meta.yml` (modules and subworkflows) — YAML; declares `name`, `description`, `keywords`, `tools` (each with version, license, doi, homepage, biocontainer/container hints), `input` and `output` channel specifications including types, patterns, and ontology terms (EDAM where present), and `authors`/`maintainers`. The `meta_yml` lint check validates against a JSON Schema bundled in the tools repo. **For introspection use cases, `meta.yml` is the most valuable single file**: it's the only declarative source of channel IO shapes per module.
- `nf-test.config` and per-module `tests/main.nf.test`, `tests/main.nf.test.snap` — nf-test's own format (Groovy DSL + JSON snapshots). The `nf_test_content` lint check parses these for required tags and the `setup` block that pulls test data from `nf-core/test-datasets`.

## The downstream ecosystem

How resolution works at runtime:

- **Pipeline registry**: `https://nf-co.re/pipelines.json` is fetched by `nf_core.pipelines.list` (cached via `requests_cache`). Anonymous; no auth.
- **GitHub API**: `nf_core.utils.GitHubAPISession` wraps `requests_cache.CachedSession` with token discovery from `GITHUB_TOKEN` / `GITHUB_AUTH_TOKEN` and rate-limit retry. Used for branch/release enumeration (`get_repo_releases_branches`) and SHA resolution (`get_repo_commit`).
- **Modules repo**: `nf_core.modules.modules_repo.ModulesRepo` performs a real `git clone --no-checkout` of `https://github.com/nf-core/modules.git` (override via `NF_CORE_MODULES_REMOTE`) into the user's nf-core cache directory, then `git checkout` of specific component subtrees.
- **Test-datasets**: `nf_core.test_datasets.test_datasets_utils` calls `https://api.github.com/repos/nf-core/test-datasets/branches` for branch listing and `https://raw.githubusercontent.com/nf-core/test-datasets/<branch>/<path>` for content. The website also publishes `https://raw.githubusercontent.com/nf-core/website/refs/heads/main/public/pipeline_names.json` as the canonical list of pipeline-named branches.
- **Configs**: not directly fetched by the tools CLI; pipelines `includeConfig` from `https://raw.githubusercontent.com/nf-core/configs/master/...` at Nextflow runtime, gated by `params.custom_config_base`. The `configs` lint check verifies the include statement is present.

## Linting, in detail

The pipeline lint registry is the list `lint_tests` in `nf_core/pipelines/lint/__init__.py`:

`files_exist`, `nextflow_config`, `nf_test_content`, `files_unchanged`, `actions_nf_test`, `actions_awstest`, `actions_awsfulltest`, `readme`, `pipeline_todos`, `pipeline_if_empty_null`, `plugin_includes`, `pipeline_name_conventions`, `template_strings`, `schema_lint`, `schema_params`, `system_exit`, `schema_description`, `actions_schema_validation`, `merge_markers`, `modules_json`, `multiqc_config`, `modules_structure`, `local_component_structure`, `base_config`, `modules_config`, `nfcore_yml`, `rocrate_readme_sync`, `container_configs`. In `--release` mode `version_consistency` and `included_configs` are added.

Categories:

- **Files exist / files unchanged**: `files_exist` checks the canonical inventory (over 60 paths). `files_unchanged` diffs template-shipped files against what `pipelines create` would render today, flagging local edits.
- **Schema**: `schema_lint` validates the JSON Schema itself; `schema_params` cross-checks every param declared in `nextflow.config` (via `fetch_wf_config`) against the schema, both directions. `schema_description` requires a description on every parameter.
- **Modules**: `modules_json` integrity (every directory under `modules/nf-core/` has an entry, every entry has a directory, SHAs are resolvable). `modules_structure` checks the `<tool>/<subtool>/{main.nf,meta.yml,environment.yml,tests/}` layout. `local_component_structure` does the same for `modules/local/`.
- **CI**: `actions_nf_test`, `actions_awstest`, `actions_awsfulltest`, `actions_schema_validation` parse `.github/workflows/*.yml` and assert presence of expected jobs.
- **Code hygiene**: `merge_markers`, `pipeline_todos` (TODO grep), `template_strings` (no leftover `{{ jinja }}`), `system_exit` (Groovy `System.exit` is forbidden — use `error()`).
- **Container/config**: `nextflow_config` requires a long list of manifest fields and `params.*` defaults; `container_configs` validates containers settings; `base_config`, `modules_config` check `conf/`; `multiqc_config` validates `assets/multiqc_config.yml`.

The module lint suite (`nf_core/modules/lint/`): `main_nf` (process structure, container directive form, output channels), `meta_yml` (schema-validate the meta), `environment_yml` (conda channels, package pinning, name == module name), `module_changes` (working-tree diff against pinned SHA), `module_version` (compare with upstream `master`), `module_tests` (nf-test presence and `tags`), `module_todos`, `module_deprecations`, `module_patch` (patch file integrity).

`--json <path>` writes a structured report keyed by:

```
nf_core_tools_version, date_run,
tests_pass[], tests_warned[], tests_failed[], tests_ignored[], tests_fixed[],
num_tests_pass/warned/failed/ignored/fixed,
has_tests_pass/warned/failed/ignored/fixed (booleans),
markdown_result
```

Every entry is `[check_id, message]`. Disabling a check is done in `.nf-core.yml`:

```yaml
lint:
  files_exist: false                 # disable entirely
  files_unchanged:                   # or pass arguments
    - .github/CONTRIBUTING.md
  nextflow_config:
    - manifest.name
```

## Container resolution

Modules declare containers via the canonical Groovy ternary:

```groovy
container "${ workflow.containerEngine == 'singularity' && !task.ext.singularity_pull_docker_container ?
    'https://depot.galaxyproject.org/singularity/fastqc:0.12.1--hdfd78af_0' :
    'biocontainers/fastqc:0.12.1--hdfd78af_0' }"
```

For tools with multiple dependencies the **mulled-v2** convention is used: `https://depot.galaxyproject.org/singularity/mulled-v2-<hash>:<verhash>-0`, where the hash is reproducible from the sorted package list (`galaxy-tool-util` provides the hash function; `nf-core/tools` accepts both pre-computed hashes and resolves them via Biocontainers/Quay).

`nf-core pipelines download --container-system singularity --container-cache-utilisation amend` materialises images by:

1. Cloning the pipeline at the requested revision.
2. Running `nextflow inspect -format json -profile <profile> <entrypoint>` per requested profile and collecting the `container` field of each process. The download module retries inspect with a synthetic `outdir` params file when the pipeline aborts on missing `outdir` only.
3. For each unique container URI, pulling via `singularity pull` / `apptainer pull` / `docker pull` into the `--singularity-cache-dir` (or NXF_SINGULARITY_CACHEDIR) layout that Nextflow itself expects.

Wave / Seqera Containers fits as an alternative ternary branch and as the alternative registries `community.wave.seqera.io/library/...` (Docker) and `community-cr-prod.seqera.io/docker/registry/v2/...` (Singularity), encoded in `nf_core/pipelines/download/utils.py`. The download flow recognises both and pulls them by URL.

## Practical patterns

### Listing every module a pipeline uses

The authoritative source is `modules.json`. Read `repos["https://github.com/nf-core/modules.git"]["modules"]["nf-core"]` keys and walk `modules/nf-core/<key>/` directories. The Python helper is:

```python
from nf_core.modules.modules_json import ModulesJson
mj = ModulesJson(pipeline_dir)
mj.load()
modules = mj.get_all_components("modules")  # -> list[(repo_url, install_dir, name)]
```

For the upstream version + SHA per module, the same JSON has `git_sha` and `branch` per entry.

### Enumerating test profiles

Profiles live in `nextflow.config` in a `profiles { ... }` block. Static parsing is brittle because Groovy allows arbitrary code; the canonical answer is `nf_core.utils.fetch_wf_config(path)` which shells out to `nextflow config -flat` and returns the resolved keys. Profile names are recoverable from `conf/test.config` and `conf/test_full.config` filenames (the convention enforced by `files_exist`).

### Every container image used by every process

The only sound static answer is also the one `nf-core download` uses: `nextflow inspect -format json -profile <profile> main.nf`. This emits a JSON document with a `processes` array, each with a `container` field already resolved by Nextflow's interpolation, eliminating the ternary. `nf_core/pipelines/download/download.py::run_nextflow_inspect` wraps this. For static-only use, parsing `modules/*/*/main.nf` for `container` directives and then resolving the ternary against an assumed engine yields a reasonable approximation, but module overrides in `conf/modules.config` (`withName: { container = '...' }`) can still bypass it.

### IO shape per module

`modules/nf-core/<tool>/<subtool>/meta.yml`'s `input:` and `output:` sections are the declarative source. They are list-of-list structured, where each top-level entry corresponds to a positional channel and each nested entry is a tuple element with `type:`, `description:`, `pattern:`, and optionally `ontologies:`.

## Limitations and gaps for static introspection

`nf-core/tools` is a **convention enforcer and package manager**, not a workflow analyser. It does not:

- Build a process or channel graph. There is no `nf_core` API that returns a DAG. `nextflow inspect` returns a flat process list, not edges. For graph-level insight the realistic paths are the Nextflow language server (`nextflow-io/language-server`), parsing the DSL2 AST yourself, or running `-with-dag` and parsing the generated DOT/HTML.
- Resolve channel topology between modules. `meta.yml` documents channel shapes per module but says nothing about how `workflows/<name>.nf` wires them.
- Type-check parameters end-to-end (only the `params.*` declared in `nextflow_schema.json` are validated; runtime usage is unchecked).
- Provide a stable Python API contract — re-imports across major versions break.
- Cover non-nf-core pipelines. A pipeline that lacks `.nf-core.yml`, `modules.json`, or the canonical layout is rejected by `is_pipeline_directory` and most subcommands.
- Resolve container images without running Nextflow. The static ternary is engine-conditional and can be overridden in `conf/modules.config`.

For workflow topology, the right tools are `nextflow inspect` (process list + containers + resolved configs), the Nextflow language server (AST), `nf-test` (reified IO at test time), and Seqera Platform / nf-tower (runtime DAG).

## Open gaps

_Updated when contact with real pipelines reveals an nf-core convention or tooling behaviour we hadn't accounted for._
