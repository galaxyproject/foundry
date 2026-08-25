---
type: research
title: "Galaxy user-defined tool authoring rules"
tags:
  - target/galaxy
status: draft
created: 2026-08-24
revised: 2026-08-24
revision: 1
component: tool_util_models
related_notes:
  - "[[component-nextflow-containers-and-envs]]"
  - "[[galaxy-user-tool-critique]]"
sources:
  - "https://github.com/galaxyproject/galaxy/blob/4d235b615e60bdb8c7e7d9ada100245068c8e4d9/lib/galaxy/agents/prompts/custom_tool_structured.md"
  - "https://github.com/galaxyproject/galaxy/blob/4d235b615e60bdb8c7e7d9ada100245068c8e4d9/lib/galaxy/agents/prompts/custom_tool_container_critic.md"
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

**Name matching is the highest-frequency failure.** Every `inputs.NAME` in `shell_command` must exactly match a declared input's `name`. Never reference an input that is not declared.

## 4. Input parameter types

Each input needs a `type`: `data`, `text`, `integer`, `float`, `boolean`, `select`.

- **`data`** — `format` is a **list** of allowed types, always, even for one: `[fastq]`, `[fasta, fasta.gz]`.
- **`value`** sets the default for `text`, `integer`, `float`, `boolean` **only**.
- A **`select`** takes no `value` — mark its default with `selected: true` on one of its `options`.
- A **`data`** input takes no `value` either.
- **The field is `value`, never `default`.** `default` is rejected as an unknown field, as is any other unrecognized key.

## 5. Outputs

- **`data`** — a single file, captured with `from_work_dir`.
- **`collection`** — requires `discover_datasets`. A collection with only `from_work_dir` is rejected: nothing would claim its elements from the working directory.
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
```

## 6. Script placement — inline or configfile

*Target-neutral.*

There are exactly two ways to run a script. Pick one and complete it.

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
