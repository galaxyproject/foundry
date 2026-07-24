---
type: research
tags:
  - research/component
component: "Nextflow static-introspection CLI (`inspect`, `config`)"
status: draft
created: 2026-05-01
revised: 2026-05-01
revision: 1
ai_generated: true
summary: "White paper on Nextflow's native introspection subcommands — `nextflow inspect`, `nextflow config`, and adjacent tooling. Survey, not decision."
related_molds:
  - "[[summarize-nextflow]]"
sources:
  - "https://docs.seqera.io/nextflow/reference/cli"
  - "https://docs.seqera.io/nextflow/cli"
  - "https://docs.seqera.io/nextflow/config"
  - "https://github.com/nextflow-io/nextflow/blob/master/modules/nextflow/src/main/groovy/nextflow/cli/CmdInspect.groovy"
  - "https://github.com/nextflow-io/nextflow/blob/master/modules/nextflow/src/main/groovy/nextflow/cli/CmdConfig.groovy"
  - "https://github.com/nextflow-io/nextflow/blob/master/modules/nextflow/src/main/groovy/nextflow/container/inspect/ContainersInspector.groovy"
  - "https://github.com/nextflow-io/nextflow/blob/master/changelog.txt"
  - "https://github.com/nextflow-io/nextflow/discussions/4742"
  - "https://nf-co.re/events/2024/bytesize_pipeline_container_urls"
  - "https://github.com/nextflow-io/language-server"
  - "https://www.nf-test.com/docs/cli/list/"
---

# Nextflow Static-Introspection CLI: `inspect`, `config`, and Companions

## Overview

Nextflow exposes a small set of subcommands designed to answer questions about a pipeline *without* running it end-to-end. The two core commands are `nextflow inspect` and `nextflow config`. Both predate the modern Language Server effort and live inside the main `nextflow` JAR; both are invoked the same way as `nextflow run` (positional pipeline argument, `-profile`, `-params-file`, `-c`, `-r`), but neither produces task work, schedules executors, or stages files.

`nextflow config` is the older of the two; it has existed essentially since profiles were added to Nextflow and is the canonical way to dump the merged configuration tree. `nextflow inspect` is much younger — first shipped in **23.09.0-edge / 23.10.0** (October 2023) — and is narrower in scope: today its only documented job is reporting which container image each process will resolve to. It was motivated by the nf-core/DSL2 reality where a pipeline can carry 50+ per-process containers and ad-hoc regex tooling had grown up to enumerate them.

