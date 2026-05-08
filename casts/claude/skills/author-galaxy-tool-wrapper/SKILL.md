---
name: author-galaxy-tool-wrapper
description: "Author a new Galaxy user-defined tool YAML definition when discovery yields nothing acceptable."
---

# author-galaxy-tool-wrapper

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Author a new Galaxy user-defined tool YAML definition when discovery yields nothing acceptable.

## Inputs

- `summary-nextflow`; schema: summary-nextflow; producer(s): `summarize-nextflow`; Source pipeline summary from summarize-nextflow; provides process command, inputs, outputs, and container or conda evidence for UDT authoring.

## Outputs

- `galaxy-user-tool-definition`; kind: `yaml`; default filename: `galaxy-user-tool.yml`; Galaxy `GalaxyUserTool` YAML definition for a tool not present on the Tool Shed.

## Load Upfront

- `references/prompts/custom-tool-structured.md`; kind: `prompt`; mode: `verbatim`; Generate a schema-shaped `GalaxyUserTool` YAML definition from missing-wrapper requirements and source-derived process evidence.
- `references/schemas/summary-nextflow.schema.json`; kind: `schema`; mode: `verbatim`; Read process tool, container, conda, inputs, outputs, script summary, and test fixture evidence from the source pipeline summary.

## Load On Demand

- `references/prompts/custom-tool-critic.md`; kind: `prompt`; mode: `verbatim`; Run the mandatory fuzzy quality review after structural validation passes; Trigger: After the drafted `GalaxyUserTool` passes structural validation and before emitting `galaxy-user-tool.yml`.
- `references/notes/component-nextflow-containers-and-envs.md`; kind: `research`; mode: `verbatim`; Map Nextflow container/conda evidence to Galaxy UDT container and package provenance; Trigger: When a missing Galaxy user-defined tool must be authored from a Nextflow process with container or conda directives.

## Validation

- None declared.

## Procedure

Author a Galaxy user-defined tool (UDT) YAML definition when discover-shed-tool cannot produce an acceptable existing Tool Shed wrapper. This skill owns the author-on-fallthrough path only; do not duplicate existing wrappers unless discovery evidence is weak or missing.

The output is a single `GalaxyUserTool` YAML document, not Galaxy XML. Preserve source evidence and unresolved assumptions in the emitted artifact or companion notes rather than inventing command flags, containers, datatypes, or package names.

### Inputs

Use the source summary and branch fallthrough context to identify:

- The process or abstract step that needs a tool.
- Command intent, required inputs, expected outputs, and test fixture evidence.
- Container, Bioconda, Conda, or environment evidence from the source pipeline.
- Why Tool Shed discovery did not supply an acceptable existing wrapper.

### Procedure

#### 1. Confirm authoring is justified

Read the discovery result before authoring. Continue only when discovery returned `miss`, or when the selected hit was weak enough that the harness explicitly fell through.

If the missing tool need is under-specified, ask for clarification or emit an unresolved assumption. Do not create a plausible-looking UDT from absent command or container evidence.

#### 2. Build the UDT requirements brief

Extract the minimum executable contract:

- Tool id, version, display name, and description.
- Container image or package evidence, with confidence.
- `shell_command` intent and every referenced input/output token.
- Input parameters with Galaxy-compatible names, types, labels, defaults, help text, and datatypes when evidenced.
- Output datasets or collections with formats and `from_work_dir` / discovery rules.

Prefer BioContainers or directly evidenced containers. If only Conda/package evidence exists, record what is known and avoid guessing an image tag.

#### 3. Generate the structured draft

Use `references/prompts/custom-tool-structured.md` to generate a `GalaxyUserTool` YAML draft from the requirements brief.

The draft must use `class: GalaxyUserTool`. Every variable referenced by `shell_command` must have a declared input or output. Escape shell variables that are not Galaxy expressions.

#### 4. Validate structurally

Validate the draft against the available Galaxy user-tool validator or schema surface before critique. Treat structural validation failures as authoring failures, not critic feedback.

Fix validation errors directly. Do not run the critic until the draft passes structural validation.

#### 5. Run mandatory critic pass

After structural validation passes, use `references/prompts/custom-tool-critic.md` with the original request, requirements brief, and drafted YAML.

Apply every concrete clarity or idiomaticity issue when `should_refine` is true. Re-validate the refined draft structurally after edits. If critic feedback conflicts with source evidence, keep the source evidence and record the conflict.

#### 6. Emit the UDT artifact

Write `galaxy-user-tool.yml` with the validated and critic-reviewed `GalaxyUserTool` definition.

The artifact should be ready for the downstream harness or Galaxy runtime to load as a user-defined tool. Include unresolved assumptions only when they are truthful and actionable; otherwise fail instead of emitting a misleading tool.

### Non-goals

- **Tool Shed discovery.** Use discover-shed-tool before this skill.
- **Existing wrapper summarization.** Use summarize-galaxy-tool for Tool Shed or installed Galaxy wrappers.
- **Galaxy XML authoring.** This skill emits UDT YAML only.
- **Workflow step binding.** implement-galaxy-tool-step decides how the authored tool is used in a workflow step.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
