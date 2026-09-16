---
name: author-galaxy-tool-wrapper
description: "Author a new Galaxy user-defined tool YAML definition when discovery yields nothing acceptable."
---

# author-galaxy-tool-wrapper

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Author a new Galaxy user-defined tool YAML definition when discovery yields nothing acceptable.

## Inputs

- Read artifact `summary-nextflow`. Optional; absence is allowed and must be reported honestly. Schema: summary-nextflow. Produced by `summarize-nextflow`. Optional whole-pipeline Nextflow summary from summarize-nextflow, when available; other source descriptions and standalone process evidence can supply the authoring context directly.

## Outputs

- Write artifact `galaxy-user-tool-definition` as `galaxy-user-tool.yml`. Format: `yaml`. Galaxy `GalaxyUserTool` YAML definition for a tool not present on the Tool Shed.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- `references/notes/galaxy-user-tool-authoring.md`: Research note copied verbatim into the bundle. Field contract, expression syntax, script placement, and package inference for a `GalaxyUserTool` definition.

## Load On Demand

- `references/notes/component-nextflow-containers-and-envs.md`: Research note copied verbatim into the bundle. Map Nextflow container/conda evidence to Galaxy UDT container and package provenance. Use when: a missing Galaxy user-defined tool must be authored from a Nextflow process with container or conda directives.
- `references/notes/component-nextflow-containers-and-envs.yml`: Companion file copied verbatim into the bundle. Sibling of `references/notes/component-nextflow-containers-and-envs.md`; read it where that note directs.
- `references/notes/galaxy-user-tool-critique.md`: Research note copied verbatim into the bundle. Clarity and idiomaticity criteria, and the text-versus-structural test for each proposed fix. Use when: after the drafted `GalaxyUserTool` passes structural validation and before emitting `galaxy-user-tool.yml`.
- `references/notes/nextflow-path-glob-to-galaxy-datatype.md`: Research note copied verbatim into the bundle. Choose datatypes from Nextflow path/glob evidence and its confidence rules; use the UDT field contract for final input/output syntax. Use when: supplied Nextflow paths or output globs provide datatype evidence.
- `references/notes/nfcore-channel-input-to-galaxy-collection.md`: Research note copied verbatim into the bundle. Interpret nf-core tuple/path input roles and cardinality; express the result using UDT-supported input shapes rather than copying XML examples. Use when: supplied Nextflow evidence contains nf-core tuple(meta, path) inputs or single/paired branching.
- `references/notes/nfcore-meta-map-to-galaxy-params.md`: Research note copied verbatim into the bundle. Distinguish behavior-driving meta keys from identity and naming metadata when building the UDT requirements brief. Use when: supplied Nextflow script evidence reads meta-map keys.
- `references/schemas/summary-nextflow.schema.json`: Schema file copied verbatim into the bundle. Interpret a supplied whole-pipeline Nextflow summary and resolve process evidence within it. Use when: the optional summary-nextflow artifact is supplied; do not require a whole summary or apply its envelope schema to standalone process evidence.

## Validation

- None declared.

## Procedure

Author a Galaxy user-defined tool (UDT) YAML definition when discover-shed-tool cannot produce an acceptable existing Tool Shed wrapper. This skill owns the author-on-fallthrough path only; do not duplicate existing wrappers unless discovery evidence is weak or missing.

The output is a single `GalaxyUserTool` YAML document, not Galaxy XML. Preserve source evidence and unresolved assumptions in the emitted artifact or companion notes rather than inventing command flags, containers, datatypes, or package names.

### Inputs

Use the supplied tool need and discovery fallthrough context to identify:

- The command or abstract step that needs a tool.
- Command intent, required inputs, expected outputs, and test fixture evidence.
- Container, Bioconda, Conda, or environment evidence from the supplied source.
- Why Tool Shed discovery did not supply an acceptable existing wrapper.

The source may be a CWL tool description, an interview or paper-derived executable brief, Nextflow process evidence, or another description with sufficient command and interface detail. Nextflow is not a prerequisite. An abstract step still needs enough executable evidence to author a truthful tool.

