# Molds

Mold inventory for the Galaxy Workflow Foundry, derived as the **union of phases** across the harness pipelines in `HARNESS_PIPELINES.md`. CLI command knowledge is reference content used by action Molds, not a separate whole-CLI Mold tier. Each Mold is atomic at the harness-step tier (not necessarily small in content).

This is the inventory, not the Mold source-layout contract. `MOLD_SPEC.md` owns Mold authoring rules, the procedural Mold body, and the `references:` manifest; `reference_contract.yml` owns the typed-reference vocabulary and labels. Mold IO contracts live on `input_artifacts[]` / `output_artifacts[]`; producer-owned `output_artifacts[].schema` wiki-links attach schemas to emitted artifact IDs. Cast skills are deterministic renderings of Mold body + artifact contracts + typed references, so any improvement to a generated skill belongs back in the Mold or its referenced notes.

## Bucketing axes

Each Mold falls along these axes:

- **Source-specific** — input format determines content (`PAPER`, `NEXTFLOW`, `CWL`).
- **Target-specific** — output target determines content (`GALAXY`, `CWL`).
- **Tool-specific** — reserved for a future action that genuinely depends on one external tool's behavior. Whole-CLI reference surfaces are not Molds.
- **Generic** — none of the above.

This isn't a frontmatter schema; it's a mental model for grouping. `tool-specific` is reserved for actions that depend on one external tool's behavior and should not be used for whole-CLI catalogs.

## Catalog

### Source summarization (source-specific, target-agnostic)

Each source emits its **own schema** by design — paper, Nextflow, and CWL are different enough that forcing a shared summary shape would either lose detail or bloat all three. Downstream source-target Molds consume each source summary without forcing a shared workflow schema.

- `summarize-paper` — extract methods, tools/algorithms, sample data, metrics, references from a paper.
- `summarize-nextflow` — enumerate processes, channels, conditionals, containers (biocontainers / Docker / Singularity refs and their bioconda equivalents), test fixtures from an NF source tree. Container-and-env info is structured output, consumed downstream by `author-galaxy-tool-wrapper` when discovery fails.
- `summarize-cwl` — read CWL Workflow + referenced `CommandLineTool`s; surface inputs/outputs, scatter, conditional logic, and `DockerRequirement` / `SoftwareRequirement` blocks. Container-and-env info structured for downstream consumption analogous to `summarize-nextflow`.

### Interface and data-flow design (source × target)

Split by source and target where the handoff shape is specific enough to be useful. These Molds emit reviewable Markdown design briefs, not rich workflow schemas:

- `nextflow-summary-to-galaxy-interface` — Galaxy workflow inputs, outputs, labels, collection shapes, checkpoint outputs, confidence, and provenance from a Nextflow summary.
- `nextflow-summary-to-galaxy-data-flow` — Galaxy-facing abstract topology, collection operations, unresolved tool needs, and shape transformations from a Nextflow summary plus interface brief.
- `cwl-summary-to-galaxy-interface` — Galaxy workflow interface design from a CWL summary.
- `cwl-summary-to-galaxy-data-flow` — Galaxy-facing abstract topology from a CWL summary plus interface brief.
- `nextflow-summary-to-cwl-interface` — CWL Workflow interface design from a Nextflow summary.
- `nextflow-summary-to-cwl-data-flow` — CWL-facing abstract topology, scatter/gather choices, and unresolved CommandLineTool needs from a Nextflow summary plus interface brief.
- `paper-summary-to-galaxy-design` — combined Galaxy interface and data-flow design brief from a paper summary; split later if paper examples justify it.
- `paper-summary-to-cwl-design` — combined CWL interface and data-flow design brief from a paper summary; split later if paper examples justify it.

### Template generation (source × target for Galaxy, target-specific for CWL)

Galaxy template generation is split by source so each Mold understands its own upstream design-brief shape:

