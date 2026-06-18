---
name: summarize-galaxy-tool
description: "Pull JSON schema, container, source, inputs/outputs for a Galaxy tool."
---

# summarize-galaxy-tool

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Pull JSON schema, container, source, inputs/outputs for a Galaxy tool.

## Inputs

- Read artifact `galaxy-tool-pin`. Schema: galaxy-tool-discovery. Produced by `discover-shed-tool`. Pin from discover-shed-tool; identifies which cached ParsedTool to summarize. Authored UDTs from author-galaxy-tool-wrapper bypass this Mold.

## Outputs

- Write artifact `galaxy-tool-summary` as `galaxy-tool-summary.json`. Format: `json`. Schema: galaxy-tool-summary. Deterministic Galaxy tool summary manifest emitted by `galaxy-tool-cache summarize`: cache provenance, embedded ParsedTool, generated input JSON Schemas.

## Required Tools

- **`galaxy-tool-cache`** (galaxy-tool-cache). `npm install -g @galaxy-tool-util/cli@^1.8.1`.
  Ephemeral run: `npx --package @galaxy-tool-util/cli@1.8.1 galaxy-tool-cache`.
  Check: `galaxy-tool-cache --version`.
  Docs: https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli
  Bundled reference: `references/cli/galaxy-tool-cache.md`.

## Load Upfront

- `references/cli/summarize.json`: CLI command reference packaged as a sidecar. Emit the deterministic galaxy-tool-summary manifest for the cached pin; this Mold runs the command rather than hand-authoring the manifest. Use when: once the pin is confirmed present in the cache.
- `references/cli/galaxy-tool-cache.md`: CLI tool reference copied verbatim into the bundle. Runtime that emits the tool summary; the Mold's entire job is invoking it against a populated cache. Install before driving the skill.
- `references/notes/galaxy-tool-summary-input-source.md`: Research note copied verbatim into the bundle. Treat cached ParsedTool JSON from galaxy-tool-cache as the v1 input source for Galaxy tool summaries.
- `references/schemas/galaxy-tool-summary.schema.json`: Schema file copied verbatim into the bundle. Validate the manifest emitted by `galaxy-tool-cache summarize` before handing it to downstream step Molds.

## Load On Demand

- `references/cli/add.json`: CLI command reference packaged as a sidecar. Cache-population precondition: `summarize` reads an already-cached pin and fails if missing, so `add` fetches the pin into the cache first. Use when: the requested pin is not yet present in the configured cache directory.
- `references/notes/component-tool-shed-search.md`: Research note copied verbatim into the bundle. Resolve Galaxy tool identity, Tool Shed versioning, and changeset context before summarizing a wrapper. Use when: a tool summary starts from a Tool Shed hit rather than an installed Galaxy tool object.
- `references/schemas/parsed-tool.schema.json`: Schema file copied verbatim into the bundle. Resolve field-level questions about the upstream `ParsedTool` payload embedded under `parsed_tool`. Use when: a downstream Mold needs a specific input/output/help/citation field from the embedded `ParsedTool`.

## Validation

- Validate `galaxy-tool-summary.json` before returning it: run `foundry galaxy-tool-summary.json` from `@galaxy-foundry/foundry`. If the command is not on PATH, run `npx --package @galaxy-foundry/foundry foundry galaxy-tool-summary.json`. This checks artifact `galaxy-tool-summary` against the galaxy-tool-summary schema.

## Procedure

Read a cached Galaxy `ParsedTool` object for an existing wrapper and emit a compact tool summary that downstream step implementation can bind to. This skill runs after discover-shed-tool has selected a Tool Shed pin and after the caller has populated `galaxy-tool-cache` for that pin.

This skill owns the **wrapper summarization** step only. It does not search the Tool Shed, choose a version, author XML, or decide how a workflow step should use the wrapper. Its job is to preserve the wrapper's executable contract: identity, command shape, inputs, outputs, requirements, tests, and any conditional or data-table behavior that could affect binding.

The v1 input-source decision is galaxy-tool-summary-input-source: read cached ParsedTool JSON, using raw XML only as supporting evidence when the cache object is lossy or ambiguous.

### Inputs

The skill expects:

- A Tool Shed pin from discover-shed-tool: `tool_shed_url`, `owner`, `repo`, `tool_id`, `version`, and `changeset_revision`.
- A `galaxy-tool-cache` directory containing the cached ParsedTool JSON for that pin.
- Optional raw XML source for ambiguity checks, normally fetched through cache metadata rather than treated as the primary input.
- Optional step intent from the caller, used only to prioritize which wrapper details to explain; it must not change the wrapper facts.

