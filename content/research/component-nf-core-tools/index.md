---
type: research
tags:
  - source/nextflow
component: "nf-core/tools (Python package + ecosystem)"
status: draft
created: 2026-05-01
revised: 2026-09-26
revision: 2
summary: "nf-core/tools conventions, CLI and Python surfaces, schema validation, module provenance, linting, and container-download limits."
related_molds:
  - "[[summarize-nextflow]]"
  - "[[convert-nfcore-module-to-galaxy-tool]]"
related_notes:
  - "[[convert-nfcore-module-to-galaxy-tool]]"
  - "[[component-nextflow-containers-and-envs]]"
sources:
  - "https://github.com/nf-core/tools/tree/eb2f709090f4054f45437c34049ea2068567c339"
  - "https://github.com/nf-core/tools/blob/eb2f709090f4054f45437c34049ea2068567c339/nf_core/__main__.py"
  - "https://github.com/nf-core/tools/blob/eb2f709090f4054f45437c34049ea2068567c339/nf_core/pydantic_models.py"
  - "https://github.com/nf-core/tools/blob/eb2f709090f4054f45437c34049ea2068567c339/nf_core/utils.py"
  - "https://github.com/nf-core/tools/blob/eb2f709090f4054f45437c34049ea2068567c339/nf_core/modules/modules_json.py"
  - "https://github.com/nf-core/tools/blob/eb2f709090f4054f45437c34049ea2068567c339/nf_core/pipelines/schema.py"
  - "https://github.com/nf-core/tools/blob/eb2f709090f4054f45437c34049ea2068567c339/nf_core/pipelines/download/download.py"
  - "https://nf-co.re/docs/nf-core-tools"
  - "https://nf-co.re/pipelines.json"
  - "https://github.com/nf-core/modules"
  - "https://github.com/nf-core/test-datasets"
  - "https://github.com/nf-core/configs"
---

# nf-core/tools

`nf-core/tools` provides the Python package published as `nf-core`, its `nf-core` CLI, and importable modules under `nf_core`. It creates and synchronizes pipeline templates, manages vendored modules and subworkflows, validates schemas, reports convention violations, and downloads pipeline code with selected container images.

These contracts were checked against **nf-core/tools 4.1.0**, commit `eb2f709090f4054f45437c34049ea2068567c339`. Source inspection establishes the behavior described here. No pipeline, module test, remote installation, or container download was run for this review.

For [[convert-nfcore-module-to-galaxy-tool]], the useful evidence is a module's command, documented IO, package environment, tests, and source pin. For [[summarize-nextflow]], the package helps interpret nf-core conventions. It does not produce a workflow graph or determine which processes a particular input will execute.

## Pipeline and component conventions

The template in `nf_core/pipeline-template/` describes a conventional pipeline. Feature selection in `.nf-core.yml` can remove template sections and adjust lint expectations. An existing pipeline can also use an older template. The current template is therefore evidence of expected structure, not a mandatory inventory for every pipeline.

| Path | Meaning and qualifications |
|---|---|
| `main.nf`, `workflows/<name>.nf` | Entrypoint and pipeline workflow definitions. Template utility subworkflows provide initialization, schema handling, and completion behavior. |
| `nextflow.config`, `conf/` | Manifest, parameter defaults, execution profiles, and included configuration. Conventional test configurations are `conf/test.config` and `conf/test_full.config`. Their filenames do not establish the complete profile inventory. |
| `nextflow_schema.json` | Parameter schema. Draft and grouping notation depend on the validation plugin. |
| `modules/nf-core/<tool>[/<subtool>]/` | Vendored module directories. Expected source and metadata include `main.nf`, `meta.yml`, `environment.yml`, and nf-test files under `tests/`. Some tools have no subtool directory. |
| `modules/local/` | Pipeline-owned modules. They are not necessarily represented in `modules.json`. |
| `subworkflows/nf-core/`, `subworkflows/local/` | Reusable and pipeline-owned compositions. Subworkflow `meta.yml` documents component dependencies. |
| `assets/` | Input schemas, reporting configuration, and other pipeline assets, according to enabled features. |
| `bin/` | Pipeline helper scripts available to processes. |
| `docs/`, `README.md`, `CITATIONS.md`, `CHANGELOG.md` | Usage, outputs, citation, and release documentation. |
| `nf-test.config`, `tests/` | Pipeline test configuration and test suites. Test definitions and snapshots are distinct evidence from configuration-only test profiles. |
| `.nf-core.yml`, `modules.json` | Tools configuration and installed-component provenance. |

