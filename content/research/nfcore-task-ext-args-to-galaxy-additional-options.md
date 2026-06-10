---
type: research
subtype: design-problem
title: "nf-core task.ext.args → Galaxy additional-options bag"
tags:
  - research/design-problem
  - source/nextflow
  - target/galaxy
status: draft
created: 2026-05-10
revised: 2026-06-10
revision: 3
ai_generated: true
summary: "Map nf-core's task.ext.args escape hatch to a single Galaxy text param surfacing extra command-line arguments."
related_molds:
  - "[[convert-nfcore-module-to-galaxy-tool]]"
sources:
  - "https://github.com/nf-core/modules/tree/9b261a459473bc8e2d830bfc626f480c0733f4fe"
  - "https://github.com/galaxyproject/tools-iuc"
---

# nf-core task.ext.args → Galaxy additional-options bag

Cited modules pinned to `nf-core/modules@9b261a459473bc8e2d830bfc626f480c0733f4fe`.

## Why a single bag, not per-flag inputs

nf-core modules expose `task.ext.args` (sometimes `args2`, `args3`) as the configuration escape hatch — pipelines override these per-process via `modules.config`. The bag is intentionally opaque: the module's authors chose **not** to enumerate every flag of the upstream tool, so the wrapper inherits a one-string-of-CLI surface.

Galaxy has no per-step config layer; the natural mirror is one optional text `<param>` appended to the command line. Going further (per-flag inputs) re-enumerates the upstream tool's CLI in Galaxy XML, which:

- Forces the wrapper author to track upstream releases at the flag level — the exact maintenance load nf-core declined.
- Doubles the cognitive surface for users: which flags are first-class, which need the bag.

The **policy** is: surface `task.ext.args` as a single bag. Promote individual flags to first-class `<param>`s only when the module already does (e.g., `discard_trimmed_pass` is a `val` input in fastp; that's a `<param type="boolean">`, not part of the args bag).

## Cited cases

### Single-arg use → one `extra_args` text param

`modules/nf-core/samtools/index/main.nf`:

```nextflow
script:
def args = task.ext.args ?: ''
"""
samtools index -@ ${task.cpus} ${args} ${input}
"""
```

Galaxy:

```xml
<param argument="" name="extra_args" type="text" optional="true"
       label="Additional command-line options"
       help="Pass-through string appended to the upstream tool's CLI. Mirrors nf-core's task.ext.args escape hatch.">
  <sanitizer invalid_char="">
    <valid initial="string.printable">
      <remove value="&apos;"/>
    </valid>
  </sanitizer>
</param>
```

```xml
<command><![CDATA[
samtools index -@ \${GALAXY_SLOTS:-1} $extra_args '$input'
]]></command>
```

### Args used to introspect → still one bag

`modules/nf-core/fastp/main.nf` reads its own `task.ext.args` to switch on `--interleaved_in`:

```nextflow
script:
def args = task.ext.args ?: ''
...
if ( task.ext.args?.contains('--interleaved_in') ) {
    """ ...fastp --stdout --in1 ... """
}
```

The convert Mold should **not** try to translate this introspection into Galaxy XML. Two reasonable options:

1. Surface `extra_args` and document in `<help>`: "Set `--interleaved_in` to enable interleaved-FASTQ mode."
2. Promote the specific flag to a `<param type="boolean">` (`interleaved_in`) and pass-through everything else via `extra_args`.

Option 2 is the IUC pattern (`tools-iuc/tools/fastp/fastp.xml` does exactly this for many flags); option 1 is the fast path the convert Mold defaults to. Record the choice in `_provenance.yml.overrides` so the reviewer can flag aggressive expansions for verification.

### `args2` / `args3` → numbered bags

`modules/nf-core/sratools/fasterqdump/main.nf`:

```nextflow
def args  = task.ext.args  ?: ''
def args2 = task.ext.args2 ?: ''
```

Used to feed two distinct upstream invocations. Galaxy mapping: two text params (`extra_args`, `extra_args2`), each scoped to the relevant invocation in `<command>`. Document the mapping in `<help>`.

## Sanitization

Galaxy's default sanitizer rewrites quotes and backslashes — fine for a value like a sample name, fatal for a CLI fragment. Two options:

1. **Permissive `<sanitizer>` block** as shown above. Lets users include their own quoting; the convert Mold leans on `<![CDATA[ ]]>` in `<command>` for outer quoting.
2. **`sanitize="false"`** on the `<param>`. Simplest; trust that the user knows shell quoting. Acceptable for an opt-in advanced field.

The convert Mold defaults to (1) because it preserves the rest of Galaxy's input safety machinery while opening the specific quote-removal behavior that breaks args bags.

## Pitfalls

- **Don't double-quote the bag in `<command>`.** `'$extra_args'` injects literal quotes around the entire string, breaking the user's quoting.
- **Watch for `${task.cpus}` interpolation.** nf-core scripts use `${task.cpus}` for thread counts; Galaxy's analog is `\${GALAXY_SLOTS:-1}`. Translate this directly; it does **not** belong in the args bag.
- **Don't surface `task.ext.prefix`.** Modules use it for output filenames; Galaxy's `$input.element_identifier` is the right substitute. See `[[nfcore-meta-map-to-galaxy-params]]`.
- **`task.ext.when`** is the conditional gate for whether the process runs. It has no Galaxy analog (Galaxy's tool runs unconditionally when invoked); ignore.

## See also

- `[[nfcore-meta-map-to-galaxy-params]]` — sibling: handling identity vs behavior keys.
- `[[convert-nfcore-module-to-galaxy-tool]]` — Mold that consumes this note.
- `tools-iuc/tools/fastp/fastp.xml` — IUC's per-flag promotion choice (option 2 above).
