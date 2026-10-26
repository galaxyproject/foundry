---
type: research
title: "Galaxy user-defined tool authoring rules"
tags:
  - target/galaxy
status: draft
created: 2026-08-24
revised: 2026-10-26
revision: 3
component: tool_util_models
related_notes:
  - "[[component-nextflow-containers-and-envs]]"
  - "[[galaxy-user-tool-critique]]"
sources:
  - "https://github.com/galaxyproject/galaxy/blob/4d235b615e60bdb8c7e7d9ada100245068c8e4d9/lib/galaxy/agents/prompts/custom_tool_structured.md"
  - "https://github.com/galaxyproject/galaxy/blob/4d235b615e60bdb8c7e7d9ada100245068c8e4d9/lib/galaxy/agents/prompts/custom_tool_container_critic.md"
  - "https://github.com/galaxyproject/galaxy/blob/51e0a80a0db648b9153bf00e793f3e152278fe20/lib/galaxy/tool_util_models/tool_outputs.py"
  - "https://github.com/galaxyproject/galaxy/blob/51e0a80a0db648b9153bf00e793f3e152278fe20/lib/galaxy/tool_util_models/parameters.py"
  - "https://github.com/galaxyproject/galaxy/blob/87d295c92ebbd5aaafac5540b0dc5c21a1d77216/lib/galaxy/tools/runtime.py"
  - "https://github.com/galaxyproject/galaxy/blob/87d295c92ebbd5aaafac5540b0dc5c21a1d77216/lib/galaxy/tool_util_models/yaml_parameters.py"
  - "https://github.com/galaxyproject/galaxy/blob/87d295c92ebbd5aaafac5540b0dc5c21a1d77216/lib/galaxy/workflow/modules.py"
  - "https://github.com/galaxyproject/galaxy/blob/87d295c92ebbd5aaafac5540b0dc5c21a1d77216/test/functional/tools/collection_paired_test_y.yml"
  - "https://github.com/galaxyproject/galaxy/blob/51e0a80a0db648b9153bf00e793f3e152278fe20/test/unit/tool_util/user_tool_source_validation_cases.yml"
summary: "What validates in a GalaxyUserTool definition — fields, expression syntax, script placement, package inference — derived from Galaxy's own generator prompts."
---

The rules a `GalaxyUserTool` YAML document has to satisfy, and the decisions worth making while writing one.

Derived from two vendored Galaxy prompts — [[custom-tool-structured]] and [[custom-tool-container-critic]] — rather than restating them. Those prompts are written for Galaxy's in-process agent, where a grammar constrains generation and a deployment-side step may rewrite the container. Neither holds in a cast, so the harness divergences are named in the last section instead of being inherited silently.

Sections 6 and 7 are target-neutral: they are about running a script and naming its dependencies, not about Galaxy. They are kept self-contained so a CWL-side note can lift them without a rewrite.

## 1. Required fields

- **`class`** — exactly `GalaxyUserTool`.
- **`id`** — must start with a lowercase letter; after that, lowercase letters, digits, `_` and `-`. Min 3 characters, max 255.
- **`version`** — semantic version, e.g. `1.0.0`.
- **`name`** — display name, **at least 5 characters**. Short tool names (`BWA`, `STAR`) are exactly what a model reaches for and exactly what fails.
- **`container`** — see §7.
- **`shell_command`** — see §3.
- **`inputs`** — always present. Declare one for every `$(inputs.NAME …)` the command references. `[]` only when the command truly takes no input.
- **`outputs`** — always present. `[]` only when the command produces no output files.

## 2. Optional fields

- **`description`** — one line for the tool menu.
- **`license`** — SPDX identifier.
- **`help`** — an **object, not a string**. Set both `format` (`markdown`, `restructuredtext`, or `plain_text`) and `content`:

```yaml
help:
    format: markdown
    content: |
        Takes the first N lines of a file.
```

## 3. Expression syntax in `shell_command`

Expressions are JavaScript, spliced into the command verbatim.

- Single file path: `$(inputs.param_name.path)`
- Scalar value (text, integer, float, boolean): `$(inputs.param_name)`
- `multiple: true` data input — the value is a *list of file objects*. Map and join, quoting each path:

  ``$(inputs.param_name.map((input) => `'${input.path}'`).join(" "))``

  A bare `.join(" ")` leaves paths unquoted, and the result is spliced verbatim, so unquoted paths with spaces break the command.
