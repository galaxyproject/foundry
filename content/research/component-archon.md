---
type: research
subtype: component
tags:
  - research/component
component: "Archon harness substrate evaluation"
status: draft
created: 2026-04-29
revised: 2026-05-22
revision: 3
ai_generated: true
summary: "Archon remains a heavy-harness candidate; HITL gates are stronger, but per-step sub-DAG looping is still the main gap."
sources:
  - "https://github.com/coleam00/Archon"
  - "https://github.com/coleam00/Archon/blob/dev/CHANGELOG.md"
  - "https://archon.diy/guides/authoring-workflows/"
  - "https://archon.diy/guides/approval-nodes/"
  - "https://archon.diy/guides/loop-nodes/"
  - "https://archon.diy/reference/architecture/"
---

# Archon evaluation

Project-infrastructure research on Archon as a possible Foundry harness substrate. Reviewed against
`https://github.com/coleam00/Archon` on 2026-04-29, `dev` branch at CHANGELOG `0.3.10`. Refreshed
2026-05-22 against the public docs site, GitHub `dev` branch, latest release tag `v0.3.12`
(2026-05-14), and the unreleased changelog section. Operational details are point-in-time evidence —
re-check before adopting.

## 1. What is it?

**Tagline (README):** "The first open-source harness builder for AI coding. Make AI coding deterministic and repeatable."

**Elevator pitch (README):** "Archon is a workflow engine for AI coding agents. Define your development processes as YAML workflows — planning, implementation, validation, code review, PR creation — and run them reliably across all your projects." It self-positions as "Like what Dockerfiles did for infrastructure and GitHub Actions did for CI/CD … Think n8n, but for software development."

**Category.** A YAML-DAG **workflow engine that wraps coding-agent SDKs** (Claude Agent SDK, OpenAI Codex SDK, and a community Pi provider that fronts ~20 LLM backends). It is *not* a generic agent framework, *not* a multi-agent runtime, and *not* a RAG/KB system. It is closer in spirit to GitHub Actions for AI than to LangGraph or CrewAI. Platform adapters (Slack/Telegram/Discord/GitHub webhooks/Web/CLI) feed messages into a router that picks a workflow and runs it.

**Important pivot.** v1 of Archon was a Python-based "task management + RAG" multi-agent system. That codebase is archived on the `archive/v1-task-management-rag` branch and is no longer developed. The current `main`/`dev` is a complete rewrite in TypeScript/Bun (started ~Feb 2025) with a different premise. Anything written about Archon before mid-2025 is about a different product.

**Maturity / activity.**
- License: MIT (`LICENSE`).
- GitHub snapshot on 2026-05-22: ~21,700 stars, ~3,300 forks, ~164 open issues, ~91 open PRs. This is growth, not a maturity signal.
- Latest release tag found: `v0.3.12` on 2026-05-14. The `dev` changelog already has unreleased changes after that. Still pre-1.0; no compatibility promise.
- Since the 0.3.10 review, the project has moved materially but not directionally: workflow marketplace, `archon setup` / `archon doctor`, `archon skill install`, Docker/home persistence, explicit resume semantics, provider/model fixes, prompt-cache fixes, and several workflow-engine correctness fixes. No new orchestration primitive removes the per-item sub-DAG gap.
- Primary maintainer: Cole Medin (coleam00) plus contributors. Bus factor still appears concentrated, though marketplace and release PRs show a broader contributor surface than the first review captured.
- Clearly still in marketing/growth phase.

**Stated goals.** Determinism and repeatability ("same workflow, same sequence, every time"), portability (workflows committed to your repo, run identically from CLI/Web/Slack/Telegram/GitHub/Discord), team-shareable processes, and isolation-by-default (every run gets its own git worktree). The current docs lean hard into "fire and forget" remote coding, but not into invisible automation only: human checkpoints are documented as explicit workflow constructs.

## 2. Core architecture and primitives

