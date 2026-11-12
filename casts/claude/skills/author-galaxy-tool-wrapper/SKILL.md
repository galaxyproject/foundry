---
name: author-galaxy-tool-wrapper
description: "Author a new Galaxy user-defined tool YAML definition when Tool Shed discovery misses."
---

# author-galaxy-tool-wrapper

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Author a new Galaxy user-defined tool YAML definition when Tool Shed discovery misses.

## Inputs

- Read artifact `summary-nextflow`. Schema: summary-nextflow. Produced by `summarize-nextflow`. Source pipeline summary from summarize-nextflow; provides process command, inputs, outputs, and container or conda evidence for UDT authoring.
- Read artifact `galaxy-tool-pin`. Schema: galaxy-tool-discovery. Produced by `discover-shed-tool`. The discover-shed-tool result for the step.

## Outputs

- Write artifact `galaxy-user-tool-definition` as `galaxy-user-tool.yml`. Format: `yaml`. Galaxy `GalaxyUserTool` YAML definition for a tool not present on the Tool Shed.

## Required Tools

- **`gxwf`** (gxwf). `npm install -g '@galaxy-tool-util/cli@^1.15.0'`.
  Ephemeral run: `npx --yes --package @galaxy-tool-util/cli@1.15.0 gxwf`.
  Check: `gxwf --help | grep -q draft-validate`.
  Docs: https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli

## Load Upfront

- `references/notes/galaxy-user-tool-authoring.md`: Research note copied verbatim into the bundle. Field contract, expression syntax, script placement, and package inference for a `GalaxyUserTool` definition.
- `references/schemas/summary-nextflow.schema.json`: Schema file copied verbatim into the bundle. Read process tool, container, conda, inputs, outputs, script summary, and test fixture evidence from the source pipeline summary.

## Load On Demand

- `references/cli/validate-tool-source.json`: CLI command reference packaged as a sidecar. Run Galaxy schema and semantic validation on the completed user-tool definition before critique or emission. Use when: after writing galaxy-user-tool.yml and after every structural edit made during critique.
- `references/notes/component-nextflow-containers-and-envs.md`: Research note copied verbatim into the bundle. Map Nextflow container/conda evidence to Galaxy UDT container and package provenance. Use when: a missing Galaxy user-defined tool must be authored from a Nextflow process with container or conda directives.
- `references/notes/component-nextflow-containers-and-envs.yml`: Companion file copied verbatim into the bundle. Sibling of `references/notes/component-nextflow-containers-and-envs.md`; read it where that note directs.
- `references/notes/galaxy-user-tool-critique.md`: Research note copied verbatim into the bundle. Clarity and idiomaticity criteria, and the text-versus-structural test for each proposed fix. Use when: after the drafted `GalaxyUserTool` passes structural validation and before emitting `galaxy-user-tool.yml`.
- `references/notes/galaxy-user-tool-workflow-binding.md`: Research note copied verbatim into the bundle. Register an authored tool through `/api/unprivileged_tools`, not the admin-only `/api/dynamic_tools`, when it must run on a server outside a workflow step. Use when: the caller asks to register, upload, or run the authored tool on a Galaxy server instead of embedding it in a workflow step.

## Validation

- None declared.

## Procedure

Author a Galaxy user-defined tool (UDT) YAML definition when discover-shed-tool finds no wrapper that runs the step's work. This skill owns the author-on-miss path only.

The output is a single `GalaxyUserTool` YAML document, not Galaxy XML. Preserve source evidence and unresolved assumptions in the emitted artifact or companion notes rather than inventing command flags, containers, datatypes, or package names.

### Inputs

Use the source summary and branch fallthrough context to identify:

- The process or abstract step that needs a tool.
- Command intent, required inputs, expected outputs, and test fixture evidence.
- Container, Bioconda, Conda, or environment evidence from the source pipeline.

### Procedure

#### 1. Confirm authoring is justified

Read the discover-shed-tool result before writing any part of the UDT. Author only when its `status` is `miss`, or when it is `weak` and the caller's confirmation showed the candidate doesn't run the step's work. Otherwise a wrapper exists: stop without emitting `galaxy-user-tool.yml` and return the candidate to the caller. Authoring a UDT for a step an existing wrapper can run is a failure.

If the missing tool need is under-specified, ask for clarification or emit an unresolved assumption. Do not create a plausible-looking UDT from absent command or container evidence.

#### 2. Build the UDT requirements brief

Extract the minimum executable contract:

- Tool id, version, display name, and description.
- Container image or package evidence, with confidence.
- `shell_command` intent and every referenced input/output token.
- Input parameters with Galaxy-compatible names, types, labels, defaults, help text, and datatypes when evidenced.
- Output datasets or collections with formats and `from_work_dir` / discovery rules.

