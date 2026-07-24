# Glossary

Pinned definitions for the Galaxy Workflow Foundry. Used by the PRD, design docs, and the eventual MOLD_SPEC. If two docs disagree on a term, this file wins; resolve drift by updating here first.

Alphabetical.

---

**Branch** *(`[branch]` annotation, phase kind)* — a Pipeline phase that encodes harness-level routing/fallback rather than wrapping a Mold. Carries a named **routing pattern** (`discover-or-author`, `test-data-resolution`, …) and either `branches:` (binary with fallthrough) or `chain:` (N-step sequential fallback) of Mold wiki-links plus optional terminal sentinels (e.g. `user-supplied`). Inner wiki-links resolve to Molds and are validator-checked. Renders on a subway map as a decision diamond. Replaces the prior `[harness]` annotation umbrella.

**Cast** *(verb)* — produce a self-contained artifact from a Mold via the casting process. *(noun)* — a single casting result for one Mold and target. Example: "the cast of `implement-galaxy-tool-step` for the Claude target."

**Casting** — the compilation process that produces a cast artifact from a Mold: **deterministic tooling first, LLM condensation second, in that order of trust**. Operates as **per-kind dispatch** over the Mold's typed references (see *Reference*): schemas get copied verbatim, manpages get cast to JSON sidecars, examples get copied, prompts get inlined, patterns get LLM-condensed, evals get dropped. The integration boundary — artifacts come out condensed, isolated, and frozen. Expected to evolve as models improve.

**Casting skill** — the producer skill or tool that reads a Mold and emits a cast artifact. Distinct from a **generated skill**, which is one possible kind of cast artifact.

**CLI reference content** — per-command CLI documentation under `content/cli/<tool>/<command>.md`. Action Molds (`discover-shed-tool`, `advance-galaxy-draft-step`, `validate-galaxy-workflow`, `run-workflow-test`) reference individual manual pages directly; whole-CLI reference surfaces are not Molds unless a real action emerges.

**CLI manual page** — a Foundry content note describing a single CLI command or subcommand (install/source, synopsis, args, flags, examples, exit codes, output shape, error patterns, gotchas). Lives at `content/cli/<tool>/<cmd>.md`. Hand-authored or seeded from `--help` then humanized. Wiki-linked from action Molds. Cast to a structured sidecar by the casting pipeline; not inlined as prose.

**Composed path** — a harness pipeline that uses CWL as a structured intermediate target before reaching Galaxy. Examples: `PAPER → CWL → GALAXY`, `NEXTFLOW → CWL → GALAXY`. Contrasts with **direct path**. Both are first-class options.

**Corpus-first** — the principle that everything in the Foundry (patterns, Molds, design guidance) is grounded in observed structure of real IWC workflows, not invented top-down. Anything in the Foundry should be traceable back to one or more IWC exemplars.

**Direct path** — a harness pipeline that targets Galaxy without going through a CWL intermediate. Examples: `NEXTFLOW → GALAXY`, `PAPER → GALAXY`. Contrasts with **composed path**.

**Discover-or-author branch** — a `[branch]` routing pattern (named `discover-or-author`) used in Galaxy-targeting per-step loops: try `discover-shed-tool` first; on fallthrough, invoke `author-galaxy-tool-wrapper`. The branch itself is harness logic; the two underlying capabilities are clean Molds. (`discover-shed-tool` may have siblings later — `discover-tool-via-galaxy-api`, `discover-tool-on-github` — each named for the mechanism it uses, not the goal.)

**Evaluation plan** — Mold- or Pipeline-owned content (`eval.md`): the **abstract oracle** for a cast artifact (Mold) or end-to-end journey (Pipeline). Fixture-independent property checks and guardrails — *how* you judge any output, never a specific input/expected pair. Like a checker that asserts "a sort returns the same elements in nondecreasing order," not the case "`sort([3,1,2]) == [1,2,3]`"; concrete cases live in the **Scenario note**. Strictly property-shaped: every check states a property that could fail. Lives alongside the Mold in the Foundry. **Not** packaged into cast artifacts — evals are Foundry-maintainer infrastructure, not consumer-facing. Distinct from **Scenario note** (concrete cases), **Usage note** (illustration), and **Refinement note** (design questions). See `docs/EVAL_PHILOSOPHY.md` for the reasoning.

**Foundry** *(short for Galaxy Workflow Foundry)* — the standalone knowledge base where Pipelines, Molds, pattern pages, CLI manual pages, IO schemas, and IWC-citing content live. Renders as a navigable site; serves as the source of truth that casting reads. The substrate term for this source-of-truth artifact is **Knowledge Base (KB)**.

