---
type: research
title: "nf-core versions emit → Galaxy <version_command>"
tags:
  - source/nextflow
  - target/galaxy
status: draft
created: 2026-05-10
revised: 2026-06-10
revision: 3
ai_generated: true
summary: "Translate nf-core's versions emit (heredoc or topic: versions) into Galaxy's <version_command>, dropping the versions output channel."
related_molds:
  - "[[convert-nfcore-module-to-galaxy-tool]]"
sources:
  - "https://github.com/nf-core/modules/tree/9b261a459473bc8e2d830bfc626f480c0733f4fe"
---

# nf-core versions emit → Galaxy `<version_command>`

Cited modules pinned to `nf-core/modules@9b261a459473bc8e2d830bfc626f480c0733f4fe`.

Every nf-core module emits a tool-version string. Galaxy's `<version_command>` is the natural sink. Two emission shapes are both common in current nf-core/modules:

1. **`topic: versions`** (Nextflow 24+) — modern; an output tuple with `eval(...)` capturing the version string.
2. **`cat <<-END_VERSIONS > versions.yml`** heredoc — older; still present in many modules.

The convert Mold's job is the same either way: extract the primary tool's version-line command, strip Nextflow escaping, drop the versions channel from outputs, and emit `<version_command>`.

## Cited cases

### `topic: versions` style → strip `eval('...')`, keep the inner command

`modules/nf-core/fastp/main.nf`:

```nextflow
output:
...
tuple val("${task.process}"), val('fastp'),
      eval('fastp --version 2>&1 | sed -e "s/fastp //g"'),
      emit: versions_fastp, topic: versions
```

Galaxy:

```xml
<version_command><![CDATA[fastp --version 2>&1 | sed -e 's/fastp //g']]></version_command>
```

Mechanical translation: take the `eval(...)` argument verbatim, strip nothing (no escaping needed for `eval(...)` content), wrap in `<![CDATA[ ]]>`. Done.

`modules/nf-core/samtools/sort/main.nf`:

```nextflow
tuple val("${task.process}"), val('samtools'),
      eval("samtools version | sed '1!d;s/.* //'"),
      topic: versions, emit: versions_samtools
```

→

```xml
<version_command><![CDATA[samtools version | sed '1!d;s/.* //']]></version_command>
```

### Heredoc style → strip `\$(...)` escaping

`modules/nf-core/shasta/main.nf`:

```nextflow
cat <<-END_VERSIONS > versions.yml
"${task.process}":
    shasta: \$(shasta --version | head -n 1 | cut -f 3 -d " ")
END_VERSIONS
```

The `\$( ... )` is Nextflow escaping for "let bash run this when the script runs, don't expand at Nextflow parse time." Galaxy's `<version_command>` is invoked directly by Galaxy at tool-introspection time — no Nextflow layer, no escaping needed. Strip the leading backslash:

```xml
<version_command><![CDATA[shasta --version | head -n 1 | cut -f 3 -d " "]]></version_command>
```

## Mapping rules

- **Single-tool module** → one `<version_command>`. Pick the one tool the module wraps (the tool whose name matches `meta.yml.tools[0]` or the module's own slug).
- **Multi-tool module (mulled)** → still one `<version_command>` for the primary tool. Galaxy's `<version_command>` is single-string. Document the other tools' versions in `<help>` text; they're surfaced by BioContainers metadata at runtime, not by the wrapper.
- **Drop the `versions` output channel.** It has no Galaxy analog — Galaxy's `<requirements>` + `<version_command>` carry the same information end-to-end. The convert Mold should never emit a Galaxy `<data>` for the versions channel.

## Multiqc-style edge cases

`modules/nf-core/multiqc/main.nf` deliberately emits its versions outside the `topic: versions` channel:

```nextflow
// MultiQC should not push its versions to the `versions` topic.
// Its input depends on the versions topic to be resolved
// thus outputting to the topic will let the pipeline hang forever
tuple val("${task.process}"), val('multiqc'),
      eval('multiqc --version | sed "s/.* //g"'), emit: versions
```

Translation is identical: extract the `eval(...)` argument; emit one `<version_command>`. The pipeline-level rationale (avoiding a topic-channel deadlock) doesn't carry into Galaxy — there's no topic mechanism here.

## Pitfalls

- **Don't escape backslashes twice.** `\$(...)` in Nextflow becomes `$(...)` in the bash that Nextflow runs. Galaxy runs the `<version_command>` directly via subprocess — `$(...)` works as-is.
- **Sed expressions need single-quoting.** Inside `<![CDATA[ ]]>`, single quotes survive intact; double-quoted seds need careful escaping if they include `$`. Default to `<![CDATA[...]]>` + single-quoted sed.
- **Tools that print version to stdout vs stderr.** Use the same redirection as the upstream module (`2>&1` if the module uses it). Don't optimize away — the inversion can mask the actual version string.
- **Tools without a `--version` flag.** Some modules use `<tool> -h | head -n 1 | awk '...'`. Preserve the exact pipeline; Galaxy's `<version_command>` is bash, not nextflow-eval.

## See also

- `[[convert-nfcore-module-to-galaxy-tool]]` — Mold that consumes this note.
- `tools-iuc/tools/fastp/fastp.xml` — IUC's `<version_command>` posture (often shorter than nf-core's because IUC wraps a single tool).