- **`inputs.param_name[].path` is not valid.** The empty `[]` is a JavaScript syntax error that surfaces only when the job is built. Indexing itself is fine — `inputs.some_repeat[0].x` works.
- **`$(outputs.param_name.path)` is not valid at all.** Outputs are captured by `from_work_dir` or `discover_datasets`, never referenced in the command.
- Escape shell variables that are not Galaxy expressions: `\$(date)`.

**What `inputs.x` is for a `data` input.** A CWL-style file object with `class` (`File`, or `Directory` for a directory dataset), `path`, `location`, `basename`, `nameroot`, `nameext`, `format` (the Galaxy datatype extension) and `size`.

- **`element_identifier` is `null` on a mapped-over `data` input.** The field exists, but map-over hands each job a plain dataset, so `$(inputs.x.element_identifier)` renders `null`. On a plain dataset it is `null` too. This was API-tested against Galaxy dev at `51e0a80a`, through both `/api/tools` and `/api/jobs`. Fixes are open, not merged: galaxyproject/galaxy#24434 and galaxyproject/galaxy#24422.
- **`basename` and `nameroot` are not the element identifier either.** They come from the dataset's original upload filename or, failing that, its history name. They happen to match the identifier only when the element was created with the same name.
- **Consequence: a tool mapped over a collection cannot name its own element.** A per-sample label that the tool writes into a file has to come from a `text` parameter. Mapped over a collection, every element gets the same value, so a downstream aggregator such as MultiQC can collapse the rows into one. To get identifiers today, take the whole collection as a `data_collection` input (below). Otherwise say so in `help` rather than guessing an accessor. A wrong one validates clean and fails at runtime.