- `nextflow-summary-to-galaxy-template` — `gxformat2` skeleton from a Nextflow summary plus the Nextflow-to-Galaxy interface and data-flow briefs.
- `cwl-summary-to-galaxy-template` — `gxformat2` skeleton from a CWL summary plus the CWL-to-Galaxy interface and data-flow briefs.
- `paper-summary-to-galaxy-template` — `gxformat2` skeleton from a paper summary plus the paper-to-Galaxy design brief.
- `summary-to-cwl-template` — CWL Workflow skeleton with per-step TODOs. Reads the source artifact, source summary, and previous design handoffs.

### Per-step tool work (target-specific, runs in `[loop]`)

For Galaxy targets, the harness performs **discover-first, author-on-fallthrough**: try `discover-shed-tool` first, and only invoke `author-galaxy-tool-wrapper` when no acceptable existing wrapper is found. The branch is harness logic; the Molds cleanly split the two cases.

- `discover-shed-tool` — search the Galaxy Tool Shed for an existing wrapper matching an abstract step's needs; classify candidates by owner trust, version proximity, container availability, and `+galaxyN` revision posture; recommend a pick or fall through. References the relevant `gxwf` manual pages (`tool-search`, `tool-versions`, `tool-revisions`) and `galaxy-tool-cache`. Named for the *mechanism* (Tool Shed); leaves slots for siblings — `discover-tool-via-galaxy-api`, `discover-tool-on-github` — if/when other discovery sources are wrapped. Replaces the prior-art hand-authored `find-shed-tool` skill (see `old/PLAN_SEARCH_CLI.md` for the original CLI mapping; that work feeds this Mold's content).
- `summarize-galaxy-tool` — pull JSON schema, container, source, inputs/outputs for a candidate Galaxy tool (existing wrapper, found via `discover-shed-tool`).
- `summarize-cwl-tool` — derive a `CommandLineTool` description (container, baseCommand, inputs/outputs) for a CWL target.
- `author-galaxy-tool-wrapper` — author a new Galaxy tool wrapper (XML) when discovery yields nothing acceptable. Consumes container/environment info from the source summary (`summarize-nextflow` / `summarize-cwl` already gathered biocontainer / bioconda references) and translates them into Galaxy `<requirements>`. Wiki-links the custom-tool pattern page. **This is an action**, not a pattern — it replaces the previous `design-custom-galaxy-tool` framing as a knowledge skill.
- `implement-galaxy-tool-step` — convert an abstract step + a `summarize-galaxy-tool` output into a concrete `gxformat2` step. Consumes Galaxy pattern pages via wiki link.
- `implement-cwl-tool-step` — concrete `CommandLineTool` + Workflow step.

### Tests (mixed)

Two-step shape (translation/derivation, then assembly):

**Derivation** (gets the raw fixtures):
- `paper-to-test-data` — derive workflow test inputs from a paper (sample data, expected outputs, parameter values). Source-specific (paper), target-agnostic. Fails often because papers rarely ship usable fixtures; falls through to `find-test-data`.
- `find-test-data` — fallback when derivation from a source fails. Search IWC test fixtures, public databases, sibling workflows for usable test data matching a data-flow description (input shapes, expected output shapes, organism / data type). Source-agnostic, target-agnostic. The harness escalates to a user-supplied-data gate if `find-test-data` also fails.
- `nextflow-test-to-galaxy-test-plan` — translate NF test fixtures, profiles, params, expected outputs, and snapshot evidence into a Galaxy workflow test plan. Source × target.
- `cwl-test-to-galaxy-test-plan` — translate CWL test fixtures into a Galaxy workflow test plan. Source × target.
- `nextflow-test-to-cwl-test-plan` — translate NF test fixtures into a CWL workflow test plan. Source × target.

