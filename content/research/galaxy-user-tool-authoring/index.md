---
type: research
title: "Galaxy user-defined tool authoring rules"
tags:
  - target/galaxy
status: draft
created: 2026-08-24
revised: 2026-11-12
revision: 4
component: tool_util_models
related_notes:
  - "[[component-nextflow-containers-and-envs]]"
  - "[[galaxy-user-tool-critique]]"
  - "[[galaxy-user-tool-authoring-help]]"
sources:
  - "https://github.com/galaxyproject/galaxy/blob/09ab857133f28853e5d8ff553aafcbce77aa2eb6/lib/galaxy/agents/prompts/custom_tool_structured.md"
  - "https://github.com/galaxyproject/galaxy/blob/4d235b615e60bdb8c7e7d9ada100245068c8e4d9/lib/galaxy/agents/prompts/custom_tool_container_critic.md"
  - "https://github.com/galaxyproject/galaxy/blob/09ab857133f28853e5d8ff553aafcbce77aa2eb6/client/src/components/Tool/authoringHelp.yml"
  - "https://github.com/galaxyproject/galaxy/blob/09ab857133f28853e5d8ff553aafcbce77aa2eb6/doc/source/admin/user_defined_tools.md"
  - "https://github.com/galaxyproject/galaxy/blob/09ab857133f28853e5d8ff553aafcbce77aa2eb6/lib/galaxy/tool_util/deps/image_references.py"
  - "https://github.com/galaxyproject/galaxy/blob/09ab857133f28853e5d8ff553aafcbce77aa2eb6/lib/galaxy/managers/tools.py"
  - "https://github.com/galaxyproject/galaxy/blob/7c18ab768ac112bddf485cfcb5c074a83165c591/lib/galaxy/jobs/command_factory.py"
  - "https://github.com/galaxyproject/galaxy/blob/7c18ab768ac112bddf485cfcb5c074a83165c591/lib/galaxy/tool_util/deps/requirements.py"
  - "https://github.com/galaxyproject/galaxy-mcp/blob/935381cf674af7bcacb15f05df972b1e209e99ce/python/src/galaxy_mcp/server.py"
  - "https://github.com/common-workflow-language/cwl-utils/blob/v0.41/cwl_utils/expression.py"
summary: "What validates in a GalaxyUserTool definition — fields, expression syntax, script placement, package inference — from Galaxy's prompts, authoring help and code."
---

The rules a `GalaxyUserTool` YAML document has to satisfy, and the decisions worth making while writing one.

Derived from two vendored Galaxy prompts — [[custom-tool-structured]] and [[custom-tool-container-critic]] — rather than restating them. Those prompts are written for Galaxy's in-process agent, where a grammar constrains generation and a deployment-side step may rewrite the container. Neither holds in a cast, so the harness divergences are named in the last section instead of being inherited silently. The escaping and shell rules in §3 come from Galaxy's own authoring help ([[galaxy-user-tool-authoring-help]]), its job script code and the cwl-utils expression evaluator it uses, because the prompts do not cover them.

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

Expressions are JavaScript, and their results are spliced into the command verbatim, without shell quoting.

- Single file path: `$(inputs.param_name.path)`
- Scalar value (text, integer, float, boolean): `$(inputs.param_name)`
- `multiple: true` data input — the value is a *list of file objects*. Map and join, quoting each path:

  ``$(inputs.param_name.map((input) => `'${input.path}'`).join(" "))``

  A bare `.join(" ")` leaves paths unquoted, and the result is spliced verbatim, so unquoted paths with spaces break the command.
- **`inputs.param_name[].path` is not valid.** The empty `[]` is a JavaScript syntax error that surfaces only when the job is built. Indexing itself is fine — `inputs.some_repeat[0].x` works.
- **`$(outputs.param_name.path)` is not valid at all.** Outputs are captured by `from_work_dir` or `discover_datasets`, never referenced in the command.

**Only `$(` and `${` are expression delimiters.** The rules below follow the `expressions-shell` section of [[galaxy-user-tool-authoring-help]] and the `interpolate` function of cwl-utils, which Galaxy uses to evaluate expressions. They apply equally to every `configfiles` entry's `content`.

| Written | Reaches the shell as |
| --- | --- |
| `$(date +%s)`, `${f%.txt}`, `${VAR:-default}` | Nothing. Galaxy evaluates it as JavaScript, and the job fails with an expression error. |
| `$(( 1 + 2 ))` | `3`. Valid JavaScript is substituted without any error, changing the command's meaning. |
| `\$(date +%s)`, `\${f%.txt}` | `$(date +%s)`, `${f%.txt}`. Escape a shell command substitution or braced variable this way. |
| `$GALAXY_SLOTS`, `$name`, `$1` | Unchanged. A `$` not followed by `(` or `{` is not an expression, so it needs no escape. |
| `\$name` | `\$name`, backslash included. The shell does not expand it to the variable's value. |