A whole summary-nextflow is optional. When supplied, use its schema and resolve the selected process's tool or container references within that summary. A standalone process row or source excerpt is task evidence, not a whole `summary-nextflow` artifact: do not validate it against the whole-summary envelope, require its parent pipeline, or invent registry entries to satisfy foreign keys. Use evidence present in the row itself; request missing command, dependency, or interface details when those are needed.

Load Nextflow-specific notes only for the evidence their triggers describe. Reuse their source interpretation rules for cardinality, metadata, dependencies, and datatype confidence. Their XML/Cheetah examples do not define the UDT syntax or supported shapes: follow galaxy-user-tool-authoring, and report unsupported behavior or any intentional narrowing instead of copying XML fields into YAML. convert-nfcore-module-to-galaxy-tool remains a separate XML conversion procedure.

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

Nothing downstream of this skill re-resolves the container. Galaxy deployments can re-resolve a generated tool's image against verified biocontainers, but that is off by default upstream and absent here — the image written is the image that runs. Where the source evidences no container, infer packages from the command per §7 of the authoring note rather than deferring the choice.

#### 3. Generate the structured draft

Write the `GalaxyUserTool` YAML draft from the requirements brief, following `references/notes/galaxy-user-tool-authoring.md`.

Nothing constrains this draft to the schema as it is written, so the rules in that note are load-bearing rather than advisory. The ones that fail most often: `format` on a data input is a list even for a single format; the default field is `value` and never `default`; an output's `format` is a string while an input's is a list; `$(outputs.X.path)` is not valid syntax; and every `inputs.NAME` in `shell_command` must match a declared input exactly.

#### 4. Validate structurally

Validate the draft against the available Galaxy user-tool validator or schema surface before critique. Treat structural validation failures as authoring failures, not critic feedback.

Fix validation errors directly. Do not run the critic until the draft passes structural validation.

#### 5. Run mandatory critic pass

After structural validation passes, review the draft against `references/notes/galaxy-user-tool-critique.md`, with the original request and requirements brief in hand.

Apply every concrete clarity or idiomaticity issue. Sort each fix into text-level or structural per that note: text-level fixes are applied to the named field directly; a structural one means regenerating from §3 rather than improvising an edit. Re-validate structurally after edits — a `shell_command` change can break name matching. If critique conflicts with source evidence, keep the source evidence and record the conflict.

#### 6. Emit the UDT artifact

Write `galaxy-user-tool.yml` with the validated and critic-reviewed `GalaxyUserTool` definition.

The artifact should be ready for the downstream harness or Galaxy runtime to load as a user-defined tool. Include unresolved assumptions only when they are truthful and actionable; otherwise fail instead of emitting a misleading tool.

### Non-goals

- **Tool Shed discovery.** Use discover-shed-tool before this skill.
- **Existing wrapper summarization.** Use summarize-galaxy-tool for Tool Shed or installed Galaxy wrappers.
- **Galaxy XML authoring.** This skill emits UDT YAML only.
- **Workflow step binding.** implement-galaxy-tool-step decides how the authored tool is used in a workflow step.

## Feedback Mode

- Feedback mode is off unless the caller explicitly enables `--feedback` or supplies a feedback-ledger path.
- When enabled, read `_feedback.md` before doing the work and use its registered `foundry-feedback.ledger.yml` protocol.
- Preserve harness-owned run and phase state. Append only concrete observations about a canonical Foundry source asset or a related project that this run showed to be at fault; do not put ordinary workflow requirements in this ledger.
- Before reporting completion, make one explicit pass over the work you just did. Do not ask yourself whether anything was unclear — recall what happened: where you guessed at something the instructions should have settled, needed information this bundle does not carry, hit an instruction that contradicted another or contradicted the artifacts in front of you, used a packaged reference that did not cover your case, or did something the procedure never describes.
- Append an entry for each such event that clears the protocol's bar. If none do, append nothing and report `no feedback` explicitly. Silence and a clean pass are not the same thing, and nothing downstream can tell them apart unless you say which one it was.
- Pass the same ledger path to any subagent used for this work, and merge updates serially so one writer cannot overwrite another.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
