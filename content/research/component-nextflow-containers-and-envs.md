---
type: research
tags:
  - source/nextflow
  - target/galaxy
component: "Nextflow Containers and Environments"
status: draft
created: 2026-05-01
revised: 2026-05-05
revision: 3
ai_generated: true
summary: "Container URL grammar (depot, BioContainers, mulled-v2, Wave, ORAS) and conda directive resolution rules backing summarize-nextflow §5."
companions:
  - "component-nextflow-containers-and-envs.yml"
sources:
  - "https://docs.seqera.io/nextflow/process"
  - "https://docs.seqera.io/nextflow/reference/process"
  - "https://github.com/nf-core/modules/blob/master/modules/nf-core/fastqc/main.nf"
  - "https://github.com/nf-core/modules/blob/master/modules/nf-core/multiqc/main.nf"
  - "https://github.com/nf-core/modules/blob/master/modules/nf-core/dragmap/align/main.nf"
  - "https://github.com/nf-core/modules/blob/master/modules/nf-core/seqkit/sample/main.nf"
  - "https://github.com/nf-core/modules/blob/master/modules/meta-schema.json"
  - "https://github.com/nf-core/modules/blob/master/modules/environment-schema.json"
  - "https://github.com/nf-core/tools/blob/master/nf_core/module-template/main.nf"
  - "https://github.com/BioContainers/multi-package-containers"
  - "https://github.com/BioContainers/singularity-build-bot"
  - "https://depot.galaxyproject.org/singularity/"
  - "https://biocontainers.pro/registry"
  - "https://bioconda.github.io/"
  - "https://docs.seqera.io/wave"
  - "https://nf-co.re/events/2024/bytesize_pipeline_container_urls"
related_molds:
  - "[[summarize-nextflow]]"
  - "[[author-galaxy-tool-wrapper]]"
  - "[[summarize-galaxy-tool]]"
related_notes:
  - "[[component-nextflow-pipeline-anatomy]]"
  - "[[component-nf-core-tools]]"
  - "[[component-nextflow-inspect]]"
---

# Nextflow Containers and Environments

Operational grounding for `[[summarize-nextflow]]` §5 ("Build the tool registry"). Resolves the regex-pinned URL grammar a static walker needs to bucket each NF process's `container` and `conda` directives into the right `tools[]` field, and surfaces the cases the cast skill must recognize but cannot resolve without runtime help.

Companion structured form: `component-nextflow-containers-and-envs.yml` (regex + example + derivation rule per form). Agents and resolver code consume the YAML; this prose note explains the *why* and pins the canonical examples.

Cross-link rather than restate: ternary directive mechanics, `nextflow inspect` runtime resolution, and the `nf-core download` flow are documented in `[[component-nextflow-inspect]]` and `[[component-nf-core-tools]]`. This note is grammar + bucketing rules.

## Sources of truth