**Assembly** (turns fixtures into the final test artifact):
- `implement-galaxy-workflow-test` — assemble the Galaxy workflow test JSON (or `.gxwf-tests.yml`) from a translated/derived test plan, with assertions.
- `implement-cwl-workflow-test` — assemble CWL job file(s) and expected-output assertions from translated/derived fixtures.

The derivation/test-plan Molds and assembly Molds are complementary, not redundant: derivation produces fixtures or a reviewable test plan; assembly produces the test artifact. Both fire in NF→Galaxy, CWL→Galaxy, etc.

### Validation (target-specific)

Validate Molds describe the **step in the process** even where they wrap a static / structured CLI. The underlying validation is deterministic, but the generated skill is the Mold-shaped procedural description (when to run, how to interpret results, what to recommend on failure, when to loop back to authoring). Wraps gxwf / cwltool but is *not* a hand-authored CLI skill — it's a Mold that references the relevant CLI manual pages.

- `validate-galaxy-step` — run gxwf validation inside the per-step Galaxy loop, classify failures local to the just-implemented step, and route back to step implementation or wrapper authoring.
- `validate-galaxy-workflow` — run gxwf validation after workflow assembly, classify workflow-level failures, and route back to the responsible authoring phase when possible.
- `validate-cwl` — analogous: `cwltool --validate` / schema lint, interpret, recommend/apply fixes.

### Run & debug (Planemo-backed runtime)

**Planemo is the runtime tool** (it can run both Galaxy and CWL workflows); **gxwf is the design-time tool**. Run/debug Molds reference Planemo's CLI manual pages.

- `run-workflow-test` — execute a workflow's tests via Planemo; emit structured pass/fail and outputs. Target-agnostic interface; per-target adapters if needed. References `cli/planemo/test` (and run, etc.).
- `debug-galaxy-workflow-output` — given a failing Galaxy run's outputs/logs/import warnings, classify the failure and propose fixes. Uses validation output and on-demand operational references for failure interpretation; the Foundry does not maintain a parallel prose caveat catalog.
- `debug-cwl-workflow-output` — given a failing CWL run's outputs/logs, classify the failure and propose fixes.

Note: this run/debug tier is sized for "smart enough as a Claude skill, but Claude could often do it ad-hoc without one." Treat them as nominally Mold-shaped for inventory completeness, but accept that they may end up thinner than the authoring Molds.

### Generated skill bodies

Claude `SKILL.md` bodies are not hand-maintained. Casting renders them from the Mold `summary`, `input_artifacts[]`, `output_artifacts[]`, inherited producer/schema metadata, typed `references[]`, and the body of `index.md`. Hand-polished behavior discovered in a generated skill should be migrated into the Mold body or supporting reference notes before recasting.

### CLI reference content

CLI command docs live under `content/cli/<tool>/<command>.md`. Action Molds reference the exact commands they need via `references:`. Casting can still produce structured sidecars for those command references, but there is no whole-CLI Mold unless a real action emerges beyond reference lookup.

### Corpus-grounding (Galaxy-specific, generic in source)

- `compare-against-iwc-exemplar` — given the upstream Galaxy design briefs (interface + data-flow), find the nearest IWC exemplar(s) and surface a **structural diff** (this branch differs / IWC consistently uses pattern X here / unexpected step ordering / missing common pre-step) to guide template authoring. Retrieval is part of the comparison — there is no separate retrieval Mold. Galaxy-target only; this is the corpus-first principle delivered before per-step effort begins.

## Not Molds

Excluded from the inventory by design. Naming them keeps the boundary visible.

