---
type: research
tags:
  - source/nextflow
component: "Nextflow static-introspection CLI (`inspect`, `config`)"
status: draft
created: 2026-05-01
revised: 2026-09-26
revision: 2
summary: "Nextflow inspect and config command contracts, container-preview limits, and configuration-resolution pitfalls."
related_molds:
  - "[[summarize-nextflow]]"
sources:
  - "https://docs.seqera.io/nextflow/reference/cli"
  - "https://docs.seqera.io/nextflow/config"
  - "https://github.com/nextflow-io/nextflow/blob/232b60569865e9a4577e48c1955409238359d6ca/modules/nextflow/src/main/groovy/nextflow/cli/CmdInspect.groovy"
  - "https://github.com/nextflow-io/nextflow/blob/232b60569865e9a4577e48c1955409238359d6ca/modules/nextflow/src/main/groovy/nextflow/cli/CmdConfig.groovy"
  - "https://github.com/nextflow-io/nextflow/blob/232b60569865e9a4577e48c1955409238359d6ca/modules/nextflow/src/main/groovy/nextflow/cli/CmdRun.groovy"
  - "https://github.com/nextflow-io/nextflow/blob/232b60569865e9a4577e48c1955409238359d6ca/modules/nextflow/src/main/groovy/nextflow/config/ConfigBuilder.groovy"
  - "https://github.com/nextflow-io/nextflow/blob/232b60569865e9a4577e48c1955409238359d6ca/modules/nextflow/src/main/groovy/nextflow/container/inspect/ContainersInspector.groovy"
  - "https://github.com/nextflow-io/nextflow/blob/232b60569865e9a4577e48c1955409238359d6ca/modules/nextflow/src/main/groovy/nextflow/script/ScriptMeta.groovy"
  - "https://github.com/nextflow-io/nextflow/blob/232b60569865e9a4577e48c1955409238359d6ca/modules/nextflow/src/main/groovy/nextflow/script/ScriptRunner.groovy"
  - "https://github.com/nextflow-io/nextflow/blob/232b60569865e9a4577e48c1955409238359d6ca/modules/nextflow/src/main/groovy/nextflow/processor/TaskProcessor.groovy"
  - "https://github.com/nextflow-io/nextflow/blob/232b60569865e9a4577e48c1955409238359d6ca/modules/nextflow/src/test/groovy/nextflow/container/inspect/ContainersInspectorTest.groovy"
  - "https://github.com/nextflow-io/nextflow/blob/232b60569865e9a4577e48c1955409238359d6ca/modules/nextflow/src/test/groovy/nextflow/cli/CmdConfigTest.groovy"
---

# Nextflow `inspect` and `config`

`nextflow inspect` reports container references from process definitions loaded by a pipeline. `nextflow config` reports the merged configuration for a project and selected profiles. They provide different evidence: a container preview does not describe workflow topology, and a configuration dump does not resolve every directive for every task.

The contracts below were checked against **Nextflow 26.04.6**, commit `232b60569865e9a4577e48c1955409238359d6ca`. Older releases can have different flags and process coverage. Source and upstream tests were inspected, without running these commands against a live pipeline.

For [[summarize-nextflow]], these commands can supplement the source tree with evidence about effective configuration and containers. Process IO, channel connections, conditional branches, command usage, and test fixtures still need source inspection. [[component-nextflow-containers-and-envs]] covers how container and package evidence contributes to a software summary.

## Evaluation scope and side effects

| Command | What it evaluates | What its output establishes |
|---|---|---|
| `nextflow config [project]` | Configuration files and included configuration, with profile selection. It does not compile the workflow script. | A merged configuration tree under the current project, launch directory, environment, and options. |
| `nextflow inspect <project>` | The run machinery in preview mode. It loads pipeline scripts and modules, then creates task previews for registered process definitions. | Container references resolvable in those previews. |

Inspect sets scripts to module mode to prevent the entry workflow from running. Top-level script code can still execute during loading. The inspector enumerates `ScriptMeta.allProcesses()`, which gathers definitions from the script registry. This includes loaded definitions that the entry workflow does not call. It does **not** search every `.nf` file in the repository, and its list is not the set of tasks that a particular input will execute.