- `nextflow-io/nextflow` — `container` and `conda` directive semantics: [docs.seqera.io/nextflow/process](https://docs.seqera.io/nextflow/process), source at `modules/nextflow/src/main/groovy/nextflow/processor/TaskConfig.groovy`.
- `nf-core/modules` — module library + the **module template `main.nf`** (the canonical ternary form): [`modules/nf-core/`](https://github.com/nf-core/modules/tree/master/modules/nf-core), [`modules/meta-schema.json`](https://github.com/nf-core/modules/blob/master/modules/meta-schema.json), [`modules/environment-schema.json`](https://github.com/nf-core/modules/blob/master/modules/environment-schema.json).
- `nf-core/tools` — module scaffolding template at [`nf_core/module-template/main.nf`](https://github.com/nf-core/tools/blob/master/nf_core/module-template/main.nf).
- `BioContainers/multi-package-containers` — mulled-v2 README + `mulled-hash` CLI documentation: [README.md](https://github.com/BioContainers/multi-package-containers/blob/master/README.md).
- `BioContainers/singularity-build-bot` — quay.io → depot.galaxyproject.org Singularity mirroring service.
- `depot.galaxyproject.org/singularity/` — public BioContainers Singularity mirror; CVMFS-distributed.
- Seqera Wave — [docs.seqera.io/wave](https://docs.seqera.io/wave). Live URL-pattern docs were sparse at the time of this note; Wave URL grammar below is grounded in real nf-core modules (multiqc, seqkit/sample) plus the meta-schema's `^oras://.*$` constraint.

## The canonical ternary directive

The current nf-core module template shipped by `nf-core/tools` produces a `container` directive of the form:

```groovy
conda "${moduleDir}/environment.yml"
container "${ workflow.containerEngine in ['singularity', 'apptainer'] && !task.ext.singularity_pull_docker_container ?
    '<singularity-branch-url>':
    '<docker-branch-url>' }"
```

— from [`nf_core/module-template/main.nf`](https://github.com/nf-core/tools/blob/master/nf_core/module-template/main.nf) lines 27-30.

The Mold body §5 currently encodes the **older** form `workflow.containerEngine == 'singularity'`. Both forms appear in the field today because modules have been generated across multiple template eras. **The cast skill's tokenizer must accept both.** Concretely, a reasonable predicate-detection pattern is:

```
workflow\.containerEngine\s*(?:==\s*'singularity'|in\s*\[\s*'singularity'(?:\s*,\s*'apptainer')?\s*\])
```

Beyond the predicate, every nf-core module the validator has seen in 2025+ shares the `&& !task.ext.singularity_pull_docker_container` clause. The semantics of that clause are documented inline with the resolution rules below.

### What `task.ext.singularity_pull_docker_container` does

It is a per-process escape hatch. When `true`, the ternary collapses to the docker-branch URL even under a Singularity engine, forcing Singularity/Apptainer to pull and convert the Docker BioContainer in place of the Galaxy depot Singularity image. The toggle exists for processes whose Singularity image is missing or broken on `depot.galaxyproject.org`.

A GitHub code search across the `nf-core` org for `singularity_pull_docker_container = true` in committed configs returns zero hits. The flag is reserved for ad-hoc per-task overrides, not normal configuration. **Operational consequence for the resolver:** the singularity branch is the URL that actually runs under a Singularity engine; the docker branch is what runs under Docker/Podman. Bucket both, but treat the singularity branch as authoritative for its host registry.

## Container URL forms

Five forms account for essentially every container URL in current nf-core modules. Each form's regex, example (verbatim), bucket field (matches `summary-nextflow.schema.json`'s `tools[]`), and derivation rule for `(name, version)`:

### 1. Galaxy depot Singularity (BioContainers mirror)

- **Regex:** `^https://depot\.galaxyproject\.org/singularity/(?P<name>[^:/]+):(?P<version>[^-][^-]*)--(?P<build>[^/]+)$`
- **Verbatim example:** `https://depot.galaxyproject.org/singularity/fastqc:0.12.1--hdfd78af_0` — [`modules/nf-core/fastqc/main.nf`](https://github.com/nf-core/modules/blob/master/modules/nf-core/fastqc/main.nf) line 7.
- **Bucket:** `tools[].singularity`.
- **Derivation:** path basename's `<name>:<version>--<build>` triple. `name` and `version` extracted directly. `--<build>` is the Bioconda build string.
- **Provenance:** every Bioconda recipe that builds successfully produces a corresponding BioContainer Docker image on `quay.io/biocontainers`; [`BioContainers/singularity-build-bot`](https://github.com/BioContainers/singularity-build-bot) monitors quay.io and uploads each image's Singularity conversion to `depot.galaxyproject.org/singularity`. The depot is further CVMFS-mirrored. **The depot URL is dual to the quay biocontainer URL — same image, different registry/format.** This is the fact that makes round-trip to Galaxy `<requirement type="package">` clean for these forms.

### 2. Quay BioContainers Docker

- **Regex:** `^quay\.io/biocontainers/(?P<name>[^:/]+):(?P<version>[^-][^-]*)--(?P<build>[^/]+)$`
- **Verbatim example:** `quay.io/biocontainers/fastqc:0.12.1--hdfd78af_0` — fastqc module, line 8.
- **Bucket:** `tools[].biocontainer`.
- **Derivation:** identical triple to the depot URL; the `<name>:<version>--<build>` for any given (name,version,build) is identical between depot Singularity and quay Docker. The cast skill can populate `tools[].biocontainer` and `tools[].singularity` together when both URLs share the suffix.

### 3. Mulled-v2 multi-package containers

- **Regex (depot Singularity):** `^https://depot\.galaxyproject\.org/singularity/mulled-v2-(?P<hash>[0-9a-f]+):(?P<verhash>[0-9a-f]+)-\d+$`
- **Regex (quay Docker):** `^quay\.io/biocontainers/mulled-v2-(?P<hash>[0-9a-f]+):(?P<verhash>[0-9a-f]+)-\d+$`
- **Verbatim example:** `https://depot.galaxyproject.org/singularity/mulled-v2-580d344d9d4a496cd403932da8765f9e0187774d:df80ed8d23d0a2c43181a2b3dd1b39f2d00fab5c-0` paired with `quay.io/biocontainers/mulled-v2-580d344d9d4a496cd403932da8765f9e0187774d:df80ed8d23d0a2c43181a2b3dd1b39f2d00fab5c-0` — [`modules/nf-core/dragmap/align/main.nf`](https://github.com/nf-core/modules/blob/master/modules/nf-core/dragmap/align/main.nf) lines 7-9. The corresponding `environment.yml` packs three deps: `bioconda::dragmap=1.2.1`, `bioconda::samtools=1.19.2`, `conda-forge::pigz=2.3.4`.
- **Bucket:** same as the underlying registry — depot URL → `tools[].singularity`; quay URL → `tools[].biocontainer`. The cast skill records the `mulled-v2` form by setting `tools[].name` to a synthetic identifier (e.g. `<primary>_mulled` or the hash itself) and surfacing the contributing package list from the sibling `environment.yml`.
- **Hash derivation:** the `<hash>` is a content-addressed digest of the **sorted package name list**; the `<verhash>` is a digest including pinned versions/builds; the `-0` suffix is a build counter. The function is implemented in `galaxy-tool-util` and exposed via the `mulled-hash` CLI:
  ```
  $ mulled-hash r-shiny=1.8.1.1,bioconductor-phyloseq=1.46.0,r-curl=5.1.0,r-biocmanager=1.30.23
  mulled-v2-3f22c1adbbead1a8888120ab6f59758c0a05e86b:e77384d3aca3277e7caf46a60e0eb848aec72912
  ```
  ([BioContainers/multi-package-containers README](https://github.com/BioContainers/multi-package-containers#finding-mulled-hash-names-for-containers)).
- **Reverse lookup (hash → packages):** there is **no first-class registry mapping the hash back to its package list**. The README is explicit: "you usually don't search for containers, you construct the hash and pull them down." The cast skill's path forward is: read the sibling `environment.yml`, treat its `dependencies:` list as the authoritative tool inventory, and record the mulled-v2 URL as the container reference for the combined set. The BioContainers `mulled-search` CLI exists but is for forward (package → existing container) lookup.

### 4. Wave / Seqera community registry

Two URL hosts; both are Wave-built, both encode a content digest in the URL.

- **Wave Docker (Wave-as-Docker-image):**
  - **Regex:** `^community\.wave\.seqera\.io/library/(?P<name>[^:/]+):(?P<version>[^-]+)--(?P<digest>[0-9a-f]+)$`
  - **Verbatim:** `community.wave.seqera.io/library/multiqc:1.34--db7c73dae76bc9e6` — [`modules/nf-core/multiqc/main.nf`](https://github.com/nf-core/modules/blob/master/modules/nf-core/multiqc/main.nf) line 9.
- **Wave Singularity via OCI registry blob:**
  - **Regex:** `^https://community-cr-prod\.seqera\.io/docker/registry/v2/blobs/sha256/[0-9a-f]{2}/(?P<digest>[0-9a-f]{64})/data$`
  - **Verbatim:** `https://community-cr-prod.seqera.io/docker/registry/v2/blobs/sha256/1b/1bef8af6be88c5733461959c46ac8ef73d18f65277f62a1695d0e1633054f9c2/data` — multiqc module, line 8.
- **Wave Singularity via ORAS (newer, preferred):**
  - **Regex:** `^oras://community\.wave\.seqera\.io/library/(?P<name>[^:/]+):(?P<version>[^-]+)--(?P<digest>[0-9a-f]+)$`
  - **Verbatim:** `oras://community.wave.seqera.io/library/seqkit:2.13.0--205358a3675c7775` — [`modules/nf-core/seqkit/sample/main.nf`](https://github.com/nf-core/modules/blob/master/modules/nf-core/seqkit/sample/main.nf) lines 7-8. The ORAS protocol pulls Singularity images directly from an OCI-conformant registry without HTTP-blob intermediation. The nf-core module meta-schema explicitly declares `^oras://.*$` as a legal Singularity-container `name` value.
- **Bucket:** `tools[].wave` for **all three** Wave forms.
- **Derivation:** `name` and `version` are recoverable from the `community.wave.seqera.io/library/<name>:<version>--<digest>` Docker and ORAS forms. The bare `community-cr-prod.seqera.io/...sha256/.../data` Singularity form encodes only a digest; **name + version are not recoverable from this URL alone** — read them from the sibling Docker branch URL or the `environment.yml`. The pattern multiqc uses (Wave Docker on the docker branch + Wave-CR Singularity on the singularity branch) is by design.
- **Provenance differs from BioContainers.** Wave images are Seqera-built on demand from Conda specs (and other recipes); they are **not** the BioContainers ecosystem and they are **not** mirrored to `depot.galaxyproject.org`. For Galaxy translation purposes, a Wave reference cannot be converted to a Galaxy `<requirement type="package">` line by direct mapping — the `environment.yml` is the round-trippable source.

### Bucketing rule (resolver hypothesis)

The Mold's §5 prose buckets by *ternary branch* ("singularity branch → `tools[].singularity`; fallthrough → `tools[].biocontainer | wave | docker`"). Every example in current nf-core modules can also be bucketed by *URL prefix*. **The two rules disagree** on multiqc (singularity branch is `community-cr-prod.seqera.io/...` — under the branch rule, `tools[].singularity`; under the URL-prefix rule, `tools[].wave`) and seqkit/sample (singularity branch is `oras://community.wave.seqera.io/...` — same disagreement).

**Foundry hypothesis to confirm with the Mold author:** bucket by URL prefix.

- `tools[].singularity` reserved for `https://depot.galaxyproject.org/singularity/...` and any non-Wave `oras://` URL.
- `tools[].biocontainer` for `quay.io/biocontainers/...` and `docker.io/biocontainers/...` (rare; see below).
- `tools[].wave` for the three Wave forms above, regardless of which ternary branch produced them.
- `tools[].docker` for any other registry (`docker.io/<org>/<name>`, `<registry>/<org>/<name>`, etc.).

URL-prefix bucketing keeps the `tools[]` fields semantically uniform — `tools[].wave` always means "Seqera-built, no Bioconda dual" — at the cost of `tools[].singularity` no longer being "what runs under Singularity for this process." If the latter framing is preferred, it should be a separate field on `processes[]` (e.g. `process.container_singularity` / `process.container_docker`), not a reuse of `tools[]`.

### 5. Generic Docker (escape hatch)

Anything not matching the four canonical forms — `docker.io/<org>/<name>:<tag>`, `<registry>/<org>/<name>@sha256:<digest>`, no-namespace fallback, etc.

- **Regex (loose):** `^(?:(?P<registry>[^/]+)/)?(?P<path>[^:@]+)(?:[:](?P<tag>[^@]+))?(?:@(?P<digest>sha256:[0-9a-f]+))?$`
- **Bucket:** `tools[].docker`.
- **Derivation:** best-effort; the cast skill records the URL as a string and leaves `(name, version)` to the LLM-driven prose pass when no other signal exists.

### Aside: legacy `biocontainers/<name>...` (docker.io alias)

The Mold body lists `biocontainers/<name>:<version>--<build>` (no registry prefix; resolves to docker.io's `biocontainers` org) as a docker-branch form. In current nf-core, this is rare. A GitHub code search for explicit `docker.io/biocontainers/` across the `nf-core` org returns 22 hits; bare `biocontainers/...` (no `quay.io/`) appears in a handful of legacy modules. The **same image** is published to both registries by the BioContainers production pipeline, so the round-trip semantics are identical to the quay form. Bucket as `tools[].biocontainer` either way.

## Conda directive resolution

Two legal forms today; one dominates.

### Modern: file reference

```groovy
conda "${moduleDir}/environment.yml"
```

— virtually every current nf-core module (fastqc, multiqc, dragmap/align, seqkit/sample, …). The cast skill must:

1. Resolve `${moduleDir}` to the directory holding `main.nf` (not the pipeline root).
2. Read the sibling `environment.yml`.
3. Parse `dependencies:` for the package list.

The file's structure is fixed by [`modules/environment-schema.json`](https://github.com/nf-core/modules/blob/master/modules/environment-schema.json):

```yaml
---
# yaml-language-server: $schema=https://raw.githubusercontent.com/nf-core/modules/master/modules/environment-schema.json
channels:
  - conda-forge
  - bioconda
dependencies:
  - bioconda::fastqc=0.12.1
```

— [`modules/nf-core/fastqc/environment.yml`](https://github.com/nf-core/modules/blob/master/modules/nf-core/fastqc/environment.yml).

The schema enforces:
- `channels` must not include `default`.
- `dependencies` items must match `^.*[^><]=[^><].*$` — **i.e. a `=` (not `>=` or `<=`) version pin is required**, ensuring reproducibility.
- `name:` must be **absent** (`"not": { "required": ["name"] }`).
- `pip:` sub-dependencies must use `==` pinning.

### Channel ordering

The `nf-core/modules` lint check requires `conda-forge` first, then `bioconda`. Conda resolves channels in declaration order and `conda-forge` carries general dependencies that bioconda recipes typically build against, so the order matters at install time. The schema does not enforce ordering; the lint does.

### Single-dep vs multi-dep

| Pattern | Container directive | `tools[].bioconda` |
|---|---|---|
| Single `bioconda::<name>=<version>` | Pairs with simple `<name>:<version>--<build>` (Galaxy depot / quay) | `bioconda::<name>=<version>` (verbatim) |
| Multiple `<channel>::<name>=<version>` deps | Pairs with `mulled-v2-<hash>:<verhash>-0` | List of all dep strings; `tools[].name` becomes a synthetic combined name |
| Mixed bioconda + conda-forge (e.g. dragmap, samtools, pigz) | mulled-v2 (bioconda+conda-forge can be combined) | All deps listed |

Only `bioconda::` deps round-trip cleanly to a Galaxy `<requirement type="package">` line. `conda-forge::` deps are typically system-level (pigz, openjdk) and have to be matched against the Galaxy `requirement` namespace separately — they exist in Bioconda's mulled multi-package output but are not Bioconda recipes themselves.

### Legacy: literal string

```groovy
conda "bioconda::fastqc=0.12.1"
```

— still parses; the cast skill should accept it as identical to a single-dep `environment.yml` and populate `tools[].bioconda` from the literal string.

## Tool name and version derivation

In rough order of reliability:

1. **`environment.yml` `dependencies[]`** — most reliable. `bioconda::<name>=<version>` directly yields `(name, version)`. Pair with `<name>:<version>` grep against the container URL to confirm.
2. **Galaxy depot / quay URL path basename** — `<name>:<version>--<build>`. Reliable for non-mulled forms.
3. **Wave Docker / Wave ORAS URL path basename** — `library/<name>:<version>--<digest>`. Reliable.
4. **Wave-CR Singularity URL** — only a content digest; **name + version not recoverable from this URL**. Resolve from sibling docker branch or `environment.yml`.
5. **Mulled-v2** — hash-only; resolve from sibling `environment.yml`.
6. **Generic Docker** — best-effort path-basename split.

For the `tools[]` deduplication step in the Mold's §5: dedupe by `(name, version)` after the resolution pass. Mulled-v2 entries dedupe under their synthetic name and the underlying Bioconda deps are *not* split into separate `tools[]` entries (they belong to one container). This is the field-name parity gxy-sketches `ToolSpec` was designed for: one `tools[]` entry per container/env, not per binary.

## Edge cases the resolver must recognize

These are not warnings to log; they are forms the bucketing rules above must continue to handle correctly. Listed in order of how often the cast skill is likely to hit them.

- **Modern ternary predicate variant.** `workflow.containerEngine in ['singularity', 'apptainer']` (current nf-core template) and `workflow.containerEngine == 'singularity'` (older form, still in the Mold's prose) must both parse.
- **`task.ext.singularity_pull_docker_container` toggle.** Per-task override that flips the ternary to the docker branch even under Singularity. Effectively unused in committed nf-core configs (0 hits), but the directive expression must still parse cleanly.
- **`conf/modules.config` `withName:` overrides.** Pipeline-level `process { withName: 'PROC' { container = '...' } }` blocks override the module-level directive. The pipeline template ships these by convention — see `nf_core/pipeline-template/conf/modules.config`. The cast skill cannot resolve these statically with regex over `.nf` files; either run `nextflow inspect` (which honors them) or surface the override as an unresolved directive.
- **`params.*` interpolation in directives.** `container = "registry/${params.image_tag}"` resolves at config-build time. Without a `-params-file` or CLI override, interpolation produces `null`. See `[[component-nextflow-inspect]]` for the runtime behavior; the static walker should report the raw string.
- **Closure-form directives.** `container = { task.ext.foo ? 'A' : 'B' }`. Nextflow allows the directive itself to be a closure rather than a GString. Less common than the GString ternary, but legal.
- **Multi-tool processes.** A single process running multiple binaries (e.g. `dragmap | samtools`) backed by a mulled-v2 container. The Mold notes `Process.tool` is nullable for these — populate by linking to the `tools[]` mulled entry, not by splitting one process across multiple `tools[]` entries.
- **Mixed BioContainer + Wave in one pipeline.** Common in 2025 nf-core: fastqc still ships a quay BioContainer, multiqc has migrated to Wave. Both forms appear in the same pipeline's `tools[]`. No special handling required if URL-prefix bucketing is used.

## Galaxy UDT translation (handoff to `[[author-galaxy-tool-wrapper]]`)

The `tools[]` block this Mold produces is the input contract for Galaxy user-defined tool dependency and container selection. The mapping is:

- `tools[].bioconda` (`bioconda::<name>=<version>`) → package evidence for selecting a matching BioContainers image when available.
- `tools[].biocontainer` / `tools[].singularity` → direct container evidence for the UDT `container` field when the registry, image, and tag are stable.
- `tools[].wave` alone → no Galaxy round-trip. The UDT authoring Mold must surface this as an unresolved tool.
- `tools[].docker` alone → direct container evidence only when the image is fully qualified and versioned; otherwise require review.

The `[[author-galaxy-tool-wrapper]]` Mold owns this translation; this note documents the contract on the producer side.

The safest default for newly authored Galaxy UDTs is a stable, fully qualified container image when one is directly evidenced:

```yaml
container: quay.io/biocontainers/fastp:0.12.1--h5e1937b_0
```

If only package evidence exists, the UDT author should record uncertainty rather than inventing an image tag. Galaxy XML package-requirement translation is out of scope for the UDT authoring Mold.

## Evidence Classes

### Directly Emittable

Treat package evidence as directly usable for container search or review when evidence is one of:

- Nextflow `conda` directive with `bioconda::name=version`, `conda-forge::name=version`, or unqualified `name=version` for a known conda package.
- `environment.yml` dependency entries with exact package pins from Bioconda or conda-forge.
- nf-core module `environment.yml` with one primary tool package and exact version.
- Existing Galaxy wrapper requirements from `[[summarize-galaxy-tool]]`; these should be reported as wrapper facts, not remapped.

Emit explicit UDT container values directly when evidence is one of:

- Fully qualified Docker/OCI image with immutable or versioned tag, for example `quay.io/biocontainers/fastqc:0.12.1--hdfd78af_0`.
- `docker://quay.io/biocontainers/...` or `docker://docker.io/...` where the registry, image, and tag are present.
- Singularity/Apptainer `docker://...` URI that points back to a Docker-compatible registry and tag.

Preserve evidence in summaries even when not emitting it into authored UDT YAML. `summarize-nextflow` should keep the raw directive, resolved image, package list, source file, and confidence so `author-galaxy-tool-wrapper` can decide.

### Review Required

Require user or maintainer review when evidence is one of:

- Unversioned package names, including `conda 'samtools'` or `container 'quay.io/biocontainers/samtools:latest'`.
- Docker Hub short names such as `biocontainers/samtools` or `samtools:latest`; these depend on registry defaults and may not match Galaxy resolver expectations.
- Floating tags such as `latest`, `dev`, `master`, date-only tags without package build strings, or branch-like tags.
- `environment.yml` with multiple top-level tools where the process script invokes only one or where transitive libraries dominate the file.
- Pip-only dependencies, CRAN-only packages, custom channels, local package paths, local conda environment directories, or conda lock files where package intent is not obvious.
- Wave-generated images where the URI is stable but the package recipe is not recoverable from local evidence.
- Local Singularity image paths, `file://` URIs, `shub://` URIs, `library://` URIs, or site-specific image caches.
- Containers that bundle private scripts, reference data, license-gated binaries, credentials, or data managers.

Review should answer two questions: whether the package names and versions are the right Galaxy requirements, and whether an explicit container is needed for reproducibility.

## Mapping Rules

### Bioconda Package Pin

Nextflow:

```nextflow
conda 'bioconda::bwa=0.7.17 bioconda::samtools=1.17'
```

Galaxy:

```xml
<requirements>
    <requirement type="package" version="0.7.17">bwa</requirement>
    <requirement type="package" version="1.17">samtools</requirement>
</requirements>
```

Drop the channel prefix in the Galaxy requirement body. Record the channel as evidence or provenance if the output schema has a place for it. Galaxy Conda resolution searches configured channels; the wrapper requirement itself names the abstract package and version.

### Environment File

Nextflow:

```nextflow
conda 'modules/nf-core/fastqc/environment.yml'
```

`environment.yml`:

```yaml
channels:
  - conda-forge
  - bioconda
dependencies:
  - fastqc=0.12.1
```

Galaxy UDT:

Use the package pin as evidence for choosing a stable BioContainers image or for review when no image is directly evidenced. If the file includes interpreter/runtime libraries plus one command-line tool, prioritize the command-line tool and keep supporting libraries as evidence. If the script imports Python/R libraries directly or runs package-provided scripts, preserve those packages in the review notes too.

### BioContainers URI

Nextflow:

```nextflow
container 'quay.io/biocontainers/fastqc:0.12.1--hdfd78af_0'
```

Galaxy UDT:

```yaml
container: quay.io/biocontainers/fastqc:0.12.1--hdfd78af_0
```

For `quay.io/biocontainers/<name>:<version>--<build>`, the package name is normally `<name>` and the package version is the tag prefix before `--`. This is strong evidence, but still verify against command usage when the image name is generic, multi-tool, or not the executable invoked by the process.

### Docker Hub Aliases

Nextflow:

```nextflow
container 'biocontainers/fastqc:v0.11.9_cv8'
```

Do not emit this directly as a UDT container without review. Docker Hub BioContainers tags have historical naming conventions and may not map one-to-one to current Bioconda package pins. Prefer resolving to a current `quay.io/biocontainers/...` image or a Bioconda package pin before authoring UDT YAML.

### Singularity and Apptainer URIs

Nextflow:

```nextflow
container 'docker://quay.io/biocontainers/multiqc:1.21--pyhdfd78af_0'
```

Galaxy UDTs should use the Docker-compatible image reference when the target Galaxy runtime can pull it:

```yaml
container: quay.io/biocontainers/multiqc:1.21--pyhdfd78af_0
```

For authored UDTs, prefer a stable pullable container when directly evidenced. Local `.sif` paths and site cache paths are not portable Galaxy UDT containers.

### Wave Images

Wave can build or resolve images from process dependencies and can emit stable-looking image URIs. Treat a Wave URI as runtime evidence, not package-authoring evidence, unless accompanying metadata exposes the Conda packages or Dockerfile ingredients used to build the image.

Direct use of a Wave image as a UDT `container` is acceptable only when exact runtime preservation matters and the image is externally pullable by the target Galaxy execution environment. Otherwise, ask for review and try to recover package or BioContainers evidence from the process `conda` directive, nf-core module `environment.yml`, or command invocation.

### Existing Galaxy Wrapper Summaries

`[[summarize-galaxy-tool]]` should not infer new Bioconda equivalences from container names. Existing wrappers are summarized as declared:

- Keep `<requirement type="package">` entries as package facts.
- Keep `<container>` entries as container facts.
- Warn if the wrapper has only an explicit container and no package requirements, because downstream tooling may be less portable.

Equivalence inference belongs to `[[author-galaxy-tool-wrapper]]`, where the Foundry is authoring new UDT YAML from source-process evidence.

## Reliability Ladder

Highest confidence:

- Existing Galaxy XML requirements from a selected wrapper, when available only as comparison evidence.
- Pinned Bioconda/conda-forge package requirements in `conda` or `environment.yml`.
- `quay.io/biocontainers/<package>:<version>--<build>` images whose package name matches the invoked command.

Medium confidence:

- Multi-package `environment.yml` where invoked commands identify the primary tools.
- Singularity/Apptainer `docker://quay.io/biocontainers/...` images.
- nf-core module conventions when `main.nf`, `environment.yml`, and `meta.yml` agree.

Low confidence:

- Docker Hub aliases and floating tags.
- Wave images without build metadata.
- Custom registries, private images, local images, custom channels, pip-only environments, and site-specific environment directories.

## Output Guidance

When summarizing Nextflow evidence, preserve:

- Raw directive value and source location.
- Resolved process name and label selectors that contributed the directive.
- Normalized container registry, namespace, image, tag, and protocol if parseable.
- Parsed conda packages with name, version, channel, and source file.
- Confidence and review reason.

When authoring Galaxy UDT YAML, emit:

- Stable container values for exact, pullable, directly evidenced images.
- Package evidence as review context when no stable container is directly evidenced.
- A warning when dependency evidence is absent, floating, local, or inconsistent with command usage.

Do not emit:

- `latest` or unpinned package/container versions as if they were reproducible.
- Local filesystem image paths into portable UDTs.
- Transitive library packages unless the process directly invokes or imports them.
- Package names guessed only from executable names without registry evidence.

## Open Gaps

- Need corpus checks over nf-core modules to measure how often `environment.yml`, container tags, and invoked commands disagree.
- Need a normalized field in `summary-nextflow` for package-confidence and container-confidence evidence.
- Need examples from real cast attempts before promoting this from draft to reviewed.