Pipeline `files_exist` lint distinguishes required, recommended, forbidden, and discouraged files. For example, the pinned default inventory treats `nf-test.config` and `tests/default.nf.test` as required, while `conf/base.config` is recommended. Feature skips and explicit lint exclusions affect the result. `modules_structure` checks directory placement, not the full module file inventory. Module lint supplies separate source, metadata, environment, and test checks.

[[component-nf-core-module-conventions]] gives the detailed module rules. Their enforcement level matters: a warning is weaker evidence than a passing required check, and a skipped check establishes nothing about its subject.

### `.nf-core.yml` configuration

`load_tools_config` loads this file into the Pydantic models in `nf_core/pydantic_models.py`.

| Field | Contract |
|---|---|
| `repository_type` | Optional `pipeline` or `modules`. Component commands use repository type to choose their behavior. |
| `nf_core_version` | Optional string recording the tools version used for template creation or synchronization. |
| `org_path` | Organization path for a modules repository. |
| `lint` | Known check settings. Accepted values vary by check, including booleans and lists of excluded paths or configuration keys. |
| `template` | Recorded creation answers, including name, description, author, version, organization, and `skip_features`. |
| `bump_version` | Per-component boolean settings for modules repositories. |
| `update` | Module/subworkflow update configuration, including exclusions and SHA settings. |
| `container-registry` | Additional container registry prefixes allowed during container linting. The Python attribute is `container_registry`. |

The models validate declared field types but use Pydantic's default handling of extra fields: unknown keys are ignored. This is not a closed schema that rejects misspellings. The `nfcore_yml` pipeline lint check separately checks repository type and recorded tools version. It does not provide a general unknown-key check.

A check set to `false` is disabled. A list has check-specific meaning, illustrated by:

```yaml
lint:
  files_exist:
    - assets/multiqc_config.yml
  files_unchanged:
    - .github/CONTRIBUTING.md
  nextflow_config:
    - manifest.name
```

These settings change lint coverage. They do not change Nextflow execution behavior.

### `modules.json` provenance

The root manifest records installed components by repository URL, component type, installation directory, and component name:

```json
{
  "name": "example",
  "homePage": "https://example.org/example",
  "repos": {
    "https://github.com/nf-core/modules.git": {
      "modules": {
        "nf-core": {
          "samtools/sort": {
            "branch": "master",
            "git_sha": "<upstream commit SHA>",
            "installed_by": ["modules"]
          }
        }
      }
    }
  }
}
```

`git_sha` identifies the upstream component revision copied into the pipeline. `branch` records its source branch. An optional `patch` records a local patch file. Installation, update, removal, and patch operations can rewrite the manifest or component files. `ModulesJson` performs consistency checks and can reconstruct missing provenance through repository comparisons. Reconstruction may require network access or user choices.

`installed_by` is a list of strings. A directly installed module has the marker `modules`, and a directly installed subworkflow has `subworkflows`. Dependencies can instead carry parent subworkflow names. Removal drops the relevant parent entry and removes a dependency when no installation parents remain.

The manifest is an inventory of managed, installed components. It is not a list of every executed process. It can include unused modules and excludes local modules that are not managed there. Includes, aliases, workflow calls, and conditions in `.nf` source establish how installed code participates in a pipeline.

For conversion provenance, preserve repository URL, component path, recorded SHA, and any patch or local changes. The containing pipeline's HEAD is not automatically the source module's upstream SHA. A standalone modules checkout has its own repository revision instead.

## CLI surfaces