### Outputs

A single JSON document conforming to galaxy-tool-summary — the deterministic manifest emitted by `galaxy-tool-cache summarize` from `@galaxy-tool-util/cli`. Top-level fields: `schema_version`, `tool_id`, `tool_version`, `cache_key`, `source`, `artifacts`, `parsed_tool`, `input_schemas`, `warnings`. The `parsed_tool` subtree is the upstream parsed-tool payload verbatim; `input_schemas.workflow_step` and `input_schemas.workflow_step_linked` carry generated JSON Schemas describing the tool's inputs at workflow-step authoring time.

This skill does not hand-author the manifest — it invokes `galaxy-tool-cache summarize` against a cache populated for the Tool Shed pin. Wrapper-derived facts that are not yet exposed by upstream `ParsedTool` (currently: requirements, containers, stdio) flow into the manifest additively as Galaxy upstream extends `ParsedTool`; no Foundry-side schema change is needed when they ship.

### Procedure

#### 1. Load the cached wrapper

Locate the ParsedTool JSON in the configured `galaxy-tool-cache` directory using the Tool Shed pin. `galaxy-tool-cache summarize` reads an already-cached pin — it does not re-fetch — so the pin must be cached first via add (single pin) or `populate-workflow` (the loop driver's whole-draft form). If the cache entry is missing, run add for the pin rather than silently re-searching the Tool Shed; fail early if `add` cannot resolve it.

Confirm the cached identity matches the requested pin. If the cache exposes a tool id or version that conflicts with the pin, emit a hard failure rather than summarizing the wrong wrapper.

#### 2. Capture identity and provenance

Populate `source` from the discovery pin and cache metadata. Populate `tool` from the parsed wrapper identity fields, not from the search hit. Search hits can omit version and changeset detail.

Keep both forms when they differ:

- Short XML `id` for human matching.
- Fully qualified installed Tool Shed id for gxformat2 step binding.

#### 3. Extract executable requirements

Read `<requirements>` into structured package/container requirements. Preserve requirement `type`, `name`, `version`, and any container URI or resolver hints exposed by the cache.

Do not invent Bioconda equivalences here. Equivalence inference belongs to author-galaxy-tool-wrapper when authoring a new UDT. Existing wrapper summaries report what the wrapper declares.

#### 4. Summarize command and failure behavior

Preserve the command template enough for downstream binding to understand which inputs and parameters are consumed. Record strict-shell, stdio regexes, exit-code handling, environment variables, and dynamic output behavior when present.

The command summary should be readable, but lossy prose is not enough. Keep template fragments and wrapper flags where they affect required inputs, output discovery, or runtime failure classification.

#### 5. Enumerate inputs

For every wrapper input parameter, emit:

- `name` and label/help text when available.
- Parameter kind (`data`, `data_collection`, `select`, `integer`, `float`, `boolean`, `text`, conditional section, repeat, section).
- Required/optional/default semantics.
- Datatypes, collection types, and multiple-value behavior.
- Select choices and dynamic options when statically available.
- Data-table references separately from user-provided parameters.

Nested conditionals must preserve branch ownership. Do not flatten `when` branches into independent parameters without recording the controlling selector and branch value.

#### 6. Enumerate outputs

For every output and collection output, emit:

- Output name, datatype, label, and `from_work_dir` or discovery rule when available.
- Conditional output ownership.
- Dynamic output collection shape and naming rules.
- Relationship to input collections when the wrapper maps over or preserves identifiers.

If output discovery depends on runtime filenames, record that as a warning for downstream test and debug skills.

#### 7. Capture tests and citations

Summarize wrapper tests into input fixture expectations, parameter settings, and output assertions. Do not treat wrapper tests as workflow tests; they are evidence about legal parameter combinations and output behavior.

Preserve citations, help text, and upstream URLs when present because they help resolve ambiguous wrappers during review.

#### 8. Emit warnings

Warnings should identify missing or lossy surfaces, especially:

- ParsedTool JSON omits raw XML behavior that affects binding.
- Conditional inputs cannot be reconstructed completely.
- Dynamic data-table options require Galaxy instance configuration.
- Output discovery is runtime-dependent.
- Tests are absent or too thin to confirm key outputs.

### Non-goals

- **Tool discovery.** Use discover-shed-tool before this skill.
- **Wrapper authoring.** Use author-galaxy-tool-wrapper when no acceptable wrapper exists.
- **Step implementation.** implement-galaxy-tool-step binds abstract workflow intent to this summary.
- **Installed-Galaxy-only wrappers.** Deferred until a Galaxy API discovery/input path exists.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
