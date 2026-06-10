# Harness Pipelines

Harness pipelines for the Galaxy Workflow Foundry. Each named pipeline phase corresponds to one atomic, harness-step-sized Mold, and the union of phases across pipelines is the Mold catalog. See `MOLDS.md`.

## Framing

- A **harness** is hand-authored orchestration glue. Harnesses sequence Molds, manage user-approval gates, and maintain run state. They are *not* cast from Molds and live outside the Foundry's casting pipeline. Some harnesses are heavyweight (Archon-style); some are simple orchestration skills.
- Each phase below is intended to be a **Mold** — atomic, cast from the Foundry, LLM-driven content, reusable across harnesses where the phase recurs.
- "atomic" means *atomic relative to harness pipeline phases*, not necessarily small. `summarize-nextflow` and `implement-tool-step` are both atomic at this tier even though they differ in LOC.

## CWL as intermediate (one option, not the path)

CWL is unofficially positioned as a **low-level, high-structure interchange format** — suitable as an intermediate target between an unstructured/loosely-structured source (a paper, a Nextflow pipeline) and Galaxy. The Foundry must support **both direct and composed paths** as first-class options:

- `PAPER → GALAXY` (direct), `INTERVIEW → GALAXY` (interview-normalized direct Galaxy path), and `PAPER → CWL → GALAXY` (composed) are valid.
- `NEXTFLOW → GALAXY` (direct) and `NEXTFLOW → CWL → GALAXY` (composed) are both valid.
- Direct paths are simpler to run and debug. Composed paths buy a structured checkpoint (CWL) at the cost of running two harnesses.
- Whether composition is reliable enough to *prefer* over direct is a longer-term research question. For now: both paths must be possible from the Mold inventory; the harness picks.

**Mold-inventory parity.** Structured source summarizers emit per-source schemas (NF, CWL each different by design). Paper and interview sources now converge on a shared `freeform-summary` Markdown handoff before source-target design. Interface and data-flow handoffs are source-target Molds that produce reviewable Markdown design briefs rather than rich workflow schemas. This avoids pushing all polymorphism into one target Mold while keeping direct/composed pipelines explicit.

## Harness-level concerns (not Molds)

Some recurring pipeline activities are **harness-level**, not Mold-shaped, and are therefore not in the Mold inventory. They are listed here so the boundary is visible.

- **Approval gates / scope confirmation / plan presentation.** Whether and when to pause for user confirmation (after planning, before authoring, after a partial cast) is a property of the harness's autonomy posture, not of any individual Mold. Different harnesses (interactive vs. batch vs. fully autonomous) want different gates around the same Molds; baking gates into Molds would either constrain that or duplicate logic. Harnesses own gates.
- **Tool-discovery routing.** "Try `discover-shed-tool` (find an existing wrapper via the Tool Shed); if nothing acceptable, fall through to `author-galaxy-tool-wrapper`" is a routing decision the harness makes; the two underlying capabilities are clean Molds. (`discover-shed-tool` is named for the *mechanism* — the Galaxy Tool Shed — leaving room for siblings like `discover-tool-via-galaxy-api` or `discover-tool-on-github` if other discovery paths get wrapped.)
- **State and resumption.** Persisting harness state across phases, resuming a partial run, and managing run history are harness concerns.

## Runtime tooling

The Foundry distinguishes:

- **Design time: `gxwf`** — workflow validation, tool discovery, schema, conversion. Used by Molds that author or validate workflow content.
- **Run time: Planemo** — executes Galaxy *and* CWL workflows. Used by `run-workflow-test`, `debug-galaxy-workflow-output`, `debug-cwl-workflow-output`.

### Validation posture: schema, not caveats

gxwf provides **static schema validation** for `gxformat2` workflows and tool steps that catches the failure modes prior-art skills (e.g., the existing `nf-to-galaxy` skill in `SKILLS_NF.md`) had to enumerate as prose caveats — UUID validity, tool-ID/owner/+galaxyN suffix mismatches, `input_connections` parameter-name mismatches, conditional-selector branches in `tool_state`, etc. The Foundry does **not** maintain a parallel "caveat catalog" of these failure modes; gxwf's schema is the source of truth and the validation loop is the enforcement mechanism.

