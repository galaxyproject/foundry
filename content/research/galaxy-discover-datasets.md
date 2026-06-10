---
type: research
subtype: component
title: "Galaxy <discover_datasets>"
tags:
  - research/component
  - target/galaxy
component: "Galaxy <discover_datasets> XML element"
status: draft
created: 2026-05-10
revised: 2026-06-10
revision: 2
ai_generated: true
summary: "Reference for the <discover_datasets> Galaxy XML element — attributes, named/regex patterns, <data> vs <collection> contexts, test assertions."
related_molds:
  - "[[convert-nfcore-module-to-galaxy-tool]]"
related_notes:
  - "[[convert-nfcore-module-to-galaxy-tool]]"
  - "[[nfcore-channel-input-to-galaxy-collection]]"
  - "[[galaxy-collection-semantics]]"
  - "[[planemo-asserts-idioms]]"
sources:
  - "https://github.com/galaxyproject/galaxy/blob/7765fae934fbfdee77e3be5f5b235e43735273ae/lib/galaxy/tool_util/xsd/galaxy.xsd"
  - "https://github.com/galaxyproject/galaxy/blob/7765fae934fbfdee77e3be5f5b235e43735273ae/lib/galaxy/tool_util/parser/output_collection_def.py"
  - "https://planemo.readthedocs.io/en/latest/writing_advanced.html#multiple-output-files"
  - "https://github.com/galaxyproject/galaxy/tree/dev/test/functional/tools"
---

# Galaxy `<discover_datasets>`

Cited Galaxy source pinned to `galaxyproject/galaxy@7765fae9` (XSD: `lib/galaxy/tool_util/xsd/galaxy.xsd`; parser: `lib/galaxy/tool_util/parser/output_collection_def.py`).

`<discover_datasets>` is Galaxy's mechanism for collecting outputs whose names or counts aren't knowable at tool-wrapper authoring time. A tool that emits "one BAM per chromosome", "every `*.report.tsv` in the working dir", "whatever fell out of split-by-this-column" — uses `<discover_datasets>` to tell Galaxy how to find them after the job completes.

Two parents, slightly different behavior:

| Parent | What discover_datasets populates | Result |
|---|---|---|
| `<data>` | The primary dataset's siblings (and optionally the primary itself with `assign_primary_output="true"`) | Multiple history items derived from one `<data>` declaration |
| `<collection>` | The elements of the collection | A `list`, `paired`, `list:paired`, or arbitrarily-nested collection |

The convert Mold (`[[convert-nfcore-module-to-galaxy-tool]]`) reaches for `<discover_datasets>` inside `<collection>` whenever a Nextflow `output:` channel uses a glob (`path('*.bam')`) or names interpolated from runtime values; the corresponding Galaxy idiom needs to discover the matching files after the script runs.

## Two discovery modes

Set with `from_provided_metadata`. Default is `pattern`.

### `pattern` mode (default)

Galaxy scans the working directory (or a named subdirectory) and matches filenames against a regex.

```xml
<discover_datasets pattern="(?P<designation>.+)\.report\.tsv" ext="tabular" visible="true"/>
```

The regex must match the filename (not the full path, unless `match_relative_path="true"`). Named groups inside the pattern feed Galaxy metadata about each discovered file — see *Named groups* below.

### `tool_provided_metadata` mode

The tool writes a `galaxy.json` (or equivalent) into the working directory listing each output's path, name, datatype, and metadata. Galaxy reads it verbatim.

```xml
<discover_datasets from_provided_metadata="true" visible="true"/>
```

Used when the regex idiom doesn't carry enough information — usually because the tool needs to set datatype per file, attach element identifiers from a non-filename source, or surface metadata Galaxy can't infer. `pattern` and `sort_by` are forbidden in this mode (the parser rejects them at load time per `output_collection_def.py:88-90`).

## Attribute reference

All attributes are optional. Pulled from `OutputDiscoverDatasetsCommon` in `galaxy.xsd:6698-6749`.