So escape the dollar only in front of `(` or `{`, and prefer unbraced variables (`"$f"` rather than `"${f}"`) where the shell allows it. Escape processing only runs on a command or file that contains `$(` or `${` somewhere, even an escaped `\$(`. There, `\\` also collapses to a single `\`, so a literal backslash pair is written `\\\\`.

**Expect the command to run under `/bin/sh` with `set -e`.** Galaxy writes the evaluated `shell_command` into a job script with `set -e`, which it enables for every user-defined tool. When Galaxy runs the container itself (Docker or Singularity on a local or cluster runner), the script's interpreter is the container's `/bin/sh`. Runners that launch the container themselves, such as Kubernetes, use the destination's shell instead, `/bin/bash` by default. Write the script for `/bin/sh` unless it calls `bash` explicitly. In many images `/bin/sh` is a minimal shell such as dash, which may lack bash features such as `set -o pipefail`, arrays and `[[ ]]`. Where `set -o pipefail` is rejected, the job fails at once (exit status 2 under dash). When a script needs bash, put it in a `configfiles` entry and run it with `bash script.sh` (§6), after checking that the image provides `bash`.

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

## 7. Container policy and package-based image resolution

Galaxy servers apply `user_defined_tool_allowed_containers` and
`user_defined_tool_denied_containers` when a UDT is created and again before its
job runs. The default allows `quay.io/biocontainers/*` and denies nothing. Unless
the target provides evidence of different lists, an authored UDT must use an
image strictly below that namespace. Docker Hub, Wave and other registry images
from a source workflow remain provenance, not directly usable `container`
values.

Galaxy compares parsed image components, not string prefixes. A namespace entry
ending in `/*` includes repositories at any depth strictly below it. An exact
image without a tag or digest permits all of its versions; a tag entry permits
that tag only when no digest is present; a digest entry permits that digest even
when the reference also carries a tag. Registry hosts are case-insensitive,
Docker Hub short names are canonicalized, and denied entries override allowed
entries. The authoring default is intentionally narrower: emit a fully qualified
reference with no transport scheme and with a tag or digest.

Prefer a pinned `quay.io/biocontainers` image the source already evidences. Confirm
that it contains every program the command invokes. For any other source image,
recover pinned Conda package evidence from the process, its `environment.yml`, or
the commands and imports it uses. See [[component-nextflow-containers-and-envs]].

Where nothing is evidenced, infer the dependencies from the command rather than guessing an image tag. The method:

- List the conda packages you would `conda install` to make the command run — the programs it invokes and the libraries any inline script imports. `samtools sort` needs `samtools`; `python -c "import pandas…"` needs `pandas`; an `Rscript` using `ggplot2` needs `r-ggplot2`.
- Use canonical conda package names (`samtools`, `bwa`, `bedtools`, `pandas`, `numpy`, `scipy`, `r-ggplot2`).
- Set a version **only** when the command itself pins one (`samtools=1.17`). Otherwise leave it unset — never guess a version, and never invent an image tag or build suffix.
- Ignore shell builtins and coreutils-level commands (`echo`, `cat`, `cut`, `cd`, `mkdir`, pipes, redirects). If the command is only such builtins, the correct answer is **no packages** — an empty result, not a guess.

Pass all resulting `name` or `name=version` entries together to
`recommend_biocontainer` when that operation is available. One package resolves
a single-package image and several resolve a mulled-v2 image. Use
`data.image` only when `match_quality` is `exact_version` and `verified` is not
false. A `name_only` result substituted a newer built tag, so show that change
for confirmation before use. If the operation is unavailable, returns no image,
reports `verified: false`, or returns an image outside the target policy, do not
guess a tag. Do not remove a package to force a recommendation.

A command containing only shell builtins or core utilities still needs a
container. Use a known allowed general-purpose image such as
`quay.io/biocontainers/python:3.13`, after confirming it contains the required
commands.

The image written is the image that runs. Before structural validation, parse
the reference and check it against both target lists. Under the default, require
registry `quay.io`, a repository strictly below `biocontainers/`, no
`docker://` or other scheme, and a tag or digest. A target-specific exception
requires positive policy evidence. When no permitted image is established, stop
before emitting the UDT and return an unresolved container requirement. Do not
submit a probe tool or postpone the failure until workflow testing. When
creating the requested tool returns an HTTP 400 that lists allowed images, treat
that response as target policy evidence and revise or stop.

Run `gxwf validate-tool-source galaxy-user-tool.yml --json` without
`--schema-only` after the policy check. This validates Galaxy's schema and
semantic authoring rules but does not evaluate the deployment's container
lists, image existence or command availability; those remain separate gates.

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
- **Container resolution happens during authoring.** Upstream can hand a draft
  to a dedicated package-inference step and deterministic quay.io lookup. A
  Foundry cast must call `recommend_biocontainer` itself when available and
  must not defer resolution to a later phase.
- **No `CritiqueReport` apply-loop.** The critique criteria are in [[galaxy-user-tool-critique]]; the structured edit transport they travel on upstream is not reproduced.