This shifts the per-step loop from "author and hope" to **author → validate → fix** with validation running inline after each step is implemented, not only as a terminal phase. For Galaxy paths the orchestrator Mold `advance-galaxy-draft-step` owns one full iteration end-to-end (pick next drafty step → resolve a wrapper → summarize → implement → `gxwf draft-validate --concrete`); CWL paths keep `validate-cwl` inline inside the per-step loop.

### Orchestrator-as-contract: per-step loop body

Galaxy-targeting pipelines below use a single orchestrator Mold (`advance-galaxy-draft-step`) as the per-step loop body. The orchestrator owns the loop oracle (`gxwf draft-next-step`), the discover-or-author routing, the per-iteration sequencing of leaf Molds (`summarize-galaxy-tool`, `implement-galaxy-tool-step`), and the per-step validator (`gxwf draft-validate --concrete`). The harness loop reduces to `while draft: invoke skill`.

Leaf Molds (`discover-shed-tool`, `author-galaxy-tool-wrapper`, `summarize-galaxy-tool`, `implement-galaxy-tool-step`) stay independently castable for ad-hoc invocation but no longer appear as pipeline phases. CWL-targeting pipelines retain the leaf-shaped per-step body until a parallel orchestrator emerges (see Tracked Follow-Up).

## Pipelines

Each pipeline is presented as an ordered list of phases. Phases marked `[loop]` run once per step in the workflow being constructed. Phases marked `[branch]` are harness-level routing — binary branches with fallthrough, or N-step fallback chains. They are *not* Molds; they reference Molds. The discover-or-author branch in Galaxy-targeting per-step loops is `[branch]` routing between two underlying capabilities.

Other inline phase annotations may be coined as needs surface — e.g., `[gate]` for an approval / scope-confirmation checkpoint that pauses for user input. None appear inline in the pipelines below today, so we don't pre-enumerate. `[branch]` and `[gate]` are unrelated behaviors; they don't share an umbrella tag.

### PAPER → GALAXY

1. `summarize-paper` — extract methods, named tools/algorithms, sample data, metrics, references to existing pipelines; emit `freeform-summary`.
2. `freeform-summary-to-galaxy-interface` — Galaxy workflow interface design brief.
3. `freeform-summary-to-galaxy-data-flow` — Galaxy abstract data-flow design brief from the summary plus interface brief.
4. `compare-against-iwc-exemplar` — structural diff of the design briefs against nearest IWC exemplar(s); guidance feeds template authoring.
5. `freeform-summary-to-galaxy-template` — `gxformat2` skeleton with per-step TODOs from free-form source evidence, the interface and data-flow briefs, and exemplar comparison notes.
6. `[loop]` `advance-galaxy-draft-step` — one full iteration: pick next drafty step via `gxwf draft-next-step`, route through the discover-or-author branch (try `discover-shed-tool`, fall through to `author-galaxy-tool-wrapper`), summarize the wrapper, implement the step, validate via `gxwf draft-validate --concrete`. Loop terminates on `draft: false`.
7. `[branch]` test-data resolution chain: try `paper-to-test-data` → on failure, `find-test-data` → on failure, harness gates to user-supplied data.
8. `implement-galaxy-workflow-test` — assemble test fixtures and assertions.
9. `validate-galaxy-workflow` — terminal schema/lint pass on the assembled workflow.
10. `run-workflow-test` — execute via Planemo.
11. `debug-galaxy-workflow-output` — triage failures, propose fixes.

### PAPER → CWL

1. `summarize-paper`
2. `freeform-summary-to-cwl-design`
3. `summary-to-cwl-template` — CWL Workflow skeleton with per-step TODOs from source evidence and prior handoffs.
4. `[loop]` `summarize-cwl-tool` — derive a `CommandLineTool` description for each candidate (container, baseCommand, inputs/outputs).
5. `[loop]` `implement-cwl-tool-step` — concrete `CommandLineTool` and Workflow step.
6. `[loop]` `validate-cwl` — schema-validate the just-implemented step; on red, the harness loops back to (5).
7. `[branch]` test-data resolution chain: try `paper-to-test-data` → on failure, `find-test-data` → on failure, harness gates to user-supplied data.
8. `implement-cwl-workflow-test`
9. `validate-cwl` — terminal `cwltool --validate` / schema lint.
10. `run-workflow-test` — execute via Planemo.
11. `debug-cwl-workflow-output` — triage failures, propose fixes.