| Attribute | Type | Notes |
|---|---|---|
| `pattern` | regex | Filename pattern. May be a named pattern (`__name__`, …) or a literal regex with named groups. Forbidden when `from_provided_metadata="true"`. |
| `directory` | string | Working-dir-relative directory to scan. Default is the working dir itself. |
| `recurse` | bool | Walk `directory` recursively. Default `false`. |
| `match_relative_path` | bool | Match the regex against the path relative to `directory` (lets you embed path components in named groups). Default `false` — match filename only. |
| `format` / `ext` | datatype | Datatype for every discovered file. `format` is an alias for `ext`. Override per-file via a named `ext` regex group. |
| `sort_by` | string | `[reverse_][SORT_COMP_]SORTBY`. `SORTBY` ∈ {`filename`, `name`, `designation`, `dbkey`}; `SORT_COMP` ∈ {`lexical`, `numeric`}. Default `lexical_filename`. |
| `visible` | bool | History visibility of discovered datasets. Defaults to `false` per the XSD, but the XSD doc string explicitly warns "probably shouldn't be" — almost every IUC and Galaxy test tool sets `visible="true"`. |
| `from_provided_metadata` | bool | Switch to `tool_provided_metadata` mode. |

Additional on `<discover_datasets>` inside `<data>` (`OutputDiscoverDatasets` only):

| Attribute | Notes |
|---|---|
| `assign_primary_output` | Replace the parent `<data>`'s primary dataset with the first discovered match. Useful for tools where one of N outputs should be the canonical output. |

## Named patterns

Five string aliases that expand to regexes (`output_collection_def.py:31-37`):

| Alias | Expands to | Effect |
|---|---|---|
| `__default__` | `primary_DATASET_ID_(?P<designation>[^_]+)_(?P<visible>[^_]+)_(?P<ext>[^_]+)(_(?P<dbkey>[^_]+))?` | The historical Galaxy convention. Filename literally begins with `primary_DATASET_ID_…`. Avoid for new tools — too much encoded in the filename. |
| `__name__` | `(?P<name>.*)` | Match anything; the filename becomes the element identifier. Datatype comes from `ext` / `format` on the `<discover_datasets>` element. |
| `__designation__` | `(?P<designation>.*)` | Same as `__name__` semantically, but the matched group is `designation` (the legacy term that still drives the `<discovered_dataset designation="…">` test assertion form). |
| `__name_and_ext__` | `(?P<name>.*)\.(?P<ext>[^\.]+)?` | Match `<basename>.<extension>`; element identifier is the basename, datatype is the extension. The most common new-tool choice. |
| `__designation_and_ext__` | `(?P<designation>.*)\.(?P<ext>[^\._]+)?` | Same shape, but populates `designation` instead of `name`. Use when test fixtures need `<discovered_dataset designation="…">` to match — by convention, anywhere the test side uses `discovered_dataset`. |

Use a named pattern unless you need information from the filename that the aliases can't capture (per-file `dbkey`, multi-level nesting via `identifier_0`/`identifier_1`).

## Named regex groups Galaxy recognizes

Custom regexes feed Galaxy metadata through specific named groups:

| Group | Meaning |
|---|---|
| `name` | Element identifier (history-item name). |
| `designation` | Element identifier under the legacy term; same effect. |
| `ext` | Per-file datatype, overrides the element-level `ext`/`format`. |
| `dbkey` | Per-file dbkey (genome build). Defaults to the input's dbkey (`INPUT_DBKEY_TOKEN = "__input__"`). |
| `visible` | Per-file visibility override (boolean). |
| `identifier_0`, `identifier_1`, …, `identifier_N` | Inside `<collection>`: nested-level identifiers. `list:paired` uses `identifier_0` for the outer list identifier and `identifier_1` for the inner `forward`/`reverse`. The level count must match the collection type's nesting depth. |

Cited example — nested `list:paired` from a single discover sweep (`test/functional/tools/output_filter.xml:75`):

```xml
<collection name="paired_list_output" type="list:paired" label="paired list">
  <discover_datasets pattern="(?P<identifier_0>p[12])\.(?P<identifier_1>.*)" ext="txt" visible="true"/>
</collection>
```

A file `p1.forward` becomes an element under outer identifier `p1`, inner identifier `forward`.

## Inside `<data>` — multiple outputs from one declaration