Both commands remain under active maintenance. Notable recent changes: `-concretize` semantics were fixed in 24.09.0-edge ([discussion #4742](https://github.com/nextflow-io/nextflow/discussions/4742)); inspect was broadened to cover all processes in **24.12.0-edge** ([`#5580`](https://github.com/nextflow-io/nextflow/pull/5580)); and 25.12.0-edge added "Git multiple revisions" support ([`#6620`](https://github.com/nextflow-io/nextflow/pull/6620)) which related `-r/-revision` work flows from. The `-value` flag for `config` landed in 23.10.0.

## How it differs from running the pipeline

"Static-ish" is the right word. Neither command parses `.nf` text in isolation: both spin up a real JVM, compile the workflow with the Groovy compiler, and instantiate the DSL.

`nextflow config` evaluates `nextflow.config` (and every config it transitively `includeConfig`s) as a Groovy DSL. That means closures fire, environment lookups happen, and `params.*` references resolve against whatever values exist after the merge. The workflow `.nf` itself is not executed.

`nextflow inspect` goes further. Internally it reuses `CmdRun` with `preview = true` and an `applyInspect` callback (`modules/nextflow/src/main/groovy/nextflow/cli/CmdInspect.groovy`). The session is constructed, the workflow is compiled and *evaluated up to the point where processes can be enumerated and their container directives can be resolved*, but no tasks are submitted and no inputs are staged. The callback then runs `ContainersInspector` against the live session, asking each `ProcessConfig` what container it would have used. The cost: full JVM cold start + Groovy compilation + DSL instantiation. That is why even a trivial `nextflow inspect` takes a few seconds and is dramatically slower than text-parsing `.nf` files.

A consequence of "preview run" semantics: anything that would crash a real execution at parse / config-resolution time (missing required params, syntax errors, unresolved `include` paths, profile activation that references undefined values) crashes inspect too. `-i / -ignore-errors` lets it limp through some classes of failure but does not bypass compilation errors.

## `nextflow inspect` deep dive

### Flag reference

| Flag | Description | Notes |
|---|---|---|
| `-format <json\|config>` | Output format. Default `json`. | 23.10.0 |
| `-profile <name[,name...]>` | Activate one or more profiles. | 23.10.0 |
| `-r, -revision <ref>` | Git branch, tag, or commit SHA of the pipeline. | 23.10.0 |
| `-params-file <path>` | JSON or YAML param overrides. | 23.10.0 |
| `-c, -config <path>` | Additional config files to layer in. | inherited from `CmdRun` |
| `-concretize` | Build resolved container images. Does **not** pull Singularity/Apptainer images locally — see below. | semantics fixed 24.09.0-edge |
| `-i, -ignore-errors` | Continue past per-process errors. | 23.10.0 |
| `--<paramName> <value>` | Ad-hoc param override (same syntax as `nextflow run`). | inherited |

### JSON output schema

The JSON shape is small and stable. From `ContainersInspectorTest`:

```json
{
  "processes": [
    { "name": "proc1", "container": "container1" },
    { "name": "proc2", "container": "container2" }
  ]
}
```

`processes` is an array; each element has exactly `name` (process identifier as Nextflow sees it after DSL2 namespacing) and `container` (whatever the container directive resolves to — a Docker registry URI, a Singularity image path, a Wave-built reference, etc.). There is no nesting, no input/output description, no module path, no label list, no resource directives. Anything beyond `container` requires reading the script directly or using the Language Server.

### `-format config` mode

The `config` format renders the same data as Nextflow config syntax, suitable for `includeConfig`-ing into another pipeline:

```
process { withName: 'proc1' { container = 'container1' } }
process { withName: 'proc2' { container = 'container2' } }
```

The intended use is to "freeze" container resolution: a downstream invocation of the pipeline that includes this snippet will pin every process to the exact image string that inspect resolved at that moment, defeating tag drift.

### Edge case behavior

- **Pipeline fails to load.** Compile/parse errors propagate. `-i` does not help.
- **`params` referenced before assignment.** Same behavior as `nextflow run` against the same merged config; if the workflow references `params.foo` and nothing supplies it, evaluation typically yields `null` and may surface as an interpolation error inside a container directive. Strict-mode evaluation can make this fatal.
- **Remote URL / `nextflow-io/hello`-style projects.** Inspect performs the same project-pull machinery as `run` — clones into `$NXF_HOME/assets` if absent, checks out `-r` if given.
- **Non-default revision.** `-r` selects the git ref before parsing, so different revisions can produce different inspect output for the same project.
- **Multiple workflows / `entry` workflows.** Until 24.12.0-edge ([`#5580`](https://github.com/nextflow-io/nextflow/pull/5580)), inspect listed only processes reachable from the default entry. After that change, it covers all processes in the project. Earlier versions need an explicit `-entry`-equivalent setup via config.

### `-concretize` semantics

The flag's name is misleading. Per the maintainer in [discussion #4742](https://github.com/nextflow-io/nextflow/discussions/4742): "It says 'Build the container images', this does not mean it pulls them locally." In practice, with Wave enabled, `-concretize` instructs Wave to *build* (i.e. materialize a registry image from a Conda recipe / Dockerfile fragment) for processes that would otherwise produce Wave-resolved references on the fly. It applies a `5/30sec` rate limit on Wave HTTP clients. Without Wave, `-concretize` is largely a no-op. Earlier versions (around 23.10.0.5891) accidentally pulled Singularity images locally; that was an oversight and was removed.

## `nextflow config` deep dive

### Flag reference

| Flag | Description | Notes |
|---|---|---|
| `-profile <name[,name...]>` | Activate one or more profiles before printing. | mutually exclusive with `-show-profiles` |
| `-a, -show-profiles` | List every profile defined, with each profile's resolved settings. | |
| `-flat` | Dot-notation per line. Deprecated in favor of `-output flat`. | |
| `-properties` | Java `.properties` notation. Deprecated in favor of `-output properties`. | |
| `-o, -output <fmt>` | `canonical` (default), `properties`, `flat`, `json`, `yaml`. | JSON/YAML added 25.07.0-edge / 25.09.0-edge (`#5399`) |
| `-sort` | Sort keys alphabetically. | |
| `-value <key>` | Print exactly one config value, exit non-zero if undefined. | 23.10.0 |
| `-r, -revision <ref>` | Git ref of the pipeline to resolve config from. | unverified — likely flows from #6620 in 25.12.0-edge |
| `-c, -config <path>` | Extra config files. | inherited |

`-value` cannot be combined with `-flat`, `-properties`, or `-output`. `-profile` and `-show-profiles` are mutually exclusive.

### Output formats

- **canonical** — nested Groovy-style blocks (`docker { enabled = true }`), the human-readable default.
- **flat** — `docker.enabled = true`; string values single-quoted. Easiest for line-grep.
- **properties** — Java `.properties`; values unquoted; safe to feed to standard `Properties.load`.
- **json** / **yaml** — structured, machine-parseable. These are the right choice for tooling integration.

### "Merged config" — what is layered

Per [docs.seqera.io/nextflow/config](https://docs.seqera.io/nextflow/config), files are loaded in this order, **lowest-to-highest precedence** (later wins):

1. `$NXF_HOME/config` (default `~/.nextflow/config`)
2. `nextflow.config` in the **project** directory (where the pipeline lives)
3. `nextflow.config` in the **launch** directory (cwd at invocation)
4. Any file passed via `-c <path>` (multiple `-c` flags merge in order)

`-C <path>` (uppercase) overrides everything — only the named file is loaded.

`includeConfig 'other.config'` directives are evaluated inline at the point they appear in the file. Crucially, they see *only the params defined above the include statement* — moving a `params { ... }` block below an `includeConfig` silently changes what the included file resolves against.

`-profile a,b` activates profiles in the order they are **declared in the config**, not the order on the command line, except in strict syntax mode. Multi-profile activation is layered: later profiles override earlier ones for any conflicting key.

`-params-file` and CLI `--paramName value` overrides apply *after* config is built, on top of `params { ... }` blocks. Within a single `nextflow run`, CLI `--paramName` wins over `-params-file`, which wins over config-file `params { }`.

### Common gotchas

- **Profiles that interpolate `params.*`.** Because config is evaluated as Groovy, a profile that does `process.container = "registry/${params.tag}"` resolves at config-build time. If `params.tag` isn't yet set (e.g., comes from `-params-file` loaded later), interpolation produces `null`. `nextflow config -profile X` is the cheapest way to see this happen.
- **Environment variable substitution.** Bare `$FOO` inside double-quoted strings interpolates Groovy variables, not shell. Use `System.getenv('FOO')` or, since 25.04.0, `env('FOO')`.
- **Secrets.** A global `secrets` map is exposed in config. `nextflow config` will *not* dump secret values; it shows the references.
- **Profile bleed.** Without `-profile`, `nextflow config` shows the no-profile baseline, which often differs substantially from any real run.

## Internals

`CmdConfig` (`modules/nextflow/src/main/groovy/nextflow/cli/CmdConfig.groovy`) builds a `ConfigBuilder` against the resolved project, runs `ConfigValidator` when the v2 syntax parser is active, and dispatches to one of `printCanonical0`, `printFlatten0`, `printProperties0`, `printJson0`, `printYaml0`. `-value` walks the flattened map and prints exactly one entry.

`CmdInspect` is thinner: it constructs a `CmdRun`, sets `preview = true`, registers `applyInspect` as the post-session-init callback, and delegates. Inside the callback, `ContainersInspector` (`modules/nextflow/src/main/groovy/nextflow/container/inspect/`) iterates the session's process list, builds task previews to coerce each process's container directive into a concrete string, and renders via `renderJson()` (uses `JsonOutput.prettyPrint`) or `renderConfig()`.

The reason inspect is "slow" relative to a regex over `.nf` files: it pays for a JVM start, Groovy compilation of every script and config, DSL2 module resolution including remote `include` URLs, full config merge, profile application, and process-config materialization. Sub-second inspect of a real pipeline is not achievable on the JVM today; expect 5-30s on cold cache.

## Companion CLI surface

- **`nextflow log`** — runtime history, not static. Reads the per-workflow `history` file and the SQLite cache under `.nextflow/`. Useful for auditing past runs; tells you nothing about a pipeline you have not run.
- **`nextflow info`** — prints Nextflow version, runtime, JVM, and (with a project arg) project metadata: revision, scm, default branch.
- **`nextflow plugin`** — `nextflow plugin list`, `install`, `info <id>`. Static-ish: enumerates plugins available to the current install. Does not introspect what the pipeline *will* load.
- **`nf-test list --format json`** — independent of the Nextflow runtime; enumerates declared `*.nf.test` cases. JSON is a flat array of `path@hash` strings ([nf-test docs](https://www.nf-test.com/docs/cli/list/)). Useful for shard-splitting CI; not a source of pipeline structure.
- **Nextflow Language Server** ([nextflow-io/language-server](https://github.com/nextflow-io/language-server)) — JVM LSP server, stdio-based, Java 17+. Exposes outline, go-to-definition, references, diagnostics, hover, rename, semantic highlighting, and DAG preview. It is the only first-party tool with real AST access. There is no plain-text CLI mode; integrators speak LSP.

## Output formats — quick reference

| Tool | Flags | Format | Answers |
|---|---|---|---|
| `nextflow config` | (default) | canonical Groovy | merged config, human |
| `nextflow config` | `-output json` | JSON | merged config, machine |
| `nextflow config` | `-output yaml` | YAML | merged config, machine |
| `nextflow config` | `-flat` / `-output flat` | dot-notation | merged config, line-grep |
| `nextflow config` | `-properties` | Java properties | merged config, java tooling |
| `nextflow config` | `-value <key>` | scalar | one value, with non-zero exit if missing |
| `nextflow config` | `-show-profiles` | canonical | every profile's resolved settings |
| `nextflow inspect` | (default) | JSON | per-process container map |
| `nextflow inspect` | `-format config` | nextflow config | per-process container, importable |
| `nextflow inspect` | `-concretize` | (side effect) | triggers Wave builds |
| `nextflow log` | `-f <fields>` | TSV | past run records |
| `nextflow plugin list` | — | text | installed plugins |
| `nf-test list` | `--format json` | JSON array | declared test cases |

## Practical patterns

**Every container that will run for `-profile test`:**

```
nextflow inspect <project> -profile test -format json
```

Yields `{"processes":[{"name":..., "container":...}, ...]}`.

**Merged value of `params.outdir` after profile X applies:**

```
nextflow config <project> -profile X -value params.outdir
```

Single-line stdout; non-zero exit if `params.outdir` is undefined under that profile.

**Every available profile name:**

```
nextflow config <project> -show-profiles -output json | jq 'keys'
```

On older Nextflow lacking `-output json`, fall back to grepping `profiles {` blocks in canonical output, accepting that nested `{}` make robust parsing painful.

**Freeze a pipeline's containers for offline replay:**

```
nextflow inspect <project> -profile <p> -format config > pinned-containers.config
nextflow run <project> -profile <p> -c pinned-containers.config
```

## Limitations and gaps

`nextflow inspect` reports **only** `name` + `container` per process. It does not surface:

- Process input / output blocks or channel types
- `tag`, `label`, `publishDir`, `cpus`, `memory`, `time`, or any other directive besides `container`
- Subworkflow nesting / module paths / DSL2 `include` graph
- Channel topology / DAG edges (the LSP's DAG preview is the only first-party path)
- Conda / Spack / module-load alternatives to containers

`nextflow config` reports the merged config tree but not:

- Provenance per key (which file or profile contributed a value) — there is no `--explain`
- Lazy `params.*` references that have not yet been forced
- Effective behavior of dynamic closures (e.g., `memory = { task.attempt * 4.GB }`) — only the closure object is dumped

Implementations needing channel-level structure, IO type information, or per-key provenance must either parse Nextflow source via the [Language Server](https://github.com/nextflow-io/language-server) (LSP, AST-aware) or read [`nextflow-io/nextflow`](https://github.com/nextflow-io/nextflow) source directly.

## Open gaps

_Updated when contact with real pipelines reveals an inspect/config behaviour or limitation we hadn't accounted for._
