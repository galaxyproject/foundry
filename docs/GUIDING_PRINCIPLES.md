# Guiding Principles

LLM-proposed Galaxy workflows fail in specific, detectable ways — hallucinated tool IDs, dropped conditional branches, fabricated parameters, `gxformat2` the parser rejects — and monolithic conversion skills decay because they answer those failures with prose caveats that neither compose nor scale. These principles are the design pressure behind the alternative.

The Foundry is not just a glossary, a documentation site, or a pile of skills. It is an attempt to make workflow-construction knowledge durable, inspectable, and executable while the surrounding tooling keeps changing.

These principles explain the design pressure behind the architecture: why the Foundry cites IWC instead of mirroring it, why Molds carry typed references instead of free-form prose, why casting creates frozen artifacts, and why CLI validation stays in the loop.

## Source Authority Beats Local Copies

The Galaxy ecosystem stays healthy when information remains close to the project that owns it. IWC workflows belong in IWC. Tool metadata belongs in Tool Shed and Galaxy APIs. CLI behavior belongs in the CLI implementation. Schemas belong in packages that can validate them.

The Foundry should not become a stale mirror of upstream systems. It should point to upstream, quote only what it must, and sync through the strongest available mechanism when freshness matters.

This principle leads to several concrete choices:

- Pattern pages cite IWC workflows by URL rather than importing every workflow as a Foundry note.
- Local workflow fixtures are authoring aids, not runtime dependencies or content-source authority.
- CLI manual pages describe the interface Molds need, but deterministic CLI invocations remain the source of behavior.
- Vendored schemas are copied into cast artifacts when the artifact needs them, but their source package remains the owning upstream.

The Foundry adds value by connecting, explaining, and operationalizing upstream knowledge. It should not compete with upstream as the canonical home of that knowledge.

## Reproducibility At Every Layer

Scientific workflow conversion is itself a scientific act. A generated Galaxy workflow is only useful if a maintainer can understand how it was derived, which assumptions it inherited, and which validation steps were applied.

Reproducibility here is broader than rerunning a final workflow. It includes the provenance of every derived artifact:

- Which Mold was cast.
- Which model and prompt version produced the cast.
- Which pattern pages, CLI manual pages, schemas, prompts, and examples were resolved.
- Which package versions and validation tools shaped the output.
- Which upstream workflow examples or citations grounded a pattern.

This is why casts record provenance, schemas are treated as first-class artifacts, generated indexes have drift checks, and validation is part of the authoring loop rather than a final cleanup step.

The goal is not perfect immutability. The goal is accountable change: when a workflow, package, Mold, or cast changes, the reason and dependency path should be recoverable.

## Deterministic Tools Do Deterministic Work

LLMs are excellent at interpretation, synthesis, repair, and translation across weakly structured contexts. They are poor replacements for parsers, schema validators, package managers, and CLIs.

The Foundry should spend model context on the work only models can do. If a CLI can validate a workflow, call the CLI. If a schema can reject malformed structure, use the schema. If a script can generate an index, do not ask a model to maintain it by hand.

This keeps agents more reliable and cheaper to run:

- Tool calls are saved for high-value judgment instead of rote inspection.
- Context is not filled with data a program can query directly.
- Hallucinated caveats are replaced by executable checks.
- Repeated work becomes testable infrastructure instead of prompt folklore.

The Foundry therefore treats LLM output as one stage in a larger system, not as the system itself. Molds guide model behavior, but validation, schema checking, CLI execution, and generated artifacts provide the rails.

## Progressive Disclosure Over Context Flooding

Agents should see the right knowledge at the right time. The Foundry should not flatten every pattern, CLI manual page, schema, example, research note, and design rationale into a single prompt or skill body just because the information exists.

Progressive disclosure is both an authoring principle and a runtime contract:

- Pipelines disclose the journey: which phase comes next and where branches or loops exist.
- Molds disclose the action: what the current step does and which references it may need.
- Typed references disclose the dependency surface: pattern, CLI command, schema, prompt, example, research note, or eval.
- Reference metadata declares whether material is used at cast time, runtime, or both.
- Load policy distinguishes material needed up front from material that should stay on demand.
- Casting mode decides whether a reference is copied, condensed, inlined, or turned into a sidecar.

This keeps context focused without hiding the source record. A generated skill can start with a compact procedure and a required schema, then consult a deeper research note only when the work crosses into that topic. For example, `summarize-nextflow` needs its output schema up front, but details about Nextflow testing or container-resolution edge cases can load only when those cases appear.

