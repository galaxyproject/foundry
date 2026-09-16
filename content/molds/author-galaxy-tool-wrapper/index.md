---
type: mold
name: author-galaxy-tool-wrapper
axis: target-specific
target: galaxy
tags:
  - target/galaxy
status: reviewed
created: 2026-04-30
revised: 2026-09-16
revision: 6
related_notes:
  - "[[nextflow-patterns]]"
  - "[[summary-nextflow]]"
summary: "Author a new Galaxy user-defined tool YAML definition when discovery yields nothing acceptable."
input_artifacts:
  - id: summary-nextflow
    optional: true
    description: "Optional whole-pipeline Nextflow summary from [[summarize-nextflow]], when available; other source descriptions and standalone process evidence can supply the authoring context directly."
output_artifacts:
  - id: galaxy-user-tool-definition
    kind: yaml
    default_filename: galaxy-user-tool.yml
    description: "Galaxy `GalaxyUserTool` YAML definition for a tool not present on the Tool Shed."
references:
  - kind: schema
    ref: "[[summary-nextflow]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Interpret a supplied whole-pipeline Nextflow summary and resolve process evidence within it."
    trigger: "When the optional summary-nextflow artifact is supplied; do not require a whole summary or apply its envelope schema to standalone process evidence."
  - kind: research
    ref: "[[galaxy-user-tool-authoring]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Field contract, expression syntax, script placement, and package inference for a `GalaxyUserTool` definition."
  - kind: research
    ref: "[[galaxy-user-tool-critique]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Clarity and idiomaticity criteria, and the text-versus-structural test for each proposed fix."
    trigger: "After the drafted `GalaxyUserTool` passes structural validation and before emitting `galaxy-user-tool.yml`."
  - kind: research
    ref: "[[nfcore-channel-input-to-galaxy-collection]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: hypothesis
    purpose: "Interpret nf-core tuple/path input roles and cardinality; express the result using UDT-supported input shapes rather than copying XML examples."
    trigger: "When supplied Nextflow evidence contains nf-core tuple(meta, path) inputs or single/paired branching."
    verification: "Author from single-file and paired nf-core evidence; preserve cardinality or explicitly report an unsupported UDT shape."
  - kind: research
    ref: "[[nfcore-meta-map-to-galaxy-params]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: hypothesis
    purpose: "Distinguish behavior-driving meta keys from identity and naming metadata when building the UDT requirements brief."
    trigger: "When supplied Nextflow script evidence reads meta-map keys."
    verification: "Confirm identity-only keys do not become required UDT inputs and behavior-driving keys are retained or their narrowing is recorded."
  - kind: research
    ref: "[[nextflow-path-glob-to-galaxy-datatype]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: hypothesis
    purpose: "Choose datatypes from Nextflow path/glob evidence and its confidence rules; use the UDT field contract for final input/output syntax."
    trigger: "When supplied Nextflow paths or output globs provide datatype evidence."
    verification: "Confirm weak variable-name hints do not become invented formats and evidenced formats use UDT input lists and output strings."
  - kind: research
    ref: "[[component-nextflow-containers-and-envs]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: hypothesis
    purpose: "Map Nextflow container/conda evidence to Galaxy UDT container and package provenance."
    trigger: "When a missing Galaxy user-defined tool must be authored from a Nextflow process with container or conda directives."
    verification: "Author one UDT from nf-core/bacass or nf-core/rnaseq process evidence and confirm the note improves requirements/container extraction."
---
# author-galaxy-tool-wrapper

Author a Galaxy user-defined tool (UDT) YAML definition when [[discover-shed-tool]] cannot produce an acceptable existing Tool Shed wrapper. This Mold owns the author-on-fallthrough path only; do not duplicate existing wrappers unless discovery evidence is weak or missing.

The output is a single `GalaxyUserTool` YAML document, not Galaxy XML. Preserve source evidence and unresolved assumptions in the emitted artifact or companion notes rather than inventing command flags, containers, datatypes, or package names.

## Inputs

Use the supplied tool need and discovery fallthrough context to identify:

- The command or abstract step that needs a tool.
- Command intent, required inputs, expected outputs, and test fixture evidence.
- Container, Bioconda, Conda, or environment evidence from the supplied source.
- Why Tool Shed discovery did not supply an acceptable existing wrapper.

