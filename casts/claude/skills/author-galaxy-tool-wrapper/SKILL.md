---
name: author-galaxy-tool-wrapper
description: "Author a new Galaxy user-defined tool YAML definition when discovery yields nothing acceptable."
---

# author-galaxy-tool-wrapper

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Author a new Galaxy user-defined tool YAML definition when discovery yields nothing acceptable.

## Inputs

- Read artifact `summary-nextflow`. Optional; absence is allowed and must be reported honestly. Schema: summary-nextflow. Produced by `summarize-nextflow`. Source pipeline summary from summarize-nextflow; provides process command, inputs, outputs, and container or conda evidence for UDT authoring.
- Read artifact `galaxy-workflow-draft`. Optional; absence is allowed and must be reported honestly. Schema: galaxy-workflow-draft. Produced by `advance-galaxy-draft-step`, `apply-galaxy-workflow-changeset`, `author-galaxy-tool-wrapper`, `cwl-summary-to-galaxy-template`, `freeform-summary-to-galaxy-template`, `implement-galaxy-tool-step`, `nextflow-summary-to-galaxy-template`, `repair-galaxy-draft-topology`, `workflow-brief-to-galaxy-template`. The draft loop's gxformat2 draft (see galaxy-workflow-draft-format), when advance-galaxy-draft-step escalates a step that needs a tool. The step's `_plan_*` fields and wiring say what the tool must do.
- Read artifact `open-requirements-ledger`. Optional; absence is allowed and must be reported honestly. Produced by `advance-galaxy-draft-step`, `apply-galaxy-workflow-changeset`, `author-galaxy-tool-wrapper`, `compare-against-iwc-exemplar`, `cwl-summary-to-galaxy-data-flow`, `cwl-summary-to-galaxy-interface`, `cwl-summary-to-galaxy-template`, `freeform-summary-to-galaxy-data-flow`, `freeform-summary-to-galaxy-interface`, `freeform-summary-to-galaxy-template`, `implement-galaxy-tool-step`, `interview-to-galaxy-workflow-changeset`, `mature-galaxy-workflow-for-iwc`, `nextflow-summary-to-galaxy-data-flow`, `nextflow-summary-to-galaxy-interface`, `nextflow-summary-to-galaxy-reference-data`, `nextflow-summary-to-galaxy-template`, `repair-galaxy-draft-topology`, `workflow-brief-to-galaxy-data-flow`, `workflow-brief-to-galaxy-interface`, `workflow-brief-to-galaxy-template`. Carried obligations ledger open-requirements-ledger, when escalated from the draft loop. Its open `kind: needs_tool` entry names the step and why discovery found nothing.

## Outputs

- Write artifact `galaxy-user-tool-definition` as `galaxy-user-tool.yml`. Format: `yaml`. Galaxy `GalaxyUserTool` YAML definition for a tool not present on the Tool Shed.
- Write artifact `galaxy-workflow-draft` as `galaxy-workflow-draft.gxwf.yml`. Optional; absence is allowed and must be reported honestly. Format: `yaml`. Schema: galaxy-workflow-draft. When escalated from the draft loop: the same draft with the authored tool inline as the step's `run:`, its `tool_id` and `tool_version` removed and its port wiring left for the next loop call.
- Write artifact `open-requirements-ledger` as `open-requirements.ledger.yml`. Optional; absence is allowed and must be reported honestly. Format: `yaml`. When escalated from the draft loop: the ledger with the step's `needs_tool` entry resolved, every other entry passed through unchanged.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- `references/notes/galaxy-user-tool-authoring.md`: Research note copied verbatim into the bundle. Field contract, expression syntax, script placement, and package inference for a `GalaxyUserTool` definition.
- `references/schemas/summary-nextflow.schema.json`: Schema file copied verbatim into the bundle. Read process tool, container, conda, inputs, outputs, script summary, and test fixture evidence from the source pipeline summary.

## Load On Demand

- `references/notes/component-nextflow-containers-and-envs.md`: Research note copied verbatim into the bundle. Map Nextflow container/conda evidence to Galaxy UDT container and package provenance. Use when: a missing Galaxy user-defined tool must be authored from a Nextflow process with container or conda directives.
- `references/notes/component-nextflow-containers-and-envs.yml`: Companion file copied verbatim into the bundle. Sibling of `references/notes/component-nextflow-containers-and-envs.md`; read it where that note directs.
- `references/notes/galaxy-user-tool-critique.md`: Research note copied verbatim into the bundle. Clarity and idiomaticity criteria, and the text-versus-structural test for each proposed fix. Use when: after the drafted `GalaxyUserTool` passes structural validation and before emitting `galaxy-user-tool.yml`.

## Validation

- Validate `galaxy-workflow-draft.gxwf.yml` for artifact `galaxy-workflow-draft` against the galaxy-workflow-draft schema when a validator is available.

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

#### 7. Place it in the draft, when escalated from the draft loop

When given a draft and a ledger with an open `kind: needs_tool` entry, author the tool for the step that entry names. Read what it must do from the entry, the step's `_plan_*` fields and its wiring, and from the source summary when there is one.

Then write the same `GalaxyUserTool` into the draft as that step's `run:`, and remove the step's `tool_id` and `tool_version`. A step with an inline tool needs no Tool Shed id, so never give it one. Leave the step's port names and `state` to the next loop call. Mark the `needs_tool` entry `resolved`, with `resolved_by: author-galaxy-tool-wrapper`. If the tool can't be authored truthfully, leave the draft unchanged and mark the entry `surrendered`, saying why.

### Non-goals

- **Tool Shed discovery.** Use discover-shed-tool before this skill.
- **Existing wrapper summarization.** Use summarize-galaxy-tool for Tool Shed or installed Galaxy wrappers.
- **Galaxy XML authoring.** This skill emits UDT YAML only.
- **Workflow step binding.** Beyond placing the tool as a step's `run:`, implement-galaxy-tool-step decides how the authored tool is used: its port names and `state`.

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