- **Pure reference content.** Pattern pages (`design-galaxy-tabular-manipulation`, `design-galaxy-collection-manipulation`, `design-galaxy-conditional-handling`, the custom-tool-authoring pattern, ...), CLI manual pages (`content/cli/<tool>/<cmd>.md`), IO schemas (`content/schemas/<name>.md` schema notes, with the JSON itself in `packages/<name>-schema/src/`), prompt fragments, examples, and operational research notes are **referenced by** Molds, not Molds themselves. Casting handles each kind according to the `MOLD_SPEC.md` and `reference_contract.yml` contract.
- **Harnesses.** `nf-to-galaxy`, the conjectural Archon harness, lightweight orchestration skills — all hand-authored, sequence Molds, never cast.
- **Approval gates / scope confirmation / plan presentation.** Harness-level concerns, not Molds. See `HARNESS_PIPELINES.md` for the rationale.
- **Hand-authored prior-art skills (being replaced).** The current `~/.claude/skills/gxwf-cli` (help-text dump) and the `find-shed-tool` skill design (`old/PLAN_SEARCH_CLI.md`) are *not* Foundry artifacts; they are prior art. Their content feeds CLI manual pages and action Molds; their form does not.

**Wrapping a CLI is *not* a Mold disqualifier.** `discover-shed-tool`, `validate-galaxy-step`, `validate-galaxy-workflow`, and `run-workflow-test` all wrap CLIs and are Molds. The criterion is whether there is procedural content worth casting (when to run, how to interpret, when to loop back), not whether the underlying mechanism is a CLI.

## Counts and reuse

- 33 current candidate Molds total in `content/molds/` (Galaxy validation split into step/workflow Molds; interface/data-flow design is source-target specific; `find-test-data` included; corpus Mold renamed/reframed as `compare-against-iwc-exemplar`; `discover-shed-tool` graduated from "Not Molds"; whole-CLI catalogs are reference content, not Molds).
- Source-summarization tier: 3 Molds, each used by exactly the pipelines starting from that source.
- Interface/data-flow tier: source-target Markdown design-brief Molds, currently split for Nextflow and CWL Galaxy paths and for Nextflow-to-CWL; paper paths stay combined until examples justify a split.
- Galaxy-target tier: source-specific Galaxy template Molds (`nextflow-summary-to-galaxy-template`, `cwl-summary-to-galaxy-template`, `paper-summary-to-galaxy-template`), `discover-shed-tool`, `summarize-galaxy-tool`, `author-galaxy-tool-wrapper`, `implement-galaxy-tool-step`, `implement-galaxy-workflow-test`, `validate-galaxy-step`, `validate-galaxy-workflow`, `run-workflow-test`, `debug-galaxy-workflow-output`, `compare-against-iwc-exemplar` — used by all 3 Galaxy-targeting pipelines.
- CWL-target tier: `summary-to-cwl-template`, `summarize-cwl-tool`, `implement-cwl-tool-step`, `implement-cwl-workflow-test`, `validate-cwl`, `run-workflow-test`, `debug-cwl-workflow-output` — used by 2 CWL-targeting pipelines.
- CLI command tier: `content/cli/<tool>/<command>.md` — referenced by action Molds through typed references and cast as sidecars when needed.

## What this list is for

This list exists to keep the Mold inventory and pipeline coverage understandable. The metadata schema is carried by `meta_schema.yml` plus the `reference_contract.yml` registry; `MOLD_SPEC.md` is the Mold authoring contract, and `COMPILATION_PIPELINE.md` is the design narrative for casting and reference dispatch. Suggested first walks, in priority order:

1. `summarize-paper` — most novel, most uncertain, exercises source-summarization shape and IO-schema reference.
2. `implement-galaxy-tool-step` — runs in inner loop, pulls heavily from pattern pages and corpus, exercises wiki-link resolution and condensation.
3. `validate-galaxy-step` — exercises CLI-manual-page reference, error-feedback loop; surfaces what a per-action Mold needs from a manpage cast.
4. `validate-galaxy-workflow` — exercises terminal Galaxy validation separate from the per-step loop.

After those four, the remaining work is not inventing the reference schema from scratch; it is tightening `MOLD_SPEC.md`, migrating legacy reference fields where useful, and verifying that the `references:` manifest gives generated skills enough progressive-disclosure and evidence metadata to behave well.