**What `inputs.x` is for a `data_collection` input.** An object with `class: Collection`, `name` (the collection's name), `collection_type`, `tags` and `elements`. Each leaf is a file object as above, plus a non-null `element_identifier`. The shape of `elements` depends on the collection type:

- **`list`, `sample_sheet`** — `elements` is an **array** of file objects, in collection order. Iterate it: ``$(inputs.x.elements.map((e) => `'${e.path}'`).join(" "))``, or read `e.element_identifier` for the sample name.
- **`paired`, `record`** — `elements` is an **object keyed by identifier**: `$(inputs.x.elements.forward.path)`, `$(inputs.x.elements.reverse.path)`.
- **`paired_or_unpaired`** — keyed like `paired`, plus a boolean `has_single_item`. A single dataset sits under `unpaired`. A pair sits under `forward` and `reverse`:

  ``$(inputs.x.has_single_item ? `'${inputs.x.elements.unpaired.path}'` : `'${inputs.x.elements.forward.path}' '${inputs.x.elements.reverse.path}'`)``
- **Nested types** — `list:*` and `sample_sheet:*` give an array of inner collections, other outer types an object of them. Each inner collection has the shape above, with its identifier in `name`, not `element_identifier`, so `e.path` on one is `undefined`. For `list:paired`: ``$(inputs.x.elements.map((e) => `'${e.elements.forward.path}'`).join(" "))``.
- **Mapped over a nested collection** — a `paired` input mapped over a `list:paired` gets one inner pair per job, and `inputs.x.name` is that pair's outer identifier. This is how a per-sample tool gets its sample name today.

**Write `inputs.x.elements.forward`, not `inputs.x.forward`.** Validation does not catch the difference: it checks that `inputs.x` is declared, not the fields after it. Galaxy's own test tool `collection_paired_test_y.yml` uses the `elements` form. A deprecated builder, used for `/api/tools` submissions and for workflow steps whose request state Galaxy fails to capture, returns a bare array for `list` and a bare identifier-keyed object for every other type, with none of the collection fields. A run that passes there proves nothing about the form above. No Galaxy test yet reads leaf `element_identifier`, `has_single_item` or a mapped pair's `name` from a user-defined tool.

**Name matching is the highest-frequency failure.** Every `inputs.NAME` in `shell_command` must exactly match a declared input's `name`. Never reference an input that is not declared.

## 4. Input parameter types

Each input needs a `type`: `data`, `data_collection`, `text`, `integer`, `float`, `boolean`, `select`, `color`. `conditional`, `repeat` and `section` group nested inputs.

- **`data`** — `format` is a **list** of allowed types, always, even for one: `[fastq]`, `[fasta, fasta.gz]`.
- **`data_collection`** — `collection_type` restricts which collections can be picked (`list`, `paired`, `paired_or_unpaired`, `list:paired`, …). Omit it to accept any. `format` is a list, as for `data`, and applies to every element. §3 gives the runtime shape.
- **`value`** sets the default for `text`, `integer`, `float`, `boolean`, `color` **only**.
- A **`select`** takes no `value` — mark its default with `selected: true` on one of its `options`.
- A **`data`** input takes no `value` either.
- **The field is `value`, never `default`.** `default` is rejected as an unknown field, as is any other unrecognized key.

## 5. Outputs

- **`data`** — a single file, captured with `from_work_dir`.
- **`collection`** — requires `discover_datasets`. A collection with only `from_work_dir` is rejected: nothing would claim its elements from the working directory.
- **Collection fields sit on the output itself.** `collection_type` and `discover_datasets` are siblings of `name` and `type`, as below. Galaxy before 26.1 nested them under `structure:`. 26.1 lifts that legacy form, but don't write it.
- **A `discover_datasets` entry needs only `pattern`.** `directory`, `format`, `visible`, `recurse`, `sort_key` and the rest are optional. A misspelled key is rejected, not ignored.
- **`format` on an output is a single string**, unlike a data input's `format`, which is a list. The asymmetry is real and easy to get backwards.

```yaml
outputs:
    - name: output_file
      type: data
      format: sam
      from_work_dir: aligned.sam
      label: Aligned reads
    - name: split_reads
      type: collection
      collection_type: list
      discover_datasets:
          - discover_via: pattern
            pattern: __name__
            directory: splits
            format: fastqsanger
```

**Validator defect, temporary.** `gxwf validate-tool-source` up to 1.14.0 rejects this collection output. Its bundled schema predates Galaxy's 26.1 change and demands the `structure:` form plus all ten discovery fields. Galaxy accepts the example as written. Until the fixed release is pinned, treat those errors on a collection output as a validator defect: keep the flat form, and don't add `structure:` or a duplicate `discover_datasets` to satisfy it. Remove this warning once the Foundry pins a gxwf release with the resynced schema.

## 6. Script placement — inline or configfile

*Target-neutral.*

There are exactly two ways to run a script. Pick one and complete it. Whether you write the script or vendor one the source ships, the same choice applies. Vendoring adds the obligations below.

**Short script (a few lines): inline it.** `python -c` / `Rscript -e`, referencing inputs directly. Self-contained; nothing else to declare.

**Longer script: put it in a `configfiles` entry and run that file by name.** The file is materialized in the working directory at `filename`, so the command invokes it by that name. Inside `content`, inputs are referenced the same way as in the command.

```yaml
configfiles:
    - filename: script.py
      content: |
          import pandas as pd
          df = pd.read_csv("$(inputs.table.path)", sep="\t")
          df.describe().to_csv("summary.tsv", sep="\t")
shell_command: python script.py
```

**The failure mode to check for:** a command that runs a script by name (`python script.py`) with no `configfiles` entry whose `filename` is exactly that name. The file will not exist at runtime. Either add the configfile or inline the script — a half-completed choice is broken, not partial.

**`configfiles[].content` is evaluated like `shell_command`.** The same `$(…)` / `${…}` expression evaluation runs over it, and the same check rejects an `inputs.NAME` that no input declares. Anything true of the command in §3 is true of a configfile.

### Vendoring a script the source ships

A workflow engine can run a script that is not in the container: the source bundles it and puts it on `PATH` (a Nextflow pipeline's `bin/`, for example). A user-defined tool has no way to stage a file onto `PATH`, so the script has to travel inside the tool, as a `configfiles` entry run by name.

- **Copy it verbatim**, then audit the copy. Every `$(` and `${` in it is evaluated as an expression, not passed to the interpreter. Rewrite each one, or escape it as `\$(` / `\${`. Unbraced `$NAME` passes through untouched. Search for the two delimiters rather than assuming a script has none. R and Python scripts often have neither, and shell scripts often have both.
- **Keep its attribution and license header.** The tool's top-level `license` covers the wrapper, not the embedded code.
- **Name the source and version** in `description` or `help`, so a re-vendor is a diff against a known upstream.

### Rendering a Nextflow template

*Nextflow-specific.*

A Nextflow `template 'x.r'` is not a script: Nextflow interpolates `$name`, `${expr}`, `$a.b` and `$task.*` into it before it runs. Vendoring the shipped file verbatim hands the interpreter literal `$bam` and `$task.cpus`. Validation does not catch this, because the undeclared-input check only reads `inputs.NAME` references, so an unresolved token surfaces as a runtime error or a silently wrong literal.

Vendor the rendered form. Before embedding:

1. List every interpolation site in the template, and count them.
2. Resolve each one, then check the count matches:
   - A staged `path` input becomes a `data` input, written as `$(inputs.x.path)`.
   - `$task.cpus` becomes `$GALAXY_SLOTS` (§8), read from the environment, unbraced. `${GALAXY_SLOTS}` would be evaluated as an expression.
   - A `$meta.*` field becomes a tool parameter. `$meta.id`, the sample name, has no parameter equivalent. §3 says what the input object offers.
   - `$task.ext.args` is resolved against the pipeline's `conf/modules*.config` (and the module's test config). Promote each key it actually sets to a real parameter rather than carrying a free-text args string.
   - Anything else becomes a literal or a documented drop.
3. Record the resolutions in `help`, so the next re-vendor can diff against them.

The vendoring obligations above apply to the rendered file too.

## 7. Container, and inferring packages when no image is evidenced

*Target-neutral apart from the `container` field name.*

Prefer a container the source actually evidences. For a tool derived from another workflow engine, the source's own container or conda directive is stronger evidence than anything inferred from a command string — see [[component-nextflow-containers-and-envs]].

Where nothing is evidenced, infer the dependencies from the command rather than guessing an image tag. The method:

- List the conda packages you would `conda install` to make the command run — the programs it invokes and the libraries any inline script imports. `samtools sort` needs `samtools`; `python -c "import pandas…"` needs `pandas`; an `Rscript` using `ggplot2` needs `r-ggplot2`.
- Use canonical conda package names (`samtools`, `bwa`, `bedtools`, `pandas`, `numpy`, `scipy`, `r-ggplot2`).
- Set a version **only** when the command itself pins one (`samtools=1.17`). Otherwise leave it unset — never guess a version, and never invent an image tag or build suffix.
- Ignore shell builtins and coreutils-level commands (`echo`, `cat`, `cut`, `cd`, `mkdir`, pipes, redirects). If the command is only such builtins, the correct answer is **no packages** — an empty result, not a guess.

Then resolve a `quay.io/biocontainers` image from those packages. Pick an image you are confident exists. **Do not assume anything re-resolves it later:** some Galaxy deployments re-resolve the container against verified biocontainers after generation, but that is off by default, and nothing in a Foundry harness does it at all. Assume the image named is the image that runs. If no suitable image is known, say so rather than guessing.

## 8. Resource requirements

```yaml
requirements:
    - type: resource
      cores_min: 2
      cuda_device_count_min: 1
      ram_min: 1024
```

`GALAXY_SLOTS` is available in the process environment and reports the cores the job runner **actually allocated**. Use it rather than hardcoding a thread count. It reflects `cores_min` only where the deployment maps it — do not assume the two are equal.

## 9. Accuracy floor

- Never fabricate command-line arguments or tool capabilities.
- If the request is unclear, ask rather than inventing.
- A simpler correct tool beats a complex incorrect one.

## 10. Where a Foundry harness diverges from upstream

The source prompts assume Galaxy's own agent runtime. Three assumptions do not carry:

- **No output grammar.** Upstream constrains generation with `output_type=UserToolSourceAuthoringView`, so a malformed draft is impossible by construction and the prose only has to nudge. Here the draft is free text and every rule above has to actually hold, checked by explicit validation rather than assumed.
- **No container re-resolution.** Upstream can hand a draft to a dedicated package-inference step and a deterministic quay.io lookup. Nothing downstream of a cast does that, which is why §7 folds the inference method into authoring instead of deferring it.
- **No `CritiqueReport` apply-loop.** The critique criteria are in [[galaxy-user-tool-critique]]; the structured edit transport they travel on upstream is not reproduced.