```xml
<data format="tabular" name="sample">
  <discover_datasets pattern="(?P<designation>.+)\.report\.tsv" ext="tabular" visible="true" assign_primary_output="true"/>
</data>
```

`assign_primary_output="true"` makes the *first* discovered match (under the configured `sort_by`) become the primary dataset that `name="sample"` resolves to in the test block; the rest become additional, sibling history items. Without `assign_primary_output`, Galaxy expects the `<data>` to be produced as normal (e.g. via `from_work_dir` or stdout redirection) and discover_datasets contributes only siblings.

Cited test case: `test/functional/tools/multi_output_assign_primary.xml:15`.

## Inside `<collection>` — discovered collection elements

```xml
<collection name="list_output" type="list" label="List">
  <discover_datasets pattern="(?P<identifier_0>[45])" ext="txt" visible="true"/>
</collection>
```

The collection type determines how many `identifier_N` groups are required:

- `list` → `identifier_0`.
- `paired` → not usable directly; the two element identifiers are fixed (`forward`, `reverse`). Use the `__name__` form and rely on filenames matching `forward` and `reverse`, or split with a `<discover_datasets>` per arm (rare).
- `list:paired` → `identifier_0` (outer list) + `identifier_1` (inner `forward`/`reverse`).
- Deeper nesting → add `identifier_2`, ….

Optional / variable-cardinality collections: combine `<discover_datasets>` with `<filter>` on the `<collection>` to gate the whole emit, or use an output `count`/`min`/`max` on the `<test>` side to assert cardinality.

## Test-side `<discovered_dataset>`

Inside `<test>` blocks, the discovered files are addressable for assertions through `<discovered_dataset designation="…">` nested under the matching `<output>` (`galaxy.xsd:2247-2297`):

```xml
<test>
  <param name="num_param" value="7"/>
  <param name="input" ftype="txt" value="simple_line.txt"/>
  <output name="sample">
    <assert_contents><has_line line="1"/></assert_contents>
    <discovered_dataset designation="sample2" ftype="tabular">
      <assert_contents><has_line line="2"/></assert_contents>
    </discovered_dataset>
    <discovered_dataset designation="sample3" ftype="tabular">
      <assert_contents><has_line line="3"/></assert_contents>
    </discovered_dataset>
  </output>
</test>
```

The `designation` attribute matches the value of the `designation` (or `name`) named group from the pattern. `ftype` checks the inferred datatype. The first discovered match was hoisted to the primary output by `assign_primary_output="true"`, so its `<assert_contents>` lives directly under `<output>`.

For dynamic-collection outputs, use `<element name="…">` instead — same shape, different addressing surface — and add `count`/`min`/`max` on the `<output>` to assert cardinality (`galaxy.xsd:2085-2099`).

## Galaxy 24+ — the `format` propagation change

Pre-24, `format` declared on the parent `<data>`/`<collection>` was **ignored** for discovered datasets; you had to set `ext`/`format` on the `<discover_datasets>` element itself (or else discovered files defaulted to `data`). Galaxy 24+ propagates the parent `format` if `<discover_datasets>` doesn't specify one (`galaxy.xsd:6265`).

Practical impact for the convert Mold: declaring `format` on the parent `<collection>` is **necessary and sufficient** as long as the wrapper sets `profile="24.0"` or later. For the convert Mold's `profile="23.1"` default (chosen for broad compatibility), keep declaring `ext`/`format` on the `<discover_datasets>` element itself.

## Convert Mold posture — nf-core → Galaxy mapping

The Mold's §4 (*Translate `<outputs>`*) collapses to a set of rules driven by the Nextflow `output:` channel's **cardinality** first, then its glob shape. The trap to avoid: a leading `*` does not by itself imply a list. `path('*.bam')` (N files, one per upstream element) and `path('*.{bai,csi,crai}')` (exactly one file, alternation across mutually-exclusive extensions) look the same syntactically and map to different Galaxy idioms.

