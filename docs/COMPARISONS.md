# Comparisons

Where the Foundry sits relative to adjacent approaches, in two parts with
deliberately different decay rates — the same separate-decay-rates discipline
the Mold sibling files use, where `index.md` stays stable and the append-only
`refinements/` journal accretes.

- **Part A — Positioning.** Contrasts against the Foundry's *own* architecture.
  Stable: these do not move when an external project ships a new spec.
- **Part B — Landscape snapshot.** Where the field is on connecting knowledge
  bases to agent skills. Volatile and explicitly dated. This domain moves fast;
  Part B is a point-in-time reading, refreshed on demand as a dated sweep, not
  continuously edited. It ages on purpose — an undated "state of the art" claim
  rots silently; a dated one just gets old visibly, which is honest.

---

## Part A — Positioning

### Versus "just put it in a wiki"

A wiki preserves context and supports human browsing. It does not produce
executable artifacts, does not validate cross-references mechanically, does not
record provenance when content is consumed, and does not enforce
body-vs-meta separation. A wiki page that grows a runtime-instruction section
eventually contradicts another section that grew elsewhere, with no compiler to
surface the contradiction.

### Versus "just write agent skills"

A bundle of skills executes well and packages clean. It tends to compress away
the evidence and design rationale that makes the skill maintainable. The same
content reappears across skills with subtle drift; patterns get re-derived per
skill; there is no single inspectable source the maintainer fixes once.

### Versus documentation auto-generated from code

Auto-generated docs (`--help` dumps, schema-to-Markdown renderers) preserve
fidelity at the cost of context. They tell you what a function does, not *when
to reach for it* or *why* to combine it with another tool. The Foundry's CLI
pages and schema notes are hand-framed wrappers around generated metadata — the
framing is where the operational judgment lives.

### Versus monolithic conversion skills (the prior art)

The hand-authored `nf-to-galaxy` and `find-shed-tool` skills were prior art
that motivated the Foundry. Their *content* feeds CLI manual pages and action
Molds; their *form* does not. Decomposition into Molds, schema-driven validation
in the inner loop, casting as the integration boundary, and `gxwf` as the source
of truth for `gxformat2` correctness are the specific responses to specific
failure modes in those skills.

---

## Part B — Landscape snapshot

> **Last reviewed: 2026-05.** Point-in-time snapshot. Refreshed on demand as a
> dated sweep, not continuously edited. Every entry cites a dated primary
> source. Preprint citations were resolved against arXiv at review time
> (2026-05); confirm again before external or grant use, since preprints can be
> revised or withdrawn.

The recurring axis below is *when* the knowledge base meets the skill:
**runtime** (the agent fetches/retrieves when it decides) versus **compile
time** (a deterministic step bakes selected KB slices into the artifact, with
provenance). The Foundry is a compile-time-with-provenance design; most
deployed approaches are runtime.

### Model Context Protocol (MCP) — resources + tools