The Click application is defined in `nf_core/__main__.py`. The top-level groups are `pipelines`, `modules`, `subworkflows`, and `test-datasets`. `interface` provides a Trogon UI over the same commands.

### Pipeline commands

| Command under `nf-core pipelines` | Scope |
|---|---|
| `create` | Render the Jinja pipeline template. Supports an interactive creation UI and template YAML input. |
| `lint` | Check pipeline conventions. Supports check selection, release checks, fixes, JSON/Markdown reports, and options that make warnings or ignored checks fail. `--fix` can modify files. |
| `download` | Obtain pipeline code at selected revisions and optionally download Singularity, Apptainer, or Docker images. |
| `list` | Combine the nf-core remote pipeline registry with local clone information. Supports JSON output. |
| `launch` | Build launch parameters through schema-driven interaction, including web-based editing. |
| `create-params-file` | Generate a YAML parameter file from schema defaults, with prompting controlled by its options. |
| `sync` | Re-render the pipeline template from recorded answers. Its configured workflow can create template commits and pull requests. |
| `bump-version` | Update version-bearing pipeline metadata. |
| `create-logo`, `rocrate` | Generate logos and Research Object Crate metadata. |
| `schema validate` | Validate a parameter file against the selected pipeline schema. |
| `schema build` | Create or edit a schema, including interaction with the web schema builder. |
| `schema lint` | Validate schema structure and nf-core schema conventions. |
| `schema docs` | Generate Markdown or HTML parameter documentation. |

### Module, subworkflow, and fixture commands

`modules` and `subworkflows` share component-management machinery for `list remote`, `list local`, `info`, `install`, `update`, `remove`, `create`, `patch`, `lint`, and `test`. List commands support JSON output. Component tests invoke nf-test. Installation and updates resolve components from the selected modules repository, and subworkflow installation can resolve dependencies transitively.

`modules bump-versions` updates environment and container versions. `modules containers` includes `create`, `conda-lock`, and `list` for container/environment management. The two component groups are similar but do not have identical command inventories.

`test-datasets search`, `list`, and `list-branches` expose the nf-core fixture repository. Fixture branches organize data for pipelines and shared test cases. A branch name is not an immutable data pin.

Machine-readable output is command-specific. Pipeline listing and linting, and module/subworkflow listing, have JSON options. Human-oriented tables and prompts remain common. A consumer should check the selected command's output contract before parsing its terminal text.

## Python interfaces

The implementation can be imported, but this review establishes contracts for the pinned release only. It does not establish a stable external Python API across releases.

| Import | Relevant behavior |
|---|---|
| `nf_core.pipelines.schema.PipelineSchema` | Load schemas, validate parameters and schema structure, obtain defaults, and generate documentation. Plugin selection affects schema handling. |
| `nf_core.pipelines.lint.PipelineLint` | Run pipeline checks and assemble their results. |
| `nf_core.pipelines.list.Workflows` | Represent remote registry entries and local pipelines. |
| `nf_core.pipelines.download.DownloadWorkflow` | Coordinate code and container downloads. |
| `nf_core.pipelines.create.create.PipelineCreate` | Render pipeline templates. |
| `nf_core.modules.modules_json.ModulesJson` | Load, reconcile, and update managed-component provenance. |
| `nf_core.modules.modules_repo.ModulesRepo` | Resolve refs and component contents in a modules repository. |
| `nf_core.components.components_command.ComponentCommand` | Shared component-command handling for repository layout and component discovery. |
| `nf_core.utils.is_pipeline_directory` | Require `main.nf` and `nextflow.config`. Missing `.nf-core.yml` or `modules.json` does not itself fail this helper. |
| `nf_core.utils.fetch_wf_config` | Retrieve configuration through `nextflow config -o json`, then add statically detected `params.*` assignments from `main.nf`. |

`ModulesJson.get_all_components("modules")` returns a dictionary keyed by repository URL, with lists of `(installation_directory, component_name)` tuples. It does not return one flat list of triples or process calls.