A task preview leaves process inputs and outputs unresolved. A container expression that depends on a real input value can therefore fail even when it would resolve during an actual task. Parameter, profile, engine, and process-selector settings can still affect the preview.

Neither command submits process tasks. Both load configuration through the Nextflow runtime, and inspect also loads pipeline code. Project resolution can use cached assets or obtain a remote project. Configuration includes and container services can require network access. These commands are not isolated text parsers or guarantees of an offline operation.

## `nextflow inspect` options

The project argument follows the project-resolution machinery of `nextflow run`, including local scripts or projects and remote project names or repository URLs.

| Option | Contract |
|---|---|
| `-format <json\|config>` | Output format. Defaults to `json`. Other values fail. |
| `-profile <name[,name...]>` | Select configuration profiles. |
| `-r`, `-revision <ref>` | Select a remote project's Git branch, tag, or commit. |
| `-params-file <path>` | Load script parameters from JSON or YAML. |
| `--<name> <value>` | Override a script parameter. |
| `-c`, `-config <path>` | Add configuration files. The command declares this option even though it is hidden from its help. |
| `-i`, `-ignore-errors` | Catch errors while inspecting individual process containers, warn, and omit those entries. |
| `-concretize` | Enable container materialization and wait for preview containers to become ready. |

Inspect forwards profile, revision, added config, parameters, and parameter-file settings to `CmdRun`. It does not expose every `run` option. In particular, this command has no `-entry` option.

`-ignore-errors` handles exceptions inside the per-process inspection loop. It does not catch earlier project, configuration, script-loading, or compilation failures. A successful command with warnings can return an incomplete list.

### JSON output

The pinned renderer produces a top-level `processes` array whose entries contain `name` and `container`:

```json
{
  "processes": [
    { "name": "FASTQC", "container": "quay.io/biocontainers/fastqc:0.12.1--hdfd78af_0" },
    { "name": "LOCAL_CHECK", "container": null }
  ]
}
```

`name` is the registered process definition's name. It is not a guaranteed fully qualified workflow call path. `container` is the result of that process's task-preview container resolution and can be `null` when no container is configured. The renderer emits one result per name through a map, so distinct definitions with the same name cannot be represented separately. It does not sort the definitions.

This output contains no process IO, source locations, labels, resource directives, subworkflow hierarchy, or channel edges. It is also not a per-input inventory of dynamic container choices. Keep the raw directive and source location when a preview cannot capture that behavior.

### Configuration output

`-format config` renders each entry as a process selector:

```groovy
process { withName: 'FASTQC' { container = 'quay.io/biocontainers/fastqc:0.12.1--hdfd78af_0' } }
```

This records the resolved **reference string**. A mutable image tag can still point to different image content later. Saving this output does not make tagged images immutable or populate an offline image cache.

The pinned renderer directly interpolates names and container values into single-quoted strings. A missing container becomes the literal string `'null'`, and values are not escaped by a general configuration serializer. These details require review before treating the output as an importable override file. The definition-name scope also matters when selectors must distinguish separate workflow calls.

### Container materialization

Without `-concretize`, inspect activates the container inspection dry-run mode. With `-concretize`, it disables that dry run and waits for each preview with a container until `isContainerReady()` returns true. `CmdInspect` also sets `wave.httpClient.maxRate` to `5/30sec`.

With Wave configuration, this can request builds and wait for image readiness. It does not mean that all images have been pulled into a local Singularity or Apptainer cache. The flag also does not establish that a later workflow run will succeed with its actual inputs and runtime environment.

## `nextflow config` options and outputs

With no project argument, config uses the current directory. A local script argument selects its parent directory. Remote project resolution uses `AssetManager`, including revision selection. A legacy asset cache can ignore `-revision` with a warning, so the requested revision alone is insufficient evidence of the configuration's source.