- **What it is:** an open protocol exposing `tools`, `prompts`, and `resources`
  (file-like grounding data) to agents — [Anthropic announcement, Nov 2024](https://www.anthropic.com/news/model-context-protocol), [architecture docs](https://modelcontextprotocol.io/docs/learn/architecture) (as of 2026-05).
- **Shares with the Foundry:** explicitly surfaces KB context as typed
  primitives rather than burying it in prompts or opaque vector search;
  portability ambition across runtimes.
- **Diverges:** runtime. The agent requests a resource when it decides it needs
  one. No compile-time check that skill behavior matches current KB state, no
  provenance linking an instruction to the KB entry that grounds it, no
  guarantee the resource is present at invocation.

### Anthropic Agent Skills

- **What it is:** the `SKILL.md` + progressive-disclosure skill format (name/
  description → full `SKILL.md` → on-demand support files) — [Anthropic Engineering](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) (as of 2026-05).
- **Shares with the Foundry:** progressive disclosure is the same shape as the
  Foundry's `load: upfront|on-demand` reference policy and the `casts/` tree;
  context cost scales with task relevance, not KB size.
- **Diverges:** Agent Skills treats `SKILL.md` as the *authoring* surface. The
  Foundry treats it as a *compile target* with `_provenance.json` back to the
  Mold revision, references, prompt, and model. The Foundry casts *into* this
  format; it is one target, not the source of truth.

### llms.txt

- **What it is:** a curated, human- and LLM-readable Markdown index at a site
  root, linking essential vs optional pages — [llmstxt.org](https://llmstxt.org/) (proposed Sept 2024; adoption real but uneven as of 2026-05).
- **Shares with the Foundry:** linking over embedding; Markdown readable by both
  audiences; optional/skippable sections — the same progressive-disclosure
  instinct, dual-audience by design.
- **Diverges:** an index *into* a documentation site, not a compiled executable
  artifact. No provenance, no validation, no per-kind transformation; operates
  at the site level, not the skill level.

### Corpus2Skill — "Don't Retrieve, Navigate"

- **What it is:** compiles a document corpus offline into a hierarchical
  navigable skill tree (clustering + per-level LLM summaries); the agent
  navigates it at serve time instead of using flat vector retrieval — [Sun, Wei & Hsieh, "Don't Retrieve, Navigate," arXiv 2604.14572](https://arxiv.org/abs/2604.14572) (submitted Apr 2026; confirmed against arXiv 2026-05).
- **Shares with the Foundry:** the closest existing analog. Compile-KB-to-skill,
  explicit corpus visibility, navigate-not-retrieve — structurally the same as
  the Foundry's `references/` tree plus on-demand `trigger`s.
- **Diverges:** auto-compiles from raw text via clustering/summarization. The
  Foundry compiles *curated, human-authored, schema-typed* knowledge with
  explicit per-kind dispatch and provenance — authority and traceability the
  automatic pipeline does not carry.

### Pinecone Nexus

- **What it is:** a managed knowledge-compilation layer on Pinecone's vector
  DB — a "Context Compiler" pre-builds task-specific, versioned,
  citation-bearing artifacts from enterprise data, served at runtime via the
  KnowQL query language (whose primitives include `provenance`) — [Pinecone, "Knowledge Infrastructure for Agents," 4 May 2026](https://www.pinecone.io/blog/knowledge-infrastructure-for-agents/) (early access only as of 2026-05; vendor benchmark claims not independently verified).
- **Shares with the Foundry:** the same core bet, from a major vendor — push
  reasoning upstream from runtime retrieval to a deterministic compile step
  that bakes selected KB slices into reusable, versioned, source-traceable
  artifacts. The clearest commercial validation to date of
  compile-time-with-provenance over runtime RAG.
- **Diverges:** the compiled artifacts live in a proprietary, platform-bound
  vector substrate the agent still queries at runtime through KnowQL, and they
  are auto-derived from raw enterprise data. The Foundry casts curated,
  human-authored, schema-typed knowledge into portable target-native artifacts
  (`SKILL.md`) with file-level provenance, no platform lock-in, and no vector
  index in the path.

### OpenAPI / schema → tool generators

- **What it is:** deterministic generation of typed tool definitions (or
  `SKILL.md`) from a machine-readable spec — [Google ADK OpenAPI tools](https://google.github.io/adk-docs/tools-custom/openapi-tools/), [openapi-to-skills](https://github.com/neutree-ai/openapi-to-skills) (as of 2026-05).
- **Shares with the Foundry:** genuine compile-time KB→skill — deterministic,
  versioned, traceable to a source schema. The same shape as the Foundry
  casting a `schema` reference to a verbatim sidecar.
- **Diverges:** scope. Works only where the KB *is* a machine-readable schema.
  No story for prose patterns, exemplars, or design rationale — which is most of
  the Foundry's content and exactly why a casting pipeline (not a schema parser)
  is needed.

### Voyager-style accreted skill libraries

- **What it is:** an agent writes, verifies-by-execution, and stores reusable
  programs as a growing skill library — [Voyager, Wang et al. 2023, arXiv 2305.16291](https://arxiv.org/abs/2305.16291), [project page](https://voyager.minedojo.org/) (as of 2026-05).
- **Shares with the Foundry:** a growing library of reusable, composable skills.
- **Diverges:** reverse direction — the skill library *is* the KB,
  agent-generated from environmental experience. Provenance is "it executed
  successfully," not a citation, schema, or human review. The Foundry's KB is
  authoritative and human-curated; execution success is not epistemic
  provenance. This contrast is what motivates the Foundry's corpus-first +
  provenance stance.

### RAG-as-knowledge-base

- **What it is:** the skill delegates grounding to runtime retrieval over a
  vector-indexed KB — first-party products from [Azure](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview), [AWS](https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-serverless/grounding-and-rag.html), [Google Cloud](https://cloud.google.com/use-cases/retrieval-augmented-generation); failure analysis in ["Seven Failure Points," arXiv 2401.05856](https://arxiv.org/abs/2401.05856) (2024, as of 2026-05).
- **Shares with the Foundry:** a knowledge base grounding agent behavior; the
  most widely deployed bridge.
- **Diverges:** runtime, and the agent gets no corpus overview — it cannot
  reason about what it has not retrieved. Retrieval miss is a silent
  correctness failure; behavioral instructions above the retrieval layer have no
  traceable source. The Foundry uses compile-time grounding; runtime fetch
  (e.g. `compare-against-iwc-exemplar` against live IWC) augments, never
  replaces, the compiled grounding.

### Custom GPTs / GPT Actions

- **What it is:** an assistant bundling up to 20 knowledge files (runtime
  retrieval) plus OpenAPI-defined Actions — [OpenAI Help Center: Creating and editing GPTs](https://help.openai.com/en/articles/8554397-creating-and-editing-gpts) (as of 2026-05).
- **Shares with the Foundry:** packages knowledge and capability behind one
  surface; GPT Actions is the OpenAPI-compile pattern again.
- **Diverges:** knowledge files are runtime-vectorized RAG — the author cannot
  control what is retrieved; platform-bound, not portable; no provenance. The
  Foundry's casts are compiled, target-portable, and provenanced.

---

## Where the Foundry lands

Across Part B the field's default is *attach a KB, retrieve at runtime*. That is
right for large, heterogeneous, frequently-updated corpora where retrieval miss
is tolerable. It is the wrong default for schema-bound, high-stakes,
version-pinned domains — workflow construction among them — where the right
default is **compile-time grounding with provenance**: the KB is the source of
truth, a deterministic pipeline casts selected slices into target-specific
artifacts, provenance is recorded, and drift from source is mechanically
detectable. None of the individual ideas here are new; the combination — typed
references, per-kind casting, content-hash identity, provenance as audit
substrate, corpus-first authoring — is the Foundry's bet.

This doc tracks one axis only — *when the KB meets the skill*. The adjacent
question of *which harness runs the casts* (Archon, Claude Code dynamic
workflows, LangGraph, …) is deliberately out of scope here and evaluated under
`content/research/component-*` instead.

---

## Refresh log

Append-only. One line per dated sweep of Part B. Mirrors the Mold
`refinements/<date>-<slug>.md` journal convention.

- 2026-05 — Initial Part B from a KB→skills landscape survey (8 entries).
  Corpus2Skill (arXiv 2604.14572) confirmed against arXiv; Custom GPTs citation
  set to the OpenAI Help Center primary.
- 2026-05 — Sweep: added Pinecone Nexus (first commercial compile-time entry;
  early access, vendor benchmarks unverified). Assessed and rejected — genio.co
  (off-topic EdTech, no KB→skill stance) and Glean (enterprise knowledge-graph +
  runtime retrieval; subsumed by RAG-as-knowledge-base).