`fetch_wf_config` takes a workflow path and an optional `cache_config` boolean, which defaults to `true`. It has no profile-selection argument and does not retain the full profile definitions. Its scraped `main.nf` parameter entries have `None` values, can overwrite values returned by Nextflow, and do not evaluate assignment expressions. Cache identity uses the root `nextflow.config` and `main.nf` contents. Changes only to included configuration or environment can therefore leave a cached result stale.

Profile discovery and effective profile selection are separate operations. [[component-nextflow-inspect]] describes `nextflow config -show-profiles` and the configuration layers. Conventional test filenames alone are insufficient evidence of profile names or effective settings.

## Schemas and module metadata

| Artifact | Validation and interpretation |
|---|---|
| `nextflow_schema.json` | The pinned `PipelineSchema` selects Draft 2020-12 and `$defs` for `nf-schema`, or Draft-07 and `definitions` for `nf-validation`. If neither plugin is found, it defaults to nf-schema notation. Schema lint checks the expected `$schema` URI. |
| `assets/schema_input.json` | Common sample-sheet schema consumed by nf-schema runtime handling. Its meaning comes from the schema and plugin, not the filename alone. |
| `nf_core/pipelines/create/template_features.yml` | Tools-owned feature metadata controlling generated template sections and lint expectations. It is not a pipeline parameter schema. |
| `.nf-core.yml` | Pydantic tools configuration, with unknown keys ignored as described above. |
| `modules.json` | Typed provenance structure maintained through procedural consistency checks. It is not a parameter schema or runtime process inventory. |
| Module `meta.yml` | Descriptions, keywords, tool records including citation fields, container metadata, channel IO, topic metadata, and authors/maintainers. Module lint uses the metadata schema from the selected modules repository. |
| Subworkflow `meta.yml` | Component dependencies and documented channel interfaces, with its own schema and structure. |
| `nf-test.config`, `*.nf.test`, `*.nf.test.snap` | Test configuration, Groovy test definitions, and snapshots. They establish declared cases and expectations, not results of a new execution. |

Parameter schemas can include UI and plugin extensions such as `fa_icon`, `hidden`, `help_text`, and file-related annotations. A passing JSON Schema check does not type-check all uses of that parameter in workflow code or prove its scientific suitability.

The pinned module template represents `input` as a list of channels, each containing a list of named tuple members. Its `output` is a mapping from emitted channel names to channel/tuple descriptions, and `topics` documents topic emissions. Older module metadata can use different shapes. Subworkflow metadata has a different input/output layout. Read the actual metadata schema and source revision instead of assuming both `input` and `output` are always lists of lists.

`meta.yml` is useful declarative documentation, but it is hand-maintained. Reconcile it with `main.nf` for actual channel declarations, command behavior, output patterns, and cardinality. `environment.yml` provides package/channel specifications. Containers and package environments are separate evidence: a container tag alone does not enumerate every dependency or prove equivalence to a generated Galaxy environment.

## Lint results and their limits

Pipeline checks cover file inventory, template-file changes, Nextflow configuration, parameter/schema agreement, nf-test and CI conventions, managed components, documentation, code hygiene, and container configuration. Release mode adds version consistency and included-configuration checks. Module checks separately cover `main.nf`, metadata, environments, source differences, upstream versions, tests, TODOs, deprecations, and patches.

`schema_params` compares flat configuration parameters with the schema, subject to plugin-specific ignored parameters. Complex parameter objects are outside that comparison. `modules_json` checks managed-component consistency. These checks do not reconstruct data flow or prove that every installed module is called. A clean lint result also does not execute the scientific commands or establish that a snapshot is meaningful.

Pipeline `--json` reports contain:

- `nf_core_tools_version` and `date_run`.
- `tests_pass`, `tests_warned`, `tests_failed`, `tests_ignored`, and `tests_fixed`, each containing `[check_id, message]` entries.
- Corresponding `num_tests_*` counts and `has_tests_*` booleans.
- `markdown_result`, containing the rendered report.