**Cardinality heuristic.** A process with `input: tuple(meta, path)` emits one item per invocation. Its `output:` channels are single unless the `script:` body explicitly fans out (loops writing N files, split tools, etc.). Glob shape (`*`, `*.{a,b}`, `${prefix}.*`) is about *filename uncertainty*, not *file count*. Walk the rules below in order; do not skip to Rule 3 just because you see an asterisk.

### Rule 1 — single output, deterministic name → `<data from_work_dir="…">`, no discovery

Nextflow:
```nextflow
output:
tuple val(meta), path("${prefix}.json"), emit: json
```

The output is exactly one file with a runtime-known but stable name. Galaxy:
```xml
<data name="json" format="json" from_work_dir="${prefix}.json"/>
```

`<discover_datasets>` is unnecessary — there is exactly one output at a known path.

### Rule 2 — single output, variable extension (alternation glob) → upstream invocation + `mv` + `<change_format>`, no discovery

Nextflow:
```nextflow
output:
tuple val(meta), path("*.{bai,csi,crai}"), emit: index
```

The channel emits **one** file; the extension depends on input format (CRAM → CRAI) or an args/param choice (BAM + `-c` → CSI, otherwise BAI). This is *not* a list.

**Canonical Galaxy shape — preserve the upstream invocation, capture with `mv`:**

```xml
<command><![CDATA[
    ln -s '$input' 'input.${input.ext}' &&
    samtools index
        -@ \${GALAXY_SLOTS:-1}
        #if $input.ext != 'cram' and $index_format == 'csi':
            -c
        #end if
        $extra_args
        'input.${input.ext}'
    &&
    mv 'input.${input.ext}'.{bai,csi,crai} '$index'
]]></command>
<outputs>
    <data name="index" format="bai">
        <change_format>
            <when input="index_format" value="csi" format="csi"/>
            <when input_dataset="input" attribute="ext" value="cram" format="crai"/>
        </change_format>
    </data>
</outputs>
```

Three moves:

1. **`ln -s` to a deterministic name preserving the input's extension.** Lets upstream extension-derivation logic fire identically to the nf-core module (CRAM input → CRAI output, etc.).
2. **Call the tool with the same positional / flag shape as the upstream `script:` body.** No extra output-path argument, no fork in the invocation. The reviewer's command-parity dimension passes trivially.
3. **`mv <tight-glob> '$output_name'` to capture into Galaxy's per-output staging path.** Use a bash brace glob (`{bai,csi,crai}`) rather than `.*` so the move can't sweep unrelated cwd files.

The `<data>`'s declared `format=` is the default datatype; `<change_format>` (XSD: `OutputDataElement → change_format`) flips it based on the responsible input/param. Galaxy doesn't care what extension the on-disk file has — datatype is metadata, not filename inspection.

The canonical cited case is the nf-core `samtools/index` module: `path("*.{bai,csi,crai}")` → one Galaxy `<data name="index" format="bai">` with `<change_format>`, captured with `mv input.bam.{bai,csi,crai} '$index'`.

**Anti-pattern.** Mapping this shape to `<collection type="list">` + `<discover_datasets>` produces a single-element collection wrapping a degenerate list — wrong cardinality contract for downstream workflow tools, wrong test shape (`<output_collection>` instead of `<output>`), and pulls in discovery overhead for a deterministic single file. If you find yourself writing `<discover_datasets pattern=".+\.(bai|csi|crai)"/>` inside a `<collection>` for a single-file emit, you are in this anti-pattern; rewrite to Rule 2.

**Variant — tool accepts an explicit output-path arg.** If the upstream tool takes a destination path as an arg or flag (`--output`, `-o`, second positional, etc.) and the nf-core `script:` body uses it, you can write directly to `'$<output_name>'` and skip the `mv`:

```xml
<command><![CDATA[
    seqkit grep $extra_args -o '$filter' '$sequence'
]]></command>
```