The goal is not minimalism for its own sake. The goal is navigable depth: humans can browse from journey to Mold to reference, and agents can move from action to supporting evidence without dragging the whole library into every step.

## Portable Artifacts Over Platform Fashion

Agent skills are useful. Orchestration systems are useful. The agentic-coding landscape will keep changing.

The Foundry should not bind its core knowledge to one agent runtime, editor, model vendor, or orchestration framework. Its source artifacts should be abstract enough to cast into several targets and explicit enough that each target can be audited.

This is why Molds are not written as runtime-specific skills. A Mold is a typed reference manifest plus a procedural skeleton. Casting turns that source artifact into a portable Agent Skill, while thin manifests and usage views adapt packaging and invocation for Claude Code and Codex. The Foundry remains the source of truth.

The boundary matters:

- Molds are durable source artifacts.
- Cast skills are generated portable artifacts.
- Pipelines describe journeys; harnesses execute them.
- Reference content stays reusable across targets.

This separation lets the Foundry adapt as orchestration changes. Prefer a shared skill-directory superset plus small packaging overlays; add a separate rendered target only when a concrete loader or semantic incompatibility cannot be represented that way.

## Actionable Knowledge, Not Passive Notes

Knowledge bases are valuable because they preserve context. Skills are valuable because they drive action. Neither is enough alone.

A passive knowledge base can explain workflow-construction ideas but cannot reliably make an agent use them. A standalone skill can execute a task but tends to compress away the rich evidence, design rationale, and cross-links that make the task maintainable.

The Foundry tries to keep both properties:

- The site preserves the rich knowledge graph: patterns, CLI references, schemas, pipelines, citations, and rationale.
- Molds identify which knowledge is needed for a concrete action.
- Casting condenses that knowledge into executable artifacts for agents.
- Pipelines show how actions compose into a larger conversion journey.

This is the central wager of the project: a knowledge base becomes more useful when its structure makes it executable, and skills become more trustworthy when their source remains inspectable.

## Corpus-First, Not Invention-First

The Foundry should learn from working Galaxy workflows before it invents abstractions. IWC is the grounding corpus because it is curated, real, and already expresses many of the workflow patterns agents need to reproduce.

Corpus-first does not mean copying the corpus wholesale. It means abstractions should be justified by observed examples:

- Pattern pages should cite concrete workflows.
- Mold behavior should align with recurring construction tasks.
- Evaluation plans should exercise casts against realistic workflow shapes.
- New taxonomy should appear after content demands it, not before.

The same posture applies to the research notes Molds reference at runtime. A runtime-reference note should start as a stub — frontmatter, title, primary-source link — and grow paragraph-by-paragraph from gaps observed when the Mold is cast against real targets. Each paragraph earns its place by naming a motivating case: a workflow, a cast run, a log entry where the runtime agent guessed, fell back, or contradicted the schema. Pre-written comprehensive notes are an anti-pattern; they read as plausible, sound authoritative, and quietly propagate the author's prior beliefs into every downstream cast. The runtime agent has no way to tell invented prose from earned prose, so the safer default is to write nothing until contact with the corpus demands it.

This keeps the Foundry from becoming a speculative ontology. The vocabulary should follow evidence, and so should the prose underneath it.

## How The Principles Connect

These principles reinforce each other.

Keeping information at its source makes upstream sync possible, but it only works if derived artifacts record provenance. Provenance is only meaningful if deterministic tooling performs the checks it can perform. Deterministic tooling is easier to reuse when artifacts are portable rather than bound to one orchestrator. Portable artifacts need an inspectable source of truth, which pushes the project toward a knowledge base. The knowledge base becomes actionable through Molds, casts, and Pipelines. Corpus-first grounding keeps that whole loop tied to real Galaxy practice.

Progressive disclosure is the connective tissue inside that loop. It keeps the source record rich without forcing every runtime artifact to carry every page, and it lets agents open deeper context only when a phase, Mold, or reference kind justifies it.

The resulting shape is intentional:

- Upstream systems own facts.
- The Foundry owns synthesis, structure, and casting source.
- CLIs and schemas own deterministic validation.
- Cast artifacts own target-specific execution.
- Harnesses own orchestration.

Each layer has a job. The Foundry works when those jobs stay separate and the connections between them are explicit.

## See Also

[COMPARISONS.md](COMPARISONS.md) — how this shape contrasts with wikis and skill bundles, and where it sits in the wider knowledge-base-to-skill landscape (a dated snapshot).
