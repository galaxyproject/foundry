---
type: mold
name: summarize-galaxy-workflow
axis: source-specific
source: galaxy
tags:
  - mold
  - source/galaxy
status: draft
created: 2026-07-01
revised: 2026-07-01
revision: 1
ai_generated: true
summary: "Read an existing Galaxy gxformat2 (or .ga) workflow and emit a structured summary for interview and change-set steps."
output_artifacts:
  - id: summary-galaxy-workflow
    kind: json
    default_filename: summary-galaxy-workflow.json
    schema: "[[summary-galaxy-workflow]]"
    description: "Structured summary of an existing Galaxy workflow: source/format provenance, inputs, outputs, per-step tool_id/version/tool_state, edge graph, and any existing tests as a regression baseline."
  - id: starting-galaxy-workflow
    kind: yaml
    default_filename: starting-galaxy-workflow.gxwf.yml
    description: "The normalized concrete gxformat2 workflow this summary describes — passthrough when the input was already gxformat2, the `.ga`→gxformat2 conversion otherwise. The substrate [[apply-galaxy-workflow-changeset]] edits; distinct from the summary JSON, which is only context."
references:
  - kind: schema
    ref: "[[summary-galaxy-workflow]]"
    used_at: both
    load: upfront
    mode: verbatim
    evidence: cast-validated
    purpose: "Validate the emitted Galaxy workflow summary JSON and provide downstream consumers the output contract."
  - kind: cli-command
    ref: "[[convert]]"
    used_at: runtime
    load: on-demand
    mode: sidecar
    evidence: hypothesis
    purpose: "Convert a legacy `.ga` workflow to gxformat2 before summarizing, and record the conversion under documents.converted_path."
    trigger: "When the supplied workflow is native `.ga` rather than gxformat2."
    verification: "Cast the skill, run on one `.ga` and one gxformat2 fixture; confirm the `.ga` case populates documents.converted_path and both summaries validate."
  - kind: cli-command
    ref: "[[gxwf validate]]"
    used_at: runtime
    load: upfront
    mode: sidecar
    evidence: hypothesis
    purpose: "Validate the gxformat2 workflow before extraction and record diagnostics under documents.validation."
    trigger: "Before extracting structure from the workflow document."
    verification: "Cast the skill, run on one valid and one malformed workflow; the malformed one surfaces gxwf validate diagnostics in the summary."
  - kind: cli-tool
    ref: "[[foundry]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: cast-validated
    purpose: "Schema-check summary-galaxy-workflow.json with `foundry validate-summary-galaxy-workflow` before returning it from the skill."
related_notes:
  - "[[summary-galaxy-workflow]]"
  - "[[interview-to-galaxy-workflow-changeset]]"
---
# summarize-galaxy-workflow

Read an existing Galaxy workflow and emit `summary-galaxy-workflow.json`. This Mold is source-specific and target-agnostic: it records what the workflow *is* — inputs, outputs, steps, wiring, and existing tests — and leaves every modification decision to the downstream change-set and apply Molds. It mirrors [[summarize-cwl]] on the Galaxy-as-source side.

gxformat2 is already a typed workflow graph, so do not infer structure — read it. The summary is an LLM-digestible index of the existing workflow that anchors the interview and the change-set; it is **context**, not the substrate edits apply to. The substrate the edits are applied against is the normalized gxformat2 workflow file, emitted here as `starting-galaxy-workflow.gxwf.yml` and consumed by [[apply-galaxy-workflow-changeset]] — not this JSON summary. Because this Mold already normalizes `.ga` to gxformat2, it is the natural carrier for that substrate: a `.ga` input's converted form would otherwise have no declared home.

## Inputs

- A local workflow path or an HTTP(S) URL. Accept both gxformat2 (`.gxwf.yml` / `.gxfmt2.yml`) and legacy native `.ga`.
- Optional pin/version metadata supplied by the harness or user.
- Optional sibling tests file (`*-tests.yml`); if none is supplied or discoverable, emit `tests: []`.

## Procedure

1. **Normalize format.** If the input is native `.ga`, convert it to gxformat2 with [[convert]] (`--to format2`) and record the output path in `documents.converted_path`. If it is already gxformat2, leave `converted_path` null. Set `source.original_format` accordingly. All downstream extraction reads the gxformat2 form. Emit this normalized gxformat2 as the `starting-galaxy-workflow.gxwf.yml` output — the substrate [[apply-galaxy-workflow-changeset]] edits, so a `.ga` input's converted form has a real carrier rather than living only inside the summary.
2. **Validate.** Run [[gxwf validate]] on the gxformat2 workflow and record `command`, `status`, and `diagnostics` under `documents.validation`. If invalid, still emit source provenance and diagnostics; do not invent graph structure past what parses.
3. **Extract the interface.** Record `workflow_inputs` (class `data` / `collection` / `parameter`, `collection_type`, optionality, defaults, format restrictions) and `workflow_outputs` (each promoted `step/output` source), preserving gxformat2 labels verbatim — those labels are the anchors the change-set will address.
4. **Extract steps.** For each step record its class, `tool_id`, `tool_version`, pinned `tool_shed_repository`, verbatim `tool_state`, named input connections with their upstream sources, declared outputs, and any `when:` guard. Keep `tool_state` verbatim so a later change-set can address an individual parameter. Record each declared output under `out[]` as `{id, actions}`, preserving the gxformat2 post-job actions on that output (`hide`, `rename`, `add_tags`, `remove_tags`, `change_datatype`, `delete_intermediate`, …) verbatim in `actions` — `actions: null` when the output has none. A hidden output that is not promoted to a `workflow_outputs` entry is only visible through its `hide` action here, so dropping it would blind an expose-output change-set to the very anchor it edits.
5. **Build the graph.** Emit workflow-input → step, step → step, and step → workflow-output edges. Add `via` markers for shape-affecting features (map-over, batch, collection reduction).
6. **Record tests.** When a sibling tests file or embedded tests exist, record each case's name, job path, and expected outputs as the regression baseline. Do not fabricate expected outputs from tool names.
7. **Schema-check.** Validate the assembled object with `foundry validate-summary-galaxy-workflow summary-galaxy-workflow.json` before returning it.

## Caveats Baked Into The Procedure

- **Labels are load-bearing.** Preserve step and input labels exactly; the change-set anchors edits to them, and a relabel here would silently break that anchoring.
- **`tool_state` is preserved, not interpreted.** Record it verbatim. Deciding which parameter an interview wants changed is the change-set's job, not this Mold's.
- **Post-job actions are preserved, not interpreted.** Record each output's gxformat2 actions verbatim under `out[].actions` (`hide`, `rename`, `add_tags`, …); whether to expose a hidden output or drop a rename is the change-set's decision, not this Mold's. Flattening `out` to bare names would erase that anchor.
- **Existing tests are the regression baseline.** Capture them faithfully; the update pipeline judges the modified workflow against them.
- **Conversion is lossy-aware.** If `.ga` → gxformat2 conversion drops or rewrites anything, surface it in `warnings[]` rather than presenting a clean summary.

## Non-Goals

- **Modification.** Interviewing for changes, building a change-set, and applying edits belong to [[interview-to-galaxy-workflow-changeset]] and [[apply-galaxy-workflow-changeset]].
- **Tool discovery or wrapper authoring.** `tool_id` / `tool_shed_repository` are recorded as-found; resolving newly introduced tools is the per-step Galaxy loop's job.
- **Runtime execution.** This Mold summarizes structure; [[run-workflow-test]] owns execution.