**Freeform summary** — Markdown source-summary handoff for narrative or interview-derived starts. Produced by `summarize-paper` and `interview-to-freeform-summary`; consumed by `freeform-summary-to-galaxy-interface`, `freeform-summary-to-galaxy-data-flow`, `freeform-summary-to-cwl-design`, and `freeform-summary-to-galaxy-template`. Deliberately not a rigid workflow schema: it records source evidence, uncertainty, open questions, methods, tools, sample data, parameters, and expected outputs.

**Gate** *(`[gate]` annotation, phase kind — future)* — placeholder for a phase-level annotation marking an inline approval / scope-confirmation checkpoint. Coined when a real pipeline first needs an inline pause for user input; not used by any current pipeline. The phase-kind set is open and not pre-enumerated — `[branch]` and `[gate]` are unrelated behaviors and don't share an umbrella tag.

**Galaxy Workflow Foundry** — the project's full name. See **Foundry**. Subtitle of choice for documents and presentations.

**Generated skill** — a skill-shaped cast artifact, such as a Claude skill produced from a Mold. Generated skills are consumed by harnesses; they are not the same thing as the casting skill that produced them.

**gxformat2** — Galaxy's Format-2 workflow format. The target format for Galaxy-targeting authoring Molds.

**gxwf** — the design-time CLI tool. Workflow validation, tool discovery / search / revisions, schema, conversion, lint. Available in TypeScript and Python; both share an interface. Inside the Foundry, gxwf's CLI surface is captured as **CLI manual pages** (`content/cli/gxwf/*`) referenced by action Molds; the existing `~/.claude/skills/gxwf-cli` (a help-text dump) is prior art being replaced. Contrasts with **Planemo**.

**Harness** — hand-authored orchestration glue that sequences Molds, manages user-approval gates, maintains run state, handles routing decisions (e.g., the discover-or-author branch). Not cast from a Mold; not in the Foundry's casting pipeline. May be heavyweight (Archon-style) or a lightweight orchestration skill.

**Harness-level concern** — a recurring pipeline activity that belongs to the harness, not to any individual Mold. Examples: approval gates, scope confirmation, plan presentation, tool-discovery routing, test-data fallback chains, state and resumption. These are **not Molds**. Some of them surface inline in pipelines as non-Mold phase kinds (`[branch]` for routing, the future `[gate]` for checkpoints); others (state, resumption, autonomy posture) are off-pipeline harness-internal concerns. See `docs/HARNESS_PIPELINES.md`.

**IWC** — Intergalactic Workflow Commission. Curates the canonical set of high-quality Galaxy workflows. The Foundry's foundational corpus.

**IWC exemplar** — one workflow from the IWC corpus. The cleaned `gxformat2` versions live in `/Users/jxc755/projects/repositories/workflow-fixtures/iwc-format2/`. Pattern pages cite exemplars; Molds reference them as ground truth; casting may inline references; evaluations exercise generated skills against them.

**Knowledge Base (KB)** — the inspectable, human-readable source of truth at the center of the instance: the standalone site where Pipelines, Molds, pattern pages, CLI manual pages, and IO schemas live and from which casting reads. Authored to be *read and learned by a human*, not merely stored for an agent to retrieve. The KB is the source; a **skill artifact** is the package. Colloquially *the Foundry* (see **Foundry**).

**Loop** *(`[loop]` annotation)* — a phase-level flag (`loop: true` in frontmatter) marking a phase that runs once per step in the workflow being constructed. Applied to orchestrator Molds that advance the workflow by one step (`advance-galaxy-draft-step`). Renders on a subway map as a decorated station.

**Mold** — an abstract, structured template inside the Foundry that describes a workflow-construction action. Authored as a **typed reference manifest with a presentation layer**: a `.md` file whose frontmatter declares typed references to heterogeneous artifacts (pattern pages, CLI manual pages, IO schemas, prompt fragments, examples), and whose body is a procedural skeleton that ties them together. Rendered as a navigable Foundry page; cast into one or more cast artifacts via casting's per-kind dispatch over those references.

**Mold (atomic, phase-sized)** — the granularity rule: each Mold is roughly the size of one Mold-shaped phase in a Pipeline. Not necessarily small; `summarize-nextflow` and `implement-galaxy-tool-step` are both atomic at this tier even though they differ in content size.

**Not a Mold** — explicit boundary marker for things that are *not* cast from the Foundry. Includes harnesses, harness-level concerns (state, resumption, autonomy posture), Pipelines themselves, non-Mold phase kinds (`[branch]`, future `[gate]` — these reference Molds via embedded wiki-links but are not Molds), and pure reference content (pattern pages, CLI manual pages, IO schemas — these are *referenced by* Molds, not Molds themselves). Wrapping a CLI is *not* a disqualifier: see `discover-shed-tool`, `run-workflow-test`, `validate-galaxy-workflow`.