Resolve the target policy before selecting an image. Use caller-supplied `user_defined_tool_allowed_containers` and `user_defined_tool_denied_containers`, or a policy returned by the target Galaxy. Otherwise use the Galaxy default: allow `quay.io/biocontainers/*` and deny nothing. Do not create a probe tool. A 400 from creating the requested tool is policy evidence, not permission to leave a disposable tool behind.

Apply both lists with Galaxy's matching semantics. Canonicalize registry names before comparison; namespace rules ending in `/*` match repositories strictly below that path; an exact image without a tag or digest allows every version; a tag rule excludes digest-bearing references; a digest rule matches that digest; and a denied match overrides every allowed match. Reject `docker://` and other schemes in the artifact even when policy parsing can canonicalize one, because Galaxy's runtime adds its own transport scheme.

Under the default, emit only a fully qualified image strictly below `quay.io/biocontainers/`, pinned by tag, digest, or both. A source Docker Hub, Wave, ORAS, or other registry image remains provenance, not an eligible UDT `container`.

When the source supplies a pinned allowed BioContainers image, use it only after confirming that the tag exists and provides every invoked command. Otherwise derive canonical Conda package specs from the source and call `recommend_biocontainer` when that operation is available. Pass every required package together so a multi-command tool resolves to a mulled image rather than an incomplete single-package image.

Interpret the result before drafting:

- `exact_version` with an image and `verified` not false: recheck the returned image against the target policy, then use it.
- `name_only` with an image and `verified` not false: report the requested-to-resolved version change and require confirmation before use.
- No image, `not_found`, `verified: false`, an unavailable resolver, or a malformed or out-of-policy result: stop unresolved. Do not retry with fewer packages merely to obtain an image.

For a command that needs only shell builtins or core utilities, use a known allowed general-purpose BioContainers image such as `quay.io/biocontainers/python:3.13`, after confirming the required commands exist. Nothing downstream of this skill re-resolves the image.

If the source image is outside the default allowlist and no permitted equivalent is established, stop before drafting. Return an unresolved container requirement with three options: build or locate a suitable BioContainers image, provide evidence that the target Galaxy allows the source image, or leave the step unresolved. Do not defer this failure to workflow testing.

#### 3. Generate the structured draft

Write the `GalaxyUserTool` YAML draft from the requirements brief, following `references/notes/galaxy-user-tool-authoring.md`.

Nothing constrains this draft to the schema as it is written, so the rules in that note are load-bearing rather than advisory. The ones that fail most often: `format` on a data input is a list even for a single format; the default field is `value` and never `default`; an output's `format` is a string while an input's is a list; `$(outputs.X.path)` is not valid syntax; and every `inputs.NAME` in `shell_command` must match a declared input exactly. Never interpolate a free-form `text` input directly into `shell_command` or executable script source, even inside quotes. Serialize it into a JSON configfile with `JSON.stringify` and read it as data.

#### 4. Validate structurally

Check the selected image against the resolved allow and deny lists before schema validation. Under the default, require registry `quay.io`, a repository strictly below `biocontainers/`, no transport scheme, and a tag or digest. A source image's existence is not policy evidence.

Write the draft to `galaxy-user-tool.yml` and run `gxwf validate-tool-source galaxy-user-tool.yml --json --security` without `--schema-only`. Treat container-policy, structural and security validation failures as authoring failures, not critic feedback. If the command or its `--security` option is unavailable, stop with `validation-not-run`; do not substitute visual inspection.

Fix validation errors directly. Do not run the critic until the draft passes structural validation.

#### 5. Run mandatory critic pass

After structural validation passes, review the draft against `references/notes/galaxy-user-tool-critique.md`, with the original request and requirements brief in hand.

Apply every concrete clarity or idiomaticity issue. Sort each fix into text-level or structural per that note: text-level fixes are applied to the named field directly; a structural one means regenerating from §3 rather than improvising an edit. Re-run the policy check and `gxwf validate-tool-source --security` after edits — a `shell_command`, configfile or container change can invalidate a gate. If critique conflicts with source evidence, keep the source evidence and record the conflict.

#### 6. Emit the UDT artifact

Write `galaxy-user-tool.yml` with the validated and critic-reviewed `GalaxyUserTool` definition.

The artifact should be ready for the downstream harness or Galaxy runtime to load as a user-defined tool. Include unresolved assumptions only when they are truthful and actionable. Otherwise fail instead of emitting a misleading tool.

The file is handed on as written. implement-galaxy-tool-step embeds it under the workflow step's `run:`, so it does not need registering with a Galaxy server first, and its `id` and `version` are what identify the tool in the workflow. To register or run it on a server by itself, follow galaxy-user-tool-workflow-binding.

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