Treat this as a secondary form, not the default. The `mv` form is preferred because it preserves the upstream command shape byte-for-byte (better for the reviewer's command-parity dimension) and generalizes to tools that don't accept an output-path arg at all. Use the direct-`$output` form only when the upstream `script:` body itself uses the output-path arg — then you're mirroring upstream, not editing it.

**When `from_work_dir` is the right move instead.** If the upstream `script:` body always writes to a fixed, literal name in cwd (no `${prefix}` interpolation, no extension alternation), Rule 1 with `from_work_dir="literal.ext"` is simpler than Rule 2. Rule 2 exists for the case where the filename — or its extension — is not knowable from the wrapper's static configuration.

### Rule 3 — multi-output, list cardinality (true glob) → `<collection type="list">` + `<discover_datasets>`

Nextflow:
```nextflow
output:
tuple val(meta), path('*.bam'), emit: bams
```

…and the `script:` body emits N BAMs keyed by element identifier (e.g. per-sample, per-chromosome). Galaxy:
```xml
<collection name="bams" type="list" format="bam">
  <discover_datasets pattern="__name_and_ext__" directory="." visible="true"/>
</collection>
```

`__name_and_ext__` captures the basename as the element identifier and the extension as datatype.

### Rule 4 — multi-output, paired cardinality → `<collection type="paired">` + paired discovery

Nextflow:
```nextflow
output:
tuple val(meta), path("*_R{1,2}.fastp.fastq.gz"), emit: reads
```

Galaxy:
```xml
<collection name="reads" type="paired" format="fastqsanger.gz">
  <discover_datasets pattern="(?P<name>.+)_R(?P<identifier_1>[12])\..*\.fastq\.gz" ext="fastqsanger.gz" visible="true"/>
</collection>
```

This needs a custom regex; no named pattern captures the `R1`/`R2` split into `identifier_1`. The Mold's LLM step generates the regex from the file glob.

### Rule 5 — `versions.yml` (the versions emit) → drop

The `versions:` channel has no Galaxy analog (`<version_command>` covers it). Don't emit `<data>` or `<collection>` for it. See `[[nfcore-versions-emit-to-galaxy-version-command]]`.

## Pitfalls

- **`visible` defaults to false.** Always declare `visible="true"` unless you specifically want the discovered files hidden from history. Forgetting it is the most common authoring slip.
- **`assign_primary_output` only on `<data>`, not `<collection>`.** The collection version doesn't accept it; the XSD enforces this (`OutputCollectionDiscoverDatasets` doesn't include the attribute).
- **`from_provided_metadata="true"` is exclusive with `pattern` and `sort_by`.** Specify either-or, never both.
- **Glob in `from_work_dir` ≠ discovery.** `from_work_dir="*.bam"` is invalid; that attribute takes a literal path. For globs you must use `<discover_datasets>`.
- **`__name__` vs `__designation__`.** The only difference is which named group the regex captures. Use `__designation__` (and `<discovered_dataset designation="…">` on the test side) when matching IUC convention for tests; use `__name__` when the surrounding wrapper already uses `name`-style identifiers.
- **Sort matters for `assign_primary_output`.** Default sort is lexical filename. If your wrapper expects a specific file as primary, pin the sort (`sort_by="numeric_name"`, `sort_by="reverse_lexical_designation"`, etc.) — don't rely on luck.
- **Nested collections need every `identifier_N`.** A `list:paired` discover that names only `identifier_0` fails at runtime; you need both levels covered by the regex.
- **Custom regexes match filename only by default.** To match subdirectory components, set `match_relative_path="true"` and embed the path in named groups; otherwise scope with `directory="subdir"` + `recurse="false"`.

## See also

- `[[convert-nfcore-module-to-galaxy-tool]]` — Mold that consumes this reference when emitting `<outputs>`.
- `[[nfcore-channel-input-to-galaxy-collection]]` — companion: how to map input channels to data / collection params.
- `[[galaxy-collection-semantics]]` — what map-over / reduction does to a collection at workflow time.
- `[[planemo-asserts-idioms]]` — how to write assertions inside `<discovered_dataset>` / `<element>` bodies.
- Galaxy XSD: `lib/galaxy/tool_util/xsd/galaxy.xsd` — authoritative attribute grammar.
- Galaxy test tools: `test/functional/tools/multi_output*.xml`, `output_filter.xml`, `discover_sort_by.xml`, `collection_creates_dynamic_*.xml` — exhaustive coverage of supported shapes.
- Planemo writing-advanced docs: "Multiple output files" — narrative tutorial.