### NEXTFLOW → CWL

1. `summarize-nextflow` — enumerate processes, channels, conditionals, containers, test data; emit a structured summary (NF-specific schema).
2. `nextflow-summary-to-cwl-interface`
3. `nextflow-summary-to-cwl-data-flow`
4. `summary-to-cwl-template`
5. `[loop]` `summarize-cwl-tool`
6. `[loop]` `implement-cwl-tool-step`
7. `[loop]` `validate-cwl` — inline schema validation per step; loop back on red.
8. `nextflow-test-to-cwl-test-plan` — translate NF test data and expectations into a CWL workflow test plan.
9. `validate-cwl` — terminal pass on the assembled workflow.
10. `run-workflow-test` — execute via Planemo.
11. `debug-cwl-workflow-output`

### NEXTFLOW → GALAXY

1. `summarize-nextflow`
2. `nextflow-summary-to-galaxy-reference-data` — decide Galaxy-side shape of external reference data (iGenomes key, per-asset, compute-if-missing) before interface and data-flow choices pin workflow inputs.
3. `nextflow-summary-to-galaxy-interface`
4. `nextflow-summary-to-galaxy-data-flow`
5. `compare-against-iwc-exemplar` — structural diff of the design briefs against nearest IWC exemplar(s); guidance feeds template authoring.
6. `nextflow-summary-to-galaxy-template`
7. `[loop]` `advance-galaxy-draft-step` — one full iteration (pick → discover-or-author → summarize → implement → `gxwf draft-validate --concrete`). Loop terminates on `draft: false`.
8. `nextflow-test-to-galaxy-test-plan` — translate NF test data and expectations into a Galaxy workflow test plan.
9. `implement-galaxy-workflow-test` — assemble test fixtures and assertions from the translated test plan.
10. `validate-galaxy-workflow` — terminal pass on the assembled workflow.
11. `run-workflow-test` — execute via Planemo.
12. `debug-galaxy-workflow-output`

### CWL → GALAXY

CWL is already structured; the upstream extraction work is much lighter.

1. `summarize-cwl` — read CWL Workflow + referenced `CommandLineTool`s, identify inputs/outputs, scatter, conditional logic.
2. `cwl-summary-to-galaxy-interface` — choose Galaxy workflow interface from CWL inputs/outputs.
3. `cwl-summary-to-galaxy-data-flow` — re-shape into Galaxy-shaped data-flow idioms from a CWL summary that's already nearly a DAG.
4. `compare-against-iwc-exemplar` — structural diff of the design briefs against nearest IWC exemplar(s); guidance feeds template authoring.
5. `cwl-summary-to-galaxy-template`
6. `[loop]` `advance-galaxy-draft-step` — one full iteration (pick → discover-or-author → summarize → implement → `gxwf draft-validate --concrete`). Loop terminates on `draft: false`.
7. `cwl-test-to-galaxy-test-plan` — translate CWL test fixtures into a Galaxy workflow test plan.
8. `implement-galaxy-workflow-test` — assemble test fixtures and assertions from the translated test plan.
9. `validate-galaxy-workflow` — terminal pass on the assembled workflow.
10. `run-workflow-test` — execute via Planemo.
11. `debug-galaxy-workflow-output`

### INTERVIEW → GALAXY

The interview path is a Galaxy-targeting pipeline, named to match the other `→ GALAXY` pipelines. Unlike them it starts from workflow intent gathered in an interview rather than an existing technical artifact, normalized into the shared `freeform-summary` handoff.