| Option | Contract |
|---|---|
| `-profile <name[,name...]>` | Select profiles. Cannot be combined with `-show-profiles`. |
| `-a`, `-show-profiles` | Preserve the `profiles` section in the output instead of selecting profiles into the effective configuration. |
| `-o`, `-output <format>` | `canonical` by default, or `flat`, `properties`, `json`, `yaml`. Unknown formats fail. |
| `-flat` | Deprecated alias for `-output flat`. |
| `-properties` | Deprecated alias for `-output properties`. |
| `-sort` | Sort configuration keys for rendering. |
| `-value <key>` | Print one flattened configuration value and a newline. Fail if the key is absent. |
| `-r`, `-revision <ref>` | Select a remote project's revision, subject to the cache qualification above. |

Global `-c` adds configuration files and global `-C` selects an exclusive configuration-file set. Config has no command-level `-params-file` or `--<parameter>` interface. Do not assume it receives the same parameter overrides as an inspect or run invocation.

`-value` conflicts with `-flat`, `-properties`, and `-output`. `-flat` and `-properties` also conflict with each other.

| Output | Representation |
|---|---|
| `canonical` | Nested configuration blocks. |
| `flat` | Dotted keys with configuration-style values, including quoted strings. |
| `properties` | Java properties notation. |
| `json`, `yaml` | Structured configuration data. |
| `-value <key>` | The selected value's string representation. It is not restricted to scalar values. |

`-show-profiles` retains profile definitions alongside the other configuration sections. It is not a list of names or a separate fully merged effective configuration for each profile. In JSON, the profile names are keys under `profiles`, not all top-level keys.

### Configuration layers

The normal file order is lowest to highest precedence:

1. `$NXF_HOME/config`.
2. The project's `nextflow.config`, when the project directory differs from the launch directory.
3. The launch-directory configuration, normally `nextflow.config`. `NXF_CONFIG_FILE` can change this filename.
4. Additional configuration files supplied with `-c`.

`-C` uses only the selected files instead of this normal search. Included files are still evaluated unless configuration includes are separately disabled.

`includeConfig` evaluates an included file at that point in the configuration. Parameters defined later in the including file are unavailable to that include. Moving a parameter assignment across an include can therefore change the result.

Profile ordering depends on the configuration parser. The legacy parser applies selected profiles in configuration declaration order. Strict syntax applies them in the supplied order. When no profile is supplied, `ConfigBuilder` selects `standard`, so the output need not be a configuration with every profile removed.

For inspect and run, parameter overrides are handled by `CmdRun` and supplied to the configuration builder. The builder provides them to the parser as well as merging them into `params`. Do not model a parameter file as a universally late override that must produce `null` inside interpolated configuration. Config's separate option surface is the reason its parameter-dependent output can differ from inspect.

### Configuration pitfalls

- **Dynamic directives remain expressions.** Config enables closure rendering as source text. A dump of `memory = { task.attempt * 4.GB }` does not establish memory for a particular task or retry.
- **Environment affects evaluation.** The builder binds environment variables while parsing configuration. The same project and profile can produce different output in another environment.
- **Secret references are special.** Config requests secret stripping. The upstream test verifies that `secrets.MYSTERY` is rendered as the reference string rather than its value. This does not promise removal of arbitrary literal credentials or values obtained through other expressions.
- **Missing values need context.** Script compilation and container-preview failures differ from an absent `-value` key. An omitted process under `-ignore-errors` is unresolved evidence, not a process without a container.
- **Configuration lacks per-key provenance.** The rendered tree does not say which file or profile supplied each value. Preserve the project revision, Nextflow version, selected profiles, added files, and relevant environment alongside the result.

## Evidence boundaries for a pipeline summary

Container previews and merged configuration can confirm or qualify source-derived environment evidence. They do not supply the full [[summary-nextflow]] contract. Retain source-derived process commands, IO, channel topology, parameters, and test cases, and record unresolved dynamic behavior explicitly.

Runtime history from `nextflow log` describes previous executions, while nf-test inventories describe declared tests. Language-server analysis can supply script diagnostics and navigation. These are separate evidence sources, each with its own scope. None makes the container list a complete workflow summary.