**Open-requirements ledger** — a carried artifact (`open-requirements-ledger`) threaded through the source→Galaxy pipeline recording obligations the pipeline has taken on but not met: a declared output with no producer, an unpinned parameter, a tool with no corpus exemplar. Molds **append**, **mark resolved**, or **surrender** entries; framed for autonomous runs (consumers are Molds and the loop's convergence gate, not a human). In the per-step loop it is the countable substrate for the topology-repair convergence invariant. See `content/research/open-requirements-ledger.md`. Reframes issue #281's "open-questions ledger" away from human-answered questions.

**Pattern page** — a Foundry reference page describing a Galaxy workflow construction pattern (collection manipulation, tabular manipulation, conditional handling, custom-tool authoring, …). Wiki-linked from action Molds; pulled into cast artifacts via casting's pattern-kind dispatch (LLM-condensed, mixed verbatim and summarization). Different from a Mold: a pattern page is reference, a Mold is action. Some patterns have a companion action Mold (e.g., custom-tool-authoring pattern + `author-galaxy-tool-wrapper` Mold).

**Phase** — one atomic unit of a Pipeline's ordered `phases` array. Either Mold-shaped (`mold: [[...]]`, optionally `loop: true`) or a non-Mold annotation kind: `[branch]` today, future `[gate]` when needed. Open set — new phase kinds are coined when first surfaced inline rather than pre-enumerated. Validator resolves embedded wiki-links per kind (Mold-shaped phases must resolve to `type: mold`; `[branch]` inner items resolve to Molds or are terminal sentinels like `user-supplied`).

**Pipeline** — first-class Foundry note type (`type: pipeline`, `content/pipelines/<slug>/index.md`). A directory note like Mold: `index.md` is the only frontmatter-bearing file, with optional `eval.md` (pipeline-level oracle) and `scenarios.md` (end-to-end journeys) siblings. An ordered sequence of phases that compose into a harness journey (`paper-to-galaxy`, `nextflow-to-galaxy`, `cwl-to-galaxy`, `paper-to-cwl`, `nextflow-to-cwl`). Dual purpose: (a) **build artifact** — names the Molds a harness will orchestrate; (b) **navigation primitive** — the journey-surface IA over the KB, rendered as a subway map. `phases` frontmatter is the machine-readable spine; the body is the human-readable view. Pipelines are *referenced content*, not cast. Machine-checked: every Mold-shaped phase resolves to a real Mold note. Molds need not belong to a pipeline — standalone and indirectly-invoked Molds are first-class, not coverage gaps.

**Planemo** — the runtime CLI tool. Executes Galaxy *and* CWL workflows. Used by `run-workflow-test`, `debug-galaxy-workflow-output`, `debug-cwl-workflow-output`. Inside the Foundry, Planemo's CLI surface is captured as **CLI manual pages** (`content/cli/planemo/*`) referenced by action Molds. Contrasts with **gxwf**.

**Provenance** — a record (`_provenance.json`) emitted beside every cast artifact: which Mold revision, which model version, which references resolved, which checks ran. The durable, non-commodity asset — the answer to "which specific claim is real and where it came from." Present in every cast; never lightened.

**Refinement journal** — append-only sequence of entries under `content/molds/<slug>/refinements/<date>-<slug>.md`, one per `/refine-mold` run. Each entry carries small structured frontmatter (`mold`, `date`, `intent`, `decision`) and free-form body. Entries are superseded rather than edited; the `decision` field (`keep | schema-change | reference-change | eval-add | open-question | other`) supports cross-Mold rollups.

**Refinement note** — Mold-owned content (`refinement.md`) that parks open design questions about the Mold itself: schema fields under suspicion, references whose value isn't clear, scope edges. Free-form; not assertion-shaped. Read by the `/refine-mold` skill as part of context-loading. Never packaged into cast artifacts. Distinct from **Evaluation plan** (assertions) and **Usage note** (illustration).

**Reference** *(a.k.a. reference kind)* — a typed dependency a Mold declares; the *kind* discriminator controls casting behavior (per-kind dispatch). Provisional kinds: `pattern` (markdown reference, LLM-condensed), `cli-command` (manual page, cast to JSON sidecar), `schema` (JSON Schema file, copied verbatim), `example` (fixture, copied verbatim), `prompt` (markdown fragment, inlined verbatim), `eval` (Foundry-only, never in cast). Per-kind dispatch is what makes casting more than "resolve all wiki links the same way."

**Routing pattern** — the named-pattern value inside a `[branch]` phase that determines its inner shape and rendering. Initial vocabulary: `discover-or-author` (binary with `branches:` and a `fallthrough:` step) and `test-data-resolution` (sequential `chain:` of Mold wiki-links ending in a terminal sentinel like `user-supplied`). Open question whether the set graduates into a closed schema enum or stays open with validator coverage of embedded wiki-links only.

**Scenario note** — Mold- or Pipeline-owned content (`scenarios.md`): the **concrete test cases** the eval oracle is applied against (a Mold input, or a whole-journey input for a Pipeline). Each case binds a fixture/input and states its expected values or assertions as free text (e.g. "CalliNGS-NF → 11 processes from root `modules.nf`", "`sort([3,1,2]) == [1,2,3]`"). All fixture-specific concreteness lives here, keeping the **Evaluation plan** (`eval.md`) a pure abstract oracle. A **run** pairs a scenario's output with the eval oracle's property checks (driven by `/test-drive`). Foundry-maintainer infrastructure; never packaged into cast artifacts. Distinct from **Evaluation plan** (abstract checker), **Usage note** (illustration), and **Refinement note** (design questions).

**Schema (Mold IO)** — a JSON Schema file declaring the input or output shape of a Mold (e.g., the per-source summary schemas, the Galaxy tool summary schema). Lives in `schemas/` (a non-content directory; not a vault note). Referenced by Molds via typed-path frontmatter fields; copied verbatim into cast bundles by casting. Distinct from the *frontmatter* contract for content notes, which is the shared zod schema in `@galaxy-foundry/note-schema`.

**Skill artifact** *(a.k.a. cast artifact)* — the compiled output produced by casting a Mold: self-contained, condensed, no links back to the Foundry, no runtime dependency on it, frozen against the Foundry version it was cast from. `SKILL.md` (or any skill file) is therefore a compile **target**, never the authoring surface. May target Claude's skill format, a web-app-baked skill, a generic format, etc.

**Subway map** — informal name for the visual rendering of a Pipeline as a vertical line of stops: Mold-shaped phases are linked stations, `[loop]` decorates per-step stations, `[branch]` stops are decision diamonds with their inner branches/chains expanded, future `[gate]` stops would render as checkpoint markers. Off-ramps per stop point to the patterns / CLI manpages / schemas the Mold references — the reference-surface drill-downs from a journey-surface point. Rendered by `[...slug].astro` via `PipelineBody.astro` + `PhaseGraph.astro`; the per-pipeline harness off-ramp lives at `pipelines/[slug]/harness.astro`.

**Source-specific** *(Mold axis)* — a Mold whose content depends on the input format. Examples: `summarize-paper`, `interview-to-freeform-summary`, `summarize-nextflow`, `summarize-cwl`. Structured sources emit their own schema by design; paper and interview starts share the `freeform-summary` handoff.

**Target** *(a.k.a. cast target)* — an output format that casting can produce. Examples: Claude skill directory, skill baked into a web application, generic (non-Claude) skill format. A single Mold may cast to several targets; the KB stays the source of truth.

**Target-specific** *(Mold axis)* — a Mold whose content depends on the output target. Examples: `summary-to-cwl-template`, `summarize-galaxy-tool`, `validate-cwl`.

**Tool-specific** *(Mold axis)* — a provisional Mold axis for actions whose behavior depends on one external tool. Whole-CLI reference surfaces are reference content, not Molds.

**Topology repair** — bounded re-wiring of a settled draft by `repair-galaxy-draft-topology`, the escalation target the per-step loop reaches when implementation proves a declared step output can't be computed from its wired inputs. Distinct from **settling** (the template Mold decides topology from the design briefs): repair is narrow (one named region), reactive (only a detected computability gap triggers it), bounded (decreasing open-blocker count under a hard escalation cap), and never decided *by* the loop — the loop escalates the decision back to the template tier. New steps land at draft tier and are realized by the existing discover-or-author → implement machinery. See `repair-galaxy-draft-topology` and the [[Open-requirements ledger]].

**Generic** *(Mold axis)* — a Mold whose content depends on neither source nor target nor a single tool. Rare in the current inventory.

**Usage note** — Mold-owned content (`usage.md`) illustrating representative invocations of a Mold. Author-facing narrative; no assertions, no `expectation:` lines. Lives alongside `eval.md` and `refinement.md` to keep illustrative content out of evaluation. Never packaged into cast artifacts in v1; may later be cast as `examples/`-shaped content.

**Validation posture (schema, not caveats)** — the Foundry's stance on failure modes: gxwf static schema validation catches the failure modes prior-art skills had to enumerate as prose caveats (UUID validity, tool-ID/owner/+galaxyN, parameter-name mismatches, etc.). The Foundry does **not** maintain a parallel caveat catalog; the validation loop (`author → validate → fix`) is the enforcement mechanism, run inline per step.