1. `interview-to-freeform-summary` — normalize a user interview transcript or interactive session into the shared `freeform-summary` handoff.
2. `freeform-summary-to-galaxy-interface`
3. `freeform-summary-to-galaxy-data-flow`
4. `compare-against-iwc-exemplar`
5. `freeform-summary-to-galaxy-template`
6. `[loop]` `advance-galaxy-draft-step` — one full iteration (pick → discover-or-author → summarize → implement → `gxwf draft-validate --concrete`). Loop terminates on `draft: false`.
7. `[branch]` test-data resolution chain: try `find-test-data` → on failure, harness gates to user-supplied data.
8. `implement-galaxy-workflow-test`
9. `validate-galaxy-workflow`
10. `run-workflow-test`
11. `debug-galaxy-workflow-output`

## Cross-pipeline observations

- **Source-specific (one per source)**: `summarize-paper`, `interview-to-freeform-summary`, `summarize-nextflow`, `summarize-cwl`. Paper and interview share the `freeform-summary` handoff; Nextflow and CWL keep structured source-specific schemas.
- **Source × target interface/data-flow**: `nextflow-summary-to-galaxy-interface`, `nextflow-summary-to-galaxy-data-flow`, `cwl-summary-to-galaxy-interface`, `cwl-summary-to-galaxy-data-flow`, `freeform-summary-to-galaxy-interface`, `freeform-summary-to-galaxy-data-flow`, `nextflow-summary-to-cwl-interface`, `nextflow-summary-to-cwl-data-flow`. The free-form Galaxy path is split to match the Nextflow/CWL pairs; the CWL target keeps a combined `freeform-summary-to-cwl-design` Mold until free-form examples justify a split.
- **Source × target template generation** (Galaxy): `nextflow-summary-to-galaxy-template`, `cwl-summary-to-galaxy-template`, `freeform-summary-to-galaxy-template`. Each consumes its source-specific or freeform design briefs.
- **Target-specific (one per target)**:
  - Templates: `summary-to-cwl-template`.
  - Per-step orchestrator (Galaxy): `advance-galaxy-draft-step` — single entry in Galaxy pipelines' per-step loop; internally sequences the leaves below.
  - Per-step leaves (Galaxy, no longer pipeline phases but still independently castable): `discover-shed-tool`, `summarize-galaxy-tool`, `author-galaxy-tool-wrapper`, `implement-galaxy-tool-step`.
  - Per-step (CWL): `summarize-cwl-tool`, `implement-cwl-tool-step`.
  - Validate: `validate-galaxy-workflow`, `validate-cwl`. (Per-step Galaxy validation moved into `advance-galaxy-draft-step` via `gxwf draft-validate --concrete`.)
  - Debug: `debug-galaxy-workflow-output`, `debug-cwl-workflow-output`.
- **Cross-target (Planemo-backed)**: `run-workflow-test`.
- **Source × target (test-plan translation)**: `nextflow-test-to-galaxy-test-plan`, `cwl-test-to-galaxy-test-plan`, `nextflow-test-to-cwl-test-plan`. These produce reviewable test plans, not final test artifacts.
- **Test data extraction (source-specific, target-agnostic)**: `paper-to-test-data` derives fixtures from a paper-origin `freeform-summary`; interview starts skip directly to `find-test-data` / user-supplied data until a real interview-specific fixture derivation Mold exists.

## Pattern pages, not Molds

Per the architecture, the `design-*` knowledge skills (collection manipulation, tabular manipulation, conditional handling, …) are **Foundry pattern pages**, not Molds. They are wiki-linked from action Molds (especially `implement-galaxy-tool-step` and the source-specific Galaxy template Molds) and pulled into generated skills via casting's link resolution.

Custom-Galaxy-tool authoring is split: a **pattern page** (reference and guidance) plus a companion **action Mold** (`author-galaxy-tool-wrapper`) that performs the authoring. The Mold links to the pattern page; the pattern page is consumed by the generated skill via link resolution.

## Tracked Follow-Up

- Composed paths (`PAPER -> CWL -> GALAXY`, `NEXTFLOW -> CWL -> GALAXY`) reuse the existing Mold inventory. Track whether they become distinct pipeline notes or remain runtime compositions in [issue #200](https://github.com/galaxyproject/foundry/issues/200).
- Whether the CWL per-step loop should collapse into a parallel `advance-cwl-draft-step` orchestrator (mirroring Galaxy's `advance-galaxy-draft-step`) is open — wait for evidence from Galaxy orchestrator walkthroughs before extending the pattern.