Archon's vocabulary is small and concrete. The primitives are: **workflow**, **node**, **command** (prompt template), **codebase** (registered repo), **conversation**, **session**, **isolation environment** (worktree), **workflow run**, **workflow event**.

**Composition model.** Workflow-centric, not agent-centric. A workflow is a YAML DAG of nodes with `depends_on` edges. Independent nodes in the same topological layer run concurrently. The author writes the structure; the AI fills in the intelligence at each AI node.

**Node types** (from `packages/workflows/src/schemas/dag-node.ts`, mutually exclusive within a node):
- `command:` — invokes a named markdown prompt file from `.archon/commands/`.
- `prompt:` — inline prompt string, sent to the AI provider.
- `bash:` — shell script, no AI; stdout captured as `$nodeId.output`.
- `script:` — inline TS/Python (`runtime: bun | uv`) with optional `deps:` and `timeout:`; stdout captured as `$nodeId.output`.
- `loop:` — iterative AI prompt with `until:` completion-signal string, `max_iterations`, optional `fresh_context: true` (new session per iteration), `interactive: true` + `gate_message` (pause between iterations for user feedback), and `until_bash:` for deterministic loop-exit checks.
- `approval:` — pure human gate. `approval.message`, optional `capture_response: true` to store the user's reply as `$node.output`, optional `on_reject:` with its own redraft prompt and `max_attempts`.
- `cancel:` — terminate the run with a reason string (think "abort branch" of a `when:` conditional).

**Human interaction model.** This is no longer a minor side detail in the docs. Archon documents three explicit mid-pipeline interaction patterns:
- `approval:` node — pause a DAG at a named checkpoint, notify the user, approve/reject from CLI/Web/chat platform, optionally capture the approval comment into downstream `$node.output`, and optionally run an AI redraft on rejection before pausing again.
- `loop.interactive: true` — pause between loop iterations, inject the user's feedback into the next prompt via `$LOOP_USER_INPUT`, and continue until the loop's completion signal appears.
- workflow-level `interactive: true` — for Web UI runs, force foreground execution so AI output and gate messages appear in the active chat. CLI, Slack, Telegram, and GitHub already run in foreground mode.

So Archon is not only for unsupervised pipelines. Better description: **deterministic pipelines with opt-in human gates**. The default product posture is fire-and-forget background automation, but the architecture expects user interaction to be modeled explicitly as nodes or interactive loops, not as arbitrary interruption inside any node.

**Per-node knobs** (also in `dagNodeBaseSchema`): `when:` JS-expression conditions, `trigger_rule:` for join semantics (`all_success | one_success | none_failed_min_one_success | all_done`), `context: fresh | shared`, `output_format:` (JSON-schema for structured output, SDK-enforced for Claude/Codex), `allowed_tools`/`denied_tools`, `hooks:` (per-node SDK hooks), `mcp:` (per-node MCP server config path), `skills:` (per-node Claude skill preload — directly relevant), `agents:` (inline Claude sub-agent definitions usable via the Task tool), `effort/thinking/maxBudgetUsd/systemPrompt/fallbackModel/betas/sandbox` (Claude SDK passthrough), `retry:` (with backoff), `idle_timeout:`, `model:`/`provider:` overrides.

**Storage / state.** SQLite by default at `~/.archon/archon.db`; PostgreSQL via `DATABASE_URL`. The current architecture docs present a `remote_agent_*` schema covering codebases, conversations, sessions, messages, isolation environments, workflow runs, and workflow events. Per-run artifacts live on disk under `~/.archon/workspaces/<owner>/<repo>/artifacts/runs/<id>/` and are reachable from inside nodes via `$ARTIFACTS_DIR`. Per-run logs go to `…/logs/`. Cross-run repo-scoped state lives at `<repo>/.archon/state/` (gitignored).

**Execution model.** Async, in-process (Bun event loop), per-run path-exclusive lock (overridable via `mutates_checkout: false`). Node concurrency is per-DAG-layer. The DAG executor lives at `packages/workflows/src/dag-executor.ts`; the loader+validator at `loader.ts`; orchestration that maps platform messages to runs at `packages/core/src/orchestrator/`.