The source may be a CWL tool description, an interview or paper-derived executable brief, Nextflow process evidence, or another description with sufficient command and interface detail. Nextflow is not a prerequisite. An abstract step still needs enough executable evidence to author a truthful tool.

A whole [[summary-nextflow]] is optional. When supplied, use its schema and resolve the selected process's tool or container references within that summary. A standalone process row or source excerpt is task evidence, not a whole `summary-nextflow` artifact: do not validate it against the whole-summary envelope, require its parent pipeline, or invent registry entries to satisfy foreign keys. Use evidence present in the row itself; request missing command, dependency, or interface details when those are needed.

Load Nextflow-specific notes only for the evidence their triggers describe. Reuse their source interpretation rules for cardinality, metadata, dependencies, and datatype confidence. Their XML/Cheetah examples do not define the UDT syntax or supported shapes: follow [[galaxy-user-tool-authoring]], and report unsupported behavior or any intentional narrowing instead of copying XML fields into YAML. [[convert-nfcore-module-to-galaxy-tool]] remains a separate XML conversion procedure.

## Procedure

### 1. Confirm authoring is justified

Read the discovery result before authoring. Continue only when discovery returned `miss`, or when the selected hit was weak enough that the harness explicitly fell through.

If the missing tool need is under-specified, ask for clarification or emit an unresolved assumption. Do not create a plausible-looking UDT from absent command or container evidence.

### 2. Build the UDT requirements brief

Extract the minimum executable contract:

- Tool id, version, display name, and description.
- Container image or package evidence, with confidence.
- `shell_command` intent and every referenced input/output token.
- Input parameters with Galaxy-compatible names, types, labels, defaults, help text, and datatypes when evidenced.
- Output datasets or collections with formats and `from_work_dir` / discovery rules.

Prefer BioContainers or directly evidenced containers. If only Conda/package evidence exists, record what is known and avoid guessing an image tag.

Nothing downstream of this Mold re-resolves the container. Galaxy deployments can re-resolve a generated tool's image against verified biocontainers, but that is off by default upstream and absent here — the image written is the image that runs. Where the source evidences no container, infer packages from the command per §7 of the authoring note rather than deferring the choice.

### 3. Generate the structured draft

Write the `GalaxyUserTool` YAML draft from the requirements brief, following `references/notes/galaxy-user-tool-authoring.md`.

Nothing constrains this draft to the schema as it is written, so the rules in that note are load-bearing rather than advisory. The ones that fail most often: `format` on a data input is a list even for a single format; the default field is `value` and never `default`; an output's `format` is a string while an input's is a list; `$(outputs.X.path)` is not valid syntax; and every `inputs.NAME` in `shell_command` must match a declared input exactly.

### 4. Validate structurally

Validate the draft against the available Galaxy user-tool validator or schema surface before critique. Treat structural validation failures as authoring failures, not critic feedback.

Fix validation errors directly. Do not run the critic until the draft passes structural validation.

### 5. Run mandatory critic pass

After structural validation passes, review the draft against `references/notes/galaxy-user-tool-critique.md`, with the original request and requirements brief in hand.

Apply every concrete clarity or idiomaticity issue. Sort each fix into text-level or structural per that note: text-level fixes are applied to the named field directly; a structural one means regenerating from §3 rather than improvising an edit. Re-validate structurally after edits — a `shell_command` change can break name matching. If critique conflicts with source evidence, keep the source evidence and record the conflict.

### 6. Emit the UDT artifact

Write `galaxy-user-tool.yml` with the validated and critic-reviewed `GalaxyUserTool` definition.

The artifact should be ready for the downstream harness or Galaxy runtime to load as a user-defined tool. Include unresolved assumptions only when they are truthful and actionable; otherwise fail instead of emitting a misleading tool.

## Non-goals

- **Tool Shed discovery.** Use [[discover-shed-tool]] before this Mold.
- **Existing wrapper summarization.** Use [[summarize-galaxy-tool]] for Tool Shed or installed Galaxy wrappers.
- **Galaxy XML authoring.** This Mold emits UDT YAML only.
- **Workflow step binding.** [[implement-galaxy-tool-step]] decides how the authored tool is used in a workflow step.