These are pipeline-check result fields. Module/subworkflow reporting has its own component result structure. Preserve the tools version and configured exclusions when using lint output as evidence, and distinguish passed checks from ignored or fixed checks.

## Container discovery and downloads

A conventional module can select an engine-specific container:

```groovy
container "${ workflow.containerEngine == 'singularity' && !task.ext.singularity_pull_docker_container ?
    'https://depot.galaxyproject.org/singularity/fastqc:0.12.1--hdfd78af_0' :
    'biocontainers/fastqc:0.12.1--hdfd78af_0' }"
```

Multi-package modules can use `mulled-v2` images. Wave/Seqera container references are another supported convention. [[component-nextflow-containers-and-envs]] covers these URI forms and the evidence needed to resolve package requirements. Process-selector overrides in pipeline configuration can replace a module's container directive.

The pinned download implementation requires Nextflow 25.04.4 or newer for inspection. It invokes `nextflow inspect -format json` on the selected entrypoint. The profile string starts with the selected container system and, when test-container inspection is enabled, appends `test,test_full` in the same invocation. It does not independently inspect every possible profile combination.

It gathers `container` values from the returned `processes` array and deduplicates them. Those values are task-preview references for loaded process definitions. They are not a complete inventory of runtime images for every input or branch. Dynamic expressions can fail, loaded unused processes can appear, and files that are never loaded are outside inspection's scope. [[component-nextflow-inspect]] gives the precise preview limits.

A failure identifying missing `outdir` triggers one retry with an ephemeral parameter file providing `outdir: "nf-core-tools-inspect"`. Other missing launch parameters can still fail. The implementation also recognizes the strict-syntax “Invalid process directive” error and reports a compatibility problem with older pipeline syntax.

| Download system | Materialization behavior |
|---|---|
| `none` | Download pipeline code without container images. |
| `singularity`, `apptainer` | Fetch images through engine-aware handling of image URLs and Docker references. Cache options `amend`, `copy`, and `remote` affect storage/reuse. Singularity and Apptainer have separate Nextflow cache/library environment variables. |
| `docker` | Require Docker and an accessible daemon, pull images, and save archives under `docker-images`. Only `copy` is accepted when a cache-utilization mode is supplied for Docker. This does not place images in a Singularity cache. |

Container fetching and code resolution can use remote services. Tags and branches remain mutable unless an immutable revision or image digest is recorded. Remote inputs, configuration includes, and other runtime dependencies can still require network access. Download success does not establish a fully offline run, compatibility with actual workflow inputs, or scientific correctness.

## Ecosystem and evidence boundaries

The pipeline registry is published at `https://nf-co.re/pipelines.json`. Module management defaults to `https://github.com/nf-core/modules.git`, organization `nf-core`, and branch `master`, with overrides from `NF_CORE_MODULES_REMOTE`, `NF_CORE_MODULES_NAME`, and `NF_CORE_MODULES_DEFAULT_BRANCH`. GitHub access supports token discovery through `GITHUB_TOKEN` and `GITHUB_AUTH_TOKEN` and cached requests. Reproducible provenance requires the resolved commit, not just these defaults.

`nf-core/test-datasets` supplies shared fixtures. Pipelines commonly include institutional settings from `nf-core/configs` during Nextflow configuration evaluation. Neither repository's branch name makes the referenced content immutable. Network access, credentials, local cache state, environment, and selected revisions can affect tooling results.

Non-nf-core pipelines are not uniformly rejected. The basic pipeline-directory helper only checks two files, and some tools operate on general Nextflow projects. Commands enforcing nf-core conventions need the relevant metadata and structure. A missing nf-core layout is a limitation for those commands, not proof that the workflow is invalid Nextflow.

For a workflow summary, retain source-derived IO, includes and aliases, channel connections, conditional branches, commands, and test cases. For one-module conversion, retain the source pin, local patches, documented and declared IO, every relevant package specification, and fixture provenance. Lint, configuration dumps, metadata, and container previews each contribute evidence within their own scope. None substitutes for a runtime test or supplies the full workflow graph.