**Multi-agent coordination.** Limited and deliberate. Archon does *not* have an agent-to-agent negotiation layer. The closest things are: (a) parallel DAG layers (the `archon-idea-to-pr` workflow runs five reviewer nodes concurrently and joins them with `trigger_rule: one_success` into a `synthesize` node — exactly the multi-reviewer fan-out you'd expect); (b) per-node `agents:` blocks that define Claude sub-agents callable via the Task tool, scoped to a single node. There's no "team of agents debating" abstraction. This is a feature, not a gap, given the determinism goal.

## 3. Tech stack and deployment

- **Languages/runtime:** TypeScript on Bun (workspaces monorepo). Strict TS. Zod schemas via `@hono/zod-openapi` (every API/engine type is OpenAPI-generated).
- **Server:** Hono (OpenAPIHono) on port 3090. SSE for streaming.
- **Frontend:** React + Vite + Tailwind v4 + shadcn/ui + Zustand. Generated TypeScript types from the OpenAPI spec.
- **DB:** SQLite (default, zero-setup) or PostgreSQL.
- **Deployment options:** local Bun dev (`bun run dev`), compiled binary (Homebrew formula at `homebrew/`, install scripts at `scripts/install.{sh,ps1}`, `archon serve` to run the bundled web UI), Docker (`Dockerfile`, `docker-compose.yml`, `Caddyfile.example` for VPS), and a wizard-driven setup that's the recommended path.
- **External deps:** the chosen LLM provider's SDK (Anthropic, OpenAI Codex, or `@mariozechner/pi-coding-agent`); MCP servers if you use them; `gh` CLI; `git`; optional Slack/Telegram/Discord credentials; PostHog (telemetry, opt-out via `ARCHON_TELEMETRY_DISABLED=1`).
- **UI surfaces:** Web UI (chat, dashboard "Mission Control", drag-and-drop **Workflow Builder**, run-step viewer), CLI (`bun run cli workflow run|status|resume|abandon|cleanup`, `cli isolation list|cleanup`, `cli validate workflows|commands`), platform adapters (Slack, Telegram, Discord, GitHub webhooks).
- **Configuration:** `.archon/config.yaml` (repo-level) and `~/.archon/config.yaml` (global). Provider/model defaults, Claude `settingSources`, Codex reasoning effort, additional directories, docs path, env-var allow-lists.

## 4. Skill / tool integration model

This is where Archon's fit with generated skills and other cast artifacts is closest.

- **Claude skills are first-class.** The `skills:` array on any AI node preloads Claude skill directories via SDK `AgentDefinition` wrapping. Skills live in the standard Claude location and are referenced by name. Per-node, not workflow-wide.
- **Commands** (`.archon/commands/*.md`) are reusable prompt templates with `$1`/`$2`/`$ARGUMENTS`/`$ARTIFACTS_DIR`/`$WORKFLOW_ID`/`$BASE_BRANCH`/`$DOCS_DIR`/`$LOOP_USER_INPUT`/`$REJECTION_REASON`/`$LOOP_PREV_OUTPUT`/`$<nodeId>.output` substitution. They are *not* code — they are prompt fragments. This maps cleanly onto a prompt-shaped generated skill with a contract.
- **MCP servers** are configured per-node via `mcp:` (path to a config JSON, env vars expanded at execution time). Released docs still frame this mainly as Claude-node support; the unreleased changelog adds Codex-node MCP support through shared config loading. Useful if generated skills expose themselves as MCP tools.
- **Inline `agents:`** define Claude sub-agents callable via the Task tool, scoped to the node — kebab-case IDs, optional model/tools/skills/maxTurns. This is the closest analog to dynamically composing generated skills inside a phase.
- **External executables** are reached via `bash:` or `script:` nodes. There is no "tool registry" — you call `gxwf`, `planemo`, `gh`, etc. directly. `script:` nodes with `runtime: uv` and `deps: [...]` are particularly useful: a self-contained Python script with its own dependency set runs as a node and emits structured stdout. This is the integration point for `gxwf` lint/validate/roundtrip and Planemo CLI invocations.
- **No Claude-skill-directory auto-discovery beyond what Claude Code itself does.** Archon doesn't have its own skill registry; it leans on Claude's. For non-Claude providers, `skills:` is ignored.
- **Workflow + command discovery:** automatic, three-layer precedence (bundled defaults < `~/.archon/{workflows,commands,scripts}/` global < `<repo>/.archon/...` project). Subfolder one-level nesting allowed. Validated at load time (`bun run cli validate workflows`).

## 5. Orchestration features

| Feature | Archon support |
|---|---|
| Sequencing / DAG | First-class. `nodes` with `depends_on`. Layer-parallel execution. |
| Conditional branching | `when:` expression on nodes; `cancel:` node terminates a branch. |
| Routing | The router (`packages/workflows/src/router.ts`) uses an LLM call to pick a workflow from descriptions, with a 4-tier name-resolution fallback (exact → case-insensitive → suffix → substring) and ambiguity detection. Within a workflow, branching is `when:`-based, not LLM-routed. |
| Looping / per-item iteration | `loop:` with `until:` signal, `max_iterations`, `fresh_context`, `until_bash:`, `$LOOP_PREV_OUTPUT`, and optional `interactive` pause between iterations. The looped unit is a single prompt — there is **no native "for each item in list, run this sub-DAG"** primitive. To loop over a list of steps, you either drive iteration from inside the prompt (the "Ralph pattern" reads a plan from disk and picks one task per iteration) or you author N copies of the layer. This remains the main limitation for the Foundry's "loop over workflow steps" requirement. |
| Approval gates / HITL | `approval:` nodes (pure gate, optional `capture_response`, optional `on_reject` redraft/re-pause). `loop: { interactive: true, gate_message }` for iterative HITL. CLI/web/chat-platform approval and rejection are first-class, and Web UI workflows with gates need workflow-level `interactive: true` so prompts appear in the active chat. |
| Retry / failure | Per-node `retry:` with backoff (not on loop nodes — loops manage their own iteration). `trigger_rule` lets a join survive partial failures. Failures classified into structured error types (`dag.node_empty_output`, `codex_stream_incomplete`, etc.). |
| State persistence and resumption | Yes. Workflow runs persist to DB; `cli workflow resume <run-id>`, `archon workflow run --resume`, and Web UI resume paths re-run while skipping completed nodes. As of 0.3.11, plain `archon workflow run` no longer silently auto-resumes a prior failed run, which removes a cross-invocation state-leak hazard. Approval gates pause the run and survive process restarts. |
| Observability / tracing | `workflow_events` table is a step-level event log (transitions, artifacts, errors). JSONL file logs per run under `…/logs/`. Web UI "Workflow Execution" view streams events. Pino structured logs with `{domain}.{action}_{state}` event naming. |
| Cost tracking | Per-node `maxBudgetUsd:` cap (Claude only — SDK passthrough). No global cost dashboard. |
| Concurrency | Per-DAG-layer parallelism inside a run. Multiple concurrent runs across worktrees. Same-checkout concurrency requires `mutates_checkout: false` (author asserts no race). |
| Worktree isolation | Default. `cli workflow run --branch <name>` or auto-generated name; `--no-worktree` opt-out. `archon-resolve-conflicts`, `cli isolation cleanup`, `cli complete <branch>` lifecycle. |

## 6. Knowledge base / RAG features

**There is no KB.** v1 had RAG (Supabase + pgvector + Crawl4AI); v2 dropped it entirely. The closest things v2 has:
- `$DOCS_DIR` (configurable docs path the agent can grep) — file-system docs, not a vector store.
- `$ARTIFACTS_DIR` per run, plus `<repo>/.archon/state/` for cross-run state — basically a scratchpad and a journal, not a queryable corpus.
- Codebase-scoped env vars and registered codebases.

For the Foundry's wish to host **patterns** and **IWC exemplars** in retrievable form, **Archon is the wrong shape**. You would either keep them as static files in `<repo>/.archon/state/` or `docs/` and grep from inside nodes, or pair Archon with an external retriever (MCP server, custom skill, separate vector DB). The repo's authors deliberately removed the KB layer; it is not coming back.

## 7. Extensibility and customization

- **Workflows are the extension point.** A "harness" in Foundry terms maps almost 1-to-1 onto an Archon workflow file. They are first-class, file-based, version-controlled, and discoverable. This is by far Archon's strongest fit.
- **Commands** are reusable prompt fragments — extract a phase prompt once, call it from many workflows.
- **Scripts** (`.archon/scripts/*.{ts,py}`) are reusable code units called from `script:` nodes.
- **Code-level extensibility** is narrower. New AI providers implement `IAgentProvider` (`packages/providers/src/types.ts`), new platform adapters implement `IPlatformAdapter`. There is no plugin loader for arbitrary new node types or new workflow primitives — adding (e.g.) a `for_each:` node would mean a fork of `@archon/workflows`. The repo's stated principles (KISS/YAGNI, fail-fast, no autonomous lifecycle mutation, see `CLAUDE.md`) suggest the maintainer will resist speculative extension hooks.
- **How much code vs config for a non-trivial harness?** For something like the Foundry's full pipeline — sequence, gates, routing on discover-or-author, per-step loop, gxwf/planemo/test runs, debug loop — the answer is "mostly config." You'd write one workflow YAML, ~10 commands, and 2–3 `script:` nodes for `gxwf`/`planemo`. The single sharp limitation is the per-step loop semantics (see §10).

## 8. Failure modes and limitations

- **Per-iteration "for each step" is awkward.** As noted, loops iterate a single prompt; iterating a sub-DAG over N items requires either (a) the Ralph pattern (loop reads list from disk, picks one) or (b) static unrolling. Foundry's "loop over steps: discover-or-author tool → summarize → implement → validate" cannot be expressed as a sub-DAG-per-item natively.
- **Single-developer tooling assumption.** No multi-tenancy, no auth model beyond per-adapter env-var allow-lists, no audit log targeted at compliance. Fine for a research foundry; not OK if you ever want a hosted multi-user Foundry.
- **Pre-1.0, schema/runtime churn.** CHANGELOG 0.3.10 through 0.3.12 shows substantive semantics changes: provider/model resolution, `$LOOP_PREV_OUTPUT`, `mutates_checkout`, explicit resume, node-output structured parsing, skill tool defaults, setup/doctor behavior, and Docker persistence. Lock-in via YAML is small (workflows are portable), but lock-in via runtime semantics is real.
- **Provider lock-in.** The whole engine assumes one of three provider SDKs. Not a generic "any LLM" engine. Pi (community) widens this via OpenRouter-style routing but it's `builtIn: false`.
- **No native KB/retrieval** (see §6).
- **Bus factor.** Effectively one primary maintainer with a contributor pool. Pace is fast but concentrated.
- **Workflow-engine correctness is still moving.** The last two releases fixed real control-flow hazards: implicit auto-resume leaked prior outputs into new invocations, Pi structured JSON could fail downstream `$node.output.field` use, approval gates could be bypassed after reject-with-redraft on resume, and Claude stop-sequence / `output_format` terminations were misclassified.
- **No autonomous lifecycle mutation across processes** is an explicit architectural rule (`CLAUDE.md`, citing #1216) — Archon will refuse to mark stale runs as failed. Pragmatic: requires user one-click action. Worth noting if you want "fully autonomous" harnesses.
- **Lock-in on extraction.** Workflows are plain YAML referencing prompts in plain markdown. Easy to migrate. The DB schema is more entangled, but artifacts on disk and per-repo `.archon/` make extraction tractable.

## 9. Roadmap and trajectory

- Cadence: weekly-ish patch releases through 0.3.x. CHANGELOG follows Keep a Changelog. SemVer.
- Recent themes since 0.3.10: workflow marketplace, setup/doctor/install packaging, Docker persistence, explicit resume, provider/model trust-the-SDK behavior, structured-output reliability, skill loading fixes, prompt-cache fixes, and Codex parity work.
- Docs now have dedicated pages for approval nodes, loop nodes, script nodes, per-node MCP, per-node skills, Web UI execution mode, and common authoring patterns. That is a meaningful documentation/product maturation step.
- Direction: hardening for packaged "fire-and-forget" remote coding workflows with explicit gates where needed — Slack/Telegram/GitHub/Web triggering, workflow marketplace, unified UX, PR review/triage automation. *Not* moving toward general orchestration, KB, multi-agent negotiation, or native per-item sub-DAG loops.

## 10. Concrete fit assessment for harnesses

Re-read against Foundry harness requirements:

**What Archon covers off-the-shelf:**
- **Sequencing the pipeline.** `summarize-nextflow → nextflow-summary-to-galaxy-interface → nextflow-summary-to-galaxy-data-flow → … → run-workflow-test → debug-galaxy-workflow-output` maps directly onto a `nodes:` list with `depends_on`. Each phase is a `command:` or `prompt:` node calling a generated skill (or wrapping `gxwf`/`planemo` via `bash:` or `script:`).
- **Approval gates with full autonomy posture.** `approval:` for pure gates, `loop: { interactive: true }` for iterative HITL, plain non-interactive for fully autonomous. The same workflow file can be authored interactive or batch by toggling `interactive:` and removing approval nodes — exactly the autonomy-posture knob you described.
- **State persistence and resumption.** Run state in DB; `cli workflow resume <id>` skips completed nodes; approval pauses survive restart; per-run `$ARTIFACTS_DIR` is durable; cross-run `<repo>/.archon/state/` is durable.
- **CLI integration for `gxwf`/`planemo`.** `script:` nodes with `runtime: uv` + `deps:`, or `bash:` nodes. Stdout becomes `$node.output` for downstream nodes. `output_format:` JSON schema for Claude/Codex enforces structured outputs from validators.
- **Observability.** `workflow_events` table + Web UI step viewer + JSONL logs. Probably exceeds what a hand-rolled harness would have.
- **Concurrent runs.** Worktrees by default — useful if multiple Galaxy workflows are being foundry-cast at once.
- **Cast skill loading.** Claude skills via per-node `skills:`; reusable prompt fragments via `command:` nodes; MCP servers via `mcp:` where the selected provider supports them.
- **Mid-pipeline user interaction.** Archon has explicit support for plan approval, rejection/redraft, captured user comments, and iteration-by-iteration feedback. This maps well to Foundry's harness-level gates, because gates can wrap Molds without contaminating Mold source with autonomy policy.

**What requires non-trivial custom code on top of Archon:**
- **Per-step looping over a sub-DAG.** The "[loop over steps] discover-or-author tool → summarize tool → implement step → validate-galaxy-step → translate tests → assemble tests" sub-DAG cannot be expressed as a native for-each. Workarounds: (a) Ralph pattern in a single big `loop:` (one iteration per step, fresh context, plan-on-disk); (b) flatten by writing a shell driver that calls `bun run cli workflow run <sub-workflow>` once per step and then synthesizes — feasible but adds an outer driver; (c) fork the engine to add `for_each:` (rejected by KISS/YAGNI culture, would diverge from upstream). The Ralph pattern is what the bundled `archon-piv-loop` and `archon-ralph-dag` workflows do, and it works, but each iteration is a single prompt — sub-DAG per iteration is not native.
- **Routing within a phase** (the discover-or-author branch). Easiest expression: a `prompt:` node returning structured `output_format: { found: bool }`, then two siblings with `when:` conditions (`when: $discover.output.found == true` vs `false`), with a `cancel:` on a third branch. This works but the `when:` expression evaluator is intentionally simple; complex routing graphs become hard to read.
- **Foundry's casting step.** Archon doesn't compile or cast Molds — it consumes the generated skills or other cast artifacts. Casting lives outside Archon. Not a fit problem; just confirming the boundary.
- **Pattern/IWC-exemplar retrieval.** Either keep them on the filesystem and grep from inside nodes, or pair with an external retriever. Not Archon's job.

**Interactive vs. unsupervised posture.** The answer to "is Archon more for unsupervised pipelines?" is **mostly yes by default, but no by capability**. Its marketing and Web UI defaults favor background, fire-and-forget workflows. Its docs and architecture still make user interaction a first-class, explicit shape: `approval` nodes, interactive loops, foreground Web workflows, and chat/CLI/Web approval commands. What it does **not** offer is free-form, arbitrary user steering in the middle of any running node. If user involvement matters, the workflow author must model that point as an approval node, rejection-redraft gate, or interactive loop.

**Foundry-specific read.** Foundry's own `docs/HARNESS_PIPELINES.md` already says approval gates, scope confirmation, plan presentation, state, and resumption are harness-level concerns, not Molds. Current `content/pipelines/*.md` files include `[loop]` and `[branch]`, but no inline `[gate]` phase yet; the docs only reserve `[gate]` for the first real approval/scope checkpoint. That means the current Foundry pipeline spine is closer to an unsupervised Mold sequence with harness-owned checkpoints layered around it than to a fully conversational workflow. Archon fits that posture: keep the same Mold pipeline and author separate interactive vs. batch Archon workflow variants by inserting or omitting `approval` nodes.

**What Archon would actively get in the way of:** very little. The main friction is if you want a different runtime model (durable async like Temporal, externally-scheduled, or a different agent runtime than Claude/Codex/Pi). Archon assumes one in-process Bun event loop, one of three SDKs.

**Lightweight harness end of the spectrum** (simple sequence of generated skills): **Archon is overkill.** A 10-line shell script or a small Python file calling the Anthropic SDK does this and incurs no DB, no daemon, no platform-adapter layer, no schema. *But:* if you're going to write more than two harnesses, the marginal cost of the second Archon workflow is much lower than the second hand-rolled harness, because you already have observability, resumption, and a UI. Verdict: lightweight harnesses *alone* don't justify Archon; lightweight + heavy mixed does.

**Heavy harness end** (gated, resumable, multi-step, observability-equipped): **Archon is genuinely close to enough**, with the per-step-loop caveat. Concretely it covers ~80% of the heavy-harness requirements, and the missing 20% (per-item sub-DAGs, complex routing) is workable via Ralph + `when:` patterns. You would *not* need to compose Archon with LangGraph or Temporal for the Foundry's stated requirements. You might compose it with a small external retriever for patterns/IWC exemplars.

**Concrete recommendation.** **Hybrid — lean on Archon as the harness substrate for heavy flows, but isolate the boundary.** Author Foundry harnesses as Archon workflows under `<repo>/.archon/workflows/`, generated skills as Claude skills + `.archon/commands/`, and call `gxwf`/`planemo` via `script:` and `bash:` nodes. Keep casting entirely outside Archon. Keep IWC/pattern retrieval outside Archon (filesystem or MCP). Do **not** build deep dependencies on Archon's DB schema or its TypeScript engine APIs — treat workflows-as-YAML as the only durable contract; that's where extraction cost is low. Accept the per-step-loop limitation up front and design the per-step pipeline around the Ralph pattern (single big loop reading the step list from disk). For user interaction, make gates explicit harness variants: e.g. a batch workflow with no gates, an interactive workflow with approval after design/template phases, and a guided workflow with `loop.interactive` around risky per-step implementation.

## 11. Alternatives worth comparing

- **LangGraph (Python).** Graph-based agent orchestration with explicit state, conditional edges, checkpointing, and a strong "for each / branch / merge" vocabulary. Better than Archon at expressing per-step sub-DAGs and complex routing; weaker at being a *product* (no UI, no platform adapters, no built-in worktree/PR lifecycle). If the Foundry's hardest problem is the per-step branching graph, LangGraph is a better orchestration kernel; but you would build all the Archon-shaped scaffolding (run DB, resumption, gates UI, multi-platform invocation) yourself.
- **Temporal / Inngest.** Durable workflow orchestrators with rock-solid state, retries, and resumption — far stronger than Archon on those axes — but at the cost of being infrastructure, not a coding-agent product. Activities are arbitrary code; they have no concept of LLM nodes, approvals, skills, MCP, or worktrees. You'd be building the agent layer on top. Use only if "this must survive any restart, forever" is a hard requirement; for a research foundry it isn't.
- **CrewAI / AutoGen.** Multi-agent frameworks where "agents" with roles negotiate. Wrong shape for the Foundry's deterministic-pipeline goal — you don't want agents deciding the order, you want the harness deciding. Both are also weaker on resumption and gates than Archon.
- **Plain Python with the Anthropic SDK** (the do-nothing-fancy baseline). Honest answer: for a single harness end-to-end, this is *fine*. You write one script per harness, you ship generated skills as files, you `subprocess.run("gxwf …")`. You lose: parallel reviewer fan-out, structured observability, the Web UI step viewer, resume-from-failure, multi-platform invocation. You gain: zero dependencies on a pre-1.0 engine, full control. Use this for the lightweight-harness end *if you don't already need Archon for the heavy end*. If you need Archon at all, use it for both.
- **Claude Code itself, with skills only.** A Claude skill *is* a small harness when its instructions and supporting scripts are well-shaped. For very simple sequencing (one phase calls another via the SlashCommand or Task tool), no orchestrator is needed. The Foundry's "lightweight harness" end may genuinely be expressible as a single Claude skill that calls generated skills sequentially. Worth piloting before adopting Archon.

## Recommendation

Adopt Archon as the substrate for **heavy** Foundry harnesses, treating workflow YAML and commands as the only durable contract. The 2026-05 refresh strengthens, rather than weakens, that call: Archon has better docs, cleaner setup, explicit resume semantics, and first-class approval/interactive-loop guidance. It still does not solve native "loop over a list of items, each running a sub-DAG" (use Ralph-style plan-on-disk looping or an outer driver). Do not let it host pattern/IWC-exemplar retrieval; that's the wrong shape and v2 deliberately removed the KB. For **lightweight** harnesses (simple sequence of generated skills), Archon is overkill in isolation but cheap once you're already running it for the heavy end.

**Next steps (prioritized):**
1. Build a throwaway proof-of-concept harness in Archon that exercises (a) a `script: { runtime: uv }` node calling `gxwf validate`, (b) a Ralph-pattern loop over a fake step list, (c) one `approval:` gate with `capture_response`, (d) one reject-with-redraft path, and (e) a `cancel:` branch from a `when:` route. Goal: confirm the per-step-loop and gate ergonomics are tolerable for the real pipeline.
2. Decide where Mold compilation lives (outside Archon) and where pattern/IWC retrieval lives (outside Archon — pick filesystem grep vs. MCP server). Document the boundary so the Foundry doesn't drift Archon into KB territory.
3. Author two workflow variants for the same Foundry spine: `*-batch` with no user gates and `*-guided` with approval after source summary/design/template phases. That tests the autonomy-posture boundary the Foundry docs already assign to harnesses.
4. Pin to a specific Archon release in the Foundry's docs and re-evaluate at each minor bump until 1.0; v2 semantics are still moving.
5. If the proof-of-concept exposes that per-step sub-DAGs are too painful: prototype the same flow in LangGraph as a head-to-head comparison before committing.
6. Skip CrewAI/AutoGen/Temporal/Inngest for now — wrong shape or too heavy for a research foundry.
